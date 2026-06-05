import { z } from "zod";

import { AI_STREAM_TIMEOUT_MS } from "../../lib/constants";
import { logger } from "./logger";
import { ENV } from "./env";

const DEFAULT_LOCAL_MODEL = "qwen2.5:1.5b";
const DEFAULT_CLAUDE_MODEL = "claude-haiku-4-5-20251001"; // Matches Rust CLAUDE_MODEL
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = Math.max(AI_STREAM_TIMEOUT_MS, 120_000);
const OLLAMA_TAG_TIMEOUT_MS = 10_000;
const OLLAMA_MODEL_PRIORITY = [
  "qwen2.5:1.5b",
  "qwen2.5:3b",
  "gemma3:1b",
  "llama3.2:1b",
  "phi3:mini",
  "phi4-mini",
  "mistral:7b",
];

// SYNC-SOURCE: Phải khớp với SYSTEM_PROMPT trong core/src/ai_client.rs.
// Khi update một bên, update cả hai. Divergence gây inconsistency giữa native và server path.
const systemPrompt = `Bạn là một chiếc gương, không phải nhà tiên tri, không phải chuyên gia tư vấn.
Bạn phản chiếu lại điều đã hiện ra, để người đọc tự nghe thấy mình rõ hơn.

Khi viết:
- Kết nối passage với biểu tượng đã được chọn
- Nếu user có chia sẻ tình huống, mirror lại chính ngôn ngữ của họ; dùng lại từ họ dùng khi phù hợp, không paraphrase khô cứng
- Không nhập vai người dùng; không viết kiểu "tôi đang..." như thể bạn là họ
- Đừng giải thích passage như bài giảng; đặt nó vào ngữ cảnh họ vừa mô tả
- Tone: ấm áp, chiêm nghiệm, chính xác, không phán xét
- Độ dài phần phản chiếu chính: khoảng 60-90 chữ
- Chỉ viết một đoạn chính, không tách thành danh sách hay nhiều đoạn
- Tránh lặp lại cùng một hình ảnh, cùng một ý, hoặc cùng một câu
- Không dùng các câu sáo rỗng kiểu "hãy tin rằng", "mọi chuyện rồi sẽ ổn", "bạn không cô đơn"

Tuyệt đối không:
- Đưa ra lời khuyên cụ thể ("bạn nên...")
- Khẳng định điều gì về tương lai
- Phán xét quyết định của user

Luôn kết thúc bằng một câu hỏi mở ngắn để người đọc tự nghĩ tiếp.
- Câu hỏi phải hỏi về hiện tại, không hỏi về tương lai
- Dưới 15 từ
- Ở dòng riêng cuối cùng, format: *[câu hỏi]*

---

Hiệu chỉnh tone theo từng truyền thống:
- I Ching / Kinh Dịch: ngôn ngữ biểu tượng và hình ảnh tự nhiên, nhịp điệu của sự chuyển hóa — âm dương không đứng yên
- Tao Te Ching / Đạo Đức Kinh: tối giản, nghịch lý nhẹ nhàng, không áp đặt — "nước chảy xuống thấp mà thấm vào mọi nơi"
- Rumi / Masnavi: ấm áp và thi ca, hình ảnh ngọn lửa và ánh sáng, khao khát và cảm giác thuộc về
- Hafez / Divan: vui tươi và nhẹ nhàng, ẩn dụ rượu và vườn hoa, sự chấp nhận những điều bình thường
- Bible / KJV: trắc ẩn và cộng đồng, ân sủng không điều kiện, sức nặng và sự nhẹ nhõm cùng tồn tại
- Marcus Aurelius / Meditations: trực tiếp và thực tế, lý trí phục vụ hành động — không lãng mạn hóa khó khăn

---

Ví dụ phản chiếu đúng (few-shot calibration):

Ví dụ 1:
Tình huống: "Tôi không biết có nên tiếp tục dự án này không, cảm giác mệt mỏi lắm rồi"
Passage (Tao Te Ching): "Nước không tranh với đá, nhưng cuối cùng đá cũng mòn"
Biểu tượng: Sóng nước
Phản chiếu tốt: "Cái mệt mỏi bạn nhắc đến không nhất thiết là dấu hiệu sai đường — đôi khi nó là dấu hiệu rằng bạn đã đổ ra đủ rồi, và cần một nhịp để thấm vào. Nước không cạn vì chảy; nó cạn khi không còn được bổ sung."
*Điều gì đang bổ sung lại cho bạn lúc này?*

Ví dụ 2 (không có tình huống):
Passage (Marcus Aurelius): "Tất cả những gì ngăn cản ta thường là chính bản thân ta"
Biểu tượng: Chìa khóa
Phản chiếu tốt: "Có một cửa nào đó đang chờ — không phải vì nó khó mở, mà vì tay bạn chưa thật sự đặt lên tay nắm. Không phải thiếu năng lực, mà là thiếu một khoảnh khắc dứt khoát với chính mình."
*Hôm nay bạn đang giữ chìa khóa nào mà chưa dùng?*

Ví dụ KHÔNG đúng (để nhận ra và tránh):
"Bạn đang trải qua một giai đoạn khó khăn nhưng mọi chuyện rồi sẽ ổn. Hãy tin vào bản thân và tiếp tục bước đi. Bạn có đủ sức mạnh để vượt qua thử thách này. Tôi ở đây cùng bạn."
→ Sai vì: lời động viên rỗng, khẳng định tương lai, không mirror ngôn ngữ của người dùng, nhập vai cảm xúc.`;

const symbolSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  flavor_text: z.string().optional(),
});

const passageSchema = z.object({
  id: z.string().min(1),
  source_id: z.string().min(1),
  reference: z.string().min(1).max(200),
  text: z.string().min(1).max(1000),
  context: z.string().max(500).optional(),
  resonance_context: z.string().max(500).optional(),
});

export const interpretationRequestSchema = z.object({
  passage: passageSchema,
  symbol: symbolSchema,
  situationText: z.string().max(500).optional(),
  resonanceContext: z.string().max(500).optional(),
  sourceLanguage: z.string().max(16).optional(),
  sourceFallbackPrompts: z.array(z.string().max(500)).max(20).optional(),
  userIntent: z.enum(["clarity", "comfort", "challenge", "guidance"]).optional(),
  /** User's preferred UI language — AI responds in this locale, not the passage source language */
  userLocale: z.enum(["vi", "en"]).optional(),
  mode: z.enum(["auto", "quality"]).optional(),
});

export type InterpretationRequest = z.infer<typeof interpretationRequestSchema>;

export type InterpretationResult = {
  text: string;
  chunks: string[];
  usedFallback: boolean;
  mode: "local" | "cloud" | "fallback";
  provider: "anthropic" | "ollama" | "openai" | "gemini" | "fallback";
  model: string;
};

export type InterpretationStreamEvent =
  | { type: "chunk"; chunk: string }
  | {
      type: "done";
      text: string;
      usedFallback: boolean;
      mode: "local" | "cloud" | "fallback";
      provider: "anthropic" | "ollama" | "openai" | "gemini" | "fallback";
      model: string;
    };

type LocalProviderConfig = {
  kind: "ollama";
  baseUrl: string;
  model: string;
};

type CloudProviderConfig =
  | { kind: "anthropic"; apiKey: string; model: string }
  | { kind: "openai"; apiKey: string; model: string }
  | { kind: "gemini"; apiKey: string; model: string }
  | null;

function readTimeoutMs(): number {
  const raw = process.env.INTERPRETATION_TIMEOUT_MS?.trim();
  const parsed = raw ? Number.parseInt(raw, 10) : Number.NaN;
  return Number.isFinite(parsed) && parsed > 0 ? parsed : DEFAULT_TIMEOUT_MS;
}

