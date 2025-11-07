import dbConnect from "../../../lib/dbConnect";
import Supplier from "../../../models/Supplier";
import { NextResponse } from "next/server";

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  let filter = {};
  console.log(id);
  const suppliers = await Supplier.find({ deleted: 0 });
  /*if (id) filter._id = id;
  const suppliers = id
  ? await Supplier.findOne(filter)        
  : await Supplier.find(filter).sort({ name: 1 });*/
  return NextResponse.json(suppliers);
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const supplier = await Supplier.create(body);
    return NextResponse.json(supplier);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const supplier = await Supplier.findByIdAndUpdate(body._id, body, { new: true });
    return NextResponse.json(supplier);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Supplier ID required" }, { status: 400 });
  }
  try {
    await Supplier.findByIdAndUpdate(id, { $set: { deleted: 1 }}, { new: true });
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
