// Trang chủ 

"use client";

import { useSession} from "next-auth/react";        // Thông tin phiên đăng nhập
import Link from "next/link";                       // Công cụ tạo đường link -> Giúp bấm link mà k chớp màn hìn or tải lại web từ đầu
import { useEffect, useState } from "react";        // Bộ nhớ qly từng component
import Loading from "@/components/Loading";         // animation loading
import api from "@/lib/axios";                                        // công cụ gửi api
import { API_PATHS } from "@/lib/apiPaths";                           // đường dẫn để gửi api

// Import 3 components vừa được tách ra
import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
import LeaderboardTable from "@/components/dashboard/LeaderboardTable";
import TestLibrary from "@/components/dashboard/TestLibrary";

// Import landing page components
import HeroSection from "@/components/landing/HeroSection";
import FeaturesBento from "@/components/landing/FeaturesBento";
import ExplanationSection from "@/components/landing/ExplanationSection";
import TestimonialsMarquee from "@/components/landing/TestimonialsMarquee";
import CTASection from "@/components/landing/CTASection";
import LandingFooter from "@/components/landing/LandingFooter";

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [tests, setTests] = useState<any[]>([]);                // data các bài test được display

  const [loading, setLoading] = useState(true);          // loading animation
  const [userStats, setUserStats] = useState({ 
    testsTaken: 0,                                       // thông tin stats về số tests và điểm cao nhất
    highestScore: 0,
  });
  const [userResults, setUserResults] = useState([]);        // Biến lưu results các bài test trong 30 ngày qua
  const [sortOption, setSortOption] = useState("newest");    // biến lưu trạng thái sort, mặc định là newest
  const [page, setPage] = useState(1);                       // biến lưu số trang user đang ở, mặc định ở trang 1
  const [totalPages, setTotalPages] = useState(1);           // biến lưu tổng số trang
  const limit = 6;


  const [leaderboard, setLeaderboard] = useState<any[]>([]); // Biến lưu bảng xếp hạng


  // 1. Biến nhớ lưu mốc thời gian đang được chọn (Mặc định là xem Tất cả)
  const [selectedPeriod, setSelectedPeriod] = useState("All");

  // 2. Tự động quét kho đề thi, lấy 2 chữ đầu tiên của tên đề làm mốc thời gian (loại bỏ trùng lặp)
  const uniquePeriods = ["All", ...Array.from(new Set(tests.map(t => {
      const parts = t.title.split(' '); // Tách tên đề thành các từ
      if (parts.length >= 2) return `${parts[0]} ${parts[1]}`; // Lấy từ số 1 và số 2 (VD: March 2026)
      return "Other";
  })))];

  // 3. Mảng dữ liệu mới: Phân loại theo 3 trường hợp rõ ràng
  const filteredTests = tests.filter(t => {
    // Trường hợp 1: Nếu người dùng đang chọn xem "All Tests" -> Giữ lại bài này
    if (selectedPeriod === "All") return true;
    
    // Trường hợp 2: Nếu người dùng bấm vào nút "Other"
    // Lệnh split(' ') sẽ chặt tên bài test thành các từ. Nếu số từ nhỏ hơn 2 thì giữ lại.
    if (selectedPeriod === "Other") return t.title.split(' ').length < 2;
    
    // Trường hợp 3: Người dùng bấm vào các mốc thời gian bình thường (VD: "March 2026")
    // Giữ lại các bài test có tên bắt đầu bằng mốc thời gian đó
    return t.title.startsWith(selectedPeriod);
  });

  useEffect(() => {
    if (session) {                    // Khi đã login
      const fetchUserStats = async () => {     // Hàm đi lấy data user
        try {
          const statsRes = await api.get(`${API_PATHS.RESULTS}?days=30`);     // Lấy dữ liệu trong 30 ngày gần nhất, ?days=30 là điều kiện học data, sau ? là điều kiện data của user
          const statsData = statsRes.data;                                    // data api trả về nhiều cái thừa (header, mã trạng thái,...) nên chỉ lấy thông tin cần thiết
          if (statsData.results) { 
            setUserResults(statsData.results);               // Nếu tồn tại dữ liệu => Lưu vào biến nhớ setUserResult để Heatmap có data vẽ lên biểu đồ 
          }

          const userRes = await api.get('/api/user/stats');   // Lấy thêm thông tin từ đường dẫn chứa stats của user
          const userData = userRes.data;                      // Chỉ lưu data cần thiết
          if (userData) {
            setUserStats({                                    // Nếu tồn tại data thì lưu kết quả vào biến nhớ
              testsTaken: userData.testsTaken || 0,           // Update số test từng làm + highest score vào biến nhớ, k có data thì coi là 0 tránh sập
              highestScore: userData.highestScore || 0,
            });
          }

        } catch (e) {
          console.error("Failed to load user stats", e);
        }
      };   // Kết thúc hàm lấy data user


      const fetchLeaderboard = async () => {
        try {
          const res = await api.get('/api/leaderboard');
          setLeaderboard(res.data.leaderboard || []);
        } catch (e) {
          console.error("Failed to load leaderboard", e);
        }
      };

      fetchUserStats();   // Gọi, bật hàm để lấy data user ngay khi user login
      fetchLeaderboard();
    }
  }, [session]);      // session thay đổi là chạy đoạn này

  useEffect(() => {                       // Lấy danh sách bài thi, kích hoạt mỗi khi đổi trang (1, 2, 3,...) or đổi thứ tự sort bài thi
    const fetchTests = async () => {    // Hàm lấy danh sách bài thi
      setLoading(true);                 // Bật animation loading
      try {
        let sortBy = "createdAt";       // Luật 1: Sắp xếp theo ngày tạo ra bài test
        let sortOrder = "desc";         // Luật 2: Giảm dần
                                        // Kết hợp 2 luật thành = newest -> Option sort mặc định

        if (sortOption === "oldest") {     // Xử lý khi đổi cách sort
          sortOrder = "asc";               // Bài cũ nhất lên trên
        } else if (sortOption === "title_asc") {    // Đổi cách sort
          sortBy = "title";                         // Sort từ A -> Z 
          sortOrder = "asc";
        } else if (sortOption === "title_desc") {  // Z -> A
          sortBy = "title";
          sortOrder = "desc";
        }

        const res = await api.get(`${API_PATHS.TESTS}?page=${page}&limit=${limit}&sortBy=${sortBy}&sortOrder=${sortOrder}`);  // Lấy data test theo các điều kiện: Trang số mấy, mỗi trang mấy bài, tiêu chí sort
        setTests(res.data.tests || []);                           // Lấy data về các bài test, lưu vào biến setTests để in ra màn hình, k có data thì lưu biến rỗng tránh sập
        if (res.data.pagination) {                                // Logic xử lý có cần thêm trang không được backend xử lý, nếu cần thêm trang thì sẽ tồn tại res.data.pagination
          setTotalPages(res.data.pagination.totalPages);      // Kiểm tra máy chủ có gửi thông tin về số trang không, pagination là phân ra nhiều trang
                                                              // Có phân trang thì lưu vào biến nhớ để vẽ đúng số lượng nút bấm cho các trang (ví dụ có 7 test  nhưng 1 trang chỉ dược 6 test => Cần 2 trang)
        }
      } catch (e) {
        console.error("Failed to fetch tests", e);
      } finally {
        setLoading(false);       // Lấy data bài test xong thì tắt loading
      }
    }

    fetchTests();      // Gọi hàm lấy data các bài test
  }, [page, sortOption]);

  if (status === "loading") {
    return <Loading />;
  }
  
  // Premium Landing Page for unauthenticated users
  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen bg-background font-sans">
        {/* Landing Header */}
        <header className="sticky top-0 z-50 bg-background/80 backdrop-blur-md border-b border-border">
          <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
            <div className="flex justify-between items-center h-16">
              <div className="flex items-center gap-2">
                <h1 className="text-xl font-bold text-foreground tracking-tight">Ronan SAT</h1>
              </div>
              <div className="flex items-center gap-4">
                <Link 
                  href="/auth" 
                  className="text-muted-foreground hover:text-foreground font-medium transition-colors"
                >
                  Log in
                </Link>
                <Link
                  href="/auth"
                  className="bg-primary hover:bg-blue-700 text-primary-foreground px-5 py-2.5 rounded-lg font-medium transition-all shadow-sm hover:shadow-md"
                >
                  Sign up free
                </Link>
              </div>
            </div>
          </div>
        </header>

        {/* Landing Page Sections */}
        <main>
          <HeroSection />
          <FeaturesBento />
          <ExplanationSection />
          <TestimonialsMarquee />
          <CTASection />
        </main>
        
        <LandingFooter />
      </div>
    );
  }

  // Dashboard for logged in user
  return (
    <div className="min-h-screen bg-slate-50 pb-12">
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        
        {/* User Stats Panel */}
        <UserStatsPanel userStats={userStats} userResults={userResults} />

        {/* Weekly Top Achievers */}
        <LeaderboardTable leaderboard={leaderboard} />

        {/* Test Library */}
        <TestLibrary 
          uniquePeriods={uniquePeriods}
          selectedPeriod={selectedPeriod}
          setSelectedPeriod={setSelectedPeriod}
          sortOption={sortOption}
          setSortOption={setSortOption}
          page={page}
          setPage={setPage}
          loading={loading}
          filteredTests={filteredTests}
          totalPages={totalPages}
        />

      </main>
    </div>
  );
}
