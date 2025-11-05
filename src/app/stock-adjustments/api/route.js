import dbConnect from "@/lib/dbConnect";
import StockAdjustment from "@/models/StockAdjustment";
import WarehouseInventory from "@/models/WarehouseInventory";
import { NextResponse } from "next/server";

// GET: List all stock adjustments
export async function GET(req) {
  await dbConnect();
  const adjustments = await StockAdjustment.find({}).sort({ createdAt: -1 });
  return NextResponse.json(adjustments);
}

// POST: Create a new stock adjustment and update inventory
export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const adjustment = await StockAdjustment.create(body);
    // Update inventory
    await WarehouseInventory.findOneAndUpdate(
      {
        warehouseId: body.warehouseId,
        productId: body.productId,
        variationId: body.variationId,
      },
      { $inc: { currentStock: body.quantity }, lastUpdated: Date.now() }
    );
    return NextResponse.json(adjustment, { status: 201 });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
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
