import dbConnect from "@/lib/dbConnect";
import StockPurchase from "@/models/StockPurchase";
import WarehouseInventory from "@/models/WarehouseInventory";
import { NextResponse } from "next/server";
import "@/models/Warehouse";

// GET: List all stock purchases
export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const supplierId = searchParams.get("supplierId");
  const warehouseId = searchParams.get("warehouseId");
  const fromDate = searchParams.get("fromDate"); // YYYY-MM-DD
  const toDate = searchParams.get("toDate");     // YYYY-MM-DD

  const filter = {};

  if (supplierId) filter.supplier = supplierId;
  if (warehouseId) filter.warehouseId = warehouseId;

  // Build date filter
  if (fromDate || toDate) {
    filter.date = {};
    if (fromDate) filter.date.$gte = new Date(fromDate);
    if (toDate) {
      const to = new Date(toDate);
      to.setHours(23, 59, 59, 999); // include full day
      filter.date.$lte = to;
    }
  }

  try {
    const purchases = await StockPurchase.find(filter)
      .sort({ date: -1 })
      .populate("warehouseId", "name")
      .populate("supplier", "name");

    return NextResponse.json(purchases);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 500 });
  }
}

// POST: Create a new stock transfer and update inventories
export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  console.log('Received stock purchase:', body);

   // Convert incoming date string to Date object before saving
  const istDate = new Date().toLocaleString("en-US", { timeZone: "Asia/Kolkata" });
  body.date = new Date(istDate);
  try { 
    
    for (const product of body.products) {
      console.log('Processing product:', product);
      product.productId = product.value;
      delete product.value;
    }
    console.log(body);
    let sp = await StockPurchase.create(body);
    

    // For each product, push to WarehouseInventory products array
    for (const product of body.products) {
      await WarehouseInventory.findOneAndUpdate(
        { warehouseId: body.warehouseId },
        {
          $push: { products: {
            productId: product.productId,
            price: product.price,
            quantity: product.quantity
          } },
          $inc: { currentStock: product.quantity },
          lastUpdated: Date.now()
        },
        { new: true, upsert: true }
      );
    }
    return NextResponse.json(sp, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PUT: Update a stock transfer (does not re-transfer inventory)
export async function PUT(req) {
  await dbConnect();
  const body = await req.json();
  try {
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// DELETE: Remove a stock transfer
export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) return NextResponse.json({ error: "Transfer ID required" }, { status: 400 });
  try {
    await StockPurchase.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
