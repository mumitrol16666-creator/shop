import * as esbuild from "esbuild";
import path from "node:path";
import { readFile, writeFile } from "node:fs/promises";

const root = process.cwd();

async function build() {
  try {
    // 1. Build Client JS bundle
    await esbuild.build({
      entryPoints: [path.join(root, "src/main.tsx")],
      bundle: true,
      format: "esm",
      outfile: path.join(root, "public/bundle.js"),
      tsconfig: path.join(root, "tsconfig.json"),
      loader: {
        ".png": "file",
        ".jpg": "file",
        ".svg": "text",
        ".woff2": "file",
        ".woff": "file",
        ".ttf": "file",
        ".css": "css",
      },
      define: {
        "process.env.NODE_ENV": '"production"',
        "process.env.NEXT_PUBLIC_COMMERCE_STAGE0": JSON.stringify(
          process.env.NEXT_PUBLIC_COMMERCE_STAGE0 ?? "1",
        ),
      },
      alias: {
        "@": root,
        "next/image": path.join(root, "lib/next-image-shim.tsx"),
        "next/link": path.join(root, "lib/next-link-shim.tsx"),
        "next/navigation": path.join(root, "lib/next-nav-shim.ts"),
      },
      external: ["tailwindcss"],
      jsx: "automatic",
      minify: true,
      treeShaking: true,
      legalComments: "none",
      logLevel: "info",
    });

    // 2. Build VPS commerce core bundle
    await esbuild.build({
      entryPoints: [path.join(root, "lib/commerce/vps-entry.ts")],
      bundle: true,
      platform: "node",
      target: "node22",
      format: "cjs",
      outfile: path.join(root, "dist-vps/commerce-core.cjs"),
      tsconfig: path.join(root, "tsconfig.json"),
      minify: false,
      sourcemap: false,
      legalComments: "none",
      logLevel: "info",
    });

    // 3. Build & Minify CSS bundle
    const css1 = await readFile(path.join(root, "app/globals.css"), "utf8");
    const css2 = await readFile(path.join(root, "components/store/store-routes.css"), "utf8");
    const combined = `${css1}\n${css2}`;
    const cssRes = await esbuild.transform(combined, { loader: "css", minify: true });
    await writeFile(path.join(root, "public/bundle.css"), cssRes.code);

    console.log("✅ ESBuild ESM bundle & minified CSS compiled successfully!");
  } catch (err) {
    console.error("ESBuild error:", err);
    process.exitCode = 1;
  }
}
await build();
