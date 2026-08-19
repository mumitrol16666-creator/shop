import { createServer } from "vite";

try {
  const server = await createServer({
    configFile: "./vite.config.ts",
    server: { port: 3000, host: "0.0.0.0" }
  });
  await server.listen();
  console.log("🚀 Maestro Dev Server is listening on http://localhost:3000");
  server.printUrls();
} catch (err) {
  console.error("Failed to start dev server:", err);
}
