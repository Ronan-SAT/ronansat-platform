"use client";

import { useEffect, useState } from "react";

import PrettyLoading from "@/components/PrettyLoading";
import SimpleLoading from "@/components/SimpleLoading";
import { isInitialTabBootPending } from "@/lib/initialTabLoad";

type LoadingProps = {
  showQuote?: boolean;
};

export default function Loading({ showQuote = false }: LoadingProps) {
  const [shouldShowPrettyLoading, setShouldShowPrettyLoading] = useState(true);

  useEffect(() => {
    setShouldShowPrettyLoading(isInitialTabBootPending());
  }, []);

  if (shouldShowPrettyLoading) {
    return <PrettyLoading />;
  }

  return <SimpleLoading showQuote={showQuote} />;
}
