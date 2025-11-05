import NextAuth from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";

import clientPromise from "../../../../lib/mongodb";
import { MongoDBAdapter } from "@next-auth/mongodb-adapter";
import { compare } from 'bcryptjs';
import dbConnect from '@/lib/mongoose';
import User from '@/models/User';

export const authOptions = {
  adapter: MongoDBAdapter(clientPromise),
  providers: [
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        username: { label: "Username", type: "text", placeholder: "username" },
        password: { label: "Password", type: "password" }
      },
      async authorize(credentials) {
        await dbConnect();
        const identifier = credentials.email || credentials.username;
        const password = credentials.password;
        if (!identifier || !password) return null;
        const user = await User.findOne({ $or: [ { email: identifier }, { username: identifier } ] });
        console.log("Email:", identifier, "Password:", password, user);
        if (!user) return null;
        const isValid = await compare(password, user.password);
        if (!isValid) return null;
        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role
        };
      }
    })
  ],
  session: {
    strategy: "jwt"
  },
  jwt: {
    secret: process.env.NEXTAUTH_SECRET || "supersecret"
  },
  pages: {
    signIn: "/sign-in"
  },
  callbacks: {
    async session({ session, token, user }) {
      session.user.id = token.id;
      session.user.role = token.role;
      return session;
    },
    async jwt({ token, user }) {
      if (user) {
        token.id = user.id;
        token.role = user.role;
      }
      return token;
    }
  }
};

const handler = NextAuth(authOptions);
export { handler as GET, handler as POST };
