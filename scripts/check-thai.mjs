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
const WORDS_FILE = join(ROOT, "src/content/words.json");
const REVIEW_FILE = join(ROOT, "docs/thai-review.md");

/** หน่วงระหว่างคำ (มิลลิวินาที) */
const DELAY_MS = 250;

/**
 * คำที่หน้าของตัวเองไม่มีคำแปลไทย แต่อีกรูปหนึ่งมี
 * grey/gray คือรูปอังกฤษกับอเมริกัน · fridge คือรูปย่อของ refrigerator
 */
const ALT_SPELLING = { grey: "gray", fridge: "refrigerator" };

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

  // ---- คำระดับ A2 ----
  "w-medal":
    "พจนานุกรมให้ เหรียญ ซึ่งซ้ำกับคำ coin ที่มีอยู่แล้วในคลัง เหรียญรางวัล แยกสองคำนี้ออกจากกัน",
  "w-worried":
    "พจนานุกรมให้ ทุกข์ร้อน ที่ worry ซึ่งเป็นภาษาเขียนและหนักกว่า กังวล คือคำที่เด็กใช้จริง",
  "w-surprised":
    "พจนานุกรมให้ ทึ่ง ซึ่งแปลว่าประทับใจ ไม่ใช่ตกใจกับสิ่งที่ไม่คาดคิด ประหลาดใจ ตรงความหมายกว่า",
  "w-thirsty":
    "พจนานุกรมให้ กระหาย เดี่ยว ๆ ซึ่งใช้กับความอยากอย่างอื่นได้ด้วย (กระหายอำนาจ) กระหายน้ำ ชัดว่าอยากดื่มน้ำ",
  "w-relaxed":
    "ผ่อนคลาย เป็นคำแปลของ relax ในพจนานุกรม ส่วนรูป relaxed พจนานุกรมไม่ได้ลงคำแปลไว้",
  "w-empty":
    "พจนานุกรมให้ ว้าง กับ หว่า ซึ่งไม่ใช่รูปมาตรฐานที่เด็กเรียน ว่างเปล่า คือคำที่ใช้กันจริง",
  "w-perfect":
    "พจนานุกรมให้ สมบูรณ์ ซึ่งแปลว่าครบถ้วน ส่วน perfect ที่ใช้ชมงานเด็กคือ สมบูรณ์แบบ",
  "w-useful":
    "พจนานุกรมให้ ประโยชน์ ซึ่งเป็นคำนาม ส่วน useful เป็นคำบอกลักษณะ จึงต้องเป็น มีประโยชน์",

  // ---- คำระดับ A2 ชุดที่สอง ----
  "w-weekday":
    "พจนานุกรมให้ วันทำงาน ซึ่งเด็กจะอ่านว่าเป็นวันที่ผู้ใหญ่ไปทำงาน วันธรรมดา คือคำที่ใช้กับวันเรียน",
  "w-beginning":
    "พจนานุกรมให้ การเริ่ม ซึ่งวางในประโยคไม่ได้ (การเริ่มของเรื่อง) จุดเริ่มต้น เป็นรูปที่ใช้จริง",
  "w-cereal":
    "พจนานุกรมให้ ธัญพืช ซึ่งหมายถึงพืชตระกูลข้าว ไม่ใช่อาหารเช้าในกล่องที่ประโยคนี้พูดถึง",
  "w-cover":
    "พจนานุกรมให้ ฝา ปก กำบัง ซึ่งเป็นคำนามหรือความหมายอื่น ส่วน cover ที่หมายถึงแผ่ปกไปทั่วคือ ปกคลุม",
  "w-apartment":
    "พจนานุกรมให้ อพาร์ทเมนท์ ส่วน อะพาร์ตเมนต์ คือรูปถอดเสียงตามหลักราชบัณฑิตยสภาที่สื่อการสอนควรใช้",

  /**
   * ห้าคำนี้พจนานุกรมไม่ได้ลงคำแปลไทยไว้เลย ไม่ใช่ว่าเราไม่เห็นด้วยกับมัน
   * คำแปลที่ใช้เป็นคำที่ใช้กันทั่วไปและตรงกับประโยคตัวอย่าง
   * แต่ยังควรให้ครูอ่านยืนยันอีกรอบเหมือนคำอื่นในกลุ่มนี้
   */
  "w-tonight": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · คืนนี้ เป็นคำที่ใช้ทั่วไป",
  "w-exam": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · การสอบ เป็นคำที่ใช้ทั่วไป",
  "w-quiz": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · แบบทดสอบ เป็นคำที่ใช้ทั่วไป",
  "w-wonder": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · สงสัย ตรงกับความหมายในประโยค",
  "w-modern": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · ทันสมัย เป็นคำที่ใช้ทั่วไป",

  // ---- คำระดับ A1 ที่คลังเคยขาด ----
  "w-again":
    "พจนานุกรมให้ อีก เดี่ยว ๆ ซึ่งแปลว่าเพิ่มอีกหนึ่ง ส่วน again ที่หมายถึงทำซ้ำคือ อีกครั้ง",
  "w-first":
    "พจนานุกรมให้ ที่หนึ่ง และ อันดับหนึ่ง ซึ่งเป็นการจัดอันดับ ถ้าใช้กับวันจะอ่านเป็นวันที่ 1 ของเดือน จึงใช้ แรก",
  "w-grow":
    "พจนานุกรมให้ โต (ขนาดใหญ่ขึ้น) กับ เพาะ (ภาษาวิชาการ) ส่วนการเอาต้นไม้ลงดินที่เด็กพูดถึงคือ ปลูก",
  "w-outside":
    "พจนานุกรมให้ นอก และ ภายนอก ซึ่งเป็นรูปที่ต้องมีคำอื่นต่อหรือเป็นภาษาเขียน ส่วนคำที่ใช้เดี่ยว ๆ ได้คือ ข้างนอก",
  "w-pocket":
    "พจนานุกรมให้ กระเป๋า ซึ่งซ้ำกับคำ bag ที่มีอยู่แล้วในคลัง กระเป๋าเสื้อ แยกสองคำนี้ออกจากกัน",

  /** สี่คำนี้มีหน้าในพจนานุกรมแต่ไม่มีคำแปลไทยลงไว้เลย (เช็คแล้วด้วยมือ) */
  "w-make": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · ทำ เป็นคำที่ใช้ทั่วไป",
  "w-out": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · ออก ตรงกับความหมายในประโยค",
  "w-photo": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · รูปถ่าย เป็นคำที่ใช้ทั่วไป",
  "w-bright": "พจนานุกรมไม่มีคำแปลไทยของคำนี้ · สว่าง เป็นคำที่ใช้ทั่วไป",
};

