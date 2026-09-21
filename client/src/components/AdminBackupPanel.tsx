import { useState } from "react";
import { FileDown, HardDriveDownload, ShieldAlert } from "lucide-react";
import { trpc } from "@/lib/trpc";

type BackupResult = {
  fileName: string;
  downloadUrl: string;
  exportedAt: string;
  bytes: number;
  tableCounts: Record<string, number>;
};

function formatBytes(bytes: number) {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function AdminBackupPanel() {
  const [result, setResult] = useState<BackupResult | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const exportMutation = trpc.admin.backup.export.useMutation({
    onSuccess: (backup) => {
      setResult(backup);
      setMessage("Backup gerado. Baixe o arquivo abaixo e guarde-o em um local seguro.");
    },
    onError: (error) => setMessage(error.message),
  });

  const generate = () => {
    setMessage(null);
    exportMutation.mutate();
  };

  const recordCount = result ? Object.values(result.tableCounts).reduce((sum, count) => sum + count, 0) : 0;

  return (
    <section className="h-full overflow-y-auto bg-[#f5f1e8] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-[#274a54] bg-[#183542] p-5 text-white sm:p-7">
          <div className="flex items-center gap-2 text-[#9be0d2]"><HardDriveDownload className="h-4 w-4" /><p className="text-[10px] font-bold tracking-[0.2em]">ROOT / CONTINGÊNCIA</p></div>
          <h3 className="font-display mt-3 text-2xl font-bold">Backup da plataforma</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d3e6e1]">Gere uma cópia lógica dos dados de alunos, cursos, conteúdos, matrículas, pagamentos e progresso para download. O arquivo não contém senhas, tokens ou sessões ativas.</p>
        </div>

        <div className="mt-5 rounded-2xl border border-[#d4dfdb] bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(22,61,74,.06)] sm:p-7">
          <div className="flex items-start gap-3 rounded-xl border border-[#e7c7ad] bg-[#fff6ed] p-4 text-sm leading-6 text-[#754b2e]"><ShieldAlert className="mt-0.5 h-5 w-5 shrink-0 text-[#9a552c]" /><p><b>Importante:</b> este botão apenas cria e baixa a cópia. Uma restauração pode substituir dados existentes e será feita de forma controlada, após uma nova cópia da base de destino.</p></div>
          <div className="mt-6 flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between"><div><p className="text-sm font-bold text-[#173d4a]">Exportação em JSON</p><p className="mt-1 text-xs leading-5 text-[#687f7e]">Inclui referências de arquivos enviados; os arquivos permanecem armazenados separadamente.</p></div><button type="button" onClick={generate} disabled={exportMutation.isPending} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0e5a70] px-4 text-sm font-bold text-white transition hover:bg-[#09495b] disabled:cursor-not-allowed disabled:opacity-60"><HardDriveDownload className="h-4 w-4" />{exportMutation.isPending ? "Gerando backup..." : "Gerar backup agora"}</button></div>
          {message && <p role="status" className={`mt-5 rounded-xl border p-3 text-sm ${exportMutation.isError ? "border-[#e0b6a8] bg-[#fff2ed] text-[#97452d]" : "border-[#b9d6cb] bg-[#edf8f4] text-[#17644e]"}`}>{message}</p>}
        </div>

        {result && <div className="mt-5 rounded-2xl border border-[#c8ddd7] bg-white p-5 sm:p-7"><p className="text-[10px] font-bold tracking-[0.18em] text-[#52716f]">ÚLTIMA EXPORTAÇÃO DESTA TELA</p><h4 className="mt-2 break-all text-base font-bold text-[#173d4a]">{result.fileName}</h4><div className="mt-4 grid gap-3 text-sm text-[#426467] sm:grid-cols-3"><p className="rounded-xl bg-[#edf7f4] p-3"><b className="block text-[#173d4a]">{recordCount}</b>registros exportados</p><p className="rounded-xl bg-[#edf7f4] p-3"><b className="block text-[#173d4a]">{formatBytes(result.bytes)}</b>tamanho do arquivo</p><p className="rounded-xl bg-[#edf7f4] p-3"><b className="block text-[#173d4a]">{new Date(result.exportedAt).toLocaleString("pt-BR")}</b>data de geração</p></div><a href={result.downloadUrl} download={result.fileName} className="mt-5 inline-flex min-h-11 items-center justify-center gap-2 rounded-xl border border-[#0e5a70] bg-[#edf7f4] px-4 text-sm font-bold text-[#0e5a70] transition hover:bg-[#dff0ec]"><FileDown className="h-4 w-4" />Baixar arquivo de backup</a></div>}
      </div>
    </section>
  );
}
