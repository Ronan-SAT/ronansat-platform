// FE, trang hiển thị form cho phép login và sign up

"use client";

import { signIn } from "next-auth/react";       // để kiểm tra email và pass
import { useRouter } from "next/navigation";    // Chuyển hướng routing
import api from "@/lib/axios";                  // gửi api từ FE tới BE
import { API_PATHS } from "@/lib/apiPaths";
import Link from "next/link";
import { useState, useEffect } from "react"; // Thêm useEffect
import { useSession } from "next-auth/react"; // Thêm dòng này để kiểm tra máy quét đăng nhập

export default function AuthPage() {
    const router = useRouter();                     // Máy routing
    const { data: session, status } = useSession(); // Lấy trạng thái xem đã đăng nhập chưa, nếu rồi thì đá về trang chủ
    useEffect(() => {
        if (status === "authenticated") {
            router.push("/full-length");
        }
    }, [status, router]);



    const [isLogin, setIsLogin] = useState(true);   // Chế độ ban đầu là màn hình login, false thì chuyển sang sign up
    const [email, setEmail] = useState("");         // Quản lý ndung nhập ô email
    const [password, setPassword] = useState("");   // Quản lý ndung nhập ô pass
    const [name, setName] = useState("");           // Quản lý ndung nhập ô name
    const [error, setError] = useState("");         // Tbao lỗi
    const [loading, setLoading] = useState(false);  // Trạng thái loading để bật/tắt animation, mặc định là đang k load
    const [isError, setIsError] = useState(false); // Thêm dòng này: mặc định không phải lỗi


// TRÁNH LỘ GIAO DIỆN: Trong lúc 1 giây hệ thống đang load kiểm tra, không hiện HTML của trang này ra
    if (status === "loading" || status === "authenticated") {    
        return null; 
    }

    const handleSubmit = async (e: React.FormEvent) => {   // Khi ấn nút login/sign up
        e.preventDefault();
        setError("");            // reset thông báo lỗi trước cho sạch
        setIsError(true);        // reset lại mặc định là lỗi (chuẩn bị sẵn màu đỏ)
        setLoading(true);        // Hiển thị đang load và chặn k cho gửi nữa tránh yêu cầu rác

        try {
            if (isLogin) {     // Nếu bấm submit mà đang ở trang login
                const res = await signIn("credentials", {     // Dùng a bảo vệ signIn đi vào DB, tìm email và check pass có đúng không
                    email,
                    password,
                    redirect: false,                          // Mặc định khi NextAuth kiểm tra xong thì sẽ redirect sang trang khác => Disable tính năng đó
                });

                if (res?.error) {               // Nếu res có tồn tại (để tránh xập) và có error thì báo error
                    setIsError(true);
                    setError(res.error);
                } else {
                    router.push("/full-length");    // Nếu k có lỗi thì route user về trang chủ
                    router.refresh();    // Ấn refresh: Báo server không dùng bản nháp (chứa thông tin trang login) nữa mà F5 tải lại thông tin của trang chủ
                }
            } else {     // Tức là đang ở trang sign up
                const res = await api.post(API_PATHS.AUTH_REGISTER, { email, password, name });   // Lấy các thông tin email pass name để gửi 1 yêu cầu post về BE, mất tgian nên await
                // Ở đây dùng api nên yêu cầu được gửi tới file api để lưu vào DB luôn ở dòng này
                
                //Nếu BE bảo kết quả thành công thì tự động route về trang chủ luôn, k cần điền lại ở Login
                if (res.status >= 200 && res.status < 300) {
                    setIsError(false);  // Báo rằng đây KHÔNG PHẢI lỗi (để hiển thị nền xanh)
                    setError("Register successfully! Redirecting..."); // Set thông báo thành công
                    await signIn("credentials", { email, password, redirect: false });
                    router.push("/full-length");
                    router.refresh();
                } else {        // BE báo lỗi
                    setIsError(true);
                    setError(res.data.message || "Registration failed");
                }
            }
        } catch (err: any) {    
            setIsError(true);
            setError(err.response?.data?.message || err.response?.data?.error || "An unexpected error occurred");
        } finally {     // Tắt animation lỗi và trả lại function cho nút gửi
            setLoading(false);
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-slate-50">
            <div className="max-w-md w-full p-8 bg-white rounded-xl border border-slate-100">
                <div className="text-center mb-8">
                    <h1 className="text-3xl font-bold text-slate-900">
                        {isLogin ? "Welcome Back" : "Create Account"}
                    </h1>
                    <p className="text-slate-500 mt-2">
                        {isLogin
                            ? "Sign in to continue your SAT practice"
                            : "Start your journey to a higher score"}
                    </p>
                </div>

                {error && (
                    <div className={`mb-4 p-3 rounded-lg text-sm ${isError ? "bg-red-50 text-red-600" : "bg-green-50 text-green-600"}`}>
                        {error}
                    </div>
                )}

                <form onSubmit={handleSubmit} className="space-y-4">
                    {!isLogin && (
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                Full Name
                            </label>
                            <input
                                type="text"
                                required
                                value={name}  // value quyết định ô nhập liệu hiển thị gì ra màn hình
                                onChange={(e) => setName(e.target.value)}    // Quản lý việc điền name vào ô nhập email
                                className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                                placeholder="John Doe"
                            />
                        </div>
                    )}

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Email Address
                        </label>
                        <input
                            type="email"
                            required
                            value={email}                                  // Hiện những gì user đang type ra ô email   
                            onChange={(e) => setEmail(e.target.value)}     // Quản lý việc điền email vào ô email
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                            placeholder="you@example.com"
                        />
                    </div>

                    <div>
                        <label className="block text-sm font-medium text-slate-700 mb-1">
                            Password
                        </label>
                        <input
                            type="password"
                            required
                            value={password}                                   // Hiện những gì user đang type ra ô pass 
                            onChange={(e) => setPassword(e.target.value)}      // Quản lý việc điền pass vào ô pass
                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-600 focus:border-transparent outline-none transition-all"
                            placeholder="••••••••"
                        />

                        {isLogin && (
                            <div className="flex justify-end mt-1">
                                <Link href="/auth/forgot-password" className="text-sm text-blue-600 hover:underline">
                                    Forgot password?
                                </Link>
                            </div>
                        )}
                    </div>

                    <button
                        type="submit"
                        disabled={loading}
                        className="w-full bg-blue-600 hover:bg-blue-700 text-white font-semibold py-2 px-4 rounded-lg duration-200 disabled:opacity-50"
                    >
                        {loading ? "Please wait..." : isLogin ? "Sign In" : "Register"}
                    </button>
                </form>


                <div className="mt-6">
                    <div className="relative">
                        <div className="absolute inset-0 flex items-center">
                            <div className="w-full border-t border-slate-300"></div>
                        </div>
                        <div className="relative flex justify-center text-sm">
                            <span className="px-2 bg-white text-slate-500">Or continue with</span>
                        </div>
                    </div>

                    <button
                        onClick={() => signIn("google", { callbackUrl: "/full-length" })}
                        disabled={loading}
                        className="mt-4 w-full flex items-center justify-center gap-3 px-4 py-2 border border-slate-300 rounded-lg text-slate-700 hover:bg-slate-50 transition-colors font-medium disabled:opacity-50"
                    >
                        <svg viewBox="0 0 24 24" width="24" height="24" xmlns="http://www.w3.org/2000/svg">
                            <path fill="#4285F4" d="M22.56 12.25c0-.78-.07-1.53-.2-2.25H12v4.26h5.92c-.26 1.37-1.04 2.53-2.21 3.31v2.77h3.57c2.08-1.92 3.28-4.74 3.28-8.09z"/>
                            <path fill="#34A853" d="M12 23c2.97 0 5.46-.98 7.28-2.66l-3.57-2.77c-.98.66-2.23 1.06-3.71 1.06-2.86 0-5.29-1.93-6.16-4.53H2.18v2.84C3.99 20.53 7.7 23 12 23z"/>
                            <path fill="#FBBC05" d="M5.84 14.09c-.22-.66-.35-1.36-.35-2.09s.13-1.43.35-2.09V7.07H2.18C1.43 8.55 1 10.22 1 12s.43 3.45 1.18 4.93l2.85-2.22.81-.62z"/>
                            <path fill="#EA4335" d="M12 5.38c1.62 0 3.06.56 4.21 1.64l3.15-3.15C17.45 2.09 14.97 1 12 1 7.7 1 3.99 3.47 2.18 7.07l3.66 2.84c.87-2.6 3.3-4.53 6.16-4.53z"/>
                        </svg>
                        Google
                    </button>
                </div>

                <div className="mt-6 text-center">
                    <button
                        onClick={() => {
                            setIsLogin(!isLogin);
                            setError("");
                            setIsError(false); // Trả lại trạng thái bình thường khi đổi form
                        }}
                        className="text-sm text-blue-600 hover:text-blue-800 hover:underline"
                    >
                        {isLogin
                            ? "Don't have an account? Sign up"
                            : "Already have an account? Sign in"}
                    </button>
                </div>
            </div>
        </div>
    );
}