/**
 * ที่อยู่ของคำใน kaikki.org — **ตัวพิมพ์เล็กใหญ่มีความหมาย**
 *
 * คำวิสามานยนาม (วันในสัปดาห์ เดือน) อยู่ใต้ตัวพิมพ์ใหญ่: Monday อยู่ที่
 * `/M/Mo/Monday.jsonl` ส่วน `/m/mo/monday.jsonl` คืน 404
 * สคริปต์เดิมแปลงเป็นตัวพิมพ์เล็กก่อนเสมอ จึงรายงานว่าวันกับเดือนทั้ง 19 คำ
 * ไม่มีคำแปลในพจนานุกรม ทั้งที่ `วันจันทร์` อยู่ในนั้นตรง ๆ
 */
function urlFor(word) {
  const first = word[0];
  const prefix = word.slice(0, 2);
  return `https://kaikki.org/dictionary/English/meaning/${first}/${prefix}/${encodeURIComponent(word)}.jsonl`;
}

/**
 * รูปที่ต้องลองหา เรียงจากรูปที่เขียนมาจริงก่อน
 *
 * รวมรูปตัวพิมพ์ใหญ่ด้วย เพราะบางคำมีความหมายที่เราสอนอยู่ใต้รูปวิสามานยนาม:
 * `earth` ให้ `ดิน` (ดินที่ปลูกต้นไม้) แต่ `Earth` ให้ `โลก` (ดาวที่เราอยู่)
 * ซึ่งเป็นความหมายที่บทเรียนเรื่องธรรมชาติต้องการ
 */
function spellingsFor(word) {
  const capitalized = word[0].toUpperCase() + word.slice(1);
  return [...new Set([word, word.toLowerCase(), capitalized])];
}

/** จำนวนครั้งที่ลองใหม่เมื่อโดนปฏิเสธ (kaikki.org จำกัดอัตราการเรียก) */
const RETRIES = 3;

/**
 * ดึงข้อมูลของคำหนึ่ง — แยก "ดึงไม่สำเร็จ" ออกจาก "ไม่มีคำแปล"
 *
 * สองอย่างนี้เคยถูกปนกัน (`if (!response.ok) return []`) ซึ่งเป็นบั๊กที่
 * **ทำข้อมูลเสียเงียบ ๆ**: เน็ตสะดุดหรือโดนจำกัดอัตราครั้งเดียว คำที่เคย
 * ตรวจแล้วจะถูกเขียนทับเป็น unverified ทั้งที่คำแปลไม่ได้เปลี่ยนอะไรเลย
 * เจอจริงตอนนำเข้าคำ A2 — ยิง 418 คำติดกันแล้ววันกับเดือน 19 คำร่วงพร้อมกัน
 *
 * 404 ไม่ใช่ความล้มเหลว — แปลว่าพจนานุกรมไม่มีคำนี้จริง
 */
async function entriesFor(word) {
  let response;

  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      response = await fetch(urlFor(word));
    } catch {
      response = undefined;
    }

    if (response?.ok || response?.status === 404) break;
    // ถอยนานขึ้นทุกครั้ง เพื่อให้ฝั่งบริการได้พัก
    await new Promise((r) => setTimeout(r, 1000 * (attempt + 1)));
  }

  if (!response) return { failed: true, entries: [] };
  if (response.status === 404) return { failed: false, entries: [] };
  if (!response.ok) return { failed: true, entries: [] };

  const text = await response.text();
  return {
    failed: false,
    entries: text
      .trim()
      .split("\n")
      .filter(Boolean)
      .map((line) => JSON.parse(line)),
  };
}

