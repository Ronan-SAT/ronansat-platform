// Khuôn cho 1 câu hỏi trong cơ sở dữ liệu

import mongoose, { Schema, Document, Model } from "mongoose";


/*
Interface là công thức của 1 loại data giúp dev truyền đúng loại thông tin khi làm code, giống bản công thức khi làm bánh, khi npm run dev thì interface biến mất
Schema là Bộ luật giúp cơ sở dữ liệu kiểm tra data có đúng định dạng khi lưu vào DB hay không, nó chỉ là bộ luật chứ ch thể kiểm tra
Model là Người thực hiện việc cầm bộ luật đi kiểm tra data
*/





export interface IQuestion extends Document {
    testId: mongoose.Types.ObjectId;    // Mã mà câu này thuộc về
    section: string;                    
    module: number;           // 1 2   - module 1 or 2
    questionText: string;               // Câu hỏi (Main purpose, ...)
    passage?: string;                   // Passage là đoạn văn rất dài trong Verbal, Math thì k cần cái này mà chỉ cần questionText thôi, ? là optional
    choices: string[];                  // choices là array, từng ô là 1 string
    correctAnswer: string;              
    explanation: string;
    difficulty: "easy" | "medium" | "hard";      // difficulty là 1 trong 3 string này
    points: number;                     // Trọng số
}

const QuestionSchema: Schema<IQuestion> = new Schema(
    {
        testId: { type: Schema.Types.ObjectId, ref: "Test", required: true },
        section: { type: String, required: true },
        module: { type: Number, required: true },
        questionText: { type: String, required: true },
        passage: { type: String, required: false },             // k required vì nó là optional
        choices: [{ type: String, required: true }],
        correctAnswer: { type: String, required: true },
        explanation: { type: String, required: true },
        difficulty: { type: String, enum: ["easy", "medium", "hard"], default: "medium" },
        points: { type: Number, default: 10 },
    },
    { timestamps: true }   // lấy hàm updated và created của MongoDB
);

// Kiểm tra xem đã có model nào tên là Question chưa, chưa mới tạo -> Tránh trùng lặp
const Question: Model<IQuestion> = mongoose.models.Question || mongoose.model<IQuestion>("Question", QuestionSchema);
export default Question;
