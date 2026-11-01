import { defineConfig } from "vitest/config";

export default defineConfig({
  resolve: {
    // อ่าน path alias "@/..." จาก tsconfig โดยตรง ไม่ต้องใช้ปลั๊กอินเสริม
    tsconfigPaths: true,
  },
  test: {
    // เทสในเฟสนี้เป็นตรรกะล้วน ไม่ต้องใช้ DOM
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
});
