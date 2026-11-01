/**
 * ตรรกะการสะกดคำที่ใช้ร่วมกันระหว่างเกมเติมคำ (G2) กับเกมดูภาพ (G4)
 *
 * แยกออกมาเป็นฟังก์ชันบริสุทธิ์เพราะเป็นส่วนที่พลาดง่ายที่สุดของทั้งสองเกม:
 * คำที่มีตัวอักษรซ้ำ คำที่มีช่องว่าง และการตรวจคำที่สะกดเกือบถูก
 */

/** ตัวอักษรหลอกที่เติมเข้าไปเวลาคำสั้นเกินกว่าจะท้าทาย */
const DECOY_LETTERS = "aeiourstlnmbcdpgkhfy".split("");

/** คำที่ยาวกว่านี้ไม่ต้องเติมตัวหลอก เพราะตัวอักษรบนจอเยอะพออยู่แล้ว */
const DECOY_THRESHOLD = 5;

export type Slot =
  /** ช่องที่เด็กต้องเติมตัวอักษร */
  | { kind: "letter"; expected: string }
  /** ช่องว่างระหว่างคำ เติมให้เองไม่ให้เด็กต้องเดา */
  | { kind: "space" };

/**
 * โครงของคำตอบทีละช่อง
 *
 * ช่องว่างใน "ice cream" ถูกทำเป็นช่องที่เติมไว้แล้ว เพราะการให้เด็กอนุบาล
 * หาว่าต้องเคาะวรรคตรงไหนไม่ได้ฝึกการสะกดคำ แต่ทำให้ข้อนั้นยากขึ้นเปล่า ๆ
 */
export function answerSlots(answer: string): Slot[] {
  return [...answer.toLowerCase()].map((character) =>
    character === " "
      ? { kind: "space" as const }
      : { kind: "letter" as const, expected: character },
  );
}

/**
 * ช่องตัวอักษรลำดับที่เท่าไรของแต่ละช่องบนจอ — null ถ้าช่องนั้นเป็นช่องว่างระหว่างคำ
 *
 * ต้องมีตารางนี้เพราะช่องบนจอกับตัวอักษรที่เด็กวางไม่ได้นับตรงกัน:
 * "ice cream" มี 9 ช่องบนจอ แต่มีตัวอักษรให้วางแค่ 8 ตัว
 */
export function letterSlotPositions(slots: Slot[]): (number | null)[] {
  return slots.map((slot, index) =>
    slot.kind === "space"
      ? null
      : slots.slice(0, index).filter((earlier) => earlier.kind === "letter")
          .length,
  );
}

function shuffle<T>(items: T[], random: () => number): T[] {
  const copy = [...items];
  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }
  return copy;
}

/**
 * ตัวอักษรที่วางให้เด็กเลือก — ตัวอักษรของคำตอบทั้งหมด (รวมตัวที่ซ้ำ)
 * บวกตัวหลอกไม่กี่ตัวสำหรับคำสั้น แล้วสลับตำแหน่ง
 */
export function letterTiles(
  answer: string,
  random: () => number,
  decoyCount?: number,
): string[] {
  const letters = answer
    .toLowerCase()
    .split("")
    .filter((character) => character !== " ");

  const decoysWanted =
    decoyCount ?? (letters.length < DECOY_THRESHOLD ? 2 : 0);

  const used = new Set(letters);
  const decoys = shuffle(
    DECOY_LETTERS.filter((letter) => !used.has(letter)),
    random,
  ).slice(0, decoysWanted);

  return shuffle([...letters, ...decoys], random);
}

/** ตัดช่องว่างหัวท้าย ยุบช่องว่างซ้ำ และไม่สนตัวพิมพ์เล็กใหญ่ */
export function normalizeAnswer(value: string): string {
  return value.trim().toLowerCase().replace(/\s+/g, " ");
}

/** ระยะ Levenshtein — จำนวนการแก้ตัวอักษรน้อยสุดที่ทำให้สองคำเท่ากัน */
export function editDistance(a: string, b: string): number {
  if (a === b) return 0;
  if (a.length === 0) return b.length;
  if (b.length === 0) return a.length;

  let previous = Array.from({ length: b.length + 1 }, (_, i) => i);

  for (let i = 1; i <= a.length; i += 1) {
    const current = [i];
    for (let j = 1; j <= b.length; j += 1) {
      const substitution = previous[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1);
      current[j] = Math.min(substitution, previous[j] + 1, current[j - 1] + 1);
    }
    previous = current;
  }

  return previous[b.length];
}

/** ตำแหน่ง (เริ่มที่ 1) ของตัวอักษรตัวแรกที่ไม่ตรงกับคำตอบ */
function firstMismatch(input: string, answer: string): number {
  const length = Math.min(input.length, answer.length);
  for (let i = 0; i < length; i += 1) {
    if (input[i] !== answer[i]) return i + 1;
  }
  return length + 1;
}

export type TypedVerdict =
  | { kind: "correct" }
  /** สะกดผิดตัวเดียว — ให้คำใบ้แล้วให้ลองอีกครั้ง ยังไม่ตัดว่าผิด */
  | { kind: "near"; position: number }
  | { kind: "wrong" };

/**
 * ตรวจคำที่เด็กพิมพ์แบบ "ใจดี" ตามกฎการออกแบบข้อ 2 (ตอบผิดไม่ลงโทษ)
 *
 * สะกดผิดหนึ่งตัวยังไม่นับว่าผิด แต่บอกว่าพลาดตัวที่เท่าไรแล้วให้แก้
 * เพราะเด็กที่รู้คำแต่พิมพ์พลาดไม่ควรเสียคะแนนเท่ากับเด็กที่ไม่รู้คำเลย
 * และการชี้ตำแหน่งที่ผิดสอนการสะกดได้ดีกว่าการเฉลยคำตอบให้ทั้งคำ
 */
export function checkTypedAnswer(input: string, answer: string): TypedVerdict {
  const typed = normalizeAnswer(input);
  const target = normalizeAnswer(answer);

  if (typed === target) return { kind: "correct" };
  if (typed.length === 0) return { kind: "wrong" };
  if (editDistance(typed, target) === 1) {
    return { kind: "near", position: firstMismatch(typed, target) };
  }

  return { kind: "wrong" };
}
