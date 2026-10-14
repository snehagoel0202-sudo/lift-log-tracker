import { useState } from "react";
import { useNavigate } from "@tanstack/react-router";
import { useQueryClient } from "@tanstack/react-query";
import { useServerFn } from "@tanstack/react-start";
import { supabase } from "@/integrations/supabase/client";
import { deleteMyAccount } from "@/lib/account.functions";
import {
  AlertDialog,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";

export const DELETED_FLAG = "liftlog:account-deleted";

export function DeleteAccountDialog() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const deleteFn = useServerFn(deleteMyAccount);
  const [open, setOpen] = useState(false);
  const [typed, setTyped] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);

  async function confirm() {
    setBusy(true);
    setError(null);
    try {
      const result = await deleteFn();
      if (!result.ok) throw new Error();
    } catch {
      setBusy(false);
      setError("We couldn't delete your account. Nothing was removed. Please try again.");
      return;
    }
    sessionStorage.setItem(DELETED_FLAG, "1");
    await queryClient.cancelQueries();
    queryClient.clear();
    await supabase.auth.signOut({ scope: "local" });
    navigate({ to: "/", replace: true });
  }

  return (
    <AlertDialog
      open={open}
      onOpenChange={(next) => {
        if (busy) return;
        setOpen(next);
        if (!next) {
          setTyped("");
          setError(null);
        }
      }}
    >
      <AlertDialogTrigger asChild>
        <button
          type="button"
          className="min-h-12 w-full rounded-xl border border-destructive/50 px-4 font-semibold text-destructive"
        >
          Delete my account and data
        </button>
      </AlertDialogTrigger>
      <AlertDialogContent>
        <AlertDialogHeader>
          <AlertDialogTitle>Delete your account?</AlertDialogTitle>
          <AlertDialogDescription>
            This permanently deletes your account, profile, check-ins, plans and every workout you've
            logged. It cannot be undone.
          </AlertDialogDescription>
        </AlertDialogHeader>
        <label htmlFor="confirm-delete" className="text-sm font-semibold text-foreground">
          Type DELETE to confirm
        </label>
        <input
          id="confirm-delete"
          value={typed}
          onChange={(e) => setTyped(e.target.value)}
          autoComplete="off"
          autoCapitalize="characters"
          className="min-h-12 w-full rounded-xl border border-border bg-background px-4 text-foreground outline-none focus:border-destructive"
        />
        {error ? <p className="text-sm text-destructive">{error}</p> : null}
        <AlertDialogFooter>
          <AlertDialogCancel disabled={busy}>Cancel</AlertDialogCancel>
          <button
            type="button"
            disabled={typed !== "DELETE" || busy}
            onClick={confirm}
            className="min-h-12 rounded-xl bg-destructive px-5 font-semibold text-destructive-foreground disabled:opacity-40"
          >
            {busy ? "Deleting…" : "Delete permanently"}
          </button>
        </AlertDialogFooter>
      </AlertDialogContent>
    </AlertDialog>
  );
}
