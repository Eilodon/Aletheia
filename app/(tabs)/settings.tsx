import { useState, useEffect, useCallback } from "react";
import { View, ScrollView, StyleSheet, Text, Switch, Pressable, Alert } from "react-native";
import { useSafeAreaInsets } from "react-native-safe-area-context";
import { useRouter } from "expo-router";
import Constants from "expo-constants";
import { useColors } from "@/hooks/use-colors";
import { Fonts } from "@/constants/theme";
import { coreStore } from "@/lib/services/core-store";
import { getCurrentUserId } from "@/lib/services/current-user-id";
import { setLocale, useStrings } from "@/lib/i18n";
import { getUserInfo, signOut, type User } from "@/lib/auth";
import {
  requestNotificationPermission,
  scheduleDailyPassage,
  cancelDailyPassage,
  scheduleWeeklySummary,
  cancelWeeklySummary,
  parseNotificationTime,
  formatNotificationTime,
} from "@/lib/services/notification-service";
import { UserState } from "@/lib/types";
import { track, checkAnalyticsConsent, grantAnalyticsConsent, revokeAnalyticsConsent } from "@/lib/analytics";
import { showToast } from "@/components/toast";

const PRESET_TIMES = [
  { label: "06:00", hour: 6,  minute: 0 },
  { label: "07:00", hour: 7,  minute: 0 },
  { label: "08:00", hour: 8,  minute: 0 },
  { label: "09:00", hour: 9,  minute: 0 },
  { label: "20:00", hour: 20, minute: 0 },
  { label: "21:00", hour: 21, minute: 0 },
];

