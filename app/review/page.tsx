"use client";

import { useSession } from "next-auth/react";
import { useEffect, useState } from "react";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import Loading from "@/components/Loading";
import ReviewPopup from "@/components/ReviewPopup";

export default function GridReviewPage() {
    const { status } = useSession();
    const [results, setResults] = useState<any[]>([]);
    const [loading, setLoading] = useState(true);
    
    const [activeTestId, setActiveTestId] = useState<string | null>(null);
    const [testType, setTestType] = useState<"full" | "sectional">("full");
    
    const [selectedAnswer, setSelectedAnswer] = useState<any | null>(null);
    const [expandedExplanations, setExpandedExplanations] = useState<Record<string, string>>({});
    const [loadingExplanations, setLoadingExplanations] = useState<Record<string, boolean>>({});

    useEffect(() => {
        if (status === "unauthenticated") window.location.href = "/auth";
        if (status === "authenticated") {
            api.get(API_PATHS.RESULTS).then(res => {
                const data = res.data.results || [];
                setResults(data);
                // Mặc định chọn bài đầu tiên phù hợp với loại đang chọn
                if (data.length > 0) {
                    const firstMatch = data.find((r: any) => testType === "full" ? !r.isSectional : r.isSectional);
                    if (firstMatch) setActiveTestId(firstMatch._id);
                }
                setLoading(false);
            }).catch(console.error);
        }
    }, [status, testType]); // Thêm testType vào đây để khi chuyển tab nó tự chọn bài mới nhất

    const handleExpandExplanation = async (questionId: string) => {
        if (expandedExplanations[questionId]) return;
        setLoadingExplanations(prev => ({ ...prev, [questionId]: true }));
        try {
            const res = await api.get(API_PATHS.getQuestionExplanation(questionId));
            if (res.data.explanation) {
                setExpandedExplanations(prev => ({ ...prev, [questionId]: res.data.explanation }));
            }
        } catch (e) {
            console.error(e);
        } finally {
            setLoadingExplanations(prev => ({ ...prev, [questionId]: false }));
        }
    };

    if (loading || status === "loading") return <Loading />;

    const filteredResults = results.filter(r => testType === "full" ? !r.isSectional : r.isSectional);
    const activeTest = filteredResults.find(r => r._id === activeTestId) || filteredResults[0];

    // FIX: renderGrid nhận thêm startIndex để hiển thị đúng số câu (vd: 28, 29...)
    const renderGrid = (answers: any[], startIndex: number) => {
        if (!answers || answers.length === 0) return <p className="text-slate-400 italic text-sm mt-2">No data for this module.</p>;
        
        return (
            <div className="grid grid-cols-10 gap-3 mt-4">
                {answers.map((ans, idx) => {
                    const isOmitted = !ans.userAnswer || ans.userAnswer === "" || ans.userAnswer === "Omitted";
                    let bgColor = "bg-slate-300"; 
                    if (!isOmitted) bgColor = ans.isCorrect ? "bg-emerald-500" : "bg-red-500";

                    return (
                        <button
                            key={idx}
                            onClick={() => setSelectedAnswer(ans)}
                            className={`w-10 h-10 rounded-full flex items-center justify-center text-white font-bold transition hover:scale-110 shadow-sm ${bgColor}`}
                        >
                            {startIndex + idx + 1}
                        </button>
                    );
                })}
            </div>
        );
    };

    return (
        <div className="min-h-screen bg-slate-50 flex">
            {/* Sidebar */}
            <div className="w-80 bg-white border-r border-slate-200 h-[calc(100vh-64px)] overflow-y-auto sticky top-16 flex flex-col shrink-0">
                <div className="p-4 border-b border-slate-100 bg-white sticky top-0 z-10">
                    <h2 className="font-bold text-lg mb-4 text-slate-800">Review Mistakes</h2>
                    <div className="flex bg-slate-100 p-1 rounded-lg">
                        <button 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${testType === "full" ? "bg-white text-blue-600 shadow" : "text-slate-500 hover:text-slate-700"}`}
                            onClick={() => setTestType("full")}
                        >
                            FULL LENGTH
                        </button>
                        <button 
                            className={`flex-1 py-1.5 text-xs font-bold rounded-md transition ${testType === "sectional" ? "bg-white text-blue-600 shadow" : "text-slate-500 hover:text-slate-700"}`}
                            onClick={() => setTestType("sectional")}
                        >
                            SECTIONAL
                        </button>
                    </div>
                </div>

                <div className="p-2 space-y-1">
                    {filteredResults.map(res => (
                        <button
                            key={res._id}
                            onClick={() => setActiveTestId(res._id)}
                            className={`w-full p-3 text-left rounded-xl transition-all ${activeTest?._id === res._id ? "bg-blue-50 border-blue-200 border-2" : "hover:bg-slate-50 border border-transparent"}`}
                        >
                            <div className="font-bold text-slate-900 truncate">{res.testId?.title}</div>
                            <div className="flex justify-between items-center mt-1">
                                <span className="text-slate-500 text-xs">{new Date(res.date).toLocaleDateString()}</span>
                                <span className="text-blue-600 font-bold text-xs">
                                    {res.isSectional 
                                        ? `Score: ${res.answers.filter((a: any) => a.isCorrect).length} / ${res.answers.length}`
                                        : `Score: ${res.score}`
                                    }
                                </span>                            
                            </div>
                        </button>
                    ))}
                </div>
            </div>

            {/* Main Content */}
            <div className="flex-1 p-10 overflow-y-auto bg-slate-50">
                {!activeTest ? (
                    <div className="flex flex-col items-center justify-center h-full text-slate-400">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200 text-center">
                            <p className="text-lg font-medium">No test results found for this category.</p>
                            <p className="text-sm">Complete a test to see your grid report here.</p>
                        </div>
                    </div>
                ) : (
                    <div className="max-w-4xl mx-auto space-y-12">
                        <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                            <h1 className="text-3xl font-black text-slate-900">{activeTest.testId?.title}</h1>
                            <p className="text-slate-500 font-medium mt-1 uppercase tracking-widest text-sm">
                                {testType === "full" ? "Full-length SAT Report" : `Sectional: ${activeTest.sectionalSubject}`}
                            </p>
                        </div>

                        {testType === "full" ? (
                            <div className="space-y-12">
                                {/* Phần 1: Reading & Writing */}
                                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-lg font-bold text-indigo-700 border-b pb-2 flex justify-between items-center">
                                                Reading and Writing module 1
                                                <span className="text-xs bg-indigo-50 px-2 py-1 rounded">27 Questions</span>
                                            </h3>
                                            {renderGrid(activeTest.answers?.slice(0, 27) || [], 0)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-indigo-700 border-b pb-2 flex justify-between items-center">
                                                Reading and Writing module 2
                                                <span className="text-xs bg-indigo-50 px-2 py-1 rounded">27 Questions</span>
                                            </h3>
                                            {renderGrid(activeTest.answers?.slice(27, 54) || [], 27)}
                                        </div>
                                    </div>
                                </div>

                                {/* Phần 2: Math */}
                                <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                    <div className="space-y-8">
                                        <div>
                                            <h3 className="text-lg font-bold text-blue-700 border-b pb-2 flex justify-between items-center">
                                                Math module 1
                                                <span className="text-xs bg-blue-50 px-2 py-1 rounded">22 Questions</span>
                                            </h3>
                                            {renderGrid(activeTest.answers?.slice(54, 76) || [], 54)}
                                        </div>
                                        <div>
                                            <h3 className="text-lg font-bold text-blue-700 border-b pb-2 flex justify-between items-center">
                                                Math module 2
                                                <span className="text-xs bg-blue-50 px-2 py-1 rounded">22 Questions</span>
                                            </h3>
                                            {renderGrid(activeTest.answers?.slice(76, 98) || [], 76)}
                                        </div>
                                    </div>
                                </div>
                            </div>
                        ) : (
                            <div className="bg-white p-8 rounded-2xl shadow-sm border border-slate-200">
                                <h3 className="text-xl font-bold text-slate-800 border-b pb-3 mb-6 uppercase tracking-tight">
                                    {activeTest.sectionalSubject} - Module {activeTest.sectionalModule}
                                </h3>
                                {renderGrid(activeTest.answers || [], 0)}
                            </div>
                        )}
                    </div>
                )}
            </div>

            {selectedAnswer && (
                <ReviewPopup 
                    ans={selectedAnswer}
                    onClose={() => setSelectedAnswer(null)}
                    expandedExplanation={expandedExplanations[selectedAnswer.questionId?._id]}
                    loadingExplanation={!!loadingExplanations[selectedAnswer.questionId?._id]}
                    onExpandExplanation={handleExpandExplanation}
                />
            )}
        </div>
    );
}