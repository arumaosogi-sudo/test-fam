import Link from "next/link";

import { Milo } from "@/components/mascot/milo";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { LevelBadge } from "@/components/ui/level-badge";
import { READINGS } from "@/lib/content/readings";
import { UNITS, WORDS } from "@/lib/content";
import { CEFR_ORDER } from "@/lib/types";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const PLANNED_MODES = [
  { icon: "💬", title: "คุยกับ Milo", note: "พูดกับ AI แล้วได้ทั้งข้อความและเสียงตอบ" },
  { icon: "✏️", title: "เติมคำที่ขาด", note: "เลือกจากคลังคำ ลากตัวอักษร หรือพิมพ์เอง" },
  { icon: "🔗", title: "จับคู่คำ", note: "จับคู่คำอังกฤษกับคำแปลไทย" },
  { icon: "🖼️", title: "ดูภาพเติมคำ", note: "เห็นภาพแล้วเลือก สะกด หรือพูดชื่อ" },
  { icon: "🗣️", title: "พูดให้ฟัง", note: "ออกเสียงให้ระบบฟัง พร้อมคำแนะนำเสียงที่คนไทยมักพลาด" },
  { icon: "📖", title: "อ่านออกเสียง", note: "อ่านเรื่องสั้น ไฮไลต์ตามที่อ่าน วัดความแม่นและความเร็ว" },
  { icon: "🎲", title: "รวมทุกหัวข้อ", note: "คละคำจากทุกบทที่เรียนมา ปนทั้งหัวข้อและวิธีถาม" },
];

export default function HomePage() {
  return (
    <main className="mx-auto w-full max-w-4xl px-4 py-10">
      <div className="mb-8 flex justify-end">
        <ThemeToggle />
      </div>

      <section className="flex flex-col items-center gap-6 text-center">
        <Milo state="idle" size={200} />

        <div className="space-y-3">
          <h1 className="text-kid-3xl font-extrabold">LinguaKids</h1>
          <p className="text-ink-muted text-kid-lg mx-auto max-w-xl font-bold">
            ฝึกคำศัพท์ ฟัง พูด และอ่านภาษาอังกฤษ สำหรับเด็กอนุบาลถึงประถม
          </p>
          <div className="flex flex-wrap justify-center gap-2">
            {CEFR_ORDER.filter((level) =>
              UNITS.some((unit) => unit.cefr === level),
            ).map((level) => (
              <LevelBadge key={level} level={level} withGrade />
            ))}
          </div>
        </div>

        <Link
          href="/learn"
          className={buttonVariants({ variant: "accent", size: "xl" })}
        >
          เริ่มเล่น
        </Link>

        <div className="flex flex-wrap justify-center gap-3">
          <Link
            href="/styleguide"
            className={buttonVariants({ variant: "neutral", size: "md" })}
          >
            ดู design system
          </Link>
          {/*
            ลิงก์เครดิตต้องอยู่ที่ที่ผู้ใช้เห็นได้ ไม่ใช่ซ่อนไว้
            เพราะเป็นเงื่อนไขของสัญญา CC BY-SA ของข้อมูลที่แอปนี้ใช้
          */}
          <Link
            href="/credits"
            className={buttonVariants({ variant: "ghost", size: "md" })}
          >
            เครดิตและสัญญาอนุญาต
          </Link>
        </div>
      </section>

      <section className="mt-14 space-y-4">
        <h2 className="text-kid-xl font-extrabold">โหมดที่วางแผนไว้</h2>
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {PLANNED_MODES.map((mode) => (
            <Card key={mode.title}>
              <span className="text-kid-2xl" aria-hidden>
                {mode.icon}
              </span>
              <CardTitle className="mt-1">{mode.title}</CardTitle>
              <CardNote>{mode.note}</CardNote>
            </Card>
          ))}
        </div>
      </section>

      <section className="mt-14">
        <Card className="bg-warn-soft border-warn">
          <CardTitle>สถานะโปรเจกต์</CardTitle>
          <CardNote className="text-ink">
            เล่นได้แล้ว 6 โหมด (จับคู่คำ ฟังแล้วเลือก ดูภาพเติมคำ เติมคำในประโยค
            พูดให้ฟัง และอ่านออกเสียง) บนคลังคำ {WORDS.length} คำ {UNITS.length}{" "}
            หน่วย กับเรื่องอ่าน {READINGS.length} เรื่อง
            พร้อมด่านทบทวนอัตโนมัติ ด่านรวมทุกหัวข้อ ดาว XP
            ไฟต่อเนื่อง และแชทกับ AI · การตรวจเสียงพูดใช้ตัวถอดเสียงของ
            เบราว์เซอร์ จึงบอกได้ว่า “ฟังออกเป็นคำนี้ไหม” แต่ยังให้คะแนนราย
            หน่วยเสียงไม่ได้ · ความคืบหน้าเก็บไว้ในเครื่องนี้ ยังไม่มีบัญชีผู้ใช้
            · แผนงานอยู่ใน{" "}
            <code className="font-bold">docs/PLAN.md</code> รายการงานอยู่ใน{" "}
            <code className="font-bold">docs/TASKS.md</code>
          </CardNote>
        </Card>
      </section>
    </main>
  );
}
