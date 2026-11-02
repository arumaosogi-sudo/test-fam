/**
 * ตรวจคำอ่าน IPA ของคลังคำกับพจนานุกรมเปิด แล้วเขียนค่าที่ได้กลับลงคลังคำ
 *
 *   npm run check:ipa          เขียนทับคำอ่านด้วยค่าจากพจนานุกรม
 *   npm run check:ipa -- --dry ดูผลอย่างเดียว ไม่เขียนไฟล์
 *
 * ใช้ English Wiktionary ผ่าน kaikki.org เหมือน check-thai.mjs (ดู ADR-0007)
 *
 * **เลือกสำเนียง General American โดยตั้งใจ** เพราะเสียงอ่านในแอปตั้งเป็น en-US
 * ถ้าคำอ่านที่เขียนไว้เป็นสำเนียงอังกฤษแต่เครื่องอ่านออกเสียงแบบอเมริกัน
 * เด็กจะเห็นสัญลักษณ์อย่างหนึ่งแต่ได้ยินอีกอย่างหนึ่ง ซึ่งแย่กว่าไม่มีคำอ่านเลย
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORDS_FILE = join(ROOT, "src/content/words.json");
const REPORT_FILE = join(ROOT, "docs/ipa-review.md");

const DRY = process.argv.includes("--dry");
const DELAY_MS = 250;

/** แท็กที่นับว่าเป็นสำเนียงอเมริกันมาตรฐาน */
/**
 * นับเฉพาะแท็กที่หมายถึงสำเนียงอเมริกันมาตรฐานจริง ๆ
 * ไม่เอา "US" ลอย ๆ เพราะ Wiktionary ใช้แท็กนั้นกับเสียงถิ่นในอเมริกาด้วย
 * (yellow มี /ˈjæl.ə/ และ /ˈjɪlə/ ติดแท็ก US เหมือนกัน)
 */
const GA_TAGS = new Set(["General-American", "GenAm", "General-American-English"]);

/** แท็กที่บอกว่าเป็นเสียงของอเมริกาเหนือ ใช้เป็นตัวสำรองเมื่อไม่มี General-American */
const NORTH_AMERICAN_TAGS = new Set(["US", "American", "Canada", "Canadian"]);

/**
 * แท็กที่เป็นสำเนียงย่อยหรือเงื่อนไขพิเศษ — เลี่ยงถ้ามีตัวเลือกที่สะอาดกว่า
 * เช่น cot-caught-merger เป็นการออกเสียงของคนบางกลุ่มเท่านั้น
 *
 * ไม่รวม Canada เพราะ Wiktionary ติดแท็ก [Canada, General-American] ให้เสียง
 * มาตรฐานของอเมริกาเหนือทั่วไป ไม่ใช่เสียงถิ่น ถ้าตัดออกจะเสียคำที่ถูกไปเยอะ
 */
const NARROW_TAGS = new Set([
  "cot-caught-merger",
  "New-England",
  "New-York-City",
  "Pennsylvania",
  "Western",
  "obsolete",
  "dated",
  "nonstandard",
  "Southern-US",
  "East-Coast",
  "colloquial",
  "dialectal",
  "regional",
  "informal",
]);

/**
 * นับร่องรอยที่บอกว่าเป็นสำเนียงอังกฤษ ยิ่งมากยิ่งไม่ใช่ที่เราต้องการ
 *
 * สระ əʊ ɜː ɑː ɒ ไม่มีในสำเนียงอเมริกันมาตรฐาน ส่วน tj dj nj คือการคง
 * เสียง y หลังพยัญชนะ (tune, duty, news) ซึ่งอเมริกันตัดทิ้ง
 */
function rpScore(ipa) {
  return ["əʊ", "ɜː", "ɑː", "ɒ", "tj", "dj", "nj"].filter((mark) =>
    ipa.includes(mark),
  ).length;
}

function urlFor(word) {
  const l = word.toLowerCase();
  return `https://kaikki.org/dictionary/English/meaning/${l[0]}/${l.slice(0, 2)}/${encodeURIComponent(l)}.jsonl`;
}

