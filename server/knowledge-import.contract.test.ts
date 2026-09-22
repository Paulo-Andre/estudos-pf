import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

const managerSource=readFileSync(new URL("../client/src/components/KnowledgeBaseManager.tsx",import.meta.url),"utf8");
const importSource=readFileSync(new URL("../client/src/components/KnowledgeBulkImportPanel.tsx",import.meta.url),"utf8");
const trpcSource=readFileSync(new URL("../client/src/lib/trpc.ts",import.meta.url),"utf8");

describe("importação em massa da Biblioteca Central",()=>{
  it("mantém a área de importação no painel ROOT",()=>{
    expect(managerSource).toContain('id: "import"');
    expect(managerSource).toContain("Importar Excel / PDF");
    expect(managerSource).toContain("KnowledgeBulkImportPanel");
  });

  it("mantém validação antes da confirmação",()=>{
    expect(importSource).toContain("Valide primeiro, grave depois");
    expect(importSource).toContain("1. Validar arquivo");
    expect(importSource).toContain("2. Confirmar importação");
    expect(importSource).toContain("invalidRows===0");
  });

  it("mantém modelos e importadores REST",()=>{
    expect(importSource).toContain("/api/v1/knowledge/admin/import/templates/questions/");
    expect(importSource).toContain("/api/v1/knowledge/admin/import/templates/contents/");
    expect(trpcSource).toContain('case "admin.questions.importXlsx"');
    expect(trpcSource).toContain('case "admin.contents.importFile"');
    expect(trpcSource).toContain("/api/v1/knowledge/admin/import/questions/");
    expect(trpcSource).toContain("/api/v1/knowledge/admin/import/contents/");
  });

  it("explica limitações de PDF escaneado",()=>{
    expect(importSource).toContain("PDF somente imagem/escaneado");
    expect(importSource).toContain("OCR");
  });
});
