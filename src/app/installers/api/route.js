import dbConnect from "../../../lib/dbConnect";
import Installers from "@/models/Installers";
// import WarehouseInventory from "../../../models/WarehouseInventory";
import { NextResponse } from "next/server";

// Helper: decrement stock
// async function decrementStock(products) {
//   for (const p of products) {
//     await WarehouseInventory.findOneAndUpdate(
//       {
//         warehouseId: p.warehouseId,
//         productId: p.productId,
//         // variationId: p.variationId
//       },
//       { $inc: { currentStock: -Math.abs(p.quantity) }, lastUpdated: Date.now() }
//     );
//   }
// }

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get("id");
  if (userId) {
    try {
      const installer = await Installers.findById(userId);      
      if (!installer) return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
      return NextResponse.json(installer);
    }
    catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  const search = searchParams.get("search");
  if (search) {
    try {
      const installer = await Installers.find({name: { $regex: search, $options: 'i' }}).limit(20);      
      if (!installer) return NextResponse.json({ error: 'Installer not found' }, { status: 404 });
      return NextResponse.json(installer);
    }
    catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  }

  const installers = await Installers.find({}).sort({ createdAt: -1 });
  return NextResponse.json(installers);
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    if (!body.name) {
      return NextResponse.json({ error: "Name is required" }, { status: 400 });
    }
    const job = await Installers.create(body);
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const job = await Installers.findByIdAndUpdate(body._id, body, { new: true });
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get("id");
  if (!id) {
    return NextResponse.json({ error: "Installer ID required" }, { status: 400 });
  }
  try {
    await Installers.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
