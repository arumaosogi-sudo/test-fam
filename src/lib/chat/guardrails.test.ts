import { describe, expect, it } from "vitest";

import { redactionNotice, screenChildMessage } from "./guardrails";

describe("screenChildMessage", () => {
  it("ข้อความปกติผ่านไปครบ ไม่โดนแตะ", () => {
    const result = screenChildMessage("I have two cats and one dog.");

    expect(result.text).toBe("I have two cats and one dog.");
    expect(result.found).toEqual([]);
  });

  it("ตัดเบอร์โทรออกก่อนส่งออกนอกเครื่อง", () => {
    const result = screenChildMessage("My phone is 0812345678 ok?");

    expect(result.text).not.toContain("0812345678");
    expect(result.found).toContain("phone");
  });

  it("ตัดเบอร์ที่มีขีดคั่นออกด้วย", () => {
    const result = screenChildMessage("call 081-234-5678");

    expect(result.text).not.toContain("5678");
    expect(result.found).toContain("phone");
  });

  it("เลขยาวแบบเลขประจำตัวถูกแยกประเภทไว้ต่างหาก", () => {
    const result = screenChildMessage("1234567890123");

    expect(result.text).not.toContain("1234567890123");
    expect(result.found).toContain("id");
  });

  it("ตัดอีเมลและลิงก์ออก", () => {
    const result = screenChildMessage("mail me at kid@example.com or www.x.com");

    expect(result.text).not.toContain("kid@example.com");
    expect(result.text).not.toContain("www.x.com");
    expect(result.found).toContain("email");
    expect(result.found).toContain("url");
  });

  it("ไม่ตัดชื่อ เพราะการแนะนำตัวคือบทเรียน ไม่ใช่ความเสี่ยง", () => {
    const result = screenChildMessage("Hello! My name is Mali.");

    expect(result.text).toBe("Hello! My name is Mali.");
    expect(result.found).toEqual([]);
  });

  it("ไม่ตัดตัวเลขที่ใช้เรียนจริง เช่น อายุ จำนวน และปี", () => {
    for (const text of [
      "I am 7 years old.",
      "I have 3 cats and 12 books.",
      "I was born in 2019.",
      "My room is number 205.",
    ]) {
      const result = screenChildMessage(text);
      expect(result.text, text).toBe(text);
      expect(result.found, text).toEqual([]);
    }
  });

  it("เรียกซ้ำหลายครั้งได้ผลเหมือนเดิม", () => {
    // regex ที่มีแฟลก g จำตำแหน่งข้ามการเรียก ถ้าไม่รีเซ็ตจะตัดบ้างไม่ตัดบ้าง
    const text = "call 0812345678";

    for (let i = 0; i < 5; i += 1) {
      const result = screenChildMessage(text);
      expect(result.found, `รอบที่ ${i + 1}`).toContain("phone");
    }
  });
});

describe("redactionNotice", () => {
  it("ไม่มีอะไรถูกตัดก็ไม่ต้องเตือน", () => {
    expect(redactionNotice([])).toBeNull();
  });

  it("บอกว่าตัดอะไรไป และไม่ดุเด็ก", () => {
    const notice = redactionNotice(["phone"]);

    expect(notice).toContain("เบอร์โทร");
    expect(notice).not.toContain("ห้าม");
  });

  it("ตัดหลายอย่างซ้ำกันก็พูดถึงครั้งเดียว", () => {
    const notice = redactionNotice(["phone", "phone", "email"]) ?? "";

    expect(notice.match(/เบอร์โทร/g)).toHaveLength(1);
    expect(notice).toContain("อีเมล");
  });
});
