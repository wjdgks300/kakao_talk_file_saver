/** 테마 이름 → Notion DB ID 매핑 (Vercel 환경변수) */
export function resolveDatabaseId(theme: string | undefined, defaultDatabaseId: string): string {
  if (!theme?.trim()) return defaultDatabaseId;

  const map = parseThemeDatabaseMap();
  const key = theme.trim();
  return map[key] ?? defaultDatabaseId;
}

export function parseThemeDatabaseMap(): Record<string, string> {
  const raw = process.env.NOTION_THEME_DATABASES;
  if (!raw?.trim()) return {};

  try {
    const parsed = JSON.parse(raw) as Record<string, string>;
    const normalized: Record<string, string> = {};

    for (const [theme, id] of Object.entries(parsed)) {
      if (typeof id === "string" && id.trim()) {
        normalized[theme.trim()] = id.replace(/-/g, "");
      }
    }

    return normalized;
  } catch {
    console.warn("[theme-databases] NOTION_THEME_DATABASES JSON 파싱 실패");
    return {};
  }
}

export function listConfiguredThemes() {
  return Object.keys(parseThemeDatabaseMap());
}

export function getThemeDatabaseLabel(theme: string | undefined, defaultLabel = "일반 수신함") {
  if (!theme?.trim()) return defaultLabel;
  const map = parseThemeDatabaseMap();
  if (map[theme.trim()]) return `${theme.trim()} 수신함`;
  return defaultLabel;
}
