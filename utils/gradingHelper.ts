// utils/gradingHelper.ts

// THÊM MỚI: HÀM KIỂM TRA ĐÁP ÁN ĐÚNG CHO CẢ TRẮC NGHIỆM VÀ TỰ LUẬN
// Hàm này nhận vào object câu hỏi (q) và đáp án người dùng chọn (userAns), trả về true/false
export const checkIsCorrect = (q: any, userAns: string) => {
    if (!userAns || userAns === "Omitted") return false;
    
    if (q.questionType === "spr") {
        // Nếu là tự luận, duyệt qua mảng sprAnswers xem có đáp án nào khớp không
        // .trim() để bỏ khoảng trắng thừa 2 đầu, .toLowerCase() để không phân biệt hoa thường
        return q.sprAnswers?.some((ans: string) => 
            ans && ans.trim().toLowerCase() === userAns.trim().toLowerCase()
        );
    }
    // Nếu là trắc nghiệm thì so sánh thẳng như cũ
    return userAns === q.correctAnswer;
};