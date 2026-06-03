/**
 * RevenueCat purchases service.
 * Gracefully degrades on web and when API keys are not configured.
 * All public functions are safe to call in any environment.
 */
import { Platform } from "react-native";
import type PurchasesType from "react-native-purchases";
import type { CustomerInfo, PurchasesOffering, PurchasesPackage } from "react-native-purchases";

// Dynamic import — web and unconfigured builds get null, no crash.
let rc: typeof PurchasesType | null = null;
if (Platform.OS !== "web") {
  try {
    rc = require("react-native-purchases").default as typeof PurchasesType;
  } catch {
    rc = null;
  }
}

const ENTITLEMENT_PRO = "pro";

// Read API keys set via app.config.ts extra or EXPO_PUBLIC_ env vars.
// Must be set before the first native build; not needed for JS-only dev.
const RC_KEY_ANDROID = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID ?? "";
const RC_KEY_IOS = process.env.EXPO_PUBLIC_REVENUECAT_API_KEY_IOS ?? "";

function resolveApiKey(): string {
  return Platform.OS === "ios" ? RC_KEY_IOS : RC_KEY_ANDROID;
}

function isConfigured(): boolean {
  return rc !== null && resolveApiKey().length > 0;
}

/** Call once at app startup (after fonts/DB are ready). No-op if not configured. */
export function initializePurchases(): void {
  if (!isConfigured()) return;
  try {
    rc!.configure({ apiKey: resolveApiKey() });
  } catch (e) {
    console.warn("[purchases] configure failed:", e);
  }
}

/** Returns true if the user has an active Pro entitlement. */
export async function isPro(): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const info: CustomerInfo = await rc!.getCustomerInfo();
    return info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
  } catch {
    return false;
  }
}

/** Returns the current RC offering, or null if unavailable. */
export async function getCurrentOffering(): Promise<PurchasesOffering | null> {
  if (!isConfigured()) return null;
  try {
    const offerings = await rc!.getOfferings();
    return offerings.current;
  } catch {
    return null;
  }
}

/**
 * Purchase a package. Returns true on success, false on user-cancel.
 * Throws on unexpected errors (network, billing unavailable, etc.).
 */
export async function purchasePackage(pkg: PurchasesPackage): Promise<boolean> {
  if (!isConfigured()) {
    throw new Error("RevenueCat not configured — set EXPO_PUBLIC_REVENUECAT_API_KEY_ANDROID/IOS.");
  }
  try {
    const { customerInfo } = await rc!.purchasePackage(pkg);
    return customerInfo.entitlements.active[ENTITLEMENT_PRO] !== undefined;
  } catch (error: unknown) {
    // rc-purchases throws an object with userCancelled when user cancels
    if (
      typeof error === "object" &&
      error !== null &&
      "userCancelled" in error &&
      (error as { userCancelled: boolean }).userCancelled
    ) {
      return false;
    }
    throw error;
  }
}

/** Restore previous purchases. Returns true if Pro entitlement is now active. */
export async function restorePurchases(): Promise<boolean> {
  if (!isConfigured()) return false;
  try {
    const info: CustomerInfo = await rc!.restorePurchases();
    return info.entitlements.active[ENTITLEMENT_PRO] !== undefined;
  } catch {
    return false;
  }
}
