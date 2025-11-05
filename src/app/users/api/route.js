import { NextResponse } from "next/server";
import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";


export async function GET(req) {
  await dbConnect();
  try {
    const users = await User.find({ deleted: 0 }, "_id name email role active");
    return NextResponse.json(users);
  } catch (err) {
    return NextResponse.json({ error: "Failed to fetch users" }, { status: 500 });
  }
}

export async function PUT(req) {
  await dbConnect();
  try {
    const { _id, ...update } = await req.json();
    if (!_id) return NextResponse.json({ error: "User ID required" }, { status: 400 });
    const user = await User.findByIdAndUpdate(_id, update, { new: true });
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json(user);
  } catch (err) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

export async function DELETE(req) {
  await dbConnect();
  const { searchParams } = new URL(req.url);
  const id = searchParams.get('id');

  try {
   
    if (!id) return NextResponse.json({ error: "User ID required" }, { status: 400 });
    const user = await User.findByIdAndUpdate(id, { $set: { deleted: 1 }}, { new: true });
    console.log(id);
    if (!user) return NextResponse.json({ error: "User not found" }, { status: 404 });
    return NextResponse.json({ message: "User deleted successfully", user });
  } catch (err) {
    return NextResponse.json({ error: "Failed to update user" }, { status: 500 });
  }
}

