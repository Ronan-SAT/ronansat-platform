import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { Analytics } from "@vercel/analytics/react";

import AuthProvider from "@/components/AuthProvider";
import Navbar from "@/components/Navbar";
import { VocabBoardProvider } from "@/components/vocab/VocabBoardProvider";
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
  description:
    "Experience real test conditions, target your exact weaknesses, and achieve your dream score with our comprehensive SAT preparation platform. Full-length exams, sectional practice, and detailed explanations.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en">
      <body className={`${geistSans.variable} ${geistMono.variable} antialiased`}>
        <AuthProvider>
          <VocabBoardProvider>
            <Navbar />
            {children}
          </VocabBoardProvider>
        </AuthProvider>
        <Analytics />
      </body>
    </html>
  );
}
