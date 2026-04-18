"use client";

import { useState } from "react";

import PrettyLoading from "@/components/PrettyLoading";
import SimpleLoading from "@/components/SimpleLoading";
import { isInitialTabBootPending } from "@/lib/initialTabLoad";

type LoadingProps = {
  showQuote?: boolean;
};

export default function Loading({ showQuote = false }: LoadingProps) {
  const [shouldShowPrettyLoading] = useState(() => isInitialTabBootPending());

  if (shouldShowPrettyLoading) {
    return <PrettyLoading />;
  }

  return <SimpleLoading showQuote={showQuote} />;
}
