import type {
  ChosenPassage,
  CompletedReading,
  GiftReading,
  GiftResponse,
  NotificationMessage,
  PaginatedReadings,
  Passage,
  Reading,
  ReadingSession,
  Source,
  SymbolMethod,
  UserState,
} from "@/lib/types";
import { BUNDLED_PASSAGES, BUNDLED_SOURCES } from "@/lib/data/content";
import { aletheiaNativeClient } from "@/lib/native/aletheia-core";
import {
  unwrapNativeChooseSymbolResponse,
  unwrapNativeCompleteReadingResponse,
  unwrapNativeNotificationMessageResponse,
  unwrapNativePaginatedReadingsResponse,
  unwrapNativePerformReadingResponse,
  unwrapNativeReadingResponse,
  unwrapNativeUpdateUserStateResponse,
  unwrapNativeUserStateResponse,
  unwrapNativeSourcesResponse,
} from "@/lib/native/bridge";
import {
  initializeAletheiaNative,
  isGiftBackendConfigured,
  shouldUseAletheiaNative,
} from "@/lib/native/runtime";
import type {
  NativeReadingSession,
  NativeUserState,
} from "../../modules/aletheia-core-module/src";

import { getCurrentUserId } from "./current-user-id";
import { readingEngine } from "./reading-engine";
import { store } from "./store";

export interface ReadingDetail {
  reading: Reading;
  source: Source | undefined;
  passage: Passage | undefined;
}

class CoreStoreService {
  private async ensureNativeReady() {
    if (shouldUseAletheiaNative()) {
      await initializeAletheiaNative();
    }
  }

  async syncLocalDate(localDate: string = new Date().toLocaleDateString("en-CA")): Promise<void> {
    if (!shouldUseAletheiaNative()) {
      return;
    }

    await this.ensureNativeReady();
    await aletheiaNativeClient.setLocalDate(localDate);
  }

  async performReading(
    sourceId?: string,
    situationText?: string,
  ): Promise<ReadingSession> {
    if (!shouldUseAletheiaNative()) {
      return readingEngine.performReading(sourceId, situationText);
    }

    await this.ensureNativeReady();
    const userId = await getCurrentUserId();
    return unwrapNativePerformReadingResponse(
      await aletheiaNativeClient.performReading(userId, sourceId, situationText),
    ) as ReadingSession;
  }

  async chooseSymbol(
    session: ReadingSession,
    symbolId: string,
    method: SymbolMethod,
  ): Promise<ChosenPassage> {
    if (!shouldUseAletheiaNative()) {
      return readingEngine.chooseSymbol(session, symbolId, method);
    }

    await this.ensureNativeReady();
    return unwrapNativeChooseSymbolResponse(
      await aletheiaNativeClient.chooseSymbol(session as NativeReadingSession, symbolId, method),
    ) as ChosenPassage;
  }

  async completeReading(reading: Reading): Promise<CompletedReading> {
    if (!shouldUseAletheiaNative()) {
      return readingEngine.completeReading(reading);
    }

    await this.ensureNativeReady();
    const userId = await getCurrentUserId();
    return unwrapNativeCompleteReadingResponse(
      await aletheiaNativeClient.completeReading(userId, reading),
    ) as CompletedReading;
  }

  async getUserState(userId: string): Promise<UserState> {
    if (!shouldUseAletheiaNative()) {
      return store.getUserState(userId);
    }

    await this.ensureNativeReady();
    return unwrapNativeUserStateResponse(
      await aletheiaNativeClient.getUserState(userId),
    ) as UserState;
  }

  async updateUserState(state: UserState): Promise<void> {
    if (!shouldUseAletheiaNative()) {
      await store.updateUserState(state);
      return;
    }

    await this.ensureNativeReady();
    unwrapNativeUpdateUserStateResponse(
      await aletheiaNativeClient.updateUserState(state as NativeUserState),
    );
  }

  async getReadingsPage(limit: number, offset: number): Promise<PaginatedReadings> {
    if (!shouldUseAletheiaNative()) {
      const [totalCount, items] = await Promise.all([
        store.getReadingsCount(),
        store.getReadings(limit, offset),
      ]);

      return {
        items,
        total_count: totalCount,
        has_more: offset + limit < totalCount,
      };
    }

    await this.ensureNativeReady();
    return unwrapNativePaginatedReadingsResponse(
      await aletheiaNativeClient.getReadings(limit, offset),
    ) as PaginatedReadings;
  }

