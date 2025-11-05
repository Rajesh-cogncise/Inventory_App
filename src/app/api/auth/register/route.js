import { hash } from 'bcryptjs';
import clientPromise from '@/lib/mongodb';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';
import { getServerSession } from 'next-auth';
import { authOptions } from '../[...nextauth]/route';

export async function POST(req) {
  try {
    const session = await getServerSession(authOptions);
    if (!session || session.user.role !== 'admin') {
      return new Response(JSON.stringify({ error: 'Unauthorized' }), { status: 403 });
    }
    await dbConnect();
    const { email, password, name, role, username } = await req.json();
    if (!email || !password) {
      return new Response(JSON.stringify({ error: 'Missing fields' }), { status: 400 });
    }
    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return new Response(JSON.stringify({ error: 'User already exists' }), { status: 409 });
    }
    const hashedPassword = await hash(password, 10);
    const user = new User({
      email,
      password: hashedPassword,
      name: name || '',
      role,
      username,
    });
    await user.save();
    return new Response(JSON.stringify({ message: 'User registered successfully' }), { status: 201 });
  } catch (error) {
    return new Response(JSON.stringify({ error: 'Internal server error' }), { status: 500 });
  }
}

