export type ApiErrorCode =
  | "UNAUTHENTICATED"
  | "FORBIDDEN"
  | "NOT_FOUND"
  | "VALIDATION"
  | "RATE_LIMITED"
  | "BUDGET_EXCEEDED"
  | "PROVIDER_ERROR"
  | "INTERNAL";

export interface ApiError {
  code: ApiErrorCode;
  message: string;
  retryable?: boolean;
}

export type Result<T = void> =
  | { ok: true; data: T }
  | { ok: false; error: ApiError };

export const ok = <T>(data: T): Result<T> => ({ ok: true, data });
export const fail = (
  code: ApiErrorCode,
  message: string,
  retryable = false,
): Result<never> => ({ ok: false, error: { code, message, retryable } });

export const HTTP_STATUS: Record<ApiErrorCode, number> = {
  UNAUTHENTICATED: 401,
  FORBIDDEN: 403,
  NOT_FOUND: 404,
  VALIDATION: 422,
  RATE_LIMITED: 429,
  BUDGET_EXCEEDED: 402,
  PROVIDER_ERROR: 502,
  INTERNAL: 500,
};
