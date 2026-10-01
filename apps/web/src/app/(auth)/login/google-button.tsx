import { signInWithGoogle } from "../actions";
import { T } from "@/components/i18n-provider";

/** Shown only when the Google provider is configured in Supabase. */
export function GoogleButton({ next }: { next?: string }) {
  if (process.env.NEXT_PUBLIC_GOOGLE_AUTH_ENABLED !== "true") return null;
  return (
    <form action={signInWithGoogle} className="mt-4">
      <input type="hidden" name="next" value={next ?? "/"} />
      <button type="submit" className="w-full rounded-md border border-neutral-300 px-4 py-2 font-medium dark:border-neutral-700">
        <T id="auth.continueGoogle" />
      </button>
    </form>
  );
}
