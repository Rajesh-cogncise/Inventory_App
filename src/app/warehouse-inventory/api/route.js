import "@/models/Warehouse";
import "@/models/Product";
import dbConnect from "../../../lib/dbConnect";
import WarehouseInventory from "../../../models/WarehouseInventory";

export async function GET(req) {
  await dbConnect();

  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");

  const filter = {};
  if (warehouseId) {
    filter.warehouseId = warehouseId; // Apply filter only if provided
  }

  const inventory = await WarehouseInventory.find(filter)
    .sort({ lastUpdated: -1 })
    .populate('warehouseId', 'name location')     // Optional: specify fields
    .populate('products.productId', 'name type ');  // Optional: specify fields

  return Response.json(inventory);
}


export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const item = await WarehouseInventory.create(body);
    return Response.json(item);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const { warehouseId, productId, variationId, ...update } = body;
    const item = await WarehouseInventory.findOneAndUpdate(
      { warehouseId, productId, variationId },
      { ...update, lastUpdated: Date.now() },
      { new: true }
    );
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(item);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function PATCH(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const { warehouseId, productId, variationId, ...update } = body;
    const item = await WarehouseInventory.findOneAndUpdate(
      { warehouseId, productId, variationId },
      { ...update, lastUpdated: Date.now() },
      { new: true }
    );
    if (!item) return Response.json({ error: "Not found" }, { status: 404 });
    return Response.json(item);
  } catch (err) {
    return Response.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const warehouseId = searchParams.get("warehouseId");
  const productId = searchParams.get("productId");
  const variationId = searchParams.get("variationId");
  if (!warehouseId || !productId || !variationId) {
    return Response.json({ error: "Missing required params" }, { status: 400 });
  }
  const result = await WarehouseInventory.findOneAndDelete({
    warehouseId,
    productId,
    variationId,
  });
  if (!result) return Response.json({ error: "Not found" }, { status: 404 });
  return Response.json({ success: true });
}
