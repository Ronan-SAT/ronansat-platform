import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google";
import bcrypt from "bcryptjs";

import { loadAppEnv } from "@/lib/env/loadAppEnv";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";
import { checkRateLimit } from "@/lib/rateLimit";
import { isValidEmail, normalizeEmail } from "@/lib/security";
import { hasCompletedStudentProfile } from "@/lib/userProfile";
import type { Role } from "@/lib/permissions";

loadAppEnv();

const googleClientId = process.env.GOOGLE_CLIENT_ID?.trim();
const googleClientSecret = process.env.GOOGLE_CLIENT_SECRET?.trim();

if (!googleClientId || !googleClientSecret) {
  throw new Error("Google OAuth environment variables are missing.");
}

export const authOptions: NextAuthOptions = {
  providers: [
    GoogleProvider({
      clientId: googleClientId,
      clientSecret: googleClientSecret,
    }),
    CredentialsProvider({
      name: "Credentials",
      credentials: {
        email: { label: "Email", type: "email" },
        password: { label: "Password", type: "password" },
      },
      async authorize(credentials) {
        if (!credentials?.email || !credentials?.password) {
          throw new Error("Invalid credentials");
        }

        const email = normalizeEmail(credentials.email);
        if (!isValidEmail(email)) {
          throw new Error("Invalid credentials");
        }

        const loginRateLimit = checkRateLimit(`login:${email}`, {
          limit: 10,
          windowMs: 15 * 60 * 1000,
        });

        if (!loginRateLimit.success) {
          throw new Error("Too many login attempts. Please try again later.");
        }

        await dbConnect();

        const user = await User.findOne({ email }).select("+password");
        if (!user || !user.password) {
          throw new Error("Invalid credentials");
        }

        const isPasswordCorrect = await bcrypt.compare(credentials.password, user.password);
        if (!isPasswordCorrect) {
          throw new Error("Invalid credentials");
        }

        return {
          id: user._id.toString(),
          name: user.name,
          email: user.email,
          role: user.role as Role,
          username: user.username,
          birthDate: user.birthDate,
          hasCompletedProfile: hasCompletedStudentProfile(user),
        };
      },
    }),
  ],
  callbacks: {
    async signIn({ user, account }) {
      if (account?.provider === "google") {
        if (!user.email) {
          console.error("Google login failed: No email provided");
          return false;
        }

        await dbConnect();
        try {
          const normalizedEmail = normalizeEmail(user.email);
          const existingUser = await User.findOne({ email: normalizedEmail });

          if (!existingUser) {
            await User.create({
              email: normalizedEmail,
              name: user.name || "Google User",
              role: "STUDENT",
            });
          } else if (user.name && existingUser.name !== user.name) {
            existingUser.name = user.name;
            await existingUser.save();
          }
          return true;
        } catch (error) {
          console.error("Error saving Google user", error);
          return false;
        }
      }
      return true;
    },
    async jwt({ token, user, account, trigger, session }) {
      if (trigger === "update") {
        token.name = typeof session?.name === "string" ? session.name : token.name;
        token.username = typeof session?.username === "string" ? session.username : token.username;
        token.birthDate = typeof session?.birthDate === "string" ? session.birthDate : token.birthDate;
        token.hasCompletedProfile =
          typeof session?.hasCompletedProfile === "boolean"
            ? session.hasCompletedProfile
            : token.hasCompletedProfile;
      }

      if (account?.provider === "google") {
        await dbConnect();
        const dbUser = await User.findOne({ email: token.email });
        if (dbUser) {
          token.id = dbUser._id.toString();
          token.role = dbUser.role;
          token.name = dbUser.name;
          token.username = dbUser.username;
          token.birthDate = dbUser.birthDate;
          token.hasCompletedProfile = hasCompletedStudentProfile(dbUser);
        }
      } else if (user) {
        token.id = user.id;
        token.role = user.role;
        token.name = user.name;
        token.username = user.username;
        token.birthDate = user.birthDate;
        token.hasCompletedProfile = user.hasCompletedProfile;
      }
      return token;
    },
    async session({ session, token }) {
      if (session.user) {
        session.user.id = token.id as string;
        session.user.role = token.role as Role;
        session.user.name = token.name;
        session.user.username = typeof token.username === "string" ? token.username : undefined;
        session.user.birthDate = typeof token.birthDate === "string" ? token.birthDate : undefined;
        session.user.hasCompletedProfile = Boolean(token.hasCompletedProfile);
      }
      return session;
    },
  },
  session: {
    strategy: "jwt",
  },
  pages: {
    signIn: "/auth",
  },
  secret: process.env.NEXTAUTH_SECRET,
};
