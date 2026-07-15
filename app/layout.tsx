import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "카톡 수신함 · 웹업로드",
  description: "파일·텍스트를 Notion 카톡 수신함에 저장",
};

export default function RootLayout({ children }: { children: React.ReactNode }) {
  return (
    <html lang="ko">
      <body>{children}</body>
    </html>
  );
}
