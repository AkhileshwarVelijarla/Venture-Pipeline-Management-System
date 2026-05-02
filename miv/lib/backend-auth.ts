const REQUIRED_BACKEND_AUTH_SECRET = "BACKEND_AUTH_SECRET";

export function getBackendAuthSecret(
  env: Record<string, string | undefined> = process.env,
): string {
  const secret = env[REQUIRED_BACKEND_AUTH_SECRET]?.trim();

  if (!secret) {
    throw new Error(
      "BACKEND_AUTH_SECRET is required and must be set in environment variables.",
    );
  }

  return secret;
}