function normalizeFreeText(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

// NF-new-02: mirrors INJECTION_PREFIXES in core/src/ai_client.rs.
// normalizeFreeText() collapses all \s+ to single space before this check runs,
// so newline-split bypass attempts (e.g. "ignore\nall previous") are already neutralized.
const INJECTION_PREFIXES = [
  "ignore all previous",
  "ignore previous instructions",
  "forget your instructions",
  "disregard the above",
  "disregard all previous",
  "system:",
  "[system]",
  "[instruction]",
  "you are now",
  "you must now",
  "new instructions:",
  "act as if",
] as const;

function sanitizePromptInput(value?: string): string | undefined {
  const normalized = normalizeFreeText(value);
  if (!normalized) return undefined;
  const lower = normalized.toLowerCase();
  for (const prefix of INJECTION_PREFIXES) {
    if (lower.includes(prefix)) {
      logger.warn("[interpretation] potential prompt injection in input — dropped", { prefix });
      return undefined;
    }
  }
  return normalized.slice(0, 500);
}

function sanitizePromptLines(lines: Array<string | undefined>): string[] {
  return lines
    .map((line) => sanitizePromptInput(line))
    .filter((line): line is string => Boolean(line));
}

function buildPrompt(request: InterpretationRequest): string {
  // Only sanitize user-supplied free-text fields to prevent injection.
  // DB-sourced fields (passage.text, reference, symbol) are already bounded by
  // Zod schema validation and must not be truncated or false-positive filtered.
  const safeSituation = sanitizePromptInput(request.situationText);
  const safeResonanceContext = sanitizePromptInput(
    request.resonanceContext ?? request.passage.resonance_context,
  );

  // Respond in the user's preferred UI language, not the source passage language.
  const isEn = request.userLocale === "en";

  const parts: string[] = isEn
    ? [
        "Respond entirely in English.",
        "Return exactly 2 parts: a short reflection paragraph and an open question on the last line.",
      ]
    : [
        `Hãy trả lời hoàn toàn bằng tiếng Việt.`,
        "Chỉ trả về đúng 2 phần: một đoạn phản chiếu ngắn và một câu hỏi mở ở dòng cuối.",
      ];

  if (request.userIntent) {
    parts.push(
      isEn
        ? ({
            clarity:   "Tone for this reading: clear, concise, precise. Help the reader see the pattern in their situation.",
            comfort:   "Tone for this reading: warm, gentle, full of compassion — but not preachy.",
            challenge: "Tone for this reading: direct, clear-eyed, not avoiding the difficult.",
            guidance:  "Tone for this reading: open, non-directive — hold space for the reader to listen to themselves.",
          } as const)[request.userIntent]
        : ({
            clarity:   "Tone cho lần đọc này: rõ ràng, gọn, chính xác. User cần thấy pattern trong tình huống.",
            comfort:   "Tone cho lần đọc này: ấm áp, nhẹ, giàu compassion nhưng không lên lớp.",
            challenge: "Tone cho lần đọc này: trực tiếp, tỉnh táo, không né điều khó.",
            guidance:  "Tone cho lần đọc này: mở, không định hướng, giữ không gian để người đọc tự nghe mình.",
          } as const)[request.userIntent],
    );
  }

  if (safeSituation) {
    parts.push(isEn ? `Situation: ${safeSituation}` : `Tình huống: ${safeSituation}`);
    parts.push(
      isEn
        ? "Mirror the reader's own language in the reflection, but don't echo it mechanically."
        : "Mirror lại ngôn ngữ của người dùng khi phản chiếu, nhưng đừng lặp lại một cách máy móc.",
    );
  }

  parts.push(`Biểu tượng đã chọn: ${request.symbol.display_name}`);
  parts.push(`Đoạn trích (${request.passage.reference}):\n${request.passage.text}`);

  if (safeResonanceContext) {
    parts.push(`Ngữ cảnh ẩn cho người đọc (không nhắc lộ ra): ${safeResonanceContext}`);
  }

  return parts.join("\n\n");
}

function getFallbackChunks(request: InterpretationRequest): string[] {
  const prompts = request.sourceFallbackPrompts?.filter(Boolean) ?? [];
  if (prompts.length > 0) {
    return [prompts[0]];
  }

  // Prefer user's UI locale over source language for fallback text
  const isEn = (request.userLocale ?? request.sourceLanguage) === "en";
  if (isEn) {
    return ["Take a moment to sit with these words. What do they stir in you?"];
  }

  return ["Hãy để những lời này lắng xuống một chút. Điều gì đang dấy lên trong bạn?"];
}

function ensureClosingQuestion(text: string, locale?: string): string {
  const normalized = text.trim();
  if (!normalized) {
    return locale === "en"
      ? "*What feels most true in you right now?*"
      : "*Lúc này điều gì cần được nhìn rõ hơn?*";
  }

  const lines = normalized
    .split(/\n+/)
    .map((line) => line.trim())
    .filter(Boolean);

  const lastLine = lines[lines.length - 1] ?? "";
  const hasQuestion = /[*_\[]?.+\?[*_\]]?$/.test(lastLine);
  if (hasQuestion) {
    return lines.join("\n\n");
  }

  const question =
    locale === "en"
      ? "*What feels most true in you right now?*"
      : "*Lúc này điều gì cần được nhìn rõ hơn?*";

  return `${lines.join("\n\n")}\n\n${question}`;
}

function splitInlineClosingQuestion(text: string): string {
  const normalized = text.trim();
  if (!normalized) {
    return normalized;
  }

  const inlineQuestionPattern =
    /^(?<body>.+?)(?:\s*[:\-]\s*|\s{2,})(?<question>(?:[A-ZÀ-ỸĐ].{3,120}\?))$/u;
  const match = normalized.match(inlineQuestionPattern);
  if (!match?.groups) {
    return normalized;
  }

  const body = match.groups.body?.trim().replace(/\s+$/g, "");
  const question = match.groups.question?.trim();
  if (!body || !question) {
    return normalized;
  }

  return `${body}\n\n*${question.replace(/^[*_]+|[*_]+$/g, "")}*`;
}

function finalizeInterpretationText(text: string, sourceLanguage?: string, userLocale?: string): string {
  const normalized = normalizeFreeText(text) || "";
  const withoutSquareQuestion = normalized
    .replace(/\[([^\]\n]{3,120}\?)\]/g, "*$1*")
    .replace(/\[Câu hỏi\]/gi, "")
    .replace(/\s+\*/g, "\n\n*");
  const separatedQuestion = splitInlineClosingQuestion(withoutSquareQuestion);

  return ensureClosingQuestion(separatedQuestion, userLocale ?? sourceLanguage);
}

