import { createServer } from "vite";

try {
  const server = await createServer({
    configFile: "./vite.config.ts",
    server: { port: 3000, host: "0.0.0.0" }
  });
  await server.listen();
  console.log("🎸 Maestro Store Dev Server is ready on http://localhost:3000");
  server.printUrls();

  // Prevent Node event loop from exiting
  setInterval(() => {}, 1000 * 60 * 60);
} catch (err) {
  console.error("Vite server error:", err);
}
