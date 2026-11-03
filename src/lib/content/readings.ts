import rawReadings from "@/content/readings.json";
import { readingSchema, type Reading } from "@/lib/types";

import { WORDS } from "./index";

/**
 * เรื่องอ่านสั้นของโหมดอ่านออกเสียง (G6) และด่านคุมคำศัพท์ของเรื่องเหล่านั้น
 *
 * หัวใจของไฟล์นี้คือ `unknownWords()` ซึ่งเทสใช้บังคับว่า **ทุกคำเนื้อหา
 * ในทุกเรื่องต้องเป็นคำที่อยู่ในคลังคำแล้ว** ถ้าไม่มีด่านนี้ เรื่องอ่านจะ
 * ค่อย ๆ ลักคำที่เด็กยังไม่เคยเรียนเข้ามา แล้วโหมดอ่านออกเสียงจะกลายเป็น
 * การเดาคำแปลกหน้า ไม่ใช่การอ่านของที่เรียนมาให้คล่องขึ้น
 * ซึ่งเป็นสิ่งเดียวที่โหมดนี้มีไว้ทำ
 */

export const READINGS: Reading[] = readingSchema.array().parse(rawReadings);

const readingById = new Map(READINGS.map((reading) => [reading.id, reading]));

export function getReading(id: string): Reading | undefined {
  return readingById.get(id);
}

/**
 * คำไวยากรณ์ที่อนุญาตให้ใช้ในเรื่องอ่านได้ แม้ไม่อยู่ในคลังคำ
 *
 * แอปไม่สอนคำพวกนี้เป็นคำศัพท์ (ทำการ์ดคำว่า "the" ไม่ได้) แต่เขียนประโยค
 * ภาษาอังกฤษโดยไม่มีมันไม่ได้เลย
 *
 * **ตั้งใจให้สั้น** เพราะลิสต์นี้คือรูที่คำใหม่จะเข้ามาได้ ยิ่งยาวยิ่งคุมไม่ได้
 * เพิ่มคำใหม่เข้ามาต้องถามก่อนว่า "ตัดออกจากประโยคไม่ได้จริงหรือ"
 */
export const FUNCTION_WORDS = new Set([
  // คำนำหน้านาม
  "a",
  "an",
  "the",
  // คำสันธาน
  "and",
  "but",
  "or",
  // สรรพนามและคำแสดงความเป็นเจ้าของ
  "i",
  "you",
  "he",
  "she",
  "it",
  "we",
  "they",
  "my",
  "your",
  "his",
  "her",
  "its",
  "our",
  "their",
  "him",
  "us",
  "them",
  // คำชี้
  "this",
  "that",
  "these",
  "those",
  // กริยาช่วยและกริยา be
  "is",
  "are",
  "am",
  "was",
  "were",
  "be",
  "has",
  "have",
  "had",
  "do",
  "does",
  "did",
  "can",
  "will",
  // คำบอกความ
  "not",
  "no",
  "yes",
  "very",
  "too",
  "there",
  // คำบุพบทที่คลังคำยังไม่มี (in on under behind between มีอยู่แล้ว)
  "to",
  "of",
  "with",
  "from",
  "at",
  "for",
  "by",
]);

/**
 * พหูพจน์ที่ไม่เติม s ของคำที่อยู่ในคลัง
 *
 * ตัวตัดรูปผันข้างล่างจัดการแต่รูปที่เติมท้าย (-s -es -ies -ing -ed)
 * `teeth` กับ `children` จึงถูกนับว่าเป็นคำนอกคลัง ทั้งที่ `tooth` กับ
 * `child` อยู่ในคลังอยู่แล้ว — เด็กที่เรียน tooth มาแล้วอ่าน teeth ออก
 */
const IRREGULAR_PLURALS: Record<string, string> = {
  teeth: "tooth",
  children: "child",
  feet: "foot",
  men: "man",
  women: "woman",
  mice: "mouse",
  people: "person",
  lives: "life",
};

/** รูปที่ผันแล้วของคำในคลัง ซึ่งถือว่าเป็นคำเดิม */
function baseForms(word: string): string[] {
  const forms = [word];

  const irregular = IRREGULAR_PLURALS[word];
  if (irregular) forms.push(irregular);

  // พหูพจน์และกริยาเติม s: cats, boxes, flies
  if (word.endsWith("ies")) forms.push(`${word.slice(0, -3)}y`);
  if (word.endsWith("es")) forms.push(word.slice(0, -2));
  if (word.endsWith("s")) forms.push(word.slice(0, -1));

  // รูป -ing และ -ed รวมกรณีซ้ำพยัญชนะ (running) และตัด e (making)
  for (const suffix of ["ing", "ed"]) {
    if (!word.endsWith(suffix)) continue;
    const stem = word.slice(0, -suffix.length);
    forms.push(stem, `${stem}e`);
    // running → runn → run
    if (stem.length > 2 && stem.at(-1) === stem.at(-2)) {
      forms.push(stem.slice(0, -1));
    }
  }

  return forms;
}

