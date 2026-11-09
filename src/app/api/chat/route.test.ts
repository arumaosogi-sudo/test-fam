import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

/**
 * เทสของ route แชท — เน้นเส้นทางที่ "ต้องไม่เรียกโมเดล"
 *
 * เจอจากการทดสอบจริงว่าเด็กพิมพ์คำเหยียดลงไปแล้วไม่มีอะไรเกิดขึ้นเลย
 * Milo เปลี่ยนเรื่องเฉย ๆ ตอนนี้ด่านอยู่ฝั่งเรา จึงต้องพิสูจน์สองอย่าง
 * คือเด็กได้รับการตักเตือนแน่นอน และคำนั้นไม่ถูกส่งออกไปนอกเครื่อง
 */

const ORIGINAL_KEY = process.env.GEMINI_API_KEY;

function chatRequest(message: string, client = "test-client") {
  return new Request("http://localhost/api/chat", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": client,
    },
    body: JSON.stringify({
      history: [],
      message,
      cefr: "A1",
      topicId: "anything",
    }),
  });
}

beforeEach(() => {
  process.env.GEMINI_API_KEY = "test-key";
  // ถ้าด่านรั่ว เทสจะเห็นทันทีว่ามีการยิงออกนอกเครื่อง
  vi.stubGlobal("fetch", vi.fn());
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_KEY === undefined) delete process.env.GEMINI_API_KEY;
  else process.env.GEMINI_API_KEY = ORIGINAL_KEY;
});

describe("POST /api/chat — ด่านคำหยาบ", () => {
  it("เด็กพิมพ์คำเหยียด ต้องได้รับการตักเตือน ไม่ใช่ถูกเปลี่ยนเรื่องเฉย ๆ", async () => {
    const response = await POST(chatRequest("nigger"));
    const payload = await response.json();

    expect(response.status).toBe(200);
    expect(payload.turn.safetyFlag).toBe("unkind_word");
    expect(payload.notice).toMatch(/ไม่สุภาพ/);
    // ต้องมีทางไปต่อ ไม่ใช่ปิดบทสนทนาทิ้ง
    expect(payload.turn.suggestedReplies).toHaveLength(3);
  });

  it("คำหยาบต้องไม่ถูกส่งออกไปนอกเครื่องเลย", async () => {
    await POST(chatRequest("fuck you Milo"));

    expect(fetch).not.toHaveBeenCalled();
  });

  it("เทิร์นที่ถูกกันไว้ต้องไม่กินโควตาของเด็ก", async () => {
    const client = "quota-client";

    const blocked = await POST(chatRequest("shit", client));
    const first = await blocked.json();

    const blockedAgain = await POST(chatRequest("shit", client));
    const second = await blockedAgain.json();

    // ไม่ได้เรียกโมเดลจึงไม่ควรเสียเทิร์น ยอดคงเหลือต้องไม่ลด
    expect(second.remaining).toBe(first.remaining);
  });

  it("ข้อความปกติต้องผ่านด่านนี้ไปเรียกโมเดลตามเดิม", async () => {
    // ปล่อยให้ยิงจริงแล้วพัง ซึ่งพอพิสูจน์ได้ว่าด่านไม่ได้กันข้อความนี้ไว้
    await POST(chatRequest("do u know google?"));

    expect(fetch).toHaveBeenCalled();
  });
});
