import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { POST } from "./route";

/**
 * เทสของ route อ่านออกเสียง
 *
 * ด่านสำคัญคือโควตารายวัน ซึ่งทดสอบด้วยมือไม่ได้เพราะต้องยิงจริงเป็นร้อยครั้ง
 * และทุกครั้งเสียเงินจริงกับ ElevenLabs จึงต้องตัดปลายทางออกด้วย stub
 *
 * เทสนี้มีขึ้นเพราะตอนต่อเสียงครั้งแรก route นี้ไม่มีตัวกั้นอะไรเลย
 * ซึ่งพอเอาขึ้นออนไลน์ให้คนอื่นลอง ใครได้ลิงก์ก็เผาโควตาเจ้าของแอปได้
 */

const ORIGINAL_KEY = process.env.ELEVENLABS_API_KEY;

function speakRequest(client: string, text = "Hello Milo.") {
  return new Request("http://localhost/api/tts", {
    method: "POST",
    headers: {
      "content-type": "application/json",
      "x-forwarded-for": client,
    },
    body: JSON.stringify({ text }),
  });
}

beforeEach(() => {
  process.env.ELEVENLABS_API_KEY = "test-key";
  // ไม่ยิงออกนอกเครื่องจริง — คืนไฟล์เสียงปลอมที่หน้าตาถูกต้อง
  vi.stubGlobal(
    "fetch",
    vi.fn(async () => new Response(new Uint8Array([1, 2, 3]), { status: 200 })),
  );
});

afterEach(() => {
  vi.unstubAllGlobals();
  if (ORIGINAL_KEY === undefined) delete process.env.ELEVENLABS_API_KEY;
  else process.env.ELEVENLABS_API_KEY = ORIGINAL_KEY;
});

describe("POST /api/tts", () => {
  it("ข้อความปกติได้ไฟล์เสียงกลับมา", async () => {
    const response = await POST(speakRequest("ok-client"));

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("audio/mpeg");
  });

  it("ข้อความว่างหรือยาวเกิน 500 ตัวอักษรถูกปฏิเสธก่อนยิงออกนอกเครื่อง", async () => {
    const empty = await POST(speakRequest("len-client", ""));
    const long = await POST(speakRequest("len-client", "a".repeat(501)));

    expect(empty.status).toBe(400);
    expect(long.status).toBe(400);
    // ด่านนี้ต้องกันก่อนถึงปลายทาง ไม่งั้นก็จ่ายเงินไปแล้วถึงค่อยปฏิเสธ
    expect(fetch).not.toHaveBeenCalled();
  });

  it("ยังไม่ตั้งคีย์ก็ตอบ 503 ให้หน้าเว็บถอยไปใช้เสียงอื่น", async () => {
    delete process.env.ELEVENLABS_API_KEY;

    const response = await POST(speakRequest("nokey-client"));

    expect(response.status).toBe(503);
    expect(fetch).not.toHaveBeenCalled();
  });

  /**
   * ด่านที่ทำให้เอาขึ้นออนไลน์ได้
   *
   * ยิงจนเกินเพดานแล้วต้องโดนปฏิเสธ และที่สำคัญกว่าคือ **ต้องไม่ยิงต่อ
   * ไปที่ปลายทาง** เพราะปลายทางคิดเงินทุกครั้งที่เรียก
   */
  it("เกินโควตารายวันแล้วถูกปฏิเสธ และไม่ยิงต่อไปที่ปลายทาง", async () => {
    const client = "greedy-client";
    let lastStatus = 0;

    // เพดานคือ 120 ต่อเครื่องต่อวัน ยิงเกินไปหนึ่งครั้ง
    for (let i = 0; i < 121; i += 1) {
      lastStatus = (await POST(speakRequest(client))).status;
    }

    expect(lastStatus).toBe(429);
    expect(vi.mocked(fetch).mock.calls.length).toBe(120);
  });

  it("โควตาแยกกันคนละเครื่อง เครื่องหนึ่งหมดไม่กระทบอีกเครื่อง", async () => {
    for (let i = 0; i < 121; i += 1) {
      await POST(speakRequest("heavy-user"));
    }

    const other = await POST(speakRequest("fresh-user"));

    expect(other.status).toBe(200);
  });
});
