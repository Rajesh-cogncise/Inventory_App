import dbConnect from "@/lib/dbConnect";
import User from "@/models/User";
import { sendMail } from "@/lib/mailer";
import crypto from "crypto";
import { hash } from 'bcryptjs';

export async function POST(req) {
  await dbConnect();
  // try {
    const { email } = await req.json();
    if (!email) return Response.json({ error: "Email is required" }, { status: 400 });
    const user = await User.findOne({ email });
    if (!user) return Response.json({ error: "User not found" }, { status: 404 });

    // Generate reset token
    const token = crypto.randomBytes(32).toString("hex");
    const tokenExpiry = Date.now() + 1000 * 60 * 60; // 1 hour
    user.resetPasswordToken = token;
    user.resetPasswordExpires = tokenExpiry;
    user.username ? user.username = user.username : user.username = email;
    let resssss = await user.save();
    console.log("RESSSSS", resssss);
    // Send email
    const resetUrl = `${process.env.NEXTAUTH_URL || "http://localhost:3000"}/forgot-password?token=${token}`;
    await sendMail({
      to: user.email,
      subject: "Reset your password",
      html: `<p>Click <a href="${resetUrl}">here</a> to reset your password. This link will expire in 1 hour.</p>`,
      text: `Reset your password: ${resetUrl}`,
    });

    return Response.json({ success: true });
  // } catch (err) {
    console.error("Error sending reset email:", err);
    // Return a generic error message to avoid leaking sensitive information
    return Response.json({ error: "Failed to send reset email" }, { status: 500 });
  // }
}

export async function PUT(req) {
  await dbConnect();
  try {
    const { token, password } = await req.json();
    if (!token || !password) return Response.json({ error: "Token and password required" }, { status: 400 });
    const user = await User.findOne({
      resetPasswordToken: token,
      resetPasswordExpires: { $gt: Date.now() },
    });
    if (!user) return Response.json({ error: "Invalid or expired token" }, { status: 400 });
    user.password =  await hash(password, 10);; // Assume pre-save hook hashes password
    user.resetPasswordToken = undefined;
    user.resetPasswordExpires = undefined;
    await user.save();
    return Response.json({ success: true });
  } catch (err) {
    return Response.json({ error: "Failed to reset password" }, { status: 500 });
  }
}
