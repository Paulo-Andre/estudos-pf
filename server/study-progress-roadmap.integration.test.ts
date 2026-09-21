import { appRouter } from "./routers";
import { deleteStudyContentProgressByScope, getUserByUsername } from "./db";
import type { TrpcContext } from "./_core/context";
import { describe, expect, it } from "vitest";

describe("continuidade e roteiro semanal", () => {
  it("registra a abertura de uma aula e organiza disciplinas no mesmo dia para a conta ROOT", async () => {
    const root = await getUserByUsername("paulo");
    expect(root).toMatchObject({ username: "paulo", role: "admin" });
    if (!root) return;

    const context: TrpcContext = {
      user: root,
      req: { protocol: "https", headers: {} } as TrpcContext["req"],
      res: {} as TrpcContext["res"],
    };
    const caller = appRouter.createCaller(context);
    const courseId = "pf-agente";
    const initial = await caller.study.contentProgress.get({ courseId });
    const content = initial.contents[0];
    expect(content).toBeTruthy();
    if (!content) return;
    const roadmapIds: number[] = [];

    try {
      const opened = await caller.study.contentProgress.open({ courseId, contentId: content.id });
      expect(opened.continueItem).toMatchObject({ id: content.id, progress: { status: "started" } });

      const roadmap = await caller.study.roadmap.save({ courseId, disciplineId: content.disciplineId, weekday: 2, isActive: true });
      const item = roadmap.find(entry => entry.disciplineId === content.disciplineId);
      expect(item).toMatchObject({ weekday: 2, disciplineId: content.disciplineId, disciplineName: content.disciplineName, content: { id: content.id } });
      if (item) roadmapIds.push(item.id);

      const anotherDiscipline = initial.contents.find(entry => entry.disciplineId !== content.disciplineId);
      if (anotherDiscipline) {
        const expandedRoadmap = await caller.study.roadmap.save({ courseId, disciplineId: anotherDiscipline.disciplineId, weekday: 2, isActive: true });
        const sameDay = expandedRoadmap.filter(entry => entry.weekday === 2);
        expect(sameDay.some(entry => entry.disciplineId === content.disciplineId)).toBe(true);
        expect(sameDay.some(entry => entry.disciplineId === anotherDiscipline.disciplineId)).toBe(true);
        const secondItem = expandedRoadmap.find(entry => entry.disciplineId === anotherDiscipline.disciplineId);
        if (secondItem) roadmapIds.push(secondItem.id);
      }
    } finally {
      await Promise.all(roadmapIds.map(id => caller.study.roadmap.remove({ id })));
      await deleteStudyContentProgressByScope(root.id, courseId, content.id);
    }
  });
});
