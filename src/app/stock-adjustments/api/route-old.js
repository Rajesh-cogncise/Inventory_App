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
    // 1️⃣ Fetch purchases with pagination
    const purchases = await StockPurchase.find(filter)
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .populate("warehouseId", "name")
      .populate("supplier", "name")
      .lean();

    const purchaseIds = purchases.map((p) => p._id); // these are already valid

    // 2️⃣ Import StockTransfer model
    const { default: StockTransfer } = await import("@/models/StockTransfer.js");

    // 3️⃣ Bulk fetch transfers
    const transfers = await StockTransfer.find({
      purchaseId: { $in: purchaseIds },
    }).lean();

    const transferredIds = new Set(transfers.map((t) => t.purchaseId.toString()));

    // 4️⃣ Fetch last adjustments
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

    // 5️⃣ Add flags to purchases
    purchases.forEach((p) => {
      p.isTransferred = transferredIds.has(p._id.toString());
      p.lastAdjustedById = adjustmentMap[p._id.toString()] || null;
    });

    // 6️⃣ Total pages
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
  export async function POST(req) {
  try {
    await dbConnect();
    const session = await getServerSession(authOptions);
    if (!session) {
      return Response.json({ error: "Unauthorized" }, { status: 401 });
    }

    const body = await req.json();
    console.log("📦 Received:", JSON.stringify(body, null, 2));

    let { purchaseId, purchaseFields, products, removedProducts } = body;
    if (products && !Array.isArray(products)) {
      products = Object.values(products);
    }

    const updatedPurchaseFields = {
      ...purchaseFields,
      gst: purchaseFields.gst,
      gstpercent: purchaseFields.gstpercent,
      subtotal: purchaseFields.subtotal,
      total: purchaseFields.total,
    };

    // 🟡 Fetch existing purchase to detect warehouse change
    const existingPurchase = await StockPurchase.findById(purchaseId);
    if (!existingPurchase) {
      return Response.json({ error: "Purchase not found" }, { status: 404 });
    }

    const oldWarehouseId = existingPurchase.warehouseId?.toString();
    const newWarehouseId = updatedPurchaseFields.warehouseId?.toString();
    const warehouseChanged = oldWarehouseId !== newWarehouseId;

    // 🟢 Record adjustment
    const adjustmentProducts = products.map((p) => ({
      productId: p.productId,
      oldQuantity: Number(p.oldQuantity ?? 0),
      newQuantity: Number(p.newQuantity ?? 0),
      difference: Number(p.difference ?? 0),
    }));

    await StockAdjustment.create({
      purchaseId,
      warehouseId: updatedPurchaseFields.warehouseId,
      products: adjustmentProducts,
      userId: session.user.id,
      date: new Date(),
    });

    // 🟢 Update purchase fields
    Object.assign(existingPurchase, purchaseFields);

    // 🟢 Update product quantities
    if (existingPurchase.products?.length) {
      for (const adj of products) {
        const prodIndex = existingPurchase.products.findIndex(
          (x) => x.productId.toString() === adj.productId
        );
        if (prodIndex > -1) {
          existingPurchase.products[prodIndex].quantity = adj.newQuantity;
        }
      }

      if (removedProducts?.length) {
        existingPurchase.products = existingPurchase.products.filter(
          (p) => !removedProducts.includes(p.productId.toString())
        );
      }
    }

    // ✅ Recalculate subtotal, gst, total
    let subtotal = 0;
    for (const item of existingPurchase.products) {
      const price = Number(item.price || 0);
      const qty = Number(item.quantity || 0);
      subtotal += price * qty;
    }

    const gstPercent =
      Number(existingPurchase.gstpercent || purchaseFields.gstpercent || 0);
    const gst = (subtotal * gstPercent) / 100;
    const total = subtotal + gst;

    existingPurchase.subtotal = subtotal;
    existingPurchase.gst = gst;
    existingPurchase.total = total;
    await existingPurchase.save();

    // ✅ Handle Warehouse Inventory Logic
    if (warehouseChanged) {
      console.log(`🏭 Warehouse changed: ${oldWarehouseId} → ${newWarehouseId}`);

      // 1️⃣ Remove products from old warehouse inventory
      const oldWarehouseInv = await WarehouseInventory.findOne({
        warehouseId: oldWarehouseId,
      });

      if (oldWarehouseInv) {
        oldWarehouseInv.products = oldWarehouseInv.products.filter(
          (invProd) =>
            !existingPurchase.products.some(
              (p) => p.productId.toString() === invProd.productId.toString()
            )
        );

        oldWarehouseInv.currentStock = oldWarehouseInv.products.reduce(
          (sum, p) => sum + p.quantity,
          0
        );
        oldWarehouseInv.lastUpdated = new Date();
        await oldWarehouseInv.save();
      }

      // 2️⃣ Add/update products in new warehouse
      let newWarehouseInv = await WarehouseInventory.findOne({
        warehouseId: newWarehouseId,
      });

      if (!newWarehouseInv) {
        newWarehouseInv = new WarehouseInventory({
          warehouseId: newWarehouseId,
          products: [],
          currentStock: 0,
        });
      }

      for (const p of existingPurchase.products) {
        const prodIndex = newWarehouseInv.products.findIndex(
          (x) => x.productId.toString() === p.productId.toString()
        );
        if (prodIndex > -1) {
          newWarehouseInv.products[prodIndex].quantity = p.quantity;
        } else {
          newWarehouseInv.products.push({
            productId: p.productId,
            quantity: p.quantity,
            price: p.price || 0,
          });
        }
      }

      newWarehouseInv.currentStock = newWarehouseInv.products.reduce(
        (sum, p) => sum + p.quantity,
        0
      );
      newWarehouseInv.lastUpdated = new Date();
      await newWarehouseInv.save();
    } else {
      // ✅ No warehouse change, just update existing warehouse inventory
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

      for (const p of products) {
        const productIndex = warehouseInv.products.findIndex(
          (x) => x.productId.toString() === p.productId
        );

        if (productIndex > -1) {
          if (p.newQuantity === 0) {
            warehouseInv.products.splice(productIndex, 1);
          } else {
            warehouseInv.products[productIndex].quantity = p.newQuantity;
          }
        } else if (p.newQuantity > 0) {
          warehouseInv.products.push({
            productId: p.productId,
            price: 0,
            quantity: p.newQuantity,
          });
        }
      }

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
    }

    return Response.json(
      { message: "Stock adjustment saved successfully" },
      { status: 200 }
    );
  } catch (err) {
    console.error("💥 Error saving stock adjustment:", err);
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