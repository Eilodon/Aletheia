import { beforeEach, describe, expect, it, vi } from "vitest";

const runtimeMocks = vi.hoisted(() => ({
  shouldUseAletheiaNative: vi.fn(),
  initializeAletheiaNative: vi.fn(),
  isGiftBackendConfigured: vi.fn(),
}));

const nativeClientMocks = vi.hoisted(() => ({
  getReadings: vi.fn(),
  setLocalDate: vi.fn(),
  performReading: vi.fn(),
  chooseSymbol: vi.fn(),
  completeReading: vi.fn(),
  getUserState: vi.fn(),
  updateUserState: vi.fn(),
  getSources: vi.fn(),
  getDailyNotificationMessage: vi.fn(),
  redeemGift: vi.fn(),
  createGift: vi.fn(),
}));

const storeMocks = vi.hoisted(() => ({
  getReadingById: vi.fn(),
  getReadingsCount: vi.fn(),
  getReadings: vi.fn(),
  getGiftableSources: vi.fn(),
  getDailyNotificationMessage: vi.fn(),
  getUserState: vi.fn(),
  updateUserState: vi.fn(),
}));

vi.mock("@/lib/native/runtime", () => ({
  shouldUseAletheiaNative: runtimeMocks.shouldUseAletheiaNative,
  initializeAletheiaNative: runtimeMocks.initializeAletheiaNative,
  isGiftBackendConfigured: runtimeMocks.isGiftBackendConfigured,
}));

vi.mock("@/lib/native/aletheia-core", () => ({
  aletheiaNativeClient: nativeClientMocks,
}));

vi.mock("@/lib/native/bridge", () => ({
  unwrapNativeChooseSymbolResponse: vi.fn((value) => value),
  unwrapNativeCompleteReadingResponse: vi.fn((value) => value),
  unwrapNativeNotificationMessageResponse: vi.fn((value) => value),
  unwrapNativePaginatedReadingsResponse: vi.fn((value) => value),
  unwrapNativePerformReadingResponse: vi.fn((value) => value),
  unwrapNativeUpdateUserStateResponse: vi.fn((value) => value),
  unwrapNativeUserStateResponse: vi.fn((value) => value),
  unwrapNativeSourcesResponse: vi.fn((value) => value),
}));

vi.mock("@/lib/services/store", () => ({
  store: storeMocks,
}));

vi.mock("@/lib/services/reading-engine", () => ({
  readingEngine: {
    performReading: vi.fn(),
    chooseSymbol: vi.fn(),
    completeReading: vi.fn(),
  },
}));

vi.mock("@/lib/services/current-user-id", () => ({
  getCurrentUserId: vi.fn().mockResolvedValue("user-1"),
}));

import { coreStore } from "@/lib/services/core-store";

describe("CoreStoreService", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(false);
    runtimeMocks.initializeAletheiaNative.mockResolvedValue(undefined);
    runtimeMocks.isGiftBackendConfigured.mockReturnValue(true);
  });

  it("uses store.getReadingById when native path is disabled", async () => {
    const reading = { id: "reading-1" };
    storeMocks.getReadingById.mockResolvedValue(reading);

    await expect(coreStore.getReadingById("reading-1")).resolves.toBe(reading);
    expect(storeMocks.getReadingById).toHaveBeenCalledWith("reading-1");
    expect(nativeClientMocks.getReadings).not.toHaveBeenCalled();
  });

  it("stops native pagination when total_count bound is reached", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    nativeClientMocks.getReadings.mockResolvedValue({
      items: [],
      total_count: 50,
      has_more: true,
    });

    await expect(coreStore.getReadingById("missing-reading")).resolves.toBeNull();
    expect(nativeClientMocks.getReadings).toHaveBeenCalledTimes(1);
    expect(nativeClientMocks.getReadings).toHaveBeenCalledWith(50, 0);
  });

  it("returns platform error before backend config error on unsupported runtimes", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(false);
    runtimeMocks.isGiftBackendConfigured.mockReturnValue(false);

    await expect(coreStore.createGift("source-1")).rejects.toThrow(
      "Tạo quà hiện chỉ hỗ trợ trên Android beta.",
    );
  });

  it("requires an explicit gift backend URL on native runtime", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    runtimeMocks.isGiftBackendConfigured.mockReturnValue(false);

    await expect(coreStore.redeemGift("gift-token")).rejects.toThrow(
      "Gift backend chưa được cấu hình. Cần EXPO_PUBLIC_GIFT_BACKEND_URL.",
    );
  });
});
