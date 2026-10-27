import { defineConfig } from "vitest/config";
import path from "node:path";

export default defineConfig({
  resolve: { alias: { "@": path.resolve(__dirname, "src") } },
  test: {
    setupFiles: ["./tests/setup.ts"],
    // tests share one database, run them one file at a time
    fileParallelism: false,
  },
});
