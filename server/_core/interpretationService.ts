import { z } from "zod";

import { AI_STREAM_TIMEOUT_MS } from "../../lib/constants";
import { logger } from "./logger";
import { ENV } from "./env";

const DEFAULT_LOCAL_MODEL = "gemma3:1b";
const DEFAULT_OPENAI_MODEL = "gpt-4.1-mini";
const DEFAULT_GEMINI_MODEL = "gemini-2.5-flash";
const DEFAULT_TIMEOUT_MS = Math.max(AI_STREAM_TIMEOUT_MS, 45_000);

const systemPrompt = `Bạn là một chiếc gương, không phải nhà tiên tri, không phải chuyên gia tư vấn.
Bạn phản chiếu lại điều đã hiện ra, để người đọc tự nghe thấy mình rõ hơn.

Khi viết:
- Kết nối passage với biểu tượng đã được chọn
- Nếu user có chia sẻ tình huống, mirror lại chính ngôn ngữ của họ; dùng lại từ họ dùng khi phù hợp, không paraphrase khô cứng
- Đừng giải thích passage như bài giảng; đặt nó vào ngữ cảnh họ vừa mô tả
- Tone: ấm áp, chiêm nghiệm, chính xác, không phán xét
- Độ dài phần phản chiếu chính: khoảng 80-120 chữ

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

function sanitizeFreeText(value?: string): string | undefined {
  if (!value) {
    return undefined;
  }

  return value
    .replace(/[\u0000-\u001F\u007F]/g, " ")
    .replace(/\s+/g, " ")
    .trim()
    .slice(0, 500);
}

function sanitizePromptLines(lines: Array<string | undefined>): string[] {
  return lines
    .map((line) => sanitizeFreeText(line))
    .filter((line): line is string => Boolean(line));
}

function buildPrompt(request: InterpretationRequest): string {
  const parts = sanitizePromptLines([
    `Hãy trả lời hoàn toàn bằng ngôn ngữ của đoạn trích này: ${request.sourceLanguage || "vi"}.`,
    request.userIntent
      ? ({
          clarity:
            "Tone cho lần đọc này: phân tích rõ ràng, chính xác. User cần sự rõ ràng — giúp họ thấy pattern và structure trong tình huống.",
          comfort:
            "Tone cho lần đọc này: ấm áp, chữa lành. User cần được an ủi — đặt sự nhẹ nhàng và compassion lên trên hết.",
          challenge:
            "Tone cho lần đọc này: trực tiếp, không ngại đối mặt. User muốn bị thách thức — đừng ngại nêu lên những điều khó nghe.",
          guidance:
            "Tone cho lần đọc này: mở, không định hướng. User để vũ trụ dẫn lối — đừng push bất kỳ hướng nào, chỉ mở không gian.",
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
    });

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

    const preferredPrefix = modelNames.find((name) =>
      /^(gemma|qwen|phi|llama|mistral|deepseek)/i.test(name),
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
        temperature: 0.7,
        num_predict: 220,
      },
    }),
  });

  if (!response.ok) {
    const reason = await response.text().catch(() => "");
    throw new Error(`Ollama request failed (${response.status}): ${reason.slice(0, 200)}`);
  }

  if (!stream) {
    const body = (await response.json()) as { response?: string };
    const text = sanitizeFreeText(body.response) || "";
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
        const text = sanitizeFreeText(fullText) || fullText.trim();
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

  const text = sanitizeFreeText(fullText) || fullText.trim();
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
      max_tokens: 220,
      temperature: 0.7,
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
  const text = sanitizeFreeText(body.choices?.[0]?.message?.content) || "";
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
          maxOutputTokens: 220,
          temperature: 0.7,
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
  const text = sanitizeFreeText(body.candidates?.[0]?.content?.parts?.[0]?.text) || "";
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
    const cloudResult = await runCloudInterpretation(request);
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
