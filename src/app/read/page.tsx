import type { Metadata } from "next";

import { ReadSession } from "@/components/read/read-session";

export const metadata: Metadata = {
  title: "อ่านออกเสียง — LinguaKids",
  description: "อ่านเรื่องสั้นให้ระบบฟัง ดูความแม่น ความเร็ว และตอบคำถามท้ายเรื่อง",
};

export default function ReadPage() {
  return (
    <main className="px-4">
      <ReadSession />
    </main>
  );
}
