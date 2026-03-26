// hooks/useTestEngine.ts
"use client";

import { useState, useEffect } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
// Import 2 công cụ vừa tách ra
import { checkIsCorrect } from "@/utils/gradingHelper";
import { useTimer } from "./useTimer";

// Đưa cấu hình testStages ra ngoài hàm để tránh bị tạo lại nhiều lần (Chuẩn production tối ưu bộ nhớ)
export const testStages = [
    { section: "Reading and Writing", module: 1, duration: 32 * 60 }, // 32 phút
    { section: "Reading and Writing", module: 2, duration: 32 * 60 },
    { section: "Math", module: 1, duration: 35 * 60 },   // 35 phút
    { section: "Math", module: 2, duration: 35 * 60 },
];

export function useTestEngine(testId: string) {
    const router = useRouter();

    const searchParams = useSearchParams();
    const mode = searchParams.get("mode") || "full"; 
    const targetSection = searchParams.get("section"); // vd: "Math"
    const targetModule = searchParams.get("module") ? parseInt(searchParams.get("module") as string) : null; // vd: 2

    const [testStats, setTestStats] = useState<any>(null);     // lưu thống kê kết quả của bài thi
    const [questions, setQuestions] = useState<any[]>([]);     // danh sách chứa các câu hỏi 
    const [loading, setLoading] = useState(true);              

    const [currentIndex, setCurrentIndex] = useState(0);                   // Lưu số index của câu hỏi hiện tại 0 1 2 3
    const [answers, setAnswers] = useState<Record<string, string>>({});    // biến nhớ lưu theo từng cặp, gồm mã câu hỏi và đáp án mà user chọn 
    const [flagged, setFlagged] = useState<Record<string, boolean>>({});   // lưu mã câu hỏi và bool xem user có flag câu đó hay không

    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);     // biến nhớ cho nút bật/tắt desmos

    const [modules, setModules] = useState<any[]>([]);       // Biến mới: Chứa 4 khúc của bài test
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0); // Biến mới: Nhớ xem đang ở khúc nào (0, 1, 2, 3)

    const [currentStageIndex, setCurrentStageIndex] = useState(() => {
        // Nếu là Sectional, quét mảng testStages tìm đúng index khớp với URL
        if (mode === "sectional" && targetSection && targetModule) {
            const index = testStages.findIndex(s => s.section === targetSection && s.module === targetModule);
            return index !== -1 ? index : 0;
        }
        return 0; // Nếu là full test thì mặc định bắt đầu từ đầu
    });
   
    const currentStage = testStages[currentStageIndex];
    const currentModuleQuestions = questions.filter(
        (q) => q.section === currentStage.section && q.module === currentStage.module
    );

    // GỌI HOOK TIMER (Đã tách riêng)
    // Truyền thời gian khởi tạo, trạng thái loading, và hàm nộp bài khi hết giờ
    const { timeRemaining, setTimeRemaining, isTimerHidden, setIsTimerHidden } = useTimer(
        0, // Sẽ được set chính xác khi gọi API xong
        loading,
        () => handleSubmit() // Gọi hàm submit khi hết giờ
    );

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await api.get(API_PATHS.getQuestionsByTestId(testId));     // gửi yêu cầu GET các câu hỏi của testId đó
                const data = res.data;    // Lấy data từ kết quả

                setQuestions(data.questions || []);    // Lưu danh sách questions vừa lấy được vào biến nhớ để hiện lên màn hình, k lấy dược thì trả về mảng rỗng tránh lỗi
                // FIX: Thay vì mặc định 60 phút, lấy duration của chặng đầu tiên
                setTimeRemaining(testStages[currentStageIndex].duration);        

                sessionStorage.setItem('testName', 'Practice Test');    // sessionStorage lưu vào bộ nhớ của phiên đăng nhập đó, thông tin đc lưu bị vứt ngay khi tắt tab trên trình duyệt
                                      // testName là tên nhãn, nội dung là 'Practice Test'  -> Lưu để sau này, khi đến trang  review kết quả chỉ cần mở tìm nhãn testName là có ngay, k cần gọi máy chủ hỏi lại tên
                                      // Lưu thông tin đã có ở bước này để bước sau dùng luôn, k phải gọi lại DB mất tgian
            } catch (err) {
                console.error(err);
            } finally {
                setLoading(false);     // Lấy question xong thì tắt loading
            }
        };
        fetchQuestions();   // gọi hàm 
    }, [testId]);                 // Khi testId thay đổi => cần lấy danh sách câu hỏi của 1 test mới 

    // dưới là 5 thao tác user có thể làm khi làm bài thi

    const handleAnswerSelect = (questionId: string, choice: string) => {    // ghi nhận đáp án được chọn
        setAnswers({ ...answers, [questionId]: choice });     // React bắt lưu vào bản nháp ... 
                               // Lưu mã số câu và lựa chọn của user, chọn lại thì ghi đè vào lựa chọn trước
    };

    const toggleFlag = (questionId: string) => {
        setFlagged({ ...flagged, [questionId]: !flagged[questionId] });
                                  // Tương tự trên, lưu câu nào bật flag  -> !flagged để cắm cờ ra/vào mỗi khi ấn 
    };

    const handleNext = () => {          // Khi ấn Next sang câu tiếp theo
        // FIX: Check theo độ dài của module hiện tại thay vì toàn bộ đề thi
        if (currentIndex < currentModuleQuestions.length - 1) setCurrentIndex(currentIndex + 1);   // chuyển index sang câu tiếp theo = cách +1 vào index hiện tại
    };

    const handlePrev = () => {
        if (currentIndex > 0) setCurrentIndex(currentIndex - 1); 
        // Miễn là k phải câu đầu tiên, -1 index để sang câu trước
    };

    const handleJump = (index: number) => {
        setCurrentIndex(index);
        // Nhảy tới 1 câu bất kỳ k cần kiểm tra đầu or cuối
    };

   //Gói các câu trả lời -> Đối chiếu với đáp án đúng để tính điểm -> Nhân 1600 để ra số điểm -> Gửi kết quả cho BE -> Điều hướng tới trang xem kết quả
  
   // THAY THẾ TOÀN BỘ HÀM handleSubmit HIỆN TẠI BẰNG ĐOẠN NÀY:
    const handleSubmit = async () => {
        // 1. NẾU LÀ FULL TEST VÀ CHƯA TỚI CHẶNG CUỐI -> BƯỚC SANG MODULE TIẾP THEO
        if (mode === "full" && currentStageIndex < 3) {
            const nextStageIndex = currentStageIndex + 1;
            setCurrentStageIndex(nextStageIndex);
            setCurrentIndex(0); 
            setTimeRemaining(testStages[nextStageIndex].duration); 
            return; 
        }

        // 2. NẾU LÀ SECTIONAL HOẶC ĐÃ ĐẾN CUỐI FULL TEST -> CHẤM ĐIỂM VÀ NỘP BÀI
        try {
          // Chỉ lấy câu hỏi của Module hiện tại nếu đang thi Sectional, ngược lại lấy toàn bộ
            const questionsToGrade = mode === "sectional" ? currentModuleQuestions : questions;

            const formattedAnswers = questionsToGrade.map(q => {
                const userAns = answers[q._id] || "Omitted";
                return {
                    questionId: q._id,
                    userAnswer: userAns,
                    isCorrect: checkIsCorrect(q, userAns) // SỬ DỤNG HÀM KIỂM TRA MỚI Ở ĐÂY (gọi từ file gradingHelper.ts)
                };
            });

            if (mode === "sectional") {
                // TÍNH ĐIỂM DẠNG SECTIONAL: Đếm số câu đúng
                let correctCount = 0;
                currentModuleQuestions.forEach(q => {
                    const userAns = answers[q._id] || "";
                    if (checkIsCorrect(q, userAns)) correctCount++; // SỬ DỤNG HÀM KIỂM TRA MỚI Ở ĐÂY
                });

                // Gửi API với các trường dữ liệu tương thích với Schema mới
                const res = await api.post(API_PATHS.RESULTS, {
                    testId,
                    isSectional: true,                       // Cờ báo hiệu đây là bài làm từng phần
                    sectionalSubject: currentStage.section,  // "Reading and Writing" hoặc "Math"
                    sectionalModule: currentStage.module,    // 1 hoặc 2
                    answers: formattedAnswers,
                    totalScore: correctCount,                // Mượn tạm trường totalScore để lưu số câu đúng
                    readingScore: 0,                         // Điền 0 để máy chủ không báo lỗi "thiếu điểm"
                    mathScore: 0                             // Điền 0 để máy chủ không báo lỗi "thiếu điểm"
                });

                if (res.status === 200 || res.status === 201) {
                    router.push(`/review?testId=${testId}&mode=sectional`);
                }
            } else {
                // TÍNH ĐIỂM DẠNG FULL TEST BÌNH THƯỜNG
                let earnedReadingPoints = 0;
                let earnedMathPoints = 0;

                questions.forEach(q => {
                    const userAns = answers[q._id] || "";
                    if (checkIsCorrect(q, userAns)) { // SỬ DỤNG HÀM KIỂM TRA MỚI Ở ĐÂY
                        const points = q.points || 0; 
                        if (q.section === "Reading and Writing") {
                            earnedReadingPoints += points;
                        } else if (q.section === "Math") {
                            earnedMathPoints += points;
                        }
                    }
                });

                const readingScore = Math.min(200 + earnedReadingPoints, 800);
                const mathScore = Math.min(200 + earnedMathPoints, 800);
                const totalScore = readingScore + mathScore;

                const res = await api.post(API_PATHS.RESULTS, {
                    testId,
                    isSectional: false,
                    answers: formattedAnswers,
                    score: totalScore,
                    sectionBreakdown: { readingAndWriting: readingScore, math: mathScore }
                });

                if (res.status === 200 || res.status === 201) {
                     router.push(`/review?testId=${testId}&mode=full`);                
                }
            }
        } catch (err) {
            console.error(err);
            alert("Failed to submit test");
        }
    };

    // Lấy câu hỏi hiện tại từ module hiện tại chứ không lấy từ toàn bộ mảng gốc
    const currentQuestion = currentModuleQuestions[currentIndex] || questions[0];

    return {
        mode,
        loading,
        questions,
        currentQuestion,
        currentModuleQuestions,
        currentIndex,
        answers,
        flagged,
        timeRemaining,
        isTimerHidden,
        setIsTimerHidden,
        isCalculatorOpen,
        setIsCalculatorOpen,
        currentStage,
        currentStageIndex,
        handleAnswerSelect,
        toggleFlag,
        handleNext,
        handlePrev,
        handleJump,
        handleSubmit,
        router
    };
}