/**
 * ตรวจคำแปลไทย "ย้อนทาง" — คำไทยคำนี้ แปลกลับเป็นอังกฤษแล้วได้คำเดิมไหม
 *
 * `check:thai` ตรวจทางเดียว: ยิงคำอังกฤษไปที่พจนานุกรม แล้วดูว่าคำแปลไทย
 * ของเราอยู่ในรายการคำแปลของมันไหม ด่านนั้นจับไม่ได้เวลาคำแปล "อยู่ในรายการ
 * จริง แต่เป็นความหมายคนละอัน" เพราะรายการคำแปลรวมทุกความหมายของคำนั้นไว้
 * ด้วยกัน เช่น radiator ให้ "รังผึ้ง" มาด้วย ซึ่งอยู่ในรายการจริง
 *
 * สคริปต์นี้ยิงกลับทางจากคำไทย สามแหล่ง
 *   1. en.wiktionary หน้าของคำไทยเอง — คนละหน้ากับตารางคำแปลที่ check:thai
 *      ใช้ และคนเขียนคนละกลุ่ม จึงเป็นการตรวจคนละทาง **แต่ยังเป็นโครงการ
 *      เดียวกัน ไม่ใช่แหล่งอิสระ** อย่านับว่าเป็นการยืนยันจากสองแหล่ง
 *   2. th.wiktionary — คนละโครงการจริง นิยามเป็นภาษาไทย เครื่องเทียบให้ไม่ได้
 *      เก็บแค่ว่ามีหน้าหรือไม่ ไว้ให้คนตามไปอ่านเอง
 *   3. th.wikipedia แล้วตามลิงก์ข้ามภาษาไปอังกฤษ — ใช้ได้กับคำนามรูปธรรม
 *
 * **นี่ไม่ใช่ด่านที่ผ่านหรือไม่ผ่าน** คำแปลไทยจำนวนมากเป็นคำประสมที่ไม่มี
 * หน้าในพจนานุกรมเล่มไหน (เช่น "พี่สาวหรือน้องสาว") การไม่มีข้อมูลไม่ได้แปลว่า
 * คำแปลผิด สคริปต์จึงออกรายงานให้คนอ่าน ไม่ได้ตั้ง exit code ให้ CI ฟ้อง
 *
 * ยิงทีละ 40 ชื่อเรื่องต่อหนึ่งคำขอ เพราะยิงทีละคำจะโดน
 * "You are making too many requests" แล้วได้ผลเป็นศูนย์ปลอม ๆ
 */
import { readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORDS_FILE = join(ROOT, "src/content/words.json");
const REPORT_FILE = join(ROOT, "docs/thai-reverse-check.md");

const UA = {
  "User-Agent": "LinguaKids-content-check/1.0 (educational content QA; node)",
};
const CHUNK = 40;
const PAUSE_MS = 2500;
const RETRIES = 6;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

async function api(host, params) {
  const url =
    `https://${host}/w/api.php?format=json&formatversion=2&` +
    new URLSearchParams(params).toString();

  for (let attempt = 0; attempt < RETRIES; attempt += 1) {
    try {
      const response = await fetch(url, { headers: UA });
      if (response.ok) {
        const text = await response.text();
        if (text.startsWith("{")) return JSON.parse(text);
      }
    } catch {
      // ลองใหม่ด้านล่าง
    }
    // รอนานขึ้นเรื่อย ๆ เพราะตัวที่ฟ้องคือ "ยิงถี่เกินไป" ไม่ใช่เน็ตหลุด
    await sleep(5000 * (attempt + 1));
  }

  /*
   * ยอมให้ทั้งรอบล้มดีกว่าเขียนรายงานที่ขาดไปเงียบ ๆ
   * ถ้ารายงานบอกว่า "ยืนยันไม่ได้" ทั้งที่จริงแค่ยิงไม่ถึง จะเข้าใจผิดหนักกว่า
   */
  throw new Error(`ยิง API ไม่สำเร็จหลังลอง ${RETRIES} ครั้ง: ${host}`);
}

/** คืน Map ชื่อเรื่องที่ขอ -> ผลลัพธ์ โดยตามรีไดเรกต์ให้ด้วย */
async function batch(host, titles, kind) {
  const out = new Map();

  for (let i = 0; i < titles.length; i += CHUNK) {
    const slice = titles.slice(i, i + CHUNK);
    const json = await api(host, {
      action: "query",
      redirects: "1",
      titles: slice.join("|"),
      ...kind.params,
    });

    const byTitle = new Map((json.query?.pages ?? []).map((p) => [p.title, p]));
    const redirect = new Map(
      (json.query?.redirects ?? []).map((r) => [r.from, r.to]),
    );
    const normalized = new Map(
      (json.query?.normalized ?? []).map((n) => [n.from, n.to]),
    );

    for (const asked of slice) {
      let title = normalized.get(asked) ?? asked;
      title = redirect.get(title) ?? title;
      out.set(asked, kind.read(byTitle.get(title)));
    }

    process.stdout.write(".");
    await sleep(PAUSE_MS);
  }

  return out;
}

const CONTENT = {
  params: { prop: "revisions", rvprop: "content", rvslots: "main" },
  read: (page) => page?.revisions?.[0]?.slots?.main?.content ?? null,
};
const LANGLINK = {
  params: { prop: "langlinks", lllang: "en", lllimit: "1" },
  read: (page) => page?.langlinks?.[0]?.title ?? null,
};

/** บรรทัดนิยามของหมวด ==Thai== แปลงเป็นข้อความล้วน */
function thaiGlosses(text) {
  if (!text) return [];

  const start = text.indexOf("==Thai==");
  if (start < 0) return [];

  const rest = text.slice(start + "==Thai==".length);
  const end = rest.search(/\n==[^=]/);
  const section = end < 0 ? rest : rest.slice(0, end);

  return section
    .split("\n")
    .filter((line) => /^#[^:*]/.test(line))
    .map((line) =>
      line
        .replace(/^#\s*/, "")
        .replace(/\{\{[^{}]*\}\}/g, " ")
        .replace(/\[\[([^\]|]*)\|([^\]]*)\]\]/g, "$2")
        .replace(/\[\[([^\]]*)\]\]/g, "$1")
        .replace(/''+/g, "")
        .replace(/\s+/g, " ")
        .trim(),
    )
    .filter(Boolean);
}

