import { CEFR_ORDER, type CefrLevel, type Word } from "@/lib/types";
import { UNITS, WORDS, wordsInUnit } from "@/lib/content";

/**
 * หัวข้อสำหรับคุยกับ Milo — รวมหน่วยคำศัพท์หลายหน่วยเป็นหมวดใหญ่ไม่กี่หมวด
 *
 * หน้าแชทเคยเอา UNITS ทั้งหมดมาทำปุ่มให้เลือก ตอนเขียนมีสิบหน่วยจึงพอไหว
 * ตอนนี้คลังคำโตเป็น 121 หน่วย เมนูเลือกหัวข้อจึงกลายเป็นปุ่มร้อยกว่าปุ่ม
 * ซึ่งเด็กเลือกไม่ถูก และหัวข้อก็ละเอียดเกินกว่าจะเอามาคุยได้จริง —
 * "คำกริยา B2 ชุด 4" ไม่ใช่เรื่องที่ใครจะชวนคุย
 *
 * หมวดใหญ่แก้สองอย่างพร้อมกัน: เลือกง่ายขึ้น และ Milo คุยได้กว้างขึ้น
 * เพราะหนึ่งหมวดกินคำจากหลายหน่วยและหลายระดับ ไม่ได้ถูกล็อกอยู่กับ
 * คำห้าคำของหน่วยเดียว
 *
 * **ไม่ใช่การจัดหลักสูตรใหม่** — แผนที่ด่านยังใช้หน่วยเดิมทุกหน่วย
 * ตารางนี้เป็นแค่ชั้นจัดกลุ่มสำหรับหน้าแชทเท่านั้น
 */

export type ChatTopic = {
  id: string;
  titleTh: string;
  titleEn: string;
  emoji: string;
  /** คำอธิบายสั้น ๆ ให้โมเดลรู้ว่าหมวดนี้ครอบคลุมอะไร */
  scope: string;
  /** หน่วยที่อยู่ในหมวดนี้ — ว่างแปลว่าเอาทั้งคลัง */
  unitIds: string[];
};

/** หมวด "คุยอะไรก็ได้" ไม่ผูกกับหน่วยไหนเลย ใช้ทั้งคลังตามเพดานระดับ */
export const FREE_TOPIC_ID = "anything";

export const CHAT_TOPICS: ChatTopic[] = [
  {
    id: FREE_TOPIC_ID,
    titleTh: "คุยอะไรก็ได้",
    titleEn: "Anything",
    emoji: "💬",
    scope:
      "anything the child wants to talk about — follow the child's lead instead of steering to one subject",
    unitIds: [],
  },
  {
    id: "people",
    titleTh: "คนและอาชีพ",
    titleEn: "People and Jobs",
    emoji: "🧑",
    scope:
      "family, friends, people around the child, and what grown-ups do for work",
    unitIds: [
      "u-family",
      "u-people",
      "u-jobs",
      "u-a1-social",
      "u-b1-people-2",
      "u-b1-jobs-3",
      "u-b2-jobs-2",
      "u-b2-people-1",
      "u-c1-people-1",
    ],
  },
  {
    id: "body",
    titleTh: "ร่างกายและความรู้สึก",
    titleEn: "Body and Feelings",
    emoji: "💪",
    scope:
      "the body, health, how the child feels today, and what makes people feel that way",
    unitIds: [
      "u-body",
      "u-feelings",
      "u-a2-health",
      "u-a2-feelings",
      "u-b1-health",
      "u-b1-feelings-3",
      "u-b1-feelings-4",
      "u-b1-body-4",
      "u-b2-body-1",
      "u-c1-body-2",
    ],
  },
  {
    id: "food",
    titleTh: "อาหารและของกิน",
    titleEn: "Food and Drinks",
    emoji: "🍚",
    scope: "meals, cooking, the kitchen, and food the child likes or dislikes",
    unitIds: [
      "u-food",
      "u-a1-meals",
      "u-a2-food-2",
      "u-a2-food-3",
      "u-a2-kitchen",
      "u-b1-food-4",
      "u-b1-food-5",
      "u-b2-food-1",
      "u-b2-food-2",
    ],
  },
  {
    id: "nature",
    titleTh: "สัตว์และธรรมชาติ",
    titleEn: "Animals and Nature",
    emoji: "🌳",
    scope: "animals, plants, weather, the sky and the land outdoors",
    unitIds: [
      "u-animals",
      "u-nature",
      "u-outdoors",
      "u-a2-weather",
      "u-a2-nature-2",
      "u-a2-nature-3",
      "u-b1-animals-2",
      "u-b1-animals-3",
      "u-b1-nature-4",
      "u-b1-nature-6",
      "u-b1-sky-land",
      "u-b2-animals-1",
      "u-b2-animals-2",
      "u-b2-nature-1",
      "u-c1-animals-1",
      "u-c1-nature-1",
    ],
  },
  {
    id: "home",
    titleTh: "บ้านและของใช้",
    titleEn: "Home and Things",
    emoji: "🏠",
    scope: "the child's home, clothes, toys and everyday objects",
    unitIds: [
      "u-things",
      "u-home",
      "u-everyday",
      "u-in-the-house",
      "u-a1-things-2",
      "u-a2-clothes",
      "u-a2-daily-2",
      "u-b1-things-3",
      "u-b1-things-4",
      "u-b2-things-1",
      "u-b2-things-2",
      "u-b2-clothes-1",
      "u-c1-things-1",
      "u-c1-things-2",
    ],
  },
  {
    id: "school",
    titleTh: "โรงเรียนและการเรียน",
    titleEn: "School and Learning",
    emoji: "🏫",
    scope: "the classroom, school subjects, reading, writing and stories",
    unitIds: [
      "u-classroom",
      "u-verbs-3",
      "u-a2-school-3",
      "u-b1-school-4",
      "u-b1-study-2",
      "u-b2-school-1",
      "u-b2-school-2",
      "u-c1-ideas-1",
      "u-c1-stories-1",
    ],
  },
  {
    id: "out",
    titleTh: "เที่ยวและเล่น",
    titleEn: "Going Out and Playing",
    emoji: "⚽",
    scope: "places to go, getting there, sport, games, music and art",
    unitIds: [
      "u-places",
      "u-travel",
      "u-fun",
      "u-a1-directions",
      "u-a2-places-2",
      "u-a2-sport",
      "u-b1-places-3",
      "u-b1-travel-3",
      "u-b2-places-1",
      "u-b2-travel-1",
      "u-b2-sport-1",
      "u-b2-arts-1",
    ],
  },
  {
    id: "everyday",
    titleTh: "คำที่ใช้ทุกวัน",
    titleEn: "Everyday Words",
    emoji: "🗓️",
    scope:
      "colours, numbers, days and months, question words, and the verbs and describing words used all the time",
    unitIds: [
      "u-colors",
      "u-numbers",
      "u-numbers-2",
      "u-numbers-3",
      "u-adjectives",
      "u-actions",
      "u-verbs-1",
      "u-verbs-2",
      "u-verbs-4",
      "u-describe-2",
      "u-describe-3",
      "u-time",
      "u-days",
      "u-months-1",
      "u-months-2",
      "u-basics",
      "u-questions",
      "u-position",
      "u-a1-time-2",
      "u-a1-verbs-5",
      "u-a1-describe-5",
      "u-a2-verbs-1",
      "u-a2-verbs-2",
      "u-a2-verbs-3",
      "u-a2-describe",
      "u-a2-describe-4",
      "u-a2-time-3",
      "u-b1-verbs-4",
      "u-b1-verbs-5",
      "u-b1-verbs-7",
      "u-b1-describe-6",
      "u-b1-describe-7",
      "u-b1-describe-8",
      "u-b2-verbs-1",
      "u-b2-verbs-2",
      "u-b2-verbs-3",
      "u-b2-verbs-4",
      "u-b2-verbs-5",
      "u-b2-describe-1",
      "u-b2-describe-2",
      "u-c1-verbs-1",
      "u-c1-verbs-2",
    ],
  },
];

