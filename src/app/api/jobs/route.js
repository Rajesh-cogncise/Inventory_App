import dbConnect from "@/lib/dbConnect";
import Job from "@/models/Job";
import { NextResponse } from "next/server";
import "@/models/Installers";
import "@/models/Product";

export async function POST(req) {
  // await dbConnect();
  // try {
  //   const body = await req.json();
  //   const job = await Job.create(body);
  //   return NextResponse.json(job, { status: 201 });
  // } catch (err) {
  //   return NextResponse.json({ error: err.message }, { status: 400 });
  // }
}


export async function GET(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (id) {
    try {
      const job = await Job.findById(id)
        .populate('products.productId')
        .populate('installer')
        .populate('requirements.productId');
        console.log(job);
      if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
      // Map products for frontend compatibility
      const totalProducts = Array.isArray(job.products)
        ? job.products.map(p => ({
            value: p.productId?._id?.toString() || p.productId?.toString() || '',
            label: p.productId?.name || '',
            quantity: p.quantity,
            warehouseId: p.warehouseId?.toString() || ''
          }))
        : [];
      const requirements = Array.isArray(job.requirements)
        ? job.requirements.map(p => ({
            value: p.productId?._id?.toString() || p.productId?.toString() || '',
            label: p.productId?.name || '',
            quantity: p.quantity,
            warehouseId: p.warehouseId?.toString() || ''
          }))
        : [];
      return NextResponse.json({
        _id: job._id,
        actualCompletedDate: job.actualCompletedDate,
        workType: job.workType,
        installer: job.installer,
        address: job.address,
        status: job.status,
        issuedDate: job.issuedDate,
        requirements,
        userId: job.userId,
        totalProducts,
        createdAt: job.createdAt,
        updatedAt: job.updatedAt,
      });
    } catch (err) {
      return NextResponse.json({ error: err.message }, { status: 400 });
    }
  } else {
    const jobs = await Job.find({}).sort({ createdAt: -1 })
      .populate('installer')
      .populate('requirements.productId');
    return NextResponse.json(jobs);
  }
}

export async function PATCH(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  try {
    const body = await req.json();
    // Convert totalProducts to products array for schema
    const products = Array.isArray(body.totalProducts)
      ? body.totalProducts.map(p => ({
          productId: p.value || p.productId,
          quantity: p.quantity || 1,
          warehouseId: p.warehouseId || null
        }))
      : [];
    const update = {
      actualCompletedDate: body.actualCompletedDate,
      workType: body.workType,
      installer: body.installer,
      status: body.status,
      userId: body.userId,
      products,
      updatedAt: new Date(),
    };
    const job = await Job.findByIdAndUpdate(id, update, { new: true });
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json(job);
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');
  if (!id) return NextResponse.json({ error: 'Job ID required' }, { status: 400 });
  try {
    const job = await Job.findByIdAndDelete(id);
    if (!job) return NextResponse.json({ error: 'Job not found' }, { status: 404 });
    return NextResponse.json({ message: 'Job deleted' });
  } catch (err) {
    return NextResponse.json({ error: err.message }, { status: 400 });
  }
}
