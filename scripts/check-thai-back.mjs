/**
 * ตรวจคำแปลไทย "ย้อนทาง" — คำไทยคำนี้ แปลกลับเป็นอังกฤษแล้วได้คำเดิมไหม
 *
 * `check:thai` ตรวจทางเดียว: ยิงคำอังกฤษไปที่พจนานุกรม แล้วดูว่าคำแปลไทย
 * ของเราอยู่ในรายการคำแปลของมันไหม ด่านนั้นจับไม่ได้เวลาคำแปล "อยู่ในรายการ
 * จริง แต่เป็นความหมายคนละอัน" เพราะรายการคำแปลของคำอังกฤษหนึ่งคำรวมทุก
 * ความหมายไว้ด้วยกัน เช่น radiator ให้ "รังผึ้ง" มาด้วย ซึ่งอยู่ในรายการจริง
 *
 * สคริปต์นี้ยิงกลับทางจากคำไทย สี่แหล่ง
 *
 *   1. **Thai WordNet (NICT)** ผ่าน Open Multilingual Wordnet — ต่อคำอังกฤษ
 *      กับคำไทยผ่านรหัส synset ของ Princeton WordNet **เป็นแหล่งอิสระจริง**
 *      คนละโครงการ คนละวิธีทำ กับพจนานุกรมที่ใช้สร้างเนื้อหา
 *   2. en.wiktionary หน้าของคำไทยเอง — คนละหน้าและคนละกลุ่มผู้เขียนกับตาราง
 *      คำแปลที่ `check:thai` ใช้ แต่ **ยังเป็นโครงการเดียวกัน ไม่ใช่แหล่งอิสระ**
 *   3. th.wikipedia แล้วตามลิงก์ข้ามภาษาไปอังกฤษ — ใช้ได้กับคำนามรูปธรรม
 *   4. th.wiktionary — คนละโครงการ นิยามเป็นภาษาไทย เครื่องเทียบให้ไม่ได้
 *      รายงานแค่ว่ามีหน้าหรือไม่ ไว้ให้คนตามไปอ่าน
 *
 * **ไม่ใช่ด่านที่ผ่านหรือไม่ผ่าน** คำแปลไทยจำนวนมากเป็นคำประสมที่ไม่มีหน้าใน
 * พจนานุกรมเล่มไหน (เช่น "พี่สาวหรือน้องสาว") การไม่มีข้อมูลไม่ได้แปลว่า
 * คำแปลผิด สคริปต์จึงออกรายงานให้คนอ่าน ไม่ได้ตั้ง exit code ให้ CI ฟ้อง
 *
 * ยิง MediaWiki ทีละ 40 ชื่อเรื่องต่อหนึ่งคำขอ เพราะยิงทีละคำจะโดน
 * "You are making too many requests" แล้วได้ผลเป็นศูนย์ปลอม ๆ
 *
 * ไฟล์ WordNet สองไฟล์ (รวม 11 MB) เก็บไว้ใน .cache/ ซึ่งไม่เข้า repo
 * เพราะเป็นข้อมูลของคนอื่นและโหลดใหม่ได้เสมอ
 */
import { existsSync, mkdirSync, readFileSync, writeFileSync } from "node:fs";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const ROOT = join(dirname(fileURLToPath(import.meta.url)), "..");
const WORDS_FILE = join(ROOT, "src/content/words.json");
const REPORT_FILE = join(ROOT, "docs/thai-reverse-check.md");
const CACHE_DIR = join(ROOT, ".cache/omw");

const OMW = "https://raw.githubusercontent.com/omwn/omw-data/main/wns";
const OMW_FILES = {
  "wn-data-eng.tab": `${OMW}/eng/wn-data-eng.tab`,
  "wn-data-tha.tab": `${OMW}/tha/wn-data-tha.tab`,
};

const UA = {
  "User-Agent": "LinguaKids-content-check/1.0 (educational content QA; node)",
};
const CHUNK = 40;
const PAUSE_MS = 2500;
const RETRIES = 6;

/** Wikidata ยิงเป็นชุดใหญ่กว่าได้ เพราะส่งด้วย POST ไม่ติดเพดานความยาว URL */
const WD_CHUNK = 120;
const WD_PAUSE_MS = 2000;

const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

// ---------------------------------------------------------------- WordNet --

