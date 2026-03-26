"use client";

import { useState, useEffect } from "react";   // useEffect để tự động chạy 1 hành động khi web vừa tải xong
import { useSession } from "next-auth/react";  // Kiểm tra ai đang login vào web
import Loading from "@/components/Loading";    // Component load trang
import api from "@/lib/axios";                 // Quy chuẩn api gửi đi ở dạng JSON
import { API_PATHS } from "@/lib/apiPaths";    // các routes cố định (tránh phải type lại nhiều gây lỗi)
import { Plus, Save, FileText, CheckCircle, ListPlus, Trash2, Trophy, Upload } from "lucide-react";
import { CldUploadWidget } from "next-cloudinary";


export default function AdminDashboard() {
console.log("Cloud Name đang nhận là:", process.env.NEXT_PUBLIC_CLOUDINARY_CLOUD_NAME);
    
    const { data: session, status } = useSession();   // useSesstion() trả về session (mọi data của user) và status (đang load, đã login, chưa login)
 
    const [tests, setTests] = useState<any[]>([]);  // Biến chứa các bài test cần in ra màn hình, ban đầu là rỗng [], setTest là hàm thay thế hàm rỗng ban đầu = hàm mới chứa các test muốn display
                                                    // <any[]> -> Biến test này phải là 1 mảng, trong mảng đó chứa gì cũng đc -> Bảo vệ kiểu dữ liệu của TypeScript
    const [loading, setLoading] = useState(true);   // Biến kiểm tra web có đang tải hay không (ban đầu là true)

    // State for Test Creation
    const [testForm, setTestForm] = useState({    // Tạo form cho bài test và có các thông tin mặc định như dưới
        title: "",
        timeLimit: 120,
        difficulty: "medium",
    });

    const [testMessage, setTestMessage] = useState("");  // Hiện thông báo về trạng thái tạo test (Thành công/Thất bại)

    // State for Question Creation
    const [selectedTestId, setSelectedTestId] = useState("");  // Lúc mới mở ra, chưa chọn bài test nào để update nên ID của bài test được selected = ""
 
    // Các thông tin mặc định ban đầu của 1 question
    // state này chứa mọi thông tin của 1 câu hỏi
    const [questionForm, setQuestionForm] = useState({
        section: "Reading and Writing",
        module: 1,
        questionType: "multiple_choice", // THÊM MỚI: Thêm loại câu hỏi. Mặc định là Trắc nghiệm. Nếu muốn Tự luận là mặc định, đổi chữ này thành "spr"
        questionText: "",
        passage: "",
        imageUrl: "",
        choices: ["", "", "", ""],      // Bao gồm các lựa chọn
        correctAnswer: "",
        sprAnswers: ["", "", ""],        // THÊM MỚI: Thêm mảng 3 ô trống để chứa 3 cách viết đáp án tự luận
        explanation: "",
        difficulty: "medium",
        points: 10
    });
    //Thông báo kết quả việc tạo câu hỏi ( Thành công, thiếu ô nào,... )
    // Nếu thiếu đáp án đúng thì setQuestionMessage("Thiếu đáp án")
    const [questionMessage, setQuestionMessage] = useState("");


// Thẻ học sinh
const [studentForm, setStudentForm] = useState({
        name: "",
        school: "",
        score: 0,
        examDate: "",
        imageUrl: ""
    });
    const [studentMessage, setStudentMessage] = useState("");




    // [] là danh sách các biến mà hàm này phụ thuộc (biến thay đổi thì hàm mới chạy tiếp ngoài lần đầu load web)
    // Vấn đề khi k có [] -> useEffect() chạy lúc đầu load trang để đi lấy data các Tests -> setTests cất các bài tets vào hộp -> React vẽ lại màn hình -> UseEffect() -> setTest -> Lặp liên tục
    // có [] giúp react biết không cần phụ thuộc vào biến nào => Chỉ chạy 1 lần lúc load web lần đầu
    // nếu trong [] có 1 tên biến => hàm sẽ chạy mỗi khi biến đó bị thay đổi
    useEffect(() => {
        fetchTests();     // Ngay khi màn hình mở ra thì chạy hàm này (ngay dưới)
    }, []);        

    const fetchTests = async () => {
        try {
            // api.get là lấy giữ liệu về
            const res = await api.get(API_PATHS.TESTS);   // Call api để liên hệ với Backend để BE liên hệ với DB, lấy api từ địa chỉ API_PATHS.TESTS và lưu kết quả JSON vào res
            const data = res.data;                        // Lấy data từ kết quả chứa danh sách các bài Tests
            setTests(data.tests || []);                   // Nếu đúng là có kết quả thì lấy các bài "tests" ra còn không có thì trả về 1 mảng rỗng
            if (data.tests?.length > 0 && !selectedTestId) {      // Nếu có >= 1 bài thi và user CHƯA select thì 
                setSelectedTestId(data.tests[0]._id);             // Lấy sẵn bài thi đầu tiên trong list làm bài test được chọn => Không trống trơn
            }
        } catch (e) {
            console.error("Failed to fetch tests", e); 
        } finally {     // Dù try hay catch, chương trình luôn chạy finally
            setLoading(false);     // Tắt animation loading
        }
    };

    if (status === "loading" || loading) return <Loading />;    // Nếu status của session đăng nhập là loading thì hiện animation Loading thay vì để trắng tinh

    if (!session || session.user.role !== "admin") {  // Nếu chưa đăng nhập (sẽ k có session) hoặc login rồi nhưng role k phải admin thì k đucợ access file này và return dòng chữ Unauthorized
        return <div className="min-h-screen flex items-center justify-center bg-slate-50"><div className="p-8 text-red-600 font-bold bg-white rounded-lg border border-slate-200">Unauthorized. Admin access required.</div></div>;
    }

    //Nếu đúng là Admin và login rồi thì chạy tiếp

    // Hàm xử lý khi ấn nút tạo test, gửi data test tạo lên sẽ mất tgian => use async
    const handleCreateTest = async (e: React.FormEvent) => {   // Khi user thực hiện any hành động trên web, trình duyệt gửi mọi data về hành động đó qua e (event)
                                                               // FormEvent thể hiện đây là sự kiện dành cho Form chứ k phải Cuộn/Kích chuột
        e.preventDefault();
        setTestMessage("");   // Xóa trắng các thông báo cũ (các thông báo lỗi cũ) trước khi tạo test mới

        try {
            const res = await api.post(API_PATHS.TESTS, {
                ...testForm,                                     // ... tổng hợp toàn bộ data đã gửi vào form cho bài test cụ thể này 
                sections: [                                      // Đính thêm 2 phần thông tin cố định, k cần user type vào form
                    { name: "Reading and Writing", questionsCount: 27, timeLimit: 32 },
                    { name: "Math", questionsCount: 22, timeLimit: 35 }
                ]
            });

            if (res.status === 200 || res.status === 201) {
                setTestMessage("Test created successfully!");    // api.post thực hiện thành công việc gửi data từ FE về BE
                setTestForm({ title: "", timeLimit: 120, difficulty: "medium" });     // Tạo thành công thì reset các thông số kia về như cũ để tạo tiếp
                fetchTests();                                                         // Refresh lại trang giúp web vừa tạo hiện ra màn hình 
            } else {
                setTestMessage(`Error: ${res.data.error || "Error creating test."}`);  
            }
        } catch (err: any) {      // err: any -> Lỗi ở đây có thể là bất kỳ loại data nào
            console.error(err);
            setTestMessage("Network error");
        }
    };


    //Cập nhật nội dung của một lựa chọn -> Hàm use quy tắc của React: Không thay đổi trên đồ gốc mà nó copy nội dung ra bản nháp, update nội dung trên bản nháp đó rồi chỉ update phần thay đổi ở bản chính
    const handleChoiceChange = (index: number, value: string) => {     // index cho biết đáp án thứ mấy, value là nội dung mới của lựa chọn mới nhập
        const newChoices = [...questionForm.choices];                  // questionForm.choice là một tờ giấy có 4 đáp án ban đầu
                                                                       // ... là Spread Operator copy mọi đáp án gốc ra newChoices, nếu ko dùng [... ] thì JS sẽ gán newChoices cùng là tên của questionForm.choices => Nếu sửa newChoices thì sẽ ảnh hưởng bản gốc
        newChoices[index] = value;  // Update nội dung choice đó = value mới điền
        setQuestionForm({ ...questionForm, choices: newChoices });     // update lại nội dung Question, chứ mọi data cũ + choices chứa array bao gồm Option đã sửa
    };


    // Xử lý khi bấm nút câu hỏi -> Kiểm tra xem: 
    // 1. Ktra điền đủ + đúng ycau form chưa
    // 2. Gửi data câu hỏi lên máy chủ
    // 3. Xóa mọi ô nhập liệu nhưng vẫn giữ thông tin bài thi cho lần điền sau
    const handleCreateQuestion = async (e: React.FormEvent) => {
        e.preventDefault();
        setQuestionMessage("");  // Xóa mọi thông báo từ trước để màn hình sạch

        if (!selectedTestId) {     // Ktra đã chọn bài test mà question này thuộc về chưa
            setQuestionMessage("Please select a test first.");
            return;
        }

        // THÊM MỚI: Tách biệt cách kiểm tra lỗi giữa Trắc nghiệm và Tự luận
        if (questionForm.questionType === "multiple_choice") {
            // Đán án đúng questionForm.correctAnswer phải thuộc 1 trong 4 option của câu
            if (!questionForm.choices.includes(questionForm.correctAnswer)) {
                setQuestionMessage("The correct answer must exactly match one of the choices.");
                return;
            }
        } else {
            // Nếu là tự luận, bắt buộc phải điền ô đáp án số 1
            if (!questionForm.sprAnswers[0].trim()) {
                setQuestionMessage("Vui lòng điền ít nhất 1 đáp án cho câu tự luận.");
                return;
            }
        }


        try {    // Đóng gói all nội dung câu hỏi (...questionForm), đings vào mã testID rồi gửi(post) lên máy chủ (API_PATHS.QUESTIONS)
            const res = await api.post(API_PATHS.QUESTIONS, {    
                ...questionForm,        // ở bước này, questionForm đã có mọi thông tin của câu hỏi rồi
                testId: selectedTestId
            });

            if (res.status === 200 || res.status === 201) {
                setQuestionMessage("Question added successfully!");
                // Reset form but keep section and test selection
                setQuestionForm({      // Add thành công thì reset lại cho lần sau
                    ...questionForm,
                    questionText: "",
                    passage: "",
                    imageUrl: "",
                    choices: ["", "", "", ""],
                    correctAnswer: "",
                    sprAnswers: ["", "", ""], // THÊM MỚI: Xóa trắng lại 3 ô tự luận
                    explanation: "",
                });
            } else {
                console.error("Failed to add question:", res.data);
                setQuestionMessage(`Error: ${res.data.error || "Unknown database error"}`);
            }
        } catch (err: any) {
            console.error(err);
            setQuestionMessage("Network error");
        }
    };


    // Hàm xử lý khi bấm lưu Học sinh
    const handleCreateStudent = async (e: React.FormEvent) => {
        e.preventDefault();
        setStudentMessage("");

        if (!studentForm.imageUrl) {
            setStudentMessage("Lỗi: Bạn chưa tải ảnh học sinh lên!");
            return;
        }

        try {
            // Gửi dữ liệu vào API sinh ra ở bài trước
            const res = await api.post("/api/students", studentForm);

            if (res.status === 200 || res.status === 201) {
                setStudentMessage("Đã thêm học sinh vào bảng vàng thành công!");
                // Xóa form để nhập em tiếp theo
                setStudentForm({ name: "", school: "", score: 0, examDate: "", imageUrl: "" });
            } else {
                setStudentMessage(`Lỗi: ${res.data?.error || "Không thể thêm học sinh"}`);
            }
        } catch (err: any) {
            console.error(err);
            setStudentMessage("Lỗi kết nối tới máy chủ.");
        }
    };

    

    return (
        <div className="min-h-screen bg-slate-50 p-8 pb-24">
            <div className="max-w-5xl mx-auto space-y-8">

                <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
                    {/* Left Column: Test Creation */}
                    <div className="lg:col-span-1 space-y-8">
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-200 bg-slate-100 flex items-center gap-2 text-slate-800 font-bold">
                                <FileText className="w-5 h-5 text-blue-600" />
                                Step 1: Create Test
                            </div>

                            <form className="p-5 space-y-5" onSubmit={handleCreateTest}>
                                {testMessage && (
                                    <div className={`p-3 rounded-lg font-medium text-sm ${testMessage.includes('success') ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {testMessage}
                                    </div>
                                )}

                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Test Title</label>   
                                    <input                               // Cập nhật tên (title) cho bài test
                                        type="text" 
                                        required
                                        value={testForm.title}
                                        onChange={(e) => setTestForm({ ...testForm, title: e.target.value })}      // Cập nhật liên tục input từ user vào kho chứa title bài test
                                                                                                                   // ...testForm (chứa mọi thông tin về bài test <tên, timelimit, độ khó>) để các mục còn lại ngoài title không bị xóa mất mỗi khi điền title
                                        placeholder="e.g. Official Practice Test 1"
                                        className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
                                    />
                                </div>

                                <div className="grid grid-cols-2 gap-3">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Minutes</label>
                                        <input                                                // update timelimit của bài test đang đc tạo
                                            type="number"
                                            required
                                            value={Number.isNaN(testForm.timeLimit) ? "" : testForm.timeLimit}     // nếu timeLimit hiện tại của bài test đang không phải 1 con số (NaN = not a number) thì hiện ô trống không, còn có là số thì mới hiện
                                            onChange={(e) => setTestForm({ ...testForm, timeLimit: parseInt(e.target.value) })}   // parseInt để ép data thành 1 con số trước khi vào bộ nhớ 
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                                        <select
                                            value={testForm.difficulty}
                                            onChange={(e) => setTestForm({ ...testForm, difficulty: e.target.value })}      // độ khó là each option dưới, giá trị được chọn truyền vào e.target.value
                                            className="w-full px-3 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                </div>

                                <button
                                    type="submit"
                                    className="w-full bg-slate-900 hover:bg-slate-800 text-white px-4 py-2 rounded-lg flex justify-center items-center gap-2 font-medium text-sm"
                                >
                                    <Plus className="w-4 h-4" /> Create Test    {/* Plus là icon dấu cộng cho đẹp thôi */}
                                </button> 
                            </form>
                        </div>
                    </div>

                    {/* Right Column: Question Creation */}
                    <div className="lg:col-span-2">
                        <div className="bg-white rounded-xl border border-slate-200 overflow-hidden">
                            <div className="p-5 border-b border-slate-200 bg-slate-100 flex items-center justify-between">
                                <div className="flex items-center gap-2 text-slate-800 font-bold">
                                    <ListPlus className="w-5 h-5 text-blue-600" />
                                    Step 2: Add Questions to Test
                                </div>

                                <div className="flex items-center gap-2">
                                    <label className="text-sm font-semibold text-slate-600">Select Test:</label>
                                    <select
                                        value={selectedTestId}
                                        onChange={(e) => setSelectedTestId(e.target.value)}
                                        className="px-3 py-1.5 border border-slate-300 rounded-md font-medium text-sm outline-none bg-white text-slate-900 min-w-[200px]"
                                    >
                                        {tests.map(t => (                                         // map liệt kê hết các test đang có trong mảng tests-> .map cần key để k nhầm lẫn giữa các phần tử trong map => Gán bằng _id của phần tử hiện tại, value là giá trị nếu mình chọn test đó thì máy sẽ gửi value lên máy chủ 
                                            <option key={t._id} value={t._id}>{t.title}</option>  // {t.title} là phần hiện lên tên của bài test hiện tại
                                        ))}  
                                        {tests.length === 0 && <option value="">No tests available</option>}     {/* Nếu không có test nào để chọn thì hiện No test available */}
                                    </select>
                                </div>
                            </div>

                            <form className="p-6 space-y-6" onSubmit={handleCreateQuestion}>
                                {questionMessage && (
                                    <div className={`p-4 rounded-lg font-medium text-sm flex items-center gap-2 ${questionMessage.includes('success') ? 'bg-green-50 justify-center text-green-700' : 'bg-red-50 text-red-700'}`}>
                                        {questionMessage.includes('success') && <CheckCircle className="w-5 h-5" />}
                                        {questionMessage}
                                    </div>
                                )}

                                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Section</label>
                                        <select
                                            value={questionForm.section}      // update lựa chọn vào mục section của questionForm
                                            onChange={(e) => setQuestionForm({ ...questionForm, section: e.target.value })}   // Chọn section Reading and Writing hay Math
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        >
                                            <option value="Reading and Writing">Reading and Writing</option>
                                            <option value="Math">Math</option>
                                        </select>
                                    </div>

                                <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Module</label>
                                        <select
                                            value={questionForm.module}      
                                            // parseInt để ép kiểu string "1" hoặc "2" thành số nguyên (number) trước khi lưu
                                            onChange={(e) => setQuestionForm({ ...questionForm, module: parseInt(e.target.value) })}   
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        >
                                            <option value={1}>Module 1</option>
                                            <option value={2}>Module 2</option>
                                        </select>
                                </div>

                                {/* THÊM MỚI: PHẦN CHỌN LOẠI CÂU HỎI */}
                                <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Loại câu hỏi</label>
                                        <select
                                            value={questionForm.questionType}      
                                            onChange={(e) => setQuestionForm({ ...questionForm, questionType: e.target.value })}   
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900 font-medium"
                                        >
                                            <option value="multiple_choice">Trắc nghiệm</option>
                                            <option value="spr">Tự luận</option>
                                        </select>
                                </div>


                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Difficulty</label>
                                        <select
                                            value={questionForm.difficulty}                                                        // Update vào difficulty
                                            onChange={(e) => setQuestionForm({ ...questionForm, difficulty: e.target.value })}     // Chọn độ khó
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        >
                                            <option value="easy">Easy</option>
                                            <option value="medium">Medium</option>
                                            <option value="hard">Hard</option>
                                        </select>
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Points</label>
                                        <input
                                            type="number"
                                            required
                                            value={Number.isNaN(questionForm.points) ? "" : questionForm.points}                        // Truyền lên phải là 1 con số
                                            onChange={(e) => setQuestionForm({ ...questionForm, points: parseInt(e.target.value) })}    // Chọn số điểm của câu đó
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                        />
                                    </div>
                                </div>

                                <div className="space-y-4 pt-4 border-t border-slate-100">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Passage</label>
                                        <textarea       // Input chỉ cho gõ ở 1 dòng, textarea cho gõ dài
                                            rows={4}    // Mặc định 4 dòng
                                            value={questionForm.passage}   // update vào passae
                                            onChange={(e) => setQuestionForm({ ...questionForm, passage: e.target.value })}
                                            placeholder="Text passage for reading questions..."
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-serif resize-none bg-white text-slate-900"
                                        />
                                    </div>




                                {/* KHU VỰC THÊM ẢNH CHO CÂU HỎI (OPTIONAL) */}
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Question Image / Chart (Optional)</label>
                                        <div className="border border-slate-300 rounded-lg p-3 bg-slate-50">
                                            {questionForm.imageUrl ? (
                                                <div className="relative">
                                                    <img src={questionForm.imageUrl} alt="Question preview" className="max-h-40 mx-auto rounded shadow-sm" />
                                                    <button 
                                                        type="button" 
                                                        onClick={() => setQuestionForm({...questionForm, imageUrl: ""})} 
                                                        className="absolute top-0 right-0 bg-red-500 text-white p-1 rounded-bl-lg rounded-tr-lg text-xs hover:bg-red-600"
                                                    >
                                                        Xóa ảnh
                                                    </button>
                                                </div>
                                            ) : (

                                                 <>
                                    <div>
                                        <div className="border border-slate-300 rounded-lg bg-slate-50">
                                            
                                            {/* GIỮ CLDUPLOADWIDGET Ở NGOÀI CÙNG ĐỂ KHÔNG BỊ LỖI KẸT CHUỘT */}
                                            <CldUploadWidget
                                                uploadPreset="ronan_sat_edTech"
                                                onSuccess={(result: any) => {
                                                    if (result?.event === "success") {
                                                        setQuestionForm(prev => ({ ...prev, imageUrl: result.info.secure_url }));
                                                        document.body.style.overflow = "auto";
                                                    }
                                                }}
                                                onClose={() => {
                                                    document.body.style.overflow = "auto";
                                                }}
                                            >
                                                {({ open }) => (
                                                    <div>
                                                        {questionForm.imageUrl ? (
                                                            <div className="relative">
                                                                <img src={questionForm.imageUrl} alt="Preview" className="max-h-40 mx-auto rounded shadow-sm" />
                                                                <button 
                                                                    type="button" 
                                                                    onClick={(e) => { 
                                                                        e.stopPropagation(); 
                                                                        setQuestionForm(prev => ({...prev, imageUrl: ""})); 
                                                                    }} 
                                                                    className="absolute top-0 right-0 bg-red-500 text-white p-1 px-3 rounded-bl-lg rounded-tr-md text-xs font-bold hover:bg-red-600"
                                                                >
                                                                    Xóa ảnh
                                                                </button>
                                                            </div>
                                                        ) : (
                                                            <button 
                                                                type="button" 
                                                                onClick={(e) => { e.preventDefault(); open(); }}
                                                                className="w-full py-3 border-2 border-dashed border-slate-300 rounded-lg text-slate-500 hover:text-blue-600 hover:border-blue-400 hover:bg-blue-50 transition-all font-medium flex items-center justify-center gap-2"
                                                            >
                                                                <Upload className="w-5 h-5" /> Tải ảnh đồ thị/biểu đồ lên (Không bắt buộc)
                                                            </button>
                                                        )}
                                                    </div>
                                                )}
                                            </CldUploadWidget>

                                        </div>
                                    </div>
                                    
                                    {/* Dưới này là ô nhập Question Text cũ của bạn */}
                                                </>
                                            )}
                                        </div>
                                    </div>



                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Question Text *</label>
                                        <textarea
                                            rows={3}
                                            required
                                            value={questionForm.questionText}    // update vào questionText
                                            onChange={(e) => setQuestionForm({ ...questionForm, questionText: e.target.value })}
                                            placeholder="The actual question..."
                                            className="w-full px-4 py-3 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none font-medium resize-none bg-white text-slate-900"
                                        />
                                    </div>

                                    {/* THÊM MỚI: KIỂM TRA ĐIỀU KIỆN ĐỂ HIỂN THỊ GIAO DIỆN PHÙ HỢP */}
                                    {questionForm.questionType === "multiple_choice" ? (
                                        <>
                                            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                <label className="block text-sm font-bold text-slate-800">Multiple Choice Options</label>
                                                {questionForm.choices.map((choice, i) => (    // Mỗi lần loop lấy 2 thông tin: Nội dung lựa chọn và index của đáp án này ( 0 -> 3 )
                                                                                            // choices có 4 vị trí, map chỉ chạy hết 4 vị trí đó rồi dừng
                                                    <div key={i} className="flex items-center gap-3">
                                                        <span className="w-8 h-8 flex items-center justify-center bg-slate-200 text-slate-700 font-bold rounded shrink-0">
                                                            {String.fromCharCode(65 + i)}     {/* Span này hiện 1 ô vuông kèm chữ A B C or D (65 66 67 68) bên trái ô nhập nội dung Option, từ Ascii chuyển thành string để hiện trong ô này*/}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            required
                                                            value={choice}  // Update vào choice (nội dung của lựa chọn này)
                                                            onChange={(e) => handleChoiceChange(i, e.target.value)}   // Truyền vào index và nội dung mới của lựa chọn này
                                                            placeholder={`Option ${String.fromCharCode(65 + i)}`}   
                                                            className="w-full px-4 py-2 border border-slate-300 rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900"
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                                <div>
                                                    <label className="block text-sm font-bold text-emerald-700 mb-1">Correct Answer *</label>
                                                    <select
                                                        required
                                                        value={questionForm.correctAnswer}   // Update đáp án đúng
                                                        onChange={(e) => setQuestionForm({ ...questionForm, correctAnswer: e.target.value })}
                                                        className="w-full px-4 py-2 border border-emerald-300 bg-emerald-50 rounded-lg focus:ring-2 focus:ring-emerald-500 outline-none text-slate-900"
                                                    >
                                                        <option value="" disabled className="">Select correct choice</option>
                                                        {questionForm.choices.map((choice, i) => (
                                                            <option key={i} value={choice} disabled={!choice} className="">   {/**disabled={!choice} -> Nếu lựa chọn chưa được điền nội dung thì nó k được làm đáp án đúng => Disable để k chọn đc */}
                                                                {choice ? `Option ${String.fromCharCode(65 + i)}: ${choice}` : `Option ${String.fromCharCode(65 + i)} (Empty)`}
                                                            </option>
                                                        ))}
                                                    </select>
                                                    <p className="text-xs text-slate-500 mt-1">Select from the choices above.</p>
                                                </div>

                                                <div>
                                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Explanation</label>
                                                    <textarea
                                                        rows={2}
                                                        required
                                                        value={questionForm.explanation}     // update lời giải thích cho câu hỏi
                                                        onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                                        placeholder="Why is this correct?"
                                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white text-slate-900"
                                                    />
                                                </div>
                                            </div>
                                        </>
                                    ) : (
                                        <>
                                            {/* THÊM MỚI: GIAO DIỆN CHO CÂU TỰ LUẬN (SPR) */}
                                            <div className="space-y-3 bg-slate-50 p-4 rounded-xl border border-slate-200">
                                                <label className="block text-sm font-bold text-slate-800">Đáp án tự luận (Hỗ trợ tối đa 3 cách viết)</label>
                                                <p className="text-xs text-slate-500 mb-3">Ví dụ: Điền 1/3 ở cách 1; điền 0.333 ở cách 2; điền .333 ở cách 3</p>
                                                {[0, 1, 2].map((i) => (
                                                    <div key={i} className="flex items-center gap-3">
                                                        <span className="w-8 h-8 flex items-center justify-center bg-blue-100 text-blue-700 font-bold rounded shrink-0">
                                                            {i + 1}
                                                        </span>
                                                        <input
                                                            type="text"
                                                            required={i === 0} // Chỉ bắt buộc nhập ở ô đầu tiên
                                                            value={questionForm.sprAnswers[i]}
                                                            onChange={(e) => {
                                                                const newAnswers = [...questionForm.sprAnswers];
                                                                newAnswers[i] = e.target.value;
                                                                setQuestionForm({ ...questionForm, sprAnswers: newAnswers });
                                                            }}
                                                            placeholder={i === 0 ? "Cách viết đáp án 1 (Bắt buộc) - VD: 1/3" : `Cách viết đáp án ${i + 1} (Tùy chọn) - VD: 0.333`}
                                                            className={`w-full px-4 py-2 border ${i === 0 ? 'border-blue-300 bg-blue-50' : 'border-slate-300'} rounded-md focus:ring-2 focus:ring-blue-500 outline-none bg-white text-slate-900`}
                                                        />
                                                    </div>
                                                ))}
                                            </div>

                                            <div>
                                                <label className="block text-sm font-semibold text-slate-700 mb-1">Explanation</label>
                                                <textarea
                                                    rows={2}
                                                    required
                                                    value={questionForm.explanation}     // update lời giải thích cho câu hỏi
                                                    onChange={(e) => setQuestionForm({ ...questionForm, explanation: e.target.value })}
                                                    placeholder="Why is this correct?"
                                                    className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none resize-none bg-white text-slate-900"
                                                />
                                            </div>
                                        </>
                                    )}
                                </div>

                                <div className="pt-6 border-t border-slate-200 flex justify-end">
                                    <button
                                        type="submit"   // Ấn Save question cái là React dùng api.post để BE xử lý data bài test mới
                                        disabled={!selectedTestId || tests.length === 0}   // Nếu chưa chọn bài test hoặc hệ thống đang k có bài test nào => Nút Save bị disabled
                                        className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                                    >
                                        <Save className="w-5 h-5" /> Save Question
                                    </button>
                                </div>
                            </form>
                        </div>
                    </div>

                </div>

                <div className="bg-white rounded-xl border border-slate-200 overflow-hidden mt-8">
                    <div className="p-5 border-b border-slate-200 bg-slate-100 flex items-center gap-2 text-slate-800 font-bold">
                        <Trophy className="w-5 h-5 text-yellow-500" />
                        Step 3: Add Students to Hall of Fame
                    </div>

                    <form className="p-6 space-y-6" onSubmit={handleCreateStudent}>
                        {studentMessage && (
                            <div className={`p-4 rounded-lg font-medium text-sm flex items-center gap-2 ${studentMessage.includes('thành công') ? 'bg-green-50 justify-center text-green-700' : 'bg-red-50 text-red-700'}`}>
                                {studentMessage.includes('thành công') && <CheckCircle className="w-5 h-5" />}
                                {studentMessage}
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 gap-8">
                            {/* Cột trái: Điền thông tin chữ */}
                            <div className="space-y-4">
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Tên học sinh *</label>
                                    <input
                                        type="text" required
                                        value={studentForm.name}
                                        onChange={(e) => setStudentForm({ ...studentForm, name: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
                                        placeholder="VD: Nguyễn Văn A"
                                    />
                                </div>
                                <div>
                                    <label className="block text-sm font-semibold text-slate-700 mb-1">Trường học *</label>
                                    <input
                                        type="text" required
                                        value={studentForm.school}
                                        onChange={(e) => setStudentForm({ ...studentForm, school: e.target.value })}
                                        className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
                                        placeholder="VD: THPT Chuyên Hà Nội - Amsterdam"
                                    />
                                </div>
                                <div className="grid grid-cols-2 gap-4">
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Điểm SAT *</label>
                                        <input
                                            type="number" required min="400" max="1600"
                                            value={Number.isNaN(studentForm.score) ? "" : studentForm.score}
                                            onChange={(e) => setStudentForm({ ...studentForm, score: parseInt(e.target.value) })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
                                            placeholder="1500"
                                        />
                                    </div>
                                    <div>
                                        <label className="block text-sm font-semibold text-slate-700 mb-1">Tháng/Năm thi *</label>
                                        <input
                                            type="text" required
                                            value={studentForm.examDate}
                                            onChange={(e) => setStudentForm({ ...studentForm, examDate: e.target.value })}
                                            className="w-full px-4 py-2 border border-slate-300 rounded-lg focus:ring-2 focus:ring-blue-500 outline-none text-sm bg-white text-slate-900"
                                            placeholder="VD: August 2023"
                                        />
                                    </div>
                                </div>
                            </div>

                            {/* Cột phải: Khối Upload Ảnh Cloudinary */}
                            <div className="flex flex-col items-center justify-center border-2 border-dashed border-slate-300 rounded-xl p-6 bg-slate-50 relative">
                                {studentForm.imageUrl ? (
                                    <div className="text-center">
                                        {/* Nếu đã có ảnh thì hiện ảnh đó lên cho Admin xem trước */}
                                        <img src={studentForm.imageUrl} alt="Preview" className="h-48 object-contain rounded-lg mb-4 mx-auto shadow-sm" />
                                        <button 
                                            type="button" 
                                            onClick={() => setStudentForm({...studentForm, imageUrl: ""})} 
                                            className="text-red-600 text-sm font-bold hover:underline"
                                        >
                                            Xóa ảnh và Chọn lại
                                        </button>
                                    </div>
                                ) : (
                                   <>
                                    {/* @ts-ignore */}
                                    <CldUploadWidget     
                                        uploadPreset="ronan_sat_edTech"
                                        onSuccess={(result: any) => {
                                            // Sau khi Cloudinary tải xong, nó sẽ trả về 1 đường link (secure_url), ta lấy link đó nhét vào biến imageUrl
                                            setStudentForm(prev => ({ ...prev, imageUrl: result.info.secure_url }));                                        }}
                                    >
                                        {({ open }) => (
                                            <div className="text-center cursor-pointer p-4" onClick={() => open()}>
                                                <div className="w-16 h-16 bg-yellow-100 text-yellow-600 rounded-full flex items-center justify-center mx-auto mb-4 transition-transform hover:scale-110">
                                                    <Upload className="w-8 h-8" />
                                                </div>
                                                <p className="font-bold text-slate-700">Click để chọn ảnh học sinh</p>
                                                <p className="text-xs text-slate-500 mt-2">Được hỗ trợ bởi Cloudinary</p>
                                            </div>
                                     )}
                                    </CldUploadWidget>
                                    </>
                                )}
                               
                            </div>
                                     
                       </div>

                        <div className="pt-6 border-t border-slate-200 flex justify-end">
                            <button
                                type="submit"
                                disabled={!studentForm.imageUrl} 
                                className="bg-yellow-500 hover:bg-yellow-600 text-white px-8 py-3 rounded-lg flex items-center gap-2 font-bold transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                            >
                                <Save className="w-5 h-5" /> Save Student
                            </button>
                        </div>
                    </form>
                </div>


            </div>
        </div>
    );
}