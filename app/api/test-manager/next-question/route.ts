import { NextResponse } from "next/server";

import { getServerSession } from "@/lib/auth/server";
import {
  getTestManagerCatalogErrorMessage,
  getTestManagerCatalogErrorStatus,
  testManagerCatalogService,
} from "@/lib/services/testManagerCatalogService";
import type { TestManagerCatalogSearchScope, TestManagerCatalogSortOption, TestManagerReviewFilter } from "@/types/testManager";

export async function GET(req: Request) {
  try {
    const session = await getServerSession();
    if (!session?.user?.id) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const url = new URL(req.url);
    const searchParams = url.searchParams;
    const currentQuestionId = searchParams.get("currentQuestionId") ?? "";
    if (!currentQuestionId) {
      return NextResponse.json({ error: "currentQuestionId is required." }, { status: 400 });
    }

    const nextQuestionId = await testManagerCatalogService.getNextQuestionId(
      {
        currentQuestionId,
        query: searchParams.get("query") ?? "",
        searchScope: (searchParams.get("searchScope") ?? "testTitle") as TestManagerCatalogSearchScope,
        sort: (searchParams.get("sort") ?? "test_asc") as TestManagerCatalogSortOption,
        reviewFilter: (searchParams.get("reviewFilter") ?? "all") as TestManagerReviewFilter,
        hideTier3: searchParams.get("hideTier3") === "1",
      },
      session,
    );

    return NextResponse.json({ nextQuestionId }, { status: 200 });
  } catch (error) {
    console.error("GET /api/test-manager/next-question error:", error);
    return NextResponse.json({ error: getTestManagerCatalogErrorMessage(error) }, { status: getTestManagerCatalogErrorStatus(error) });
  }
}
