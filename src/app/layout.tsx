import type { Metadata, Viewport } from "next";
import { Nunito, Noto_Sans_Thai } from "next/font/google";
import "./globals.css";

const nunito = Nunito({
  variable: "--font-nunito",
  subsets: ["latin"],
  display: "swap",
});

const notoSansThai = Noto_Sans_Thai({
  variable: "--font-noto-thai",
  subsets: ["thai"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "LinguaKids — ฝึกภาษาอังกฤษสำหรับเด็ก",
  description:
    "ฝึกคำศัพท์ ฟัง พูด และอ่านภาษาอังกฤษ สำหรับเด็กอนุบาลถึงประถม ด้วยเกมและเพื่อน AI",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  // ไม่ล็อกการซูม เพื่อให้เด็กสายตาไม่ดีหรือผู้ปกครองขยายอ่านได้
  maximumScale: 5,
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html
      lang="th"
      className={`${nunito.variable} ${notoSansThai.variable} h-full antialiased`}
    >
      <body className="bg-bg text-ink font-sans flex min-h-full flex-col">
        {children}
      </body>
    </html>
  );
}
