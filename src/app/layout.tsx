import type { Metadata, Viewport } from "next";
import "./globals.css";

/**
 * 폰트: Pretendard Variable (토스 Product Sans 는 비공개 폰트 →
 * 자소 폭·자간이 가장 가까운 오픈 대체 폰트를 쓴다)
 * dynamic-subset 이라 한글도 실제 쓰는 글자만 내려온다.
 * React 19 stylesheet hoisting 을 쓰므로 precedence 지정.
 */
const PRETENDARD =
  "https://cdn.jsdelivr.net/gh/orioncactus/pretendard@v1.3.9/dist/web/variable/pretendardvariable-dynamic-subset.min.css";

export const metadata: Metadata = {
  title: "세정학원 LMS",
  description: "세정학원 선생님 LMS — 선생님마다 자기 브랜드 공간을 갖는 학습 관리 시스템",
};

export const viewport: Viewport = {
  themeColor: "#ffffff",
  width: "device-width",
  initialScale: 1,
  // maximumScale 은 일부러 안 잠근다 — 저시력 사용자의 확대를 막게 된다.
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="ko" className="h-full antialiased">
      <head>
        <link rel="preconnect" href="https://cdn.jsdelivr.net" crossOrigin="" />
        <link rel="stylesheet" href={PRETENDARD} precedence="default" />
      </head>
      <body className="min-h-full flex flex-col bg-grey-50 text-grey-900">
        {children}
      </body>
    </html>
  );
}
