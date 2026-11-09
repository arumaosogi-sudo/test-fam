import { describe, expect, it } from "vitest";

import { CEFR_ORDER } from "@/lib/types";

import {
  LANGUAGE_CEILING,
  buildSystemPrompt,
  questionOpenings,
  recentQuestionsFrom,
} from "./prompt";
import { FREE_TOPIC_ID, getTopic, topicWords } from "./topics";

function requireTopic(id: string) {
  const found = getTopic(id);
  if (!found) throw new Error(`ไม่มีหมวด ${id}`);
  return found;
}

const topic = requireTopic("nature");
const targetWords = topicWords(topic.id, "Pre-A1");

function prompt(overrides: Partial<Parameters<typeof buildSystemPrompt>[0]> = {}) {
  return buildSystemPrompt({ cefr: "Pre-A1", topic, targetWords, ...overrides });
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

  it("ใส่คำของหมวดนั้นลงไปเป็นเพดานคำศัพท์", () => {
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

  it("ย้ำเพดานระดับคำศัพท์ให้ชนะหัวข้อ", () => {
    // กรองในโค้ดแล้วชั้นหนึ่ง แต่โมเดลหยิบคำนอกลิสต์ได้เอง จึงต้องสั่งซ้ำ
    expect(prompt({ cefr: "A1" })).toContain(
      "Never use an English word above CEFR A1",
    );
  });

  it("หมวดคุยอะไรก็ได้สั่งให้ตามเด็ก ไม่ใช่ลากกลับเข้าหัวข้อ", () => {
    const free = buildSystemPrompt({
      cefr: "A1",
      topic: requireTopic(FREE_TOPIC_ID),
      targetWords: topicWords(FREE_TOPIC_ID, "A1"),
    });

    expect(free).toContain("There is no set topic today");
    expect(free).toContain("Follow whatever the child wants to talk about");
  });

  it("หมวดเจาะจงบอกขอบเขตของหมวด ไม่ได้บอกแค่ชื่อหน่วย", () => {
    const text = prompt();

    expect(text).toContain("Animals and Nature");
    expect(text).toContain(topic.scope);
    expect(text).toContain("roam freely within it");
  });
});

describe("กันคำถามวน", () => {
  /**
   * มาจากการทดสอบจริง: Milo ถาม "Do you like a bear?" แล้ว "Do you like a cat?"
   * แล้ว "Do you like a dog?" สามเทิร์นติด จนเด็กเลิกคุย
   */
  it("สั่งห้ามถามซ้ำแบบเดิม และบอกรูปคำถามอื่นให้เลือก", () => {
    const text = prompt();

    expect(text).toContain("Never ask the same kind of question twice");
    expect(text).toContain("Do you like X?");
    expect(text).toContain("ask them to choose");
  });

  it("สั่งให้ตอบคำถามเด็กก่อน และห้ามตอบว่าไม่รู้", () => {
    const text = prompt();

    expect(text).toContain("ANSWER IT FIRST");
    expect(text).toContain("is a dead end");
  });

  it("เอาคำถามเก่าใส่ลงไปในคำสั่งเมื่อมีประวัติ", () => {
    const text = prompt({
      recentQuestions: ["Do you like a bear?", "Do you like a cat?"],
    });

    expect(text).toContain("You have already asked these");
    expect(text).toContain('"Do you like a bear?"');
    expect(text).toContain('"Do you like a cat?"');
  });

  it("ห้ามคำขึ้นต้นที่ใช้ไปแล้ว ไม่ใช่แค่ห้ามประโยคเดิม", () => {
    // ห้ามแค่ประโยคเดิมไม่พอ ทดสอบจริงแล้วยังได้ "Do you like a cat?"
    // ตามด้วย "Do you like the sun?" ในบทสนทนาเดียวกัน
    const text = prompt({
      recentQuestions: ["Do you like a cat?", "What is your name?"],
    });

    expect(text).toContain("Banned question openings");
    expect(text).toContain('"do you like..."');
    expect(text).toContain('"what is your..."');
  });

  it("บทสนทนาที่เพิ่งเริ่มไม่มีรายการคำถามเก่า", () => {
    expect(prompt()).toContain("This is the start of the conversation");
  });
});

describe("recentQuestionsFrom", () => {
  it("เอาเฉพาะประโยคคำถามของ Milo ไม่เอาของเด็ก", () => {
    const got = recentQuestionsFrom([
      { role: "milo", text: "I am a bear. Do you like a bear?" },
      { role: "child", text: "No. Do you like me?" },
      { role: "milo", text: "I like cats! What is your name?" },
    ]);

    expect(got).toEqual(["Do you like a bear?", "What is your name?"]);
  });

  it("ข้อความที่ไม่มีคำถามไม่ให้อะไรเลย", () => {
    expect(
      recentQuestionsFrom([{ role: "milo", text: "I like cats. Me too." }]),
    ).toEqual([]);
  });

  it("เอาแค่คำถามล่าสุดตามจำนวนที่ขอ เพราะ prompt ยาวเกินไปก็ไม่ดี", () => {
    const history = Array.from({ length: 10 }, (_, i) => ({
      role: "milo" as const,
      text: `Question ${i}?`,
    }));

    const got = recentQuestionsFrom(history, 3);

    expect(got).toEqual(["Question 7?", "Question 8?", "Question 9?"]);
  });

  it("รับประวัติว่างได้", () => {
    expect(recentQuestionsFrom([])).toEqual([]);
  });
});

describe("questionOpenings", () => {
  it("เอาสามคำแรกของคำถาม ตัดเครื่องหมายออก", () => {
    expect(questionOpenings(["Do you like a cat?"])).toEqual(["do you like"]);
  });

  it("คำถามที่ขึ้นต้นเหมือนกันนับเป็นคำขึ้นต้นเดียว", () => {
    expect(
      questionOpenings(["Do you like a cat?", "Do you like the sun?"]),
    ).toEqual(["do you like"]);
  });

  it("คำถามสั้นกว่าสามคำก็ยังใช้ได้", () => {
    expect(questionOpenings(["Why?", "Really Milo?"])).toEqual([
      "why",
      "really milo",
    ]);
  });

  it("ไม่มีคำถามก็ได้รายการว่าง", () => {
    expect(questionOpenings([])).toEqual([]);
  });
});

/**
 * กฎที่เพิ่มหลังผู้ใช้ทดสอบจริงแล้วพบว่า Milo คุยเรื่องอื่นไม่ได้เลย
 *
 * เด็กถามว่า "do u know google?" แล้วได้คำตอบว่า "I play with my friends.
 * Who is your friend?" คือไม่ได้ตอบคำถามและเปลี่ยนเรื่องไปเลย สาเหตุคือ
 * กฎเพดานคำศัพท์กับกฎห้ามถามซ้ำรัดจนโมเดลหนีไปพูดประโยคกลาง ๆ แทน
 */
describe("ความกว้างของบทสนทนา", () => {
  it("บอกว่าชื่อเฉพาะไม่ใช่คำศัพท์ จึงไม่ติดเพดาน CEFR", () => {
    const text = prompt();

    expect(text).toContain("Names are not vocabulary");
  });

  it("บอกว่าเรื่องที่ไม่อยู่ในคลังคำก็ยังต้องตอบ", () => {
    const text = prompt();

    expect(text).toMatch(/nowhere near the word list/);
  });

  it("จัดลำดับให้กฎ 'ตอบสิ่งที่เด็กพูด' ชนะกฎอื่นในหมวดเดียวกัน", () => {
    const text = prompt();

    expect(text).toContain("outranks every other rule in part 3");
  });

  it("ห้ามแก้ปัญหาคำถามซ้ำด้วยการเปลี่ยนเรื่องหนี", () => {
    const text = prompt({
      recentQuestions: ["Do you like a cat?", "Do you like a dog?"],
    });

    expect(text).toMatch(/Never solve a banned opening by switching/);
  });

  it("เรื่องที่คุยไม่ได้ต้องบอกออกมา ไม่ใช่เปลี่ยนเรื่องเงียบ ๆ", () => {
    const text = prompt();

    expect(text).toMatch(/rather than quietly changing the subject/);
  });

  it("สั่งให้ตักเตือนคำหยาบ ไม่ใช่ทำเป็นไม่เห็น", () => {
    const text = prompt();

    expect(text).toMatch(/unkind word/);
    expect(text).toContain('safetyFlag to "unkind_word"');
  });
});
