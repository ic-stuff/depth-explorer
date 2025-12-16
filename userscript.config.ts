import { defineConfig } from "usts/config";

export default defineConfig({
  entryPoint: "./src/userscript/index.ts",
  header: {
    name: "Depth Explorer",
    namespace: "Catstone",
    match: "https://neal.fun/infinite-craft/",
    grant: ["GM_getValue", "GM_setValue"],
    "run-at": "document-start",
    version: "1.0",
    author: "Catstone",
    description:
      "Explores the deep depths of InfiniteCraft. Use `depthExplorer()` to start the bot. For all settings/commands, check the code itself!",
  },
});
