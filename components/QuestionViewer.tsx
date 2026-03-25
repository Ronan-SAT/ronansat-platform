"use client";

import { useState } from "react";
import { Flag, X } from "lucide-react";
import { CldImage } from 'next-cloudinary'; // Sử dụng thư viện đã có sẵn thay vì @cloudinary/react

interface QuestionViewerProps {    // Khung câu hỏi, khung này k được tự lưu kết quả bài thi => Phải dùng 2 hàm onAnswerSelect và onToggleFlag để báo lên hệ thống 
    question: any;            // nội dung câu hỏi
    userAnswer: string;       // đáp án user đang chọn (nếu có)
    onAnswerSelect: (questionId: string, choice: string) => void;    // Hàm xử lý việc chọn đáp án, cần lưu câu nào và chọn choice gì
                                                                     // => void để báo hệ thống là hàm này chỉ có nhiệm vụ gửi các thông tin này, k trả lại gì cả
    isFlagged: boolean;      // cho biết câu này có bị flag k
    onToggleFlag: (questionId: string) => void;                       // Hàm xử lý bật flag cho câu nào, chỉ cần lưu id câu hỏi
    index: number;           // số thứ tự của câu hỏi
}

export default function QuestionViewer({
    question,
    userAnswer,
    onAnswerSelect,                                              
    isFlagged,
    onToggleFlag,
    index
}: QuestionViewerProps) {
    // Danh sách 4 câu hỏi
    const optionLabels = ["A", "B", "C", "D"];

    // danh sách ghi nhớ các đáp án đã bị loại trừ
    const [crossedOut, setCrossedOut] = useState<string[]>([]);

    // Hàm chạy khi ấn vào dấu X cạnh đáp án 
    const toggleCrossOut = (e: React.MouseEvent, choice: string) => {  
        e.stopPropagation();  // Chặn hiệu ứng xuyên thấu khi bấm dấu X
        if (crossedOut.includes(choice)) {        
            setCrossedOut(crossedOut.filter(c => c !== choice));     
        } else {
            setCrossedOut([...crossedOut, choice]);   
        }
    };

    return (   // Chia màn hình làm 2 nửa
        <div className="flex-1 flex bg-[#f7f8f9] h-[calc(100vh-8rem)] mt-16 mb-16 overflow-hidden">

            {/* Left Panel: Passage Text & Image */}
            <div className={`
            ${question.passage || question.imageUrl ? "w-1/2 border-r border-slate-300" : "hidden"} 
            h-full overflow-y-auto p-8 lg:p-12
        `}>

                {/* KHUNG LOAD ẢNH ĐƯỢC TỐI ƯU BỞI CLDIMAGE */}
                {question.imageUrl && (
                    <div className="flex justify-center w-full bg-slate-50 p-4 rounded-xl border border-slate-200 mb-6">
                        <CldImage 
                            src={question.imageUrl} // CldImage tự động xử lý và nén link URL gốc, không cần bóc tách Public ID
                            width={350}             // Resize chiều ngang
                            height={350}            // Tự động giữ tỷ lệ nếu thêm class h-auto
                            alt="Question Reference" 
                            className="max-w-full h-auto object-contain rounded shadow-sm"
                        />
                    </div>
                )}

                {question.passage && (
                    <div className="bg-white p-8 border border-slate-200 text-lg leading-relaxed font-serif text-slate-800 rounded-lg selection:bg-yellow-200 selection:text-black">
                        {/* trong văn bản thường dùng Enter để xuống dòng, trình duyệt k hiểu => Thay đó là <br /> */}
                        <div dangerouslySetInnerHTML={{ __html: question.passage.replace(/\n/g, '<br/>') }} />
                    </div>
                )}
            </div>

            {/* Right Panel: Question & Answers */}
            <div className={`
            ${question.passage || question.imageUrl ? "w-1/2" : "w-full max-w-4xl mx-auto"} 
            h-full overflow-y-auto p-8 lg:p-12 bg-white
        `}>
                <div className="flex justify-between items-start mb-6 border-b border-slate-100 pb-4">
                    <div className="flex items-center gap-3">
                        <div className="bg-slate-900 text-white w-8 h-8 flex items-center justify-center font-bold text-lg rounded-sm">
                            {index + 1}
                        </div>
                        {isFlagged && <div className="text-sm font-semibold text-amber-600 flex items-center gap-1"><Flag className="w-4 h-4 fill-amber-500" /> Marked for Review</div>}
                    </div>

                    <button
                        onClick={() => onToggleFlag(question._id)}    
                        className={`flex items-center gap-2 px-3 py-1.5 rounded-md font-semibold text-sm border ${isFlagged
                            ? "bg-amber-50 border-amber-200 text-amber-700"
                            : "bg-white border-slate-300 text-slate-600 hover:bg-slate-50"
                            }`}
                    >
                        <Flag className={`w-4 h-4 ${isFlagged ? "fill-amber-500" : ""}`} />
                        Mark for Review
                    </button>
                </div>

                <div className="prose max-w-none text-xl text-slate-900 mb-8 font-medium leading-relaxed">
                    {question.questionText}
                </div>

                {/* KIỂM TRA LOẠI CÂU HỎI: TỰ LUẬN HOẶC TRẮC NGHIỆM */}
                {question.questionType === "spr" ? (
                    // GIAO DIỆN TỰ LUẬN (SPR)
                    <div className="mt-8 border-t border-slate-200 pt-6">
                        <label className="block text-sm font-bold text-slate-700 mb-3">
                            Student-Produced Response (Điền đáp án)
                        </label>
                        <input
                            type="text"
                            value={userAnswer || ""} 
                            onChange={(e) => onAnswerSelect(question._id, e.target.value)} 
                            placeholder="Nhập câu trả lời của bạn (VD: 1/3, 0.5, ...)"
                            className="w-full max-w-md px-4 py-3 border-2 border-slate-300 rounded-lg focus:border-blue-600 focus:ring-2 focus:ring-blue-100 outline-none text-lg font-medium text-slate-800 transition-all"
                        />
                        <p className="text-sm text-slate-500 mt-2">
                            Bạn có thể nhập phân số, số thập phân hoặc số nguyên.
                        </p>
                    </div>
                ) : (
                    // GIAO DIỆN TRẮC NGHIỆM
                    <div className="space-y-4">              
                        {question.choices?.map((choice: string, i: number) => {    
                            const isSelected = userAnswer === choice;             
                            const isCrossed = crossedOut.includes(choice);        
                            const label = optionLabels[i] || "";                  

                            return (
                                <div
                                    key={i}
                                    className={`relative flex items-center group cursor-pointer`}        
                                    onClick={() => !isCrossed && onAnswerSelect(question._id, choice)}   
                                >
                                    <button
                                        onClick={(e) => toggleCrossOut(e, choice)}       
                                        className="absolute -left-12 p-1.5 text-slate-300 hover:text-red-500 opacity-0 group-hover:opacity-100 transition-opacity rounded"
                                        title="Cross out choice"
                                    >
                                        <X className="w-5 h-5" />
                                    </button>

                                    <div className={`
                    flex-1 flex items-start gap-4 p-4 border-2 rounded-lg transition-all
                    ${isSelected ? "border-blue-600 bg-blue-50" : "border-slate-300 bg-white hover:border-slate-500"}
                    ${isCrossed ? "opacity-40 grayscale pointer-events-none" : ""}
                    `}>
                                        {/* Radio Button simulating Bluebook bubble */}
                                        <div className="pt-1">
                                            <div className={`
                            w-8 h-8 rounded-full border-2 flex items-center justify-center font-bold
                            ${isSelected ? "border-blue-600 font-bold" : "border-slate-400 text-slate-500"}
                        `}>
                                                {isSelected ? (
                                                    <div className="w-full h-full bg-blue-600 text-white flex items-center justify-center rounded-full">
                                                        {label}
                                                    </div>
                                                ) : (
                                                    label
                                                )}
                                            </div>
                                        </div>

                                        <div className="flex-1 pt-1.5 text-lg text-slate-800 font-medium">
                                            <span className={isCrossed ? "line-through text-slate-400" : ""}>
                                                {choice}
                                            </span>
                                        </div>
                                    </div>
                                </div>
                            );
                        })}
                    </div>
                )}
            </div>
        </div>
    );
}