import { ErrorCode, type AletheiaError } from "@/lib/types";

import type {
  NativeRequestInterpretationResponse,
  NativeBridgeError,
  NativeCancelInterpretationResponse,
  NativeChooseSymbolResponse,
  NativeCompleteReadingResponse,
  NativeFallbackPromptsResponse,
  NativeInterpretationStreamState,
  NativePerformReadingResponse,
  NativeSetApiKeyResponse,
  NativeStartInterpretationStreamResponse,
  NativeUserStateResponse,
} from "../../modules/aletheia-core-module/src";

const ERROR_CODE_MAP: Record<string, ErrorCode> = {
  ERR_SOURCE_NOT_FOUND: ErrorCode.SourceNotFound,
  ERR_PASSAGE_EMPTY: ErrorCode.PassageEmpty,
  ERR_THEME_NOT_FOUND: ErrorCode.ThemeNotFound,
  ERR_SYMBOL_INVALID: ErrorCode.SymbolInvalid,
  ERR_AI_TIMEOUT: ErrorCode.AiTimeout,
  ERR_AI_UNAVAILABLE: ErrorCode.AiUnavailable,
  ERR_GIFT_EXPIRED: ErrorCode.GiftExpired,
  ERR_GIFT_NOT_FOUND: ErrorCode.GiftNotFound,
  ERR_GIFT_ALREADY_REDEEMED: ErrorCode.GiftAlreadyRedeemed,
  ERR_DAILY_LIMIT_REACHED: ErrorCode.DailyLimitReached,
  ERR_SUBSCRIPTION_REQUIRED: ErrorCode.SubscriptionRequired,
  ERR_STORAGE_WRITE_FAIL: ErrorCode.StorageWriteFail,
  ERR_INVALID_INPUT: ErrorCode.InvalidInput,
};

export function toAletheiaError(error?: NativeBridgeError): AletheiaError | null {
  if (!error) {
    return null;
  }

  return {
    code: ERROR_CODE_MAP[error.code] ?? ErrorCode.InvalidInput,
    message: error.message,
    context: undefined,
  };
}

export function unwrapNativePerformReadingResponse(response: NativePerformReadingResponse) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  if (!response.session) {
    throw toAletheiaError({
      code: "ERR_INVALID_INPUT",
      message: "Native performReading returned no session.",
    });
  }
  return response.session;
}

export function unwrapNativeChooseSymbolResponse(response: NativeChooseSymbolResponse) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  if (!response.chosen) {
    throw toAletheiaError({
      code: "ERR_INVALID_INPUT",
      message: "Native chooseSymbol returned no chosen passage.",
    });
  }
  return response.chosen;
}

export function unwrapNativeCompleteReadingResponse(response: NativeCompleteReadingResponse) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  if (!response.completed) {
    throw toAletheiaError({
      code: "ERR_INVALID_INPUT",
      message: "Native completeReading returned no completion payload.",
    });
  }
  return response.completed;
}

export function unwrapNativeFallbackPromptsResponse(response: NativeFallbackPromptsResponse) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  return response.prompts;
}

export function unwrapNativeUserStateResponse(response: NativeUserStateResponse) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  if (!response.state) {
    throw toAletheiaError({
      code: "ERR_INVALID_INPUT",
      message: "Native getUserState returned no state.",
    });
  }
  return response.state;
}

export function unwrapNativeRequestInterpretationResponse(
  response: NativeRequestInterpretationResponse,
) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  if (!response.interpretation) {
    throw toAletheiaError({
      code: "ERR_INVALID_INPUT",
      message: "Native requestInterpretation returned no interpretation.",
    });
  }
  return response.interpretation;
}

export function unwrapNativeSetApiKeyResponse(response: NativeSetApiKeyResponse) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  return response.applied;
}

export function unwrapNativeStartInterpretationStreamResponse(
  response: NativeStartInterpretationStreamResponse,
) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  if (!response.request_id) {
    throw toAletheiaError({
      code: "ERR_INVALID_INPUT",
      message: "Native startInterpretationStream returned no request id.",
    });
  }
  return response.request_id;
}

export function unwrapNativeInterpretationStreamState(
  response: NativeInterpretationStreamState,
) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  return response;
}

export function unwrapNativeCancelInterpretationResponse(
  response: NativeCancelInterpretationResponse,
) {
  const error = toAletheiaError(response.error);
  if (error) {
    throw error;
  }
  return response.cancelled;
}
