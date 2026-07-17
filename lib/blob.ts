import { del, get } from "@vercel/blob";

export type BlobAccess = "private" | "public";

export function getBlobAccess(): BlobAccess {
  const raw = (process.env.BLOB_ACCESS || process.env.NEXT_PUBLIC_BLOB_ACCESS || "private")
    .trim()
    .toLowerCase();
  return raw === "public" ? "public" : "private";
}

function blobToken() {
  const token = process.env.BLOB_READ_WRITE_TOKEN;
  if (!token) {
    throw new Error(
      "BLOB_READ_WRITE_TOKEN이 없습니다. Vercel 환경변수에 추가한 뒤 재배포하세요."
    );
  }
  return token;
}

/** Blob을 서버에서 읽어 Buffer로 반환 (private/public 모두 지원) */
export async function downloadBlob(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const access = getBlobAccess();
  const token = blobToken();

  if (access === "public") {
    const res = await fetch(url, {
      headers: { Authorization: `Bearer ${token}` },
    });
    if (!res.ok) {
      throw new Error(`Blob 다운로드 실패 (${res.status}). Store access가 public인지 확인하세요.`);
    }
    return {
      buffer: Buffer.from(await res.arrayBuffer()),
      contentType: res.headers.get("content-type") || "application/octet-stream",
    };
  }

  // private: OIDC/BLOB_STORE_ID 오동작 방지를 위해 token을 명시적으로 전달
  const result = await get(url, { access: "private", token });
  if (!result?.stream) {
    throw new Error("Blob 파일을 찾을 수 없습니다.");
  }

  const chunks: Buffer[] = [];
  const reader = result.stream.getReader();
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (value) chunks.push(Buffer.from(value));
  }

  return {
    buffer: Buffer.concat(chunks),
    contentType: result.blob.contentType || "application/octet-stream",
  };
}

/** Notion 전달 후 임시 Blob 삭제 */
export async function deleteBlob(url: string): Promise<void> {
  await del(url, { token: blobToken() });
}

/** @deprecated use downloadBlob */
export const downloadPrivateBlob = downloadBlob;
/** @deprecated use deleteBlob */
export const deletePrivateBlob = deleteBlob;
