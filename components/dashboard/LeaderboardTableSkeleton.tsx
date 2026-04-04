"use client";

export default function LeaderboardTableSkeleton() {
    return (
        <section className="mb-12">
            <div className="flex items-center gap-2 mb-4">
                <div className="w-9 h-9 rounded-lg bg-slate-100 animate-pulse" />
                <div className="h-7 w-96 max-w-full rounded-md bg-slate-200 animate-pulse" />
            </div>

            <div className="bg-white rounded-xl border border-slate-200 overflow-hidden shadow-sm">
                <div className="px-6 py-4 border-b border-slate-200 bg-slate-50">
                    <div className="grid grid-cols-[96px_1fr_160px_160px] gap-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-4 rounded bg-slate-200 animate-pulse"
                            />
                        ))}
                    </div>
                </div>
                <div className="divide-y divide-slate-100">
                    {Array.from({ length: 5 }).map((_, row) => (
                        <div
                            key={row}
                            className="px-6 py-4 grid grid-cols-[96px_1fr_160px_160px] gap-4 items-center"
                        >
                            <div className="h-5 w-12 rounded bg-slate-100 animate-pulse" />
                            <div className="h-5 w-40 rounded bg-slate-100 animate-pulse" />
                            <div className="h-5 w-20 rounded bg-slate-100 animate-pulse justify-self-center" />
                            <div className="h-5 w-20 rounded bg-slate-100 animate-pulse justify-self-center" />
                        </div>
                    ))}
                </div>
            </div>
        </section>
    );
}
