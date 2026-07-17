import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      onBeforeGenerateToken: async () => {
        // 선택적으로 서버 업로드 API 보호를 재사용합니다.
        // (기본값: UPLOAD_SECRET 미설정이면 제한 없음)
        const secret = process.env.UPLOAD_SECRET;
        if (secret) {
          const header = request.headers.get("x-upload-secret") || "";
          if (header !== secret) throw new Error("권한이 없습니다.");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/bmp",
            "application/pdf",
          ],
          // Notion은 20MB 제한이라 서버에서 최종 검증하지만,
          // Blob 업로드 토큰은 약간 더 크게 열어 둡니다.
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: "",
        };
      },
      onUploadCompleted: async () => {
        // No-op:
        // Notion 저장은 클라이언트가 모든 blob 업로드를 마친 뒤
        // /api/upload 한 번 호출로 처리됩니다.
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "업로드 토큰 생성 실패";
    return NextResponse.json({ error: message }, { status: 400 });
  }
}

