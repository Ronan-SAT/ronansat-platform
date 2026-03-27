import type { Metadata } from "next";      // Cấu hình tab trình duyệt
import AuthProvider from "@/components/AuthProvider";     // Quản lý đăng nhập
import { Geist, Geist_Mono } from "next/font/google"; 
import "./globals.css";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {         
  title: "Ronan SAT - Master the SAT with Personalized, Data-Driven Practice",
  description: "Experience real test conditions, target your exact weaknesses, and achieve your dream score with our comprehensive SAT preparation platform. Full-length exams, sectional practice, and detailed explanations.",
};

export default function RootLayout({
  children,                                    // children đại diện trang hiện tại mà user đang truy cập 
}: Readonly<{                     // Không được thay đổi
  children: React.ReactNode;      // React.ReactNode là bất cứ thứ gì có thể hiển thị lên màn hình (HTML, components,...)
                                  // Việc ép children ở dạng React.ReactNode khiến những thứ truyền vào children chỉ là những thứ hiện lên được, nếu k hiển thị được (như 1 bài toán +-) thì báo lỗi ngay từ lúc viết code
}>) {
  return (
    <html lang="en">
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased`}
      >
        <AuthProvider>    {/**Bọc toàn bộ web ktra liên tục xem đã login chưa*/}
          {children}
        </AuthProvider>
      </body>
    </html>
  );
}
