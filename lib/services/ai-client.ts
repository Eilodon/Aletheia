/**
 * AIClient Service - AI Interpretation with Offline Fallback
 * Handles: request_interpretation, fallback prompts, retry logic
 */

import {
  Passage,
  Symbol,
  InterpretationStream,
  ErrorCode,
  AletheiaError,
  AI_STREAM_TIMEOUT_MS,
} from "@/lib/types";
import { store } from "./store";
import { readingEngine } from "./reading-engine";

const ANTHROPIC_API_URL = "https://api.anthropic.com/v1/messages";
const CLAUDE_MODEL = "claude-sonnet-4-20250514";
const MAX_RETRIES = 3;
const INITIAL_BACKOFF_MS = 500;

const SYSTEM_PROMPT = `Bạn là người đọc lá bài — không phải tiên tri, không phải chuyên gia tư vấn.
Bạn chỉ diễn giải những gì đã được lật ra.

Khi diễn giải:
- Kết nối nội dung passage với biểu tượng đã được chọn
- Nếu user có chia sẻ tình huống, gợi mở từ góc nhìn đó — nhưng không phán xét
- Tone: ấm áp, chiêm nghiệm, đôi khi có một chút dí dỏm nhẹ
- Độ dài: khoảng 80-120 chữ tiếng Việt

Tuyệt đối không:
- Đưa ra lời khuyên cụ thể ("bạn nên...")
- Khẳng định điều gì về tương lai
- Phán xét quyết định của user

Luôn kết thúc bằng một câu hỏi mở in nghiêng để user tự suy nghĩ tiếp.
Câu hỏi bắt đầu bằng dòng mới, format: *[câu hỏi]*`;

class AIClientService {
  private abortController: AbortController | null = null;

  async requestInterpretation(
    readingId: string,
    passage: Passage,
    symbol: Symbol,
    situationText?: string
  ): Promise<InterpretationStream> {
    const userId = "local-user";
    const userState = await store.getUserState(userId);

    const isOnline = await this.checkNetworkAvailability();
    if (!isOnline) {
      return this.createFallbackStream(passage.source_id);
    }

    const prompt = this.buildPrompt(passage, symbol, situationText);

    try {
      const response = await this.callWithRetry(prompt);
      
      return this.createStreamFromResponse(response);
    } catch (error) {
      console.error("[AIClient] AI call failed, using fallback:", error);
      return this.createFallbackStream(passage.source_id);
    }
  }

  cancel(): void {
    if (this.abortController) {
      this.abortController.abort();
      this.abortController = null;
    }
  }

  private async checkNetworkAvailability(): Promise<boolean> {
    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 3000);

      await fetch("https://api.anthropic.com", {
        method: "HEAD",
        signal: controller.signal,
      });