export function getTopic(id: string): ChatTopic | undefined {
  return CHAT_TOPICS.find((topic) => topic.id === id);
}

/** ระดับนี้อยู่เท่ากับหรือต่ำกว่าเพดานไหม */
function atOrBelow(level: CefrLevel, ceiling: CefrLevel): boolean {
  return CEFR_ORDER.indexOf(level) <= CEFR_ORDER.indexOf(ceiling);
}

/**
 * คำที่ Milo หยิบมาใช้ได้ในหัวข้อนี้ สำหรับเด็กระดับนี้
 *
 * **เพดานระดับสำคัญกว่าหัวข้อ** — เด็ก A1 คุยเรื่องสัตว์ได้ แต่ต้องไม่เจอ
 * hedgehog ของ C1 ตัวกรองระดับจึงมาก่อนเสมอ ไม่ใช่แค่คำแนะนำใน prompt
 *
 * คืนคำของระดับเด็กเองก่อน เพราะนั่นคือคำที่ตั้งใจจะสอนรอบนี้ แล้วค่อย
 * เติมด้วยคำระดับต่ำกว่าให้ครบโควตา เพื่อให้ประโยคเป็นธรรมชาติ
 */
export function topicWords(
  topicId: string,
  cefr: CefrLevel,
  limit = 40,
): Word[] {
  const topic = getTopic(topicId);
  const pool =
    topic && topic.unitIds.length > 0
      ? topic.unitIds.flatMap((unitId) => wordsInUnit(unitId))
      : WORDS;

  const withinLevel = pool.filter((word) => atOrBelow(word.cefr, cefr));
  const atLevel = withinLevel.filter((word) => word.cefr === cefr);
  const below = withinLevel.filter((word) => word.cefr !== cefr);

  return [...atLevel, ...below].slice(0, limit);
}

/** หน่วยทั้งหมดที่ถูกจัดอยู่ในหมวดใดหมวดหนึ่งแล้ว */
export function groupedUnitIds(): Set<string> {
  return new Set(CHAT_TOPICS.flatMap((topic) => topic.unitIds));
}

/** หน่วยที่ยังไม่ได้จัดเข้าหมวด — ต้องว่างเสมอ มีเทสคุมอยู่ */
export function ungroupedUnits(): string[] {
  const grouped = groupedUnitIds();
  return UNITS.filter((unit) => !grouped.has(unit.id)).map((unit) => unit.id);
}