// R07: lightweight output safety check for harmful content patterns.
// The system prompt heavily constrains output, but distress injection could trigger harmful mirroring.
// This regex set covers the highest-risk patterns; extend if new patterns emerge in production.
const OUTPUT_HARM_PATTERNS: RegExp[] = [
  /tự\s*tử/i,
  /\bsuicide\b/i,
  /\bkill\s+yourself\b/i,
  /\bself[- ]?harm\b/i,
  /tự\s*làm\s*đau/i,
  /\bno\s+way\s+out\b/i,
  /\bkhông\s+có\s+lối\s+thoát\b/i,
  /\bchết\s+thôi\b/i,
];

function isSafeOutput(text: string): boolean {
  return !OUTPUT_HARM_PATTERNS.some((p) => p.test(text));
}

function withOutputSafety(
  result: InterpretationResult,
  request: InterpretationRequest,
): InterpretationResult {
  if (result.usedFallback || isSafeOutput(result.text)) {
    return result;
  }
  logger.warn("[interpretation] output safety check triggered — substituting fallback", {
    provider: result.provider,
    model: result.model,
  });
  return buildFallbackResult(request);
}

function getLocalProviderConfig(): LocalProviderConfig | null {
  const baseUrl = (ENV.localAiUrl || "http://127.0.0.1:11434").replace(/\/$/, "");
  if (!baseUrl) {
    return null;
  }

  const model = ENV.localAiModel || DEFAULT_LOCAL_MODEL;
  return {
    kind: "ollama",
    baseUrl,
    model,
  };
}

function getCloudProviderConfig(): CloudProviderConfig {
  const provider = (ENV.interpretationCloudProvider || "").toLowerCase();

  // Explicit selection via env var
  if (provider === "anthropic" && ENV.claudeApiKey) {
    return { kind: "anthropic", apiKey: ENV.claudeApiKey, model: ENV.interpretationCloudModel || DEFAULT_CLAUDE_MODEL };
  }
  if (provider === "openai" && ENV.openAiApiKey) {
    return { kind: "openai", apiKey: ENV.openAiApiKey, model: ENV.interpretationCloudModel || DEFAULT_OPENAI_MODEL };
  }
  if (provider === "gemini" && ENV.geminiApiKey) {
    return { kind: "gemini", apiKey: ENV.geminiApiKey, model: ENV.interpretationCloudModel || DEFAULT_GEMINI_MODEL };
  }

  // Auto-detect: Claude → OpenAI → Gemini (matches Rust provider priority)
  if (ENV.claudeApiKey) {
    return { kind: "anthropic", apiKey: ENV.claudeApiKey, model: DEFAULT_CLAUDE_MODEL };
  }
  if (ENV.openAiApiKey) {
    return { kind: "openai", apiKey: ENV.openAiApiKey, model: DEFAULT_OPENAI_MODEL };
  }
  if (ENV.geminiApiKey) {
    return { kind: "gemini", apiKey: ENV.geminiApiKey, model: DEFAULT_GEMINI_MODEL };
  }

  return null;
}