const BANK = new Set(WORDS.map((word) => word.en.toLowerCase()));

/** คำอังกฤษ → id ในคลังคำ ใช้ป้อนผลการอ่านกลับเข้าระบบความชำนาญ */
const ID_BY_EN = new Map(
  WORDS.map((word) => [word.en.toLowerCase(), word.id]),
);

/**
 * คำในเรื่องนี้ตรงกับคำไหนในคลังคำ — undefined ถ้าเป็นคำไวยากรณ์
 *
 * ต้องมีเพราะการอ่านออกเสียงหนึ่งเรื่องคือการใช้คำที่เรียนมาหลายสิบคำ
 * พร้อมกัน ถ้าไม่ป้อนผลกลับ ดาวความชำนาญจะไม่ขยับเลยทั้งที่เด็กเพิ่ง
 * ออกเสียงคำเหล่านั้นจริง ๆ ส่วนคำอย่าง "the" ไม่มีใน id ใด จึงไม่ถูกนับ
 */
export function bankWordIdFor(word: string): string | undefined {
  const lower = word.toLowerCase();
  if (FUNCTION_WORDS.has(lower)) return undefined;

  for (const form of baseForms(lower)) {
    const id = ID_BY_EN.get(form);
    if (id) return id;
  }

  return undefined;
}

/**
 * คำนี้อยู่ในระดับที่เด็กเข้าถึงได้ไหม
 *
 * ผ่านได้สามทาง: อยู่ในคลังคำตรงตัว · เป็นรูปผันของคำในคลัง ·
 * หรือเป็นคำไวยากรณ์ในลิสต์ข้างบน
 */
export function wordIsInLevel(word: string): boolean {
  const lower = word.toLowerCase();
  if (FUNCTION_WORDS.has(lower)) return true;
  return baseForms(lower).some((form) => BANK.has(form));
}

/**
 * ตัดคำออกจากประโยค
 *
 * ตัดเครื่องหมายวรรคตอนหัวท้ายของแต่ละคำ แต่เก็บ apostrophe ไว้
 * เพราะ "don't" เป็นคำเดียว ไม่ใช่ "don" กับ "t"
 */
export function splitWords(sentence: string): string[] {
  return sentence
    .split(/\s+/)
    .map((token) => token.replace(/^[^\p{L}\p{N}']+|[^\p{L}\p{N}']+$/gu, ""))
    .filter((token) => token.length > 0);
}

export type DisplayToken = {
  /** ข้อความที่แสดงบนจอ รวมเครื่องหมายวรรคตอน */
  text: string;
  /** ลำดับของคำนี้ในเรื่อง — null ถ้าโทเคนนี้ไม่มีตัวอักษรเลย */
  wordIndex: number | null;
};

/**
 * โทเคนสำหรับแสดงบนจอ พร้อมบอกว่าแต่ละตัวคือคำลำดับที่เท่าไรของเรื่อง
 *
 * ต้องแยกจาก `splitWords` เพราะสองงานนี้ต้องการของไม่เหมือนกัน:
 * การจับคู่เสียงต้องการคำที่ตัดวรรคตอนออกแล้ว แต่เด็กต้องเห็นจุดกับจุลภาค
 * ตามจริง — เรื่องอ่านที่ไม่มีเครื่องหมายวรรคตอนสอนการอ่านผิดตั้งแต่ต้น
 * (เจอตอนทดสอบในเบราว์เซอร์: ประโยคขึ้นจอว่า "I have a cat" ไม่มีจุด)
 *
 * @param startIndex ลำดับคำแรกของประโยคนี้เมื่อนับจากต้นเรื่อง
 */
export function displayTokens(
  sentence: string,
  startIndex = 0,
): DisplayToken[] {
  let cursor = startIndex;

  return sentence
    .split(/\s+/)
    .filter((token) => token.length > 0)
    .map((token) => {
      // โทเคนที่ไม่มีตัวอักษรหรือตัวเลขเลยไม่นับเป็นคำ จึงไม่กิน index
      const isWord = splitWords(token).length > 0;
      return { text: token, wordIndex: isWord ? cursor++ : null };
    });
}

/** ทุกคำของเรื่อง เรียงตามที่อ่าน ใช้ทั้งไฮไลต์และคิดความแม่น */
export function passageWords(reading: Reading): string[] {
  return reading.sentences.flatMap(splitWords);
}

/** คำในเรื่องที่ยังไม่อยู่ในระดับ — เทสบังคับให้ลิสต์นี้ว่างเสมอ */
export function unknownWords(reading: Reading): string[] {
  return [
    ...new Set(
      passageWords(reading)
        .filter((word) => !wordIsInLevel(word))
        .map((word) => word.toLowerCase()),
    ),
  ];
}
