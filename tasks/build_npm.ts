import { build, emptyDir } from "https://deno.land/x/dnt@0.23.0/mod.ts";

const version = Deno.env.get("VERSION");
if (!version) throw new Error("No VERSION environment variable found");

await emptyDir("./npm");

await build({
  entryPoints: ["./mod.ts"],
  outDir: "./npm",
  shims: {
    deno: true,
  },
  package: {
    name: "@zebp/routy",
    version,
    description: "A simple request router",
    license: "MIT",
    repository: {
      type: "git",
      url: "git+https://github.com/zebp/routy.git",
    },
    bugs: {
      url: "https://github.com/zebp/routy/issues",
    },
  },
});

Deno.copyFileSync("LICENSE", "npm/LICENSE");
Deno.copyFileSync("README.md", "npm/README.md");
