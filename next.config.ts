import type { NextConfig } from "next";

const nextConfig: NextConfig = {
  cacheComponents: true,
  partialPrefetching: true,
  turbopack: {
    // ชี้รากโปรเจกต์ให้ชัด ไม่งั้น Turbopack จะไต่ขึ้นไปเจอ package-lock.json
    // ของโฟลเดอร์แม่ (C:\Seminar) แล้วเตือนทุกครั้งที่ build
    root: __dirname,
    rules: {
      "*.css": {
        loaders: ["@tailwindcss/turbopack"],
        as: "*.css",
      },
    },
  },
};

export default nextConfig;