/** รับเฉพาะคำอ่านเต็มคำในเครื่องหมาย / / ไม่เอาเศษคำอย่าง /ˈwɒ-/ */
function usable(ipa) {
  if (!ipa?.startsWith("/") || !ipa.endsWith("/") || ipa.length < 4) return false;
  const inner = ipa.slice(1, -1);
  return !inner.startsWith("-") && !inner.endsWith("-");
}

async function soundsFor(word) {
  const response = await fetch(urlFor(word));
  if (!response.ok) return [];

  const text = await response.text();
  const out = [];
  for (const line of text.trim().split("\n").filter(Boolean)) {
    const entry = JSON.parse(line);
    for (const sound of entry.sounds ?? []) {
      if (usable(sound.ipa)) out.push({ ipa: sound.ipa, tags: sound.tags ?? [] });
    }
  }
  return out;
}

/**
 * เลือกคำอ่านที่ดีที่สุด
 *
 * กติกา: ต้องติดแท็ก General-American จริง ๆ แล้วเอา **ตัวแรกตามลำดับในหน้า**
 * เพราะ Wiktionary เรียงเสียงมาตรฐานไว้ก่อนเสียงถิ่น
 *
 * เคยลองเรียงตาม จำนวนแท็กน้อยสุด แล้วได้ของผิด — yellow ได้ /ˈjɛlə/ ที่ติดแท็ก
 * [US] อย่างเดียว ชนะ /ˈjɛloʊ/ ที่ติด [General-American,US] และ bear ได้เสียงของ
 * beer มา จำนวนแท็กไม่ได้บอกว่าเสียงไหนมาตรฐานกว่ากัน
 */
function pick(sounds) {
  const american = sounds.filter(
    (s) =>
      s.tags.some((t) => GA_TAGS.has(t)) &&
      !s.tags.some((t) => NARROW_TAGS.has(t)),
  );
  if (american.length > 0) {
    return {
      ipa: american[0].ipa,
      accent: "general-american",
      tags: american[0].tags,
    };
  }

  // ไม่มีแท็ก General-American — เอาที่ระบุว่าเป็นอเมริกาเหนือก่อน
  // ต้องมาก่อน "ไม่ระบุสำเนียง" เพราะรายการที่ไม่ระบุมักเป็นเสียงถิ่น
  // (blue เคยได้ /blɪʊ̯/ จากรายการไม่ระบุ ทั้งที่มี /blu/ ติดแท็ก [Canada, US] อยู่)
  const northAmerican = sounds.filter(
    (s) =>
      s.tags.some((t) => NORTH_AMERICAN_TAGS.has(t)) &&
      !s.tags.some((t) => NARROW_TAGS.has(t)),
  );
  if (northAmerican.length > 0) {
    return {
      ipa: northAmerican[0].ipa,
      accent: "north-american",
      tags: northAmerican[0].tags,
    };
  }

  // รายการที่ไม่ระบุสำเนียงมักมีหลายตัวปนกัน เอาตัวที่ไม่มีร่องรอยสำเนียงอังกฤษ
  // (student มีทั้ง /ˈstjuː.dn̩t/ แบบอังกฤษ และ /ˈstu.dn̩t/ แบบอเมริกัน
  //  โดยไม่ติดแท็กทั้งคู่ ถ้าเอาตัวแรกเฉย ๆ จะได้แบบอังกฤษมา)
  const neutral = sounds.filter((s) => s.tags.length === 0);
  if (neutral.length > 0) {
    const best = [...neutral].sort((a, b) => rpScore(a.ipa) - rpScore(b.ipa))[0];
    return { ipa: best.ipa, accent: "unmarked", tags: [] };
  }

  const wide = sounds.filter((s) => !s.tags.some((t) => NARROW_TAGS.has(t)));
  const pool = wide.length > 0 ? wide : sounds;
  if (pool.length > 0) {
    return { ipa: pool[0].ipa, accent: "other", tags: pool[0].tags };
  }
  return null;
}

const words = JSON.parse(readFileSync(WORDS_FILE, "utf8"));
const results = [];

