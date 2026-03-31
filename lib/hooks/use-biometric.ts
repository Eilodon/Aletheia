import * as LocalAuthentication from "expo-local-authentication";
import { useState, useCallback } from "react";

export type BiometricType = "fingerprint" | "facial" | "iris" | "none";

export interface BiometricResult {
  success: boolean;
  error?: string;
}

export interface BiometricAvailability {
  compatible: boolean;
  biometricType: BiometricType;
  hasHardware: boolean;
  isEnrolled: boolean;
}

export function useBiometric() {
  const [isAuthenticating, setIsAuthenticating] = useState(false);

  const checkAvailability = useCallback(async (): Promise<BiometricAvailability> => {
    const compatible = await LocalAuthentication.hasHardwareAsync();
    const biometricType = await LocalAuthentication.supportedAuthenticationTypesAsync();
    const isEnrolled = await LocalAuthentication.isEnrolledAsync();

    let type: BiometricType = "none";
    if (biometricType.includes(LocalAuthentication.AuthenticationType.FACIAL_RECOGNITION)) {
      type = "facial";
    } else if (biometricType.includes(LocalAuthentication.AuthenticationType.FINGERPRINT)) {
      type = "fingerprint";
    }

    return {
      compatible,
      biometricType: type,
      hasHardware: compatible,
      isEnrolled,
    };
  }, []);

  const authenticate = useCallback(
    async (promptMessage: string = "Authenticate to access Aletheia"): Promise<BiometricResult> => {
      setIsAuthenticating(true);

      try {
        const result = await LocalAuthentication.authenticateAsync({
          promptMessage,
        });

        if (result.success) {
          return { success: true };
        }

        return {
          success: false,
          error: result.error || "Authentication failed",
        };
      } catch (err) {
        return {
          success: false,
          error: err instanceof Error ? err.message : "Unknown error",
        };
      } finally {
        setIsAuthenticating(false);
      }
    },
    []
  );

  return {
    checkAvailability,
    authenticate,
    isAuthenticating,
  };
}