async function omwFile(name) {
  const path = join(CACHE_DIR, name);
  if (existsSync(path)) return readFileSync(path, "utf8");

  mkdirSync(CACHE_DIR, { recursive: true });
  const response = await fetch(OMW_FILES[name], { headers: UA });
  if (!response.ok) throw new Error(`โหลด ${name} ไม่สำเร็จ: ${response.status}`);

  const text = await response.text();
  writeFileSync(path, text);
  return text;
}

/** รหัส synset -> รายการคำของภาษานั้น */
function synsetLemmas(text) {
  const bySynset = new Map();

  for (const line of text.split("\n")) {
    if (!line || line.startsWith("#")) continue;
    const [synset, field, lemma] = line.split("\t");
    if (!synset || !lemma || !field?.endsWith("lemma")) continue;

    const list = bySynset.get(synset);
    if (list) list.push(lemma.trim());
    else bySynset.set(synset, [lemma.trim()]);
  }

  return bySynset;
}

/** คำอังกฤษ -> ชุดคำไทยที่อยู่ใน synset เดียวกัน */
async function wordnetIndex() {
  const english = synsetLemmas(await omwFile("wn-data-eng.tab"));
  const thai = synsetLemmas(await omwFile("wn-data-tha.tab"));
  const index = new Map();

  for (const [synset, lemmas] of english) {
    const thaiLemmas = thai.get(synset);
    if (!thaiLemmas) continue;

    for (const lemma of lemmas) {
      const key = lemma.toLowerCase().replace(/_/g, " ");
      let set = index.get(key);
      if (!set) index.set(key, (set = new Set()));
      for (const word of thaiLemmas) set.add(word);
    }
  }

  return index;
}

// ---------------------------------------------------------------- Wikidata --

/**
 * ถามชื่อภาษาอังกฤษของสิ่งที่ Wikidata เรียกด้วยคำไทยนี้
 *
 * เอาทั้งชื่อหลักและชื่อพ้องของทั้งสองภาษา เพราะหลายรายการตั้งชื่อหลัก
 * เป็นชื่อวิทยาศาสตร์ (ปวยเล้ง -> Spinacia oleracea) แล้วเก็บ spinach
 * ไว้เป็นชื่อพ้อง ถ้าดูแต่ชื่อหลักจะพลาด
 *
 * ครอบคลุมได้เฉพาะคำนามและสิ่งที่เป็น "สิ่งของ" เพราะ Wikidata เป็น
 * ฐานข้อมูลของสิ่งต่าง ๆ ไม่ใช่พจนานุกรม คำกริยากับคำบอกลักษณะแทบไม่มี
 *
 * ส่งด้วย POST เพราะ VALUES ที่ยาวเกินไปทำให้ GET ได้ 414 URI Too Long
 * และต้องส่งแบบ form-urlencoded ไม่ใช่ `application/sparql-query` —
 * แบบหลัง WDQS ตอบ 200 กลับมาพร้อมผลลัพธ์ว่างเปล่าโดยไม่ฟ้องอะไรเลย
 * รอบแรกจึงรายงานว่า Wikidata ยืนยันได้ 0 คำ ทั้งที่ยิงแบบ GET ได้ผลปกติ
 */
async function wikidataLabels(titles) {
  const out = new Map();

  for (let i = 0; i < titles.length; i += WD_CHUNK) {
    const slice = titles.slice(i, i + WD_CHUNK);
    const values = slice
      .map((t) => `"${t.replace(/["\\]/g, "")}"@th`)
      .join(" ");
    const query = `SELECT DISTINCT ?th ?en WHERE {
  VALUES ?th { ${values} }
  { ?item rdfs:label ?th } UNION { ?item skos:altLabel ?th }
  { ?item rdfs:label ?en } UNION { ?item skos:altLabel ?en }
  FILTER(LANG(?en) = "en")
}`;

    let rows = [];
    for (let attempt = 0; attempt < RETRIES; attempt += 1) {
      try {
        const response = await fetch("https://query.wikidata.org/sparql", {
          method: "POST",
          headers: {
            ...UA,
            Accept: "application/sparql-results+json",
            "Content-Type": "application/x-www-form-urlencoded",
          },
          body: new URLSearchParams({ query }).toString(),
        });
        if (response.ok) {
          rows = (await response.json()).results.bindings;
          break;
        }
      } catch {
        // ลองใหม่ด้านล่าง
      }
      await sleep(5000 * (attempt + 1));
      if (attempt === RETRIES - 1) throw new Error("ยิง Wikidata ไม่สำเร็จ");
    }

    for (const row of rows) {
      const key = row.th.value;
      let set = out.get(key);
      if (!set) out.set(key, (set = new Set()));
      set.add(row.en.value);
    }

    process.stdout.write(".");
    await sleep(WD_PAUSE_MS);
  }

  /*
   * ศูนย์แถวจากทั้งคลังแปลว่าท่อส่งพัง ไม่ใช่ว่า Wikidata ไม่รู้จักคำไทยสักคำ
   * ล้มทั้งรอบดีกว่าเขียนรายงานว่า "แหล่งนี้ยืนยันได้ 0 คำ" ซึ่งอ่านเหมือน
   * เป็นข้อเท็จจริงทั้งที่เป็นบั๊ก — เคยเกิดมาแล้วตอนส่งด้วย content-type ผิด
   */
  if (out.size === 0) {
    throw new Error("Wikidata ไม่คืนผลสักแถว — น่าจะยิงผิดวิธี ไม่ใช่ไม่มีข้อมูล");
  }

  return out;
}

