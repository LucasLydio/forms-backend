import { app } from "./app.js";
import { env } from "./config/env.js";
import { prisma } from "./config/prisma.js";
import { logger } from "./utils/logger.js";

async function bootstrap() {
  try {
    await prisma.$connect();
    logger.info("✅ Connected to database");

    const server = app.listen(env.PORT, () => {
      logger.info(`🚀 Server running on http://localhost:${env.PORT}`);
    });

    const shutdown = async (signal: string) => {
      logger.info({ signal }, "Shutting down...");
      server.close(async () => { 
        try {
          await prisma.$disconnect();
          logger.info("✅ Prisma disconnected");
          process.exit(0);
        } catch (err) {
          logger.error({ err }, "Error disconnecting Prisma");
          process.exit(1);
        }
      });
    };

    process.on("SIGINT", () => shutdown("SIGINT"));
    process.on("SIGTERM", () => shutdown("SIGTERM"));
  } catch (err) {
    logger.error({ err }, "Failed to bootstrap server");
    process.exit(1);
  }
}

bootstrap();
