"use client";

export default function UserStatsPanelSkeleton() {
    return (
        // Thêm max-w-5xl (hoặc max-w-4xl tuỳ ý) để Skeleton không bị tràn full 100% màn hình
        <section className="mb-10">
            <div className="h-7 w-40 rounded-md bg-slate-200 animate-pulse mb-4" />
            
            <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                
                {/* Box 1 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 animate-pulse mr-4 shrink-0" />
                    <div className="space-y-2">
                        <div className="h-4 w-[5.5rem] rounded bg-slate-100 animate-pulse" />
                        <div className="h-8 w-10 rounded bg-slate-200 animate-pulse" />
                    </div>
                </div>

                {/* Box 2 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 flex flex-col justify-center">
                    <div className="flex items-center mb-3">
                        <div className="w-11 h-11 rounded-lg bg-slate-100 animate-pulse mr-4 shrink-0" />
                        <div className="h-4 w-[6.25rem] rounded bg-slate-100 animate-pulse" />
                    </div>
                    
                    <div className="w-full mt-auto">
                        {/* Đổi thành 14 cột để các hạt vuông nhỏ lại giống UI thật */}
                        <div className="grid grid-cols-[repeat(14,minmax(0,1fr))] gap-1">
                            {Array.from({ length: 28 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="aspect-square rounded-sm bg-slate-100 animate-pulse"
                                />
                            ))}
                        </div>
                    </div>
                </div>

                {/* Box 3 */}
                <div className="bg-white rounded-xl border border-slate-200 p-6 flex items-center">
                    <div className="w-12 h-12 rounded-lg bg-slate-100 animate-pulse mr-4 shrink-0" />
                    <div className="space-y-2">
                        <div className="h-4 w-[6rem] rounded bg-slate-100 animate-pulse" />
                        <div className="h-8 w-8 rounded bg-slate-200 animate-pulse" />
                    </div>
                </div>
                
            </div>
        </section>
    );
}