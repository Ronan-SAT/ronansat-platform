"use client";

import { useState } from "react";
// Đã thay đổi import: Xóa ChevronLeft/ChevronRight và thêm ChevronUp cho nút Grid
import { EyeOff, Eye, ChevronUp, Calculator, Check, Flag } from "lucide-react";
import { Button, Popconfirm } from "antd";

interface TestHeaderProps {
    sectionName: string;
    timeRemaining: number;
    onTimeUp: () => void;
    isTimerHidden: boolean;
    setIsTimerHidden: (hide: boolean) => void;
    isLastModule?: boolean;
    showCalculator?: boolean; 

    buttonText?: string;
    confirmTitle?: string;
    confirmDescription?: string;
}

export function TestHeader({
    sectionName,
    timeRemaining,
    onTimeUp,
    isTimerHidden,
    setIsTimerHidden,
    onToggleCalculator,
    isLastModule,
    showCalculator = true,

    buttonText,
    confirmTitle,
    confirmDescription

}: TestHeaderProps & { onToggleCalculator?: () => void }) {




    

    const formatTime = (seconds: number) => {
        const mins = Math.floor(seconds / 60);
        const secs = seconds % 60;
        return `${mins.toString().padStart(2, '0')}:${secs.toString().padStart(2, '0')}`;
    };

    return (
        <header className="bg-[#ebf0f7] border-b border-slate-300 h-16 flex items-center justify-between px-6 z-50 fixed top-0 w-full left-0 right-0 shadow-sm">
            <div className="flex-1 flex items-center">
                <h1 className="font-bold text-lg text-slate-800 tracking-tight">
                    {sectionName}
                </h1>
            </div>

            {/* Timer luôn nằm giữa màn hình */}
            <div className="absolute left-1/2 -translate-x-1/2 flex justify-center items-center">
                <div className="flex flex-col items-center">
                    <div className="flex items-center gap-3">
                        {!isTimerHidden ? (
                            <span className={`text-xl font-mono font-bold tracking-wider ${timeRemaining < 300 ? "text-red-600 animate-pulse" : "text-slate-900"}`}>
                                {formatTime(timeRemaining)}
                            </span>
                        ) : (
                            <span className="text-xl font-mono text-slate-400 tracking-wider">--:--</span>
                        )}

                        <Button
                            onClick={() => setIsTimerHidden(!isTimerHidden)}
                            type="text"
                            icon={isTimerHidden ? <Eye className="w-4 h-4" /> : <EyeOff className="w-4 h-4" />}
                            className="text-slate-500 hover:text-slate-800"
                        >
                            <span className="hidden sm:inline ml-1">{isTimerHidden ? "Show" : "Hide"}</span>
                        </Button>
                    </div>
                </div>
            </div>

            <div className="flex-1 flex justify-end items-center gap-4">
              {showCalculator && (
                <Button
                    onClick={onToggleCalculator}
                    icon={<Calculator className="w-4 h-4" />}
                    type="default"
                    className="flex items-center rounded-full"
                >
                    <span className="hidden sm:inline">Calculator</span>
                </Button>
              )}

           <Popconfirm 
    title={confirmTitle || (isLastModule ? "Submit Entire Test?" : "Finish This Module?")}
    description={confirmDescription || (isLastModule 
        ? "You are about to finish the test. You cannot go back to any module after this." 
        : "Once you move to the next module, you cannot return to the current questions.")}
    onConfirm={onTimeUp} 
    okText="Yes"
    cancelText="No"
    placement="bottomRight"
>
    <Button 
        // Đổi từ "primary" sang "default" để nút không bị đổ kín màu nền
        type="default" 
        danger={buttonText === "Submit Module" || buttonText === "Submit Test" || isLastModule} 
        // Thay thế className cũ để áp dụng đúng màu và độ dày viền của ảnh
        className={`
            rounded-full px-8 h-10 font-semibold transition-all border-2
            ${(buttonText === "Submit Module" || buttonText === "Submit Test" || isLastModule)
                ? "!border-[#fb2a57] !text-[#fb2a57] hover:!bg-[#fb2a57]/10 bg-transparent" 
                : "" // Nếu là nút Next Module bình thường thì giữ nguyên style mặc định
            }
        `}
    >
        {buttonText || (isLastModule ? "Submit Test" : "Next Module")}
    </Button>
</Popconfirm>
            </div>

            {/* ĐƯỜNG PHÂN CÁCH TRÊN (DƯỚI TOP BAR) */}
            <div 
                className="absolute bottom-0 left-0 w-full h-[2px]" 
                style={{ backgroundImage: 'repeating-linear-gradient(to right, #2d3642 0, #1c2128 19px, transparent 19px, transparent 20px)' }}
            ></div>
        </header>
    );
}

