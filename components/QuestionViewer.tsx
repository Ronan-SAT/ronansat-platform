"use client";

import { useState } from "react";
import { Flag } from "lucide-react";
import { CldImage } from 'next-cloudinary';
import 'katex/dist/katex.min.css';
import Latex from 'react-latex-next';

interface QuestionViewerProps {
    question: any;
    userAnswer: string;
    onAnswerSelect: (questionId: string, choice: string) => void;
    isFlagged: boolean;
    onToggleFlag: (questionId: string) => void;
    index: number;
    leftWidth?: number;   // THÊM MỚI: nhận % từ TestEngine, mặc định 50
}

export default function QuestionViewer({
    question,
    userAnswer,
    onAnswerSelect,
    isFlagged,
    onToggleFlag,
    index,
    leftWidth = 50,       // THÊM MỚI: mặc định 50/50 nếu không truyền vào
}: QuestionViewerProps) {
    const optionLabels = ["A", "B", "C", "D"];

    // Danh sách đáp án bị loại trừ
    const [crossedOut, setCrossedOut] = useState<string[]>([]);

    // Trạng thái bật/tắt chế độ Process of Elimination
    const [showElimination, setShowElimination] = useState(false);

    const toggleCrossOut = (e: React.MouseEvent, choice: string) => {
        e.stopPropagation();
        if (crossedOut.includes(choice)) {
            setCrossedOut(crossedOut.filter(c => c !== choice));
        } else {
            // Nếu đáp án này đang được chọn thì bỏ chọn trước khi cross out
            if (userAnswer === choice) {
                onAnswerSelect(question._id, "");
            }
            setCrossedOut([...crossedOut, choice]);
        }
    };

    const hasLeftPanel = question.passage || question.imageUrl;

    // THÊM MỚI: tính % right panel từ leftWidth, trừ thêm ~12px cho divider (dùng CSS calc)
    const leftPct = `${leftWidth}%`;
    const rightPct = `${100 - leftWidth}%`;

    return (
        // THAY ĐỔI: bỏ flex-1, dùng w-full h-full để lấp đầy container từ TestEngine
        <div className="w-full flex bg-white h-[calc(100vh-8rem)] mt-16 mb-16 overflow-hidden">

            {/* Left Panel: Passage Text & Image */}
            {hasLeftPanel && (
                // THAY ĐỔI: bỏ w-1/2 hardcode, dùng inline style theo leftWidth
                <div className="h-full overflow-y-auto p-10 border-r border-slate-300" style={{ width: leftPct, flexShrink: 0 }}>
                    {question.imageUrl && (
                        <div className="flex justify-center w-full bg-slate-50 p-4 rounded border border-slate-200 mb-6">
                            <CldImage
                                src={question.imageUrl}
                                width={350}
                                height={350}
                                alt="Question Reference"
                                className="max-w-full h-auto object-contain"
                            />
                        </div>
                    )}

                    {question.passage && (
                        <div className="whitespace-pre-wrap text-[15px] leading-relaxed text-slate-900 font-serif selection:bg-yellow-200 selection:text-black">
                            <Latex>{question.passage}</Latex>
                        </div>
                    )}
                </div>
            )}

            {/* THÊM MỚI: Divider thanh kéo nằm giữa 2 panel — render từ bên trong QuestionViewer
                để đúng vị trí giữa left panel và right panel */}
            {/* THÊM MỚI: Divider thanh kéo nằm giữa 2 panel */}
{hasLeftPanel && (
    <div
    id="qv-divider"
    // Thêm class 'group' để bắt hiệu ứng hover, và 'relative' để giữ vị trí nút cầm
    className="group flex-shrink-0 flex items-center justify-center cursor-col-resize z-10 bg-slate-200 hover:bg-slate-300 transition-colors relative"
    style={{ width: "4px" }} // Thu hẹp thanh dọc (từ 16px xuống 8px)
>
    {/* Hình chữ nhật chứa mũi tên */}
    <div
        // Thêm 'absolute' để nút này có thể nổi đè lên và tràn ra ngoài thanh 8px mà không bị méo
        className="absolute flex items-center justify-center rounded-sm bg-slate-500 group-hover:bg-slate-700 transition-colors select-none pointer-events-none"
        style={{ width: "16px", height: "33px", borderRadius: "4px" }} // Làm nút to và cao hơn một chút
    >
        {/* Mũi tên trái phải mới: Kích thước to hơn (18x18) và nét dày hơn (2.5) */}
        <svg width="18" height="18" viewBox="0 0 24 24" fill="none" xmlns="http://www.w3.org/2000/svg">
            {/* Nét vẽ mũi tên trái */}
            <path d="M9 18L3 12L9 6" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
            {/* Nét vẽ mũi tên phải */}
            <path d="M15 6L21 12L15 18" stroke="white" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"/>
        </svg>
    </div>
</div>
)}

            {/* Right Panel: Question & Answers */}
            {/* THAY ĐỔI: bỏ w-1/2 hardcode, dùng inline style theo rightWidth */}
            <div
                className={`${hasLeftPanel ? "" : "max-w-3xl mx-auto"} h-full overflow-y-auto flex flex-col`}
                style={{ width: hasLeftPanel ? rightPct : "100%", flexShrink: 0 }}
            >

                {/* ── HEADER ROW ── */}
                <div className="px-6 pt-5 pb-2 shrink-0">
                    <div className="flex items-stretch h-[32px]">
                        
                        <div className="bg-[#1e293b] text-white w-[32px] flex items-center justify-center font-bold text-sm shrink-0 select-none">
                            {index + 1}
                        </div>

                        <div className="flex-1 bg-slate-100 flex items-center justify-between px-3">
                            <button
                                onClick={() => onToggleFlag(question._id)}
                                className={`flex items-center gap-1.5 text-[13px] shrink-0 select-none transition-all
                                    ${isFlagged
                                        ? "font-semibold text-[#1e3a5f] underline underline-offset-2 hover:font-medium hover:no-underline"
                                        : "font-medium text-slate-700 hover:font-semibold hover:text-[#1e3a5f] hover:underline hover:underline-offset-2"
                                    }
                                `}
                            >
                                <svg width="15" height="16" viewBox="0 0 15 16" fill="none" xmlns="http://www.w3.org/2000/svg">
                                    <path
                                        d="M2.5 2A1.5 1.5 0 014 0.5h7A1.5 1.5 0 0112.5 2v13l-5-3-5 3V2z"
                                        stroke={isFlagged ? "#1e3a5f" : "currentColor"}
                                        strokeWidth="1.4"
                                        fill={isFlagged ? "#1e3a5f" : "none"}
                                    />
                                </svg>
                                <span>Mark for Review</span>
                            </button>

                            <button
                                onClick={() => setShowElimination(prev => !prev)}
                                title={showElimination ? "Tắt Process of Elimination" : "Bật Process of Elimination"}
                                className={`
                                    relative shrink-0 w-[26px] h-[26px] flex items-center justify-center rounded-sm border font-bold transition-colors select-none
                                    ${showElimination
                                        ? "bg-[#2B579A] border-[#2B579A] text-white"
                                        : "bg-white border-slate-300 text-slate-700"
                                    }
                                    hover:!bg-slate-200 hover:!text-slate-800 hover:!border-slate-400
                                `}
                            >
                                <span className="tracking-[-0.08em] text-[10px] relative z-10">ABC</span>
                                <svg
                                    className="absolute inset-0 w-full h-full pointer-events-none z-20"
                                    viewBox="0 0 26 26"
                                    fill="none"
                                    xmlns="http://www.w3.org/2000/svg"
                                >
                                    <line x1="5" y1="21" x2="21" y2="5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
                                </svg>
                            </button>
                        </div>
                    </div>
                    {/* ── ĐƯỜNG KẺ NGANG ĐỨT NÉT ── */}
                    <div 
                        className="w-full h-[2px] mt-[2px]" 
                        style={{ backgroundImage: 'repeating-linear-gradient(to right, #2d3642 0, #1c2128 19px, transparent 19px, transparent 20px)' }}
                    ></div>
                </div>
                    <div className="px-6 pt-3 pb-3 text-[15px] text-slate-900 leading-relaxed">
                        <Latex>{question.questionText}</Latex>
                    </div>
                    
                {/* KIỂM TRA LOẠI CÂU HỎI */}
                <div className="px-6 pb-8 flex-1">
                    {question.questionType === "spr" ? (
                        <div className="mt-4">
                            <label className="block text-sm font-semibold text-slate-700 mb-3">
                                Student-Produced Response (Điền đáp án)
                            </label>
                            <input
                                type="text"
                                value={userAnswer || ""}
                                onChange={(e) => onAnswerSelect(question._id, e.target.value)}
                                placeholder="Nhập câu trả lời của bạn (VD: 1/3, 0.5, ...)"
                                className="w-full max-w-sm px-4 py-2.5 border border-slate-400 rounded focus:border-[#1e3a5f] focus:ring-2 focus:ring-blue-100 outline-none text-[15px] text-slate-800 transition-all"
                            />
                            <p className="text-sm text-slate-500 mt-2">
                                Bạn có thể nhập phân số, số thập phân hoặc số nguyên.
                            </p>
                        </div>
                    ) : (
                        <div className="space-y-3 mt-3">
                            {question.choices?.map((choice: string, i: number) => {
                                const isSelected = userAnswer === choice;
                                const isCrossed = crossedOut.includes(choice);
                                const label = optionLabels[i] || "";

                                return (
                                    <div key={i} className="flex items-center gap-3">

                                        {/* ── KHUNG ĐÁP ÁN ── */}
                                        <div
                                            className={`
                                                relative flex-1 flex items-center gap-3 pl-4 pr-4 py-[10px] border rounded-xl transition-all
                                                ${isCrossed
                                                    ? "border-slate-200 bg-slate-50 cursor-default"
                                                    : isSelected
                                                        ? "border-[#3056D3] border-[2px] bg-white cursor-pointer"
                                                        : "border-slate-400 bg-white hover:border-slate-600 cursor-pointer"
                                                }
                                            `}
                                            onClick={() => !isCrossed && onAnswerSelect(question._id, choice)}
                                        >
                                            {isCrossed && (
                                                <div className="absolute top-1/2 left-4 right-4 h-[1.5px] bg-slate-500 pointer-events-none z-10" />
                                            )}

                                            <div className={`
                                                shrink-0 w-[26px] h-[26px] rounded-full border flex items-center justify-center text-[13px] font-semibold select-none transition-all
                                                ${isCrossed
                                                    ? "border-slate-300 text-slate-400 bg-white"
                                                    : isSelected
                                                        ? "border-[#2B579A] bg-[#2B579A] text-white"
                                                        : "border-slate-500 text-slate-700 bg-white"
                                                }
                                            `}>
                                                {label}
                                            </div>

                                            <span className={`text-[15px] leading-snug select-none ${
                                                isCrossed ? "text-slate-400" : "text-slate-900"
                                            }`}>
                                                <Latex>{choice || ""}</Latex>
                                            </span>
                                        </div>

                                        {/* ── NÚT LOẠI TRỪ ── */}
                                        {showElimination && (
                                            <button
                                                onClick={(e) => toggleCrossOut(e, choice)}
                                                title={isCrossed ? `Hoàn tác loại trừ đáp án ${label}` : `Loại trừ đáp án ${label}`}
                                                className="shrink-0 transition-all flex items-center justify-center w-[30px]"
                                            >
                                                {isCrossed ? (
                                                    <span className="text-[13px] font-semibold text-slate-600 underline hover:no-underline whitespace-nowrap">
                                                        Undo
                                                    </span>
                                                ) : (
                                                    <EliminationCircle label={label} />
                                                )}
                                            </button>
                                        )}
                                    </div>
                                );
                            })}
                        </div>
                    )}
                </div>
            </div>
        </div>
    );
}

// ── ELIMINATION CIRCLE ──
function EliminationCircle({ label }: { label: string }) {
    return (
        <div className="relative w-[16px] h-[16px] flex items-center justify-center rounded-full border border-slate-500 text-slate-600 hover:border-slate-800 hover:text-slate-800 transition-colors">
            <span className="font-medium text-[10px] select-none leading-none mt-[1px]">{label}</span>
            <div className="absolute top-1/2 left-0 w-full h-[1px] bg-current -translate-y-1/2"></div>
        </div>
    );
}