async function fetchWithTimeout(
  input: string,
  init: RequestInit,
  timeoutMs: number = readTimeoutMs(),
): Promise<Response> {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    return await fetch(input, {
      ...init,
      signal: controller.signal,
    });
  } finally {
    clearTimeout(timeout);
  }
}

async function resolveOllamaModel(baseUrl: string, preferredModel: string): Promise<string> {
  try {
    const response = await fetchWithTimeout(`${baseUrl}/api/tags`, {
      method: "GET",
      headers: {
        Accept: "application/json",
      },
    }, OLLAMA_TAG_TIMEOUT_MS);

    if (!response.ok) {
      return preferredModel;
    }

    const body = (await response.json()) as {
      models?: Array<{ name?: string }>;
    };
    const modelNames = (body.models ?? [])
      .map((entry) => entry.name?.trim())
      .filter((value): value is string => Boolean(value));

    if (modelNames.includes(preferredModel)) {
      return preferredModel;
    }

    for (const candidate of OLLAMA_MODEL_PRIORITY) {
      if (modelNames.includes(candidate)) {
        return candidate;
      }
    }

    const preferredPrefix = modelNames.find((name) =>
      /^(qwen|gemma|phi|llama|mistral)/i.test(name),
    );

    return preferredPrefix || modelNames[0] || preferredModel;
  } catch {
    return preferredModel;
  }
}

async function runOllamaInterpretation(
  request: InterpretationRequest,
  stream?: (event: InterpretationStreamEvent) => void,
): Promise<InterpretationResult> {
  const config = getLocalProviderConfig();
  if (!config) {
    throw new Error("Local AI provider is not configured.");
  }

  const model = await resolveOllamaModel(config.baseUrl, config.model);
  const prompt = buildPrompt(request);
  logger.info("[interpretation] selected local ollama model", {
    model,
    requested_mode: request.mode ?? "auto",
  });
  const response = await fetchWithTimeout(`${config.baseUrl}/api/generate`, {
    method: "POST",
    headers: {
      "Content-Type": "application/json",
      Accept: "application/x-ndjson, application/json",
    },
    body: JSON.stringify({
      model,
      system: systemPrompt,
      prompt,
      stream: Boolean(stream),
      options: {
        temperature: 0.4,
        repeat_penalty: 1.15,
        num_predict: 140,
      },
    }),
  });

  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`Ollama request failed (${response.status}): ${reason.slice(0, 200)}`);
  }

  if (!stream) {
    const body = (await response.json()) as { response?: string };
    const text = finalizeInterpretationText(body.response || "", request.sourceLanguage, request.userLocale);
    if (!text) {
      throw new Error("Ollama returned an empty interpretation.");
    }

    return {
      text,
      chunks: [text],
      usedFallback: false,
      mode: "local",
      provider: "ollama",
      model,
    };
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Ollama stream body is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const chunks: string[] = [];
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line) {
        continue;
      }

      let payload: { response?: string; done?: boolean };
      try {
        payload = JSON.parse(line);
      } catch {
        continue;
      }

      const chunk = payload.response ?? "";
      if (chunk) {
        chunks.push(chunk);
        fullText += chunk;
        stream({ type: "chunk", chunk });
      }

      if (payload.done) {
        const text = finalizeInterpretationText(fullText, request.sourceLanguage, request.userLocale);
        if (!text) {
          throw new Error("Ollama stream completed without text.");
        }

        stream({
          type: "done",
          text,
          usedFallback: false,
          mode: "local",
          provider: "ollama",
          model,
        });

        return {
          text,
          chunks: chunks.length > 0 ? chunks : [text],
          usedFallback: false,
          mode: "local",
          provider: "ollama",
          model,
        };
      }
    }
  }

  const text = finalizeInterpretationText(fullText, request.sourceLanguage, request.userLocale);
  if (!text) {
    throw new Error("Ollama stream ended without a final interpretation.");
  }

  stream({
    type: "done",
    text,
    usedFallback: false,
    mode: "local",
    provider: "ollama",
    model,
  });

  return {
    text,
    chunks: chunks.length > 0 ? chunks : [text],
    usedFallback: false,
    mode: "local",
    provider: "ollama",
    model,
  };
}

