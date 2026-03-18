// Giao diện bài test
// Nhiệm vụ: Tải list câu hỏi, hiển thị timer đếm ngược, cho phép user chọn đáp án, flag câu cần check lại, tự động tính điểm và gửi kết quả về máy chủ khi nộp bài

"use client";    // Tương tác với user

import { useState, useEffect } from "react";
import { useRouter } from "next/navigation";     // Thi xong thì route sang trang xem điểm
import { Button, Popconfirm } from "antd";
import { TestHeader, TestFooter } from "@/components/TestLayout";    // Giao diên header và footer (phần trên và phần dưới trang)
import QuestionViewer from "@/components/QuestionViewer";            // Hiển thị câu hỏi
import Loading from "@/components/Loading";
import DesmosCalculator from "@/components/DesmosCalculator";        // Máy tính desmos
import api from "@/lib/axios";
import { API_PATHS } from "@/lib/apiPaths";

export default function TestEngine({ testId }: { testId: string }) {    // Lấy id của bài test -> Dựa vào id này mới biết bài này thuộc Verbal       hay Math
    const router = useRouter();

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

    const [modules, setModules] = useState<any[]>([]);       // Biến mới: Chứa 4 khúc của bài test
    const [currentModuleIndex, setCurrentModuleIndex] = useState(0); // Biến mới: Nhớ xem đang ở khúc nào (0, 1, 2, 3)
   
    const [currentStageIndex, setCurrentStageIndex] = useState(0); // 0 đến 3 tương ứng với 4 module

    const testStages = [
        { section: "Reading and Writing", module: 1, duration: 32 * 60 }, // 32 phút
        { section: "Reading and Writing", module: 2, duration: 32 * 60 },
        { section: "Math", module: 1, duration: 35 * 60 },   // 35 phút
        { section: "Math", module: 2, duration: 35 * 60 },
    ];

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
    const handleSubmit = async () => {
        // FIX: Tách logic Nộp Module và Nộp toàn bộ bài
        if (currentStageIndex < 3) {
            // Đang ở chặng 1, 2, 3 -> Nộp Module, chuyển qua chặng tiếp theo
            const nextStageIndex = currentStageIndex + 1;
            setCurrentStageIndex(nextStageIndex);
            setCurrentIndex(0); // Reset về câu 1 của module mới
            setTimeRemaining(testStages[nextStageIndex].duration); // Reset đồng hồ bằng duration của chặng mới
            return; // Dừng tại đây, không post dữ liệu cho tới chặng cuối
        }

        // Nếu qua chặng 3 (Math 2) -> Nộp toàn bộ bài
        try {
           // formated answer đang ở dạng array, từng ô là chứa các object bao gồm 3 thông tin của từng câu
            const formattedAnswers = questions.map(q => {      // Đi qua từng câu
                const userAns = answers[q._id] || "Omitted";    // Lấy đáp án của user, nếu l chọn thì lấy rỗng 
                return {
                    questionId: q._id,                // Lưu lại thông tin câu hỏi nào
                    userAnswer: userAns,              // ans của user
                    isCorrect: userAns === q.correctAnswer   // state đúng hay sai
                };
            });

            let totalPoints = 0;       // Tính tổng điểm và đã đạt được bao nhiêu điiểm
            let earnedPoints = 0;

            questions.forEach(q => {
                const points = q.points || 0;    
                totalPoints += points;                    // Đi qua từng câu hỏi xem câu này đáng giá bnh điểm để cộng vào total

                const userAns = answers[q._id] || "";
                if (userAns === q.correctAnswer) {
                    earnedPoints += points;                   // Lấy ans của user, check với đáp án nếu đúng mới cộng vào điểm earned
                }
            });

            const score = totalPoints > 0 ? Math.floor((earnedPoints / totalPoints) * 1600) : 0;    // FIX cách tính điểm sai
            //Nếu bài thi có điểm thì tính điểm = ratio đúng/tổng số câu * 1600
            // Math.floor làm tròn số nguyên từ 1500.8  thành 1500

            const res = await api.post(API_PATHS.RESULTS, {    // Nộp bảng điểm và chi tiết bài làm cho BE
                testId,                              // Mã bài thi
                answers: formattedAnswers,           // Gửi array chứa các thông tin của từng câu ( id câu, chọn gì, đúng k )
                score,                               // kết quả tính được
                sectionBreakdown: { readingAndWriting: score / 2, math: score / 2 }    // FIXX: Tính được score là 1400 thì nó chia đổi cho math và verbal => Cách tính sai
            });

            if (res.status === 200 || res.status === 201) {
                router.push("/review");                        // Gửi thành công thông tin thì chuyển sang trang review
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
            />

            <DesmosCalculator
                isOpen={isCalculatorOpen}                      // Nhận tín hiệu bật or tắt
                onClose={() => setIsCalculatorOpen(false)}     // nếu đang tắt thì tắt máy tính đi
            />

            <main className="flex-1 w-full bg-white relative">   
                <QuestionViewer                                         // Truyền vào các tham số, hàm cho component con QuestionViewer
                    question={currentQuestion}                          // nội dung câu
                    userAnswer={answers[currentQuestion._id]}           // hiện đáp án user đã chọn 
                    onAnswerSelect={handleAnswerSelect}                 // hàm xử lý khi user chọn
                    isFlagged={!!flagged[currentQuestion._id]}
                    onToggleFlag={toggleFlag}                           // Hàm xử lý bật tắt cờ
                    index={currentIndex}                                // Truyền vào index của câu hiện tại cho component QuestionViewer, nó sẽ tự + 1
                />
            </main>

            <div className="fixed top-3 right-6 z[60px]">
                <Popconfirm                             // Pop up confirm user có muốn submit khi ấn submit hay k, đề phòng lỡ thay
                    title="Submit Test"
                    description="Are you sure you want to end this section and submit your test?"
                    onConfirm={handleSubmit}                 // confirm muốn nộp thì gọi hàm submit
                    okText="Yes"
                    cancelText="No"
                    placement="bottomRight"
                >
                    <Button type="primary" danger>
                        Submit Test
                    </Button>
                </Popconfirm>
            </div>

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