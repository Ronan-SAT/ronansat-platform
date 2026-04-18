"use client";

import { useState } from "react";

import PrettyLoading from "@/components/PrettyLoading";
import SimpleLoading from "@/components/SimpleLoading";
import { hasSeenInitialTabLoad, isInitialTabBootPending } from "@/lib/initialTabLoad";

export default function AppRouteLoading() {
  const [shouldShowPrettyLoader] = useState(
    () => !hasSeenInitialTabLoad() || isInitialTabBootPending(),
  );

  if (shouldShowPrettyLoader) {
    return <PrettyLoading />;
  }

  return <SimpleLoading showQuote={false} />;
}
