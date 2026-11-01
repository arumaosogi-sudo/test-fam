"use client";

import { Languages, Send } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Milo, type MiloState } from "@/components/mascot/milo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { SpeakerButton } from "@/components/ui/speaker-button";
import { UNITS, getUnit, wordsInUnit } from "@/lib/content";
import type { ChatMessage, ChatMistake, ChatTurn } from "@/lib/chat/types";
import { getTts } from "@/lib/speech";
import { cn } from "@/lib/utils";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

/** คำเปิดบทสนทนาที่สร้างในเครื่อง ไม่ต้องเสียเทิร์นเรียกโมเดลเพื่อทักทาย */
function openingFor(unitId: string) {
  const unit = getUnit(unitId);
  const words = wordsInUnit(unitId);

  return {
    text: `Hi! I am Milo. Let's talk about ${unit?.titleEn ?? "English"}!`,
    textTh: `สวัสดี! ฉันชื่อไมโล มาคุยเรื่อง${unit?.titleTh ?? "ภาษาอังกฤษ"}กัน!`,
    suggestions: [
      "Hello Milo!",
      words[0] ? `I like ${words[0].en}.` : "I am happy!",
      "What is this?",
    ],
  };
}

function Bubble({
  message,
  showThai,
  onToggleThai,
}: {
  message: ChatMessage;
  showThai: boolean;
  onToggleThai: () => void;
}) {
  const fromChild = message.role === "child";

  return (
    <div className={cn("flex", fromChild ? "justify-end" : "justify-start")}>
      <div
        className={cn(
          "rounded-card max-w-[85%] space-y-2 border-2 px-4 py-3",
          fromChild
            ? "bg-primary-soft border-primary"
            : "bg-surface border-border",
        )}
      >
        <p className="text-kid text-ink font-bold">{message.text}</p>

        {showThai && message.textTh ? (
          <p className="text-ink-muted text-kid-sm border-border border-t-2 pt-2 font-bold">
            {message.textTh}
          </p>
        ) : null}

        {!fromChild ? (
          <div className="flex items-center gap-2">
            <SpeakerButton text={message.text} size="sm" />
            <SpeakerButton text={message.text} slow size="sm" />
            {message.textTh ? (
              <Button
                variant="ghost"
                size="sm"
                onClick={onToggleThai}
                aria-pressed={showThai}
              >
                <Languages className="size-5" strokeWidth={2.75} aria-hidden />
                {showThai ? "ซ่อนคำแปล" : "แปลไทย"}
              </Button>
            ) : null}
          </div>
        ) : null}
      </div>
    </div>
  );
}

/** กล่องสอนหลังเด็กพูดผิด — แยกจากบับเบิลเพราะ Milo ไม่ดุในบทสนทนา */
function MistakeCard({ mistakes }: { mistakes: ChatMistake[] }) {
  return (
    <div className="bg-accent-soft border-accent rounded-card space-y-2 border-2 p-3">
      <p className="text-ink text-kid-sm font-extrabold">
        ครั้งหน้าลองพูดแบบนี้นะ
      </p>
      {mistakes.map((mistake, index) => (
        <div key={index} className="flex flex-wrap items-center gap-2">
          <span className="text-ink-muted text-kid-sm font-bold line-through">
            {mistake.childSaid}
          </span>
          <span aria-hidden>→</span>
          <span className="text-ink text-kid font-extrabold">
            {mistake.correct}
          </span>
          <SpeakerButton text={mistake.correct} size="sm" />
          <span className="text-ink-muted text-kid-sm w-full font-bold">
            {mistake.whyTh}
          </span>
        </div>
      ))}
    </div>
  );
}

