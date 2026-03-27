"use client";

import { motion } from "framer-motion";
import { CheckCircle2, XCircle, Lightbulb, ArrowRight } from "lucide-react";

export default function ExplanationSection() {
  return (
    <section className="py-24 bg-slate-50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="grid lg:grid-cols-2 gap-16 items-center">
          {/* Left Column - Text Content */}
          <motion.div
            initial={{ opacity: 0, x: -20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6 }}
          >
            <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
              <Lightbulb className="w-4 h-4 text-blue-600" />
              <span className="text-sm font-medium text-blue-700">Deep-Dive Review</span>
            </div>

            <h2 className="text-4xl font-bold text-foreground tracking-tight mb-6">
              Understand Every Mistake
            </h2>

            <p className="text-xl text-muted-foreground leading-relaxed mb-8">
              {"Don't just look at your score. Get step-by-step, highly detailed explanations for every single incorrect answer in both Full and Sectional modes."}
            </p>

            <ul className="space-y-4">
              {[
                "Detailed breakdown of each problem-solving step",
                "Common mistake patterns identified and explained",
                "Related concepts and strategies for similar questions",
                "AI-powered chatbot for follow-up questions",
              ].map((item, index) => (
                <motion.li
                  key={index}
                  initial={{ opacity: 0, x: -10 }}
                  whileInView={{ opacity: 1, x: 0 }}
                  viewport={{ once: true }}
                  transition={{ duration: 0.4, delay: index * 0.1 }}
                  className="flex items-center gap-3"
                >
                  <CheckCircle2 className="w-5 h-5 text-blue-600 flex-shrink-0" />
                  <span className="text-foreground">{item}</span>
                </motion.li>
              ))}
            </ul>
          </motion.div>

          {/* Right Column - Interactive Mock UI */}
          <motion.div
            initial={{ opacity: 0, x: 20 }}
            whileInView={{ opacity: 1, x: 0 }}
            viewport={{ once: true }}
            transition={{ duration: 0.6, delay: 0.2 }}
          >
            <div className="relative">
              {/* Glow effect */}
              <div className="absolute inset-0 bg-gradient-to-r from-blue-500/10 to-slate-500/10 rounded-3xl blur-2xl transform scale-105" />
              
              {/* Main card */}
              <div className="relative bg-card border border-border rounded-2xl shadow-xl overflow-hidden">
                {/* Header */}
                <div className="bg-white border-b border-border px-6 py-4">
                  <div className="flex items-center justify-between">
                    <span className="text-sm font-semibold text-foreground">Question Review</span>
                    <span className="text-xs bg-red-50 text-red-600 px-2 py-1 rounded-full font-medium">Incorrect</span>
                  </div>
                </div>

                {/* Split content */}
                <div className="grid md:grid-cols-2 divide-x divide-border">
                  {/* Left - Question */}
                  <div className="p-6 bg-white">
                    <div className="flex items-center gap-2 mb-4">
                      <XCircle className="w-5 h-5 text-red-500" />
                      <span className="text-sm font-medium text-red-600">Your Answer: B</span>
                    </div>
                    
                    <div className="text-sm text-muted-foreground mb-4">
                      <span className="text-xs uppercase tracking-wide font-semibold text-slate-400 block mb-2">Question</span>
                      <p className="text-foreground">
                        If 3x + 7 = 22, what is the value of 6x + 5?
                      </p>
                    </div>

                    <div className="space-y-2">
                      {["A) 35", "B) 37", "C) 39", "D) 41"].map((option, index) => (
                        <div
                          key={option}
                          className={`p-3 rounded-lg text-sm border ${
                            index === 1
                              ? "border-red-200 bg-red-50 text-red-700"
                              : index === 0
                              ? "border-green-200 bg-green-50 text-green-700"
                              : "border-slate-100 bg-slate-50 text-slate-600"
                          }`}
                        >
                          {option}
                          {index === 0 && <span className="ml-2 text-xs font-medium">(Correct)</span>}
                          {index === 1 && <span className="ml-2 text-xs font-medium">(Your answer)</span>}
                        </div>
                      ))}
                    </div>
                  </div>

                  {/* Right - Explanation */}
                  <div className="p-6 bg-slate-50">
                    <div className="flex items-center gap-2 mb-4">
                      <Lightbulb className="w-5 h-5 text-blue-600" />
                      <span className="text-sm font-semibold text-blue-700">Step-by-Step Solution</span>
                    </div>

                    <div className="space-y-4 text-sm">
                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="font-medium text-foreground mb-2">Step 1: Solve for x</p>
                        <p className="text-muted-foreground">
                          3x + 7 = 22<br />
                          3x = 22 - 7 = 15<br />
                          x = 5
                        </p>
                      </div>

                      <div className="bg-white rounded-lg p-4 border border-slate-200">
                        <p className="font-medium text-foreground mb-2">Step 2: Calculate 6x + 5</p>
                        <p className="text-muted-foreground">
                          6x + 5 = 6(5) + 5<br />
                          = 30 + 5 = <span className="font-bold text-blue-600">35</span>
                        </p>
                      </div>

                      <div className="flex items-center gap-2 text-blue-600 font-medium cursor-pointer hover:text-blue-700 transition-colors">
                        <span>Ask AI for more help</span>
                        <ArrowRight className="w-4 h-4" />
                      </div>
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
