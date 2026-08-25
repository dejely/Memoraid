export type AuthErrorKind =
  | "configuration"
  | "invalid-session"
  | "network"
  | "rate-limit"
  | "validation"
  | "unknown";

export class MemoraidAuthError extends Error {
  readonly kind: AuthErrorKind;
  readonly retryable: boolean;
  readonly cause?: unknown;

  constructor(
    kind: AuthErrorKind,
    message: string,
    options: { retryable?: boolean; cause?: unknown } = {},
  ) {
    super(message);
    this.name = "MemoraidAuthError";
    this.kind = kind;
    this.retryable = options.retryable ?? false;
    this.cause = options.cause;
  }
}

function getErrorDetails(error: unknown): { message: string; code: string; status: number | null } {
  if (!error || typeof error !== "object") {
    return {
      message: typeof error === "string" ? error : "",
      code: "",
      status: null,
    };
  }

  const candidate = error as { message?: unknown; code?: unknown; status?: unknown; name?: unknown };
  const message = typeof candidate.message === "string" ? candidate.message : "";
  const code = typeof candidate.code === "string" ? candidate.code : "";
  const name = typeof candidate.name === "string" ? candidate.name : "";

  return {
    message,
    code: `${code} ${name}`.trim(),
    status: typeof candidate.status === "number" ? candidate.status : null,
  };
}

export function toMemoraidAuthError(
  error: unknown,
  fallbackMessage = "Authentication could not be completed.",
): MemoraidAuthError {
  if (error instanceof MemoraidAuthError) {
    return error;
  }

  const details = getErrorDetails(error);
  const searchable = `${details.code} ${details.message}`.toLowerCase();

  if (
    searchable.includes("fetch") ||
    searchable.includes("network") ||
    searchable.includes("offline") ||
    searchable.includes("timeout") ||
    searchable.includes("connection")
  ) {
    return new MemoraidAuthError(
      "network",
      "Memoraid could not reach the sign-in service. Check your connection and try again.",
      { retryable: true, cause: error },
    );
  }

  if (
    searchable.includes("refresh_token") ||
    searchable.includes("refresh token") ||
    searchable.includes("otp_expired") ||
    searchable.includes("otp expired") ||
    searchable.includes("token expired") ||
    searchable.includes("invalid otp") ||
    searchable.includes("invalid token") ||
    searchable.includes("code verifier") ||
    searchable.includes("bad_code_verifier") ||
    searchable.includes("flow state")
  ) {
    return new MemoraidAuthError(
      "invalid-session",
      "This sign-in link or session is no longer valid. Request a fresh magic link to continue.",
      { retryable: true, cause: error },
    );
  }

  if (details.status === 429 || searchable.includes("rate limit") || searchable.includes("too many requests")) {
    return new MemoraidAuthError(
      "rate-limit",
      "Too many sign-in attempts were made. Wait a moment, then request another magic link.",
      { retryable: true, cause: error },
    );
  }

  return new MemoraidAuthError("unknown", details.message || fallbackMessage, {
    retryable: true,
    cause: error,
  });
}
