import { NextResponse } from "next/server";
import bcrypt from "bcryptjs";
import { z } from "zod";

import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { checkRateLimit, getClientIp } from "@/lib/rateLimit";
import { isValidEmail, normalizeEmail, validatePasswordStrength } from "@/lib/security";
import { isValidBirthDate, isValidUsername, normalizeUsername, USERNAME_REQUIREMENTS } from "@/lib/userProfile";

const registerSchema = z.object({
  email: z.string().trim().min(1),
  password: z.string().min(1),
  name: z.string().trim().min(2).max(80),
  username: z.string().trim().transform(normalizeUsername),
  birthDate: z.string().trim(),
});

export async function POST(req: Request) {
  try {
    const rateLimit = checkRateLimit(`register:${getClientIp(req)}`, {
      limit: 5,
      windowMs: 15 * 60 * 1000,
    });

    if (!rateLimit.success) {
      return NextResponse.json({ message: "Too many registration attempts" }, { status: 429 });
    }

    const parsed = registerSchema.safeParse(await req.json());
    if (!parsed.success) {
      return NextResponse.json({ message: "Invalid registration payload" }, { status: 400 });
    }

    const email = normalizeEmail(parsed.data.email);
    const { password, name, username, birthDate } = parsed.data;

    if (!isValidEmail(email)) {
      return NextResponse.json({ message: "Invalid email address" }, { status: 400 });
    }

    if (!isValidUsername(username)) {
      return NextResponse.json({ message: USERNAME_REQUIREMENTS }, { status: 400 });
    }

    if (!isValidBirthDate(birthDate)) {
      return NextResponse.json({ message: "Enter a valid birthdate." }, { status: 400 });
    }

    const passwordError = validatePasswordStrength(password);
    if (passwordError) {
      return NextResponse.json({ message: passwordError }, { status: 400 });
    }

    await dbConnect();

    const existingUser = await User.findOne({ email });
    if (existingUser) {
      return NextResponse.json({ message: "User already exists" }, { status: 409 });
    }

    const existingUsername = await User.findOne({ username });
    if (existingUsername) {
      return NextResponse.json({ message: "That username is already taken." }, { status: 409 });
    }

    const hashedPassword = await bcrypt.hash(password, 12);

    const newUser = await User.create({
      email,
      password: hashedPassword,
      name: name.trim(),
      username,
      birthDate,
      role: "STUDENT",
    });

    return NextResponse.json(
      { message: "User registered successfully", userId: newUser._id },
      { status: 201 }
    );
  } catch (error) {
    if (typeof error === "object" && error !== null && "code" in error && error.code === 11000) {
      return NextResponse.json({ message: "That username is already taken." }, { status: 409 });
    }

    console.error("POST /api/auth/register error:", error);
    return NextResponse.json({ message: "Internal server error" }, { status: 500 });
  }
}
