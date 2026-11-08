import { describe, expect, it } from "vitest";

import { speakableText } from "./speakable";

describe("speakableText", () => {
  /**
   * มาจากของจริง: Milo ตอบเด็ก A1 ว่า "I am a big bear (หมี)."
   * ตัวอ่านภาษาอังกฤษอ่านอักษรไทยไม่ได้ ที่ได้ยินคือเงียบคั่นกลางประโยค
   */
  it("ตัดคำแปลไทยในวงเล็บออก", () => {
    expect(speakableText("I am a big bear (หมี).")).toBe("I am a big bear.");
    expect(speakableText("Do you like a cat (แมว)?")).toBe("Do you like a cat?");
  });

  it("ตัดได้ทั้งวงเล็บกลมและเหลี่ยม และหลายอันในประโยคเดียว", () => {
    expect(speakableText("A cat (แมว) and a dog [หมา] play.")).toBe(
      "A cat and a dog play.",
    );
  });

  it("วงเล็บที่เป็นภาษาอังกฤษล้วนต้องไม่ถูกตัด", () => {
    expect(speakableText("I have two (2) cats.")).toBe("I have two (2) cats.");
  });

  it("อักษรไทยที่หลุดมานอกวงเล็บก็ตัด", () => {
    expect(speakableText("Hello สวัสดี friend.")).toBe("Hello friend.");
  });

  it("ประโยคอังกฤษล้วนไม่เปลี่ยนอะไรเลย", () => {
    const text = "Two cats! I like cats too. What are their names?";
    expect(speakableText(text)).toBe(text);
  });

  it("ข้อความที่เป็นไทยล้วนเหลือว่าง ผู้เรียกต้องไม่สั่งอ่าน", () => {
    expect(speakableText("สวัสดีจ้า")).toBe("");
  });

  it("ไม่ทิ้งช่องว่างซ้อนหรือช่องว่างหน้าเครื่องหมาย", () => {
    expect(speakableText("I see a bird (นก) .")).toBe("I see a bird.");
  });
});
