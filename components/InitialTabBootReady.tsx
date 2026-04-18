"use client";

import { useEffect } from "react";

import { clearInitialTabBootPending } from "@/lib/initialTabLoad";

export default function InitialTabBootReady() {
  useEffect(() => {
    clearInitialTabBootPending();
  }, []);

  return null;
}
