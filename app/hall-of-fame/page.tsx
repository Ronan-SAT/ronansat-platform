// File: app/hall-of-fame/page.tsx
"use client";

import { useState, useEffect } from "react";
import StudentCard from "@/components/StudentCard";
import StudentCardSkeleton from "@/components/StudentCardSkeleton";
import { ChevronLeft, ChevronRight, Trophy } from "lucide-react";
import api from "@/lib/axios";

export default function HallOfFame() {
    const [students, setStudents] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    const [currentPage, setCurrentPage] = useState(1);
    const [totalPages, setTotalPages] = useState(1);

    useEffect(() => {
        const fetchStudents = async () => {
            setLoading(true);
            try {
                const res = await api.get(`/api/students?page=${currentPage}&limit=8`);
                setStudents(res.data.students);
                setTotalPages(res.data.totalPages);
            } catch (err) {
                console.error("Lỗi khi tải dữ liệu học sinh", err);
            } finally {
                setLoading(false);
            }
        };

        fetchStudents();
        window.scrollTo({ top: 0, behavior: "smooth" });
    }, [currentPage]);

    return (
        <div className="min-h-screen bg-white">

            {/* ── Hero ── */}
            <div className="border-b border-slate-100 bg-white">
                <div className="max-w-4xl mx-auto px-6 pt-10 pb-8 text-center">
                    <div className="flex items-center justify-center gap-3 mb-3">
                        <p className="text-xs font-semibold text-blue-600 tracking-widest uppercase">
                            Ronan SAT
                        </p>
                        <Trophy className="w-3.5 h-3.5 text-amber-400" />
                    </div>

                    <h1 className="text-4xl md:text-5xl font-black text-slate-900 tracking-tight leading-none mb-3">
                        Hall of Fame
                    </h1>

                    <p className="text-slate-400 text-sm leading-relaxed max-w-md mx-auto">
                        Tự hào vinh danh những học sinh xuất sắc của Ronan SAT đã đạt điểm số SAT ấn tượng.
                    </p>
                </div>
            </div>

            {/* ── Student grid ── */}
            <div className="max-w-6xl mx-auto px-6 py-8">
                {loading ? (
                    <div className="space-y-10">
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {Array.from({ length: 8 }).map((_, index) => (
                                <StudentCardSkeleton key={index} />
                            ))}
                        </div>
                        <div className="flex justify-center items-center gap-4">
                            <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
                            <div className="h-4 w-28 rounded bg-slate-100 animate-pulse" />
                            <div className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse" />
                        </div>
                    </div>
                ) : students.length === 0 ? (
                    <div className="text-center py-24 text-slate-400 font-medium">
                        Chưa có dữ liệu học sinh nào.
                    </div>
                ) : (
                    <>
                        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-6">
                            {students.map((student) => (
                                <StudentCard
                                    key={student._id}
                                    name={student.name}
                                    school={student.school}
                                    score={student.score}
                                    examDate={student.examDate}
                                    imageUrl={student.imageUrl}
                                />
                            ))}
                        </div>

                        {/* Pagination */}
                        {totalPages > 1 && (
                            <div className="flex justify-center items-center gap-4 mt-14">
                                <button
                                    onClick={() => setCurrentPage(prev => Math.max(prev - 1, 1))}
                                    disabled={currentPage === 1}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <ChevronLeft className="w-5 h-5" />
                                </button>

                                <span className="text-sm font-semibold text-slate-500 px-1">
                                    Trang <span className="text-slate-900">{currentPage}</span> / {totalPages}
                                </span>

                                <button
                                    onClick={() => setCurrentPage(prev => Math.min(prev + 1, totalPages))}
                                    disabled={currentPage === totalPages}
                                    className="p-2.5 rounded-xl bg-white border border-slate-200 text-slate-500 hover:bg-slate-50 hover:border-slate-300 disabled:opacity-30 disabled:cursor-not-allowed transition-all shadow-sm"
                                >
                                    <ChevronRight className="w-5 h-5" />
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}
