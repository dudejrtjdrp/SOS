import { NextResponse } from "next/server";
import { HTTP_STATUS, type ApiErrorCode } from "@/lib/result";

/** Standard JSON error envelope for Route Handlers (docs/04 §2.2). */
export function errorResponse(
  code: ApiErrorCode,
  message: string,
  retryable = false,
) {
  return NextResponse.json(
    { error: { code, message, retryable } },
    { status: HTTP_STATUS[code] },
  );
}
