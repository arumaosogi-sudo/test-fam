export type Theme = "light" | "dark";

/**
 * ธีมเป็น "external store" จริง ๆ เพราะค่าที่แท้จริงอยู่บน DOM
 * (data-theme บน <html>) และบนการตั้งค่าของระบบปฏิบัติการ ไม่ได้อยู่ใน React
 *
 * ทำแบบนี้เพื่อให้ component อ่านค่าด้วย useSyncExternalStore ได้
 * ซึ่งปลอดภัยกับ SSR และไม่ต้องเรียก setState ในตัว effect
 */

const listeners = new Set<() => void>();

function emit() {
  for (const listener of listeners) listener();
}

export function subscribeTheme(onChange: () => void) {
  listeners.add(onChange);
  const media = window.matchMedia("(prefers-color-scheme: dark)");
  media.addEventListener("change", onChange);

  return () => {
    listeners.delete(onChange);
    media.removeEventListener("change", onChange);
  };
}

/** ค่าที่ใช้อยู่จริงตอนนี้: ค่าที่ผู้ใช้บังคับไว้ ถ้าไม่มีก็ตามระบบ */
export function getTheme(): Theme {
  const forced = document.documentElement.dataset.theme;
  if (forced === "light" || forced === "dark") return forced;
  return window.matchMedia("(prefers-color-scheme: dark)").matches
    ? "dark"
    : "light";
}

/**
 * ตอน render บนเซิร์ฟเวอร์เรายังไม่รู้ธีมของเครื่องผู้ใช้
 * จึงตอบ light ไปก่อน แล้ว React จะ render ใหม่ให้เองบน client
 */
export function getServerTheme(): Theme {
  return "light";
}

export function setTheme(theme: Theme) {
  document.documentElement.dataset.theme = theme;
  emit();
}
