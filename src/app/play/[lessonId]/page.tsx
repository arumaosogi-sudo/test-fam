import { Suspense } from "react";

import { LessonSession } from "@/components/games/lesson-session";
import { Milo } from "@/components/mascot/milo";
import { LESSONS } from "@/lib/content/lessons";

/**
 * รู้รายชื่อด่านทั้งหมดตั้งแต่ตอน build (มาจากไฟล์ JSON ไม่ใช่ฐานข้อมูล)
 * จึง prerender ไว้ล่วงหน้าได้ทุกด่าน หน้าเลยเปิดเร็วและไม่ต้องรอเซิร์ฟเวอร์
 */
export function generateStaticParams() {
  return LESSONS.map((lesson) => ({ lessonId: lesson.id }));
}

function LoadingLesson() {
  return (
    <div className="mt-20 flex flex-col items-center gap-4">
      <Milo state="idle" size={120} />
      <p className="text-ink-muted font-bold">กำลังเตรียมด่าน…</p>
    </div>
  );
}

/**
 * การอ่าน params ต้องอยู่ใน Suspense เพราะโปรเจกต์เปิด cacheComponents ไว้
 * ถ้าอ่านนอก Suspense ตัวหน้าจะกลายเป็นต้องรอเซิร์ฟเวอร์ทั้งหน้าก่อนจะวาดอะไรได้
 */
async function LessonLoader({
  params,
}: {
  params: PageProps<"/play/[lessonId]">["params"];
}) {
  const { lessonId } = await params;

  return <LessonSession lessonId={lessonId} />;
}

export default function PlayPage({ params }: PageProps<"/play/[lessonId]">) {
  return (
    <main className="w-full px-4">
      <Suspense fallback={<LoadingLesson />}>
        <LessonLoader params={params} />
      </Suspense>
    </main>
  );
}
