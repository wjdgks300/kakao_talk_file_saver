import { NextResponse } from "next/server";
import { listConfiguredThemes } from "@/lib/theme-databases";

export const runtime = "nodejs";

export async function GET() {
  return NextResponse.json({ themes: listConfiguredThemes() });
}
