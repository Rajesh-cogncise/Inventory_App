import dbConnect from "@/lib/dbConnect";
import StockAdjustment from "@/models/StockAdjustment";
import StockPurchase from "@/models/StockPurchase";
import WarehouseInventory from "@/models/WarehouseInventory";
import "@/models/Warehouse";
import "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

// 🟢 GET: Fetch all stock adjustments / purchases with filters
export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);

  const supplierId = searchParams.get("supplierId");
  const warehouseId = searchParams.get("warehouseId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 10;

  const filter = {};
  if (supplierId) filter.supplier = supplierId;
  if (warehouseId) filter.warehouseId = warehouseId;

  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999);
      filter.date.$lte = to;
    }
  }

  try {
    const purchases = await StockPurchase.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("warehouseId", "name")
      .populate("supplier", "name")
      .lean();

    // 🟡 FIX: Convert Decimal128 → normal number
    purchases.forEach((p) => {
      if (p.total) p.total = parseFloat(p.total.toString());
      if (p.subtotal) p.subtotal = parseFloat(p.subtotal.toString());

      p.products = p.products.map((prod) => ({
        ...prod,
        price: prod.price ? parseFloat(prod.price.toString()) : 0,
      }));
    });

    const purchaseIds = purchases.map((p) => p._id);

    const { default: StockTransfer } = await import("@/models/StockTransfer.js");

    const transfers = await StockTransfer.find({
      purchaseId: { $in: purchaseIds },
    }).lean();

    const transferredIds = new Set(transfers.map((t) => t.purchaseId.toString()));

    const adjustments = await StockAdjustment.aggregate([
      { $match: { purchaseId: { $in: purchaseIds } } },
      { $sort: { createdAt: -1 } },
      {
        $group: {
          _id: "$purchaseId",
          lastUserId: { $first: "$userId" },
        },
      },
    ]);

    const adjustmentMap = {};
    adjustments.forEach((adj) => {
      adjustmentMap[adj._id.toString()] = adj.lastUserId?.toString() || null;
    });

    purchases.forEach((p) => {
      p.isTransferred = transferredIds.has(p._id.toString());
      p.lastAdjustedById = adjustmentMap[p._id.toString()] || null;
    });

    const total = await StockPurchase.countDocuments(filter);

    return NextResponse.json({
      items: purchases,
      totalPages: Math.ceil(total / limit),
    });
  } catch (err) {
    console.error("Error fetching purchases:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}



// 🟡 POST: Create stock adjustment + sync warehouse inventory
{/*export async function POST(req) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("📦 Received:", JSON.stringify(body, null, 2));

    let { purchaseId, purchaseFields, products, removedProducts } = body;

    // Ensure products array
    products = Array.isArray(products) ? products : Object.values(products);

    const existingPurchase = await StockPurchase.findById(purchaseId);
    if (!existingPurchase) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    const oldWarehouseId = existingPurchase.warehouseId?.toString();
    const newWarehouseId = purchaseFields.warehouseId?.toString();
    const warehouseChanged = oldWarehouseId !== newWarehouseId;

    // 🟢 SAVE ADJUSTMENT RECORD
    const adjustmentProducts = products.map((p) => ({
      productId: p.productId,
      oldQuantity: Number(p.oldQuantity ?? 0),
      newQuantity: Number(p.newQuantity ?? p.quantity),
      difference: Number(p.difference ?? (p.newQuantity - p.oldQuantity)),
    }));

    await StockAdjustment.create({
      purchaseId,
      warehouseId: newWarehouseId,
      products: adjustmentProducts,
      userId: session.user.id,
      date: new Date(),
    });

    // 🟢 Update purchase header fields
    Object.assign(existingPurchase, purchaseFields);

    // 🟢 Update OR Insert Products (with labels)
    for (const p of products) {
      const index = existingPurchase.products.findIndex(
        (x) => x.productId.toString() === p.productId
      );

      const qty = Number(p.newQuantity ?? p.quantity);
      const price = Number(p.price ?? 0);
      const label = p.label || ""; // 🟢 ensure label

      if (index > -1) {
        // Update existing product
        existingPurchase.products[index].quantity = qty;
        existingPurchase.products[index].price = price;
        if (label) existingPurchase.products[index].label = label; // 🟢 save label
      } else {
        // Add new product
        existingPurchase.products.push({
          productId: p.productId,
          quantity: qty,
          price: price,
          label: label, // 🟢 save label for new product
        });
      }
    }

    // 🟢 Remove deleted products
    if (removedProducts?.length) {
      existingPurchase.products = existingPurchase.products.filter(
        (p) => !removedProducts.includes(p.productId.toString())
      );
    }

    // 🟢 Recalculate totals
    let subtotal = 0;
    existingPurchase.products.forEach((p) => {
      subtotal += Number(p.price) * Number(p.quantity);
    });

    const gstPercent = Number(existingPurchase.gstpercent ?? 0);
    const gst = (subtotal * gstPercent) / 100;
    const total = subtotal + gst;

    existingPurchase.subtotal = subtotal;
    existingPurchase.gst = gst;
    existingPurchase.total = total;

    await existingPurchase.save();

    // 🟢 UPDATE WAREHOUSE INVENTORY
    let warehouseInv = await WarehouseInventory.findOne({
      warehouseId: newWarehouseId,
    });

    if (!warehouseInv) {
      warehouseInv = new WarehouseInventory({
        warehouseId: newWarehouseId,
        products: [],
        currentStock: 0,
      });
    }

    for (const p of existingPurchase.products) {
      const index = warehouseInv.products.findIndex(
        (x) => x.productId.toString() === p.productId.toString()
      );

      if (index > -1) {
        warehouseInv.products[index].quantity = p.quantity;
        warehouseInv.products[index].price = p.price;
        if (p.label) warehouseInv.products[index].label = p.label; // 🟢 store label in inventory
      } else {
        warehouseInv.products.push({
          productId: p.productId,
          quantity: p.quantity,
          price: p.price,
          label: p.label || "", // 🟢 new label
        });
      }
    }

    // Remove from inventory if removed
    if (removedProducts?.length) {
      warehouseInv.products = warehouseInv.products.filter(
        (p) => !removedProducts.includes(p.productId.toString())
      );
    }

    warehouseInv.currentStock = warehouseInv.products.reduce(
      (sum, p) => sum + p.quantity,
      0
    );

    warehouseInv.lastUpdated = new Date();
    await warehouseInv.save();

    return Response.json(
      { message: "Stock adjustment saved successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("💥 Error saving stock adjustment:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}*/}


// 🟡 POST: Update stock purchase + sync warehouse inventory properly
// POST: Update purchase & sync warehouse inventories properly
export async function POST(req) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) return Response.json({ error: "Unauthorized" }, { status: 401 });

    const { purchaseId, purchaseFields, products, removedProducts } = await req.json();
    const purchase = await StockPurchase.findById(purchaseId);
    if (!purchase) return Response.json({ error: "Purchase not found" }, { status: 404 });

    const oldWarehouseId = purchase.warehouseId?.toString();
    const newWarehouseId = purchaseFields.warehouseId?.toString();
    const warehouseChanged = oldWarehouseId !== newWarehouseId;

    // Map old quantities per product
    const oldProductMap = {};
    purchase.products.forEach(p => {
      oldProductMap[p.productId.toString()] = Number(p.quantity);
    });

    // -------------------------------
    // 1️⃣ Subtract old quantities from old warehouse (only this purchase)
    if (oldWarehouseId) {
      const oldWarehouseInv = await WarehouseInventory.findOne({ warehouseId: oldWarehouseId });
      if (oldWarehouseInv) {
        for (const p of purchase.products) {
          const idx = oldWarehouseInv.products.findIndex(x => x.productId.toString() === p.productId.toString());
          if (idx > -1) {
            // subtract old purchase quantity
            oldWarehouseInv.products[idx].quantity -= oldProductMap[p.productId.toString()] || 0;
            if (oldWarehouseInv.products[idx].quantity <= 0) {
              oldWarehouseInv.products.splice(idx, 1); // remove if zero or negative
            }
          }
        }
        oldWarehouseInv.currentStock = oldWarehouseInv.products.reduce((sum, p) => sum + p.quantity, 0);
        oldWarehouseInv.lastUpdated = new Date();
        await oldWarehouseInv.save();
      }
    }

    // -------------------------------
    // 2️⃣ Update purchase record
    Object.assign(purchase, purchaseFields);

    // Update/insert products
    const updatedProducts = [];
    products.forEach(p => {
      const idx = purchase.products.findIndex(x => x.productId.toString() === p.productId.toString());
      const qty = Number(p.newQuantity ?? p.quantity);
      const price = Number(p.price ?? 0);
      const label = p.label ?? "";

      if (idx > -1) {
        purchase.products[idx].quantity = qty;
        purchase.products[idx].price = price;
        purchase.products[idx].label = label;
      } else {
        purchase.products.push({ productId: p.productId, quantity: qty, price, label });
      }

      updatedProducts.push({ productId: p.productId, quantity: qty, price, label });
    });

    // Remove deleted products
    if (removedProducts?.length) {
      purchase.products = purchase.products.filter(p => !removedProducts.includes(p.productId.toString()));
    }

    // Recalculate totals
    const subtotal = purchase.products.reduce((sum, p) => sum + p.quantity * p.price, 0);
    const gstPercent = Number(purchase.gstpercent ?? 0);
    const gst = (subtotal * gstPercent) / 100;
    purchase.subtotal = subtotal;
    purchase.gst = gst;
    purchase.total = subtotal + gst;

    await purchase.save();

    // -------------------------------
    // Update new warehouse inventory (merge duplicates)
    let newWarehouseInv = await WarehouseInventory.findOne({ warehouseId: newWarehouseId });
    if (!newWarehouseInv) newWarehouseInv = new WarehouseInventory({ warehouseId: newWarehouseId, products: [], currentStock: 0 });

    // Merge products by productId
    for (const p of updatedProducts) {
      const idx = newWarehouseInv.products.findIndex(x => x.productId.toString() === p.productId.toString());
      if (idx > -1) {
        // If product exists, increment quantity
        newWarehouseInv.products[idx].quantity += p.quantity;
        newWarehouseInv.products[idx].price = p.price; // optional: update price
        if (p.label) newWarehouseInv.products[idx].label = p.label;
      } else {
        // Add new product
        newWarehouseInv.products.push({ ...p });
      }
    }

    // Ensure no duplicates exist (just in case)
    const mergedProducts = [];
    const seen = new Set();
    for (const p of newWarehouseInv.products) {
      const pid = p.productId.toString();
      if (!seen.has(pid)) {
        mergedProducts.push(p);
        seen.add(pid);
      } else {
        // If duplicate somehow exists, merge quantity
        const existing = mergedProducts.find(mp => mp.productId.toString() === pid);
        existing.quantity += p.quantity;
      }
    }
    newWarehouseInv.products = mergedProducts;

    // Recalculate current stock
    newWarehouseInv.currentStock = newWarehouseInv.products.reduce((sum, p) => sum + p.quantity, 0);
    newWarehouseInv.lastUpdated = new Date();
    await newWarehouseInv.save();

    return Response.json({ message: "Purchase updated and warehouse inventory synced successfully" }, { status: 200 });

  } catch (err) {
    console.error("💥 Error updating purchase:", err);
    return Response.json({ error: err.message }, { status: 500 });
  }
}





// 🟠 PUT: Update adjustment details (optional)
export async function PUT(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const adjustment = await StockAdjustment.findByIdAndUpdate(body._id, body, { new: true });
    return NextResponse.json(adjustment);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// 🔴 DELETE: Delete adjustment record
export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Adjustment ID required" }, { status: 400 });
  try {
    await StockAdjustment.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}