"use client";

import Link from "next/link";
import { motion } from "framer-motion";
import { ArrowRight, TrendingUp, Clock, Target } from "lucide-react";

export default function HeroSection() {
  return (
    <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 to-white pt-20 pb-32">
      {/* Background decorative elements */}
      <div className="absolute inset-0 overflow-hidden">
        <div className="absolute -top-40 -right-40 w-80 h-80 bg-blue-100 rounded-full opacity-30 blur-3xl" />
        <div className="absolute top-60 -left-40 w-80 h-80 bg-slate-200 rounded-full opacity-40 blur-3xl" />
      </div>

      <div className="relative max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
              <span className="w-2 h-2 bg-blue-600 rounded-full animate-pulse" />
              <span className="text-sm font-medium text-blue-700">Trusted by 10,000+ students</span>
            </div>
            
            <h1 className="text-5xl sm:text-6xl font-bold text-foreground tracking-tight leading-tight text-balance">
              Master the SAT with{" "}
              <span className="text-primary">Personalized, Data-Driven</span>{" "}
              Practice
            </h1>
            
            <p className="mt-6 text-xl text-muted-foreground leading-relaxed max-w-xl">
              Experience real test conditions, target your exact weaknesses, and achieve your dream score with our comprehensive SAT preparation platform.
            </p>

            <div className="mt-10 flex flex-col sm:flex-row gap-4">
              <Link
                href="/auth"
                className="inline-flex items-center justify-center gap-2 bg-primary hover:bg-blue-700 text-primary-foreground px-8 py-4 rounded-xl text-lg font-semibold transition-all shadow-lg shadow-blue-500/25 hover:shadow-xl hover:shadow-blue-500/30"
              >
                Start Free Trial
                <ArrowRight className="w-5 h-5" />
              </Link>
              <a
                href="#features"
                className="inline-flex items-center justify-center gap-2 bg-secondary hover:bg-slate-200 text-secondary-foreground px-8 py-4 rounded-xl text-lg font-semibold transition-all"
              >
                Explore Features
              </a>
            </div>

            {/* Trust indicators */}
            <div className="mt-12 flex items-center gap-8">
              <div className="flex items-center gap-2">
                <div className="flex -space-x-2">
                  {[1, 2, 3, 4, 5].map((i) => (
                    <div
                      key={i}
                      className="w-8 h-8 rounded-full bg-gradient-to-br from-slate-200 to-slate-300 border-2 border-white flex items-center justify-center text-xs font-bold text-slate-600"
                    >
                      {String.fromCharCode(64 + i)}
                    </div>
                  ))}
                </div>
                <span className="text-sm text-muted-foreground ml-2">
                  <span className="font-semibold text-foreground">4.9/5</span> from 2,500+ reviews
                </span>
              </div>
            </div>
          </motion.div>

          {/* Right Column - Dashboard Preview Card */}
          <motion.div
            initial={{ opacity: 0, scale: 0.95 }}
            animate={{ opacity: 1, scale: 1 }}
            transition={{ duration: 0.6, delay: 0.2 }}
            className="relative"
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/20 to-blue-600/20 rounded-3xl blur-2xl transform scale-105" />
              
              {/* Main card */}
              <div className="relative bg-card border border-border rounded-2xl shadow-2xl overflow-hidden">
                {/* Card header */}
                <div className="bg-slate-50 border-b border-border px-6 py-4 flex items-center justify-between">
                  <div className="flex items-center gap-3">
                    <div className="w-3 h-3 rounded-full bg-red-400" />
                    <div className="w-3 h-3 rounded-full bg-yellow-400" />
                    <div className="w-3 h-3 rounded-full bg-green-400" />
                  </div>
                  <span className="text-sm font-medium text-muted-foreground">Your Dashboard</span>
                </div>
                
                {/* Card content */}
                <div className="p-6">
                  {/* Score display */}
                  <div className="text-center mb-8">
                    <p className="text-sm font-medium text-muted-foreground mb-2">Your Projected Score</p>
                    <motion.div
                      initial={{ scale: 0.8, opacity: 0 }}
                      animate={{ scale: 1, opacity: 1 }}
                      transition={{ duration: 0.5, delay: 0.5 }}
                      className="text-7xl font-black text-primary"
                    >
                      1550+
                    </motion.div>
                    <div className="flex items-center justify-center gap-2 mt-2">
                      <TrendingUp className="w-4 h-4 text-green-500" />
                      <span className="text-sm font-medium text-green-600">+120 points improvement</span>
                    </div>
                  </div>

                  {/* Stats grid */}
                  <div className="grid grid-cols-3 gap-4">
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <Clock className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">24</p>
                      <p className="text-xs text-muted-foreground">Tests Taken</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <Target className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">92%</p>
                      <p className="text-xs text-muted-foreground">Accuracy</p>
                    </div>
                    <div className="bg-slate-50 rounded-xl p-4 text-center">
                      <TrendingUp className="w-5 h-5 text-blue-600 mx-auto mb-2" />
                      <p className="text-2xl font-bold text-foreground">Top 5%</p>
                      <p className="text-xs text-muted-foreground">Percentile</p>
                    </div>
                  </div>

                  {/* Progress bar */}
                  <div className="mt-6">
                    <div className="flex justify-between text-sm mb-2">
                      <span className="text-muted-foreground">Progress to 1600</span>
                      <span className="font-semibold text-foreground">97%</span>
                    </div>
                    <div className="h-2 bg-slate-100 rounded-full overflow-hidden">
                      <motion.div
                        initial={{ width: 0 }}
                        animate={{ width: "97%" }}
                        transition={{ duration: 1, delay: 0.8 }}
                        className="h-full bg-gradient-to-r from-blue-500 to-blue-600 rounded-full"
                      />
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}
