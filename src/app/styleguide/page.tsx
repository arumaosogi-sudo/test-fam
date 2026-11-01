"use client";

import { useState } from "react";

import { Milo, type MiloState } from "@/components/mascot/milo";
import { Button } from "@/components/ui/button";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { ChoiceTile, type ChoiceState } from "@/components/ui/choice-tile";
import { CEFR_LEVELS, LevelBadge } from "@/components/ui/level-badge";
import { ProgressBar } from "@/components/ui/progress-bar";
import { SpeakerButton } from "@/components/ui/speaker-button";
import { StarRating } from "@/components/ui/star-rating";
import { ThemeToggle } from "@/components/ui/theme-toggle";

const COLOR_TOKENS = [
  { name: "bg", varName: "--bg" },
  { name: "surface", varName: "--surface" },
  { name: "surface-2", varName: "--surface-2" },
  { name: "ink", varName: "--ink" },
  { name: "ink-muted", varName: "--ink-muted" },
  { name: "border", varName: "--border" },
  { name: "primary", varName: "--primary" },
  { name: "primary-edge", varName: "--primary-edge" },
  { name: "primary-soft", varName: "--primary-soft" },
  { name: "accent", varName: "--accent" },
  { name: "accent-edge", varName: "--accent-edge" },
  { name: "accent-soft", varName: "--accent-soft" },
  { name: "success", varName: "--success" },
  { name: "warn", varName: "--warn" },
  { name: "danger", varName: "--danger" },
  { name: "star", varName: "--star" },
];

const TYPE_SCALE = [
  { cls: "text-kid-3xl", label: "kid-3xl · 48px" },
  { cls: "text-kid-2xl", label: "kid-2xl · 36px" },
  { cls: "text-kid-xl", label: "kid-xl · 28px" },
  { cls: "text-kid-lg", label: "kid-lg · 22px" },
  { cls: "text-kid", label: "kid · 18px (ฐาน)" },
  { cls: "text-kid-sm", label: "kid-sm · 16px" },
];

const MILO_STATES: MiloState[] = ["idle", "happy", "oops", "listening"];

const DEMO_CHOICES = [
  { label: "apple", sublabel: "แอปเปิล", visual: "🍎", correct: true },
  { label: "banana", sublabel: "กล้วย", visual: "🍌", correct: false },
  { label: "orange", sublabel: "ส้ม", visual: "🍊", correct: false },
  { label: "grape", sublabel: "องุ่น", visual: "🍇", correct: false },
];

function Section({
  title,
  note,
  children,
}: {
  title: string;
  note?: string;
  children: React.ReactNode;
}) {
  return (
    <section className="space-y-4">
      <div>
        <h2 className="text-kid-xl font-extrabold">{title}</h2>
        {note ? <CardNote>{note}</CardNote> : null}
      </div>
      {children}
    </section>
  );
}

