/**
 * ตรวจคำแปลไทยของคลังคำกับพจนานุกรมเปิด แล้วเขียนที่มากลับลงในคลังคำ
 *
 *   npm run check:thai
 *
 * ใช้ English Wiktionary ผ่านข้อมูลที่สกัดเป็น JSON แล้วของ kaikki.org
 * (ดู docs/adr/0007-thai-dictionary.md ว่าทำไมเลือกแหล่งนี้)
 *
 * สคริปต์นี้ต้องรันใหม่ทุกครั้งที่เพิ่มคำเข้าคลัง เพราะเทสใน content.test.ts
 * จะพังถ้ามีคำที่ยัง `unverified` หลงเหลืออยู่
 *
 * ยิงทีละคำพร้อมหน่วงเวลา เพราะ kaikki.org เป็นบริการฟรีของคนคนเดียว
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORDS_FILE = join(ROOT, "src/content/words.pre-a1.json");
const REVIEW_FILE = join(ROOT, "docs/thai-review.md");

/** หน่วงระหว่างคำ (มิลลิวินาที) */
const DELAY_MS = 250;

/** คำที่สะกดแบบอังกฤษไม่มีหน้าแปลไทย แต่แบบอเมริกันมี */
const ALT_SPELLING = { grey: "gray" };

/** ชนิดคำของเราเทียบกับของ Wiktionary */
const POS_MATCH = {
  noun: ["noun"],
  pronoun: ["pron", "noun"],
  verb: ["verb"],
  // ชื่อสีในไทยเป็นคำนาม ("สีแดง") แม้ในอังกฤษจะเป็นคำคุณศัพท์
  adjective: ["adj", "noun"],
  number: ["num", "noun", "adj"],
  phrase: ["phrase", "intj", "noun"],
};

/**
 * คำที่ของเราไม่ตรงกับพจนานุกรม แต่ตัดสินแล้วว่าใช้ของเราดีกว่าสำหรับเด็ก
 *
 * ทุกบรรทัดต้องมีเหตุผล ถ้าเพิ่มคำใหม่แล้วไม่ตรงพจนานุกรมและยังไม่มีเหตุผล
 * ให้ปล่อยเป็น unverified ไว้ แล้วหาคนตรวจ อย่าใส่ชื่อมาที่นี่เพื่อให้เทสผ่าน
 */
const ADAPTED = {
  "w-sister":
    "ไทยแยกพี่กับน้อง อังกฤษไม่แยก จึงสอนทั้งสองคำพร้อมกันแทนการเลือกข้างเดียว",
  "w-brother":
    "ไทยแยกพี่กับน้อง อังกฤษไม่แยก จึงสอนทั้งสองคำพร้อมกันแทนการเลือกข้างเดียว",
  "w-grandmother": "ไทยแยกฝั่งพ่อกับฝั่งแม่ อังกฤษไม่แยก จึงให้ทั้ง ย่า และ ยาย",
  "w-grandfather": "ไทยแยกฝั่งพ่อกับฝั่งแม่ อังกฤษไม่แยก จึงให้ทั้ง ปู่ และ ตา",
  "w-face":
    "พจนานุกรมให้ หน้า ซึ่งกำกวมมาก (หน้ากระดาษ / ด้านหน้า / ฤดู) ใบหน้า ชัดกว่าสำหรับเด็ก",
  "w-teacher": "ครู คือรูปในพจนานุกรม ส่วน คุณครู คือคำที่เด็กไทยใช้เรียกจริง",
  "w-ball": "บอล เป็นคำทับศัพท์สั้น ลูกบอล เป็นรูปเต็มที่เด็กเล็กคุ้นกว่า",
  "w-bad":
    "พจนานุกรมให้ แย่ / เลว / ชั่ว ซึ่งแรงเกินไปสำหรับเด็ก และบทนี้สอนคู่ตรงข้ามของ ดี จึงใช้ ไม่ดี",
  "w-sleep": "นอน กับ หลับ อยู่ในพจนานุกรมทั้งคู่ นอนหลับ คือรูปประสมที่ใช้ทั่วไป",
  "w-baby": "ทารก อยู่ในพจนานุกรม เด็กทารก เป็นรูปประสมที่ชัดกว่าสำหรับเด็ก",
};

function urlFor(word) {
  const lower = word.toLowerCase();
  return `https://kaikki.org/dictionary/English/meaning/${lower[0]}/${lower.slice(0, 2)}/${encodeURIComponent(lower)}.jsonl`;
}

async function entriesFor(word) {
  const response = await fetch(urlFor(word));
  if (!response.ok) return [];
  const text = await response.text();
  return text
    .trim()
    .split("\n")
    .filter(Boolean)
    .map((line) => JSON.parse(line));
}

async function thaiTranslations(word) {
  let entries = await entriesFor(word.en);
  const alt = ALT_SPELLING[word.en.toLowerCase()];
  if (alt) entries = entries.concat(await entriesFor(alt));

  const found = [];
  for (const entry of entries) {
    for (const t of entry.translations ?? []) {
      if ((t.code === "th" || t.lang === "Thai") && t.word) {
        found.push({ word: t.word, sense: t.sense, pos: entry.pos });
      }
    }
  }
  return found;
}

const words = JSON.parse(readFileSync(WORDS_FILE, "utf8"));
const results = [];