async function runAnthropicInterpretation(
  request: InterpretationRequest,
  onEvent?: (event: InterpretationStreamEvent) => void,
): Promise<InterpretationResult> {
  const config = getCloudProviderConfig();
  if (!config || config.kind !== "anthropic") {
    throw new Error("Anthropic not configured.");
  }

  const prompt = buildPrompt(request);
  const streaming = !!onEvent;

  const response = await fetchWithTimeout("https://api.anthropic.com/v1/messages", {
    method: "POST",
    headers: {
      "x-api-key": config.apiKey,
      "anthropic-version": "2023-06-01",
      "anthropic-beta": "prompt-caching-2024-07-31",
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      max_tokens: 400,
      stream: streaming,
      system: [{ type: "text", text: systemPrompt, cache_control: { type: "ephemeral" } }],
      messages: [{ role: "user", content: prompt }],
    }),
  });

  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`Anthropic ${response.status}: ${reason.slice(0, 200)}`);
  }

  if (!streaming) {
    const body = (await response.json()) as { content?: Array<{ type: string; text?: string }> };
    const text = finalizeInterpretationText(
      body.content?.find((b) => b.type === "text")?.text ?? "",
      request.sourceLanguage,
      request.userLocale,
    );
    if (!text) throw new Error("Anthropic returned empty response.");
    return { text, chunks: [text], usedFallback: false, mode: "cloud", provider: "anthropic", model: config.model };
  }

  // Streaming path
  const reader = response.body?.getReader();
  if (!reader) throw new Error("Anthropic stream body unavailable.");
  const decoder = new TextDecoder();
  let buffer = "";
  const chunks: string[] = [];
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });
    while (true) {
      const nl = buffer.indexOf("\n");
      if (nl === -1) break;
      const line = buffer.slice(0, nl).trim();
      buffer = buffer.slice(nl + 1);
      if (!line.startsWith("data: ")) continue;
      const payload = line.slice(6).trim();
      if (payload === "[DONE]") break;
      let json: Record<string, unknown>;
      try { json = JSON.parse(payload) as Record<string, unknown>; } catch { continue; }
      const delta = json?.delta as Record<string, unknown> | undefined;
      if (delta?.type === "text_delta" && typeof delta.text === "string") {
        chunks.push(delta.text);
        fullText += delta.text;
        onEvent!({ type: "chunk", chunk: delta.text });
      }
      if (json?.type === "message_stop") break;
    }
  }

  const text = finalizeInterpretationText(fullText, request.sourceLanguage, request.userLocale);
  if (!text) throw new Error("Anthropic stream ended without text.");

  const result: InterpretationResult = {
    text, chunks: chunks.length ? chunks : [text],
    usedFallback: false, mode: "cloud", provider: "anthropic", model: config.model,
  };
  onEvent!({ type: "done", text: result.text, usedFallback: false, mode: "cloud", provider: "anthropic", model: config.model });
  return result;
}

