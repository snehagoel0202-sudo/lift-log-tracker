import { useState } from "react";
import { Star } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { supabase } from "@/integrations/supabase/client";

export function FeedbackDialog({
  open,
  onOpenChange,
  title = "Send feedback",
  description = "How is LiftLog working for you?",
}: {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  title?: string;
  description?: string;
}) {
  const [rating, setRating] = useState<number | null>(null);
  const [message, setMessage] = useState("");
  const [status, setStatus] = useState<"idle" | "sending" | "sent" | "error">("idle");

  function close(next: boolean) {
    onOpenChange(next);
    if (!next) {
      setRating(null);
      setMessage("");
      setStatus("idle");
    }
  }

  async function send() {
    if (!rating) return;
    setStatus("sending");
    const { data } = await supabase.auth.getUser();
    if (!data.user) return setStatus("error");
    const { error } = await supabase.from("feedback").insert({
      user_id: data.user.id,
      rating,
      message: message.trim() ? message.trim().slice(0, 2000) : null,
      source: title === "Send feedback" ? "profile" : "workout_prompt",
    });
    setStatus(error ? "error" : "sent");
  }

  return (
    <Dialog open={open} onOpenChange={close}>
      <DialogContent className="max-w-sm">
        <DialogHeader>
          <DialogTitle>{status === "sent" ? "Thank you!" : title}</DialogTitle>
          <DialogDescription>
            {status === "sent" ? "Your feedback was sent." : description}
          </DialogDescription>
        </DialogHeader>
        {status === "sent" ? (
          <Button className="h-12" onClick={() => close(false)}>
            Done
          </Button>
        ) : (
          <div className="space-y-4">
            <div className="flex justify-between" role="radiogroup" aria-label="Rating">
              {[1, 2, 3, 4, 5].map((n) => (
                <button
                  key={n}
                  type="button"
                  role="radio"
                  aria-checked={rating === n}
                  aria-label={`${n} out of 5`}
                  onClick={() => setRating(n)}
                  className="flex h-12 w-12 items-center justify-center rounded-full"
                >
                  <Star
                    className={`h-8 w-8 ${rating && n <= rating ? "fill-primary text-primary" : "text-muted-foreground"}`}
                  />
                </button>
              ))}
            </div>
            <textarea
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              maxLength={2000}
              rows={4}
              placeholder="Anything you'd like to tell us? (optional)"
              className="w-full rounded-md border border-input bg-background p-3 text-base"
            />
            {status === "error" ? (
              <p className="text-sm text-destructive">Couldn't send that. Please try again.</p>
            ) : null}
            <div className="flex gap-2">
              <Button variant="outline" className="h-12 flex-1" onClick={() => close(false)}>
                Not now
              </Button>
              <Button
                className="h-12 flex-1"
                disabled={!rating || status === "sending"}
                onClick={send}
              >
                {status === "sending" ? "Sending…" : "Send"}
              </Button>
            </div>
          </div>
        )}
      </DialogContent>
    </Dialog>
  );
}

/** Opens a dismissable rating prompt after every 3rd saved workout. */
export function useWorkoutFeedbackPrompt() {
  const [open, setOpen] = useState(false);

  async function check() {
    const { count } = await supabase
      .from("workout_sessions")
      .select("id", { count: "exact", head: true })
      .is("deleted_at", null);
    if (count && count % 3 === 0) {
      const key = `liftlog:feedback-prompt:${count}`;
      if (localStorage.getItem(key)) return;
      localStorage.setItem(key, "1");
      setOpen(true);
    }
  }

  const dialog = (
    <FeedbackDialog
      open={open}
      onOpenChange={setOpen}
      title="How's it going?"
      description="Quick rating of LiftLog so far. You can skip this."
    />
  );
  return { check, dialog };
}
