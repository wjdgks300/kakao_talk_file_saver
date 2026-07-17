export type KakaoContext = {
  name: string;
  lifeSpan?: number;
  params?: Record<string, unknown>;
};

export type KakaoMedia = {
  type?: string;
  url?: string;
};

export type KakaoPayload = {
  userRequest?: {
    utterance?: string;
    params?: {
      media?: KakaoMedia;
      surface?: string;
    };
    user?: {
      id?: string;
      properties?: Record<string, unknown>;
    };
  };
  action?: {
    params?: Record<string, unknown>;
    detailParams?: Record<string, { origin?: string; value?: unknown }>;
  };
  contexts?: KakaoContext[];
  bot?: {
    id?: string;
    name?: string;
  };
};

/** 카카오 스킬 응답 (선택적으로 컨텍스트 전달) */
export function kakaoResponse(text: string, contexts?: KakaoContext[]) {
  const body: Record<string, unknown> = {
    version: "2.0",
    template: {
      outputs: [{ simpleText: { text } }],
    },
  };

  if (contexts?.length) {
    body.context = { values: contexts };
  }

  return body;
}

export function getContext(payload: KakaoPayload, name: string) {
  return payload.contexts?.find((ctx) => ctx.name === name);
}

/** 사용자가 보낸 이미지 정보 (없으면 null) */
export function extractImage(payload: KakaoPayload): KakaoMedia | null {
  const media = payload.userRequest?.params?.media;
  if (media?.type === "image" && typeof media.url === "string" && media.url) {
    return media;
  }

  const utterance = payload.userRequest?.utterance ?? "";
  if (/^https?:\/\/\S+\.(jpe?g|png|gif|webp)(\?|$)/i.test(utterance)) {
    return { type: "image", url: utterance };
  }

  return null;
}

/** PDF/문서 등 URL 없이 파일명만 온 경우 감지 (휴리스틱) */
export function looksLikeUnsupportedFile(payload: KakaoPayload) {
  const utterance = payload.userRequest?.utterance ?? "";
  const hasImage = Boolean(extractImage(payload));
  if (hasImage) return false;
  return /\.(pdf|docx?|xlsx?|pptx?|hwp|zip|txt|csv)(\s|$)/i.test(utterance);
}

export function firstText(...values: Array<unknown>) {
  for (const value of values) {
    if (typeof value === "string" && value.trim()) {
      return value.trim();
    }
  }
  return "";
}

export function extractText(payload: KakaoPayload) {
  const utterance = payload.userRequest?.utterance;
  const params = Object.values(payload.action?.params ?? {});
  const detailParamTexts = Object.values(payload.action?.detailParams ?? {}).flatMap(
    (param) => [param.origin, param.value]
  );

  return firstText(utterance, ...params, ...detailParamTexts);
}

const SKIP_WORDS = ["그냥", "그냥저장", "패스", "스킵", "skip", "-", "없음"];

export function isSkipWord(text: string) {
  return SKIP_WORDS.includes(text.trim().toLowerCase());
}
