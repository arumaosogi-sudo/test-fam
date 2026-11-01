import { describe, expect, it } from "vitest";

import { cefrLevelSchema, type CefrLevel } from "@/lib/types";

import { CEFR_CEILING, buildSystemPrompt } from "./prompt";
import type { ChildContext } from "./types";

const child: ChildContext = {
  ageYears: 7,
  cefr: "Pre-A1",
  targetWords: ["cat", "big"],
  topicTh: "สัตว์เลี้ยง",
};

describe("CEFR_CEILING", () => {
  it("มีครบทุกระดับที่ schema ยอมรับ", () => {
    for (const level of cefrLevelSchema.options) {
      expect(CEFR_CEILING[level], level).toBeDefined();
    }
  });

  it("ประโยคยาวขึ้นตามระดับ ไม่มีระดับไหนสั้นลง", () => {
    const lengths = cefrLevelSchema.options.map(
      (level) => CEFR_CEILING[level].maxSentenceWords,
    );

    for (let i = 1; i < lengths.length; i += 1) {
      expect(lengths[i], cefrLevelSchema.options[i]).toBeGreaterThan(
        lengths[i - 1],
      );
    }
  });

  it("ภาษาไทยเป็นตัวช่วยเฉพาะระดับต้น แล้วถูกถอดออก ไม่กลับมาอีก", () => {
    const allowed = cefrLevelSchema.options.map(
      (level) => CEFR_CEILING[level].allowThaiScaffold,
    );

    // scaffold ที่ถอดแล้วกลับมาใหม่ในระดับสูงกว่า แปลว่าตารางผิด
    expect(allowed).toEqual([true, true, false, false, false, false]);
  });
});

describe("buildSystemPrompt", () => {
  it("ใส่เพดานความยาวประโยคของระดับนั้นลงไปจริง", () => {
    for (const level of cefrLevelSchema.options) {
      const prompt = buildSystemPrompt({ ...child, cefr: level });
      expect(prompt, level).toContain(
        `${CEFR_CEILING[level].maxSentenceWords} words or fewer`,
      );
    }
  });

  it("มีครบทั้ง 6 ส่วนบังคับตามแผน", () => {
    const prompt = buildSystemPrompt(child);

    expect(prompt).toContain("Milo"); // 1 บทบาท
    expect(prompt).toContain("LANGUAGE CEILING"); // 2 เพดานภาษา
    expect(prompt).toContain("question back to the child"); // 3 วินัยการสอน
    expect(prompt).toContain("Recast"); // 4 การแก้ผิด
    expect(prompt).toContain("THAI"); // 5 scaffold ไทย
    expect(prompt).toContain("SAFETY"); // 6 guardrail
  });

  it("บอกอายุและหัวข้อของเด็กคนนั้น", () => {
    const prompt = buildSystemPrompt(child);

    expect(prompt).toContain("7-year-old");
    expect(prompt).toContain("สัตว์เลี้ยง");
  });

  it("ส่งคำเป้าหมายเข้าไป และไม่พูดถึงเลยถ้าไม่มีคำ", () => {
    expect(buildSystemPrompt(child)).toContain("cat, big");
    expect(
      buildSystemPrompt({ ...child, targetWords: [] }),
    ).not.toContain("Try to use these words");
  });

  it("ระดับต้นอนุญาตให้แทรกไทย ระดับ A2 ขึ้นไปห้าม", () => {
    const preA1 = buildSystemPrompt({ ...child, cefr: "Pre-A1" });
    const a2 = buildSystemPrompt({ ...child, cefr: "A2" });

    expect(preA1).toContain("short Thai translation in brackets");
    expect(a2).toContain("Do not write Thai unless the child asks");
  });

  it("สั่งห้ามถามข้อมูลส่วนตัวของเด็กเสมอ ทุกระดับ", () => {
    for (const level of cefrLevelSchema.options as CefrLevel[]) {
      const prompt = buildSystemPrompt({ ...child, cefr: level });
      expect(prompt, level).toContain("Never ask for the child's full name");
    }
  });

  it("บอกรูปแบบ JSON ที่ต้องตอบกลับ", () => {
    const prompt = buildSystemPrompt(child);

    expect(prompt).toContain("safety_flag");
    expect(prompt).toContain("suggested_followups");
    expect(prompt).toContain("ONE JSON object");
  });
});
