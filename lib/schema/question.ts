// schema trong models/Questions.ts là bảo vệ ở sâu trong DB
// schema ở file này kiểm tra ngay trong API


import { z } from "zod";  // Thư viện kiểm tra format rất kỹ càng


export const QuestionValidationSchema = z.object({            // Tạo bộ luật kiểm tra 1 object
    testId: z.string().min(1, "Test ID is required"),                            // Yêu cầu phải có id dạng string, min 1 ký tự, không có thì báo lỗi trong ""
    section: z.string().min(1, "Section is required"),
    module: z.number().min(1).default(1),              // module 1 2
    questionText: z.string().min(1, "Question text is required"),
    passage: z.string().optional(),
    choices: z.array(z.string()).min(2, "At least two choices are required"),    // data phải là 1 array, từng phần tử của array phải  là string, array đó phải chứa ít nhất 2 phần tử là 2 đáp án
    correctAnswer: z.string().min(1, "Correct answer is required"),
    explanation: z.string().min(1, "Explanation is required"),
    difficulty: z.enum(["easy", "medium", "hard"]).default("medium"),   // Ép phải là 1 trong 3 chữ này, enum là liệt kê, mặc định là medium
    points: z.number().min(0).default(10),     // Trọng số của câu thấp nhất là 0 và mặc định là 10
});


// Bình thường cần viết interface rồi mới viết schema, Zod có công cụ z.infer suy luận từ schema QuestionValidationSchema và tự tạo ra interface tên là QuestionInput
// type hoạt động y hệt interface, interface cứng nhắc nên không thể gán 1 interface = cái gì được => k thể dùng z.infer
// type thì linh hoạt hơn, cả 2 đều là bản công thức giúp user tránh viết code sai
export type QuestionInput = z.infer<typeof QuestionValidationSchema>;
