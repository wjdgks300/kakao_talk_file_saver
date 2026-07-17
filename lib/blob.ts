import { del, get } from "@vercel/blob";

/** private Blob을 서버에서 읽어 Buffer로 반환 */
export async function downloadPrivateBlob(url: string): Promise<{
  buffer: Buffer;
  contentType: string;
}> {
  const result = await get(url, { access: "private" });
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
export async function deletePrivateBlob(url: string): Promise<void> {
  await del(url);
}
