import { createElement } from "react";
import { renderToStaticMarkup } from "react-dom/server";
import { describe, expect, it, vi } from "vitest";

vi.mock("@/lib/trpc", () => ({
  trpc: {
    commerce: {
      myAccesses: {
        useQuery: () => ({
          isLoading: false,
          isError: false,
          data: [
            { id: 1, courseTitle: "Curso ativo", courseTrack: "Trilha QA", courseType: "concurso", courseCoverImageUrl: null, startAt: new Date("2026-08-01T12:00:00.000Z"), expiresAt: new Date("2026-09-01T12:00:00.000Z"), computedStatus: "active", revokedAt: null },
            { id: 2, courseTitle: "Curso agendado", courseTrack: "Trilha QA", courseType: "tutorial", courseCoverImageUrl: null, startAt: new Date("2026-09-01T12:00:00.000Z"), expiresAt: new Date("2026-10-01T12:00:00.000Z"), computedStatus: "scheduled", revokedAt: null },
            { id: 3, courseTitle: "Curso vencido", courseTrack: "Trilha QA", courseType: "concurso", courseCoverImageUrl: null, startAt: new Date("2026-06-01T12:00:00.000Z"), expiresAt: new Date("2026-07-01T12:00:00.000Z"), computedStatus: "expired", revokedAt: null },
            { id: 4, courseTitle: "Curso revogado", courseTrack: "Trilha QA", courseType: "concurso", courseCoverImageUrl: null, startAt: new Date("2026-06-01T12:00:00.000Z"), expiresAt: new Date("2026-09-01T12:00:00.000Z"), computedStatus: "revoked", revokedAt: new Date("2026-08-03T12:00:00.000Z") },
          ],
          refetch: vi.fn(),
        }),
      },
    },
  },
}));

import { MyAccessesArea } from "./MyAccessesArea";

describe("MyAccessesArea", () => {
  it("apresenta os estados de matrícula em cartões que se empilham em telas pequenas", () => {
    const html = renderToStaticMarkup(createElement(MyAccessesArea, { onBuyMore: vi.fn() }));

    expect(html).toContain("Acesso ativo");
    expect(html).toContain("Acesso agendado");
    expect(html).toContain("Acesso vencido");
    expect(html).toContain("Acesso revogado");
    expect(html).toContain("sm:grid-cols-2");
    expect(html).toContain("w-full shrink-0 sm:w-auto");
  });
});
