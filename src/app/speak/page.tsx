import type { Metadata } from "next";

import { SpeakSession } from "@/components/speak/speak-session";

export const metadata: Metadata = {
  title: "ซ้อมพูด — LinguaKids",
  description: "ออกเสียงคำที่เรียนแล้วให้ระบบฟัง พร้อมคำแนะนำการออกเสียง",
};

export default function SpeakPage() {
  return (
    <main className="px-4">
      <SpeakSession />
    </main>
  );
}