      clearTimeout(timeoutId);
      return true;
    } catch {
      return false;
    }
  }

  private buildPrompt(passage: Passage, symbol: Symbol, situationText?: string): string {
    const parts: string[] = [];

    if (situationText) {
      parts.push(`Tình huống: ${situationText}`);
    }
    parts.push(`Biểu tượng đã chọn: ${symbol.display_name}`);
    parts.push(`Đoạn trích (${passage.reference}):\n${passage.text}`);

    return parts.join("\n\n");
  }

  private async callWithRetry(prompt: string): Promise<Response> {
    let lastError: Error | null = null;
    let delay = INITIAL_BACKOFF_MS;

    for (let attempt = 0; attempt < MAX_RETRIES; attempt++) {
      try {
        const response = await this.callAnthropic(prompt);
        
        if (response.status === 429) {
          const jitter = Math.floor(Math.random() * 200);
          await this.sleep(delay + jitter);
          delay *= 2;
          lastError = new Error("Rate limited");
          continue;
        }

        if (!response.ok) {
          throw new Error(`Anthropic API error: ${response.status}`);
        }

        return response;
      } catch (error) {
        lastError = error instanceof Error ? error : new Error(String(error));
        
        if (attempt < MAX_RETRIES - 1) {
          const jitter = Math.floor(Math.random() * 200);
          await this.sleep(delay + jitter);
          delay *= 2;
        }
      }
    }

    throw lastError || new Error("Max retries exceeded");
  }

  private async callAnthropic(prompt: string): Promise<Response> {
    this.abortController = new AbortController();

    const timeoutId = setTimeout(() => {
      this.abortController?.abort();
    }, AI_STREAM_TIMEOUT_MS);

    try {
      const apiKey = await this.getApiKey();
      if (!apiKey) {
        throw new Error("No API key available");
      }

      const response = await fetch(ANTHROPIC_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-api-key": apiKey,
          "anthropic-version": "2023-06-01",
        },
        body: JSON.stringify({
          model: CLAUDE_MODEL,
          max_tokens: 1000,
          stream: true,
          system: SYSTEM_PROMPT,
          messages: [{ role: "user", content: prompt }],
        }),
        signal: this.abortController.signal,
      });

      return response;
    } finally {
      clearTimeout(timeoutId);
    }
  }

  private async getApiKey(): Promise<string | null> {
    return null;
  }

  private createFallbackStream(sourceId: string): InterpretationStream {
    const fallbackPrompts = [
      "Vũ trụ đang im lặng hôm nay. Hãy tự hỏi: Điều gì đang chờ đợi bạn phía trước?",
      "Trong sự tĩnh lặng, câu trả lời thường đến từ bên trong. Bạn đang cảm thấy điều gì?",
      "Mỗi khoảnh khắc là một cơ hội để nhìn sâu hơn. Điều gì đang gọi bạn ngay bây giờ?",
    ];

    const stream = this.createAsyncIterable(fallbackPrompts);

    return {
      stream,
      is_fallback: true,
    };
  }

  private createAsyncIterable(prompts: string[]): AsyncIterable<string> {
    const iterator = {
      index: 0,
      async next(): Promise<IteratorResult<string>> {
        if (this.index >= prompts.length) {
          return { done: true, value: undefined };
        }
        const value = prompts[this.index];
        this.index++;
        await new Promise((resolve) => setTimeout(resolve, 50));
        return { done: false, value };
      },
    };

    return {
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };
  }

  private createStreamFromResponse(response: Response): InterpretationStream {
    const decoder = new TextDecoder();
    let buffer = "";

    const stream = this.createAsyncIterableFromResponse(response);

    return {
      stream,
      is_fallback: false,
    };
  }

  private createAsyncIterableFromResponse(response: Response): AsyncIterable<string> {
    const reader = response.body?.getReader();
    if (!reader) {
      return this.createAsyncIterable(["Không thể đọc response"]);
    }

    const iterator = {
      reader,
      decoder: new TextDecoder(),
      buffer: "",
      async next(): Promise<IteratorResult<string>> {
        try {
          const { done, value } = await this.reader.read();
          
          if (done) {
            return { done: true, value: undefined };
          }

          this.buffer += this.decoder.decode(value, { stream: true });
          const lines = this.buffer.split("\n");
          this.buffer = lines.pop() || "";

          for (const line of lines) {
            if (line.startsWith("data: ")) {
              const data = line.slice(6);
              if (data === "[DONE]") {
                return { done: true, value: undefined };
              }

              try {
                const parsed = JSON.parse(data);
                if (parsed.type === "content_block_delta" && parsed.delta?.text) {
                  return { done: false, value: parsed.delta.text };
                }
              } catch {
                // Skip invalid JSON
              }
            }
          }

          return this.next();
        } catch (error) {
          return { done: true, value: undefined };
        }
      },
    };

    return {
      [Symbol.asyncIterator]() {
        return iterator;
      },
    };
  }

  private sleep(ms: number): Promise<void> {
    return new Promise((resolve) => setTimeout(resolve, ms));
  }

  private createError(code: ErrorCode, message: string, context?: Record<string, unknown>): AletheiaError {
    return {
      code,
      message,
      context,
    };
  }
}

export const aiClient = new AIClientService();
