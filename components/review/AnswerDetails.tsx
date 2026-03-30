"use client";

import { CheckCircle, XCircle, AlertCircle } from "lucide-react";
import Latex from "react-latex-next";
import 'katex/dist/katex.min.css'; // THÊM DÒNG NÀY BẮT BUỘC

interface AnswerDetailsProps {
    q: any;
    ans: any;
}

export default function AnswerDetails({ q, ans }: AnswerDetailsProps) {
    const choices = q?.choices || [];
    const optionLabels = ["A", "B", "C", "D"];

    // 1. GIAO DIỆN TỰ LUẬN (SPR)
    if (q.questionType === "spr") {
        const isCorrect = ans.isCorrect;
        const isOmitted = !ans.userAnswer || ans.userAnswer === "Omitted";
        const isWrong = !isCorrect && !isOmitted;

        const wrapClass = isCorrect
            ? "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm shadow-emerald-100"
            : isWrong
            ? "bg-red-50 border-red-400 text-red-900 shadow-sm shadow-red-100"
            : "bg-white border-slate-200 text-slate-700";

        const circleClass = isCorrect
            ? "bg-emerald-500 border-emerald-500 text-white"
            : isWrong
            ? "bg-red-500 border-red-500 text-white"
            : "border-slate-300 text-slate-500 bg-white";

        const Icon = isCorrect ? CheckCircle : isWrong ? XCircle : null;

        return (
            <div className="flex flex-col gap-3">
                <div className={`flex items-center gap-3.5 px-4 py-3.5 border-2 rounded-xl transition-all duration-150 ${wrapClass}`}>
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest opacity-70 mb-1.5">Your answer</p>
                        <div className="flex flex-wrap gap-2">
                            <span className={`bg-white border px-3 py-1.5 rounded-lg font-bold shadow-sm text-sm ${isCorrect ? "text-emerald-700 border-emerald-200" : isWrong ? "text-red-700 border-red-200" : "text-slate-600 border-slate-200"}`}>
                                <Latex>{ans.userAnswer || "Omitted"}</Latex>
                            </span>
                        </div>
                    </div>
                    {Icon && <Icon className="w-4.5 h-4.5 shrink-0 opacity-70" />}
                </div>

                <div className="flex items-center gap-3.5 px-4 py-3.5 border-2 rounded-xl bg-emerald-50 border-emerald-400 shadow-sm shadow-emerald-100">
                    <div className="flex-1 min-w-0">
                        <p className="text-[11px] font-semibold uppercase tracking-widest text-emerald-700/60 mb-1.5">Accepted</p>
                        <div className="flex flex-wrap gap-2">
                            {q.sprAnswers?.filter(Boolean).map((a: string, i: number) => (
                                <span key={i} className="bg-white text-emerald-700 border border-emerald-200 px-3 py-1.5 rounded-lg font-bold shadow-sm">
                                    <Latex>{a}</Latex>
                                </span>
                            ))}
                        </div>
                    </div>
                    <CheckCircle className="w-4.5 h-4.5 shrink-0 text-emerald-700 opacity-70" />
                </div>
            </div>
        );
    }

    // 2. BÁO LỖI NẾU TRẮC NGHIỆM MÀ KHÔNG CÓ CHOICES
    if (choices.length === 0) {
        return (
            <div className="bg-amber-50 border border-amber-200 p-5 rounded-2xl">
                <div className="flex items-center gap-2 font-bold text-amber-800 mb-2 text-sm">
                    <AlertCircle className="w-4 h-4" />
                    Missing "choices" data from API
                </div>
                <p className="text-xs text-amber-700 mb-4">
                    Update <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">app/api/results/route.ts</code> to return <code className="bg-amber-100 px-1.5 py-0.5 rounded font-mono">choices</code> for each question.
                </p>
                <div className="bg-white rounded-xl border border-amber-100 p-4 flex flex-col gap-2 text-sm">
                    <div className="flex gap-2">
                        <span className="text-slate-500 font-medium w-28 shrink-0">Your answer:</span>
                        <span className={`font-bold ${ans.isCorrect ? "text-emerald-600" : "text-red-600"}`}>
                            {ans.userAnswer || "Omitted"}
                        </span>
                    </div>
                    <div className="flex gap-2">
                        <span className="text-slate-500 font-medium w-28 shrink-0">Correct answer:</span>
                        <span className="font-bold text-emerald-600"><Latex>{q.correctAnswer}</Latex></span>
                    </div>
                </div>
            </div>
        );
    }

    // 3. GIAO DIỆN TRẮC NGHIỆM BÌNH THƯỜNG
    return (
        <div className="flex flex-col gap-3">
            {choices.map((choice: string, i: number) => {
                const isUserChoice = ans?.userAnswer === choice;
                const isCorrectChoice = q?.correctAnswer === choice;

                let wrapClass = "bg-white border-slate-200 text-slate-700 hover:border-slate-300 hover:shadow-sm";
                let circleClass = "border-slate-300 text-slate-500 bg-white";
                let Icon = null;

                if (isCorrectChoice) {
                    wrapClass = "bg-emerald-50 border-emerald-400 text-emerald-900 shadow-sm shadow-emerald-100";
                    circleClass = "bg-emerald-500 border-emerald-500 text-white";
                    Icon = CheckCircle;
                } else if (isUserChoice && !isCorrectChoice) {
                    wrapClass = "bg-red-50 border-red-400 text-red-900 shadow-sm shadow-red-100";
                    circleClass = "bg-red-500 border-red-500 text-white";
                    Icon = XCircle;
                }

                return (
                    <div
                        key={i}
                        className={`flex items-center gap-3.5 px-4 py-3.5 border-2 rounded-xl transition-all duration-150 ${wrapClass}`}
                    >
                        {/* Letter circle */}
                        <div className={`w-8 h-8 shrink-0 flex items-center justify-center rounded-full border-2 font-bold text-sm ${circleClass}`}>
                            {optionLabels[i] || ""}
                        </div>
                        {/* Choice text */}
                        <span className="flex-1 text-[15px] font-medium leading-snug"><Latex>{choice}</Latex></span>
                        {/* Status icon */}
                        {Icon && <Icon className="w-4.5 h-4.5 shrink-0 opacity-70" />}
                    </div>
                );
            })}
        </div>
    );
}