  async getReadingById(id: string): Promise<Reading | null> {
    if (!shouldUseAletheiaNative()) {
      return store.getReadingById(id);
    }

    await this.ensureNativeReady();
    return unwrapNativeReadingResponse(
      await aletheiaNativeClient.getReadingById(id),
    ) as Reading | null;
  }

  async getReadingDetail(id: string): Promise<ReadingDetail | null> {
    const reading = await this.getReadingById(id);
    if (!reading) {
      return null;
    }

    // Try bundled data first, then fall back to native module / store lookup
    let source: Source | undefined = BUNDLED_SOURCES.find((item) => item.id === reading.source_id);
    let passage: Passage | undefined = BUNDLED_PASSAGES.find((item) => item.id === reading.passage_id);

    if (!source || !passage) {
      if (shouldUseAletheiaNative()) {
        try {
          await this.ensureNativeReady();
          if (!source) {
            const nativeSources = unwrapNativeSourcesResponse(
              await aletheiaNativeClient.getSources(true),
            ) as Source[];
            source = nativeSources.find((s) => s.id === reading.source_id);
          }
          // Passage lookup requires store fallback (native module has no getPassageById yet)
          if (!passage) {
            passage = await store.getPassage(reading.passage_id) ?? undefined;
          }
        } catch {
          // Native lookup failed — keep bundled result (may be undefined)
        }
      } else {
        // Non-native path: use store directly
        if (!source) {
          source = (await store.getSource(reading.source_id)) ?? undefined;
        }
        if (!passage) {
          passage = (await store.getPassage(reading.passage_id)) ?? undefined;
        }
      }
    }

    return { reading, source, passage };
  }

  async updateReadingFlags(
    id: string,
    flags: {
      is_favorite?: boolean;
      shared?: boolean;
    },
  ): Promise<Reading | null> {
    if (!shouldUseAletheiaNative()) {
      return store.updateReadingFlags(id, flags);
    }

    await this.ensureNativeReady();
    return unwrapNativeReadingResponse(
      await aletheiaNativeClient.updateReadingFlags(id, {
        isFavorite: flags.is_favorite,
        shared: flags.shared,
      }),
    ) as Reading | null;
  }

  async getGiftableSources(): Promise<Source[]> {
    if (!shouldUseAletheiaNative()) {
      return store.getGiftableSources();
    }

    await this.ensureNativeReady();
    return unwrapNativeSourcesResponse(
      await aletheiaNativeClient.getSources(false),
    ) as Source[];
  }

  async getDailyNotificationMessage(userId: string, date: string): Promise<NotificationMessage> {
    if (!shouldUseAletheiaNative()) {
      return store.getDailyNotificationMessage(userId, date);
    }

    await this.ensureNativeReady();
    return unwrapNativeNotificationMessageResponse(
      await aletheiaNativeClient.getDailyNotificationMessage(userId, date),
    ) as NotificationMessage;
  }

  async redeemGift(token: string): Promise<GiftReading> {
    this.ensureGiftSupport("redeem");

    if (!shouldUseAletheiaNative()) {
      throw new Error("Nhận quà hiện chỉ hỗ trợ trên Android.");
    }

    await this.ensureNativeReady();
    const response = await aletheiaNativeClient.redeemGift(token);

    if (response.error) {
      throw new Error(response.error.code);
    }
    if (!response.gift) {
      throw new Error("Native redeemGift returned no gift payload.");
    }

    return response.gift as GiftReading;
  }

  async createGift(sourceId?: string, buyerNote?: string): Promise<GiftResponse> {
    this.ensureGiftSupport("create");

    if (!shouldUseAletheiaNative()) {
      throw new Error("Tạo quà hiện chỉ hỗ trợ trên Android beta.");
    }

    await this.ensureNativeReady();
    const response = await aletheiaNativeClient.createGift(sourceId, buyerNote);

    if (response.error) {
      throw new Error(response.error.message);
    }
    if (!response.token || !response.deep_link) {
      throw new Error("Native createGift returned no gift payload.");
    }

    return {
      token: response.token,
      deep_link: response.deep_link,
    };
  }

  private ensureGiftSupport(action: "create" | "redeem") {
    if (!shouldUseAletheiaNative()) {
      throw new Error(
        action === "create"
          ? "Tạo quà hiện chỉ hỗ trợ trên Android beta."
          : "Nhận quà hiện chỉ hỗ trợ trên Android beta.",
      );
    }

    if (!isGiftBackendConfigured()) {
      throw new Error("Gift backend chưa được cấu hình. Cần EXPO_PUBLIC_GIFT_BACKEND_URL.");
    }
  }
}

export const coreStore = new CoreStoreService();
