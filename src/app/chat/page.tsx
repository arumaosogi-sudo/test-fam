import type { Metadata } from "next";

import { ChatRoom } from "@/components/chat/chat-room";

export const metadata: Metadata = {
  title: "คุยกับ Milo",
  description: "ฝึกคุยภาษาอังกฤษกับเพื่อน AI ที่ปรับระดับคำตามเด็กแต่ละคน",
};

export default function ChatPage() {
  return <ChatRoom />;
}
