export type LessonVideoSource =
  | { kind: "youtube"; embedUrl: string }
  | { kind: "direct"; url: string }
  | { kind: "unsupported"; url: string };

const DIRECT_VIDEO_EXTENSION = /\.(mp4|webm|ogv)(?:[?#].*)?$/i;

function youtubeIdFromUrl(rawUrl: string) {
  try {
    const url = new URL(rawUrl.trim());
    const host = url.hostname.replace(/^www\./, "").toLowerCase();

    if (host === "youtu.be") return url.pathname.split("/").filter(Boolean)[0] ?? null;
    if (host === "youtube.com" || host.endsWith(".youtube.com")) {
      if (url.pathname === "/watch") return url.searchParams.get("v");
      const segments = url.pathname.split("/").filter(Boolean);
      if (["embed", "shorts", "live"].includes(segments[0] ?? "")) return segments[1] ?? null;
    }
  } catch {
    return null;
  }
  return null;
}

export function resolveLessonVideoSource(rawUrl: string): LessonVideoSource {
  const url = rawUrl.trim();
  const youtubeId = youtubeIdFromUrl(url);
  if (youtubeId && /^[A-Za-z0-9_-]{6,}$/.test(youtubeId)) {
    return {
      kind: "youtube",
      embedUrl: `https://www.youtube-nocookie.com/embed/${youtubeId}?rel=0&modestbranding=1&playsinline=1`,
    };
  }

  if (/^\/manus-storage\//.test(url) || DIRECT_VIDEO_EXTENSION.test(url)) return { kind: "direct", url };
  return { kind: "unsupported", url };
}
