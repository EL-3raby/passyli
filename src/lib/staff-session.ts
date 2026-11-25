import { createHmac, timingSafeEqual } from "crypto";
import { cookies } from "next/headers";

export const STAFF_COOKIE_NAME = "passyli_staff_session";

export interface StaffCookiePayload {
  venueId: string;
  venueName: string;
  secret: string;
  exp: number;
}

function getSigningSecret(): string {
  return (
    process.env.STAFF_SESSION_SECRET ||
    process.env.RESEND_API_KEY ||
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY ||
    "passyli-local-staff-signing-key"
  );
}

function signPayload(encodedPayload: string): string {
  return createHmac("sha256", getSigningSecret())
    .update(encodedPayload)
    .digest("base64url");
}

export function encodeStaffCookie(payload: StaffCookiePayload): string {
  const json = JSON.stringify(payload);
  const encoded = Buffer.from(json, "utf8").toString("base64url");
  const sig = signPayload(encoded);
  return `${encoded}.${sig}`;
}

export function decodeStaffCookie(raw: string | undefined): StaffCookiePayload | null {
  if (!raw || !raw.includes(".")) return null;
  const [encoded, sig] = raw.split(".");
  if (!encoded || !sig) return null;

  const expectedSig = signPayload(encoded);
  const a = Buffer.from(sig, "utf8");
  const b = Buffer.from(expectedSig, "utf8");
  if (a.length !== b.length || !timingSafeEqual(a, b)) {
    return null;
  }

  try {
    const parsed = JSON.parse(
      Buffer.from(encoded, "base64url").toString("utf8")
    ) as Partial<StaffCookiePayload>;
    if (
      !parsed.venueId ||
      !parsed.venueName ||
      !parsed.secret ||
      typeof parsed.exp !== "number"
    ) {
      return null;
    }
    if (Date.now() > parsed.exp) {
      return null;
    }
    return parsed as StaffCookiePayload;
  } catch {
    return null;
  }
}

export async function getStaffSessionFromCookies(): Promise<StaffCookiePayload | null> {
  const cookieStore = await cookies();
  const raw = cookieStore.get(STAFF_COOKIE_NAME)?.value;
  return decodeStaffCookie(raw);
}