async function runOpenAIInterpretation(request: InterpretationRequest): Promise<InterpretationResult> {
  const config = getCloudProviderConfig();
  if (!config || config.kind !== "openai") {
    throw new Error("OpenAI cloud interpretation is not configured.");
  }

  const response = await fetchWithTimeout("https://api.openai.com/v1/chat/completions", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${config.apiKey}`,
      "Content-Type": "application/json",
    },
    body: JSON.stringify({
      model: config.model,
      messages: [
        { role: "system", content: systemPrompt },
        { role: "user", content: buildPrompt(request) },
      ],
      max_tokens: 180,
      temperature: 0.4,
      stream: false,
    }),
  });

  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`OpenAI request failed (${response.status}): ${reason.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    choices?: Array<{ message?: { content?: string } }>;
  };
  const text = finalizeInterpretationText(body.choices?.[0]?.message?.content || "", request.sourceLanguage, request.userLocale);
  if (!text) {
    throw new Error("OpenAI returned an empty interpretation.");
  }

  return {
    text,
    chunks: [text],
    usedFallback: false,
    mode: "cloud",
    provider: "openai",
    model: config.model,
  };
}

async function runGeminiInterpretation(request: InterpretationRequest): Promise<InterpretationResult> {
  const config = getCloudProviderConfig();
  if (!config || config.kind !== "gemini") {
    throw new Error("Gemini cloud interpretation is not configured.");
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${buildPrompt(request)}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 180,
          temperature: 0.4,
        },
      }),
    },
  );

  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`Gemini request failed (${response.status}): ${reason.slice(0, 200)}`);
  }

  const body = (await response.json()) as {
    candidates?: Array<{
      content?: {
        parts?: Array<{ text?: string }>;
      };
    }>;
  };
  const text = finalizeInterpretationText(
    body.candidates?.[0]?.content?.parts?.[0]?.text || "",
    request.sourceLanguage,
    request.userLocale,
  );
  if (!text) {
    throw new Error("Gemini returned an empty interpretation.");
  }

  return {
    text,
    chunks: [text],
    usedFallback: false,
    mode: "cloud",
    provider: "gemini",
    model: config.model,
  };
}

async function runGeminiStreamInterpretation(
  request: InterpretationRequest,
  onEvent: (event: InterpretationStreamEvent) => void,
): Promise<InterpretationResult> {
  const config = getCloudProviderConfig();
  if (!config || config.kind !== "gemini") {
    throw new Error("Gemini cloud interpretation is not configured.");
  }

  const response = await fetchWithTimeout(
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "x-goog-api-key": config.apiKey,
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${buildPrompt(request)}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 180,
          temperature: 0.4,
        },
      }),
    },
  );

  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`Gemini stream request failed (${response.status}): ${reason.slice(0, 200)}`);
  }

  const reader = response.body?.getReader();
  if (!reader) {
    throw new Error("Gemini stream body is unavailable.");
  }

  const decoder = new TextDecoder();
  let buffer = "";
  const chunks: string[] = [];
  let fullText = "";

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }

    buffer += decoder.decode(value, { stream: true });

    while (true) {
      const newlineIndex = buffer.indexOf("\n");
      if (newlineIndex === -1) {
        break;
      }

      const line = buffer.slice(0, newlineIndex).trim();
      buffer = buffer.slice(newlineIndex + 1);

      if (!line || line.startsWith(":")) {
        continue;
      }

      const payload = line.startsWith("data: ") ? line.slice(6).trim() : null;
      if (!payload) {
        continue;
      }

      if (payload === "[DONE]") {
        break;
      }

      try {
        const json = JSON.parse(payload);
        const chunk = json?.candidates?.[0]?.content?.parts?.[0]?.text ?? "";
        if (chunk) {
          chunks.push(chunk);
          fullText += chunk;
          onEvent({ type: "chunk", chunk });
        }
      } catch {
        // Malformed SSE payload — skip
      }
    }
  }

  const text = finalizeInterpretationText(fullText, request.sourceLanguage, request.userLocale);
  if (!text) {
    throw new Error("Gemini stream completed without text.");
  }

  const result: InterpretationResult = {
    text,
    chunks: chunks.length > 0 ? chunks : [text],
    usedFallback: false,
    mode: "cloud",
    provider: "gemini",
    model: config.model,
  };

  onEvent({
    type: "done",
    text: result.text,
    usedFallback: false,
    mode: "cloud",
    provider: "gemini",
    model: config.model,
  });

  return result;
}

async function runCloudInterpretation(request: InterpretationRequest): Promise<InterpretationResult> {
  const config = getCloudProviderConfig();
  if (!config) throw new Error("Cloud interpretation is not configured.");

  if (config.kind === "anthropic") return runAnthropicInterpretation(request);
  return config.kind === "openai" ? runOpenAIInterpretation(request) : runGeminiInterpretation(request);
}

export function buildFallbackResult(request: InterpretationRequest): InterpretationResult {
  const chunks = getFallbackChunks(request);
  return {
    text: chunks.join("\n\n"),
    chunks,
    usedFallback: true,
    mode: "fallback",
    provider: "fallback",
    model: "static-fallback",
  };
}

