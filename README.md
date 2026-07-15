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