export default function SettingsScreen() {
  const colors = useColors();
  const insets = useSafeAreaInsets();
  const s = useStrings();
  const router = useRouter();

  const [currentUser, setCurrentUser] = useState<User | null | undefined>(undefined);
  const [isSigningOut, setIsSigningOut] = useState(false);
  const [userState, setUserState] = useState<UserState | null>(null);
  const [isTogglingNotification, setIsTogglingNotification] = useState(false);
  const [notificationError, setNotificationError] = useState<string | null>(null);
  const [isTogglingWeeklySummary, setIsTogglingWeeklySummary] = useState(false);
  const [analyticsEnabled, setAnalyticsEnabled] = useState<boolean | null>(null);
  const [isTogglingAnalytics, setIsTogglingAnalytics] = useState(false);
  const [isDeletingAll, setIsDeletingAll] = useState(false);
  const [privacyExpanded, setPrivacyExpanded] = useState(false);

  const loadUserState = useCallback(async () => {
    try {
      const userId = await getCurrentUserId();
      const state = await coreStore.getUserState(userId);
      setUserState(state);
    } catch (e) {
      console.error("[settings] failed to load user state:", e);
    }
  }, []);

  useEffect(() => { loadUserState(); }, [loadUserState]);

  useEffect(() => { getUserInfo().then(setCurrentUser); }, []);

  const handleSignOut = async () => {
    setIsSigningOut(true);
    try {
      await signOut();
      setCurrentUser(null);
    } catch (e) {
      console.error("[settings] sign out failed:", e);
    } finally {
      setIsSigningOut(false);
    }
  };

  useEffect(() => {
    checkAnalyticsConsent().then(setAnalyticsEnabled);
  }, []);

  const handleAnalyticsToggle = async (enabled: boolean) => {
    if (isTogglingAnalytics) return;
    setIsTogglingAnalytics(true);
    try {
      if (enabled) {
        await grantAnalyticsConsent();
        track("settings_analytics_enabled");
      } else {
        await revokeAnalyticsConsent();
      }
      setAnalyticsEnabled(enabled);
    } catch (e) {
      console.error("[settings] analytics toggle failed:", e);
    } finally {
      setIsTogglingAnalytics(false);
    }
  };

  const handleDeleteAllReadings = () => {
    Alert.alert(
      s.settings.deleteAllConfirmTitle,
      s.settings.deleteAllConfirmBody,
      [
        { text: s.common.cancel, style: "cancel" },
        {
          text: s.settings.deleteAllConfirmYes,
          style: "destructive",
          onPress: async () => {
            setIsDeletingAll(true);
            try {
              await coreStore.deleteAllReadings();
              track("settings_delete_all_readings");
              showToast("success", s.settings.deleteAllSuccess);
            } catch (e) {
              console.error("[settings] delete all failed:", e);
            } finally {
              setIsDeletingAll(false);
            }
          },
        },
      ]
    );
  };

  const saveUserState = async (updates: Partial<UserState>) => {
    if (!userState) return;
    const next = { ...userState, ...updates };
    setUserState(next);
    await coreStore.updateUserState(next);
  };

  // ── Language ────────────────────────────────────────────────────────────────

  const handleLanguageChange = async (lang: "vi" | "en") => {
    if (userState?.preferred_language === lang) return;
    setLocale(lang);
    await saveUserState({ preferred_language: lang });
    track("settings_language_changed", { language: lang });
  };

  // ── Notifications ────────────────────────────────────────────────────────────

  const handleNotificationToggle = async (enabled: boolean) => {
    if (isTogglingNotification) return;
    setIsTogglingNotification(true);
    setNotificationError(null);

    try {
      if (enabled) {
        const granted = await requestNotificationPermission();
        if (!granted) {
          setNotificationError(s.settings.notificationPermissionDenied);
          return;
        }
        const { hour, minute } = parseNotificationTime(userState?.notification_time ?? "07:00");
        await scheduleDailyPassage(hour, minute);
        await saveUserState({ notification_enabled: true });
        track("settings_notification_enabled", { time: userState?.notification_time ?? "07:00" });
      } else {
        await cancelDailyPassage();
        await saveUserState({ notification_enabled: false });
        track("settings_notification_disabled");
      }
    } catch (e) {
      console.error("[settings] notification toggle failed:", e);
    } finally {
      setIsTogglingNotification(false);
    }
  };

  const handleTimeSelect = async (hour: number, minute: number) => {
    const timeStr = formatNotificationTime(hour, minute);
    await saveUserState({ notification_time: timeStr });
    if (userState?.notification_enabled) {
      await scheduleDailyPassage(hour, minute);
      track("settings_notification_time_changed", { time: timeStr });
    }
  };

  const currentTime = userState?.notification_time ?? "07:00";
  const currentLocale = userState?.preferred_language ?? "vi";

  // ── Weekly Summary ───────────────────────────────────────────────────────────

  const handleWeeklySummaryToggle = async (enabled: boolean) => {
    if (isTogglingWeeklySummary) return;
    setIsTogglingWeeklySummary(true);
    try {
      if (enabled) {
        const granted = await requestNotificationPermission();
        if (!granted) return;
        const { hour, minute } = parseNotificationTime(userState?.notification_time ?? "20:00");
        await scheduleWeeklySummary(hour, minute);
        await saveUserState({ weekly_summary_enabled: true });
        track("settings_weekly_summary_enabled");
      } else {
        await cancelWeeklySummary();
        await saveUserState({ weekly_summary_enabled: false });
        track("settings_weekly_summary_disabled");
      }
    } catch (e) {
      console.error("[settings] weekly summary toggle failed:", e);
    } finally {
      setIsTogglingWeeklySummary(false);
    }
  };

  return (
    <ScrollView
      style={[styles.container, { backgroundColor: colors.background }]}
      contentContainerStyle={{
        paddingTop: insets.top + 16,
        paddingBottom: insets.bottom + 100,
        paddingHorizontal: 20,
      }}
    >
      {/* Header */}
      <Text style={[styles.title, { color: colors.foreground, fontFamily: Fonts.display }]}>
        {s.settings.title}
      </Text>
      <Text style={[styles.subtitle, { color: colors.muted }]}>
        {s.settings.subtitle}
      </Text>

      {/* Privacy & Data */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          {s.settings.privacySection}
        </Text>

        {/* Analytics toggle */}
        <Text style={[styles.sectionTitle, { color: colors.muted, marginBottom: 8, textTransform: "none", letterSpacing: 0.5, fontSize: 12 }]}>
          {s.settings.analyticsSection}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22" }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              {analyticsEnabled ? s.settings.analyticsToggleOn : s.settings.analyticsToggleOff}
            </Text>
            <Switch
              value={analyticsEnabled ?? false}
              onValueChange={handleAnalyticsToggle}
              disabled={isTogglingAnalytics || analyticsEnabled === null}
              trackColor={{ false: colors.border + "88", true: colors.primary + "AA" }}
              thumbColor={analyticsEnabled ? colors.primary : colors.muted}
            />
          </View>
        </View>
        <Text style={[styles.sectionNote, { color: colors.muted }]}>
          {s.settings.analyticsBody}
        </Text>

        {/* Privacy ledger */}
        <Pressable
          onPress={() => setPrivacyExpanded((v) => !v)}
          style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22", marginTop: 14 }]}
        >
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{s.settings.privacyLedgerSection}</Text>
            <Text style={{ color: colors.muted, fontSize: 16 }}>{privacyExpanded ? "−" : "+"}</Text>
          </View>
          {privacyExpanded && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.primary + "18" }]} />
              <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 4, gap: 10 }}>
                <Text style={[styles.rowSubLabel, { color: colors.primary }]}>{s.settings.privacyLedgerStaysTitle}</Text>
                {s.settings.privacyLedgerStaysItems.map((item, i) => (
                  <Text key={i} style={[styles.rowSubLabel, { color: colors.muted }]}>◦  {item}</Text>
                ))}
              </View>
              <View style={[styles.divider, { backgroundColor: colors.primary + "18", marginTop: 10 }]} />
              <View style={{ paddingHorizontal: 16, paddingTop: 12, paddingBottom: 16, gap: 10 }}>
                <Text style={[styles.rowSubLabel, { color: colors.primary }]}>{s.settings.privacyLedgerLeavesTitle}</Text>
                {s.settings.privacyLedgerLeavesItems.map((item, i) => (
                  <Text key={i} style={[styles.rowSubLabel, { color: colors.muted }]}>◦  {item}</Text>
                ))}
              </View>
            </>
          )}
        </Pressable>

        {/* Delete all readings */}
        <Pressable
          onPress={handleDeleteAllReadings}
          disabled={isDeletingAll}
          style={[styles.card, {
            backgroundColor: "transparent",
            borderColor: "#ff453a44",
            marginTop: 14,
            opacity: isDeletingAll ? 0.5 : 1,
          }]}
        >
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: "#ff453a" }]}>{s.settings.deleteAllReadingsLabel}</Text>
          </View>
        </Pressable>
      </View>

      {/* Language */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          {s.settings.languageSection}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22" }]}>
          {(["vi", "en"] as const).map((lang, i) => {
            const isSelected = currentLocale === lang;
            const label = lang === "vi" ? s.settings.languageVi : s.settings.languageEn;
            return (
              <View key={lang}>
                {i > 0 && <View style={[styles.divider, { backgroundColor: colors.primary + "18" }]} />}
                <Pressable
                  onPress={() => handleLanguageChange(lang)}
                  style={[styles.row, { opacity: 1 }]}
                >
                  <Text style={[styles.rowLabel, { color: isSelected ? colors.foreground : colors.muted, fontFamily: isSelected ? Fonts.bodyMedium : Fonts.body }]}>
                    {label}
                  </Text>
                  {isSelected && (
                    <Text style={{ color: colors.primary, fontSize: 16 }}>✦</Text>
                  )}
                </Pressable>
              </View>
            );
          })}
        </View>
      </View>

      {/* Notifications */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          {s.settings.notificationSection}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22" }]}>
          {/* Toggle row */}
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              {userState?.notification_enabled ? s.settings.notificationToggleOn : s.settings.notificationToggleOff}
            </Text>
            <Switch
              value={userState?.notification_enabled ?? false}
              onValueChange={handleNotificationToggle}
              disabled={isTogglingNotification}
              trackColor={{ false: colors.border + "88", true: colors.primary + "AA" }}
              thumbColor={userState?.notification_enabled ? colors.primary : colors.muted}
            />
          </View>

          {/* Time picker — only show when enabled */}
          {userState?.notification_enabled && (
            <>
              <View style={[styles.divider, { backgroundColor: colors.primary + "18" }]} />
              <Text style={[styles.rowSubLabel, { color: colors.muted, paddingHorizontal: 16, paddingTop: 12, paddingBottom: 8 }]}>
                {s.settings.notificationTimeLabel}
              </Text>
              <View style={styles.timeGrid}>
                {PRESET_TIMES.map(({ label, hour, minute }) => {
                  const isActive = currentTime === formatNotificationTime(hour, minute);
                  return (
                    <Pressable
                      key={label}
                      onPress={() => handleTimeSelect(hour, minute)}
                      style={[
                        styles.timeChip,
                        {
                          backgroundColor: isActive ? colors.primary + "18" : "transparent",
                          borderColor: isActive ? colors.primary + "72" : colors.primary + "22",
                        },
                      ]}
                    >
                      <Text style={[styles.timeChipText, { color: isActive ? colors.foreground : colors.muted, fontFamily: isActive ? Fonts.bodyMedium : Fonts.body }]}>
                        {label}
                      </Text>
                    </Pressable>
                  );
                })}
              </View>
            </>
          )}
        </View>

        {notificationError && (
          <Text style={[styles.errorText, { color: colors.muted }]}>{notificationError}</Text>
        )}

        <Text style={[styles.sectionNote, { color: colors.muted }]}>
          {s.settings.notificationBody}
        </Text>
      </View>

      {/* Weekly Summary */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          {s.settings.weeklySummarySection}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22" }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>
              {userState?.weekly_summary_enabled ? s.settings.weeklySummaryToggleOn : s.settings.weeklySummaryToggleOff}
            </Text>
            <Switch
              value={userState?.weekly_summary_enabled ?? false}
              onValueChange={handleWeeklySummaryToggle}
              disabled={isTogglingWeeklySummary}
              trackColor={{ false: colors.border + "88", true: colors.primary + "AA" }}
              thumbColor={userState?.weekly_summary_enabled ? colors.primary : colors.muted}
            />
          </View>
        </View>
        <Text style={[styles.sectionNote, { color: colors.muted }]}>
          {s.settings.weeklySummaryBody}
        </Text>
      </View>

      {/* Account */}
      {currentUser !== undefined && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>
            Tùy chọn đồng bộ
          </Text>
          <View style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22" }]}>
            {currentUser ? (
              <>
                <View style={styles.row}>
                  <Text style={[styles.rowLabel, { color: colors.foreground }]} numberOfLines={1}>
                    {currentUser.email ?? currentUser.name ?? currentUser.id}
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.primary + "18" }]} />
                <Pressable
                  onPress={handleSignOut}
                  disabled={isSigningOut}
                  style={[styles.row, { opacity: isSigningOut ? 0.5 : 1 }]}
                >
                  <Text style={[styles.rowLabel, { color: "#E07070" }]}>
                    {s.auth.signOut}
                  </Text>
                </Pressable>
              </>
            ) : (
              <>
                <View style={styles.row}>
                  <Text style={[styles.rowSubLabel, { color: colors.muted }]}>
                    AletheiA hoạt động đầy đủ không cần tài khoản. Đăng nhập chỉ dùng nếu bạn muốn đồng bộ giữa các thiết bị.
                  </Text>
                </View>
                <View style={[styles.divider, { backgroundColor: colors.primary + "18" }]} />
                <Pressable
                  // eslint-disable-next-line @typescript-eslint/no-explicit-any
                  onPress={() => router.push("/(auth)/sign-in" as any)}
                  style={styles.row}
                >
                  <Text style={[styles.rowLabel, { color: colors.primary }]}>
                    {s.auth.signIn}
                  </Text>
                  <Text style={{ color: colors.primary, fontSize: 14 }}>→</Text>
                </Pressable>
              </>
            )}
          </View>
        </View>
      )}

      {/* About */}
      <View style={styles.section}>
        <Text style={[styles.sectionTitle, { color: colors.muted }]}>
          {s.settings.aboutSection}
        </Text>
        <View style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22" }]}>
          <View style={styles.row}>
            <Text style={[styles.rowLabel, { color: colors.foreground }]}>{s.settings.aboutPrivacy}</Text>
          </View>
          <View style={[styles.divider, { backgroundColor: colors.primary + "18" }]} />
          <View style={styles.row}>
            <Text style={[styles.rowSubLabel, { color: colors.muted }]}>{s.settings.aboutVersion}</Text>
            <Text style={[styles.rowSubLabel, { color: colors.muted }]}>
              {Constants.expoConfig?.version ?? "—"}
            </Text>
          </View>
        </View>
      </View>

      {/* Dev-only sections */}
      {__DEV__ && (
        <View style={styles.section}>
          <Text style={[styles.sectionTitle, { color: colors.muted }]}>DEV</Text>
          <View style={[styles.card, { backgroundColor: colors.surface + "C8", borderColor: colors.primary + "22" }]}>
            <View style={styles.row}>
              <Text style={[styles.rowSubLabel, { color: colors.muted }]}>Local AI inference (hidden in production)</Text>
            </View>
          </View>
        </View>
      )}
    </ScrollView>
  );
}

