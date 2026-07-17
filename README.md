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

### 카톡 메시지 형식

줄바꿈으로 구분해서 보내면 Notion에 나뉘어 저장됩니다.

**2줄 (제목 + 내용)**

```text
오늘의 시장 평가
오늘은 주식이 많이 올랐다
```

- 이름 = 1줄
- 메모 = 2줄~

**3줄 이상 (테마 + 제목 + 내용)**

```text
주식
오늘의 시장 평가
오늘은 주식이 많이 올랐다. 이상한 날이었다
```

- 테마 = 1줄
- 이름 = 2줄
- 메모 = 3줄~

### 테마별 DB

1줄 테마 이름에 맞는 DB가 있으면 **그 DB로 저장**됩니다.

| 테마 (1줄) | DB |
|------------|-----|
| 주식 | [주식 수신함](https://app.notion.com/p/aea7efcd5a7f491784f4a3afec133edf) |
| 일본어 | [일본어 수신함](https://app.notion.com/p/62efed56bd46467592d2084aae894ef9) |
| (그 외 / 2줄만) | [카톡 수신함](https://app.notion.com/p/8f4ffc9fd7224bb78f7e3ac530fd526b) |

Vercel 환경변수 `NOTION_THEME_DATABASES`에 JSON으로 매핑합니다.
새 테마 DB를 Notion에 만들고 Integration 연결 후, JSON에 키를 추가하면 됩니다.

```bash
NOTION_THEME_DATABASES={"주식":"aea7efcd5a7f491784f4a3afec133edf","일본어":"62efed56bd46467592d2084aae894ef9"}
```

### 파일 업로더 열기

카톡 봇에 아래 중 하나만 입력하면 웹 업로더 주소를 답합니다.

```text
사진
pdf
파일
업로드
```

별도 주소를 사용하려면 Vercel 환경변수에 설정합니다. 비우면 현재 Vercel
프로젝트의 루트 주소를 자동 사용합니다.

```bash
WEB_UPLOADER_URL=https://YOUR_VERCEL_DOMAIN.vercel.app
```

### Vercel Blob 설정
웹 업로더는 파일을 `Vercel Function(/api/upload)`으로 그대로 보내지 않고, 먼저 **Vercel Blob**에 직접 업로드한 뒤에(브라우저 → Blob) 서버에는 `blob url`만 보내요.

그래서 업로드 요청 용량 제한(4.5MB)을 피하면서, Notion 제한(파일당 20MB)은 서버에서 그대로 적용됩니다.

1. Vercel 대시보드 → Storage → **Create Database(Blob)**
2. Blob store를 이 프로젝트에 연결하면 `BLOB_STORE_ID`, `VERCEL_OIDC_TOKEN` 등이 자동 주입됩니다.
3. 업로드 라우트는 `/api/blob-upload` 를 사용합니다.

### 선택 보안

Vercel 환경변수에 카카오 사용자 ID를 넣으면 본인만 저장 가능합니다.

```bash
KAKAO_ALLOWED_USER_IDS=4e2955a387e24418cdc63eccb19f704f74ab6707e129f8a29d3cc27ab1340e0502
```
