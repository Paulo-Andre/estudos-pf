#!/usr/bin/env node

import { cp, lstat, mkdir, rm, writeFile } from "node:fs/promises";
import { execFileSync } from "node:child_process";
import { basename, dirname, resolve } from "node:path";
import { fileURLToPath } from "node:url";

const sourceDirectory = resolve(dirname(fileURLToPath(import.meta.url)), "..");
const defaultDestination = resolve(
  sourceDirectory,
  "..",
  `${basename(sourceDirectory)}-laboratorio`
);
const commandArguments = process.argv.slice(2);
const suppliedDestination = commandArguments.find(
  argument => !argument.startsWith("-")
);
const destinationDirectory = resolve(suppliedDestination ?? defaultDestination);
const force = commandArguments.includes("--force");
const ignoredNames = new Set([
  ".git",
  "node_modules",
  "dist",
  "build",
  "coverage",
  ".pnpm-store",
]);

if (destinationDirectory === sourceDirectory) {
  throw new Error("O destino precisa ser diferente do projeto original.");
}

try {
  await lstat(destinationDirectory);
  if (!force) {
    throw new Error(
      `O diretório de destino já existe: ${destinationDirectory}\n` +
        "Use outro caminho ou execute novamente com --force."
    );
  }
  await rm(destinationDirectory, { recursive: true, force: true });
} catch (error) {
  if (error?.code !== "ENOENT") throw error;
}

await mkdir(destinationDirectory, { recursive: true });
await cp(sourceDirectory, destinationDirectory, {
  recursive: true,
  filter: source => {
    const name = basename(source);
    const isEnvironmentFile =
      name.startsWith(".env") && !name.endsWith(".example");
    return !ignoredNames.has(name) && !isEnvironmentFile;
  },
});

await writeFile(
  resolve(destinationDirectory, "LABORATORIO.md"),
  `# Repositório de laboratório\n\nEste é um repositório independente criado em ${new Date().toISOString()}.\n\n- Projeto original: \`${sourceDirectory}\`\n- Altere os arquivos desta pasta sem modificar o original.\n- Execute \`pnpm install\` e depois \`pnpm dev\` para iniciar o laboratório.\n- Para iniciar o banco local, copie \`.env.laboratorio.example\` para \`.env\` e execute \`docker compose up -d\`.\n- Arquivos \`.env*\`, dependências, builds e o histórico Git original não foram copiados intencionalmente.\n`
);

execFileSync("git", ["init", "--initial-branch=main", destinationDirectory], {
  stdio: "inherit",
});

console.log(`Repositório de laboratório criado em: ${destinationDirectory}`);
console.log(
  "Próximos passos: cd no diretório criado && cp .env.laboratorio.example .env && docker compose up -d && pnpm install && pnpm dev"
);
