/** Returns `next` only if it is an internal path; otherwise `fallback`. Prevents open redirects. */
export function safeRedirectPath(
  next: string | null | undefined,
  fallback = "/",
): string {
  if (!next || !next.startsWith("/") || next.startsWith("//")) return fallback;
  if (next.includes("\\") || /[\u0000-\u001f]/.test(next)) return fallback;
  return next;
}
