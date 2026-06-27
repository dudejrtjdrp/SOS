import "server-only";
import { createHash, createHmac } from "node:crypto";

/**
 * Minimal Cloudflare R2 (S3-compatible) client — zero dependencies, just AWS
 * Signature V4 over node:crypto. Used to store 공고문 files/images.
 *
 *   PUT  : server-to-R2 upload with a signed Authorization header (no bucket
 *          CORS needed — the browser never talks to R2 directly).
 *   GET  : a short-lived presigned URL the browser can load in <img>/<a>
 *          without exposing credentials (works on a private bucket).
 *
 * Configure via .env (see .env.example):
 *   R2_ACCOUNT_ID, R2_ACCESS_KEY_ID, R2_SECRET_ACCESS_KEY, R2_BUCKET
 * Optional: R2_PUBLIC_BASE_URL (public bucket/custom domain → skip presigning).
 */

const REGION = "auto";
const SERVICE = "s3";

interface R2Config {
  accountId: string;
  accessKeyId: string;
  secretAccessKey: string;
  bucket: string;
  host: string;
  publicBase?: string;
}

function cfg(): R2Config | null {
  // Tolerate a pasted scheme/endpoint in R2_ACCOUNT_ID (e.g. copying the full
  // "https://<id>.r2.cloudflarestorage.com" S3 endpoint). Without this the host
  // becomes "https://https://…" and fetch fails with ENOTFOUND "https".
  const accountId = (process.env.R2_ACCOUNT_ID ?? "")
    .trim()
    .replace(/^https?:\/\//i, "")
    .replace(/\/.*$/, "")
    .replace(/\.r2\.cloudflarestorage\.com$/i, "");
  const accessKeyId = process.env.R2_ACCESS_KEY_ID?.trim();
  const secretAccessKey = process.env.R2_SECRET_ACCESS_KEY?.trim();
  const bucket = process.env.R2_BUCKET?.trim();
  if (!accountId || !accessKeyId || !secretAccessKey || !bucket) return null;
  return {
    accountId,
    accessKeyId,
    secretAccessKey,
    bucket,
    host: `${accountId}.r2.cloudflarestorage.com`,
    publicBase: process.env.R2_PUBLIC_BASE_URL?.trim().replace(/\/$/, ""),
  };
}

export function r2Configured(): boolean {
  return cfg() !== null;
}

/** Names of the required R2 env vars that are currently unset (for diagnostics). */
export function missingR2Vars(): string[] {
  return (["R2_ACCOUNT_ID", "R2_ACCESS_KEY_ID", "R2_SECRET_ACCESS_KEY", "R2_BUCKET"] as const)
    .filter((k) => !process.env[k]);
}

const sha256hex = (data: string | Buffer) => createHash("sha256").update(data).digest("hex");
const hmac = (key: Buffer | string, data: string) => createHmac("sha256", key).update(data).digest();

/** RFC-3986 encoding for a single path segment / query value (AWS-strict). */
function enc(s: string): string {
  return encodeURIComponent(s).replace(
    /[!'()*]/g,
    (c) => "%" + c.charCodeAt(0).toString(16).toUpperCase(),
  );
}

function encodeKey(key: string): string {
  return key.split("/").map(enc).join("/");
}

function amzStamps(d = new Date()): { amzDate: string; dateStamp: string } {
  const amzDate = d.toISOString().replace(/[:-]|\.\d{3}/g, "").replace(/(\d{8})(\d{6})Z?$/, "$1T$2Z");
  return { amzDate, dateStamp: amzDate.slice(0, 8) };
}

function signingKey(secret: string, dateStamp: string): Buffer {
  const kDate = hmac("AWS4" + secret, dateStamp);
  const kRegion = hmac(kDate, REGION);
  const kService = hmac(kRegion, SERVICE);
  return hmac(kService, "aws4_request");
}

/** Upload an object (server → R2). Throws on non-2xx. */
export async function putObject(
  key: string,
  body: Buffer | Uint8Array,
  contentType: string,
): Promise<void> {
  const c = cfg();
  if (!c) throw new Error("R2가 설정되지 않았습니다. .env의 R2_* 값을 채워주세요.");

  const buf = Buffer.isBuffer(body) ? body : Buffer.from(body);
  const { amzDate, dateStamp } = amzStamps();
  const payloadHash = sha256hex(buf);
  const canonicalUri = `/${c.bucket}/${encodeKey(key)}`;
  const ct = contentType || "application/octet-stream";

  const canonicalHeaders =
    `content-type:${ct}\n` +
    `host:${c.host}\n` +
    `x-amz-content-sha256:${payloadHash}\n` +
    `x-amz-date:${amzDate}\n`;
  const signedHeaders = "content-type;host;x-amz-content-sha256;x-amz-date";

  const canonicalRequest = [
    "PUT",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");

  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256hex(canonicalRequest),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(c.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest("hex");

  const authorization =
    `AWS4-HMAC-SHA256 Credential=${c.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  const res = await fetch(`https://${c.host}${canonicalUri}`, {
    method: "PUT",
    headers: {
      "content-type": ct,
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      authorization,
    },
    body: new Uint8Array(buf),
  });
  if (!res.ok) {
    const text = await res.text().catch(() => "");
    throw new Error(`R2 업로드 실패 (${res.status}) ${text.slice(0, 200)}`);
  }
}

/** Presigned GET URL for display/download. Returns null if R2 is unconfigured. */
export function presignGetUrl(key: string, expiresSec = 3600): string | null {
  const c = cfg();
  if (!c) return null;
  if (c.publicBase) return `${c.publicBase}/${encodeKey(key)}`;

  const { amzDate, dateStamp } = amzStamps();
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const canonicalUri = `/${c.bucket}/${encodeKey(key)}`;

  const params: Record<string, string> = {
    "X-Amz-Algorithm": "AWS4-HMAC-SHA256",
    "X-Amz-Credential": `${c.accessKeyId}/${scope}`,
    "X-Amz-Date": amzDate,
    "X-Amz-Expires": String(expiresSec),
    "X-Amz-SignedHeaders": "host",
  };
  const canonicalQuery = Object.keys(params)
    .sort()
    .map((k) => `${enc(k)}=${enc(params[k])}`)
    .join("&");

  const canonicalRequest = [
    "GET",
    canonicalUri,
    canonicalQuery,
    `host:${c.host}\n`,
    "host",
    "UNSIGNED-PAYLOAD",
  ].join("\n");

  const stringToSign = [
    "AWS4-HMAC-SHA256",
    amzDate,
    scope,
    sha256hex(canonicalRequest),
  ].join("\n");
  const signature = createHmac("sha256", signingKey(c.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest("hex");

  return `https://${c.host}${canonicalUri}?${canonicalQuery}&X-Amz-Signature=${signature}`;
}

/**
 * Fetch an object server-side for the same-origin file proxy (used by the 공고문
 * 한글 뷰어, which needs the raw bytes without a cross-origin request to R2).
 * Returns the upstream response (body stream + headers) or null if R2 is
 * unconfigured or the object is missing.
 */
export async function getObject(key: string): Promise<Response | null> {
  const url = presignGetUrl(key);
  if (!url) return null;
  const res = await fetch(url);
  if (!res.ok) return null;
  return res;
}

/** Best-effort delete (used when a 공고문 attachment is removed). */
export async function deleteObject(key: string): Promise<void> {
  const c = cfg();
  if (!c) return;

  const { amzDate, dateStamp } = amzStamps();
  const payloadHash = sha256hex("");
  const canonicalUri = `/${c.bucket}/${encodeKey(key)}`;
  const canonicalHeaders =
    `host:${c.host}\n` + `x-amz-content-sha256:${payloadHash}\n` + `x-amz-date:${amzDate}\n`;
  const signedHeaders = "host;x-amz-content-sha256;x-amz-date";
  const canonicalRequest = [
    "DELETE",
    canonicalUri,
    "",
    canonicalHeaders,
    signedHeaders,
    payloadHash,
  ].join("\n");
  const scope = `${dateStamp}/${REGION}/${SERVICE}/aws4_request`;
  const stringToSign = ["AWS4-HMAC-SHA256", amzDate, scope, sha256hex(canonicalRequest)].join("\n");
  const signature = createHmac("sha256", signingKey(c.secretAccessKey, dateStamp))
    .update(stringToSign)
    .digest("hex");
  const authorization =
    `AWS4-HMAC-SHA256 Credential=${c.accessKeyId}/${scope}, ` +
    `SignedHeaders=${signedHeaders}, Signature=${signature}`;

  await fetch(`https://${c.host}${canonicalUri}`, {
    method: "DELETE",
    headers: {
      "x-amz-content-sha256": payloadHash,
      "x-amz-date": amzDate,
      authorization,
    },
  }).catch(() => {});
}
