import dbConnect from "../../../lib/dbConnect";
import OrderRequest from "../../../models/OrderRequest";
import { NextResponse } from "next/server";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  let filter = {};
  if (id) filter._id = id;
  // Add more filters as needed
  const requests = id
    ? await OrderRequest.findOne(filter).populate("items.productId items.warehouseId generatedBy userId")
    : await OrderRequest.find(filter).populate("items.productId items.warehouseId generatedBy userId").sort({ requestDate: -1 });
  return NextResponse.json(requests);
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const request = await OrderRequest.create(body);
    return NextResponse.json(request);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const request = await OrderRequest.findByIdAndUpdate(body._id, body, { new: true });
    return NextResponse.json(request);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "OrderRequest ID required" }, { status: 400 });
  }
  try {
    await OrderRequest.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
