import dbConnect from "@/lib/dbConnect";
import Warehouse from "@/models/Warehouse";
import { NextResponse } from "next/server";

export async function GET() {
  await dbConnect();
  try {
    const warehouses = await Warehouse.find({}).sort({ name: 1 });
    return NextResponse.json(warehouses);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
