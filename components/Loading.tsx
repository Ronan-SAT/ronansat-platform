"use client";

import SimpleLoading from "@/components/SimpleLoading";

type LoadingProps = {
  showQuote?: boolean;
};

export default function Loading({ showQuote = false }: LoadingProps) {
  return <SimpleLoading showQuote={showQuote} />;
}
