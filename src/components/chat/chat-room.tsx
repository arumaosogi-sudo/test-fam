"use client";

import Link from "next/link";
import { useRef, useState, type FormEvent } from "react";

import { Milo } from "@/components/mascot/milo";
import { Button } from "@/components/ui/button";
import { buttonVariants } from "@/components/ui/button-variants";
import { Card, CardNote, CardTitle } from "@/components/ui/card";
import type { BuddyReply, ChatTurn, LanguageError } from "@/lib/chat/types";
import { getWord } from "@/lib/content";
import { getLesson } from "@/lib/content/lessons";
import { nextLessonId } from "@/lib/progress/session";
import { useHydrateProgress, useProgressStore } from "@/store/progress-store";

import { ChatBubble, ThinkingBubble } from "./chat-bubble";

/**
 * อายุของเด็กยังไม่มีเก็บในโปรไฟล์ (ตารางจริงมีช่อง birth_year แต่ตอนนี้
 * ยังไม่มีระบบบัญชี) ใช้ค่ากลางของช่วงอนุบาล–ประถมต้นไปก่อน
 * แล้วเปลี่ยนเป็นค่าจริงตอนภารกิจ E6
 */
const ASSUMED_AGE = 7;

/** คำเป้าหมายที่ส่งเข้าบทสนทนา มากกว่านี้ AI จะยัดคำจนประโยคไม่เป็นธรรมชาติ */
const MAX_TARGET_WORDS = 6;

type Message = {
  role: "child" | "buddy";
  text: string;
  textTh?: string;
  errors?: LanguageError[];
};

const GREETING: Message = {
  role: "buddy",
  text: "Hello! I am Milo. What is your favourite animal?",
  textTh: "สวัสดี! ฉันชื่อไมโล สัตว์ตัวโปรดของหนูคืออะไร",
};

type ApiOk = { reply: BuddyReply; noticeTh: string | null };
type ApiError = { error: string; messageTh?: string };

