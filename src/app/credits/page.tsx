import type { Metadata } from "next";
import Link from "next/link";

import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { READINGS } from "@/lib/content/readings";
import { UNITS, WORDS } from "@/lib/content";

export const metadata: Metadata = {
  title: "เครดิตและสัญญาอนุญาต — LinguaKids",
  description:
    "แหล่งข้อมูลเปิดที่แอปนี้ใช้ และสัญญาอนุญาตของแต่ละแหล่ง",
};

/**
 * หน้าเครดิตที่ผู้ใช้เห็นในแอป
 *
 * **นี่ไม่ใช่หน้าตกแต่ง แต่เป็นเงื่อนไขของสัญญาอนุญาต** — ข้อมูลทั้งสามแหล่ง
 * ที่แอปนี้ใช้เป็น CC BY-SA 4.0 ซึ่งบังคับให้ต้องให้เครดิตในที่ที่คนใช้งาน
 * เห็นได้ ไม่ใช่แค่ในไฟล์ของนักพัฒนา การไม่มีหน้านี้คือการใช้งานผิดสัญญา
 *
 * เขียนเป็น server component ตัวเลขจึงถูกนับจากคลังคำจริงตอน build
 * ไม่ใช่ตัวเลขที่พิมพ์ไว้แล้วค่อย ๆ ล้าสมัย
 */

const SOURCES = [
  {
    name: "OpenMoji",
    url: "https://openmoji.org/",
    license: "CC BY-SA 4.0",
    use: `ภาพประกอบคำศัพท์ ${WORDS.filter((word) => word.image).length} ภาพ`,
    attribution:
      "All emojis designed by OpenMoji – the open-source emoji and icon project. License: CC BY-SA 4.0",
  },
  {
    name: "English Wiktionary",
    url: "https://en.wiktionary.org/",
    license: "CC BY-SA 4.0",
    use: "คำแปลไทยและคำอ่าน IPA ของทุกคำในคลัง",
    attribution:
      "คำแปลไทยและคำอ่านอ้างอิงจาก English Wiktionary (CC BY-SA 4.0) ผ่านข้อมูลที่สกัดเป็น JSON โดย kaikki.org ของ Tatu Ylonen",
  },
  {
    name: "NGSL 1.2",
    url: "https://www.newgeneralservicelist.com/new-general-service-list",
    license: "CC BY-SA 4.0",
    use: "รายการคำที่ใช้คัดเลือกคำศัพท์ระดับ Pre-A1 และ A1 รวมรายการเสริม (วัน เดือน ตัวเลข)",
    attribution:
      "การคัดเลือกคำศัพท์อ้างอิงจาก New General Service List (NGSL) 1.2 โดย Browne, Culligan และ Phillips — CC BY-SA 4.0",
  },
  {
    name: "CEFR-J Wordlist",
    url: "https://www.cefr-j.org/download_eng.html",
    // เงื่อนไขคนละแบบกับอีกสามแหล่ง — ไม่ใช่ CC และการใช้เชิงพาณิชย์มีเงื่อนไข
    license: "ใช้ได้ฟรีเพื่อการศึกษา ต้องอ้างอิงแหล่งที่มา",
    use: `ระดับ CEFR ของคำศัพท์ — ใช้ตัดสินว่าคำไหนเป็น A2 (${
      WORDS.filter((word) => word.cefr === "A2").length
    } คำ)`,
    attribution:
      "The CEFR-J Wordlist Version 1.5. Compiled by Yukio Tono, Tokyo University of Foreign Studies. Retrieved via Open Language Profiles (openlanguageprofiles/olp-en-cefrj) on 03/11/26. ลิขสิทธิ์เป็นของ Tono Laboratory, TUFS",
  },
];

const LICENSE_URL = "https://creativecommons.org/licenses/by-sa/4.0/";

