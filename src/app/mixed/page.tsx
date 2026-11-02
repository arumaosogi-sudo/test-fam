import type { Metadata } from "next";

import { MixedSession } from "@/components/mixed/mixed-session";

export const metadata: Metadata = {
  title: "รวมทุกหัวข้อ — LinguaKids",
  description: "ทบทวนคำจากทุกบทที่เคยเรียน สลับปนกันทั้งชุด",
};

export default function MixedPage() {
  return (
    <main className="px-4">
      <MixedSession />
    </main>
  );
}
