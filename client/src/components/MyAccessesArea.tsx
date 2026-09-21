import React from "react";
import { BookOpen, CalendarDays, CircleAlert, Clock3, Loader2, ShieldCheck, ShoppingBag } from "lucide-react";
import { trpc } from "@/lib/trpc";

type AccessStatus = "active" | "scheduled" | "expired" | "revoked";

const statusPresentation: Record<AccessStatus, { label: string; className: string; detail: string }> = {
  active: { label: "Acesso ativo", className: "border-[#a8d8c0] bg-[#e7f6ed] text-[#17644e]", detail: "Seu acesso está liberado para estudo." },
  scheduled: { label: "Acesso agendado", className: "border-[#ead096] bg-[#fff7df] text-[#8d5810]", detail: "Este acesso será liberado na data de início." },
  expired: { label: "Acesso vencido", className: "border-[#efbe87] bg-[#fff2e7] text-[#955218]", detail: "O prazo desta matrícula terminou." },
  revoked: { label: "Acesso revogado", className: "border-[#e5bab7] bg-[#fbeeed] text-[#953e38]", detail: "Este acesso foi encerrado pela administração." },
};

function formatDate(value: Date | string | null | undefined) {
  if (!value) return "—";
  return new Date(value).toLocaleDateString("pt-BR", { timeZone: "America/Sao_Paulo" });
}

export function MyAccessesArea({ onBuyMore }: { onBuyMore: () => void }) {
  const accesses = trpc.commerce.myAccesses.useQuery(undefined, { refetchOnWindowFocus: false });

  return <section className="mx-auto w-full max-w-7xl px-4 py-7 sm:px-7 sm:py-10 lg:px-10">
    <header className="flex flex-col gap-5 rounded-[1.35rem] border border-[#c5dad5] bg-[#fffdf8] p-5 shadow-sm sm:flex-row sm:items-end sm:justify-between sm:p-7">
      <div className="min-w-0">
        <p className="eyebrow">MATRÍCULAS DA SUA CONTA</p>
        <h2 className="font-display mt-1 text-2xl font-bold text-[#173d4a] sm:text-3xl">Meus acessos</h2>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-[#52716f]">Consulte os cursos liberados para você, as datas de vigência e a situação atual de cada matrícula.</p>
      </div>
      <button type="button" onClick={onBuyMore} className="action-button w-full shrink-0 sm:w-auto"><ShoppingBag className="h-4 w-4" />Comprar mais cursos</button>
    </header>

    <div className="mt-6">
      {accesses.isLoading ? <div className="grid min-h-48 place-items-center rounded-2xl border border-[#d8d0c1] bg-[#fffdf8] text-sm font-semibold text-[#52716f]"><span className="flex items-center gap-2"><Loader2 className="h-5 w-5 animate-spin" />Carregando seus acessos...</span></div>
        : accesses.isError ? <div className="rounded-2xl border border-[#ebc8c1] bg-[#fff5f2] p-6 text-center"><CircleAlert className="mx-auto h-7 w-7 text-[#9b473f]" /><h3 className="font-display mt-3 text-lg font-bold text-[#63332e]">Não foi possível consultar seus acessos</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#77534e]">Tente novamente. Se o problema continuar, fale com a equipe responsável.</p><button type="button" onClick={() => void accesses.refetch()} className="mt-4 min-h-11 rounded-xl border border-[#c98f88] px-4 text-xs font-bold tracking-wide text-[#7b3a34]">TENTAR NOVAMENTE</button></div>
          : !accesses.data?.length ? <div className="rounded-2xl border border-dashed border-[#b8cfc8] bg-[#fafcfb] p-8 text-center"><BookOpen className="mx-auto h-8 w-8 text-[#5c8582]" /><h3 className="font-display mt-3 text-lg font-bold text-[#173d4a]">Nenhuma matrícula encontrada</h3><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-[#52716f]">Quando um pagamento for confirmado ou um curso for liberado pela equipe, ele aparecerá aqui com a data de validade.</p><button type="button" onClick={onBuyMore} className="mt-5 min-h-11 rounded-xl bg-[#0e5a70] px-4 text-xs font-bold tracking-wide text-white shadow-sm">EXPLORAR CURSOS DISPONÍVEIS</button></div>
            : <div className="grid gap-5 xl:grid-cols-2">{accesses.data.map(access => {
              const presentation = statusPresentation[access.computedStatus as AccessStatus];
              return <article key={access.id} className="overflow-hidden rounded-2xl border border-[#ddd4c6] bg-[#fffdf8] shadow-sm">
                <div className="flex min-w-0 gap-4 p-4 sm:p-5">
                  <div className="grid h-20 w-24 shrink-0 place-items-center overflow-hidden rounded-xl border border-[#d9e5e1] bg-[#edf6f3] sm:h-24 sm:w-32">
                    {access.courseCoverImageUrl ? <img src={access.courseCoverImageUrl} alt="" className="h-full w-full object-cover" /> : <BookOpen className="h-7 w-7 text-[#276b73]" />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2"><span className="rounded-full border border-[#c8dcd6] bg-[#edf7f5] px-2.5 py-1 text-[10px] font-bold tracking-[0.12em] text-[#276b73]">{access.courseType === "tutorial" ? "TUTORIAL" : "CONCURSO"}</span><span className={`rounded-full border px-2.5 py-1 text-[10px] font-bold tracking-[0.08em] ${presentation.className}`}>{presentation.label}</span></div>
                    <h3 className="font-display mt-3 break-words text-lg font-bold text-[#173d4a] sm:text-xl">{access.courseTitle ?? "Curso indisponível no catálogo"}</h3>
                    <p className="mt-1 text-sm leading-5 text-[#52716f]">{access.courseTrack || "Trilha de preparação Núcleo Concursos"}</p>
                  </div>
                </div>
                <div className="border-t border-[#eee7dc] bg-[#fcfaf5] p-4 sm:p-5">
                  <p className="flex items-center gap-2 text-sm font-semibold text-[#315a5d]"><ShieldCheck className="h-4 w-4 text-[#17644e]" />{presentation.detail}</p>
                  <div className="mt-4 grid gap-3 border-t border-[#eee7dc] pt-4 sm:grid-cols-2">
                    <div className="flex items-start gap-2"><CalendarDays className="mt-0.5 h-4 w-4 shrink-0 text-[#52716f]" /><div><p className="text-[10px] font-bold tracking-[0.12em] text-[#698481]">INÍCIO</p><p className="mt-1 text-sm font-semibold text-[#173d4a]">{formatDate(access.startAt)}</p></div></div>
                    <div className="flex items-start gap-2"><Clock3 className="mt-0.5 h-4 w-4 shrink-0 text-[#52716f]" /><div><p className="text-[10px] font-bold tracking-[0.12em] text-[#698481]">VALIDADE</p><p className="mt-1 text-sm font-semibold text-[#173d4a]">{formatDate(access.expiresAt)}</p></div></div>
                  </div>
                  {access.computedStatus === "revoked" && access.revokedAt && <p className="mt-3 text-xs font-semibold text-[#953e38]">Encerrado em {formatDate(access.revokedAt)}.</p>}
                </div>
              </article>;
            })}</div>}
    </div>
  </section>;
}