function thaiFrom(entries) {
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

async function thaiTranslations(word) {
  let failed = false;
  let found = [];

  const alt = ALT_SPELLING[word.en.toLowerCase()];
  const candidates = [
    ...spellingsFor(word.en),
    ...(alt ? spellingsFor(alt) : []),
  ];

  for (const spelling of candidates) {
    const result = await entriesFor(spelling);
    failed = failed || result.failed;
    found = found.concat(thaiFrom(result.entries));

    /**
     * หยุดเมื่อ **เจอคำแปลของเราแล้ว** ไม่ใช่แค่เจอคำแปลไทยอะไรก็ได้
     *
     * ที่ต้องเทียบกับคำของเรา เพราะรูปสะกดแรกอาจมีคำแปลไทยอยู่แล้วแต่เป็น
     * ความหมายอื่น: `earth` ให้ `ดิน` ส่วนความหมาย `โลก` อยู่ใต้ `Earth`
     * ถ้าหยุดตอนเจอคำแปลไทยตัวแรก จะไม่ได้ลองรูปที่มีความหมายที่เราสอน
     *
     * คำที่เราเขียนถูกจึงยิงคำขอครั้งเดียวตามเดิม ส่วนคำที่ยังไม่ตรงจะลอง
     * รูปอื่นต่อ ซึ่งเป็นกลุ่มที่เล็กกว่ามาก
     */
    if (found.some((r) => r.word === word.th)) break;
  }

  return { found, failed };
}

const words = JSON.parse(readFileSync(WORDS_FILE, "utf8"));
const results = [];

for (const word of words) {
  const { found, failed } = await thaiTranslations(word);
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
    failed,
    samePos: samePos.some((r) => r.word === word.th),
    allOptions,
  });

  process.stdout.write(failed ? "?" : matched ? "." : "!");
  await new Promise((r) => setTimeout(r, DELAY_MS));
}

process.stdout.write("\n");

// ---- เขียนที่มากลับลงคลังคำ โดยแก้ทีละบรรทัดเพื่อรักษาการจัดรูปแบบเดิม ----
const byId = new Map(results.map((r) => [r.id, r]));
const tally = { wiktionary: 0, adapted: 0, unverified: 0, failed: 0 };

const lines = readFileSync(WORDS_FILE, "utf8").split("\n");
const out = lines.map((line) => {
  const match = /"id":\s*"([^"]+)"/.exec(line);
  if (!match) return line;

  const result = byId.get(match[1]);
  if (!result) throw new Error(`ไม่มีผลตรวจของ ${match[1]}`);

  /**
   * ดึงข้อมูลไม่สำเร็จ → ไม่แตะบรรทัดนั้นเลย
   *
   * เก็บค่าที่ตรวจไว้แล้วดีกว่าเขียนทับด้วยผลที่เราไม่ได้ตรวจจริง
   * เพราะ unverified ที่เกิดจากเน็ตสะดุดจะทำให้เทสพัง และคนที่มาแก้
   * จะไปแก้คำแปลที่ถูกอยู่แล้ว
   */
  if (result.failed) {
    tally.failed += 1;
    return line;
  }

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
// คำที่ดึงข้อมูลไม่สำเร็จไม่เข้ารายงานทั้งสองกลุ่ม เพราะเรายังไม่รู้ผลของมัน
const adapted = results.filter(
  (r) => !r.failed && !r.matched && ADAPTED[r.id],
);
const unverified = results.filter(
  (r) => !r.failed && !r.matched && !ADAPTED[r.id],
);
const unreachable = results.filter((r) => r.failed);
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

- **คำอ่าน (IPA)** ตรวจแยกด้วย \`npm run check:ipa\` (ดู docs/ipa-review.md)
- **ประโยคตัวอย่าง** ยังไม่ได้ตรวจเรื่องความเป็นธรรมชาติของภาษา
- ตรงกับพจนานุกรมไม่ได้แปลว่าเหมาะกับเด็กเสมอไป ยังควรมีครูอ่านทั้งชุดอีกรอบ
`,
);

console.log(`wiktionary : ${tally.wiktionary}`);
console.log(`adapted    : ${tally.adapted}`);
console.log(`unverified : ${tally.unverified}`);
console.log(`ดึงไม่สำเร็จ : ${tally.failed}`);

if (unreachable.length > 0) {
  console.log(
    "\nดึงข้อมูลไม่สำเร็จ (ค่าเดิมในไฟล์ถูกเก็บไว้ ไม่ได้เขียนทับ): " +
      unreachable.map((r) => r.en).join(", "),
  );
  console.log("รันซ้ำอีกครั้งเพื่อตรวจคำกลุ่มนี้");
  process.exitCode = 1;
}

if (unverified.length > 0) {
  console.log("\nยังต้องตรวจ: " + unverified.map((r) => r.en).join(", "));
  process.exitCode = 1;
}