export function ChatRoom() {
  useHydrateProgress();

  const hydrated = useProgressStore((state) => state.hydrated);
  const profile = useProgressStore((state) => state.profile);
  const results = useProgressStore((state) => state.results);
  const spendChatTurn = useProgressStore((state) => state.spendChatTurn);
  const canChatNow = useProgressStore((state) => state.canChatNow);

  const [messages, setMessages] = useState<Message[]>([GREETING]);
  const [followups, setFollowups] = useState<string[]>([]);
  const [draft, setDraft] = useState("");
  const [thinking, setThinking] = useState(false);
  const [notice, setNotice] = useState<string | null>(null);
  const [setupNeeded, setSetupNeeded] = useState(false);
  const endRef = useRef<HTMLDivElement>(null);

  if (!hydrated) {
    return (
      <div className="mt-20 flex flex-col items-center gap-4">
        <Milo state="idle" size={120} />
        <p className="text-ink-muted font-bold">กำลังเตรียมห้องคุย…</p>
      </div>
    );
  }

  /** คำที่เด็กกำลังเรียนอยู่ ใช้ชี้นำให้บทสนทนาวนอยู่กับคำเหล่านี้ */
  function targetWords(): string[] {
    const lesson = getLesson(nextLessonId(results) ?? "");
    if (!lesson) return [];
    return lesson.wordIds
      .map((id) => getWord(id)?.en)
      .filter((word): word is string => Boolean(word))
      .slice(0, MAX_TARGET_WORDS);
  }

  async function send(text: string) {
    const trimmed = text.trim();
    if (trimmed.length === 0 || thinking) return;

    if (!canChatNow()) {
      setNotice("วันนี้คุยกับ Milo ครบแล้ว พรุ่งนี้มาคุยกันใหม่นะ");
      return;
    }

    const history: Message[] = [...messages, { role: "child", text: trimmed }];
    setMessages(history);
    setDraft("");
    setFollowups([]);
    setNotice(null);
    setThinking(true);

    const turns: ChatTurn[] = history.map((message) => ({
      role: message.role,
      text: message.text,
    }));

    try {
      const response = await fetch("/api/chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          turns,
          child: {
            ageYears: ASSUMED_AGE,
            cefr: profile.cefr,
            targetWords: targetWords(),
            topicTh: "สิ่งรอบตัวและสิ่งที่ชอบ",
          },
        }),
      });

      if (!response.ok) {
        const problem = (await response.json()) as ApiError;
        if (problem.error === "not_configured") setSetupNeeded(true);
        setNotice(problem.messageTh ?? "ตอนนี้คุยกับ Milo ไม่ได้ ลองใหม่นะ");
        return;
      }

      const { reply, noticeTh } = (await response.json()) as ApiOk;
      spendChatTurn();

      setMessages([
        ...history,
        {
          role: "buddy",
          text: reply.reply,
          textTh: reply.replyTh || undefined,
          errors: reply.errors.length > 0 ? reply.errors : undefined,
        },
      ]);
      setFollowups(reply.suggestedFollowups);
      if (noticeTh) setNotice(noticeTh);

      // เรื่องที่น่าเป็นห่วงต้องไม่จบอยู่แค่ในแชท ผู้ใหญ่ต้องได้เห็น
      if (reply.safetyFlag === "concerning") {
        setNotice(
          "Milo เห็นว่าหนูเล่าเรื่องที่อาจไม่สบายใจ ลองเล่าให้ผู้ใหญ่ที่ไว้ใจฟังด้วยนะ",
        );
      }
    } catch {
      setNotice("เชื่อมต่อไม่ได้ ลองเช็กอินเทอร์เน็ตแล้วลองใหม่นะ");
    } finally {
      setThinking(false);
      endRef.current?.scrollIntoView({ behavior: "smooth" });
    }
  }

  function handleSubmit(event: FormEvent) {
    event.preventDefault();
    void send(draft);
  }

  if (setupNeeded) {
    return (
      <Card className="mx-auto mt-10 max-w-md space-y-3">
        <CardTitle>ยังไม่ได้ตั้งค่า AI</CardTitle>
        <CardNote>
          หน้าแชทต้องมีคีย์ของผู้ให้บริการ AI ก่อนถึงจะคุยได้ คัดลอก
          <code className="bg-surface-2 mx-1 rounded px-1 font-mono">
            .env.local.example
          </code>
          เป็น
          <code className="bg-surface-2 mx-1 rounded px-1 font-mono">
            .env.local
          </code>
          แล้วใส่ค่า ANTHROPIC_API_KEY จากนั้นรีสตาร์ต dev server
        </CardNote>
        <Link href="/learn" className={buttonVariants({ size: "md" })}>
          กลับไปเล่นด่าน
        </Link>
      </Card>
    );
  }

  return (
    <div className="mx-auto flex max-w-xl flex-col gap-4 py-6">
      <header className="flex items-center justify-between gap-3">
        <Link
          href="/learn"
          className={buttonVariants({ size: "sm", variant: "ghost" })}
        >
          ← ออก
        </Link>
        <h1 className="text-kid-lg font-extrabold">คุยกับ Milo</h1>
      </header>

      <div className="space-y-4">
        {messages.map((message, index) => (
          <ChatBubble
            key={index}
            role={message.role}
            text={message.text}
            textTh={message.textTh}
            errors={message.errors}
          />
        ))}
        {thinking ? <ThinkingBubble /> : null}
        <div ref={endRef} />
      </div>

      {notice ? (
        <p
          role="status"
          aria-live="polite"
          className="bg-accent-soft rounded-card text-ink text-kid-sm p-3 text-center font-bold"
        >
          {notice}
        </p>
      ) : null}

      {/* ตัวช่วยสำหรับเด็กที่ยังแต่งประโยคเองไม่ได้ — กดแล้วส่งได้เลย */}
      {followups.length > 0 && !thinking ? (
        <div className="flex flex-wrap gap-2">
          {followups.map((suggestion) => (
            <button
              key={suggestion}
              type="button"
              onClick={() => void send(suggestion)}
              className="pressable active:pressable-sunk rounded-pill [--edge:var(--border)] bg-surface border-border text-ink text-kid-sm min-h-11 border-2 px-4 font-bold"
            >
              {suggestion}
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
          value={draft}
          onChange={(event) => setDraft(event.target.value)}
          disabled={thinking}
          autoComplete="off"
          placeholder="พิมพ์เป็นภาษาอังกฤษ…"
          className="rounded-pill border-border bg-surface text-ink text-kid focus:border-primary h-13 min-w-0 flex-1 border-2 px-5 font-bold outline-none"
        />
        <Button
          type="submit"
          size="md"
          disabled={thinking || draft.trim().length === 0}
        >
          ส่ง
        </Button>
      </form>
    </div>
  );
}
