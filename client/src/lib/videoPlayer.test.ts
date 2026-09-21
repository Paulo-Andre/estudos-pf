import { describe, expect, it } from "vitest";
import { resolveLessonVideoSource } from "./videoPlayer";

describe("resolveLessonVideoSource", () => {
  it("converte links comuns do YouTube em embed sem cookies", () => {
    const source = resolveLessonVideoSource("https://www.youtube.com/watch?v=dQw4w9WgXcQ");
    expect(source).toEqual({
      kind: "youtube",
      embedUrl: "https://www.youtube-nocookie.com/embed/dQw4w9WgXcQ?rel=0&modestbranding=1&playsinline=1",
    });
  });

  it("aceita vídeos próprios diretos do armazenamento controlado", () => {
    expect(resolveLessonVideoSource("/manus-storage/aulas/direito-administrativo.mp4")).toEqual({
      kind: "direct",
      url: "/manus-storage/aulas/direito-administrativo.mp4",
    });
  });

  it("mantém fontes não suportadas fora de iframes arbitrários", () => {
    expect(resolveLessonVideoSource("https://example.org/player?id=123")).toEqual({
      kind: "unsupported",
      url: "https://example.org/player?id=123",
    });
  });
});