interface TestFooterProps {
    moduleName?: string;
    currentIndex: number;
    totalQuestions: number;
    onNext: () => void;
    onPrev: () => void;
    onJump: (index: number) => void;
    answers: Record<string, string>;
    flagged: Record<string, boolean>;
    questions: any[];
}

export function TestFooter({
    moduleName,
    currentIndex,
    totalQuestions,
    onNext,
    onPrev,
    onJump,
    answers,
    flagged,
    questions
}: TestFooterProps) {

    const [isGridOpen, setIsGridOpen] = useState(false);

    return (
        <>
            {isGridOpen && (
                <>
                    {/* Lớp nền vô hình: Bấm ra ngoài vùng chữ nhật sẽ tự động đóng Grid */}
                    <div 
                        className="fixed inset-0 z-30" 
                        onClick={() => setIsGridOpen(false)}
                    ></div>

                    {/* Khung Pop-up hình chữ nhật nhỏ xinh */}
                    <div className="fixed bottom-20 left-1/2 -translate-x-1/2 bg-white rounded-xl shadow-[0_0_20px_rgba(0,0,0,0.15)] border border-slate-200 z-40 w-[340px] sm:w-[420px] p-5 transition-all animate-in fade-in zoom-in-95 duration-200">
                        
                        {/* Header của pop-up */}
                        <div className="flex justify-between items-center mb-4 border-b border-slate-100 pb-3">
                            <h3 className="text-base font-bold text-slate-800">Select a Question</h3>
                            <Button 
                                type="text" 
                                size="small" 
                                onClick={() => setIsGridOpen(false)}
                                className="text-slate-500 hover:text-slate-700"
                            >
                                Close
                            </Button>
                        </div>

                        {/* Chú thích (Legend) thu nhỏ lại thành 2 cột cho vừa khung */}
                        <div className="grid grid-cols-2 gap-y-2 gap-x-1 mb-5 text-xs font-medium text-slate-600">
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-900 rounded-sm"></div> Current</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 border border-blue-600 bg-blue-50 text-blue-600 flex items-center justify-center rounded-sm"><Check className="w-2 h-2" /></div> Answered</div>
                            <div className="flex items-center gap-1.5"><div className="w-3 h-3 bg-slate-100 border border-slate-300 rounded-sm"></div> Unanswered</div>
                            <div className="flex items-center gap-1.5"><Flag className="w-3 h-3 fill-amber-400 text-amber-500" /> For Review</div>
                        </div>

                        {/* Lưới câu hỏi: Thu lại còn 5 cột thay vì 10 cột để nút không bị méo */}
                        <div className="grid grid-cols-5 gap-2 max-h-[45vh] overflow-y-auto pr-1">
                            {questions.map((q, i) => {
                                const isAnswered = !!answers[q._id];
                                const isFlagged = !!flagged[q._id];
                                const isCurrent = i === currentIndex;

                                return (
                                    <button
                                        key={q._id}
                                        onClick={() => {
                                            onJump(i);
                                            setIsGridOpen(false); 
                                        }}
                                        className={`
                                            relative w-full aspect-square flex items-center justify-center rounded text-sm font-semibold transition-all border-2 
                                            ${isCurrent ? 'bg-slate-900 border-slate-900 text-white transform scale-105 z-10' :
                                            isAnswered ? 'bg-blue-50 border-blue-200 text-blue-900 hover:bg-blue-100 hover:border-blue-300' :
                                            'bg-white border-slate-200 text-slate-600 hover:border-slate-400'}
                                        `}
                                    >
                                        {isAnswered && !isCurrent && <Check className="w-3 h-3 absolute top-0.5 right-0.5 opacity-50" />}
                                        {i + 1}
                                        {isFlagged && ( 
                                            <div className="absolute -top-1.5 -right-1.5 bg-white rounded-full">
                                                <Flag className="w-4 h-4 fill-amber-400 text-amber-500" />
                                            </div>
                                        )}
                                    </button>
                                )
                            })}
                        </div>
                        
                        {/* Mũi tên chĩa xuống thanh Footer cho đẹp */}
                        <div className="absolute -bottom-2 left-1/2 -translate-x-1/2 w-4 h-4 bg-white border-b border-r border-slate-200 transform rotate-45"></div>
                    </div>
                </>
            )}

            {/* ĐỔI bg-[#f2f6fa] THÀNH bg-[#ebf0f7] CHO BOTTOM BAR */}
            {/* Đã xóa bỏ class 'relative' ở cuối dòng này */}
            <footer className="fixed bottom-0 left-0 right-0 h-16 bg-[#ebf0f7] border-t border-slate-300 flex items-center justify-between px-6 z-50">
                
                {/* ĐƯỜNG PHÂN CÁCH DƯỚI (TRÊN BOTTOM BAR) */}
                <div 
                    className="absolute top-0 left-0 w-full h-[2px]" 
                    style={{ backgroundImage: 'repeating-linear-gradient(to right, #2d3642 0, #1c2128 19px, transparent 19px, transparent 20px)' }}
                ></div>

                <div className="flex-1">
                    <span className="font-semibold text-slate-800 text-sm sm:text-base">
                        {sessionStorage.getItem('testName') || "Vinh Le"}
                    </span>
                </div>

                <div className="flex-1 flex justify-center items-center">
                    {/* Nút Grid màu đen giống ảnh, thêm bo góc rounded-md, đổi icon thành ChevronUp */}
                    <button
                        onClick={() => setIsGridOpen(!isGridOpen)}
                        className="font-bold text-white bg-[#1a1c23] hover:bg-black transition-colors px-4 py-2 rounded-md flex items-center shadow-sm text-sm"
                    >
                        <span>Question {currentIndex + 1} of {totalQuestions}</span>
                        <ChevronUp className={`w-4 h-4 transition-transform ${isGridOpen ? 'rotate-180' : ''} inline-block ml-2`} />
                    </button>
                </div>

                <div className="flex-1 flex justify-end items-center gap-3">
                    {/* Chuyển nút Back thành nút thường, màu xanh, dáng viên thuốc (pill), bỏ icon */}
                    {currentIndex > 0 && (
                        <button
                            onClick={onPrev}
                            className="bg-[#3b5bd9] hover:bg-[#2e4bb5] text-white font-semibold py-1.5 px-6 rounded-full transition-colors text-sm"
                        >
                            Back
                        </button>
                    )}

                    {/* Chuyển nút Next thành nút thường, màu xanh, dáng viên thuốc (pill), bỏ icon */}
                    {currentIndex < totalQuestions - 1 && (
                        <button
                            onClick={onNext}
                            className="bg-[#3b5bd9] hover:bg-[#2e4bb5] text-white font-semibold py-1.5 px-6 rounded-full transition-colors text-sm"
                        >
                            Next
                        </button>
                    )}
                </div>
            </footer>
        </>
    );
}