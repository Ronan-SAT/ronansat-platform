"use client";

export default function StudentCardSkeleton() {
    return (
        <div className="bg-white rounded-2xl border border-slate-200 shadow-sm overflow-hidden flex flex-col h-full">
            <div className="h-60 w-full bg-slate-100 animate-pulse border-b border-slate-100" />
            <div className="p-5 flex flex-col flex-1 text-center">
                <div className="h-6 w-2/3 rounded bg-slate-200 animate-pulse mx-auto mb-3" />
                <div className="h-4 w-3/4 rounded bg-slate-100 animate-pulse mx-auto mb-6" />
                <div className="mt-auto">
                    <div className="h-16 w-32 rounded-lg bg-slate-100 animate-pulse mx-auto" />
                    <div className="h-4 w-24 rounded bg-slate-100 animate-pulse mx-auto mt-4" />
                </div>
            </div>
        </div>
    );
}
