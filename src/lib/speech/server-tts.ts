import type { SpeakOptions, TtsProvider } from "./types";

/**
 * เสียงจากบริการคลาวด์ ผ่าน API route ของเราเอง (`/api/tts`)
 *
 * ฝั่งนี้ไม่รู้จักคีย์และไม่รู้ด้วยซ้ำว่าใช้เจ้าไหน รู้แค่ว่าส่งข้อความไป
 * แล้วได้ไฟล์เสียงกลับมา — เปลี่ยนผู้ให้บริการทีหลังแก้แค่ฝั่งเซิร์ฟเวอร์
 *
 * ต่างจาก Kokoro ตรงที่ไม่ต้องโหลดโมเดล 88 MB และเสียงดีกว่า
 * แต่ต้องต่อเน็ตทุกครั้งและมีค่าใช้จ่ายตามจำนวนตัวอักษร
 */
class ServerTtsProvider implements TtsProvider {
  readonly id = "server";

  private audio: HTMLAudioElement | null = null;
  private url: string | null = null;
  private configured: boolean | null = null;

  /**
   * หมายเลขรุ่นของคำสั่งอ่าน — ตัวกันเสียงซ้อน
   *
   * cancel() หยุดได้เฉพาะเสียงที่ "เล่นอยู่แล้ว" แต่ช่วงที่ยังรอไฟล์จาก
   * เซิร์ฟเวอร์ยังไม่มี element ให้หยุด ถ้ากดฟังอีกครั้งตอนนั้น คำสั่งเก่า
   * กับใหม่จะวิ่งคู่กันแล้วเล่นทับกันเป็นสองเสียง ซ้ำร้ายคำสั่งใหม่ยังเขียนทับ
   * this.audio ทำให้ตัวเก่ากลายเป็นเสียงผีที่หยุดไม่ได้เลยจนกว่าจะอ่านจบ
   *
   * จึงติดหมายเลขรุ่นกับทุกคำสั่ง คำสั่งที่ถูกแทนที่แล้วต้องทิ้งไฟล์ที่เพิ่ง
   * ได้มาโดยไม่เล่น และต้องไม่ไปแตะสถานะของคำสั่งใหม่ด้วย
   */
  private generation = 0;

  /**
   * ตัวปลด await ของคำสั่งที่กำลังเล่นอยู่
   *
   * ถูกยกเลิกกลางคันแล้ว onended จะไม่ยิง ถ้าไม่ปลดเอง promise ของ speak()
   * จะค้างตลอดกาล — ปุ่มลำโพงที่รออยู่จะกะพริบไม่หยุดทั้งที่เสียงหยุดไปแล้ว
   */
  private finish: (() => void) | null = null;

  isAvailable(): boolean {
    return typeof window !== "undefined" && typeof Audio !== "undefined";
  }

  /**
   * ตั้งคีย์ไว้ที่เซิร์ฟเวอร์หรือยัง
   *
   * ถามครั้งเดียวแล้วจำไว้ เพราะค่านี้เปลี่ยนได้ก็ต่อเมื่อรีสตาร์ตเซิร์ฟเวอร์
   */
  async isConfigured(): Promise<boolean> {
    if (this.configured !== null) return this.configured;
    if (!this.isAvailable()) return false;

    try {
      const response = await fetch("/api/tts");
      const payload = (await response.json()) as { configured?: boolean };
      this.configured = Boolean(payload.configured);
    } catch {
      this.configured = false;
    }

    return this.configured;
  }

  async speak(text: string, options: SpeakOptions = {}): Promise<void> {
    if (!this.isAvailable()) return;

    this.cancel();
    const generation = this.generation;

    try {
      const response = await fetch("/api/tts", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ text }),
      });

      if (!response.ok) {
        // ตั้งคีย์ไว้แต่เรียกไม่สำเร็จ ผู้เรียกมีทางถอยอยู่แล้ว
        if (response.status === 503) this.configured = false;
        return;
      }

      // มีคำสั่งใหม่แซงมาแล้ว ไฟล์ก้อนนี้ไม่ต้องเล่น
      if (generation !== this.generation) return;

      const blob = await response.blob();
      if (generation !== this.generation) return;

      const url = URL.createObjectURL(blob);
      const element = new Audio(url);
      element.volume = options.volume ?? 1;
      if (options.rate) element.playbackRate = options.rate;

      this.audio = element;
      this.url = url;

      await new Promise<void>((resolve) => {
        this.finish = resolve;
        element.onended = () => resolve();
        // เล่นไม่ได้ก็ไม่ควรทำให้หน้าจอค้าง — จบเงียบ ๆ
        element.onerror = () => resolve();
        void element.play().catch(() => resolve());
      });
    } catch {
      // เน็ตหลุดระหว่างทาง ปล่อยให้ผู้เรียกถอยไปเสียงอื่น
    } finally {
      // คำสั่งที่ถูกแทนที่ไปแล้วต้องไม่ไปล้างสถานะของคำสั่งใหม่
      if (generation === this.generation) this.release();
    }
  }

  private release() {
    if (this.url) URL.revokeObjectURL(this.url);
    this.url = null;
    this.audio = null;
    this.finish = null;
  }

  cancel(): void {
    // ขึ้นรุ่นใหม่ก่อน เพื่อให้คำสั่งที่ยังรอไฟล์อยู่รู้ตัวว่าถูกยกเลิกแล้ว
    this.generation += 1;
    if (this.audio) {
      this.audio.pause();
      this.audio.currentTime = 0;
    }
    // ปลดคนที่ await อยู่ด้วย ไม่งั้นปุ่มที่เรียกมาจะค้างรอตลอดไป
    this.finish?.();
    this.release();
  }
}

export const serverTts = new ServerTtsProvider();
