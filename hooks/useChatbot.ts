// hooks/useChatbot.ts
"use client";

import { useState, useEffect } from "react";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";

// Khuôn cho 1 tin nhắn: nó là 1 bong bóng chat thôi chứ k phải toàn bộ lịch sử tin nhắn
export interface Message {      
    role: "user" | "model";         // Tin nhắn phải có role là tin nhắn từ user hay từ AI 
    parts: { text: string }[];      // 1 bong bóng chat thôi nhưng vẫn dùng array để linh hoạt: Trường hợp bth gửi 1 text thì y hệt như string
                                    // nhưng lỡ gửi 2 text hoặc 1 text 1 image (url ở dạng string) thì cần tách ra để xử lý => Use array
                                    /* ví dụ:
                                    parts: [
                                    { text: "Đây là câu hỏi của tôi:" },
                                    { text: "Biến trong lập trình là gì?" }
                                    ]
                                    */ 
}

export function useChatbot(questionId: string) {
    const [messages, setMessages] = useState<Message[]>([]);                   // Lưu danh sách messages toàn bộ tin nhắn theo khuôn của message
    const [isLoading, setIsLoading] = useState(false);                         // trạng thái để bật/tắt load
    const [isFetchingHistory, setIsFetchingHistory] = useState(true);          // Biến nhớ xem có đang tải lịch sử chat cũ k

    // Lấy lịch sử chat của 1 câu hỏi cụ thể theo questionId
    useEffect(() => {
        const fetchHistory = async () => {
            try {
                const res = await api.get(API_PATHS.getChatByQuestionId(questionId));    // truyền lệnh GET về BE để lấy lịch sử rồi gán vào res
                if (res.status === 200) {       // Lấy thành công thì lấy data ra ( data là lịch sử chat )
                    const data = res.data;
                    if (data.messages && data.messages.length > 0) {       // Check có lấy về tin nhắn nào k và số tnh phải >= 1
                        setMessages(data.messages);                        // Có tin nhắn thì cập nhật data tin nhắn này vào bộ nhớ để hiển thị
                    }
                }
            } catch (error) {
                console.error("Failed to load chat history:", error);
            } finally {
                setIsFetchingHistory(false);            // Kết thúc việc lấy dữ liệu lịch sử chat
            }
        };

        fetchHistory();    // Gọi hàm để thực thi việc lấy dữ liệu
    }, [questionId]);    // Khi chuyển từ câu này sang câu khác => questionId thay đổi => Tự động  lấy lịch sử chat của câu đó

    const sendMessage = async (userMsg: string) => {
        const newMessage: Message = { role: "user", parts: [{ text: userMsg }] }; // Đóng gói tin nhắn theo khung parts ở trên: Tnh từ user và bao gồm nội dung tnh đc gửi đi
        setMessages((prev) => [...prev, newMessage]);  // Chèn ngay tin nhắn vừa submit lên màn hình => Cảm giác mượt, nhanh kể cả khi chưa gửi
        setIsLoading(true);    // Đang gửi => Bật trạng thái load
 
        try {
            const res = await api.post(API_PATHS.CHAT, { questionId, message: userMsg });   // Gửi yêu cầu POST lên AI, chỉ cần questionId vì BE sẽ vào DB lấy nội dung câu  
            /**
             * khi dùng api, res sẽ chứa nhiều data thừa 
             * {
                    status: 200,             // Giấy biên nhận: Mã 200 nghĩa là giao dịch mạng thành công tốt đẹp.
                    statusText: "OK",        // Chữ đi kèm mã trạng thái.
                    headers: { ... },        // Tem mác bưu điện: Chứa thông tin về loại dữ liệu, thời gian gửi...
                    config: { ... },         // Thông tin về chuyến xe lúc bạn gửi đi (gửi đến địa chỉ nào, mang theo cái gì).
                    
                    // ĐÂY LÀ PHẦN QUAN TRỌNG NHẤT
                    data: {                  // Lõi thùng hàng: Chứa thứ mà lập trình viên máy chủ (Backend) cố tình nhét vào cho bạn.
                        response: "Đây là câu trả lời của AI nè bạn!" 
               }
}
             */

            const data = res.data;

            if (data.messages) {                      // Nếu res trả lại toàn bộ lịch sử chat -> Màn hình có thể sai nhưng data máy chủ gửi lên always đúng
                setMessages(data.messages);           // Xóa hết lịch sử chat cũ để hiện lại lên  màn hình
            } else if (data.response) {     // Nếu máy chủ chỉ trả về câu trả lời của AI
                setMessages((prev) => [...prev, { role: "model", parts: [{ text: data.response }] }]);  // Lưu cái cũ, thêm cái mới + gán role là của model vào nháp (React k cho update trực tiếp mà phải update vào bản nháp)
            } else if (data.error) {
                throw new Error(data.error);
            }
        } catch (error) {
            console.error("Failed to send message:", error);
            setMessages((prev) => [
                ...prev,
                { role: "model", parts: [{ text: "Sorry, I ran into an error processing your request. Please try again." }] }
            ]);
        } finally {
            setIsLoading(false);     // Send xong, tắt loading
        }
    };

    return {
        messages,
        isLoading,
        isFetchingHistory,
        sendMessage
    };
}