// Trang chủ 

"use client";

import Image from "next/image";                     // Công cụ hiển thị ảnh (lazy loading,...) giúp hiển thị ảnh mượt
import logo from "@/assets/sat-png-4.png";          //  ảnh logo
import { useSession} from "next-auth/react";        // Thông tin phiên đăng nhập
import Link from "next/link";                       // Công cụ tạo đường link -> Giúp bấm link mà k chớp màn hìn or tải lại web từ đầu
import { useEffect, useState } from "react";        // Bộ nhớ qly từng component
import TestCard from "@/components/TestCard";       // Khung hiển thị 1 bài test
import Loading from "@/components/Loading";         // animation loading
import ActivityHeatmap from "@/components/ActivityHeatmap";           // Component hiện lịch sử học tập 30 ngày
import { Trophy, Flame, Target, BookOpen } from "lucide-react";       // icon
import api from "@/lib/axios";                                        // công cụ gửi api
import { API_PATHS } from "@/lib/apiPaths";                           // đường dẫn để gửi api

export default function Dashboard() {
  const { data: session, status } = useSession();
  const [tests, setTests] = useState([]);                // data các bài test được display
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

      fetchUserStats();   // Gọi, bật hàm để lấy data user ngay khi user login
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
        if (res.data.pagination) {                            // Logic xử lý có cần thêm trang không được backend xử lý, nếu cần thêm trang thì sẽ tồn tại res.data.pagination
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
  if (status === "unauthenticated" || !session) {
    return (
      <div className="min-h-screen bg-slate-50 flex flex-col">
        <header className="bg-white border-b border-slate-200 px-6 py-4 flex justify-between items-center">
          <div className="flex items-center gap-2">
            <Image src={logo} alt="SATTOT Logo" width={32} height={32} className="rounded object-contain" />
            <h1 className="text-xl font-bold text-slate-900 tracking-tight">Ronan SAT</h1>
          </div>
          <div className="space-x-4">
            <Link href="/auth" className="text-slate-600 hover:text-slate-900 font-medium">
              Log in
            </Link>
            <Link
              href="/auth"
              className="bg-blue-600 hover:bg-blue-700 text-white px-4 py-2 rounded-lg font-medium"
            >
              Sign up free
            </Link>
          </div>
        </header>

        <main className="flex-1 flex flex-col items-center justify-center text-center px-4">
          <h2 className="text-5xl font-extrabold text-slate-900 tracking-tight max-w-3xl mb-6 leading-tight">
            Master the Digital SAT with Realistic Practice
          </h2>
          <p className="text-xl text-slate-600 max-w-2xl mb-10">
            Experience the exact same interface, tools, and testing environment you'll face on test day. Track your progress and pinpoint weaknesses.
          </p>
          <Link
            href="/auth"
            className="bg-blue-600 hover:bg-blue-700 text-white px-8 py-4 rounded-full text-lg font-semibold transition-all"
          >
            Start Your First Practice Test
          </Link>
        </main>
      </div>
    );
  }

  // Dashboard for logged in user
  return (
    <div className="min-h-screen bg-slate-50 pb-12">


      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-8">
        {/* User Stats Panel */}
        <section className="mb-10">
          <h2 className="text-lg font-bold text-slate-900 mb-4">Your Progress</h2>
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center">
              <div className="bg-blue-100 p-3 rounded-lg mr-4">
                <Trophy className="w-6 h-6 text-blue-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Highest Score</p>
                <p className="text-2xl font-bold text-slate-900">
                  {userStats.highestScore > 0 ? userStats.highestScore : "—"}
                </p>
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center">
              <div className="flex items-center mb-2">
                <div className="bg-orange-100 p-2 sm:p-3 rounded-lg mr-3 sm:mr-4">
                  <Flame className="w-5 h-5 sm:w-6 sm:h-6 text-orange-600" />
                </div>
                <div>
                  <p className="text-xs sm:text-sm font-medium text-slate-500">Activity (30 Days)</p>
                </div>
              </div>
              <div className="w-full mt-auto">
                {userResults.length > 0 ? (
                  <ActivityHeatmap results={userResults} />
                ) : (
                  <p className="text-[10px] text-slate-400 mt-2 text-center">Complete a test to see activity.</p>
                )}
              </div>
            </div>

            <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center">
              <div className="bg-emerald-100 p-3 rounded-lg mr-4">
                <Target className="w-6 h-6 text-emerald-600" />
              </div>
              <div>
                <p className="text-sm font-medium text-slate-500">Tests Completed</p>
                <p className="text-2xl font-bold text-slate-900">{userStats.testsTaken}</p>
              </div>
            </div>
          </div>
        </section>

        {/* Test Library */}
        <section>
          <div className="flex flex-col sm:flex-row justify-between items-start sm:items-center mb-6 gap-4 border-b border-transparent">
            <div className="flex items-center gap-3">
              <h2 className="text-2xl font-bold text-slate-900">Practice Test Library</h2>
              {loading && <span className="text-sm text-slate-500 animate-pulse">Syncing...</span>}
            </div>

            <div className="flex items-center gap-2">
              <label htmlFor="sort-tests" className="text-sm font-medium text-slate-600">Sort by:</label>
              <select
                id="sort-tests"
                value={sortOption}    // Hiển thị ra màn hình lựa chọn Sort hiện tại
                onChange={(e) => { setSortOption(e.target.value); setPage(1); }}    // e.target.value = value mà option dưới chọn (newest/oldest/...) và thay đổi giá trị biến nhớ option Sort và cập nhật bắt user về lại trang 1
                className="bg-white border border-slate-300 text-slate-700 text-sm rounded-lg focus:ring-blue-500 focus:border-blue-500 block p-2 outline-none"
              >
                <option value="newest">Newest First</option>
                <option value="oldest">Oldest First</option>
                <option value="title_asc">Title (A-Z)</option>
                <option value="title_desc">Title (Z-A)</option>
              </select>
            </div>
          </div>

          {loading ? (
            <Loading />
          ) : tests.length === 0 ? (
            <div className="text-center py-16 bg-white rounded-xl border border-slate-200 border-dashed">
              <BookOpen className="w-12 h-12 text-slate-300 mx-auto mb-4" />
              <h3 className="text-lg font-medium text-slate-900">No tests available yet</h3>
            </div>
          ) : (
            <>
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {tests.map((test: any) => (
                  <TestCard key={test._id} test={test} />
                ))}
              </div>

              {!loading && totalPages > 1 && (      // nếu đang k load và số trang phải > 1 (vì = 1 thì k cần thanh số trang => Hệ thống tự xóa đi)
                <div className="flex justify-center items-center mt-8 gap-4">
                  <button
                    onClick={() => setPage(p => Math.max(1, p - 1))}     // Khi bấm nút  Previous thì set số trang - 1 nhưng k được về trang 0 => hàm Math.max để đảm bảo trang bé nhất là 1
                    disabled={page === 1}                                // page đang ở trang 1 thì k cho ấn lùi nữa 
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Previous
                  </button>
                  <span className="text-sm font-medium text-slate-600">
                    Page {page} of {totalPages}
                  </span>
                  <button
                    onClick={() => setPage(p => Math.min(totalPages, p + 1))}  // Đảm bảo không vượt quá tổng số trang
                    disabled={page === totalPages}                             // Đến trang cuối thì k cho Next nữa
                    className="px-4 py-2 bg-white border border-slate-300 rounded-lg text-sm font-medium text-slate-700 hover:bg-slate-50 disabled:opacity-50 disabled:cursor-not-allowed"
                  >
                    Next
                  </button>
                </div>
              )}
            </>
          )}
        </section>
      </main>
    </div>
  );
}
