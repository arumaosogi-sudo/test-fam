"use client";

import { ChevronDown, Languages, Mic, Send, Square } from "lucide-react";
import Link from "next/link";
import { useEffect, useMemo, useRef, useState, type FormEvent } from "react";

import { Milo, type MiloState } from "@/components/mascot/milo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import { SpeakerButton } from "@/components/ui/speaker-button";
import {
  CHAT_TOPICS,
  FREE_TOPIC_ID,
  getTopic,
  topicWords,
} from "@/lib/chat/topics";
import type { ChatMessage, ChatMistake, ChatTurn } from "@/lib/chat/types";
import { MILO_VOICE } from "@/lib/chat/voice";
import { useMiloVoice } from "./use-milo-voice";
import type { CefrLevel } from "@/lib/types";
import {
  getRecognizer,
  micFailureMessage,
  type ListenHandle,
} from "@/lib/speech";
import { cn } from "@/lib/utils";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

/** คำเปิดบทสนทนาที่สร้างในเครื่อง ไม่ต้องเสียเทิร์นเรียกโมเดลเพื่อทักทาย */
function openingFor(topicId: string, cefr: CefrLevel) {
  const topic = getTopic(topicId);
  const words = topicWords(topicId, cefr, 8);
  const free = topicId === FREE_TOPIC_ID;

  return {
    text: free
      ? "Hi! I am Milo. What do you want to talk about?"
      : `Hi! I am Milo. Let's talk about ${topic?.titleEn ?? "English"}!`,
    textTh: free
      ? "สวัสดี! ฉันชื่อไมโล อยากคุยเรื่องอะไรดี"
      : `สวัสดี! ฉันชื่อไมโล มาคุยเรื่อง${topic?.titleTh ?? "ภาษาอังกฤษ"}กัน!`,
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
            <SpeakerButton text={message.text} size="sm" voice={MILO_VOICE} />
            <SpeakerButton
              text={message.text}
              slow
              size="sm"
              voice={MILO_VOICE}
            />
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

  // เริ่มที่ "คุยอะไรก็ได้" เพราะเด็กส่วนใหญ่เปิดมาเพื่อคุย ไม่ได้มาเลือกหมวด
  const [topicId, setTopicId] = useState(FREE_TOPIC_ID);
  const cefr = profile.cefr;
  const opening = useMemo(() => openingFor(topicId, cefr), [topicId, cefr]);
  const currentTopic = getTopic(topicId);

  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [suggestions, setSuggestions] = useState<string[]>([]);
  const [input, setInput] = useState("");
  const [sending, setSending] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [concerned, setConcerned] = useState(false);
  const [thaiShown, setThaiShown] = useState<string[]>([]);
  const [topicOpen, setTopicOpen] = useState(false);
  const [listening, setListening] = useState(false);
  const [heard, setHeard] = useState("");
  const [micError, setMicError] = useState<string | null>(null);

  const voice = useMiloVoice();

  const nextId = useRef(0);
  const bottom = useRef<HTMLDivElement>(null);
  const listenHandle = useRef<ListenHandle | null>(null);

  // ไมค์ที่ยังเปิดค้างอยู่ตอนออกจากหน้าต้องถูกปิด ไม่งั้นเบราว์เซอร์ยังอัดต่อ
  useEffect(() => {
    return () => listenHandle.current?.abort();
  }, []);

  // เลื่อนลงล่างสุดเมื่อมีข้อความใหม่ เด็กไม่ต้องหาเอง
  useEffect(() => {
    bottom.current?.scrollIntoView({ behavior: "smooth", block: "end" });
  }, [messages, sending]);

  function makeId() {
    nextId.current += 1;
    return `m${nextId.current}`;
  }

  function changeTopic(id: string) {
    setTopicId(id);
    setTopicOpen(false);
    setMessages([]);
    setSuggestions([]);
    setNotice(null);
    setConcerned(false);
    voice.cancel();
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
          cefr,
          topicId,
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
      void voice.speak(turn.reply);
    } catch {
      setNotice("ต่อเน็ตไม่ได้ ลองใหม่อีกครั้งนะ");
    } finally {
      setSending(false);
    }
  }

  /**
   * ฟังเด็กพูดแล้ว **ส่งเข้าแชทเลย** ไม่ต้องกดส่งอีกที
   *
   * ตอนแรกทำเป็นเติมลงช่องพิมพ์ให้เด็กตรวจก่อน เพราะตัวถอดเสียงพลาดบ่อย
   * กับสำเนียงไทย แต่พอใช้จริงแล้วมันขัดจังหวะการคุย — เด็กพูดจบแล้วยัง
   * ต้องละมือไปกดปุ่มอีกครั้ง ทำให้การคุยไม่ต่อเนื่อง
   *
   * ถ้าถอดผิด เด็กพูดใหม่หรือพิมพ์แก้ในเทิร์นถัดไปได้ ซึ่งเป็นสิ่งที่
   * เกิดในการคุยกับคนจริงอยู่แล้ว
   */
  function startListening() {
    if (listening || sending) return;

    const recognizer = getRecognizer();
    if (!recognizer.isSupported()) {
      setMicError("เบราว์เซอร์นี้ยังฟังเสียงไม่ได้ ลองใช้ Chrome นะ");
      return;
    }

    setMicError(null);
    setHeard("");
    setListening(true);

    listenHandle.current = recognizer.listen({
      lang: "en-US",
      /*
       * ฟังต่อเนื่องและให้เวลานาน เพราะเด็กที่กำลังนึกประโยคอังกฤษจะหยุดคิด
       * กลางทางเสมอ โหมดคำเดียวจะปิดไมค์ทันทีที่เงียบ ซึ่งตัดเด็กกลางประโยค
       * — เจอตอนทดสอบจริง เด็กยังพูดไม่จบไมค์ก็ปิดไปแล้ว
       *
       * เด็กกดหยุดเองได้ที่ปุ่มเดิม ตัวจับเวลาเป็นแค่กันค้าง ไม่ใช่กำหนดเวลาพูด
       */
      continuous: true,
      timeoutMs: 45_000,
      // ยอมให้เงียบได้หกวินาทีก่อนถือว่าพูดจบ เด็กต้องใช้เวลานึกประโยคอังกฤษ
      silenceGraceMs: 6_000,
      onInterim: setHeard,
      onDone: (outcome) => {
        setListening(false);
        setHeard("");
        listenHandle.current = null;

        if (outcome.kind === "failed") {
          setMicError(micFailureMessage(outcome.reason, "พูด"));
          return;
        }

        const said = outcome.heard.alternatives[0]?.trim();
        if (!said) {
          setMicError("ยังไม่ได้ยินเลย ลองพูดดัง ๆ อีกครั้งนะ");
          return;
        }

        // พิมพ์ค้างไว้ก่อนแล้วค่อยพูดต่อ ก็ส่งรวมกันทั้งก้อน
        const typed = input.trim();
        void send(typed ? `${typed} ${said}` : said);
      },
    });
  }

  function stopListening() {
    listenHandle.current?.stop();
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

{/* หัวข้อย่อไว้บรรทัดเดียว กางเฉพาะตอนจะเปลี่ยน
          เมนูนี้เคยไล่ทุกหน่วยในคลัง ซึ่งตอนเขียนมีสิบหน่วยจึงพอไหว
          พอคลังโตเป็น 121 หน่วยก็กลายเป็นปุ่มร้อยกว่าปุ่มที่เด็กเลือกไม่ถูก
          และหลายหน่วยก็ไม่ใช่เรื่องที่ใครจะชวนคุย เช่น "คำกริยา B2 ชุด 4"
          ตอนนี้จัดเป็นหมวดใหญ่ไม่กี่หมวดใน lib/chat/topics.ts แทน */}
      <div className="relative">
        <button
          type="button"
          onClick={() => setTopicOpen(!topicOpen)}
          aria-expanded={topicOpen}
          className="pressable active:pressable-sunk rounded-pill [--edge:var(--border)] bg-surface border-border text-ink text-kid-sm inline-flex items-center gap-2 border-2 px-4 py-2 font-extrabold"
        >
          <span>คุยเรื่อง</span>
          <span>{currentTopic?.emoji}</span>
          <span>{currentTopic?.titleTh}</span>
          <ChevronDown
            className={cn("size-5 transition-transform", topicOpen && "rotate-180")}
            strokeWidth={2.75}
            aria-hidden
          />
        </button>

        {topicOpen ? (
          <div
            role="group"
            aria-label="เลือกหัวข้อที่จะคุย"
            className="bg-surface border-border rounded-card shadow-card absolute z-10 mt-2 grid w-full grid-cols-2 gap-2 border-2 p-3 sm:grid-cols-3"
          >
            {CHAT_TOPICS.map((topic) => (
              <button
                key={topic.id}
                type="button"
                onClick={() => changeTopic(topic.id)}
                aria-pressed={topic.id === topicId}
                className={cn(
                  "rounded-pill text-kid-sm border-2 px-3 py-2 font-extrabold",
                  topic.id === topicId
                    ? "bg-primary border-primary text-primary-ink"
                    : "bg-surface-2 border-border text-ink",
                )}
              >
                {topic.emoji} {topic.titleTh}
              </button>
            ))}
          </div>
        ) : null}
      </div>

      {/*
        เสียงรุ่นใหม่ต้องให้ผู้ใช้กดเอง เพราะครั้งแรกโหลดราว 88 MB
        เปิดอัตโนมัติไม่ได้ เด็กที่ใช้เน็ตมือถือจะเสียค่าเน็ตโดยไม่รู้ตัว
      */}
      <div className="flex flex-wrap items-center gap-2">
        {voice.serverReady ? (
          <span className="text-ink-muted text-kid-sm font-bold">
            กำลังใช้เสียง Milo จากบริการเสียง
          </span>
        ) : (
          <>
            <Button
              type="button"
              size="sm"
              variant={voice.useKokoro ? "accent" : "neutral"}
              onClick={() =>
                voice.useKokoro
                  ? voice.disableKokoro()
                  : void voice.enableKokoro()
              }
              aria-pressed={voice.useKokoro}
            >
              {voice.useKokoro ? "เสียงใหม่ของ Milo" : "ลองเสียงใหม่ของ Milo"}
            </Button>

            <span className="text-ink-muted text-kid-sm font-bold">
              {!voice.useKokoro
                ? "ตอนนี้ใช้เสียงของเบราว์เซอร์"
                : voice.status.kind === "loading"
                  ? "กำลังโหลดเสียง ~88 MB ครั้งแรกครั้งเดียว…"
                  : voice.status.kind === "ready"
                    ? "พร้อมแล้ว"
                    : voice.status.kind === "failed"
                      ? "โหลดเสียงไม่สำเร็จ ใช้เสียงเบราว์เซอร์ไปก่อน"
                      : "กำลังเตรียม…"}
            </span>
          </>
        )}
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

      {listening || heard ? (
        <p
          className="text-ink-muted text-kid-sm font-bold"
          aria-live="polite"
        >
          {heard ? `ได้ยินว่า: ${heard}` : "กำลังฟัง… พูดเป็นภาษาอังกฤษได้เลย"}
        </p>
      ) : null}

      {micError ? (
        <Card className="border-warn bg-warn-soft border-2">
          <CardNote className="text-ink font-bold">{micError}</CardNote>
        </Card>
      ) : null}

      <form onSubmit={handleSubmit} className="flex gap-2">
        <label htmlFor="chat-input" className="sr-only">
          พิมพ์ข้อความถึง Milo
        </label>

        <Button
          type="button"
          size="md"
          square
          variant={listening ? "accent" : "neutral"}
          onClick={listening ? stopListening : startListening}
          disabled={sending}
          aria-pressed={listening}
          aria-label={listening ? "หยุดฟัง" : "พูดแทนการพิมพ์"}
        >
          {listening ? (
            <Square className="size-5" strokeWidth={2.75} aria-hidden />
          ) : (
            <Mic className="size-6" strokeWidth={2.75} aria-hidden />
          )}
        </Button>
        <input
          id="chat-input"
          value={input}
          onChange={(event) => setInput(event.target.value)}
          disabled={sending}
          maxLength={500}
          autoComplete="off"
          placeholder={listening ? "กำลังฟัง…" : "พิมพ์หรือกดไมค์พูด…"}
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
