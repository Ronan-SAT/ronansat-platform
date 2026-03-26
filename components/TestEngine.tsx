"use client";    // Tương tác với user

import { useState, useEffect, useRef } from "react";
import { useRouter } from "next/navigation";     // Thi xong thì route sang trang xem điểm
import { Button, Popconfirm } from "antd";
import { TestHeader, TestFooter } from "@/components/TestLayout";    // Giao diên header và footer (phần trên và phần dưới trang)
import QuestionViewer from "@/components/QuestionViewer";            // Hiển thị câu hỏi
import Loading from "@/components/Loading";
import DesmosCalculator from "@/components/DesmosCalculator";        // Máy tính desmos
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";
import { useSearchParams } from "next/navigation";

export default function TestEngine({ testId }: { testId: string }) {    // Lấy id của bài test -> Dựa vào id này mới biết bài này thuộc Verbal hay Math
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

    // Timer State  
    const [timeRemaining, setTimeRemaining] = useState(0);        // Lưu số time còn lại
    const [isTimerHidden, setIsTimerHidden] = useState(false);    // biến nhớ cho nút bật/tắt timer

    const [isCalculatorOpen, setIsCalculatorOpen] = useState(false);     // biến nhớ cho nút bật/tắt desmos

    // ── THÊM MỚI: Resizable divider state ──────────────────────────────────
    const [leftWidth, setLeftWidth] = useState(50);          // % chiều rộng left panel, mặc định 50/50
    const isDragging = useRef(false);
    const containerRef = useRef<HTMLDivElement>(null);

    // Bắt đầu kéo thanh divider
    const handleDividerMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        isDragging.current = true;

        const onMouseMove = (e: MouseEvent) => {
            if (!isDragging.current || !containerRef.current) return;
            const rect = containerRef.current.getBoundingClientRect();
            const newLeftWidth = ((e.clientX - rect.left) / rect.width) * 100;
            // Giới hạn từ 20% đến 80% để 2 panel không bị thu quá nhỏ
            setLeftWidth(Math.min(60, Math.max(30, newLeftWidth)));
        };

        const onMouseUp = () => {
            isDragging.current = false;
            window.removeEventListener("mousemove", onMouseMove);
            window.removeEventListener("mouseup", onMouseUp);
        };

        window.addEventListener("mousemove", onMouseMove);
        window.addEventListener("mouseup", onMouseUp);
    };
    // ────────────────────────────────────────────────────────────────────────

    const [modules, setModules] = useState<any[]>([]);       // Biến mới: Chứa 4 khúc của bài test
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0); // Biến mới: Nhớ xem đang ở khúc nào (0, 1, 2, 3)
    const testStages = [
                { section: "Reading and Writing", module: 1, duration: 32 * 60 }, // 32 phút
                { section: "Reading and Writing", module: 2, duration: 32 * 60 },
                { section: "Math", module: 1, duration: 35 * 60 },   // 35 phút
                { section: "Math", module: 2, duration: 35 * 60 },
            ];  

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

    useEffect(() => {
        const fetchQuestions = async () => {
            try {
                const res = await api.get(API_PATHS.getQuestionsByTestId(testId));     // gửi yêu cầu GET các câu hỏi của testId đó
                const data = res.data;    // Lấy data từ kết quả

                setQuestions(data.questions || []);    // Lưu danh sách questions vừa lấy được vào biến nhớ để hiện lên màn hình, k lấy dược thì trả về mảng rỗng tránh lỗi
                // FIX: Thay vì mặc định 60 phút, lấy duration của chặng đầu tiên
                setTimeRemaining(testStages[0].duration);        

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

    // Timer Countdown
    // mỗi 1 giây, hàm sẽ trừ 1 giây, nếu về 0 thì sẽ auto nộp bài 
    useEffect(() => {
        if (loading || timeRemaining <= 0) return;    // nếu đang load or hết thời gian rồi thì k hiện timer

        // setInterval(() => { ... }, 1000) -> Cứ mỗi 1000 milisecond = 1 giây thì thực hiện lệnh trong ... 1 lần
        const interval = setInterval(() => {
            setTimeRemaining((prev) => {          // prev là số giây trước đó
                if (prev <= 1) {                  // nếu số giây cũ là 1 (giây cuối cùng)
                    clearInterval(interval);      // Phá bỏ vòng lặp 1 giây ở trên (Tắt đồng hồ để k bị âm giây -1 -2)
                    handleSubmit();               // nộp bài luôn
                    return 0;                 // trả về con số hiện lên màn hình là 0 giây
                }
                return prev - 1;       // k phải giây cuối => Mỗi giây trừ 1 giây của số giây trước
            });
        }, 1000);

        return () => clearInterval(interval);        // Clean up function: nếu hs tắt web thì tắt đồng hồ tránh đồng hồ chạy ngầm tốn ram
                 // return trong useEffect chạy khi useEffect khởi động lại hoặc ngay trước khi giao diện đóng
    }, [loading, timeRemaining]);                   // Hàm này để mắt tới 2 yếu tố: đã tải xong đề thi chưa và mỗi khi thời gian còn lại thay đổi


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

        // THÊM MỚI: HÀM KIỂM TRA ĐÁP ÁN ĐÚNG CHO CẢ TRẮC NGHIỆM VÀ TỰ LUẬN
        const checkIsCorrect = (q: any, userAns: string) => {
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

        // 2. NẾU LÀ SECTIONAL HOẶC ĐÃ ĐẾN CUỐI FULL TEST -> CHẤM ĐIỂM VÀ NỘP BÀI
        try {
          // Chỉ lấy câu hỏi của Module hiện tại nếu đang thi Sectional, ngược lại lấy toàn bộ
            const questionsToGrade = mode === "sectional" ? currentModuleQuestions : questions;

            const formattedAnswers = questionsToGrade.map(q => {
                const userAns = answers[q._id] || "Omitted";
                return {
                    questionId: q._id,
                    userAnswer: userAns,
                    isCorrect: checkIsCorrect(q, userAns) // SỬ DỤNG HÀM KIỂM TRA MỚI Ở ĐÂY
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
                     router.push(`/review?testId=${testId}&mode=full`);                }
            }
        } catch (err) {
            console.error(err);
            alert("Failed to submit test");
        }
    };

    // Dưới là các chốt chặn trc khi hiển thị giao diện làm bài
    if (loading) return <div className="min-h-screen bg-slate-50 flex items-center justify-center"><Loading /></div>;   // Nếu đanh load thì load animation

    if (questions.length === 0) {    // Nếu mà k có câu hỏi nào sau khi lấy về thì hiện No question found và hiện 1 nút quay về trang chủ
        return (
            <div className="min-h-screen flex flex-col items-center justify-center bg-slate-50 p-6">
                <h1 className="text-2xl font-bold mb-4 text-slate-900">No questions found!</h1>
                <button onClick={() => router.push('/')} className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded">Return to Dashboard</button>
            </div>
        );
    }

    // Qua 2 chốt trên => Dữ liệu đã tải xong và chắc chắn có câu hỏi
    // FIX: Lấy câu hỏi hiện tại từ module hiện tại chứ không lấy từ toàn bộ mảng gốc
    const currentQuestion = currentModuleQuestions[currentIndex] || questions[0];    // lấy câu hỏi hiện tại để display bằng hàm dưới

    return (
        <div className="min-h-screen flex flex-col bg-white overflow-hidden relative selection:bg-yellow-200">
            <TestHeader         // Phần header trên bài test có: Tên section (Verbal or Math), Đồng hồ tgian còn lại, gọi hàm handleSubmit khi hết giờ
                sectionName={`${currentStage.section} - Module ${currentStage.module}`} // Hiện kèm tên module đang làm
                timeRemaining={timeRemaining}
                onTimeUp={handleSubmit}    // hàm xử lý khi hết giờ thì submit, onTimeUp chỉ là tên (ở phần khai báo thì nó là 1 hàm để truyền được handleSubmit vào), handleSubmit mới là bộ não, biết hết giờ và gửi
                isTimerHidden={isTimerHidden}           // Đây là component con k dùng logic để bật tắt timer mà chỉ nhạn tín hiệu từ component cha là TestLayout
                setIsTimerHidden={setIsTimerHidden}
                onToggleCalculator={() => setIsCalculatorOpen(!isCalculatorOpen)}       // Lật ngược lại bool bật tắt Calc
                showCalculator={currentStage.section === "Math"}

                buttonText={mode === "sectional" ? "Submit Module" : (currentStageIndex < 3 ? "Next Module" : "Submit Test")}
                confirmTitle={mode === "sectional" ? "Submit Module" : (currentStageIndex < 3 ? "Next Module" : "Submit Full Test")}
                confirmDescription={mode === "sectional" ? "Are you sure you want to grade this module now?" : "Are you sure you want to end this section?"}
                            
            />

            <DesmosCalculator
                isOpen={isCalculatorOpen}                      // Nhận tín hiệu bật or tắt
                onClose={() => setIsCalculatorOpen(false)}     // nếu đang tắt thì tắt máy tính đi
            />

           <main
    ref={containerRef}
    className="flex-1 w-full bg-white relative overflow-hidden"
    style={{ userSelect: isDragging.current ? "none" : "auto" }}
    // THÊM MỚI: Bắt mousedown bubble lên từ #qv-divider bên trong QuestionViewer
    onMouseDown={(e) => {
        const target = e.target as HTMLElement;
        if (target.closest("#qv-divider")) {
            handleDividerMouseDown(e);
        }
    }}
>
    <QuestionViewer
        question={currentQuestion}
        userAnswer={answers[currentQuestion._id]}
        onAnswerSelect={handleAnswerSelect}
        isFlagged={!!flagged[currentQuestion._id]}
        onToggleFlag={toggleFlag}
        index={currentIndex}
        leftWidth={leftWidth}      // THÊM MỚI: truyền % vào để QuestionViewer tự chia layout
    />
</main>
            {/* ─────────────────────────────────────────────────────────────────────── */}

            {/** Đây là mục  để di chuyển giữa các câu, và là cả thanh ở dưới trang, có nút next prev 
             * Đang thiếu Tên: FIX
            */}
            <TestFooter                              // Truyền tham số và hàm cho component con TestFooter
                currentIndex={currentIndex}           // Báo cho biết đây là câu số mấy
                totalQuestions={currentModuleQuestions.length}     // FIX: Tổng sổ câu giới hạn trong Module hiện tại
                onNext={handleNext}                   // hàm xử lý các nút next prev và jump
                onPrev={handlePrev}
                onJump={handleJump} 
                answers={answers}                     // Truyền vào các câu đã chọn để hiển thị màu khác các câu chưa chọn
                flagged={flagged}                     // Lấy thông tin các câu đã flag để hiện lên mục di chuyển giữa các câu
                questions={currentModuleQuestions}    // FIX: Giao danh sách câu hỏi CỦA MODULE HIỆN TẠI để vẽ số ô Grid tương ứng
            />
        </div>
    );
}   