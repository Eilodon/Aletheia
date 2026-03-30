import { COOKIE_NAME } from "../lib/constants.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { timingSafeEqual } from "crypto";

export const appRouter = router({
  // if you need to use socket.io, read and register route in server/_core/index.ts, all api should start with '/api/' so that the gateway can route correctly
  system: systemRouter,
  auth: router({
    me: publicProcedure.query((opts) => opts.ctx.user),
    logout: publicProcedure.mutation(({ ctx }) => {
      const cookieOptions = getSessionCookieOptions(ctx.req);
      ctx.res.clearCookie(COOKIE_NAME, { ...cookieOptions, maxAge: -1 });
      return {
        success: true,
      } as const;
    }),
  }),

  aiConfig: router({
    getProviderConfig: publicProcedure.query(({ ctx }) => {
      const appSecret = process.env.ALETHEIA_APP_SECRET;
      if (!appSecret) {
        console.error(
          "[aiConfig] ALETHEIA_APP_SECRET is not set. Refusing to expose AI provider keys.",
        );
        return {
          claude: "missing" as const,
          gpt4: "missing" as const,
          gemini: "missing" as const,
          keys: { claude: null, gpt4: null, gemini: null },
        };
      }

      const incomingSecret = ctx.req.headers["x-aletheia-app-secret"];
      const normalizedSecret = Array.isArray(incomingSecret) ? incomingSecret[0] : incomingSecret;
      
      // Timing-safe comparison to prevent timing attacks
      let canExposeKeys = false;
      if (normalizedSecret && appSecret && normalizedSecret.length === appSecret.length) {
        const secretBuffer = Buffer.from(appSecret);
        const incomingBuffer = Buffer.from(normalizedSecret);
        canExposeKeys = timingSafeEqual(secretBuffer, incomingBuffer);
      }

      if (!canExposeKeys) {
        const ip = ctx.req.headers["x-forwarded-for"] ?? ctx.req.socket?.remoteAddress ?? "unknown";
        console.warn(`[aiConfig] App secret mismatch from ${ip}`);
      }

      return {
        claude: process.env.ALETHEIA_CLAUDE_API_KEY ? "configured" : "missing",
        gpt4: process.env.ALETHEIA_OPENAI_API_KEY ? "configured" : "missing",
        gemini: process.env.ALETHEIA_GEMINI_API_KEY ? "configured" : "missing",
        keys: {
          claude: canExposeKeys ? (process.env.ALETHEIA_CLAUDE_API_KEY ?? null) : null,
          gpt4: canExposeKeys ? (process.env.ALETHEIA_OPENAI_API_KEY ?? null) : null,
          gemini: canExposeKeys ? (process.env.ALETHEIA_GEMINI_API_KEY ?? null) : null,
        },
      };
    }),
  }),

  // TODO: add feature routers here, e.g.
  // todo: router({
  //   list: protectedProcedure.query(({ ctx }) =>
  //     db.getUserTodos(ctx.user.id)
  //   ),
  // }),
});

export type AppRouter = typeof appRouter;
