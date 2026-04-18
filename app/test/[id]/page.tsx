import { Suspense } from "react";
import Script from "next/script";

import TestEngine from "@/components/TestEngine";
import SimpleLoading from "@/components/SimpleLoading";

export default async function TestPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;

  return (
    <>
      <Script
        src="https://www.desmos.com/api/v1.9/calculator.js?apiKey=dcb31709b452b1cf9dc26972add0fda6"
        strategy="lazyOnload"
      />
      <div className="fixed right-4 top-4 z-[100]" />
      <Suspense fallback={<SimpleLoading />}>
        <TestEngine testId={id} />
      </Suspense>
    </>
  );
}
