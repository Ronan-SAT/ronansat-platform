"use client";

import { motion } from "framer-motion";
import { Star, Trophy } from "lucide-react";

const students = [
  {
    name: "Sarah Chen",
    score: 1580,
    avatar: "SC",
    review: "Ronan SAT helped me improve by 200 points in just 2 months!",
  },
  {
    name: "Michael Rodriguez",
    score: 1520,
    avatar: "MR",
    review: "The detailed explanations made all the difference for my math score.",
  },
  {
    name: "Emily Johnson",
    score: 1560,
    avatar: "EJ",
    review: "Best SAT prep platform I've ever used. Highly recommend!",
  },
  {
    name: "David Kim",
    score: 1540,
    avatar: "DK",
    review: "The sectional practice mode is perfect for busy students like me.",
  },
  {
    name: "Jessica Wang",
    score: 1590,
    avatar: "JW",
    review: "I went from 1390 to 1590. This platform is incredible!",
  },
  {
    name: "Alex Thompson",
    score: 1510,
    avatar: "AT",
    review: "The AI chatbot answered all my questions instantly.",
  },
  {
    name: "Priya Patel",
    score: 1570,
    avatar: "PP",
    review: "Real test conditions helped me overcome my test anxiety.",
  },
  {
    name: "James Lee",
    score: 1550,
    avatar: "JL",
    review: "The analytics showed exactly what I needed to work on.",
  },
];

function StudentCard({ student }: { student: typeof students[0] }) {
  return (
    <div className="flex-shrink-0 w-80 bg-card border border-border rounded-2xl p-6 mx-3 hover:border-blue-200 hover:shadow-lg transition-all duration-300">
      <div className="flex items-start gap-4">
        {/* Avatar */}
        <div className="w-12 h-12 rounded-full bg-gradient-to-br from-blue-500 to-blue-600 flex items-center justify-center text-white font-bold text-sm flex-shrink-0">
          {student.avatar}
        </div>

        <div className="flex-1 min-w-0">
          {/* Name and stars */}
          <div className="flex items-center justify-between mb-1">
            <h4 className="font-semibold text-foreground truncate">{student.name}</h4>
            <div className="flex gap-0.5">
              {[...Array(5)].map((_, i) => (
                <Star key={i} className="w-3 h-3 fill-yellow-400 text-yellow-400" />
              ))}
            </div>
          </div>

          {/* Score */}
          <div className="flex items-center gap-2 mb-3">
            <Trophy className="w-4 h-4 text-blue-600" />
            <span className="text-lg font-bold text-blue-600">{student.score}</span>
            <span className="text-xs text-muted-foreground">SAT Score</span>
          </div>

          {/* Review */}
          <p className="text-sm text-muted-foreground leading-relaxed">
            {`"${student.review}"`}
          </p>
        </div>
      </div>
    </div>
  );
}

export default function TestimonialsMarquee() {
  return (
    <section className="py-24 bg-white overflow-hidden">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 mb-12">
        <motion.div
          initial={{ opacity: 0, y: 20 }}
          whileInView={{ opacity: 1, y: 0 }}
          viewport={{ once: true }}
          transition={{ duration: 0.6 }}
          className="text-center"
        >
          <div className="inline-flex items-center gap-2 bg-blue-50 border border-blue-100 rounded-full px-4 py-1.5 mb-6">
            <Trophy className="w-4 h-4 text-blue-600" />
            <span className="text-sm font-medium text-blue-700">Hall of Fame</span>
          </div>

          <h2 className="text-4xl font-bold text-foreground tracking-tight mb-4">
            Join Our High Scorers
          </h2>
          <p className="text-xl text-muted-foreground max-w-2xl mx-auto">
            Thousands of students have achieved their dream scores with Ronan SAT. Here are some of their stories.
          </p>
        </motion.div>
      </div>

      {/* Marquee Container */}
      <div className="relative">
        {/* Gradient masks */}
        <div className="absolute left-0 top-0 bottom-0 w-32 bg-gradient-to-r from-white to-transparent z-10 pointer-events-none" />
        <div className="absolute right-0 top-0 bottom-0 w-32 bg-gradient-to-l from-white to-transparent z-10 pointer-events-none" />

        {/* Scrolling content */}
        <div className="flex animate-marquee">
          {/* First set */}
          {students.map((student, index) => (
            <StudentCard key={`first-${index}`} student={student} />
          ))}
          {/* Duplicate set for seamless loop */}
          {students.map((student, index) => (
            <StudentCard key={`second-${index}`} student={student} />
          ))}
        </div>
      </div>
    </section>
  );
}
