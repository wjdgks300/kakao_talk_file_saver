import { NextRequest, NextResponse } from "next/server";
import {
  createInboxRow,
  detectKind,
  getNotionConfig,
  uploadFromUrlToNotion,
} from "@/lib/notion";
import {
  getThemeDatabaseLabel,
  parseThemeDatabaseMap,
  resolveDatabaseId,
} from "@/lib/theme-databases";

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

    const input = (await req.json()) as {
      theme?: unknown;
      title?: unknown;
      body?: unknown;
      files?: Array<{
        url?: unknown;
        filename?: unknown;
        contentType?: unknown;
        size?: unknown;
      }>;
    };

    const title = String(input.title ?? "").trim();
    const body = String(input.body ?? "").trim();
    const theme = String(input.theme ?? "").trim();
    const files = Array.isArray(input.files)
      ? input.files.filter((f): f is NonNullable<typeof f> => Boolean(f && typeof f.url === "string"))
      : [];

    const hasFile = files.length > 0;

    if (!title && !body && !hasFile) {
      return NextResponse.json(
        { error: "제목, 본문, 파일 중 하나는 필요합니다." },
        { status: 400 }
      );
    }

    const tooLarge = files.find((f) => typeof f.size === "number" && f.size > MAX_BYTES);
    if (tooLarge && typeof tooLarge.size === "number") {
      return NextResponse.json(
        { error: "파일은 20MB 이하여야 합니다. (Notion 제한) — 파일당 제한" },
        { status: 400 }
      );
    }

    const { token, databaseId: defaultDatabaseId } = getNotionConfig();
    const themeMap = parseThemeDatabaseMap();
    const targetDatabaseId = resolveDatabaseId(theme, defaultDatabaseId);
    const usesDedicatedDb = Boolean(theme && themeMap[theme.trim()]);

    // 파일이 있으면 파일별로 row를 여러 개 생성
    if (hasFile) {
      const items: Array<{ url: string; kind: string; inbox?: string }> = [];

      for (const f of files) {
        const blobUrl = String(f.url);
        const fileName = String(f.filename ?? "upload.bin");
        // 업로드는 Blob에서 되어 있고, Notion으로 옮길 때 다운로드하면서 content-type도 확보합니다.
        const uploaded = await uploadFromUrlToNotion(token, blobUrl, fileName);
        const kind = detectKind(uploaded.fileName, uploaded.contentType);

        const page = await createInboxRow({
          token,
          databaseId: targetDatabaseId,
          title: title || uploaded.fileName || body.slice(0, 40) || "웹업로드",
          theme: usesDedicatedDb ? undefined : theme || undefined,
          body,
          kind,
          source: "웹업로드",
          fileUploadId: uploaded.fileUploadId,
          fileName: uploaded.fileName,
        });

        items.push({
          url: page.url,
          kind,
          inbox: getThemeDatabaseLabel(theme),
        });
      }

      return NextResponse.json({ ok: true, items });
    }

    // 파일이 없고 텍스트만 있는 경우: 기존처럼 1개 row 생성
    const page = await createInboxRow({
      token,
      databaseId: targetDatabaseId,
      title: title || body.slice(0, 40) || "웹업로드",
      theme: usesDedicatedDb ? undefined : theme || undefined,
      body,
      kind: "텍스트",
      source: "웹업로드",
    });

    return NextResponse.json({
      ok: true,
      items: [
        {
          url: page.url,
          kind: "텍스트",
          inbox: getThemeDatabaseLabel(theme),
        },
      ],
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[upload]", message);
    return NextResponse.json({ error: message }, { status: 500 });
  }
}