for (const word of words) {
  const found = await thaiTranslations(word);
  const allOptions = [...new Set(found.map((r) => r.word))];
  const wanted = POS_MATCH[word.pos] ?? [];
  const samePos = found.filter((r) => wanted.includes(r.pos));

  // ถือว่าตรงถ้าคำแปลของเราปรากฏใน Wiktionary ไม่ว่าจะอยู่ใต้ชนิดคำไหน
  // เพราะชนิดคำของสองภาษาไม่ตรงกันเสมอไป
  const matched = allOptions.includes(word.th);

  results.push({
    id: word.id,
    en: word.en,
    pos: word.pos,
    ours: word.th,
    matched,
    samePos: samePos.some((r) => r.word === word.th),
    allOptions,
  });

  process.stdout.write(matched ? "." : "!");
  await new Promise((r) => setTimeout(r, DELAY_MS));
}

process.stdout.write("\n");

// ---- เขียนที่มากลับลงคลังคำ โดยแก้ทีละบรรทัดเพื่อรักษาการจัดรูปแบบเดิม ----
const byId = new Map(results.map((r) => [r.id, r]));
const tally = { wiktionary: 0, adapted: 0, unverified: 0 };

const lines = readFileSync(WORDS_FILE, "utf8").split("\n");
const out = lines.map((line) => {
  const match = /"id":\s*"([^"]+)"/.exec(line);
  if (!match) return line;

  const result = byId.get(match[1]);
  if (!result) throw new Error(`ไม่มีผลตรวจของ ${match[1]}`);

  const source = result.matched
    ? "wiktionary"
    : ADAPTED[result.id]
      ? "adapted"
      : "unverified";
  tally[source] += 1;

  return line.includes('"thSource"')
    ? line.replace(/"thSource":\s*"[^"]*"/, `"thSource": "${source}"`)
    : line.replace('"pos"', `"thSource": "${source}", "pos"`);
});

writeFileSync(WORDS_FILE, out.join("\n"));

// ---- รายงานให้คนตรวจ ----
const adapted = results.filter((r) => !r.matched && ADAPTED[r.id]);
const unverified = results.filter((r) => !r.matched && !ADAPTED[r.id]);
const options = (r) =>
  r.allOptions.length ? r.allOptions.map((o) => `\`${o}\``).join(" · ") : "—";

writeFileSync(
  REVIEW_FILE,
  `# สถานะคำแปลไทยของคลังคำ

สร้างด้วย \`npm run check:thai\` — อย่าแก้ไฟล์นี้ด้วยมือ

เทียบคำแปลทั้ง ${results.length} คำกับ [English Wiktionary](https://en.wiktionary.org/)
ผ่านข้อมูลที่สกัดเป็น JSON แล้วของ [kaikki.org](https://kaikki.org/)

| สถานะ | จำนวน | ความหมาย |
|---|---|---|
| \`wiktionary\` | ${tally.wiktionary} | คำแปลของเราปรากฏใน Wiktionary ตรงตัว |
| \`adapted\` | ${tally.adapted} | ต่างจากพจนานุกรมโดยตั้งใจ มีเหตุผลกำกับด้านล่าง |
| \`unverified\` | ${tally.unverified} | ยังไม่มีอะไรรองรับ **ต้องให้คนตรวจ** |

## ที่ปรับถ้อยคำเองโดยตั้งใจ (${adapted.length} คำ)

พจนานุกรมมักให้คำที่เป็นทางการ คำเก่า หรือคำที่กำกวม ซึ่งไม่เหมาะกับเด็ก
รายการนี้คือที่เลือกใช้คำของเราแทน พร้อมเหตุผล — คนตรวจควรอ่านว่าเห็นด้วยไหม

| คำ | ชนิด | ของเรา | พจนานุกรมให้ | เหตุผลที่ไม่ใช้ตามพจนานุกรม |
|---|---|---|---|---|
${adapted.map((r) => `| ${r.en} | ${r.pos} | \`${r.ours}\` | ${options(r)} | ${ADAPTED[r.id]} |`).join("\n")}

## ที่ยังต้องให้คนตรวจ (${unverified.length} คำ)

${
  unverified.length === 0
    ? "ไม่มี — ทุกคำมีพจนานุกรมรองรับหรือมีเหตุผลกำกับแล้ว"
    : `| คำ | ชนิด | ของเรา | พจนานุกรมให้ |
|---|---|---|---|
${unverified.map((r) => `| ${r.en} | ${r.pos} | \`${r.ours}\` | ${options(r)} |`).join("\n")}`
}

## สิ่งที่การตรวจนี้ยัง **ไม่** ครอบคลุม

- **คำอ่าน (IPA)** ยังไม่ได้ตรวจกับแหล่งใด ๆ
- **ประโยคตัวอย่าง** ยังไม่ได้ตรวจเรื่องความเป็นธรรมชาติของภาษา
- ตรงกับพจนานุกรมไม่ได้แปลว่าเหมาะกับเด็กเสมอไป ยังควรมีครูอ่านทั้งชุดอีกรอบ
`,
);

console.log(`wiktionary : ${tally.wiktionary}`);
console.log(`adapted    : ${tally.adapted}`);
console.log(`unverified : ${tally.unverified}`);
if (unverified.length > 0) {
  console.log("ยังต้องตรวจ: " + unverified.map((r) => r.en).join(", "));
  process.exitCode = 1;
}
