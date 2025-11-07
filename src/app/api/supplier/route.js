import dbConnect from "@/lib/dbConnect";
import Supplier from "@/models/Supplier";
import { NextResponse } from "next/server";

export async function GET() {
  await dbConnect();
  try {
    const suppliers = await Supplier.find({}).sort({ name: 1 });
    return NextResponse.json(suppliers);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
