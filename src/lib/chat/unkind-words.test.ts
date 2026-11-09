import { describe, expect, it } from "vitest";

import { hasUnkindWord, unkindWordReply } from "./unkind-words";

/**
 * ด่านนี้มีขึ้นเพราะการทดสอบจริง — เด็กพิมพ์คำเหยียดเชื้อชาติลงไปในแชท
 * แล้ว Milo ตอบว่า "I am a happy bear. Do you like a cat?" คือเปลี่ยนเรื่อง
 * เฉย ๆ โดยไม่ตักเตือนอะไรเลย
 *
 * เทสฝั่ง "ไม่ควรโดน" สำคัญไม่แพ้ฝั่ง "ต้องโดน" เพราะการเตือนเด็กทั้งที่
 * พิมพ์ถูก ทำให้เด็กเลิกเชื่อระบบ ซึ่งแย่กว่าปล่อยคำหยาบผ่านไปบางคำ
 */

describe("hasUnkindWord", () => {
  it("จับคำเหยียดเชื้อชาติที่เจอในการทดสอบจริง", () => {
    expect(hasUnkindWord("nigger")).toBe(true);
    expect(hasUnkindWord("I like dogs. nigger")).toBe(true);
  });

  it("จับรูปที่เลี่ยงด่าน — ยืดตัวอักษร ใส่เลขแทน และใส่เครื่องหมายคั่น", () => {
    expect(hasUnkindWord("niiiggggerrr")).toBe(true);
    expect(hasUnkindWord("n1gger")).toBe(true);
    expect(hasUnkindWord("f*u*c*k")).toBe(true);
    expect(hasUnkindWord("sh1t")).toBe(true);
  });

  it("จับคำหยาบไทย", () => {
    expect(hasUnkindWord("เหี้ย")).toBe(true);
    expect(hasUnkindWord("มันห่วยมากเลยไอ้สัส")).toBe(true);
  });

  /**
   * ด่านที่พังง่ายที่สุด
   *
   * ถ้าเทียบแบบหาคำย่อย "class" กับ "bass" จะโดนเพราะมี "ass" อยู่ข้างใน
   * และถ้าสร้างรูปยืดจากคำสั้น "ass" จะกลายเป็น /^a+s+$/ ซึ่งไปจับ "as"
   * ที่เด็กใช้เรียนทุกวัน
   */
  it("ไม่จับคำปกติที่มีคำหยาบซ่อนอยู่ข้างใน", () => {
    expect(hasUnkindWord("I am in class.")).toBe(false);
    expect(hasUnkindWord("The bass is big.")).toBe(false);
    expect(hasUnkindWord("I am as tall as you.")).toBe(false);
    expect(hasUnkindWord("Pass me the ball.")).toBe(false);
    expect(hasUnkindWord("I like grapes.")).toBe(false);
  });

  /**
   * ภาษาไทยไม่เว้นวรรค การหาคำย่อยจึงชนคำปกติได้ง่ายมาก
   * "กู" อยู่ใน "กูเกิล" ซึ่งเป็นคำที่เด็กถามถึงจริงในการทดสอบ
   */
  it("ไม่จับคำไทยปกติที่หน้าตาใกล้คำหยาบ", () => {
    expect(hasUnkindWord("กูเกิลคืออะไร")).toBe(false);
    expect(hasUnkindWord("ฉันชอบสัตว์")).toBe(false);
    expect(hasUnkindWord("หีบใบนี้ใหญ่มาก")).toBe(false);
    expect(hasUnkindWord("เขาเป็นแม่งานของงานนี้")).toBe(false);
  });

  it("ข้อความธรรมดาของเด็กต้องผ่านหมด", () => {
    expect(hasUnkindWord("Hello Milo!")).toBe(false);
    expect(hasUnkindWord("I like dogs.")).toBe(false);
    expect(hasUnkindWord("do u know google?")).toBe(false);
    expect(hasUnkindWord("My cat is orange.")).toBe(false);
  });
});

describe("unkindWordReply", () => {
  it("บอกผลของคำ ไม่ดุและไม่ตีตราเด็ก", () => {
    const { reply, replyTh, suggestedReplies } = unkindWordReply();

    expect(reply.length).toBeGreaterThan(0);
    expect(replyTh.length).toBeGreaterThan(0);
    // ต้องมีทางไปต่อเสมอ ไม่ใช่ปิดบทสนทนาทิ้ง
    expect(suggestedReplies).toHaveLength(3);
    // ห้ามเอ่ยคำหยาบซ้ำในคำตอบเด็ดขาด
    expect(hasUnkindWord(reply)).toBe(false);
    expect(hasUnkindWord(replyTh)).toBe(false);
  });
});
