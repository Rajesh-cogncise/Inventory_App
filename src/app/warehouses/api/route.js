import dbConnect from '@/lib/mongoose';
import Warehouse from '@/models/Warehouse';
import { NextResponse } from 'next/server';

// Pre-configured warehouses
const defaultWarehouses = [
  { name: 'Central Warehouse', location: 'City Center', address: '123 Main St', isActive: true },
  { name: 'North Warehouse', location: 'North District', address: '456 North Ave', isActive: true },
  { name: 'South Warehouse', location: 'South District', address: '789 South Blvd', isActive: true },
];

export async function GET() {
  await dbConnect();
  let warehouses = await Warehouse.find({});
  if (warehouses.length === 0) {
    warehouses = await Warehouse.insertMany(defaultWarehouses);
  }
  return NextResponse.json(warehouses);
}

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const warehouse = await Warehouse.create(body);
    return NextResponse.json(warehouse, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PUT(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  const body = await req.json();
  if (!id) {
    return NextResponse.json({ error: 'Warehouse ID required' }, { status: 400 });
  }
  try {
    const warehouse = await Warehouse.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(warehouse);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Warehouse ID required' }, { status: 400 });
  }
  try {
    await Warehouse.findByIdAndUpdate(id, { isActive: false });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function PATCH(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Warehouse ID required' }, { status: 400 });
  }
  try {
    await Warehouse.findByIdAndUpdate(id, { isActive: true });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
