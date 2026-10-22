"use client";

import { useCallback, useState } from "react";
import {
  Download,
  FileText,
  ImageOff,
  Loader2,
  Maximize2,
  type LucideIcon,
} from "lucide-react";
import { toast } from "sonner";
import { useTranslations } from "next-intl";
import { cn } from "@/lib/utils";
import type { Message } from "@/types";
import { downloadMediaMessage } from "@/lib/media/download";
import { useMediaBlobUrl } from "@/hooks/use-media-blob-url";
import { splitLinks } from "@/lib/inbox/linkify";

/**
 * The media renderers behind `<MessageBubble>`'s image / video / audio /
 * document cases. Split out of message-bubble.tsx so that file stays a
 * thin content switch — everything here is about the two affordances
 * issue #373 asked for: open it full-size, and save it.
 *
 * Both are less trivial than they look, because the two flavours of
 * `media_url` behave differently in the browser. See
 * `@/lib/media/blob-cache` for the proxy-vs-bucket split and
 * `@/lib/media/download` for why `<a download>` alone isn't enough.
 */

type Translator = ReturnType<typeof useTranslations>;

/** Inline media size cap, shared so the four bubbles can't drift apart. */
const MEDIA_BOX = "max-h-64 max-w-60";

export function MediaUnavailable({
  label,
  t,
}: {
  label: string;
  t: Translator;
}) {
  return (
    <div className="flex items-center gap-2 rounded-lg bg-muted/40 px-3 py-2 text-xs text-muted-foreground">
      <ImageOff className="h-4 w-4 shrink-0 text-muted-foreground" />
      <span>{t("unavailable", { label })}</span>
    </div>
  );
}

/**
 * Kicks off a download and reports failure as a toast. Kept as a hook so
 * each bubble owns its own in-flight state — a slow 16 MB video shouldn't
 * put a spinner on every other attachment in the thread.
 */
function useMediaDownload(message: Message, t: Translator) {
  const [downloading, setDownloading] = useState(false);

  const download = useCallback(async () => {
    if (downloading) return;
    setDownloading(true);
    try {
      await downloadMediaMessage(message);
    } catch {
      toast.error(t("downloadFailed"));
    } finally {
      setDownloading(false);
    }
  }, [downloading, message, t]);

  return { downloading, download };
}

function MediaActionButton({
  icon: Icon,
  label,
  onClick,
  busy = false,
}: {
  icon: LucideIcon;
  label: string;
  onClick: () => void;
  busy?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={busy}
      aria-label={label}
      title={label}
      // Own surface rather than inheriting the bubble's, so the same button
      // reads on the muted inbound fill, the primary outbound fill, and on
      // top of an arbitrary photo.
      className="flex h-7 w-7 items-center justify-center rounded-full border border-border/60 bg-background/85 text-foreground shadow-sm backdrop-blur-sm transition-colors hover:bg-background disabled:opacity-60"
    >
      {busy ? (
        <Loader2 className="h-3.5 w-3.5 animate-spin" />
      ) : (
        <Icon className="h-3.5 w-3.5" />
      )}
    </button>
  );
}

function MediaPlaceholder({ children }: { children: React.ReactNode }) {
  return (
    <div className="flex h-40 w-60 items-center justify-center rounded-lg bg-muted">
      {children}
    </div>
  );
}

export function MediaImageBubble({
  message,
  onOpen,
  t,
}: {
  message: Message;
  /** Opens the thread's lightbox on this message. Omitted ⇒ not clickable. */
  onOpen?: () => void;
  t: Translator;
}) {
  const { src, status } = useMediaBlobUrl(message.media_url);
  // The fetch can succeed and the bytes still not be a decodable image.
  const [broken, setBroken] = useState(false);
  const { downloading, download } = useMediaDownload(message, t);

  if (status === "error" || broken) {
    return (
      <MediaPlaceholder>
        <ImageOff className="h-8 w-8 text-muted-foreground" />
      </MediaPlaceholder>
    );
  }

  if (status !== "ready" || !src) {
    return (
      <MediaPlaceholder>
        <div className="h-5 w-5 animate-spin rounded-full border-2 border-primary border-t-transparent" />
      </MediaPlaceholder>
    );
  }

  const image = (
    // eslint-disable-next-line @next/next/no-img-element
    <img
      src={src}
      alt={t("imageAlt")}
      className={cn(MEDIA_BOX, "rounded-lg object-contain")}
      onError={() => setBroken(true)}
    />
  );

  return (
    <div className="group/media relative w-fit">
      {onOpen ? (
        <button
          type="button"
          onClick={onOpen}
          aria-label={t("viewImage")}
          className="block cursor-zoom-in rounded-lg outline-none ring-offset-2 ring-offset-transparent focus-visible:ring-2 focus-visible:ring-ring"
        >
          {image}
        </button>
      ) : (
        image
      )}
      {/* Hover-only: on touch there is no hover, but tapping the image opens
          the viewer, which carries a full-size Download button. */}
      <div className="absolute bottom-2 right-2 opacity-0 transition-opacity group-hover/media:opacity-100 group-focus-within/media:opacity-100">
        <MediaActionButton
          icon={Download}
          label={t("download")}
          onClick={download}
          busy={downloading}
        />
      </div>
    </div>
  );
}

