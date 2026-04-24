  // Check đã login chưa, chưa thì đuổi sang trang login
  // Tìm dữ liệu cache để hiển thị lên màn hình, ngầm tải dữ liệu mới nhất từ mạng
  // Trong lúc tải thì hiện skeleton


  "use client";

  import { useEffect, useLayoutEffect, useState } from "react";
  import { useRouter } from "next/navigation";
  import { useSession } from "@/lib/auth/client";

  import InitialTabBootReady from "@/components/InitialTabBootReady";
  import ImprovementTrendPanel from "@/components/dashboard/ImprovementTrendPanel";
  import RecentResultsList from "@/components/dashboard/RecentResultsList";
  import UserStatsPanel from "@/components/dashboard/UserStatsPanel";
  import UserStatsPanelSkeleton from "@/components/dashboard/UserStatsPanelSkeleton";
  import { getCachedDashboardOverview } from "@/lib/dashboardCache";
  import { preloadDashboardOverview, preloadInitialAppData } from "@/lib/startupPreload";
  import type { DashboardOverview } from "@/types/dashboard";

  export default function DashboardPageClient() {
    const router = useRouter();
    const { data: session, status } = useSession();

    const [overview, setOverview] = useState<DashboardOverview>({
      userStats: { testsTaken: 0, highestScore: 0 },
      activity: [],
      recentResults: [],
      trend: [],
    });
    const [loading, setLoading] = useState(true);
    const [hasHydratedClientCache, setHasHydratedClientCache] = useState(false);

    useLayoutEffect(() => {
      const cachedOverview = getCachedDashboardOverview();

      if (cachedOverview) {                        // Cache có dữ liệu thì lấy ra dùng luôn
        setOverview(cachedOverview);
        setLoading(false);
      }

      setHasHydratedClientCache(true);  // Biến nhớ kiểm tra đã đọc cache chưa, chỉ đọc trong lần đầu mở trang
    }, []);    // Check cache ngay lần đầu vào web only

    useEffect(() => {
      router.prefetch("/review");
    }, [router]);

    useEffect(() => {
      if (!hasHydratedClientCache) {   // Chưa đọc cache/login thì ch làm gì
        return;
      }

      if (status === "unauthenticated") {
        router.replace("/auth");
        return;
      }

      if (status !== "authenticated" || !session?.user?.role) {
        return;
      }

      if (!session.user.hasCompletedProfile) {   // Chưa điền user name/dateBirth thì điều hướng tới /welcome
        router.replace("/welcome");
        return;
      }

      let cancelled = false;     // Công tắc an toàn đề phòng user chuyển trang, tắt tab trong lúc lấy dữ liệu

      const loadDashboard = async () => {    // Lấy data dashboard
        const cachedOverview = getCachedDashboardOverview();

        if (cachedOverview) {            // Check cache, lấy lại dữ liệu mới nhất mỗi khi có các biến của useEffect thay đổi
          setOverview(cachedOverview);
          setLoading(false);
        } else {
          setLoading(true);
        }

        void preloadInitialAppData({         // Đi lấy dữ liệu chạy nền chung của cả web để sau mở ra cái có được ngay, không chờ lấy xong mà đi làm việc khác trước  
          role: session.user.role,    // Gửi id và role của user đi 
          userId: session.user.id,
        });

        try {
          const nextOverview = await preloadDashboardOverview();   // Lấy data

          if (cancelled) {     // Nếu đang tải data mà user tắt => bật cancelled = true và k lấy data nữa
            return; 
          }

          setOverview(nextOverview);                   // Nếu user k tắt thì truyền data vào từng 
        } catch (error) {
          if (!cancelled) {
            console.error("Failed to load student dashboard", error);
          }
        } finally {
          if (!cancelled) {
            setLoading(false);     // K cancel và load xong / user tắt k load nữa thì tắt animation loading 
          }
        }
      };

      void loadDashboard(); // Gọi hàm lấy data và gán vào biến

      return () => {         // Hàm dọn dẹp, chạy khi user rời đi khỏi trang hiện tại => Bật flag cancelled lên
        cancelled = true;    
      };
    }, [hasHydratedClientCache, router, session?.user?.hasCompletedProfile, session?.user?.id, session?.user?.role, status]);

    if (status === "loading" || loading) {
      return <DashboardPageSkeleton />;
    }

    if (status === "unauthenticated") {
      return null;                   // Chưa login hoặc hoàn thành profile thì đã được router.replace điều hướng tới trang khác, null là hiện màn hình trắng trong lúc chờ
    }

    if (!session?.user?.hasCompletedProfile) {
      return null;
    }

    return (
      <div className="min-h-screen bg-paper-bg pb-12">
        <InitialTabBootReady />
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="workbook-panel-muted mb-6 overflow-hidden">
            <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
              <div className="workbook-sticker bg-primary text-ink-fg">Student Dashboard</div>
              <h1 className="mt-4 font-display text-4xl font-black uppercase tracking-tight text-ink-fg md:text-5xl">
                Keep the whole workbook moving.
              </h1>
              <p className="mt-3 max-w-3xl text-sm leading-6 text-ink-fg md:text-base">
                Check your latest score signals and keep review momentum visible without leaving the dashboard.
              </p>
            </div>
          </section>

          <div className="space-y-8">
            <UserStatsPanel userStats={overview.userStats} activity={overview.activity} />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
              <ImprovementTrendPanel trend={overview.trend} />
              <RecentResultsList results={overview.recentResults} />
            </div>
          </div>
        </main>
      </div>
    );
  }

  function DashboardPageSkeleton() {
    return (
      <div className="min-h-screen bg-paper-bg pb-12">
        <main className="mx-auto max-w-7xl px-4 py-6 sm:px-6 lg:px-8">
          <section className="workbook-panel-muted mb-6 overflow-hidden">
            <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
              <div className="h-8 w-40 rounded-full border-2 border-ink-fg bg-surface-white animate-pulse" />
              <div className="mt-4 h-12 w-full max-w-2xl rounded-md bg-surface-white/75 animate-pulse" />
              <div className="mt-3 h-6 w-full max-w-xl rounded-md bg-surface-white animate-pulse" />
            </div>
          </section>

          <div className="space-y-8">
            <UserStatsPanelSkeleton />
            <div className="grid gap-6 xl:grid-cols-[minmax(0,1.2fr)_minmax(20rem,0.8fr)]">
              {Array.from({ length: 2 }).map((_, index) => (
                <section key={index} className="workbook-panel overflow-hidden">
                  <div className="border-b-4 border-ink-fg bg-paper-bg px-6 py-5">
                    <div className="h-8 w-48 rounded-md bg-surface-white/75 animate-pulse" />
                    <div className="mt-3 h-5 w-32 rounded bg-surface-white animate-pulse" />
                  </div>
                  <div className="space-y-4 p-6">
                    {Array.from({ length: index === 0 ? 5 : 4 }).map((__, rowIndex) => (
                      <div key={rowIndex} className="h-14 rounded-2xl border-2 border-ink-fg bg-paper-bg animate-pulse" />
                    ))}
                  </div>
                </section>
              ))}
            </div>
          </div>
        </main>
      </div>
    );
  }
