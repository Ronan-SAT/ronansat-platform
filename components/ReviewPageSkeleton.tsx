"use client";

export default function ReviewPageSkeleton() {
    return (
        <div className="min-h-screen bg-slate-50 flex">
            <aside className="w-72 bg-white border-r border-slate-200 h-[calc(100vh-64px)] sticky top-16 flex flex-col shrink-0">
                <div className="px-4 py-4 border-b border-slate-100 bg-white">
                    <div className="flex items-center gap-2 mb-4">
                        <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
                        <div className="h-5 w-32 rounded bg-slate-200 animate-pulse" />
                    </div>
                    <div className="h-10 rounded-xl bg-slate-100 animate-pulse" />
                </div>

                <div className="flex-1 overflow-y-auto px-2 py-2 space-y-2">
                    {Array.from({ length: 8 }).map((_, index) => (
                        <div
                            key={index}
                            className="p-3 rounded-xl border-2 border-slate-100 bg-slate-50"
                        >
                            <div className="h-4 w-4/5 rounded bg-slate-200 animate-pulse mb-2" />
                            <div className="h-3 w-1/2 rounded bg-slate-100 animate-pulse mb-3" />
                            <div className="h-6 w-14 rounded-md bg-slate-200 animate-pulse ml-auto" />
                        </div>
                    ))}
                </div>
            </aside>

            <main className="flex-1 p-8 overflow-y-auto">
                <div className="max-w-4xl mx-auto space-y-6">
                    <div className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6">
                        <div className="flex flex-col sm:flex-row sm:items-start sm:justify-between gap-3">
                            <div className="space-y-3 flex-1">
                                <div className="h-8 w-2/3 rounded bg-slate-200 animate-pulse" />
                                <div className="h-3 w-40 rounded bg-slate-100 animate-pulse" />
                            </div>
                            <div className="h-10 w-28 rounded-xl bg-slate-100 animate-pulse" />
                        </div>
                        <div className="flex flex-wrap gap-2 mt-4 pt-4 border-t border-slate-100">
                            {Array.from({ length: 3 }).map((_, index) => (
                                <div
                                    key={index}
                                    className="h-8 w-28 rounded-lg bg-slate-100 animate-pulse"
                                />
                            ))}
                        </div>
                    </div>

                    {Array.from({ length: 2 }).map((_, section) => (
                        <div
                            key={section}
                            className="bg-white rounded-2xl border border-slate-200 shadow-sm p-6 space-y-6"
                        >
                            <div className="flex items-center gap-2">
                                <div className="w-8 h-8 rounded-lg bg-slate-100 animate-pulse" />
                                <div className="h-5 w-44 rounded bg-slate-200 animate-pulse" />
                            </div>

                            {Array.from({ length: 2 }).map((_, moduleIndex) => (
                                <div key={moduleIndex}>
                                    <div className="flex items-center justify-between mb-3 gap-4">
                                        <div className="h-4 w-24 rounded bg-slate-200 animate-pulse" />
                                        <div className="h-4 w-48 rounded bg-slate-100 animate-pulse" />
                                    </div>
                                    <div className="h-px bg-slate-100 mb-3" />
                                    <div className="flex flex-wrap gap-2">
                                        {Array.from({ length: 12 }).map((_, cell) => (
                                            <div
                                                key={cell}
                                                className="w-10 h-10 rounded-xl bg-slate-100 animate-pulse"
                                            />
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>
                    ))}

                    <div className="flex items-center gap-4 px-1 pb-4">
                        {Array.from({ length: 4 }).map((_, index) => (
                            <div
                                key={index}
                                className="h-4 w-20 rounded bg-slate-100 animate-pulse"
                            />
                        ))}
                    </div>
                </div>
            </main>
        </div>
    );
}
