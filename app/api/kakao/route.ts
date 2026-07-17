import { NextRequest, NextResponse } from "next/server";
import { createInboxRow, getNotionConfig } from "@/lib/notion";

export const runtime = "nodejs";

type KakaoPayload = {
  userRequest?: {
    utterance?: string;
    user?: {
      id?: string;
      properties?: Record<string, unknown>;
    };
  };
  action?: {
    params?: Record<string, unknown>;
    detailParams?: Record<string, { origin?: string; value?: unknown }>;
  };
  bot?: {
    id?: string;
    name?: string;
  };
};

function kakaoResponse(text: string) {
  return NextResponse.json({
    version: "2.0",
    template: {
      outputs: [
        {
          simpleText: {
            text,
          },
        },
      ],
    },
  });
}

function isAllowedUser(userId?: string) {
  const allowed = process.env.KAKAO_ALLOWED_USER_IDS?.split(",")
    .map((id) => id.trim())
    .filter(Boolean);

  if (!allowed?.length) return true;
  return Boolean(userId && allowed.includes(userId));
}

function firstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

function extractText(payload: KakaoPayload) {
  const utterance = payload.userRequest?.utterance;
  const params = Object.values(payload.action?.params ?? {});
  const detailParamTexts = Object.values(payload.action?.detailParams ?? {}).flatMap((param) => [
    param.origin,
    param.value,
  ]);

  return firstText(utterance, ...params, ...detailParamTexts);
}

export async function GET() {
  return kakaoResponse("카톡 → Notion webhook is ready.");
}

export async function POST(req: NextRequest) {
  try {
    const payload = (await req.json()) as KakaoPayload;
    const userId = payload.userRequest?.user?.id;

    if (!isAllowedUser(userId)) {
      return kakaoResponse("허용된 사용자만 저장할 수 있어요.");
    }

    const text = extractText(payload);
    if (!text) {
      return kakaoResponse("저장할 텍스트를 찾지 못했어요. 메시지를 다시 보내주세요.");
    }

    const { token, databaseId } = getNotionConfig();
    const title = text.slice(0, 40);

    await createInboxRow({
      token,
      databaseId,
      title,
      body: text,
      memo: userId ? `카카오 사용자 ID: ${userId}` : "카카오 스킬 요청",
      kind: "텍스트",
      source: "카톡",
    });

    return kakaoResponse("✅ Notion에 저장했어요.");
  } catch (err) {
    const message = err instanceof Error ? err.message : "알 수 없는 오류";
    console.error("[kakao]", message);
    return kakaoResponse("저장 중 오류가 났어요. Vercel 로그를 확인해 주세요.");
  }
}
