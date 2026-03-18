// Hàm này trực tiếp thực hiện kết nối DB và lấy lịch sử chat từ DB + gửi tin nhắn cho AI

import dbConnect from "@/lib/mongodb";   
import Chat from "@/lib/models/Chat"; 
import Question from "@/lib/models/Question";                 // Lấy các model để sai chúng đi tìm hoặc lưu dữ liệu
import { GoogleGenerativeAI } from "@google/generative-ai";   //  Công cụ AI chính thức của GG

const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY || "");  // Kích hoạt AI = cách truyền API key vào công cụ, k lấy đc API thì truyền vào string rỗng tránh sập

export const chatService = {   // Đóng gói các hàm liên quan tới tính năng AI => Các file UI khi user ấn gửi chỉ cần gọi vd: chatService.processMessage(...)
    async getChatHistory(userId: string, questionId: string) {   // Lấy lịch sử chat
        await dbConnect();                                       // Cần kết nối DB để lấy data
        const chat = await Chat.findOne({ userId, questionId });  // Tìm trong DB xem có khung chat nào của User này hỏi về câu này rồi k
        return chat ? chat.messages : [];   // Có tồn tại rồi thì trả về array messages chứa danh sách tnh, chưa thì trả về array rỗng
    },

    async processMessage(userId: string, questionId: string, message: string) {  // Xử lý khi gửi tin nhắn, cần biết ai gửi, câu nào và nội dung
        if (!process.env.GEMINI_API_KEY) {                         // K có api thì k gửi đc => Quăng ra lỗi ngay lập tức
            throw new Error("Gemini API key not configured");
        }    

        await dbConnect();

        let chat = await Chat.findOne({ userId, questionId });  // Tìm khung chat cũ
        const question = await Question.findById(questionId);   // Lấy tất cả thông tin về câu hỏi hiện tại (nội dung, đáp án đúng  )

        if (!chat) {                  // K tồn tại chat => Đây là đoạn chat cho 1 câu mới hoàn toàn
            chat = new Chat({         // Tạo 1 khung chat mới và truyền vào id user và id question và để mảng tin nhắn trống
                userId,
                questionId,
                messages: []
            });
        }


        // Khi nhận chat.messages từ DB về sẽ chứa rất nhiều hàm và nội dung thừa
        // AI Gemini khắt khe chỉ được có role và parts ở dạng text
        const history = chat.messages.map(m => ({    // Loop lặp qua từng tin nhắn
            role: m.role,                                 // Giữ lại role
            parts: m.parts.map(p => ({ text: p.text })),  // Loop qua từng text trong array parts, vứt bở _id và chỉ giữ text
        }));
        /** Dữ liệu của chat.messages sẽ thừa như dưới
         * {
            "_id": "65f1a...", 
            "role": "user",
            "parts": [{ "_id": "65f1b...", "text": "Xin chào" }],
            "timestamp": "2024-03-17T02:00:00.000Z"
            }
         */ 
         const optionsText = question?.choices ? JSON.stringify(question.choices, null, 2) : "Unknown";



        // Fix: Prompt mới chỉ bao gồm nội dung câu hỏi, chưa bao gồm các đáp án 
        const model = genAI.getGenerativeModel({        // Khai báo model và promt sẽ dùng: Flash và promt bao gồm nội dung câu + đáp án đúng
            model: "gemini-2.5-flash",
            systemInstruction: `You are an expert, encouraging SAT tutor. 
            The student is reviewing a practice question they took.
            The question they are reviewing is: "${question?.questionText || 'Unknown'}".
            The answer options are: ${optionsText}.
            The correct answer is: "${question?.correctAnswer || 'Unknown'}".
            Their goal is to understand why they got it wrong or learn the underlying concepts.
            Answer their questions pedagogically—guide them to the answer rather than just giving it away.
            ALWAYS proactively recommend specific Khan Academy topics or search terms they should look up on Khan Academy to master the concept being tested. Format the Khan Academy recommendations clearly in bullet points.`
        });

        const chatSession = model.startChat({   // Mở 1 Cuộc trò chuyện mới với AI và ném history bao gồm role và parts đã lấy ở trên để nhớ context
            history: history,
        });

        const result = await chatSession.sendMessage(message);   // Gửi tin nhắn của user (message) cho AI
        const aiResponse = result.response.text();    // Lấy câu trả lời, chỉ nhận đúng phần text 

        chat.messages.push({      // Push thêm câu hỏi của user vào array messages
            role: "user",
            parts: [{ text: message }],
            timestamp: new Date()
        });

        chat.messages.push({        // Push câu trả lời của AI vào array messages
            role: "model",
            parts: [{ text: aiResponse }],
            timestamp: new Date()
        });

        await chat.save();        // Lưu vào DB (mật thời gian => await)

        return {                        // ở trên mới là lưu vào DB, ở đây mới trả về câu trả lời của AI và toàn bộ danh sách tin nhắn để hiện lên UI
            response: aiResponse,
            messages: chat.messages
        };
    }
};
