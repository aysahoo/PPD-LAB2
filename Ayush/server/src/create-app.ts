/**
 * Fastify app factory. Avoid `src/app.ts`: Vercel’s Fastify integration treats that path as
 * the serverless entry and expects a default export (handler); this file only exports `buildApp`.
 */
import cors from "@fastify/cors";
import multipart from "@fastify/multipart";
import swagger from "@fastify/swagger";
import swaggerUi from "@fastify/swagger-ui";
import Fastify, { type FastifyServerOptions } from "fastify";

import { createCorsOriginCallback } from "./cors-origin.js";
import { pool } from "./db/pool.js";
import { env } from "./env.js";
import { authRoutes } from "./routes/auth.js";
import { coursesRoutes } from "./routes/courses.js";
import { adminRoutes } from "./routes/admin.js";
import { enrollmentsRoutes } from "./routes/enrollments.js";
import { notificationsRoutes } from "./routes/notifications.js";
import { studentDocumentRoutes } from "./routes/student-documents.js";
import { studentsRoutes } from "./routes/students.js";

function buildLoggerOptions() {
  const redact = ["req.headers.authorization", "req.headers.cookie"] as const;
  const base = {
    level: env.LOG_LEVEL,
    redact: [...redact],
  };
  if (env.NODE_ENV === "development") {
    return {
      ...base,
      transport: {
        target: "pino-pretty",
        options: {
          colorize: true,
          translateTime: "HH:MM:ss Z",
          ignore: "pid,hostname",
        },
      },
    };
  }
  return base;
}

export type BuildAppOptions = {
  /** Default: false in test, otherwise structured Pino config. */
  logger?: FastifyServerOptions["logger"];
  /** When false, skip OpenAPI /documentation (e.g. tests). Default true outside test. */
  enableSwagger?: boolean;
};

export async function buildApp(options: BuildAppOptions = {}) {
  const logger =
    options.logger !== undefined
      ? options.logger
      : env.NODE_ENV === "test"
        ? false
        : buildLoggerOptions();

  const app = Fastify({ logger });

  const enableSwagger =
    options.enableSwagger !== undefined
      ? options.enableSwagger
      : env.NODE_ENV !== "test";

  if (enableSwagger) {
    await app.register(swagger, {
      openapi: {
        openapi: "3.0.3",
        info: {
          title: "PPD Lab — Course enrollment API",
          description:
            "Student and admin REST API. Authenticated routes expect Authorization: Bearer <jwt>.",
          version: "1.0.0",
        },
        servers: [{ url: "/", description: "Same origin as this server" }],
      },
    });
    await app.register(swaggerUi, {
      routePrefix: "/documentation",
      uiConfig: {
        docExpansion: "list",
        deepLinking: true,
      },
    });
  }

  await app.register(cors, {
    origin: createCorsOriginCallback(env),
    credentials: true,
    // Default @fastify/cors methods are only GET,HEAD,POST — REST routes use PUT/DELETE/PATCH.
    methods: ["GET", "HEAD", "POST", "PUT", "PATCH", "DELETE", "OPTIONS"],
    allowedHeaders: ["Content-Type", "Authorization"],
  });

  await app.register(multipart, {
    limits: { fileSize: 5 * 1024 * 1024 },
    throwFileSizeLimit: true,
  });

  app.get("/health", async () => ({ status: "ok" }));

  app.get("/health/db", async (_req, reply) => {
    try {
      await pool.query("SELECT 1");
      return { status: "ok", database: "connected" };
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : String(err);
      app.log.error({ err: message }, "database health check failed");
      return reply.code(503).send({
        status: "error",
        database: "disconnected",
      });
    }
  });

  await app.register(authRoutes, { prefix: "/auth" });
  await app.register(coursesRoutes, { prefix: "/courses" });
  await app.register(enrollmentsRoutes, { prefix: "/enrollments" });
  await app.register(notificationsRoutes, { prefix: "/notifications" });
  await app.register(studentsRoutes, { prefix: "/students" });
  await app.register(studentDocumentRoutes, { prefix: "/students" });
  await app.register(adminRoutes, { prefix: "/admin" });

  return app;
}
