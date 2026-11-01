import { describe, expect, it } from "vitest";

import { extractJsonObject, parseBuddyReply } from "./parse";

const full = {
  reply: "I like cats too! Do you have a cat?",
  reply_th: "ฉันก็ชอบแมวเหมือนกัน หนูมีแมวไหม",
  objective_met: true,
  words_used: ["cat"],
  errors: [{ type: "plural_s", child_said: "two cat", correct: "two cats" }],
  safety_flag: "none",
  suggested_followups: ["Yes, I do.", "No, I don't."],
};

describe("extractJsonObject", () => {
  it("อ่าน JSON ล้วนได้", () => {
    expect(extractJsonObject('{"a":1}')).toBe('{"a":1}');
  });

  it("แกะออกจาก markdown fence ได้", () => {
    expect(extractJsonObject('```json\n{"a":1}\n```')).toBe('{"a":1}');
    expect(extractJsonObject('```\n{"a":1}\n```')).toBe('{"a":1}');
  });

  it("ตัดข้อความที่โมเดลพิมพ์นำหน้าหรือตามหลังทิ้ง", () => {
    expect(extractJsonObject('Sure! {"a":1} Hope that helps.')).toBe('{"a":1}');
  });

  it("ไม่มีวงเล็บปีกกาเลยคืน null", () => {
    expect(extractJsonObject("I cannot help with that.")).toBeNull();
  });
});

describe("parseBuddyReply", () => {
  it("อ่านคำตอบที่ครบทุกช่องได้ถูกต้อง", () => {
    const result = parseBuddyReply(JSON.stringify(full));

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.reply.reply).toBe("I like cats too! Do you have a cat?");
    expect(result.reply.replyTh).toContain("ฉันก็ชอบแมว");
    expect(result.reply.objectiveMet).toBe(true);
    expect(result.reply.wordsUsed).toEqual(["cat"]);
    expect(result.reply.errors).toEqual([
      { type: "plural_s", childSaid: "two cat", correct: "two cats" },
    ]);
    expect(result.reply.safetyFlag).toBe("none");
    expect(result.reply.suggestedFollowups).toHaveLength(2);
  });

  it("ขาดช่องที่ไม่จำเป็นก็ยังใช้ได้ ขอแค่มีข้อความตอบ", () => {
    const result = parseBuddyReply('{"reply":"Hello!"}');

    expect(result.ok).toBe(true);
    if (!result.ok) return;

    expect(result.reply.reply).toBe("Hello!");
    expect(result.reply.safetyFlag).toBe("none");
    expect(result.reply.errors).toEqual([]);
    expect(result.reply.suggestedFollowups).toEqual([]);
  });

  it("safety_flag เป็น null ถือว่าไม่มีธง", () => {
    const result = parseBuddyReply('{"reply":"Hi","safety_flag":null}');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reply.safetyFlag).toBe("none");
  });

  it("รับธงความปลอดภัยที่ต้องแจ้งผู้ใหญ่ได้", () => {
    const result = parseBuddyReply('{"reply":"Hi","safety_flag":"concerning"}');

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reply.safetyFlag).toBe("concerning");
  });

  it("ทิ้งรายการข้อผิดพลาดที่ไม่ได้บอกว่าผิดตรงไหน", () => {
    const result = parseBuddyReply(
      '{"reply":"Hi","errors":[{"type":"x"},{"type":"y","child_said":"a","correct":"b"}]}',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    // รายการที่ไม่มีทั้งคำผิดและคำถูก เอาไปสอนต่อไม่ได้ จึงไม่ควรโผล่บนจอ
    expect(result.reply.errors).toHaveLength(1);
    expect(result.reply.errors[0].correct).toBe("b");
  });

  it("ตัดตัวช่วยให้เหลือ 3 ตัวเลือก ถึงโมเดลจะส่งมาเกิน", () => {
    const result = parseBuddyReply(
      '{"reply":"Hi","suggested_followups":["a","b","c","d","e"]}',
    );

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    expect(result.reply.suggestedFollowups).toEqual(["a", "b", "c"]);
  });

  it("แกะคำตอบที่ห่อ markdown fence ได้ เพราะโมเดลชอบห่อ", () => {
    const result = parseBuddyReply(
      "```json\n" + JSON.stringify(full) + "\n```",
    );

    expect(result.ok).toBe(true);
  });

  it("ไม่โยน error เมื่อคำตอบผิดรูป แต่บอกว่าผิดเพราะอะไร", () => {
    expect(parseBuddyReply("ขอโทษครับ ช่วยไม่ได้")).toEqual({
      ok: false,
      reason: "no_json",
    });
    expect(parseBuddyReply('{"reply": broken}')).toEqual({
      ok: false,
      reason: "bad_json",
    });
    // มี JSON ถูกรูป แต่ไม่มีข้อความให้เด็กอ่าน ซึ่งใช้ไม่ได้
    expect(parseBuddyReply('{"objective_met":true}')).toEqual({
      ok: false,
      reason: "bad_shape",
    });
    expect(parseBuddyReply('{"reply":""}')).toEqual({
      ok: false,
      reason: "bad_shape",
    });
  });
});
