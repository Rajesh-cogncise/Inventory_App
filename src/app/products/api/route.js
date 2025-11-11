import dbConnect from '@/lib/mongoose';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

// export async function GET() {
//   await dbConnect();
//   const products = await Product.find({});
//   return NextResponse.json(products);
// }

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }
  try {
    await Product.findByIdAndUpdate(id, { isActive: false });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}

export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) {
    const products = await Product.find({isActive: true});
    return NextResponse.json(products);
  }
  try {
    const product = await Product.findById(id);
    return NextResponse.json(product);
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
    return NextResponse.json({ error: 'Product ID required' }, { status: 400 });
  }
  try {
    const product = await Product.findByIdAndUpdate(id, body, { new: true });
    return NextResponse.json(product);
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
