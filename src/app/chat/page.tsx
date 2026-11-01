import type { Metadata } from "next";

import { ChatRoom } from "@/components/chat/chat-room";

export const metadata: Metadata = {
  title: "คุยกับ Milo — LinguaKids",
  description: "ฝึกคุยภาษาอังกฤษกับเพื่อน AI ที่ตอบกลับทั้งข้อความและเสียง",
};

export default function ChatPage() {
  return (
    <main className="px-4">
      <ChatRoom />
    </main>
  );
}
