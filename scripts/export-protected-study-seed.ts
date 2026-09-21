import { mkdir, writeFile } from "node:fs/promises";
import { dirname, resolve } from "node:path";
import { completeStudyModules } from "../client/src/data/pfCompleteStudyData";
import { apostilaByModule } from "../client/src/data/pfApostilaData";
import { specialLegislationModules, specialApostilaByModule } from "../client/src/data/pfSpecialLegislationModules";
import { questionBank, blocks } from "../client/src/data/pfStudyData";
import { activeContestId, contestCatalog, disciplineCatalog } from "../client/src/data/pfCurriculumCatalog";

const output = resolve(process.argv[2] || "tmp/protected-study-seed.json");
const payload = {
  version: 1,
  generatedAt: new Date().toISOString(),
  activeContestId,
  blocks,
  contestCatalog,
  disciplineCatalog,
  modules: [...completeStudyModules, ...specialLegislationModules],
  chapters: { ...apostilaByModule, ...specialApostilaByModule },
  questions: questionBank,
};

await mkdir(dirname(output), { recursive: true });
await writeFile(output, JSON.stringify(payload));
console.log(JSON.stringify({
  output,
  modules: payload.modules.length,
  chapters: Object.keys(payload.chapters).length,
  questions: payload.questions.length,
  contests: payload.contestCatalog.length,
  disciplines: payload.disciplineCatalog.length,
}));
