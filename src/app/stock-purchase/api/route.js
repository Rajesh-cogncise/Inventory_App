import dbConnect from "@/lib/dbConnect";
import StockPurchase from "@/models/StockPurchase";
import WarehouseInventory from "@/models/WarehouseInventory";
import { NextResponse } from "next/server";
import "@/models/Warehouse";

// GET: List all stock purchases
export async function GET(req) {
  await dbConnect();
  const purchases = await StockPurchase.find({}).sort({ createdAt: -1 }).populate('warehouseId');
  return NextResponse.json(purchases);
}

// POST: Create a new stock transfer and update inventories
export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  console.log('Received stock purchase:', body);
  try { 
    
    for (const product of body.products) {
      console.log('Processing product:', product);
      product.productId = product.value;
      delete product.value;
    }
    
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
