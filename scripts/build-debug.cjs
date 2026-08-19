const fs = require("fs");
const path = require("path");
const esbuild = require("esbuild");

const root = "/Users/vladislav/Documents/Maestro/site";
const logFile = path.join(root, "build-debug.log");

async function run() {
  try {
    fs.writeFileSync(logFile, "Starting async build...\n");
    const res = await esbuild.build({
      entryPoints: [path.join(root, "src/main.tsx")],
      bundle: true,
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
        "process.env.NODE_ENV": '"development"',
      },
      external: ["tailwindcss"],
      jsx: "automatic",
    });
    fs.appendFileSync(logFile, "BUILD SUCCESS! Warnings: " + JSON.stringify(res.warnings) + "\n");
  } catch (err) {
    fs.appendFileSync(logFile, "ERROR: " + (err.errors ? JSON.stringify(err.errors, null, 2) : err.stack) + "\n");
  }
}
run();