// --------------------------------------------------------------- MediaWiki --

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

// -------------------------------------------------------------------- run --

const words = JSON.parse(readFileSync(WORDS_FILE, "utf8"));
const titles = [...new Set(words.map((word) => word.th))];

console.log(`ตรวจ ${words.length} คำ (${titles.length} คำแปลไทยไม่ซ้ำ)`);

process.stdout.write("Thai WordNet ");
const wordnet = await wordnetIndex();
console.log(`${wordnet.size} คำอังกฤษที่มีคู่ไทย`);

process.stdout.write("Wikidata      ");
const wikidata = await wikidataLabels(titles);
process.stdout.write("\nen.wiktionary ");
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
  const fromWordnet = wordnet.get(needle) ?? new Set();

  /*
   * เทียบแบบตัดเป็นคำ ๆ แทนการใช้ขอบคำ \b ในนิพจน์ปกติ
   * เพื่อไม่ให้ "cat" ไปตรงกับ "category" และไม่ต้องพึ่ง escape
   *
   * คำหัวที่มีช่องว่าง (ตอนนี้มีคำเดียวคือ "ice cream") จะไม่มีวันตรงกับ
   * โทเคนคำเดี่ยว จึงเทียบเป็นข้อความตรง ๆ โดยดูขอบด้วยช่องว่างแทน
   */
  const text = ` ${gloss.join(" ; ").toLowerCase()} `;
  const tokens = new Set(text.split(/[^a-z-]+/));
  const inGloss = needle.includes(" ")
    ? text.includes(` ${needle} `) ||
      text.includes(` ${needle}.`) ||
      text.includes(` ${needle};`)
    : tokens.has(needle);

  /*
   * ชื่อใน Wikidata หลายอันเป็นวลี เช่น "tooth cavity" หรือ "feral animal"
   * จึงนับว่าตรงเมื่อคำของเราเป็นคำใดคำหนึ่งในชื่อนั้น ไม่ใช่ต้องเท่ากันทั้งวลี
   */
  const fromWikidata = wikidata.get(word.th) ?? new Set();
  const inWikidata = [...fromWikidata].some((label) => {
    const lower = label.toLowerCase();
    return lower === needle || lower.split(/[^a-z-]+/).includes(needle);
  });

  return {
    en: word.en,
    th: word.th,
    cefr: word.cefr,
    thSource: word.thSource,
    hitWordnet: fromWordnet.has(word.th),
    hitGloss: inGloss,
    hitWikidata: inWikidata,
    hitWiki: link ? link.toLowerCase().includes(needle) : false,
    hasThWikt: Boolean(thWikt.get(word.th)),
    gloss,
    wordnet: [...fromWordnet],
    wikidata: [...fromWikidata],
    wiki: link,
  };
});

const isConfirmed = (r) =>
  r.hitWordnet || r.hitGloss || r.hitWikidata || r.hitWiki;
