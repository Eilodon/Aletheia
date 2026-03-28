/**
 * GiftClient Service - Gift Reading Creation and Redemption
 * Handles: create_gift, redeem_gift via minimal backend
 */

import { v4 as uuidv4 } from "uuid";
import { GiftReading, ErrorCode, AletheiaError, GIFT_LINK_TTL_SECONDS } from "@/lib/types";
import { apiCall } from "@/lib/_core/api";

const GIFT_BACKEND_URL = process.env.GIFT_BACKEND_URL || "https://api.aletheia.app";

interface CreateGiftResponse {
  token: string;
  deep_link: string;
}

interface RedeemGiftResponse {
  source_id: string | null;
  buyer_note: string | null;
  message: string;
}

class GiftClientService {
  async createGift(
    sourceId?: string,
    buyerNote?: string
  ): Promise<{ token: string; deep_link: string }> {
    try {
      const response = await apiCall<CreateGiftResponse>("/api/gift/create", {
        method: "POST",
        body: JSON.stringify({
          source_id: sourceId,
          buyer_note: buyerNote,
        }),
      });

      return {
        token: response.token,
        deep_link: response.deep_link,
      };
    } catch (error) {
      console.error("[GiftClient] Failed to create gift:", error);
      
      if (error instanceof Error && error.message.includes("network")) {
        throw this.createError(
          ErrorCode.GiftNotFound,
          "Không thể kết nối, thử lại sau"
        );
      }
      
      throw this.createError(
        ErrorCode.GiftNotFound,
        error instanceof Error ? error.message : "Failed to create gift"
      );
    }
  }

  async redeemGift(token: string): Promise<RedeemGiftResponse> {
    try {
      const response = await apiCall<{
        source_id: string | null;
        buyer_note: string | null;
        expires_at: number;
        redeemed: boolean;
        redeemed_at: number | null;
      }>(`/api/gift/redeem`, {
        method: "POST",
        body: JSON.stringify({ token }),
      });

      if (response.redeemed && response.redeemed_at) {
        throw this.createError(
          ErrorCode.GiftAlreadyRedeemed,
          "Món quà này đã được nhận",
          { redeemed_at: response.redeemed_at }
        );
      }

      const now = Date.now();
      const expiresAt = response.expires_at || (Date.now() + GIFT_LINK_TTL_SECONDS * 1000);
      
      if (now > expiresAt) {
        throw this.createError(
          ErrorCode.GiftExpired,
          "Món quà này đã hết hạn sau 24 giờ",
          { expired_at: expiresAt }
        );
      }

      const message = response.buyer_note
        ? `Bạn nhận được một lần đọc từ "${response.buyer_note}"`
        : "Bạn nhận được một lần đọc đặc biệt";

      return {
        source_id: response.source_id,
        buyer_note: response.buyer_note,
        message,
      };
    } catch (error) {
      console.error("[GiftClient] Failed to redeem gift:", error);

      if (error instanceof Error && "code" in error) {
        throw error;
      }

      const errorMessage = error instanceof Error ? error.message : "Unknown error";

      if (errorMessage.includes("not found") || errorMessage.includes("404")) {
        throw this.createError(
          ErrorCode.GiftNotFound,
          "Không tìm thấy món quà này",
          { token }
        );
      }

      if (errorMessage.includes("expired") || errorMessage.includes("410")) {
        throw this.createError(
          ErrorCode.GiftExpired,
          "Món quà này đã hết hạn sau 24 giờ"
        );
      }

      if (errorMessage.includes("already redeemed") || errorMessage.includes("409")) {
        throw this.createError(
          ErrorCode.GiftAlreadyRedeemed,
          "Món quà này đã được nhận"
        );
      }

      throw this.createError(
        ErrorCode.GiftNotFound,
        "Không thể kết nối, thử lại sau"
      );
    }
  }

  generateLocalGiftToken(): string {
    const chars = "0123456789ABCDEFGHIJKLMNOPQRSTUVWXYZabcdefghijklmnopqrstuvwxyz";
    let token = "";
    for (let i = 0; i < 12; i++) {
      token += chars.charAt(Math.floor(Math.random() * chars.length));
    }
    return token;
  }

  createLocalGift(sourceId?: string, buyerNote?: string): GiftReading {
    const now = Date.now();
    return {
      token: this.generateLocalGiftToken(),
      buyer_note: buyerNote,
      source_id: sourceId,
      created_at: now,
      expires_at: now + GIFT_LINK_TTL_SECONDS * 1000,
      redeemed: false,
    };
  }

  private createError(
    code: ErrorCode,
    message: string,
    context?: Record<string, unknown>
  ): AletheiaError {
    return {
      code,
      message,
      context,
    };
  }
}

export const giftClient = new GiftClientService();
