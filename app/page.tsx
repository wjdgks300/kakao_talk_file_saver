"use client";

import { FormEvent, useCallback, useEffect, useRef, useState } from "react";

type Status =
  | { type: "idle" }
  | { type: "loading" }
  | { type: "ok"; url: string; kind: string; inbox?: string }
  | { type: "err"; message: string };

export default function HomePage() {
  const [theme, setTheme] = useState("");
  const [title, setTitle] = useState("");
  const [body, setBody] = useState("");
  const [file, setFile] = useState<File | null>(null);
  const [dragOver, setDragOver] = useState(false);
  const [status, setStatus] = useState<Status>({ type: "idle" });
  const [themeOptions, setThemeOptions] = useState<string[]>([]);
  const inputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    fetch("/api/themes")
      .then((res) => res.json())
      .then((data) => setThemeOptions(Array.isArray(data.themes) ? data.themes : []))
      .catch(() => setThemeOptions([]));
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDragOver(false);
    const f = e.dataTransfer.files?.[0];
    if (f) setFile(f);
  }, []);

  async function onSubmit(e: FormEvent) {
    e.preventDefault();
    setStatus({ type: "loading" });

    const form = new FormData();
    form.set("theme", theme);
    form.set("title", title);
    form.set("body", body);
    if (file) form.set("file", file);

    try {
      const res = await fetch("/api/upload", { method: "POST", body: form });
      const data = await res.json();
      if (!res.ok) throw new Error(data.error || "업로드 실패");

      setStatus({ type: "ok", url: data.url, kind: data.kind, inbox: data.inbox });
      setTitle("");
      setBody("");
      setFile(null);
      if (inputRef.current) inputRef.current.value = "";
    } catch (err) {
      setStatus({
        type: "err",
        message: err instanceof Error ? err.message : "업로드 실패",
      });
    }
  }

  return (
    <main style={styles.main}>
      <header style={styles.header}>
        <p style={styles.eyebrow}>Phase A · 웹업로드</p>
        <h1 style={styles.h1}>카톡 수신함</h1>
        <p style={styles.sub}>
          파일이나 텍스트를 올리면 Notion DB에 쌓입니다. 나중에 카톡 봇이 같은 DB로
          연결됩니다.
        </p>
      </header>

      <form onSubmit={onSubmit} style={styles.card}>
        <label style={styles.label}>
          테마
          <input
            value={theme}
            onChange={(e) => setTheme(e.target.value)}
            placeholder="주식, 일본어… (비우면 일반 수신함)"
            list="theme-options"
            style={styles.input}
          />
          <datalist id="theme-options">
            {themeOptions.map((t) => (
              <option key={t} value={t} />
            ))}
          </datalist>
        </label>

        <label style={styles.label}>
          제목
          <input
            value={title}
            onChange={(e) => setTitle(e.target.value)}
            placeholder="비우면 파일명/본문 일부 사용"
            style={styles.input}
          />
        </label>

        <label style={styles.label}>
          본문 (텍스트)
          <textarea
            value={body}
            onChange={(e) => setBody(e.target.value)}
            placeholder="카톡에서 복사한 메시지"
            rows={4}
            style={{ ...styles.input, resize: "vertical" as const }}
          />
        </label>

        <div
          onDragOver={(e) => {
            e.preventDefault();
            setDragOver(true);
          }}
          onDragLeave={() => setDragOver(false)}
          onDrop={onDrop}
          onClick={() => inputRef.current?.click()}
          style={{
            ...styles.drop,
            borderColor: dragOver ? "#3d9cfd" : "#2c3848",
            background: dragOver ? "rgba(61,156,253,0.08)" : "rgba(0,0,0,0.2)",
          }}
        >
          <input
            ref={inputRef}
            type="file"
            accept="image/*,.pdf,application/pdf"
            hidden
            onChange={(e) => setFile(e.target.files?.[0] ?? null)}
          />
          {file ? (
            <>
              <strong>{file.name}</strong>
              <span style={styles.muted}>
                {(file.size / 1024).toFixed(1)} KB · 클릭해서 바꾸기
              </span>
            </>
          ) : (
            <>
              <strong>파일을 끌어다 놓거나 클릭</strong>
              <span style={styles.muted}>사진 / PDF · 최대 20MB</span>
            </>
          )}
        </div>

        <button
          type="submit"
          disabled={status.type === "loading"}
          style={{
            ...styles.btn,
            opacity: status.type === "loading" ? 0.7 : 1,
          }}
        >
          {status.type === "loading" ? "Notion으로 보내는 중…" : "Notion에 저장"}
        </button>

        {status.type === "ok" && (
          <p style={styles.ok}>
            {status.inbox ? `${status.inbox}에 저장됨` : "저장됨"} ({status.kind}) —{" "}
            <a href={status.url} target="_blank" rel="noreferrer" style={styles.link}>
              Notion에서 보기
            </a>
          </p>
        )}
        {status.type === "err" && <p style={styles.err}>{status.message}</p>}
      </form>

      <ol style={styles.steps}>
        <li>
          <a
            href="https://www.notion.so/my-integrations"
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
            Notion Integration
          </a>{" "}
          생성 → Secret 복사
        </li>
        <li>
          <a
            href="https://app.notion.com/p/8f4ffc9fd7224bb78f7e3ac530fd526b"
            target="_blank"
            rel="noreferrer"
            style={styles.link}
          >
            카톡 수신함 DB
          </a>{" "}
          → ··· → Connections 에 Integration 연결
        </li>
        <li>
          <code style={styles.code}>.env.local</code> 에 토큰 넣고{" "}
          <code style={styles.code}>npm run dev</code>
        </li>
      </ol>
    </main>
  );
}