const styles = StyleSheet.create({
  container: { flex: 1 },
  title: { fontSize: 30, marginBottom: 4 },
  subtitle: { fontSize: 14, lineHeight: 22, marginBottom: 28, fontFamily: Fonts.bodyItalic },
  section: { marginBottom: 28 },
  sectionTitle: { fontSize: 11, textTransform: "uppercase", letterSpacing: 2.2, marginBottom: 10 },
  sectionNote: { fontSize: 12, lineHeight: 18, marginTop: 10, fontFamily: Fonts.bodyItalic },
  errorText: { fontSize: 12, lineHeight: 18, marginTop: 8, fontFamily: Fonts.bodyItalic },
  card: { borderRadius: 20, borderWidth: 1, overflow: "hidden" },
  row: { flexDirection: "row", alignItems: "center", justifyContent: "space-between", paddingHorizontal: 16, paddingVertical: 14 },
  rowLabel: { fontSize: 15, flex: 1 },
  rowSubLabel: { fontSize: 13 },
  divider: { height: 1, marginHorizontal: 16 },
  timeGrid: { flexDirection: "row", flexWrap: "wrap", gap: 8, paddingHorizontal: 16, paddingBottom: 14 },
  timeChip: { paddingHorizontal: 14, paddingVertical: 8, borderRadius: 14, borderWidth: 1 },
  timeChipText: { fontSize: 13, letterSpacing: 0.4 },
});
