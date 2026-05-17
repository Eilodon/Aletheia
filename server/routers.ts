import { timingSafeEqual } from "crypto";
import { COOKIE_NAME } from "../lib/constants.js";
import { getSessionCookieOptions } from "./_core/cookies";
import { systemRouter } from "./_core/systemRouter";
import { publicProcedure, router } from "./_core/trpc";
import { ENV } from "./_core/env";

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
      const appSecret = ENV.aletheiaAppSecret;
      if (appSecret) {
        const incoming = ctx.req.headers["x-aletheia-app-secret"];
        const incomingBuf = Buffer.from(typeof incoming === "string" ? incoming : "", "utf8");
        const expectedBuf = Buffer.from(appSecret, "utf8");
        const maxLen = Math.max(incomingBuf.length, expectedBuf.length);
        const a = Buffer.alloc(maxLen);
        const b = Buffer.alloc(maxLen);
        incomingBuf.copy(a);
        expectedBuf.copy(b);
        if (!timingSafeEqual(a, b)) {
          return {
            claude: ENV.claudeApiKey ? "configured" : "missing",
            gpt4: ENV.openAiApiKey ? "configured" : "missing",
            gemini: ENV.geminiApiKey ? "configured" : "missing",
            keys: { claude: null, gpt4: null, gemini: null },
          };
        }
      }
      return {
        claude: ENV.claudeApiKey ? "configured" : "missing",
        gpt4: ENV.openAiApiKey ? "configured" : "missing",
        gemini: ENV.geminiApiKey ? "configured" : "missing",
        keys: {
          claude: ENV.claudeApiKey || null,
          gpt4: ENV.openAiApiKey || null,
          gemini: ENV.geminiApiKey || null,
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