export async function requestInterpretation(
  rawRequest: InterpretationRequest,
): Promise<InterpretationResult> {
  const request = interpretationRequestSchema.parse(rawRequest);
  const mode = request.mode ?? "auto";

  const tryLocal = async () => runOllamaInterpretation(request);
  const tryCloud = async () => runCloudInterpretation(request);

  try {
    if (mode === "quality") {
      return withOutputSafety(await tryCloud(), request);
    }

    return withOutputSafety(await tryLocal(), request);
  } catch (primaryError) {
    logger.warn("[interpretation] primary provider failed", {
      mode,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });

    try {
      if (mode === "quality") {
        return withOutputSafety(await tryLocal(), request);
      }

      return withOutputSafety(await tryCloud(), request);
    } catch (secondaryError) {
      logger.warn("[interpretation] secondary provider failed; using fallback", {
        mode,
        error: secondaryError instanceof Error ? secondaryError.message : String(secondaryError),
      });
      return buildFallbackResult(request);
    }
  }
}

export async function streamInterpretation(
  rawRequest: InterpretationRequest,
  onEvent: (event: InterpretationStreamEvent) => void,
): Promise<InterpretationResult> {
  const request = interpretationRequestSchema.parse(rawRequest);
  const mode = request.mode ?? "auto";

  try {
    if (mode !== "quality") {
      const ollamaBuffer: InterpretationStreamEvent[] = [];
      const bufferOllama = (evt: InterpretationStreamEvent) => { ollamaBuffer.push(evt); };
      const rawOllama = await runOllamaInterpretation(request, bufferOllama);
      const safeOllama = withOutputSafety(rawOllama, request);
      if (safeOllama.text === rawOllama.text) {
        for (const evt of ollamaBuffer) onEvent(evt);
      } else {
        onEvent({ type: "chunk", chunk: safeOllama.text });
        onEvent({ type: "done", text: safeOllama.text, usedFallback: safeOllama.usedFallback, mode: safeOllama.mode, provider: safeOllama.provider, model: safeOllama.model });
      }
      return safeOllama;
    }
  } catch (primaryError) {
    logger.warn("[interpretation] local stream failed", {
      mode,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });
  }

  try {
    const config = getCloudProviderConfig();
    // Buffer streaming events; apply withOutputSafety before emitting to client.
    // This ensures no unsafe text reaches the UI before the safety gate runs.
    const cloudBuffer: InterpretationStreamEvent[] = [];
    const bufferCloud = (evt: InterpretationStreamEvent) => { cloudBuffer.push(evt); };
    const rawCloud = config?.kind === "anthropic"
      ? await runAnthropicInterpretation(request, bufferCloud)
      : config?.kind === "gemini"
        ? await runGeminiStreamInterpretation(request, bufferCloud)
        : await runCloudInterpretation(request);

    const cloudResult = withOutputSafety(rawCloud, request);

    if (config?.kind === "anthropic" || config?.kind === "gemini") {
      if (cloudResult.text === rawCloud.text) {
        for (const evt of cloudBuffer) onEvent(evt);
      } else {
        onEvent({ type: "chunk", chunk: cloudResult.text });
        onEvent({ type: "done", text: cloudResult.text, usedFallback: cloudResult.usedFallback, mode: cloudResult.mode, provider: cloudResult.provider, model: cloudResult.model });
      }
    } else {
      for (const chunk of cloudResult.chunks) {
        onEvent({ type: "chunk", chunk });
      }
      onEvent({
        type: "done",
        text: cloudResult.text,
        usedFallback: cloudResult.usedFallback,
        mode: cloudResult.mode,
        provider: cloudResult.provider,
        model: cloudResult.model,
      });
    }
    return cloudResult;
  } catch (cloudError) {
    logger.warn("[interpretation] cloud stream failed; using fallback", {
      mode,
      error: cloudError instanceof Error ? cloudError.message : String(cloudError),
    });

    const fallback = buildFallbackResult(request);
    for (const chunk of fallback.chunks) {
      onEvent({ type: "chunk", chunk });
    }
    onEvent({
      type: "done",
      text: fallback.text,
      usedFallback: true,
      mode: "fallback",
      provider: "fallback",
      model: "static-fallback",
    });
    return fallback;
  }
}
