function notionVersion() {
  return process.env.NOTION_VERSION || "2026-03-11";
}

export function getNotionConfig() {
  const token = process.env.NOTION_TOKEN;
  const databaseId = process.env.NOTION_DATABASE_ID;

  if (!token) throw new Error("NOTION_TOKEN 이 .env.local 에 없습니다.");
  if (!databaseId) throw new Error("NOTION_DATABASE_ID 가 .env.local 에 없습니다.");

  return { token, databaseId: databaseId.replace(/-/g, "") };
}

function notionHeaders(token: string, contentType?: string): HeadersInit {
  const headers: Record<string, string> = {
    Authorization: `Bearer ${token}`,
    "Notion-Version": notionVersion(),
  };
  if (contentType) headers["Content-Type"] = contentType;
  return headers;
}

export type SaveKind = "텍스트" | "사진" | "PDF" | "기타";

export function detectKind(filename?: string, mime?: string): SaveKind {
  const lower = (filename ?? "").toLowerCase();
  const type = (mime ?? "").toLowerCase();

  if (type.startsWith("image/") || /\.(png|jpe?g|gif|webp|heic|bmp)$/.test(lower)) {
    return "사진";
  }
  if (type === "application/pdf" || lower.endsWith(".pdf")) {
    return "PDF";
  }
  if (!filename && !mime) return "텍스트";
  return "기타";
}

/** Step 1+2: Notion에 파일 바이너리 업로드 후 file_upload id 반환 */
export async function uploadFileToNotion(
  token: string,
  file: { buffer: Buffer; filename: string; contentType: string }
): Promise<string> {
  const createRes = await fetch("https://api.notion.com/v1/file_uploads", {
    method: "POST",
    headers: notionHeaders(token, "application/json"),
    body: JSON.stringify({
      filename: file.filename,
      content_type: file.contentType || "application/octet-stream",
    }),
  });

  if (!createRes.ok) {
    const body = await createRes.text();
    throw new Error(`Notion file_uploads 생성 실패 (${createRes.status}): ${body}`);
  }

  const created = (await createRes.json()) as { id: string; upload_url: string };
  const form = new FormData();
  form.append(
    "file",
    new Blob([new Uint8Array(file.buffer)], {
      type: file.contentType || "application/octet-stream",
    }),
    file.filename
  );

  const sendRes = await fetch(created.upload_url, {
    method: "POST",
    headers: {
      Authorization: `Bearer ${token}`,
      "Notion-Version": notionVersion(),
    },
    body: form,
  });

  if (!sendRes.ok) {
    const body = await sendRes.text();
    throw new Error(`Notion 파일 전송 실패 (${sendRes.status}): ${body}`);
  }

  return created.id;
}

/** 임시 URL(카카오 등)에서 파일을 받아 Notion에 업로드 후 file_upload id 반환 */
export async function uploadFromUrlToNotion(
  token: string,
  url: string,
  fallbackName = "file"
): Promise<{ fileUploadId: string; fileName: string; contentType: string }> {
  const res = await fetch(url);
  if (!res.ok) {
    throw new Error(`파일 다운로드 실패 (${res.status})`);
  }

  const contentType = res.headers.get("content-type") || "application/octet-stream";
  const buffer = Buffer.from(await res.arrayBuffer());

  let fileName = fallbackName;
  try {
    const pathname = new URL(url).pathname;
    const base = pathname.split("/").pop();
    if (base) fileName = decodeURIComponent(base);
  } catch {
    // keep fallback
  }
  if (!/\.[a-z0-9]+$/i.test(fileName)) {
    const ext = contentType.includes("png")
      ? ".png"
      : contentType.includes("gif")
        ? ".gif"
        : contentType.includes("webp")
          ? ".webp"
          : ".jpg";
    fileName = `${fileName}${ext}`;
  }

  const fileUploadId = await uploadFileToNotion(token, {
    buffer,
    filename: fileName,
    contentType,
  });

  return { fileUploadId, fileName, contentType };
}

export async function createInboxRow(opts: {
  token: string;
  databaseId: string;
  title: string;
  theme?: string;
  body?: string;
  memo?: string;
  kind: SaveKind;
  source?: "웹업로드" | "카톡" | "메일" | "수동";
  fileUploadId?: string;
  fileName?: string;
}) {
  const properties: Record<string, unknown> = {
    이름: {
      title: [{ text: { content: opts.title.slice(0, 2000) || "제목 없음" } }],
    },
    종류: { select: { name: opts.kind } },
    출처: { select: { name: opts.source ?? "웹업로드" } },
  };

  if (opts.theme?.trim()) {
    properties["테마"] = {
      rich_text: [{ text: { content: opts.theme.slice(0, 2000) } }],
    };
  }

  if (opts.body?.trim()) {
    properties["본문"] = {
      rich_text: [{ text: { content: opts.body.slice(0, 2000) } }],
    };
  }

  if (opts.memo?.trim()) {
    properties["메모"] = {
      rich_text: [{ text: { content: opts.memo.slice(0, 2000) } }],
    };
  }

  if (opts.fileUploadId) {
    properties["파일"] = {
      files: [
        {
          type: "file_upload",
          file_upload: { id: opts.fileUploadId },
          name: opts.fileName || "file",
        },
      ],
    };
  }

  const res = await fetch("https://api.notion.com/v1/pages", {
    method: "POST",
    headers: notionHeaders(opts.token, "application/json"),
    body: JSON.stringify({
      parent: { database_id: opts.databaseId },
      properties,
    }),
  });

  if (!res.ok) {
    const body = await res.text();
    throw new Error(`Notion 페이지 생성 실패 (${res.status}): ${body}`);
  }

  return res.json() as Promise<{ id: string; url: string }>;
}