export default function StyleguidePage() {
  const [miloState, setMiloState] = useState<MiloState>("idle");
  const [picked, setPicked] = useState<string | null>(null);
  const [revealed, setRevealed] = useState(false);

  function tileState(choice: (typeof DEMO_CHOICES)[number]): ChoiceState {
    if (!revealed) return picked === choice.label ? "selected" : "idle";
    if (choice.correct) return "correct";
    return picked === choice.label ? "wrong" : "idle";
  }

  return (
    <main className="mx-auto w-full max-w-4xl space-y-12 px-4 py-10">
      <header className="flex flex-wrap items-start justify-between gap-4">
        <div>
          <p className="text-ink-muted text-kid-sm font-bold">LinguaKids</p>
          <h1 className="text-kid-2xl font-extrabold">Design system</h1>
          <CardNote>
            ชุด component พื้นฐานของแอป · ทุกอย่างใช้ semantic token จึงเปลี่ยนตามธีมเอง
          </CardNote>
        </div>
        <ThemeToggle />
      </header>

      <Section
        title="สี"
        note="สีที่ใช้วางตัวอักษรทับผ่านคอนทราสต์ AA แล้ว (primary/success/danger ใช้ตัวอักษรขาว, accent/warn ใช้ตัวอักษรเข้ม)"
      >
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
          {COLOR_TOKENS.map((token) => (
            <div key={token.name} className="space-y-1">
              <div
                className="border-border h-16 w-full rounded-xl border-2"
                style={{ background: `var(${token.varName})` }}
              />
              <p className="text-kid-sm font-bold">{token.name}</p>
            </div>
          ))}
        </div>
      </Section>

      <Section
        title="ตัวอักษร"
        note="ขนาดฐาน 18px ไม่ใช่ 16px เพราะผู้ใช้คือเด็ก · Nunito คู่กับ Noto Sans Thai"
      >
        <Card className="space-y-3">
          {TYPE_SCALE.map((item) => (
            <div key={item.cls} className="flex flex-wrap items-baseline gap-3">
              <span className={`${item.cls} font-extrabold`}>
                กินข้าว Eat rice
              </span>
              <span className="text-ink-muted text-kid-sm font-bold">
                {item.label}
              </span>
            </div>
          ))}
        </Card>
      </Section>

      <Section
        title="ปุ่ม"
        note="ขอบล่างหนาและยุบลงเวลากด · ขนาดเล็กสุดสูง 44px ตามเกณฑ์พื้นที่แตะของ WCAG"
      >
        <Card className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Button variant="primary">ไปต่อ</Button>
            <Button variant="accent">เริ่มเล่น</Button>
            <Button variant="success">ถูกต้อง</Button>
            <Button variant="danger">ลองอีกครั้ง</Button>
            <Button variant="neutral">ข้าม</Button>
            <Button variant="ghost">ยกเลิก</Button>
            <Button disabled>ปิดอยู่</Button>
          </div>

          <div className="flex flex-wrap items-end gap-3">
            <Button size="sm">sm 44px</Button>
            <Button size="md">md 52px</Button>
            <Button size="lg">lg 64px</Button>
            <Button size="xl" variant="accent">
              xl 80px
            </Button>
          </div>

          <div className="flex flex-wrap items-center gap-3">
            <Button shape="tile" size="lg" variant="neutral">
              ทรงไทล์
            </Button>
            <Button square size="lg" aria-label="เล่นเสียง">
              ▶
            </Button>
          </div>
        </Card>
      </Section>

      <Section
        title="ปุ่มลำโพง"
        note="กฎข้อ 1 ของโปรเจกต์: ทุกข้อความบนจอต้องกดฟังเสียงได้ · ตอนนี้ใช้เสียงของเบราว์เซอร์ (ฟรี) ภายหลังสลับเป็นเสียงคุณภาพสูงได้โดยแก้ไฟล์เดียว"
      >
        <Card className="flex flex-wrap items-center gap-4">
          <span className="text-kid-xl font-extrabold">elephant</span>
          <SpeakerButton text="elephant" />
          <SpeakerButton text="elephant" slow size="sm" />
          <CardNote>ปุ่มขวาคือโหมด &quot;พูดช้า ๆ&quot;</CardNote>
        </Card>
      </Section>

      <Section
        title="การ์ดตัวเลือก"
        note="ใช้ร่วมกันในโหมดเติมคำ ดูภาพเติมคำ และฟังแล้วเลือก · สถานะถูก/ผิดมีไอคอนกำกับ ไม่ได้บอกด้วยสีเพียงอย่างเดียว"
      >
        <Card className="space-y-4">
          <div className="flex items-center gap-3">
            <span className="text-kid-lg font-extrabold">
              Which one is an apple?
            </span>
            <SpeakerButton text="Which one is an apple?" size="sm" />
          </div>

          <div className="grid grid-cols-2 gap-3 sm:grid-cols-4">
            {DEMO_CHOICES.map((choice) => (
              <ChoiceTile
                key={choice.label}
                label={choice.label}
                sublabel={choice.sublabel}
                visual={choice.visual}
                state={tileState(choice)}
                disabled={revealed}
                onClick={() => setPicked(choice.label)}
              />
            ))}
          </div>

          <div className="flex gap-3">
            <Button
              variant="success"
              disabled={!picked || revealed}
              onClick={() => setRevealed(true)}
            >
              ตรวจคำตอบ
            </Button>
            <Button
              variant="neutral"
              onClick={() => {
                setPicked(null);
                setRevealed(false);
              }}
            >
              เริ่มใหม่
            </Button>
          </div>
        </Card>
      </Section>

      <Section title="ความคืบหน้าและดาว">
        <Card className="space-y-5">
          <ProgressBar value={7} max={10} label="ด่านนี้" />
          <ProgressBar value={120} max={300} label="XP วันนี้" tone="accent" />
          <div className="flex flex-wrap items-center gap-6">
            <StarRating value={1} size="sm" />
            <StarRating value={2} />
            <StarRating value={3} size="lg" animate />
          </div>
        </Card>
      </Section>

      <Section
        title="ระดับภาษา"
        note="บันไดระดับไต่ได้ถึง C1 ไม่มีเพดาน ส่วนช่วงชั้นที่กำกับคือเป้าที่ตั้งไว้ของเด็กแต่ละวัย"
      >
        <Card className="flex flex-wrap gap-3">
          {CEFR_LEVELS.map((level) => (
            <LevelBadge key={level} level={level} withGrade />
          ))}
        </Card>
      </Section>

      <Section
        title="มาสคอต Milo"
        note="สถานะ oops ออกแบบให้ดูเป็นห่วง ไม่ใช่ผิดหวังหรือดุ เพราะเด็กไม่ควรรู้สึกถูกลงโทษเวลาตอบผิด"
      >
        <Card className="space-y-4">
          <div className="bg-surface-2 rounded-card flex min-h-56 items-center justify-center p-4">
            <Milo state={miloState} size={180} />
          </div>
          <div className="flex flex-wrap gap-3">
            {MILO_STATES.map((state) => (
              <Button
                key={state}
                variant={miloState === state ? "primary" : "neutral"}
                onClick={() => setMiloState(state)}
              >
                {state}
              </Button>
            ))}
          </div>
        </Card>
      </Section>

      <Section title="การ์ด">
        <div className="grid gap-4 sm:grid-cols-2">
          <Card>
            <CardTitle>สัตว์ (Animals)</CardTitle>
            <CardNote>12 คำ · ผ่านแล้ว 8 คำ</CardNote>
            <ProgressBar className="mt-3" value={8} max={12} tone="success" />
          </Card>
          <Card>
            <CardTitle>คุยกับ Milo</CardTitle>
            <CardNote>ฝึกพูดเรื่องอาหารเช้าวันนี้</CardNote>
            <Button className="mt-3" variant="accent">
              เริ่มคุย
            </Button>
          </Card>
        </div>
      </Section>
    </main>
  );
}