export function ChatRoom() {
  useHydrateProgress();

  const hydrated = useProgressStore((state) => state.hydrated);
  const profile = useProgressStore((state) => state.profile);

  const [unitId, setUnitId] = useState(UNITS[0]?.id ?? "");
  const opening = useMemo(() => openingFor(unitId), [unitId]);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [concerned, setConcerned] = useState(false);
  const [thaiShown, setThaiShown] = useState<string[]>([]);

  const nextId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);

  // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่ เด็กไม่ต้องหาเอง
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function makeId() {
    nextId.current += 1;
    return `m${nextId.current}`;
  }

  function changeTopic(id: string) {
    setUnitId(id);
    setMessages([]);
    setSuggestions([]);
    setNotice(null);
    setConcerned(false);
    getTts().cancel();
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (!trimmed || sending) return;

    const childMessage: ChatMessage = {
      id: makeId(),
      role: "child",
      text: trimmed,
    };

    // ประวัติที่ส่งไปคือสิ่งที่อยู่บนจอ ไม่รวมคำทักทายที่เราสร้างเอง
    const history = messages.map((message) => ({
      role: message.role,
      text: message.text,
    }));

    setMessages((current) => [...current, childMessage]);
    setInput("");
    setSuggestions([]);
    setNotice(null);
    setSending(true);

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({
          history,
          message: trimmed,
          cefr: profile.cefr,
          unitId,
          childName: profile.displayName,
        }),
      });

      const payload = (await response.json()) as
        | { turn: ChatTurn; remaining: number; notice: string | null }
        | { error: string; message: string };

      if (!response.ok || !("turn" in payload)) {
        setNotice(
          "message" in payload
            ? payload.message
            : "ตอนนี้ Milo ยังไม่ตอบ ลองใหม่อีกครั้งนะ",
        );
        return;
      }

      const { turn } = payload;

      setMessages((current) => [
        ...current,
        {
          id: makeId(),
          role: "milo",
          text: turn.reply,
          textTh: turn.replyTh,
          mistakes: turn.mistakes.length > 0 ? turn.mistakes : undefined,
        },
      ]);
      setSuggestions(turn.suggestedReplies);
      if (turn.safetyFlag === "concerning") setConcerned(true);
      // บอกเด็กเมื่อระบบตัดข้อมูลส่วนตัวออกก่อนส่ง เพื่อให้รู้ว่าทำไมข้อความเปลี่ยน
      if (payload.notice) setNotice(payload.notice);

      // อ่านคำตอบให้ฟังทันที ตามที่โจทย์ขอว่า "พิมพ์กลับมาและมีเสียงตอบกลับ"
      void getTts().speak(turn.reply);
    } catch {
      setNotice("ต่อเน็ตไม่ได้ ลองใหม่อีกครั้งนะ");
    } finally {
      setSending(false);
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send(input);
  }

  if (!hydrated) {
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <Milo state="idle" size={120} />
        <p className="text-ink-muted font-bold">กำลังเตรียมห้องแชท…</p>
      </div>
    );
  }

  const miloState: MiloState = sending
    ? "listening"
    : concerned
      ? "oops"
      : messages.length > 0
        ? "happy"
        : "idle";

  const visible: ChatMessage[] = [
    {
      id: "opening",
      role: "milo",
      text: opening.text,
      textTh: opening.textTh,
    },
    ...messages,
  ];

  const chips = suggestions.length > 0 ? suggestions : opening.suggestions;

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/learn"
          className={buttonVariants({ size: "sm", variant: "ghost" })}
        >
          ← กลับ
        </Link>
        <div className="flex items-center gap-2">
          <Milo state={miloState} size={48} />
          <span className="text-kid font-extrabold">คุยกับ Milo</span>
        </div>
      </header>

      <div
        className="flex flex-wrap gap-2"
        role="group"
        aria-label="เลือกหัวข้อที่จะคุย"
      >
        {UNITS.map((unit) => (
          <button
            key={unit.id}
            type="button"
            onClick={() => changeTopic(unit.id)}
            aria-pressed={unit.id === unitId}
            className={cn(
              "rounded-pill border-2 px-3 py-1.5 text-kid-sm font-extrabold",
              unit.id === unitId
                ? "bg-primary border-primary text-primary-ink"
                : "bg-surface border-border text-ink",
            )}
          >
            {unit.emoji} {unit.titleTh}
          </button>
        ))}
      </div>

      <div
        className="bg-surface-2 rounded-card border-border flex min-h-[22rem] flex-col gap-3 border-2 p-4"
        aria-live="polite"
      >
        {visible.map((message) => (
          <div key={message.id} className="space-y-2">
            <Bubble
              message={message}
              showThai={thaiShown.includes(message.id)}
              onToggleThai={() =>
                setThaiShown((current) =>
                  current.includes(message.id)
                    ? current.filter((id) => id !== message.id)
                    : [...current, message.id],
                )
              }
            />
            {message.mistakes ? (
              <MistakeCard mistakes={message.mistakes} />
            ) : null}
          </div>
        ))}

        {sending ? (
          <p className="text-ink-muted text-kid-sm font-bold">
            Milo กำลังคิด…
          </p>
        ) : null}

        <div ref={bottom} />
      </div>

      {concerned ? (
        <Card className="border-danger bg-danger-soft space-y-1 border-2">
          <CardTitle className="text-kid">อยากให้บอกผู้ใหญ่</CardTitle>
          <CardNote className="text-ink">
            เรื่องที่หนูเล่าเป็นเรื่องสำคัญ ลองเล่าให้คุณครูหรือคนที่บ้านที่ไว้ใจฟังนะ
          </CardNote>
        </Card>
      ) : null}

      {notice ? (
        <Card className="border-accent bg-accent-soft border-2">
          <CardNote className="text-ink font-bold">{notice}</CardNote>
        </Card>
      ) : null}

      {!concerned ? (
        <div className="flex flex-wrap gap-2">
          {chips.map((chip) => (
            <button
              key={chip}
              type="button"
              disabled={sending}
              onClick={() => void send(chip)}
              className="pressable active:pressable-sunk rounded-pill [--edge:var(--accent-edge)] bg-accent text-accent-ink px-4 py-2 text-kid-sm font-extrabold disabled:opacity-45 disabled:shadow-none"
            >
              {chip}
            </button>
          ))}
        </div>
      ) : null}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          พิมพ์ข้อความถึง Milo
        </label>
        <input
          id="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={sending}
          maxLength={500}
          autoComplete="off"
          placeholder="พิมพ์เป็นภาษาอังกฤษ…"
          className="rounded-pill border-border bg-surface text-ink text-kid focus:border-primary h-13 flex-1 border-2 px-4 font-bold outline-none"
        />
        <Button
          type="submit"
          size="md"
          square
          disabled={sending || input.trim().length === 0}
          aria-label="ส่งข้อความ"
        >
          <Send className="size-6" strokeWidth={2.75} aria-hidden />
        </Button>
      </form>
    </div>
  );
}
