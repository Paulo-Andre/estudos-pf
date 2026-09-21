import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

const root = "dist/public";
const sentinels = [
  "Nesta aula, compreensão significa recuperar o conteúdo afirmado pelo texto com fidelidade.",
  "COMECE PELO QUE O TEXTO DIZ. Compreensão é recuperar uma informação expressa",
  "Descentralização transfere a execução para outra pessoa jurídica",
];

async function files(dir) {
  const output = [];
  for (const name of await readdir(dir)) {
    const path = join(dir, name);
    const info = await stat(path);
    if (info.isDirectory()) output.push(...await files(path));
    else output.push(path);
  }
  return output;
}

for (const path of await files(root)) {
  const text = (await readFile(path)).toString("utf8");
  for (const sentinel of sentinels) {
    if (text.includes(sentinel)) {
      console.error("Protected study content leaked into public build:", path);
      process.exit(1);
    }
  }
}
console.log("Public build contains no protected study sentinels.");
