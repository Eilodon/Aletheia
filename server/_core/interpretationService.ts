import { z } from "zod";

import { AI_STREAM_TIMEOUT_MS } from "../../lib/constants";
import { logger } from "./logger";
import { ENV } from "./env";

const DEFAULT_LOCAL_MODEL = "qwen2.5:1.5b";
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
- Ở dòng riêng cuối cùng, format: *[câu hỏi]*`;

const symbolSchema = z.object({
  id: z.string().min(1),
  display_name: z.string().min(1),
  flavor_text: z.string().optional(),
});

const passageSchema = z.object({
  id: z.string().min(1),
  source_id: z.string().min(1),
  reference: z.string().min(1),
  text: z.string().min(1),
  context: z.string().optional(),
  resonance_context: z.string().optional(),
});

export const interpretationRequestSchema = z.object({
  passage: passageSchema,
  symbol: symbolSchema,
  situationText: z.string().max(2_000).optional(),
  resonanceContext: z.string().max(2_000).optional(),
  sourceLanguage: z.string().max(16).optional(),
  sourceFallbackPrompts: z.array(z.string().max(500)).optional(),
  userIntent: z.enum(["clarity", "comfort", "challenge", "guidance"]).optional(),
  mode: z.enum(["auto", "quality"]).optional(),
});

export type InterpretationRequest = z.infer<typeof interpretationRequestSchema>;

export type InterpretationResult = {
  text: string;
  chunks: string[];
  usedFallback: boolean;
  mode: "local" | "cloud" | "fallback";
  provider: "ollama" | "openai" | "gemini" | "fallback";
  model: string;
};

export type InterpretationStreamEvent =
  | { type: "chunk"; chunk: string }
  | {
      type: "done";
      text: string;
      usedFallback: boolean;
      mode: "local" | "cloud" | "fallback";
      provider: "ollama" | "openai" | "gemini" | "fallback";
      model: string;
    };

type LocalProviderConfig = {
  kind: "ollama";
  baseUrl: string;
  model: string;
};

type CloudProviderConfig =
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

function sanitizePromptInput(value?: string): string | undefined {
  return normalizeFreeText(value)?.slice(0, 500);
}

function sanitizePromptLines(lines: Array<string | undefined>): string[] {
  return lines
    .map((line) => sanitizePromptInput(line))
    .filter((line): line is string => Boolean(line));
}

function buildPrompt(request: InterpretationRequest): string {
  const parts = sanitizePromptLines([
    `Hãy trả lời hoàn toàn bằng ngôn ngữ của đoạn trích này: ${request.sourceLanguage || "vi"}.`,
    "Chỉ trả về đúng 2 phần: một đoạn phản chiếu ngắn và một câu hỏi mở ở dòng cuối.",
    request.userIntent
      ? ({
          clarity:
            "Tone cho lần đọc này: rõ ràng, gọn, chính xác. User cần thấy pattern trong tình huống.",
          comfort:
            "Tone cho lần đọc này: ấm áp, nhẹ, giàu compassion nhưng không lên lớp.",
          challenge:
            "Tone cho lần đọc này: trực tiếp, tỉnh táo, không né điều khó.",
          guidance:
            "Tone cho lần đọc này: mở, không định hướng, giữ không gian để người đọc tự nghe mình.",
        } as const)[request.userIntent]
      : undefined,
    request.situationText ? `Tình huống: ${request.situationText}` : undefined,
    request.situationText
      ? "Mirror lại ngôn ngữ của người dùng khi phản chiếu, nhưng đừng lặp lại một cách máy móc."
      : undefined,
    `Biểu tượng đã chọn: ${request.symbol.display_name}`,
    `Đoạn trích (${request.passage.reference}):\n${request.passage.text}`,
    request.resonanceContext || request.passage.resonance_context || request.passage.context
      ? `Ngữ cảnh ẩn cho người đọc (không nhắc lộ ra): ${
          request.resonanceContext || request.passage.resonance_context || request.passage.context
        }`
      : undefined,
  ]);

  return parts.join("\n\n");
}

function getFallbackChunks(request: InterpretationRequest): string[] {
  const prompts = request.sourceFallbackPrompts?.filter(Boolean) ?? [];
  if (prompts.length > 0) {
    return [prompts[0]];
  }

  if (request.sourceLanguage === "en") {
    return ["Take a moment to sit with these words. What do they stir in you?"];
  }

  return ["Hãy để những lời này lắng xuống một chút. Điều gì đang dấy lên trong bạn?"];
}

function ensureClosingQuestion(text: string, sourceLanguage?: string): string {
  const normalized = text.trim();
  if (!normalized) {
    return sourceLanguage === "en"
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
    sourceLanguage === "en"
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

function finalizeInterpretationText(text: string, sourceLanguage?: string): string {
  const normalized = normalizeFreeText(text) || "";
  const withoutSquareQuestion = normalized
    .replace(/\[([^\]\n]{3,120}\?)\]/g, "*$1*")
    .replace(/\[Câu hỏi\]/gi, "")
    .replace(/\s+\*/g, "\n\n*");
  const separatedQuestion = splitInlineClosingQuestion(withoutSquareQuestion);

  return ensureClosingQuestion(separatedQuestion, sourceLanguage);
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

  if (provider === "openai" && ENV.openAiApiKey) {
    return {
      kind: "openai",
      apiKey: ENV.openAiApiKey,
      model: ENV.interpretationCloudModel || DEFAULT_OPENAI_MODEL,
    };
  }

  if (provider === "gemini" && ENV.geminiApiKey) {
    return {
      kind: "gemini",
      apiKey: ENV.geminiApiKey,
      model: ENV.interpretationCloudModel || DEFAULT_GEMINI_MODEL,
    };
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
        temperature: 0.35,
        repeat_penalty: 1.15,
        num_predict: 110,
      },
    }),
  });

  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`Ollama request failed (${response.status}): ${reason.slice(0, 200)}`);
  }

  if (!stream) {
    const body = (await response.json()) as { response?: string };
    const text = finalizeInterpretationText(body.response || "", request.sourceLanguage);
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
        const text = finalizeInterpretationText(fullText, request.sourceLanguage);
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

  const text = finalizeInterpretationText(fullText, request.sourceLanguage);
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
      temperature: 0.55,
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
  const text = finalizeInterpretationText(body.choices?.[0]?.message?.content || "", request.sourceLanguage);
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
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${buildPrompt(request)}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 180,
          temperature: 0.55,
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
    `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:streamGenerateContent?alt=sse&key=${config.apiKey}`,
    {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        contents: [
          {
            parts: [{ text: `${systemPrompt}\n\n${buildPrompt(request)}` }],
          },
        ],
        generationConfig: {
          maxOutputTokens: 180,
          temperature: 0.55,
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

  const text = finalizeInterpretationText(fullText, request.sourceLanguage);
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
  if (!config) {
    throw new Error("Cloud interpretation is not configured.");
  }

  return config.kind === "openai"
    ? runOpenAIInterpretation(request)
    : runGeminiInterpretation(request);
}

function buildFallbackResult(request: InterpretationRequest): InterpretationResult {
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
      return await tryCloud();
    }

    return await tryLocal();
  } catch (primaryError) {
    logger.warn("[interpretation] primary provider failed", {
      mode,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });

    try {
      if (mode === "quality") {
        return await tryLocal();
      }

      return await tryCloud();
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
      return await runOllamaInterpretation(request, onEvent);
    }
  } catch (primaryError) {
    logger.warn("[interpretation] local stream failed", {
      mode,
      error: primaryError instanceof Error ? primaryError.message : String(primaryError),
    });
  }

  try {
    const config = getCloudProviderConfig();
    // Use true streaming for Gemini; OpenAI falls back to batch + chunked emit
    const cloudResult = config?.kind === "gemini"
      ? await runGeminiStreamInterpretation(request, onEvent)
      : await runCloudInterpretation(request);

    if (config?.kind !== "gemini") {
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
