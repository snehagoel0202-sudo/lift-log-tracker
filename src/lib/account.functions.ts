import { createServerFn } from "@tanstack/react-start";
import { requireSupabaseAuth } from "@/integrations/supabase/auth-middleware";

/**
 * Permanently deletes the signed-in user's own account and all their data.
 * The ONE exception to the soft-delete rule. Acts only on context.userId — never takes an id as input.
 */
export const deleteMyAccount = createServerFn({ method: "POST" })
  .middleware([requireSupabaseAuth])
  .handler(async ({ context }) => {
    const { supabaseAdmin } = await import("@/integrations/supabase/client.server");
    const { error } = await supabaseAdmin.rpc("delete_account_permanently", {
      _user_id: context.userId,
    });
    if (error) {
      // No user id, email or health data in logs.
      console.error("[account] deletion failed", error.code);
      return { ok: false as const };
    }
    return { ok: true as const };
  });