const confirmed = rows.filter(isConfirmed);
/** มีข้อมูลจากแหล่งใดแหล่งหนึ่ง แต่ไม่มีคำของเราอยู่ในนั้น — ต้องให้คนอ่าน */
const review = rows.filter(
  (r) =>
    !isConfirmed(r) &&
    (r.gloss.length > 0 || r.wordnet.length > 0 || r.wikidata.length > 0),
);
/** ไม่มีแหล่งไหนมีข้อมูลของคำนี้เลย */
const noData = rows.filter(
  (r) =>
    !isConfirmed(r) &&
    r.gloss.length === 0 &&
    r.wordnet.length === 0 &&
    r.wikidata.length === 0,
);

const LEVELS = ["Pre-A1", "A1", "A2", "B1", "B2", "C1"];
const perLevel = LEVELS.map((level) => {
  const all = rows.filter((r) => r.cefr === level);
  const ok = all.filter(isConfirmed);
  const pct = all.length ? Math.round((ok.length / all.length) * 100) : 0;
  return `| ${level} | ${all.length} | ${ok.length} | ${pct}% |`;
}).join("\n");

const short = (list, max) => list.join(" · ").slice(0, max);

const report = `# ตรวจคำแปลไทยย้อนทาง

สร้างด้วย \`npm run check:thai-back\` — อย่าแก้ไฟล์นี้ด้วยมือ

\`check:thai\` ถามว่า "คำแปลไทยของเราอยู่ในรายการคำแปลของคำอังกฤษนี้ไหม"
ไฟล์นี้ถามกลับทางว่า **"คำไทยคำนี้ แปลกลับเป็นอังกฤษแล้วได้คำเดิมไหม"**
เพราะรายการคำแปลของคำอังกฤษหนึ่งคำรวมทุกความหมายไว้ด้วยกัน คำแปลที่
"อยู่ในรายการจริงแต่เป็นความหมายคนละอัน" จึงผ่านด่านเดิมไปได้

ห้าแหล่งที่ใช้

1. **Thai WordNet** โดย NICT ผ่าน
   [Open Multilingual Wordnet](https://github.com/omwn/omw-data)
   ต่อคำอังกฤษกับคำไทยผ่านรหัส synset ของ Princeton WordNet —
   **เป็นแหล่งอิสระจริง** คนละโครงการกับพจนานุกรมที่ใช้สร้างเนื้อหา
2. **Wikidata** (CC0) ถามด้วย SPARQL ว่าสิ่งที่คนไทยเรียกด้วยคำนี้
   ภาษาอังกฤษเรียกว่าอะไร เอาทั้งชื่อหลักและชื่อพ้อง — **อิสระเช่นกัน**
   แต่ครอบคลุมเฉพาะคำนาม เพราะเป็นฐานข้อมูลของสิ่งต่าง ๆ ไม่ใช่พจนานุกรม
3. **en.wiktionary หน้าของคำไทยเอง** — คนละหน้าและคนละกลุ่มผู้เขียนกับตาราง
   คำแปลที่ \`check:thai\` ใช้ แต่ **ยังเป็นโครงการเดียวกัน ไม่ใช่แหล่งอิสระ**
4. **th.wikipedia** แล้วตามลิงก์ข้ามภาษาไปอังกฤษ — ใช้ได้กับคำนามรูปธรรม
5. **th.wiktionary** — คนละโครงการ นิยามเป็นภาษาไทย เครื่องเทียบให้ไม่ได้
   รายงานแค่ว่ามีหน้าหรือไม่ ไว้ให้คนตามไปอ่าน

**ไม่ใช่ด่านที่ผ่านหรือไม่ผ่าน** คำแปลหลายคำเป็นคำประสมที่ไม่มีหน้าใน
พจนานุกรมเล่มไหน การไม่มีข้อมูลไม่ได้แปลว่าคำแปลผิด

## สรุป

| สถานะ | จำนวน |
|---|---|
| ยืนยันได้จากการแปลกลับ | ${confirmed.length} |
| มีคำแปลกลับ แต่ไม่ตรงกับคำของเรา — **ต้องให้คนอ่าน** | ${review.length} |
| ไม่มีแหล่งไหนมีข้อมูลของคำนี้ | ${noData.length} |
| รวม | ${rows.length} |

แยกตามแหล่ง (คำหนึ่งนับได้หลายแหล่ง)

| แหล่ง | ยืนยันได้ |
|---|---|
| Thai WordNet (อิสระ) | ${rows.filter((r) => r.hitWordnet).length} |
| Wikidata (อิสระ) | ${rows.filter((r) => r.hitWikidata).length} |
| หน้าคำไทยใน en.wiktionary | ${rows.filter((r) => r.hitGloss).length} |
| ลิงก์ข้ามภาษาของวิกิพีเดียไทย | ${rows.filter((r) => r.hitWiki).length} |
| **ยืนยันได้จากแหล่งอิสระอย่างน้อยหนึ่งแหล่ง** | **${
  rows.filter((r) => r.hitWordnet || r.hitWikidata || r.hitWiki).length
}** |
| มีหน้าใน th.wiktionary ให้คนตามไปอ่าน | ${rows.filter((r) => r.hasThWikt).length} |

แยกตามระดับ

| ระดับ | คำ | ยืนยันได้ | สัดส่วน |
|---|---|---|---|
${perLevel}

## มีคำแปลกลับ แต่ไม่ตรงกับคำของเรา (${review.length} คำ)

คำกลุ่มนี้ **ส่วนใหญ่ไม่ได้ผิด** — เป็นคำพ้องความหมายที่แหล่งอื่นเลือกใช้คำอื่น
(cow ได้ วัวตัวเมีย · teacher ได้ ครู) หรือเป็นคำแปลของความหมายอื่นของคำเดียวกัน
(watch ได้ เฝ้าดู ซึ่งเป็นกริยา ไม่ใช่นาฬิกา) แต่กลุ่มนี้คือกลุ่มที่คนต้องอ่านเอง
เพราะคำที่ผิดจริงจะซ่อนอยู่ในนี้

| คำ | ระดับ | ที่มา | คำแปลของเรา | WordNet ให้ | Wikidata ให้ | วิกิพจนานุกรมให้ |
|---|---|---|---|---|---|---|
${review
  .map(
    (r) =>
      `| ${r.en} | ${r.cefr} | ${r.thSource} | \`${r.th}\` | ${
        short(r.wordnet, 60) || "—"
      } | ${short(r.wikidata, 60) || "—"} | ${short(r.gloss, 60) || "—"} |`,
  )
  .join("\n")}