for (const word of words) {
  let chosen = null;
  try {
    chosen = pick(await soundsFor(word.en));
  } catch {
    chosen = null;
  }

  results.push({
    id: word.id,
    en: word.en,
    ours: word.ipa,
    chosen: chosen?.ipa ?? null,
    accent: chosen?.accent ?? null,
    tags: chosen?.tags ?? [],
    same: chosen?.ipa === word.ipa,
  });

  process.stdout.write(chosen ? (chosen.accent === "general-american" ? "." : "~") : "!");
  await new Promise((r) => setTimeout(r, DELAY_MS));
}

process.stdout.write("\n");

const found = results.filter((r) => r.chosen);
const american = found.filter((r) => r.accent === "general-american");
const missing = results.filter((r) => !r.chosen);
const changed = found.filter((r) => !r.same);

if (!DRY) {
  const byId = new Map(results.map((r) => [r.id, r]));
  const lines = readFileSync(WORDS_FILE, "utf8").split("\n");

  const out = lines.map((line) => {
    const match = /"id":\s*"([^"]+)"/.exec(line);
    if (!match) return line;

    const result = byId.get(match[1]);
    if (!result) throw new Error(`ไม่มีผลตรวจของ ${match[1]}`);

    const source = result.chosen ? "wiktionary" : "unverified";
    let next = line;

    if (result.chosen) {
      next = next.replace(/"ipa":\s*"[^"]*"/, `"ipa": ${JSON.stringify(result.chosen)}`);
    }
    next = next.includes('"ipaSource"')
      ? next.replace(/"ipaSource":\s*"[^"]*"/, `"ipaSource": "${source}"`)
      : next.replace('"ipa"', `"ipaSource": "${source}", "ipa"`);

    return next;
  });

  writeFileSync(WORDS_FILE, out.join("\n"));
}

const rows = changed
  .map((r) => `| ${r.en} | \`${r.ours}\` | \`${r.chosen}\` | ${r.tags.join(", ") || "—"} |`)
  .join("\n");

writeFileSync(
  REPORT_FILE,
  `# คำอ่าน IPA ที่ตรวจกับพจนานุกรม

สร้างด้วย \`npm run check:ipa\` — อย่าแก้ไฟล์นี้ด้วยมือ

เทียบคำอ่านทั้ง ${results.length} คำกับ [English Wiktionary](https://en.wiktionary.org/)
ผ่าน [kaikki.org](https://kaikki.org/)

**เลือกสำเนียง General American** เพราะเสียงอ่านในแอปตั้งเป็น \`en-US\`
ถ้าคำอ่านเป็นสำเนียงอังกฤษแต่เครื่องอ่านออกเสียงแบบอเมริกัน เด็กจะเห็น
สัญลักษณ์อย่างหนึ่งแต่ได้ยินอีกอย่างหนึ่ง

| สถานะ | จำนวน |
|---|---|
| มีคำอ่านสำเนียงอเมริกัน | ${american.length} |
| มีคำอ่านแต่ไม่ระบุสำเนียงอเมริกัน | ${found.length - american.length} |
| พจนานุกรมไม่มีคำอ่าน | ${missing.length} |
| ค่าที่เปลี่ยนจากของเดิม | ${changed.length} |

${missing.length > 0 ? `## คำที่พจนานุกรมไม่มีคำอ่าน\n\n${missing.map((r) => `- ${r.en} (คงค่าเดิม \`${r.ours}\`)`).join("\n")}\n` : ""}
## ค่าที่เปลี่ยน (${changed.length} คำ)

| คำ | ของเดิม | ที่ใช้ตอนนี้ | สำเนียงที่พจนานุกรมระบุ |
|---|---|---|---|
${rows}
`,
);

console.log(`สำเนียงอเมริกัน      : ${american.length}`);
console.log(`มีคำอ่านแต่สำเนียงอื่น: ${found.length - american.length}`);
console.log(`พจนานุกรมไม่มีคำอ่าน : ${missing.length}${missing.length ? " -> " + missing.map((r) => r.en).join(", ") : ""}`);
console.log(`เปลี่ยนจากของเดิม    : ${changed.length}`);
if (DRY) console.log("(--dry ไม่ได้เขียนไฟล์คลังคำ)");
