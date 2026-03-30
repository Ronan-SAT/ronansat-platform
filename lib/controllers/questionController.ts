    // Tiếp nhận yêu cầu từ API rồi giao cho service xử lý
    // Trả về danh sách câu hỏi cho everyone yêu cầu
    // Cho phép admin tạo thêm câu hỏi mới


    import { NextResponse } from "next/server";
    import { getServerSession } from "next-auth";
    import { authOptions } from "@/lib/authOptions";
    import { questionService } from "@/lib/services/questionService";  // Công nhân được Controller giao việc

    export const questionController = {
        async getQuestions(req: Request) {  
            try {
                const { searchParams } = new URL(req.url);       // Tương tự chatController, nó lấy testId=123 trong url
                const testId = searchParams.get("testId");       // testId = 123 lấy từ searchParams

                const questions = await questionService.getQuestions(testId);   // Gọi service lấy mảng câu hỏi và gán vào questions
                return NextResponse.json({ questions });
            } catch (error: any) {
                return NextResponse.json({ error: error.message }, { status: 500 });
            }
        },

        async createQuestion(req: Request) {
            try {
                const session = await getServerSession(authOptions);           // lấy session đăng nhập
                if (!session || session.user.role !== "admin") {               // Nếu chưa đăng nhập hoặc role k phải admin => Error
                    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
                }

                const body = await req.json();    // Dịch nội dung câu hỏi admin gửi lên thành JSON

                try {
                    const newQuestion = await questionService.createQuestion(body);            // Gửi nội dung câu dạng JSON đi
                    return NextResponse.json({ question: newQuestion }, { status: 201 });
                } catch (error: any) {
                    if (error.name === "ZodError") {                                           // Zod là thư hiện rà soát lỗi chính tả gắt gao, nếu thiếu thông tin required thì báo lỗi
                        return NextResponse.json({ error: error.errors }, { status: 400 });
                    }
                    if (error.message === "Test not found") {                 // Không tìm thấy bài thi cần bổ sung câu hỏi
                        return NextResponse.json({ error: "Test not found" }, { status: 404 });
                    }
                    throw error;
                }
            } catch (error: any) {
                console.error("POST /api/questions error:", error);   
                return NextResponse.json({ error: error.message || "Failed to create question" }, { status: 500 });
            }
        }
    };