export default function CreditsPage() {
  const verified = WORDS.filter(
    (word) => word.thSource === "wiktionary",
  ).length;

  return (
    <main className="mx-auto w-full max-w-2xl space-y-6 px-4 py-8">
      <header className="space-y-2">
        <Link
          href="/"
          className={buttonVariants({ size: "sm", variant: "ghost" })}
        >
          ← กลับหน้าแรก
        </Link>
        <h1 className="text-kid-2xl font-extrabold">เครดิตและสัญญาอนุญาต</h1>
        <p className="text-ink-muted text-kid-sm font-bold">
          แอปนี้สร้างจากข้อมูลเปิด {SOURCES.length} แหล่ง สามแหล่งแรกใช้สัญญา{" "}
          <a
            href={LICENSE_URL}
            target="_blank"
            rel="noreferrer"
            className="text-primary-edge underline"
          >
            CC BY-SA 4.0
          </a>{" "}
          ซึ่งบังคับทั้งการให้เครดิตและการเผยแพร่งานดัดแปลงด้วยสัญญาเดียวกัน
          ส่วน CEFR-J ใช้เงื่อนไขของตัวเอง (ดูในการ์ดของแหล่งนั้น)
        </p>
      </header>

      <section className="space-y-3">
        {SOURCES.map((source) => (
          <Card key={source.name} className="space-y-2">
            <div className="flex flex-wrap items-center justify-between gap-2">
              <CardTitle>
                <a
                  href={source.url}
                  target="_blank"
                  rel="noreferrer"
                  className="text-primary-edge underline"
                >
                  {source.name}
                </a>
              </CardTitle>
              <span className="bg-surface-2 border-border text-kid-sm rounded-full border-2 px-2 py-0.5 font-bold">
                {source.license}
              </span>
            </div>
            <CardNote className="text-ink">{source.use}</CardNote>
            {/* ข้อความให้เครดิตตามที่แต่ละแหล่งขอ ต้องแสดงตามตัวอักษร */}
            <p className="bg-surface-2 rounded-card text-ink-muted text-kid-sm border-border border-2 p-3 font-bold">
              {source.attribution}
            </p>
          </Card>
        ))}
      </section>

      <section>
        <Card className="space-y-2">
          <CardTitle>เนื้อหาในแอปตอนนี้</CardTitle>
          <ul className="text-ink text-kid-sm space-y-1 font-bold">
            <li>
              คำศัพท์ {WORDS.length} คำ ใน {UNITS.length} หน่วยการเรียน
            </li>
            <li>
              คำแปลไทยที่ตรงกับพจนานุกรม {verified} คำ ·
              ที่ปรับถ้อยคำโดยตั้งใจ {WORDS.length - verified} คำ
            </li>
            <li>เรื่องอ่านออกเสียง {READINGS.length} เรื่อง</li>
          </ul>
        </Card>
      </section>

      {/*
        ส่วนนี้ไม่ใช่ข้อกฎหมายที่ตัดสินแล้ว แต่เป็นสิ่งที่ยังค้าง
        เขียนไว้ตรงนี้เพราะคนที่อ่านหน้านี้คือคนที่อยากรู้เรื่องสัญญาพอดี
      */}
      <section>
        <Card className="bg-warn-soft border-warn space-y-2">
          <CardTitle>สิ่งที่ยังไม่ได้ตัดสินใจ</CardTitle>
          <CardNote className="text-ink">
            สัญญาแบบ share-alike ของสามแหล่งแรกมีผลต่อสัญญาของตัวแอปเองด้วย
            อย่างน้อยส่วนที่เป็น <strong>เนื้อหา</strong> (คลังคำ ภาพ
            และเรื่องอ่าน) ต้องเผยแพร่ด้วย CC BY-SA 4.0
            ส่วนซอร์สโค้ดเป็นงานคนละชิ้นและเลือกสัญญาแยกได้ แต่ยังไม่ได้เลือก
          </CardNote>
          <CardNote className="text-ink">
            และถ้าจะนำแอปนี้ไป<strong>ใช้เชิงพาณิชย์</strong> ต้องติดต่อ
            Tono Laboratory ก่อน เพราะ CEFR-J ระบุว่าการใช้เชิงพาณิชย์
            ต้องตกลงเรื่องค่าใช้จ่ายกันเป็นกรณีไป ต่างจากอีกสามแหล่งที่เปิดให้
            ใช้เชิงพาณิชย์ได้เลยถ้าให้เครดิตและใช้สัญญาเดียวกัน
          </CardNote>
          <CardNote className="text-ink">
            ตอนนี้จึงยังไม่ควรเผยแพร่แอปนี้ต่อสาธารณะ
            จนกว่าจะระบุให้ชัดว่าส่วนไหนอยู่ใต้สัญญาอะไร
          </CardNote>
        </Card>
      </section>

      <section>
        <Card className="space-y-2">
          <CardTitle>เสียงอ่านและการตรวจเสียงพูด</CardTitle>
          <CardNote className="text-ink">
            เสียงอ่านออกเสียงและการถอดเสียงที่เด็กพูด
            ใช้ความสามารถที่ติดมากับเบราว์เซอร์ ไม่ใช่บริการของเรา
            บางเบราว์เซอร์ส่งเสียงไปประมวลผลที่เซิร์ฟเวอร์ของผู้ให้บริการ
            เบราว์เซอร์นั้น หน้าเกมพูดจะเขียนบอกไว้ว่ากำลังใช้แบบไหน
            และมีปุ่มให้เปลี่ยนมาประมวลผลในเครื่องถ้าเครื่องรองรับ
          </CardNote>
        </Card>
      </section>
    </main>
  );
}
