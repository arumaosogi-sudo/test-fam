import { describe, expect, it } from "vitest";

import WORDS from "@/content/words.json";

import { hintsForWord } from "./hints";

function ids(ipa: string): string[] {
  return hintsForWord(ipa).map((hint) => hint.id);
}

describe("hintsForWord", () => {
  it("จับเสียง th ที่ภาษาไทยไม่มี", () => {
    expect(ids("/θɹi/")).toContain("th");
    expect(ids("/ðɪs/")).toContain("th");
  });

  it("จับเสียง v และแยกจากเสียง w", () => {
    expect(ids("/væn/")).toContain("v");
    expect(ids("/wɪn/")).not.toContain("v");
  });

  it("จับเสียงเสียดแทรกท้ายคำที่คนไทยมักตก", () => {
    expect(ids("/kæts/")).toContain("final-fricative");
    expect(ids("/laɪf/")).toContain("final-fricative");
  });

  it("จับตัวสะกดท้ายคำที่ต้องปล่อยลม", () => {
    expect(ids("/kæt/")).toContain("final-stop");
    expect(ids("/bʊk/")).toContain("final-stop");
  });

  /** เสียงท้ายคำที่หายทำให้ความหมายเพี้ยนกว่า r ที่เพี้ยน จึงต้องมาก่อน */
  it("เรียงเสียงท้ายคำไว้ก่อนเสียงต้นคำ", () => {
    const hints = ids("/ɹæts/");
    expect(hints[0]).toBe("final-fricative");
    expect(hints).toContain("r");
  });

  it("จับเสียง l ท้ายคำ แต่ไม่จับ l ต้นคำ", () => {
    expect(ids("/skuːl/")).toContain("dark-l");
    expect(ids("/lɛɡ/")).not.toContain("dark-l");
  });

  it("ไม่โชว์เกินสองข้อ เพราะเด็กไม่อ่าน", () => {
    // คำที่มีทั้งเสียงท้ายเสียดแทรก เสียง th เสียง r และเสียงควบ
    expect(hintsForWord("/θɹiːvz/").length).toBeLessThanOrEqual(2);
  });

  it("คำที่ไม่มีเสียงยากเลยได้ลิสต์ว่าง ไม่แต่งคำแนะนำมาเติม", () => {
    expect(hintsForWord("/ˈmɑmi/")).toEqual([]);
  });

  /**
   * คำอ่านในคลังมีสัญลักษณ์กำกับเยอะ (เน้นเสียง จุดแบ่งพยางค์ วงเล็บ
   * เสียงยาว) ถ้าตัวตัดสัญลักษณ์พลาด เสียงท้ายคำจะอ่านออกมาผิดทั้งคลัง
   */
  it("อ่านคำอ่านจริงทั้งคลังได้โดยไม่พัง", () => {
    for (const word of WORDS) {
      expect(() => hintsForWord(word.ipa)).not.toThrow();
      expect(hintsForWord(word.ipa).length).toBeLessThanOrEqual(2);
    }
  });

  it("ไม่ถูกหลอกด้วยเสียงยาวและวงเล็บท้ายคำ", () => {
    // sea = /siː/ ลงท้ายด้วยสระ ไม่ใช่เสียงเสียดแทรก
    expect(ids("/siː/")).not.toContain("final-fricative");
    // wear = /wɛ(ə)ɹ/ ลงท้ายด้วยเสียง r
    expect(ids("/wɛ(ə)ɹ/")).toContain("r");
  });
});
