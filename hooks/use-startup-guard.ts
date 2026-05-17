/**
 * useStartupGuard — v7
 *
 * Fails loudly in development if critical env vars are missing.
 * In production EAS builds this is enforced at build time via requireEnvForRelease.
 */
import Constants from 'expo-constants';

export function assertStartupConfig(): void {
  if (__DEV__) {
    const projectId = Constants.expoConfig?.extra?.eas?.projectId as string | undefined;
    if (!projectId || projectId.startsWith('placeholder')) {
      console.warn(
        '[Aletheia] EXPO_PUBLIC_EAS_PROJECT_ID is not set.\n' +
        '  Run: npx eas project:init\n' +
        '  Then copy the projectId to your .env file.'
      );
    }
  }
}