const words = JSON.parse(readFileSync(WORDS_FILE, "utf8"));
const titles = [...new Set(words.map((word) => word.th))];

console.log(`ตรวจ ${words.length} คำ (${titles.length} คำแปลไทยไม่ซ้ำ)`);
process.stdout.write("en.wiktionary ");
const enWikt = await batch("en.wiktionary.org", titles, CONTENT);
process.stdout.write("\nth.wiktionary ");
const thWikt = await batch("th.wiktionary.org", titles, CONTENT);
process.stdout.write("\nth.wikipedia  ");
const wiki = await batch("th.wikipedia.org", titles, LANGLINK);
process.stdout.write("\n");

const rows = words.map((word) => {
  const gloss = thaiGlosses(enWikt.get(word.th));
  const link = wiki.get(word.th);
  const needle = word.en.toLowerCase();

  /*
   * เทียบแบบตัดเป็นคำ ๆ แทนการใช้ขอบคำ \b ในนิพจน์ปกติ
   * เพื่อไม่ให้ "cat" ไปตรงกับ "category" และไม่ต้องพึ่ง escape
   *
   * คำหัวที่มีช่องว่าง (ตอนนี้มีคำเดียวคือ "ice cream") จะไม่มีวันตรงกับ
   * โทเคนคำเดี่ยว จึงเทียบเป็นข้อความตรง ๆ โดยดูขอบด้วยช่องว่างแทน
   */
  const text = ` ${gloss.join(" ; ").toLowerCase()} `;
  const tokens = new Set(text.split(/[^a-z-]+/));
  const found = needle.includes(" ")
    ? text.includes(` ${needle} `) ||
      text.includes(` ${needle}.`) ||
      text.includes(` ${needle};`)
    : tokens.has(needle);

  return {
    en: word.en,
    th: word.th,
    cefr: word.cefr,
    thSource: word.thSource,
    hitGloss: found,
    hitWiki: link ? link.toLowerCase().includes(needle) : false,
    hasThWikt: Boolean(thWikt.get(word.th)),
    gloss,
    wiki: link,
  };
});

const confirmed = rows.filter((r) => r.hitGloss || r.hitWiki);
/** มีคำแปลกลับ แต่ไม่มีคำของเราอยู่ในนั้น — กลุ่มที่ต้องให้คนอ่าน */
const mismatch = rows.filter(
  (r) => !r.hitGloss && !r.hitWiki && r.gloss.length > 0,
);
/** ไม่มีหน้าคำไทยนี้เลย — ไม่มีข้อมูล ไม่ใช่ผิด */
const noData = rows.filter(
  (r) => !r.hitGloss && !r.hitWiki && r.gloss.length === 0,
);

const LEVELS = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"];
const perLevel = LEVELS.map((level) => {
  const all = rows.filter((r) => r.cefr === level);
  const ok = all.filter((r) => r.hitGloss || r.hitWiki);
  const pct = all.length ? Math.round((ok.length / all.length) * 100) : 0;
  return `| ${level} | ${all.length} | ${ok.length} | ${pct}% |`;
}).join("\n");

