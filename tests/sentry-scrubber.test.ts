import { describe, expect, it } from "vitest";

import { scrubSentryEvent } from "@/lib/sentry-scrubber";

describe("Sentry scrubber", () => {
  it("redacts sensitive nested fields and stringified secrets", () => {
    const event = scrubSentryEvent({
      message: "provider failed with sk-ant-1234567890 and gift abcdefghijklmnop",
      extra: {
        situation_text: "I am scared",
        nested: {
          passage: { text: "Private passage text" },
          Authorization: "Bearer secret-token",
          providerError: "upstream echoed situation_text=private value",
        },
      },
      request: {
        headers: {
          authorization: "Bearer secret-token",
        },
        data: {
          buyer_note: "private note",
          token: "gift-token",
        },
      },
      breadcrumbs: [
        {
          message: "sent passage.text to provider",
          data: { model_prompt: "private prompt" },
        },
      ],
    });

    const serialized = JSON.stringify(event);
    expect(serialized).not.toContain("I am scared");
    expect(serialized).not.toContain("Private passage text");
    expect(serialized).not.toContain("secret-token");
    expect(serialized).not.toContain("private note");
    expect(serialized).not.toContain("private prompt");
    expect(serialized).not.toContain("sk-ant-1234567890");
    expect(serialized).toContain("[REDACTED]");
  });
});
