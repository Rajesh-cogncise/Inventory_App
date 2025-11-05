import dbConnect from '@/lib/mongoose';
import Product from '@/models/Product';
import { getServerSession } from 'next-auth';
import { authOptions } from '../auth/[...nextauth]/route';

// Helper: Only allow admin for create/update/delete
async function requireAdmin(req) {
  const session = await getServerSession(authOptions);
  if (!session || session.user.role !== 'admin') {
    return false;
  }
  return true;
}

export async function GET(req) {
  await dbConnect();
  const { search } = Object.fromEntries(new URL(req.url).searchParams.entries());
  let query = {};
  if (search) {
    query = {
      name: { $regex: search, $options: 'i' },
    };
    const products = await Product.find(query).select('_id name').limit(20);
    return new Response(JSON.stringify(products), {
      status: 200,
      headers: { 'Content-Type': 'application/json' },
    });
  }
  const products = await Product.find();
  return new Response(JSON.stringify(products), { status: 200 });
}

export async function POST(req) {
  if (!(await requireAdmin(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  await dbConnect();
  const body = await req.json();
  try {
    const product = new Product(body);
    await product.save();
    return new Response(JSON.stringify(product), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}

export async function PUT(req) {
  if (!(await requireAdmin(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  await dbConnect();
  const body = await req.json();
  try {
    const product = await Product.findByIdAndUpdate(body._id, body, { new: true });
    if (!product) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify(product), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}

export async function DELETE(req) {
  if (!(await requireAdmin(req))) {
    return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
  }
  await dbConnect();
  const { _id } = await req.json();
  try {
    const product = await Product.findByIdAndDelete(_id);
    if (!product) return new Response(JSON.stringify({ error: 'Not found' }), { status: 404 });
    return new Response(JSON.stringify({ message: 'Deleted' }), { status: 200 });
  } catch (error) {
    return new Response(JSON.stringify({ error: error.message }), { status: 400 });
  }
}
