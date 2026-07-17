import { handleUpload, type HandleUploadBody } from "@vercel/blob/client";
import { NextResponse } from "next/server";

export const runtime = "nodejs";

export async function POST(request: Request): Promise<NextResponse> {
  const body = (await request.json()) as HandleUploadBody;
  const token = process.env.BLOB_READ_WRITE_TOKEN;

  if (!token) {
    return NextResponse.json(
      {
        error:
          "BLOB_READ_WRITE_TOKEN이 없습니다. Vercel 대시보드에서 Blob store 토큰을 넣고 재배포하세요.",
      },
      { status: 500 }
    );
  }

  try {
    const jsonResponse = await handleUpload({
      body,
      request,
      // OIDC/BLOB_STORE_ID와 섞이지 않도록 토큰을 명시합니다.
      token,
      onBeforeGenerateToken: async () => {
        const secret = process.env.UPLOAD_SECRET;
        if (secret) {
          const header = request.headers.get("x-upload-secret") || "";
          if (header !== secret) throw new Error("권한이 없습니다.");
        }

        return {
          allowedContentTypes: [
            "image/jpeg",
            "image/jpg",
            "image/png",
            "image/webp",
            "image/gif",
            "image/heic",
            "image/heif",
            "image/bmp",
            "application/pdf",
            "application/octet-stream",
          ],
          maximumSizeInBytes: 25 * 1024 * 1024,
          addRandomSuffix: true,
          tokenPayload: "",
        };
      },
      onUploadCompleted: async () => {
        // Notion 저장은 /api/upload에서 처리
      },
    });

    return NextResponse.json(jsonResponse);
  } catch (err) {
    const message = err instanceof Error ? err.message : "업로드 토큰 생성 실패";
    console.error("[blob-upload]", message);
    return NextResponse.json({ error: message }, { status: 400 });
  }
}
