import { useState } from "react";
import { embedUrl, videoForExercise } from "@/lib/exercise-videos";

export function DemoVideo({ exerciseName }: { exerciseName: string | null | undefined }) {
  const [open, setOpen] = useState(false);
  const video = videoForExercise(exerciseName);
  if (!video) return null;

  return (
    <div className="mt-3">
      <button
        type="button"
        onClick={() => setOpen((value) => !value)}
        aria-expanded={open}
        className="inline-flex min-h-11 items-center gap-2 rounded-xl border border-border px-3 text-sm font-semibold text-foreground"
      >
        <svg viewBox="0 0 24 24" aria-hidden="true" className="h-4 w-4 fill-primary">
          <path d="M8 5v14l11-7z" />
        </svg>
        {open ? "Hide demo" : `Watch demo · ${video.length}`}
      </button>

      {open ? (
        <div className="mt-3">
          <div className="overflow-hidden rounded-xl border border-border bg-background">
            <iframe
              src={embedUrl(video)}
              title={video.title}
              loading="lazy"
              allow="accelerometer; encrypted-media; gyroscope; picture-in-picture; fullscreen"
              allowFullScreen
              className="aspect-video w-full"
            />
          </div>
          <p className="mt-2 text-xs text-muted-foreground">
            “{video.title}” — video by{" "}
            <a
              href={video.channelUrl}
              target="_blank"
              rel="noopener noreferrer"
              className="underline"
            >
              {video.channel}
            </a>{" "}
            on YouTube.
          </p>
        </div>
      ) : null}
    </div>
  );
}
