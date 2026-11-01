/**
 * ตัวสุ่มที่ให้ผลเหมือนเดิมทุกครั้งเมื่อใส่ seed เดียวกัน
 *
 * จำเป็นเพราะหน้าเกมถูก render ทั้งบนเซิร์ฟเวอร์และบนเบราว์เซอร์
 * ถ้าใช้ Math.random ลำดับการ์ดสองฝั่งจะไม่ตรงกันแล้ว React จะเตือน
 * hydration mismatch — ใช้ seed จาก id ของข้อจึงได้ลำดับเดียวกันเสมอ
 */

function hashString(seed: string) {
  let hash = 2166136261;
  for (let i = 0; i < seed.length; i += 1) {
    hash ^= seed.charCodeAt(i);
    hash = Math.imul(hash, 16777619);
  }
  return hash >>> 0;
}

/** mulberry32 — เล็ก เร็ว และกระจายตัวดีพอสำหรับการสลับไพ่ */
export function seededRandom(seed: string): () => number {
  let state = hashString(seed);

  return () => {
    state |= 0;
    state = (state + 0x6d2b79f5) | 0;
    let t = Math.imul(state ^ (state >>> 15), 1 | state);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

export function shuffleWithSeed<T>(items: T[], seed: string): T[] {
  const random = seededRandom(seed);
  const copy = [...items];

  for (let i = copy.length - 1; i > 0; i -= 1) {
    const j = Math.floor(random() * (i + 1));
    [copy[i], copy[j]] = [copy[j], copy[i]];
  }

  return copy;
}

/**
 * สลับโดยรับประกันว่าลำดับที่ได้ไม่เหมือนลำดับเดิม
 *
 * ใช้กับคอลัมน์คำแปลในเกมจับคู่ เพราะถ้าบังเอิญสลับแล้วได้ลำดับเดิม
 * สองคอลัมน์จะเรียงตรงกันพอดี เด็กจับคู่ทีละแถวได้โดยไม่ต้องอ่านคำเลย
 * ซึ่งทำให้ด่านนั้นไม่ได้วัดอะไร (เกิดขึ้นจริงตอนทดสอบด่านสี)
 */
export function shuffleDistinct<T>(items: T[], seed: string): T[] {
  if (items.length < 2) return [...items];

  const shuffled = shuffleWithSeed(items, seed);
  const sameOrder = shuffled.every((item, index) => item === items[index]);
  if (!sameOrder) return shuffled;

  return [...shuffled.slice(1), shuffled[0]];
}
