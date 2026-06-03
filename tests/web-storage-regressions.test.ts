import { afterEach, describe, expect, it, vi } from "vitest";

const webPlatformMock = () => {
  vi.doMock("react-native", () => ({
    Platform: { OS: "web" },
  }));
};

const secureStoreMock = () => {
  vi.doMock("expo-secure-store", () => ({
    getItemAsync: vi.fn(),
    setItemAsync: vi.fn(),
    deleteItemAsync: vi.fn(),
  }));
};

function stubSessionStorage() {
  const storage: Pick<Storage, "getItem" | "setItem" | "removeItem"> = {
    getItem: vi.fn(() => null),
    setItem: vi.fn(),
    removeItem: vi.fn(),
  };
  vi.stubGlobal("window", { sessionStorage: storage });
  return storage;
}

describe("web storage regressions", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
    vi.clearAllMocks();
  });

  it("does not persist web auth user info in sessionStorage", async () => {
    webPlatformMock();
    secureStoreMock();
    const storage = stubSessionStorage();

    const { clearUserInfo, getUserInfo, setUserInfo } = await import("../lib/auth");

    await setUserInfo({
      id: 7,
      openId: "user-open-id",
      name: "Sensitive Name",
      email: "sensitive@example.com",
      loginMethod: "oauth",
      lastSignedIn: new Date("2026-06-02T00:00:00.000Z"),
    });
    const user = await getUserInfo();
    await clearUserInfo();

    expect(user).toBeNull();
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
    expect(storage.removeItem).not.toHaveBeenCalled();
  });

  it("keeps anonymous web device ids in memory instead of sessionStorage", async () => {
    webPlatformMock();
    secureStoreMock();
    vi.doMock("@/lib/auth", () => ({
      getUserInfo: vi.fn(async () => null),
    }));
    const storage = stubSessionStorage();

    const { getOrCreateDeviceId } = await import("../lib/services/current-user-id");

    const first = await getOrCreateDeviceId();
    const second = await getOrCreateDeviceId();

    expect(first).toBe(second);
    expect(first).not.toHaveLength(0);
    expect(storage.getItem).not.toHaveBeenCalled();
    expect(storage.setItem).not.toHaveBeenCalled();
  });
});
