import { describe, expect, it } from "vitest";

import {
  DAILY_TURN_LIMIT,
  mergeSafetyFlags,
  redactionNotice,
  screenChildMessage,
  spendTurn,
} from "./guardrail";

describe("mergeSafetyFlags", () => {
  it("ธงที่ร้ายแรงกว่าชนะเสมอ ไม่ว่าจะมาจากฝั่งไหน", () => {
    expect(mergeSafetyFlags("none", "concerning")).toBe("concerning");
    expect(mergeSafetyFlags("concerning", "none")).toBe("concerning");
    expect(mergeSafetyFlags("off_topic", "personal_info")).toBe(
      "personal_info",
    );
    expect(mergeSafetyFlags("concerning", "personal_info")).toBe("concerning");
  });

  it("ธงเดียวกันคืนค่าเดิม", () => {
    expect(mergeSafetyFlags("none", "none")).toBe("none");
  });
});

describe("screenChildMessage", () => {
  it("ตัดเบอร์โทรออกจริง ไม่ใช่แค่ยกธง", () => {
    // ข้อความที่ส่งออกไปแล้วเอากลับไม่ได้ การ "ตัด" จึงต่างจากการ "เตือน"
    const result = screenChildMessage("call me 0812345678 ok");

    expect(result.text).not.toContain("0812345678");
    expect(result.found).toEqual(["phone"]);
  });

  it("แยกเลขประจำตัว 13 หลักออกจากเบอร์โทร", () => {
    expect(screenChildMessage("1234567890123").found).toEqual(["id"]);
    expect(screenChildMessage("081-234-5678").found).toEqual(["phone"]);
  });

  it("ตัดอีเมลและลิงก์", () => {
    expect(screenChildMessage("mail nong@example.com").found).toEqual([
      "email",
    ]);
    expect(screenChildMessage("see https://example.com/a").found).toEqual([
      "url",
    ]);
    expect(screenChildMessage("go www.example.com now").found).toEqual(["url"]);
  });

  it("เจอหลายอย่างพร้อมกันก็ตัดครบ", () => {
    const result = screenChildMessage("0812345678 and nong@example.com");

    expect(result.found.sort()).toEqual(["email", "phone"]);
    expect(result.text).not.toContain("0812345678");
    expect(result.text).not.toContain("nong@example.com");
  });

  it("ไม่แตะประโยคปกติของเด็ก", () => {
    // เตือนหรือตัดผิดบ่อย ๆ แล้วเด็กจะเลิกคุยไปเลย
    for (const text of [
      "I have two cats",
      "I am 7 years old",
      "my phone is red",
      "I count 1 2 3",
    ]) {
      expect(screenChildMessage(text), text).toEqual({ text, found: [] });
    }
  });

  it("ไม่ตัดชื่อ เพราะการแนะนำตัวคือบทเรียนแรกของเด็ก", () => {
    const text = "My name is Mali and I like cats";

    expect(screenChildMessage(text).found).toEqual([]);
    expect(screenChildMessage(text).text).toBe(text);
  });

  it("เรียกซ้ำได้ผลเดิมเสมอ (regex แบบ g ไม่จำตำแหน่งข้ามการเรียก)", () => {
    const text = "call 0812345678 or 0898765432";

    expect(screenChildMessage(text)).toEqual(screenChildMessage(text));
    expect(screenChildMessage(text).text).not.toMatch(/\d{9}/);
  });
});

describe("redactionNotice", () => {
  it("ไม่มีอะไรถูกตัดก็ไม่ต้องขึ้นข้อความ", () => {
    expect(redactionNotice([])).toBeNull();
  });

  it("บอกว่าตัดอะไรออก และไม่ดุเด็ก", () => {
    const notice = redactionNotice(["phone", "phone", "email"]);

    expect(notice).toContain("เบอร์โทร");
    expect(notice).toContain("อีเมล");
    // พูดถึงสิ่งที่ตัดครั้งเดียว ไม่ซ้ำ
    expect(notice?.match(/เบอร์โทร/g)?.length).toBe(1);
  });
});

describe("spendTurn", () => {
  const today = "2026-11-02";

  it("เริ่มนับใหม่เมื่อยังไม่เคยคุยวันนี้", () => {
    const result = spendTurn(undefined, today);

    expect(result.allowed).toBe(true);
    expect(result.budget).toEqual({ date: today, used: 1 });
    expect(result.remaining).toBe(DAILY_TURN_LIMIT - 1);
  });

  it("โควตาของเมื่อวานไม่ตามมาถึงวันนี้", () => {
    const yesterday = { date: "2026-11-01", used: DAILY_TURN_LIMIT };
    const result = spendTurn(yesterday, today);

    expect(result.allowed).toBe(true);
    expect(result.budget.used).toBe(1);
  });

  it("ครบโควตาแล้วไม่ให้คุยต่อ และไม่นับเพิ่ม", () => {
    const full = { date: today, used: 3 };
    const result = spendTurn(full, today, 3);

    expect(result.allowed).toBe(false);
    expect(result.remaining).toBe(0);
    expect(result.budget.used).toBe(3);
  });

  it("นับต่อเนื่องจนถึงเทิร์นสุดท้ายพอดี", () => {
    let budget = spendTurn(undefined, today, 3).budget;
    budget = spendTurn(budget, today, 3).budget;
    const last = spendTurn(budget, today, 3);

    expect(last.allowed).toBe(true);
    expect(last.remaining).toBe(0);
    expect(spendTurn(last.budget, today, 3).allowed).toBe(false);
  });
});
