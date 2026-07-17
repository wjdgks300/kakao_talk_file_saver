export type ParsedKakaoMessage = {
  theme?: string;
  title: string;
  content?: string;
};

/** 카톡 메시지 줄 단위 파싱
 * - 1줄: 제목만
 * - 2줄: 1줄=제목, 2줄~=본문
 * - 3줄+: 1줄=테마, 2줄=제목, 3줄~=본문
 */
export function parseKakaoMessage(raw: string): ParsedKakaoMessage {
  const lines = raw
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter(Boolean);

  if (lines.length === 0) {
    return { title: "제목 없음" };
  }

  if (lines.length === 1) {
    return { title: lines[0] };
  }

  if (lines.length === 2) {
    return {
      title: lines[0],
      content: lines[1],
    };
  }

  return {
    theme: lines[0],
    title: lines[1],
    content: lines.slice(2).join("\n"),
  };
}

export function formatSaveSummary(parsed: ParsedKakaoMessage) {
  if (parsed.theme) {
    return `[${parsed.theme}] ${parsed.title}`;
  }
  return parsed.title;
}
