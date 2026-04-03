import { NextResponse } from "next/server";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function GET() {
  return NextResponse.json(
    {
      error: "Server-side PDF export has been disabled.",
      message: "Use the client-side print flow from the Download PDF button instead.",
    },
    { status: 410 }
  );
}