export function MediaVideoBubble({
  message,
  onOpen,
  t,
}: {
  message: Message;
  onOpen?: () => void;
  t: Translator;
}) {
  const { downloading, download } = useMediaDownload(message, t);

  return (
    <div className="relative w-fit">
      {/* Plain URL, not a blob: the element should stream rather than wait
          for up to 16 MB to land. */}
      <video
        src={message.media_url}
        controls
        preload="metadata"
        className={cn(MEDIA_BOX, "rounded-lg")}
      />
      {/* Top-right, clear of the native controls — and always visible, since
          expanding is the only way to watch a clip capped at 15rem wide and
          a touch device gets no hover. */}
      <div className="absolute right-2 top-2 flex gap-1">
        {onOpen && (
          <MediaActionButton
            icon={Maximize2}
            label={t("expandVideo")}
            onClick={onOpen}
          />
        )}
        <MediaActionButton
          icon={Download}
          label={t("download")}
          onClick={download}
          busy={downloading}
        />
      </div>
    </div>
  );
}

export function MediaAudioBubble({
  message,
  t,
}: {
  message: Message;
  t: Translator;
}) {
  const { downloading, download } = useMediaDownload(message, t);

  return (
    <div className="flex items-center gap-2">
      <audio src={message.media_url} controls className="max-w-60" />
      <MediaActionButton
        icon={Download}
        label={t("download")}
        onClick={download}
        busy={downloading}
      />
    </div>
  );
}

/** Last path segment of a media URL, decoded, without the query string. */
export function fileNameFromUrl(url: string | undefined | null): string | null {
  if (!url) return null;
  try {
    const path = new URL(url, "http://x").pathname;
    const last = path.split("/").filter(Boolean).pop() ?? "";
    const name = decodeURIComponent(last).trim();
    // Only a segment with an extension is a filename; "invoice-pdf" or an
    // opaque id is just a route and must not be shown as the title.
    return /\.[a-z0-9]{1,5}$/i.test(name) ? name : null;
  } catch {
    return null;
  }
}

const KNOWN_KINDS = ["pdf", "docx", "doc", "xlsx", "xls", "csv", "stl", "3mf", "obj", "step", "stp", "zip", "png", "jpg"];

function fileKind(
  name: string | null,
  mime: string | null | undefined,
  url: string | null | undefined,
): string {
  const ext = name?.includes(".") ? name.split(".").pop() : undefined;
  if (ext && ext.length <= 5) return ext.toUpperCase();
  if (mime?.includes("pdf")) return "PDF";
  if (mime?.includes("/")) return mime.split("/").pop()!.toUpperCase().slice(0, 5);
  // No filename or MIME (outbound via API): sniff the route, e.g. "/invoice-pdf".
  const path = (url ?? "").split("?")[0].toLowerCase();
  const hit = KNOWN_KINDS.find((k) => new RegExp(`[-_/.]${k}(?:[-_/]|$)`).test(path));
  return hit ? hit.toUpperCase() : "FILE";
}

function kindTint(kind: string): string {
  if (kind === "PDF") return "bg-red-500 text-white";
  if (["DOC", "DOCX"].includes(kind)) return "bg-sky-600 text-white";
  if (["XLS", "XLSX", "CSV"].includes(kind)) return "bg-emerald-600 text-white";
  if (["STL", "3MF", "OBJ", "STEP", "STP"].includes(kind)) return "bg-violet-600 text-white";
  return "bg-background/70 text-foreground";
}

/**
 * WhatsApp-style file card: icon badge, file name, kind, download — and
 * the caption (if any) underneath, with links clickable. The name comes
 * from the media URL so a caption in `content_text` never hides it.
 */
export function MediaDocumentBubble({
  message,
  t,
}: {
  message: Message;
  t: Translator;
}) {
  const { downloading, download } = useMediaDownload(message, t);
  const name = fileNameFromUrl(message.media_url);
  const kind = fileKind(name, message.media_type, message.media_url);
  const captionText = message.content_text?.trim() || null;
  // Title: real filename if we have one, else the caption doubles as the
  // title (WhatsApp shows the filename there; our API sends only carry a
  // caption). The caption is repeated below only when it is distinct.
  const title = name ?? captionText ?? t("document");
  const caption = captionText && captionText !== title ? captionText : null;

  return (
    <div className="flex w-full min-w-0 flex-col gap-2">
      <div className="flex min-w-0 items-center gap-2 rounded-xl bg-black/15 p-2 pr-2.5">
        <a
          href={message.media_url}
          target="_blank"
          rel="noopener noreferrer"
          className="flex min-w-0 flex-1 items-center gap-3 rounded-lg hover:opacity-90"
        >
          <span
            className={cn(
              "flex h-10 w-10 shrink-0 items-center justify-center rounded-lg",
              kindTint(kind),
            )}
          >
            <FileText className="h-5 w-5" />
          </span>
          <span className="min-w-0 flex-1">
            <span className="line-clamp-2 break-words text-sm font-medium leading-tight">
              {title}
            </span>
            <span className="mt-0.5 block text-xs opacity-75">{kind}</span>
          </span>
        </a>
        <MediaActionButton
          icon={Download}
          label={t("download")}
          onClick={download}
          busy={downloading}
        />
      </div>
      {caption && (
        <p className="whitespace-pre-wrap break-words text-sm">
          {splitLinks(caption).map((seg, i) =>
            seg.type === "link" ? (
              <a
                key={i}
                href={seg.href}
                target="_blank"
                rel="noopener noreferrer nofollow"
                className="underline underline-offset-2 break-all hover:opacity-80"
              >
                {seg.value}
              </a>
            ) : (
              <span key={i}>{seg.value}</span>
            ),
          )}
        </p>
      )}
    </div>
  );
}
