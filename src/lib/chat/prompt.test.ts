import { describe, expect, it } from "vitest";

import { getUnit, wordsInUnit } from "@/lib/content";
import { CEFR_ORDER } from "@/lib/types";

import { LANGUAGE_CEILING, buildSystemPrompt } from "./prompt";

function requireUnit(id: string) {
  const found = getUnit(id);
  if (!found) throw new Error(`ไม่มีหน่วย ${id} ในคลังคำ`);
  return found;
}

const unit = requireUnit("u-animals");
const targetWords = wordsInUnit(unit.id);

function prompt(overrides: Partial<Parameters<typeof buildSystemPrompt>[0]> = {}) {
  return buildSystemPrompt({ cefr: "Pre-A1", unit, targetWords, ...overrides });
}

describe("LANGUAGE_CEILING", () => {
  it("ประโยคยาวขึ้นตามระดับ ไม่มีระดับไหนย้อนกลับ", () => {
    const lengths = CEFR_ORDER.map(
      (level) => LANGUAGE_CEILING[level].maxWordsPerSentence,
    );

    for (let i = 1; i < lengths.length; i += 1) {
      expect(lengths[i], CEFR_ORDER[i]).toBeGreaterThan(lengths[i - 1]);
    }
  });

  it("ภาษาไทยช่วยเฉพาะสองระดับแรก แล้วถอดออก", () => {
    // กฎการออกแบบข้อ 5: ไทยช่วยตอนต้น แล้วถอด scaffold ออกตามระดับ
    expect(LANGUAGE_CEILING["Pre-A1"].allowThaiScaffold).toBe(true);
    expect(LANGUAGE_CEILING.A1.allowThaiScaffold).toBe(true);
    expect(LANGUAGE_CEILING.A2.allowThaiScaffold).toBe(false);
    expect(LANGUAGE_CEILING.B1.allowThaiScaffold).toBe(false);
    expect(LANGUAGE_CEILING.B2.allowThaiScaffold).toBe(false);
    expect(LANGUAGE_CEILING.C1.allowThaiScaffold).toBe(false);
  });
});

describe("buildSystemPrompt", () => {
  it("มีครบทั้ง 6 ส่วนบังคับตามแผน", () => {
    const text = prompt();

    for (const heading of [
      "# 1. Who you are",
      "# 2. Language ceiling",
      "# 3. Keep the conversation alive",
      "# 4. How to correct mistakes",
      "# 5. Thai support",
      "# 6. Safety",
    ]) {
      expect(text, heading).toContain(heading);
    }
  });

  it("บอกเพดานความยาวประโยคของระดับนั้นจริง", () => {
    expect(prompt({ cefr: "Pre-A1" })).toContain("6 words or fewer");
    expect(prompt({ cefr: "B1" })).toContain("16 words or fewer");
  });

  it("ใส่คำของหน่วยนั้นลงไปเป็นเพดานคำศัพท์", () => {
    const text = prompt();

    // ถ้าคำหลุดไปจาก prompt โมเดลจะใช้คำอะไรก็ได้ แล้วเด็กจะเจอภาษาที่ยากเกิน
    for (const word of targetWords) {
      expect(text, word.en).toContain(word.en);
    }
  });

  it("ระดับต้นอนุญาตคำแปลไทยในวงเล็บ ระดับสูงห้าม", () => {
    expect(prompt({ cefr: "Pre-A1" })).toContain("Thai gloss in brackets");
    expect(prompt({ cefr: "A2" })).toContain("Do not use Thai");
  });

  it("เรียกชื่อเด็กเมื่อรู้ชื่อ และเรียกว่าเพื่อนเมื่อไม่รู้", () => {
    expect(prompt({ childName: "Nong" })).toContain("Nong");
    expect(prompt()).toContain("my friend");
    // ชื่อที่เป็นช่องว่างล้วนต้องไม่กลายเป็นชื่อจริง
    expect(prompt({ childName: "   " })).toContain("my friend");
  });

  it("สั่งห้ามเด้งกลับไปถามเรื่องบทเรียนเมื่อเด็กเล่าเรื่องน่าห่วง", () => {
    // กฎข้อ 3 (ถามกลับทุกเทิร์น) ต้องแพ้กฎข้อ 6 ไม่งั้นโมเดลจะถามเรื่อง
    // บทเรียนต่อทันทีหลังเด็กเล่าว่าโดนทำร้าย — เจอจริงตอนทดสอบกับโมเดล
    const text = prompt();

    expect(text).toContain("break rule 3");
    expect(text).toContain('empty "suggestedReplies"');
  });

  it("ห้ามเรื่องที่ไม่เหมาะกับเด็กไว้ชัดเจน", () => {
    const text = prompt();

    expect(text).toContain("Never ask for or repeat personal details");
    expect(text).toContain("never ask the child to keep a secret");
  });
});
