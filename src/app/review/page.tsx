import type { Metadata } from "next";

import { ReviewSession } from "@/components/review/review-session";

export const metadata: Metadata = {
  title: "ทบทวนวันนี้ — LinguaKids",
  description: "ทบทวนคำที่กำลังจะลืม ตามตารางที่ระบบคำนวณให้",
};

export default function ReviewPage() {
  return (
    <main className="px-4">
      <ReviewSession />
    </main>
  );
}
