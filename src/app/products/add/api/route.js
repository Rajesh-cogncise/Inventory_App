import dbConnect from '@/lib/mongoose';
import Product from '@/models/Product';
import { NextResponse } from 'next/server';

export async function POST(req) {
  await dbConnect();
  const body = await req.json();
  try {
    const product = await Product.create(body);
    return NextResponse.json(product, { status: 201 });
  } catch (error) {
    return NextResponse.json({ error: error.message }, { status: 400 });
  }
}
