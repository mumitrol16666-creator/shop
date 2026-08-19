import { startProdServer } from "vinext/server/prod-server";
import path from "node:path";

const port = 3000;
const host = "0.0.0.0";
const outDir = path.resolve(process.cwd(), "dist");

try {
  console.log(`Starting Maestro Production Server on http://localhost:${port}...`);
  await startProdServer({ port, host, outDir });
  console.log(`✅ Maestro Server is ready on http://localhost:${port}`);
} catch (err) {
  console.error("Server start error:", err);
}