## ไม่มีแหล่งไหนมีข้อมูลของคำนี้ (${noData.length} คำ)

ตรวจด้วยวิธีนี้ไม่ได้ ไม่ได้แปลว่าผิด — ส่วนใหญ่เป็นคำประสม
เครื่องหมาย \`*\` คือมีหน้าใน th.wiktionary ให้คนตามไปอ่านได้
(${noData.filter((r) => r.hasThWikt).length} คำ)

${noData.map((r) => `${r.en}=${r.th}${r.hasThWikt ? "*" : ""}`).join(" · ")}

## เครดิตของแหล่งข้อมูล

ข้อมูลของ Wikidata อยู่ใต้ CC0 คือยกให้สาธารณะ ไม่มีเงื่อนไข

Thai WordNet Copyright 2011 by the National Institute of Information and
Communications Technology (NICT). WordNet 3.0 Copyright 2006 by Princeton
University. ทั้งสองอนุญาตให้ใช้ ทำซ้ำ แก้ไข และเผยแพร่เพื่อวัตถุประสงค์ใดก็ได้
โดยไม่มีค่าธรรมเนียม หากแสดงประกาศลิขสิทธิ์นี้ไว้ในสำเนาทุกชุด

ไฟล์ข้อมูลสองไฟล์ที่สคริปต์โหลดมาเก็บไว้ใน \`.cache/\` ไม่ได้อยู่ใน repo
และเนื้อหาของแอปไม่ได้คัดลอกข้อมูลจากแหล่งเหล่านี้ ใช้เพื่อตรวจสอบเท่านั้น
`;

writeFileSync(REPORT_FILE, report);

console.log(`\nยืนยันได้            : ${confirmed.length} / ${rows.length}`);
console.log(`  Thai WordNet       : ${rows.filter((r) => r.hitWordnet).length}`);
console.log(`  Wikidata           : ${rows.filter((r) => r.hitWikidata).length}`);
console.log(`  หน้าคำไทย           : ${rows.filter((r) => r.hitGloss).length}`);
console.log(`  ลิงก์วิกิพีเดีย      : ${rows.filter((r) => r.hitWiki).length}`);
console.log(`ต้องให้คนอ่าน        : ${review.length}`);
console.log(`ไม่มีข้อมูลเลย        : ${noData.length}`);
console.log(`เขียนรายงานที่       : docs/thai-reverse-check.md`);
