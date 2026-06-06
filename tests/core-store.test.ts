import { beforeEach, describe, expect, it, vi } from "vitest";
import { coreStore } from "@/lib/services/core-store";

const runtimeMocks = vi.hoisted(() => ({
  shouldUseAletheiaNative: vi.fn(),
  initializeAletheiaNative: vi.fn(),
  isGiftBackendConfigured: vi.fn(),
}));

const nativeClientMocks = vi.hoisted(() => ({
  getReadings: vi.fn(),
  searchReadings: vi.fn(),
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
  deleteReading: vi.fn(),
  deleteAllReadings: vi.fn(),
}));

const storeMocks = vi.hoisted(() => ({
  getReadingById: vi.fn(),
  getReadingsCount: vi.fn(),
  getReadings: vi.fn(),
  searchReadings: vi.fn(),
  getSearchReadingsCount: vi.fn(),
  upsertReadingPrivacyFlags: vi.fn(),
  deleteReadingsExcept: vi.fn(),
  updateReadingFlags: vi.fn(),
  deleteReading: vi.fn(),
  deleteAllReadings: vi.fn(),
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

  it("persists TS-only hide_situation for native readings before returning merged native state", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    storeMocks.upsertReadingPrivacyFlags.mockResolvedValue(undefined);
    nativeClientMocks.getReadingById.mockResolvedValue({ id: "reading-native", hide_situation: false });
    storeMocks.getReadingById.mockResolvedValue({ id: "reading-native", hide_situation: true });

    await expect(
      coreStore.updateReadingFlags("reading-native", { hide_situation: true }),
    ).resolves.toMatchObject({ id: "reading-native", hide_situation: true });

    expect(storeMocks.upsertReadingPrivacyFlags).toHaveBeenCalledWith("reading-native", {
      hide_situation: true,
    });
    expect(nativeClientMocks.updateReadingFlags).not.toHaveBeenCalled();
    expect(nativeClientMocks.getReadingById).toHaveBeenCalledWith("reading-native");
  });

  it("searches readings through the store query when native path is disabled", async () => {
    storeMocks.getSearchReadingsCount.mockResolvedValue(1);
    storeMocks.searchReadings.mockResolvedValue([{ id: "reading-1" }]);

    await expect(
      coreStore.searchReadingsPage({
        query: "loss",
        filter: "favorites",
        sort: "oldest",
        limit: 20,
        offset: 0,
      }),
    ).resolves.toMatchObject({
      items: [{ id: "reading-1" }],
      total_count: 1,
      has_more: false,
    });

    expect(storeMocks.searchReadings).toHaveBeenCalledWith({
      query: "loss",
      filter: "favorites",
      sort: "oldest",
      limit: 20,
      offset: 0,
    });
  });

  it("repairs orphan TS-only reading rows from the native reading id set", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    nativeClientMocks.getReadings
      .mockResolvedValueOnce({
        items: [{ id: "reading-1" }, { id: "reading-2" }],
        total_count: 2,
        has_more: false,
      });
    storeMocks.deleteReadingsExcept.mockResolvedValue(1);

    await expect(coreStore.repairReadingDependents()).resolves.toBe(1);

    expect(storeMocks.deleteReadingsExcept).toHaveBeenCalledWith(["reading-1", "reading-2"]);
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

  it("exposes gift creation support without screen-level native branching", () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(false);
    runtimeMocks.isGiftBackendConfigured.mockReturnValue(true);
    expect(coreStore.canCreateGift()).toBe(false);

    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    runtimeMocks.isGiftBackendConfigured.mockReturnValue(false);
    expect(coreStore.canCreateGift()).toBe(false);

    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    runtimeMocks.isGiftBackendConfigured.mockReturnValue(true);
    expect(coreStore.canCreateGift()).toBe(true);
  });

  it("deletes one reading through native bridge and cascades TS-only dependent flags", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    nativeClientMocks.deleteReading.mockResolvedValue(undefined);
    storeMocks.deleteReading.mockResolvedValue(undefined);

    await coreStore.deleteReading("reading-native");

    expect(runtimeMocks.initializeAletheiaNative).toHaveBeenCalledTimes(1);
    expect(nativeClientMocks.deleteReading).toHaveBeenCalledWith("reading-native");
    expect(storeMocks.deleteReading).toHaveBeenCalledWith("reading-native");
    expect(storeMocks.getReadingById).not.toHaveBeenCalled();
  });

  it("deletes all readings through native bridge and clears TS-only dependent rows", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    nativeClientMocks.deleteAllReadings.mockResolvedValue(undefined);
    storeMocks.deleteAllReadings.mockResolvedValue(undefined);

    await coreStore.deleteAllReadings();

    expect(runtimeMocks.initializeAletheiaNative).toHaveBeenCalledTimes(1);
    expect(nativeClientMocks.deleteAllReadings).toHaveBeenCalledTimes(1);
    expect(storeMocks.deleteAllReadings).toHaveBeenCalledTimes(1);
    expect(storeMocks.getReadings).not.toHaveBeenCalled();
  });

  it("exports native readings with TS-only hide_situation flags merged in", async () => {
    runtimeMocks.shouldUseAletheiaNative.mockReturnValue(true);
    nativeClientMocks.getReadings.mockResolvedValue({
      items: [{ id: "reading-native", hide_situation: false }],
      total_count: 1,
      has_more: false,
    });
    storeMocks.getReadingById.mockResolvedValue({
      id: "reading-native",
      hide_situation: true,
    });

    await expect(coreStore.exportReadings()).resolves.toMatchObject({
      schema: "aletheia.readings.export.v1",
      readings: [{ id: "reading-native", hide_situation: true }],
    });
  });

  it("exports readings through the core-store facade", async () => {
    storeMocks.getReadingsCount.mockResolvedValue(1);
    storeMocks.getReadings.mockResolvedValue([{ id: "reading-1" }]);

    await expect(coreStore.exportReadings()).resolves.toMatchObject({
      schema: "aletheia.readings.export.v1",
      readings: [{ id: "reading-1" }],
    });
  });
});
