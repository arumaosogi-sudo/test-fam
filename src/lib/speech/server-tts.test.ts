import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";

import { serverTts } from "./server-tts";

/**
 * เทสกันเสียงซ้อน
 *
 * ผู้ใช้รายงานว่า "ฟังแล้วมีเสียงซ้อนกัน" ต้นเหตุคือช่วงที่ยังรอไฟล์เสียง
 * จากเซิร์ฟเวอร์ยังไม่มี <audio> ให้ cancel() หยุด กดฟังซ้ำตอนนั้นคำสั่งเก่า
 * กับใหม่จึงวิ่งคู่กันแล้วเล่นพร้อมกันสองเสียง
 *
 * สถานการณ์นี้ทดสอบด้วยมือยากมาก เพราะต้องกดให้ตรงจังหวะพอดี จึงต้องคุม
 * เวลาของ fetch เองในเทส
 */

/** <audio> ปลอมที่บอกได้ว่าตอนนี้มีกี่ตัวกำลังเล่นอยู่ */
class FakeAudio {
  static playing = new Set<FakeAudio>();
  static created: FakeAudio[] = [];

  volume = 1;
  playbackRate = 1;
  currentTime = 0;
  onended: (() => void) | null = null;
  onerror: (() => void) | null = null;

  constructor(readonly src: string) {
    FakeAudio.created.push(this);
  }

  play(): Promise<void> {
    FakeAudio.playing.add(this);
    return Promise.resolve();
  }

  pause(): void {
    FakeAudio.playing.delete(this);
  }

  /** จำลองว่าอ่านจบแล้ว */
  finish(): void {
    FakeAudio.playing.delete(this);
    this.onended?.();
  }

  static reset(): void {
    FakeAudio.playing.clear();
    FakeAudio.created = [];
  }
}

/** คุม fetch เองเพื่อให้สองคำสั่งคาบเกี่ยวกันได้แน่นอน */
function deferred<T>() {
  let resolve!: (value: T) => void;
  const promise = new Promise<T>((r) => {
    resolve = r;
  });
  return { promise, resolve };
}

function audioResponse() {
  return {
    ok: true,
    status: 200,
    blob: async () => new Blob([new Uint8Array([1, 2, 3])]),
  } as unknown as Response;
}

beforeEach(() => {
  FakeAudio.reset();
  vi.stubGlobal("window", {});
  vi.stubGlobal("Audio", FakeAudio);
  vi.stubGlobal("URL", {
    createObjectURL: (blob: Blob) => `blob:${blob.size}`,
    revokeObjectURL: () => {},
  });
});

afterEach(() => {
  vi.unstubAllGlobals();
  serverTts.cancel();
});

describe("serverTts.speak", () => {
  it("กดฟังซ้ำระหว่างที่ยังรอไฟล์ ต้องได้เสียงเดียว ไม่ใช่สองเสียงซ้อนกัน", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const responses = [first.promise, second.promise];
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responses.shift()),
    );

    // สองคำสั่งคาบเกี่ยวกัน — ตัวแรกยังไม่ได้ไฟล์ตอนตัวที่สองเริ่ม
    const a = serverTts.speak("Hello.");
    const b = serverTts.speak("Goodbye.");

    // ไฟล์ของตัวแรกเพิ่งมาถึงทีหลัง ซึ่งเป็นจังหวะที่ทำให้เกิดเสียงซ้อน
    first.resolve(audioResponse());
    second.resolve(audioResponse());
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    expect(FakeAudio.playing.size).toBe(1);
    // ตัวที่ถูกแทนที่ต้องไม่ถูกสร้างเป็นเสียงเลย ไม่ใช่สร้างแล้วค่อยหยุด
    expect(FakeAudio.created).toHaveLength(1);

    for (const audio of [...FakeAudio.playing]) audio.finish();
    await Promise.all([a, b]);
  });

  it("คำสั่งเก่าที่ถูกแทนที่ ต้องไม่ไปปิดเสียงของคำสั่งใหม่ตอนมันจบ", async () => {
    const first = deferred<Response>();
    const second = deferred<Response>();
    const responses = [first.promise, second.promise];
    vi.stubGlobal(
      "fetch",
      vi.fn(() => responses.shift()),
    );

    const a = serverTts.speak("Hello.");
    const b = serverTts.speak("Goodbye.");

    second.resolve(audioResponse());
    await Promise.resolve();
    await Promise.resolve();
    await Promise.resolve();

    // ตัวแรกเพิ่งได้ไฟล์หลังตัวใหม่เริ่มเล่นไปแล้ว
    first.resolve(audioResponse());
    await a;

    // ถ้า finally ของตัวเก่าไปล้างสถานะ ตัวใหม่จะกลายเป็นเสียงที่หยุดไม่ได้
    expect(FakeAudio.playing.size).toBe(1);
    serverTts.cancel();
    expect(FakeAudio.playing.size).toBe(0);

    // ยกเลิกแล้วต้องปลด await ให้ด้วย ไม่งั้นปุ่มลำโพงจะกะพริบค้างตลอดไป
    await b;
  });

  it("cancel ระหว่างรอไฟล์ แล้วไฟล์มาถึงทีหลัง ต้องไม่เล่น", async () => {
    const pending = deferred<Response>();
    vi.stubGlobal(
      "fetch",
      vi.fn(() => pending.promise),
    );

    const speaking = serverTts.speak("Hello.");
    serverTts.cancel();

    pending.resolve(audioResponse());
    await speaking;

    expect(FakeAudio.created).toHaveLength(0);
  });
});
