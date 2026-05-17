import { beforeEach, describe, expect, it, vi } from "vitest";
import { coreStore } from "@/lib/services/core-store";

const runtimeMocks = vi.hoisted(() => ({
  shouldUseAletheiaNative: vi.fn(),
  initializeAletheiaNative: vi.fn(),
  isGiftBackendConfigured: vi.fn(),
}));

const nativeClientMocks = vi.hoisted(() => ({
  getReadings: vi.fn(),
  getReadingById: vi.fn(),
  updateReadingFlags: vi.fn(),
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
  unwrapNativeReadingResponse: vi.fn((value) => value),
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

  it("uses native direct lookup when native path is enabled", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    const reading = { id: "reading-native" };
    nativeClientMocks.getReadingById.mockResolvedValue(reading);

    await expect(coreStore.getReadingById("reading-native")).resolves.toBe(reading);
    expect(runtimeMocks.initializeAletheiaNative).toHaveBeenCalledTimes(1);
    expect(nativeClientMocks.getReadingById).toHaveBeenCalledWith("reading-native");
    expect(nativeClientMocks.getReadings).not.toHaveBeenCalled();
  });

  it("updates reading flags through native bridge when native path is enabled", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    const updated = { id: "reading-native", is_favorite: true, shared: false };
    nativeClientMocks.updateReadingFlags.mockResolvedValue(updated);

    await expect(
      coreStore.updateReadingFlags("reading-native", { is_favorite: true }),
    ).resolves.toBe(updated);
    expect(runtimeMocks.initializeAletheiaNative).toHaveBeenCalledTimes(1);
    expect(nativeClientMocks.updateReadingFlags).toHaveBeenCalledWith("reading-native", {
      isFavorite: true,
      shared: undefined,
    });
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
