import * as esbuild from "esbuild";
import path from "node:path";

const root = "/Users/vladislav/Documents/Maestro/site";

async function build() {
  try {
    const res = await esbuild.build({
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
    console.log("✅ ESBuild ESM bundle compiled successfully (minified)!");
  } catch (err) {
    console.error("ESBuild error:", err);
  }
}
build();
