import { NextRequest, NextResponse } from "next/server";
import {
  createInboxRow,
  detectKind,
  getNotionConfig,
  uploadFromUrlToNotion,
} from "@/lib/notion";
import { formatSaveSummary, parseKakaoMessage } from "@/lib/parse-kakao-message";
import {
  getThemeDatabaseLabel,
  parseThemeDatabaseMap,
  resolveDatabaseId,
} from "@/lib/theme-databases";
import {
  extractImage,
  extractText,
  getContext,
  isSkipWord,
  kakaoResponse,
  looksLikeUnsupportedFile,
  type KakaoPayload,
} from "@/lib/kakao";

export const runtime = "nodejs";

const PENDING_FILE_CONTEXT = "pending_file";

function reply(text: string, contexts?: Parameters<typeof kakaoResponse>[1]) {
  return NextResponse.json(kakaoResponse(text, contexts));
}

function isAllowedUser(userId?: string) {
  const allowed = process.env.KAKAO_ALLOWED_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!allowed?.length) return true;
  return Boolean(userId && allowed.includes(userId));
}

function webUploaderUrl(req: NextRequest) {
  return process.env.WEB_UPLOADER_URL?.trim() || new URL(req.url).origin;
}

function isUploadLinkCommand(text: string) {
  return /^(사진|이미지|pdf|파일|업로드)$/i.test(text.trim());
}

export async function GET() {
  return reply("카톡 → Notion webhook is ready.");
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as KakaoPayload;
    const userId = payload.userRequest?.user?.id;

    if (!isAllowedUser(userId)) {
      return reply("허용된 사용자만 저장할 수 있어요.");
    }

    const { token, databaseId: defaultDatabaseId } = getNotionConfig();
    const themeMap = parseThemeDatabaseMap();

    const image = extractImage(payload);
    const pending = getContext(payload, PENDING_FILE_CONTEXT);

    // 1) 사진을 받은 경우 → 즉시 Notion 업로드 후 "어디에 저장?" 되물음
    if (image?.url) {
      const uploaded = await uploadFromUrlToNotion(token, image.url, "카톡사진");

      return reply(
        "🖼️ 사진을 받았어요. 어디에 저장할까요?\n\n" +
          "· 한 줄 = 제목\n" +
          "· 여러 줄 = 테마 / 제목 / 내용\n" +
          "· 그냥 저장하려면 '그냥'",
        [
          {
            name: PENDING_FILE_CONTEXT,
            lifeSpan: 3,
            params: {
              fileUploadId: uploaded.fileUploadId,
              fileName: uploaded.fileName,
              contentType: uploaded.contentType,
            },
          },
        ]
      );
    }

    // 2) PDF·문서 등 (URL 없이 파일명만 오는 종류) → 웹 업로더 안내
    if (looksLikeUnsupportedFile(payload)) {
      return reply(
        "📄 PDF·문서 파일은 카톡 봇으로 저장이 안 돼요. (카카오가 파일 URL을 안 줍니다)\n" +
          `웹 업로더를 이용해 주세요.\n${webUploaderUrl(req)}`
      );
    }

    const text = extractText(payload);
    if (!text) {
      return reply("저장할 내용을 찾지 못했어요. 메시지를 다시 보내주세요.");
    }

    // 사진/PDF/파일 명령어 → 웹 업로더 링크 안내
    if (isUploadLinkCommand(text)) {
      return reply(
        "📎 사진·PDF 파일은 아래 웹 업로더에서 저장해 주세요.\n" +
          webUploaderUrl(req)
      );
    }

    // 3) 대기 중인 사진이 있으면 → 이 텍스트로 사진 메타 확정 후 저장
    if (pending?.params?.fileUploadId) {
      const fileUploadId = String(pending.params.fileUploadId);
      const fileName = String(pending.params.fileName ?? "카톡사진");
      const contentType = String(pending.params.contentType ?? "");
      const kind = detectKind(fileName, contentType);

      const parsed = isSkipWord(text)
        ? { theme: undefined, title: fileName, content: undefined }
        : parseKakaoMessage(text);

      const targetDatabaseId = resolveDatabaseId(parsed.theme, defaultDatabaseId);
      const usesDedicatedDb = Boolean(parsed.theme && themeMap[parsed.theme.trim()]);

      await createInboxRow({
        token,
        databaseId: targetDatabaseId,
        title: parsed.title,
        theme: usesDedicatedDb ? undefined : parsed.theme,
        memo: parsed.content,
        kind,
        source: "카톡",
        fileUploadId,
        fileName,
      });

      const inboxLabel = getThemeDatabaseLabel(parsed.theme);
      return reply(
        `✅ ${inboxLabel}에 사진을 저장했어요.\n${formatSaveSummary(parsed)}`,
        // 컨텍스트 제거
        [{ name: PENDING_FILE_CONTEXT, lifeSpan: 0, params: {} }]
      );
    }

    // 4) 일반 텍스트 저장
    const parsed = parseKakaoMessage(text);
    const targetDatabaseId = resolveDatabaseId(parsed.theme, defaultDatabaseId);
    const usesDedicatedDb = Boolean(parsed.theme && themeMap[parsed.theme.trim()]);

    await createInboxRow({
      token,
      databaseId: targetDatabaseId,
      title: parsed.title,
      theme: usesDedicatedDb ? undefined : parsed.theme,
      memo: parsed.content,
      kind: "텍스트",
      source: "카톡",
    });

    const inboxLabel = getThemeDatabaseLabel(parsed.theme);
    return reply(`✅ ${inboxLabel}에 저장했어요.\n${formatSaveSummary(parsed)}`);
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[kakao]", message);
    return reply("저장 중 오류가 났어요. Vercel 로그를 확인해 주세요.");
  }
}