const report = `# ตรวจคำแปลไทยย้อนทาง

สร้างด้วย \`npm run check:thai-back\` — อย่าแก้ไฟล์นี้ด้วยมือ

\`check:thai\` ถามว่า "คำแปลไทยของเราอยู่ในรายการคำแปลของคำอังกฤษนี้ไหม"
ไฟล์นี้ถามกลับทางว่า **"คำไทยคำนี้ แปลกลับเป็นอังกฤษแล้วได้คำเดิมไหม"**
เพราะรายการคำแปลของคำอังกฤษหนึ่งคำรวมทุกความหมายไว้ด้วยกัน คำแปลที่
"อยู่ในรายการจริงแต่เป็นความหมายคนละอัน" จึงผ่านด่านเดิมไปได้

สามแหล่งที่ใช้

1. **en.wiktionary หน้าของคำไทยเอง** — คนละหน้าและคนละกลุ่มผู้เขียนกับตาราง
   คำแปลที่ \`check:thai\` ใช้ แต่ **ยังเป็นโครงการเดียวกัน ไม่ใช่แหล่งอิสระ**
2. **th.wiktionary** — คนละโครงการ นิยามเป็นภาษาไทย เครื่องเทียบให้ไม่ได้
   รายงานแค่ว่ามีหน้าหรือไม่ ไว้ให้คนตามไปอ่าน
3. **th.wikipedia** แล้วตามลิงก์ข้ามภาษาไปอังกฤษ — ใช้ได้กับคำนามรูปธรรม

**ไม่ใช่ด่านที่ผ่านหรือไม่ผ่าน** คำแปลหลายคำเป็นคำประสมที่ไม่มีหน้าใน
พจนานุกรมเล่มไหน การไม่มีข้อมูลไม่ได้แปลว่าคำแปลผิด

## สรุป

| สถานะ | จำนวน |
|---|---|
| ยืนยันได้จากการแปลกลับ | ${confirmed.length} |
| มีคำแปลกลับ แต่ไม่ตรงกับคำของเรา — **ต้องให้คนอ่าน** | ${mismatch.length} |
| ไม่มีหน้าคำไทยนี้ใน en.wiktionary — ไม่มีข้อมูล | ${noData.length} |
| รวม | ${rows.length} |

แยกตามระดับ

| ระดับ | คำ | ยืนยันได้ | สัดส่วน |
|---|---|---|---|
${perLevel}

## มีคำแปลกลับ แต่ไม่ตรงกับคำของเรา (${mismatch.length} คำ)

คำกลุ่มนี้ **ส่วนใหญ่ไม่ได้ผิด** — เป็นคำพ้องความหมายที่พจนานุกรมเลือกใช้
คำอังกฤษอีกคำอธิบาย (เช่น baby อธิบายด้วย infant) แต่กลุ่มนี้คือกลุ่มที่
คนต้องอ่านเอง เพราะคำที่ผิดจริงจะซ่อนอยู่ในนี้

| คำ | ระดับ | ที่มา | คำแปลของเรา | แปลกลับได้ |
|---|---|---|---|---|
${mismatch
  .map(
    (r) =>
      `| ${r.en} | ${r.cefr} | ${r.thSource} | \`${r.th}\` | ${r.gloss
        .join(" · ")
        .slice(0, 110)} |`,
  )
  .join("\n")}

## ไม่มีหน้าคำไทยนี้ใน en.wiktionary (${noData.length} คำ)

ตรวจด้วยวิธีนี้ไม่ได้ ไม่ได้แปลว่าผิด — ส่วนใหญ่เป็นคำประสม
เครื่องหมาย \`*\` คือมีหน้าใน th.wiktionary ให้คนตามไปอ่านได้
(${noData.filter((r) => r.hasThWikt).length} คำ)

${noData.map((r) => `${r.en}=${r.th}${r.hasThWikt ? "*" : ""}`).join(" · ")}
`;

writeFileSync(REPORT_FILE, report);

console.log(`\nยืนยันได้          : ${confirmed.length} / ${rows.length}`);
console.log(`  จากหน้าคำไทย     : ${rows.filter((r) => r.hitGloss).length}`);
console.log(`  จากลิงก์วิกิพีเดีย : ${rows.filter((r) => r.hitWiki).length}`);
console.log(`ต้องให้คนอ่าน      : ${mismatch.length}`);
console.log(`ไม่มีข้อมูล        : ${noData.length}`);
console.log(`เขียนรายงานที่     : docs/thai-reverse-check.md`);
