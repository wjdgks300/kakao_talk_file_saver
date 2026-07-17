import { del, put } from "@vercel/blob";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

/** Blob 토큰/store가 실제로 동작하는지 확인 */
export async function GET() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  const storeId = process.env.BLOB_STORE_ID ?? null;
  const access = (process.env.BLOB_ACCESS || "private").toLowerCase();

  if (!token) {
    return NextResponse.json(
      {
        ok: false,
        error: "BLOB_READ_WRITE_TOKEN 없음",
        storeId,
        access,
      },
      { status: 500 }
    );
  }

  try {
    const blob = await put(
      `health-check/${Date.now()}.txt`,
      "blob-health-ok",
      {
        access: access === "public" ? "public" : "private",
        token,
        addRandomSuffix: true,
      }
    );

    await del(blob.url, { token });

    return NextResponse.json({
      ok: true,
      message: "Blob store 연결 정상",
      storeId,
      access,
      tokenPrefix: `${token.slice(0, 24)}...`,
      sampleUrlHost: new URL(blob.url).host,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : String(err);
    return NextResponse.json(
      {
        ok: false,
        error: message,
        storeId,
        access,
        tokenPrefix: `${token.slice(0, 24)}...`,
        hint:
          "Storage → 이 Blob store → .env.local 탭에서 토큰을 다시 복사해 Environment Variables에 넣고 Redeploy 하세요. BLOB_STORE_ID는 삭제해보세요.",
      },
      { status: 500 }
    );
  }
}
