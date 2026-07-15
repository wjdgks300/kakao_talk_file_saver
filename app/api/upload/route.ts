import { NextRequest, NextResponse } from "next/server";
import {
  createInboxRow,
  detectKind,
  getNotionConfig,
  uploadFileToNotion,
} from "@/lib/notion";

export const runtime = "nodejs";

const MAX_BYTES = 20 * 1024 * 1024;

export async function POST(req: NextRequest) {
  try {
    const secret = process.env.UPLOAD_SECRET;
    if (secret) {
      const header = req.headers.get("x-upload-secret");
      if (header !== secret) {
        return NextResponse.json({ error: "권한이 없습니다." }, { status: 401 });
      }
    }

    const form = await req.formData();
    const title = String(form.get("title") ?? "").trim();
    const body = String(form.get("body") ?? "").trim();
    const memo = String(form.get("memo") ?? "").trim();
    const file = form.get("file");

    const hasFile = file instanceof File && file.size > 0;

    if (!title && !body && !hasFile) {
      return NextResponse.json(
        { error: "제목, 본문, 파일 중 하나는 필요합니다." },
        { status: 400 }
      );
    }

    if (hasFile && file.size > MAX_BYTES) {
      return NextResponse.json(
        { error: "파일은 20MB 이하여야 합니다. (Notion 제한)" },
        { status: 400 }
      );
    }

    const { token, databaseId } = getNotionConfig();

    let fileUploadId: string | undefined;
    let fileName: string | undefined;
    let kind = detectKind();

    if (hasFile) {
      fileName = file.name || "upload.bin";
      const contentType = file.type || "application/octet-stream";
      kind = detectKind(fileName, contentType);

      const buffer = Buffer.from(await file.arrayBuffer());
      fileUploadId = await uploadFileToNotion(token, {
        buffer,
        filename: fileName,
        contentType,
      });
    } else if (body) {
      kind = "텍스트";
    }

    const page = await createInboxRow({
      token,
      databaseId,
      title: title || fileName || body.slice(0, 40) || "웹업로드",
      body,
      memo,
      kind,
      fileUploadId,
      fileName,
    });

    return NextResponse.json({
      ok: true,
      id: page.id,
      url: page.url,
      kind,
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
