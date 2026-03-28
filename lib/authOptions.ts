import { NextAuthOptions } from "next-auth";
import CredentialsProvider from "next-auth/providers/credentials";
import GoogleProvider from "next-auth/providers/google"; // Thêm dòng này
import bcrypt from "bcryptjs";
import dbConnect from "@/lib/mongodb";
import User from "@/lib/models/User";

export const authOptions: NextAuthOptions = {
    providers: [
        // Cấu hình Google Provider
        GoogleProvider({
            clientId: process.env.GOOGLE_CLIENT_ID as string,
            clientSecret: process.env.GOOGLE_CLIENT_SECRET as string,
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

                await dbConnect();

                const user = await User.findOne({ email: credentials.email }).select("+password");

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
                    role: user.role,
                };
            },
        }),
    ],
    callbacks: {
        // Callback này chạy ngay khi người dùng đăng nhập thành công
        async signIn({ user, account }) {
            // Nếu đăng nhập bằng Google, kiểm tra xem user đã có trong DB chưa
            if (account?.provider === "google") {
                
                // THÊM ĐOẠN NÀY: Kiểm tra chặn lại nếu Google không trả về email
                if (!user.email) {
                    console.error("Google login failed: No email provided");
                    return false; 
                }

                await dbConnect();
                try {
                    const existingUser = await User.findOne({ email: user.email });
                    // Nếu chưa có, tạo user mới
                    if (!existingUser) {
                        await User.create({
                            email: user.email, // Lúc này TypeScript đã chắc chắn 100% email có thật
                            name: user.name || "Người dùng Google", // Dự phòng nếu Google không trả về tên
                            role: "user",
                        });
                    }
                    return true;
                } catch (error) {
                    console.error("Error saving Google user", error);
                    return false;
                }
            }
            return true; // Cho phép đi tiếp nếu dùng email/password bình thường
        },
        async jwt({ token, user, account }) {
            if (account?.provider === "google") {
                // Nếu là Google, ta phải lấy ID và Role từ database để nhét vào token
                await dbConnect();
                const dbUser = await User.findOne({ email: token.email });
                if (dbUser) {
                    token.id = dbUser._id.toString();
                    token.role = dbUser.role;
                }
            } else if (user) {
                // Nếu dùng email/pass bình thường
                token.id = user.id;
                token.role = user.role;
            }
            return token;
        },
        async session({ session, token }) {
            if (session.user) {
                session.user.id = token.id as string;
                session.user.role = token.role as "user" | "admin";
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