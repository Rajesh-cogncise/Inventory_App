import dbConnect from '@/lib/mongoose';
import ProductType from '@/models/ProductType';
import { NextResponse } from 'next/server';

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'ProductType ID required' }, { status: 400 });
  }
  try {
    await ProductType.findByIdAndDelete(id);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req) {
  await dbConnect();
  try {
    const productTypes = await ProductType.find({});
    return NextResponse.json(productTypes);
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
    return NextResponse.json({ error: 'ProductType ID required' }, { status: 400 });
  }
  try {
    const productType = await ProductType.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(productType);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
