import { app } from "./app.js";
import { prisma } from "./config/database.js";
import { env } from "./config/env.js";

let server: ReturnType<typeof app.listen> | undefined;

async function startServer(): Promise<void> {
  try {
    await prisma.$connect();

    console.log("✅ Database connected successfully");

    server = app.listen(env.PORT, () => {
      console.log(`🚀 API running at http://localhost:${env.PORT}`);
    });
  } catch (error) {
    console.error("❌ Failed to start server:", error);
    await prisma.$disconnect();
    process.exit(1);
  }
}

async function shutdown(signal: string): Promise<void> {
  console.log(`\n${signal} received. Shutting down gracefully...`);

  server?.close(async () => {
    await prisma.$disconnect();
    console.log("✅ Server shut down successfully");
    process.exit(0);
  });
}

process.on("SIGINT", () => {
  void shutdown("SIGINT");
});

process.on("SIGTERM", () => {
  void shutdown("SIGTERM");
});

void startServer();
