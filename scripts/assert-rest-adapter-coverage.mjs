import { readdir, readFile, stat } from "node:fs/promises";
import { join } from "node:path";

async function walk(dir) {
  const result = [];
  for (const name of await readdir(dir)) {
    const path = join(dir,name);
    const info = await stat(path);
    if (info.isDirectory()) result.push(...await walk(path));
    else if (/\.(ts|tsx)$/.test(path)) result.push(path);
  }
  return result;
}

const adapterPath="client/src/lib/trpc.ts";
const adapter=await readFile(adapterPath,"utf8");
const mapped=new Set([...adapter.matchAll(/case\s+"([^"]+)"/g)].map(match => match[1]));
const used=new Set();

for (const path of await walk("client/src")) {
  if (path===adapterPath) continue;
  const raw=await readFile(path,"utf8");
  const source=raw
    .replace(/\/\*[\s\S]*?\*\//g,"")
    .replace(/(^|\s)\/\/.*$/gm,"$1");
  const regex=/trpc((?:\.[A-Za-z_][A-Za-z0-9_]*){1,8})\.(useQuery|useMutation)/g;
  let match;
  while ((match=regex.exec(source))) used.add(match[1].slice(1));
}

const missing=[...used].filter(path => !mapped.has(path)).sort();
if (missing.length) {
  console.error("Frontend procedures without REST mapping:");
  for (const path of missing) console.error(" -",path);
  process.exit(1);
}
console.log("REST adapter covers all frontend query/mutation procedures:",used.size);
