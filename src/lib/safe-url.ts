/**
 * Accept only URL schemes that are safe for user-controlled navigation.
 * Relative URLs are allowed for same-origin links; external URLs must use HTTPS.
 */
export function toSafeUrl(value: string | null | undefined): string | undefined {
  if (!value) return undefined;

  const trimmed = value.trim();
  if (!trimmed) return undefined;

  try {
    const parsed = new URL(trimmed, window.location.origin);
    if (parsed.protocol !== "https:" && parsed.protocol !== "mailto:") {
      return undefined;
    }

    return parsed.href;
  } catch {
    return undefined;
  }
}
