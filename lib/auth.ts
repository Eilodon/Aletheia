import { insforge } from "@/lib/services/insforge-client";

export type User = {
  id: string;
  email: string | null;
  name: string | null;
};

export async function getUserInfo(): Promise<User | null> {
  try {
    const { data, error } = await insforge.auth.getCurrentUser();
    if (error || !data?.user) return null;
    return {
      id: data.user.id,
      email: (data.user as { email?: string }).email ?? null,
      name: (data.user as { name?: string }).name ?? null,
    };
  } catch {
    return null;
  }
}

export async function signIn(email: string, password: string): Promise<User> {
  const { data, error } = await insforge.auth.signInWithPassword({ email, password });
  if (error) throw new Error((error as { message?: string }).message ?? "Sign in failed");
  if (!data?.user) throw new Error("Sign in failed");
  return {
    id: data.user.id,
    email: (data.user as { email?: string }).email ?? null,
    name: (data.user as { name?: string }).name ?? null,
  };
}

export async function signUp(
  email: string,
  password: string,
  name?: string,
): Promise<{ requireEmailVerification: boolean }> {
  const { data, error } = await insforge.auth.signUp({ email, password, name });
  if (error) throw new Error((error as { message?: string }).message ?? "Sign up failed");
  return {
    requireEmailVerification:
      (data as { requireEmailVerification?: boolean })?.requireEmailVerification ?? false,
  };
}

export async function verifyEmail(email: string, otp: string): Promise<User> {
  const { data, error } = await insforge.auth.verifyEmail({ email, otp });
  if (error) throw new Error((error as { message?: string }).message ?? "Verification failed");
  const user = (data as { user?: { id: string; email?: string; name?: string } }).user;
  if (!user) throw new Error("Verification failed");
  return { id: user.id, email: user.email ?? null, name: user.name ?? null };
}

export async function signOut(): Promise<void> {
  await insforge.auth.signOut();
}

// Legacy stubs — InsForge manages sessions internally
export async function getSessionToken(): Promise<string | null> { return null; }
export async function setSessionToken(_token: string): Promise<void> {}
export async function removeSessionToken(): Promise<void> {}
export async function setUserInfo(_user: User): Promise<void> {}
export async function clearUserInfo(): Promise<void> { await signOut(); }
