import dbConnect from "@/lib/dbConnect";
import StockTransfer from "@/models/StockTransfer";
import WarehouseInventory from "@/models/WarehouseInventory";
import { NextResponse } from "next/server";

// GET: List all stock transfers
export async function GET(req) {
  await dbConnect();
  const transfers = await StockTransfer.find({}).sort({ createdAt: -1 });
  return NextResponse.json(transfers);
}

// POST: Create a new stock transfer and update inventories
export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const transfer = await StockTransfer.create(body);
    // Decrement from source
    await WarehouseInventory.findOneAndUpdate(
      {
        warehouseId: body.fromWarehouseId,
        productId: body.productId,
        variationId: body.variationId,
      },
      { $inc: { currentStock: -Math.abs(body.quantity) }, lastUpdated: Date.now() }
    );
    // Increment to destination
    await WarehouseInventory.findOneAndUpdate(
      {
        warehouseId: body.toWarehouseId,
        productId: body.productId,
        variationId: body.variationId,
      },
      { $inc: { currentStock: Math.abs(body.quantity) }, lastUpdated: Date.now() },
      { upsert: true }
    );
    return NextResponse.json(transfer, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

// PUT: Update a stock transfer (does not re-transfer inventory)
export async function PUT(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const transfer = await StockTransfer.findByIdAndUpdate(body._id, body, { new: true });
    return NextResponse.json(transfer);
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
    await StockTransfer.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
