# 카톡 수신함 · 웹업로드 (Phase A)

파일을 올리거나 텍스트를 넣으면 Notion **카톡 수신함** DB에 저장됩니다.

## 시작하기

### 1. Notion Integration

1. https://www.notion.so/my-integrations → **New integration**
2. Secret 복사
3. [카톡 수신함 DB](https://app.notion.com/p/8f4ffc9fd7224bb78f7e3ac530fd526b) 열기
4. 右上 `···` → **Connections** → Integration 연결

### 2. 환경변수

```bash
copy .env.example .env.local
```

`.env.local` 에 `NOTION_TOKEN` 붙여넣기.  
`NOTION_DATABASE_ID` 는 이미 예시로 넣어 둠.

### 3. 실행

```bash
npm install
npm run dev
```

브라우저에서 http://localhost:3000

## 다음 (Phase B)

같은 DB에 카카오 채널 봇 webhook을 붙입니다.

### 카카오 스킬 URL

Vercel 배포 후 카카오 오픈빌더 스킬 URL에 아래를 넣습니다.

```text
https://YOUR_VERCEL_DOMAIN.vercel.app/api/kakao
```

스킬 응답은 서버가 카카오 말풍선 JSON으로 직접 반환합니다.

### 선택 보안

첫 저장 테스트가 성공하면 Notion row의 메모에 남는 카카오 사용자 ID를 확인하고,
Vercel 환경변수에 추가합니다.

```bash
KAKAO_ALLOWED_USER_IDS=사용자ID
```
