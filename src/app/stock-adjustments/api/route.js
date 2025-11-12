import dbConnect from "@/lib/dbConnect";
import StockAdjustment from "@/models/StockAdjustment";
import StockPurchase from "@/models/StockPurchase";
import WarehouseInventory from "@/models/WarehouseInventory";
import "@/models/Warehouse";
import "@/models/User";
import { getServerSession } from "next-auth";
import { authOptions } from "@/app/api/auth/[...nextauth]/route";
import { NextResponse } from "next/server";

// GET: List all stock adjustments

// GET: List purchases with last adjustment user info
export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");
  const fromDate = searchParams.get("fromDate");
  const toDate = searchParams.get("toDate");
  const page = parseInt(searchParams.get("page") || "1", 10);
  const limit = 10;

  const filter = {};
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
      .populate("warehouseId", "name")
      .populate("supplier", "name")
      .sort({ date: -1 })
      .skip((page - 1) * limit)
      .limit(limit)
      .lean();

    // attach last adjustment user
    for (const p of purchases) {
      const lastAdjustment = await StockAdjustment.findOne({ purchaseId: p._id })
        .populate("userId", "name email")
        .sort({ createdAt: -1 })
        .lean();

        console.log("DEBUG lastAdjustment:", lastAdjustment);
        
      p.lastAdjustedBy = lastAdjustment?.userId?.name || null;
      p.lastAdjustedById = lastAdjustment?.userId?._id || null;
    }

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

// POST: Create a new stock adjustment and update inventory
export async function POST(req) {
  await dbConnect();

  // ✅ get logged-in user from session
  const session = await getServerSession(authOptions);
  console.log("DEBUG: SESSION =>", session);
  if (!session || !session.user || !session.user.id) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const userId = session.user.id; // ✅ store this in the adjustment

  const { purchaseId, products } = await req.json();

  if (!purchaseId || !products || typeof products !== "object") {
    return NextResponse.json({ error: "Missing purchaseId or products" }, { status: 400 });
  }

  try {
    const purchase = await StockPurchase.findById(purchaseId);
    if (!purchase) throw new Error("Purchase not found");

    const warehouseId = purchase.warehouseId;
    const adjustmentsArray = [];
    let newSubtotal = 0;

    // --- Loop through all products to update quantities & inventory ---
    for (const [productId, newQty] of Object.entries(products)) {
      const prod = purchase.products.find(
        (p) => p.productId.toString() === productId
      );
      if (!prod) continue;

      const oldQty = prod.quantity;
      const qtyDiff = newQty - oldQty;

      if (qtyDiff !== 0) {
        // Update purchase product quantity
        prod.quantity = newQty;

        adjustmentsArray.push({
          productId,
          oldQuantity: oldQty,
          newQuantity: newQty,
          difference: qtyDiff,
        });

        // Update warehouse inventory
        const inventory = await WarehouseInventory.findOne({
          warehouseId,
          "products.productId": productId,
        });

        if (inventory) {
          await WarehouseInventory.updateOne(
            { warehouseId, "products.productId": productId },
            { $inc: { "products.$.quantity": qtyDiff } }
          );
        } else {
          await WarehouseInventory.findOneAndUpdate(
            { warehouseId },
            {
              $push: {
                products: {
                  productId,
                  quantity: newQty,
                },
              },
            },
            { upsert: true }
          );
        }
      }

      // Recalculate subtotal incrementally
      const price = parseFloat(prod.price ?? 0);
      newSubtotal += price * newQty;
    }

    // --- Calculate GST and total ---
    const gstpercent = purchase.gstpercent ?? 10;
    const gstAmount = (newSubtotal * gstpercent) / 100;
    const total = newSubtotal + gstAmount;

    // --- Update purchase totals ---
    purchase.subtotal = newSubtotal;
    purchase.gst = gstAmount;
    purchase.total = total;
    await purchase.save();

    // --- Create ONE StockAdjustment record containing all product changes ---
    const adjustmentRecord = await StockAdjustment.create({
      purchaseId,
      warehouseId,
      userId, // ✅ save logged-in user
      products: adjustmentsArray,
      date: new Date(),
    });

    return NextResponse.json({
      success: true,
      message: "Stock adjusted successfully",
      adjustmentRecord,
      updatedTotals: {
        subtotal: newSubtotal,
        gstamount: gstAmount,
        total,
      },
    });
  } catch (err) {
    console.error("STOCK ADJUSTMENT ERROR:", err);
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// PUT: Update a stock adjustment (does not re-adjust inventory)
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

// DELETE: Remove a stock adjustment
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