const styles: Record<string, React.CSSProperties> = {
  main: {
    maxWidth: 520,
    margin: "0 auto",
    padding: "48px 20px 80px",
  },
  header: { marginBottom: 28 },
  eyebrow: {
    margin: 0,
    color: "#8b9bb0",
    fontSize: 13,
    letterSpacing: "0.06em",
    textTransform: "uppercase" as const,
  },
  h1: {
    margin: "8px 0 10px",
    fontSize: "clamp(1.8rem, 5vw, 2.4rem)",
    fontWeight: 700,
    letterSpacing: "-0.03em",
  },
  sub: {
    margin: 0,
    color: "#8b9bb0",
    lineHeight: 1.55,
    fontSize: 15,
  },
  card: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 16,
    padding: 22,
    background: "rgba(26,34,45,0.85)",
    border: "1px solid #2c3848",
    borderRadius: 14,
    backdropFilter: "blur(8px)",
  },
  label: {
    display: "flex",
    flexDirection: "column" as const,
    gap: 8,
    fontSize: 13,
    color: "#8b9bb0",
  },
  input: {
    width: "100%",
    padding: "12px 14px",
    borderRadius: 10,
    border: "1px solid #2c3848",
    background: "#0f1419",
    color: "#e8eef6",
    outline: "none",
  },
  drop: {
    display: "flex",
    flexDirection: "column" as const,
    alignItems: "center",
    justifyContent: "center",
    gap: 6,
    minHeight: 120,
    padding: 20,
    borderRadius: 12,
    border: "1.5px dashed #2c3848",
    cursor: "pointer",
    textAlign: "center" as const,
  },
  muted: { color: "#8b9bb0", fontSize: 13 },
  btn: {
    marginTop: 4,
    padding: "14px 16px",
    border: "none",
    borderRadius: 10,
    background: "linear-gradient(180deg, #3d9cfd 0%, #2563a8 100%)",
    color: "#fff",
    fontWeight: 600,
    cursor: "pointer",
  },
  ok: { margin: 0, color: "#3ecf8e", fontSize: 14 },
  err: { margin: 0, color: "#ff6b7a", fontSize: 14, whiteSpace: "pre-wrap" as const },
  link: { color: "#3d9cfd" },
  steps: {
    margin: "28px 0 0",
    paddingLeft: 20,
    color: "#8b9bb0",
    fontSize: 13,
    lineHeight: 1.7,
  },
  code: {
    fontFamily: "ui-monospace, SFMono-Regular, Menlo, monospace",
    fontSize: 12,
    background: "#1a222d",
    padding: "2px 6px",
    borderRadius: 4,
  },
};
