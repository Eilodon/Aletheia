import { useState, useRef } from "react";
import {
  Animated,
  KeyboardAvoidingView,
  Platform,
  Pressable,
  StyleSheet,
  Text,
  TextInput,
  View,
  ActivityIndicator,
} from "react-native";
import { useRouter } from "expo-router";

import { ScreenContainer } from "@/components/screen-container";
import { RitualOrnament } from "@/components/ritual-ornament";
import { useColors } from "@/hooks/use-colors";
import { useStrings, useDisplayFont } from "@/lib/i18n";
import { Fonts } from "@/constants/theme";
import { signIn, signUp, verifyEmail } from "@/lib/auth";

type Mode = "sign-in" | "sign-up" | "verify";

export default function SignInScreen() {
  const colors = useColors();
  const s = useStrings();
  const df = useDisplayFont();
  const router = useRouter();

  const [mode, setMode] = useState<Mode>("sign-in");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [name, setName] = useState("");
  const [otp, setOtp] = useState("");
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const fadeAnim = useRef(new Animated.Value(1)).current;

  const switchMode = (next: Mode) => {
    Animated.sequence([
      Animated.timing(fadeAnim, { toValue: 0, duration: 100, useNativeDriver: true }),
      Animated.timing(fadeAnim, { toValue: 1, duration: 180, useNativeDriver: true }),
    ]).start();
    setError(null);
    setMode(next);
  };

  const handleSignIn = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      await signIn(email.trim(), password);
      router.back();
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.toLowerCase().includes("invalid") ? s.auth.errorInvalid : s.auth.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleSignUp = async () => {
    if (!email.trim() || !password) return;
    setLoading(true);
    setError(null);
    try {
      const result = await signUp(email.trim(), password, name.trim() || undefined);
      if (result.requireEmailVerification) {
        switchMode("verify");
      } else {
        router.back();
      }
    } catch (err) {
      const msg = err instanceof Error ? err.message : "";
      setError(msg.toLowerCase().includes("exist") ? s.auth.errorInvalid : s.auth.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const handleVerify = async () => {
    if (otp.length !== 6) return;
    setLoading(true);
    setError(null);
    try {
      await verifyEmail(email.trim(), otp.trim());
      router.back();
    } catch {
      setError(s.auth.errorGeneric);
    } finally {
      setLoading(false);
    }
  };

  const inputStyle = [
    styles.input,
    { color: colors.foreground, borderColor: colors.border, backgroundColor: colors.surface + "CC" },
  ];

  const placeholderColor = colors.muted + "99";

  return (
    <ScreenContainer className="px-6 pb-6">
      <KeyboardAvoidingView
        behavior={Platform.OS === "ios" ? "padding" : "height"}
        style={styles.kav}
      >
        {/* Close button */}
        <Pressable onPress={() => router.back()} style={styles.closeBtn} hitSlop={12}>
          <Text style={[styles.closeText, { color: colors.muted }]}>✕</Text>
        </Pressable>

        <Animated.View style={[styles.root, { opacity: fadeAnim }]}>
          {/* Header */}
          <View style={styles.header}>
            <RitualOrnament variant="eye" size="sm" />
            <Text style={[styles.title, { color: colors.foreground, fontFamily: df.display }]}>
              {mode === "verify" ? s.auth.verifyEmailTitle : mode === "sign-in" ? s.auth.signIn : s.auth.signUp}
            </Text>
            {mode !== "verify" && (
              <Text style={[styles.benefits, { color: colors.muted, fontFamily: Fonts.bodyItalic }]}>
                {s.auth.accountBenefits}
              </Text>
            )}
            {mode === "verify" && (
              <Text style={[styles.benefits, { color: colors.muted, fontFamily: Fonts.bodyItalic }]}>
                {s.auth.verifyEmailBody}
              </Text>
            )}
          </View>

          {/* Form */}
          <View style={styles.form}>
            {mode === "verify" ? (
              <TextInput
                style={inputStyle}
                placeholder={s.auth.verifyCode}
                placeholderTextColor={placeholderColor}
                value={otp}
                onChangeText={setOtp}
                keyboardType="number-pad"
                maxLength={6}
                autoFocus
              />
            ) : (
              <>
                {mode === "sign-up" && (
                  <TextInput
                    style={inputStyle}
                    placeholder={s.auth.name}
                    placeholderTextColor={placeholderColor}
                    value={name}
                    onChangeText={setName}
                    autoCapitalize="words"
                    autoComplete="name"
                  />
                )}
                <TextInput
                  style={inputStyle}
                  placeholder={s.auth.email}
                  placeholderTextColor={placeholderColor}
                  value={email}
                  onChangeText={setEmail}
                  autoCapitalize="none"
                  autoComplete="email"
                  keyboardType="email-address"
                />
                <TextInput
                  style={inputStyle}
                  placeholder={s.auth.password}
                  placeholderTextColor={placeholderColor}
                  value={password}
                  onChangeText={setPassword}
                  secureTextEntry
                  autoComplete={mode === "sign-up" ? "new-password" : "current-password"}
                />
              </>
            )}

            {error ? (
              <Text style={[styles.errorText, { color: "#E07070" }]}>{error}</Text>
            ) : null}

            {/* Primary CTA */}
            <Pressable
              onPress={mode === "verify" ? handleVerify : mode === "sign-in" ? handleSignIn : handleSignUp}
              disabled={loading}
              style={[
                styles.primaryBtn,
                {
                  backgroundColor: colors.primary + "18",
                  borderColor: colors.primary + "76",
                  opacity: loading ? 0.55 : 1,
                },
              ]}
            >
              {loading ? (
                <ActivityIndicator color={colors.primary} size="small" />
              ) : (
                <Text style={[styles.primaryBtnText, { color: colors.foreground, fontFamily: df.display }]}>
                  {mode === "verify"
                    ? s.auth.verify
                    : mode === "sign-in"
                    ? s.auth.signIn
                    : s.auth.signUp}
                </Text>
              )}
            </Pressable>

            {/* Mode toggle */}
            {mode === "verify" ? (
              <Pressable onPress={() => switchMode("sign-in")} hitSlop={8}>
                <Text style={[styles.toggleText, { color: colors.muted }]}>
                  {s.auth.backToSignIn}
                </Text>
              </Pressable>
            ) : (
              <Pressable
                onPress={() => switchMode(mode === "sign-in" ? "sign-up" : "sign-in")}
                hitSlop={8}
              >
                <Text style={[styles.toggleText, { color: colors.muted }]}>
                  {mode === "sign-in" ? s.auth.noAccount : s.auth.alreadyHaveAccount}{" "}
                  <Text style={{ color: colors.primary }}>
                    {mode === "sign-in" ? s.auth.signUp : s.auth.signIn}
                  </Text>
                </Text>
              </Pressable>
            )}
          </View>
        </Animated.View>
      </KeyboardAvoidingView>
    </ScreenContainer>
  );
}

const styles = StyleSheet.create({
  kav: { flex: 1 },
  closeBtn: { alignSelf: "flex-end", paddingTop: 8, paddingBottom: 4 },
  closeText: { fontSize: 18 },
  root: { flex: 1, justifyContent: "center", gap: 32 },
  header: { alignItems: "center", gap: 12 },
  title: { fontSize: 28, letterSpacing: 4, textTransform: "uppercase", textAlign: "center" },
  benefits: { fontSize: 14, lineHeight: 22, textAlign: "center", maxWidth: 300 },
  form: { gap: 14 },
  input: {
    borderWidth: 1,
    borderRadius: 14,
    paddingHorizontal: 16,
    paddingVertical: 14,
    fontSize: 15,
    fontFamily: "System",
  },
  errorText: { fontSize: 13, textAlign: "center" },
  primaryBtn: {
    borderRadius: 22,
    borderWidth: 1.2,
    paddingVertical: 16,
    alignItems: "center",
    marginTop: 4,
  },
  primaryBtnText: { fontSize: 16, letterSpacing: 1.2, textTransform: "uppercase" },
  toggleText: { fontSize: 13, textAlign: "center" },
});
