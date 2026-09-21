import { useMemo, useState } from "react";
import { Check, Clock3, CreditCard, Loader2, ShieldCheck, ShoppingBag, TicketPercent, X } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { PlanCoverCarousel } from "@/components/PlanCoverCarousel";
import { CourseFilterToolbar } from "@/components/CourseFilterToolbar";
import { filterMarketplacePlans, type CourseMarketplaceFilters } from "@/lib/courseMarketplace";
import type { PublicStorefrontPlan } from "@/lib/publicStorefront";

function formatCurrency(cents: number) {
  return new Intl.NumberFormat("pt-BR", { style: "currency", currency: "BRL" }).format(cents / 100);
}

export function CommercePanel({ onClose, initialPlanId }: { onClose: () => void; initialPlanId?: string | null }) {
  const [couponCode, setCouponCode] = useState("");
  const [notice, setNotice] = useState<string | null>(null);
  const [selectedPlanId, setSelectedPlanId] = useState<string | null>(null);
  const [filters, setFilters] = useState<CourseMarketplaceFilters>({ search: "", state: "", area: "", kind: "all" });
  const utils = trpc.useUtils();
  const plans = trpc.commerce.plans.useQuery(undefined, { refetchOnWindowFocus: false });
  const catalog = (plans.data ?? []) as PublicStorefrontPlan[];
  const filteredCatalog = useMemo(() => filterMarketplacePlans(catalog, filters), [catalog, filters]);
  const createOrder = trpc.commerce.createOrder.useMutation({
    onSuccess: async (order) => {
      await Promise.all([utils.commerce.myAccesses.invalidate(), utils.study.access.invalidate()]);
      setSelectedPlanId(null);
      if (order.status === "paid") {
        setNotice("Seu acesso foi liberado pelo cupom. Atualize a página caso sua trilha ainda não apareça.");
        return;
      }
      checkout.mutate({ orderId: order.id });
    },
    onError: (error) => setNotice(error.message || "Não foi possível criar o pedido."),
  });
  const checkout = trpc.commerce.checkout.useMutation({
    onSuccess: ({ checkoutUrl }) => window.location.assign(checkoutUrl),
    onError: (error) => {
      setSelectedPlanId(null);
      setNotice(error.message || "Não foi possível abrir o pagamento seguro.");
    },
  });

  const requestPlan = (planId: string) => {
    setNotice(null);
    setSelectedPlanId(planId);
    createOrder.mutate({ planId, ...(couponCode.trim() ? { couponCode: couponCode.trim() } : {}) });
  };

  return <div className="fixed inset-0 z-[70] grid place-items-center bg-[#152d38]/60 p-3 backdrop-blur-sm">
    <section role="dialog" aria-modal="true" aria-labelledby="commerce-title" className="max-h-[94vh] w-full max-w-6xl overflow-y-auto rounded-[1.4rem] border border-[#c5dad5] bg-[#fffdf8] shadow-2xl">
      <header className="sticky top-0 z-10 flex items-start justify-between gap-4 border-b border-[#e6ded1] bg-[#fffdf8]/95 p-5 backdrop-blur sm:p-7">
        <div className="min-w-0"><p className="eyebrow">COMPRAR CURSOS</p><h2 id="commerce-title" className="font-display mt-1 text-xl font-bold text-[#173d4a] sm:text-2xl">Planos Núcleo Concursos</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-[#52716f]">Escolha um curso avulso ou uma assinatura. As matrículas são liberadas somente após confirmação registrada do pagamento.</p></div>
        <button onClick={onClose} aria-label="Fechar planos" className="grid h-10 w-10 shrink-0 place-items-center rounded-xl border border-[#d8d0c1] text-[#315a5d]"><X className="h-5 w-5" /></button>
      </header>
      <div className="space-y-8 p-5 sm:p-7">
        <section className="rounded-2xl border border-[#c8dcd6] bg-[#edf7f5] p-4 sm:flex sm:items-end sm:justify-between sm:gap-5">
          <div><div className="flex items-center gap-2"><TicketPercent className="h-5 w-5 text-[#0e5a70]" /><h3 className="font-display font-bold text-[#173d4a]">Possui um cupom?</h3></div><p className="mt-1 text-xs leading-5 text-[#52716f]">O desconto é validado ao solicitar o plano. Um cupom de 100% libera o acesso imediatamente.</p></div>
          <label className="mt-3 block sm:mt-0"><span className="sr-only">Código do cupom</span><input value={couponCode} onChange={event => setCouponCode(event.target.value.toUpperCase())} placeholder="CUPOM" maxLength={48} className="h-11 w-full rounded-xl border border-[#a9cfc4] bg-white px-3 text-sm font-bold uppercase tracking-wide outline-none focus:ring-2 focus:ring-[#82cfbf] sm:w-52" /></label>
        </section>
        {notice && <p role="status" className="rounded-xl border border-[#b9d6cb] bg-[#edf8f4] px-4 py-3 text-sm font-semibold text-[#17644e]">{notice}</p>}
        <section><div className="mb-4 flex items-center gap-2"><ShoppingBag className="h-5 w-5 text-[#0e5a70]" /><h3 className="font-display text-lg font-bold text-[#173d4a]">Catálogo disponível</h3></div>
          {!plans.isLoading && catalog.length > 0 && <div className="mb-4"><CourseFilterToolbar plans={catalog} filters={filters} onChange={setFilters} compact /></div>}
          {plans.isLoading ? <div className="grid min-h-40 place-items-center text-sm text-[#52716f]"><Loader2 className="h-5 w-5 animate-spin" /></div> : !catalog.length ? <div className="rounded-2xl border border-dashed border-[#b8cfc8] bg-[#fafcfb] p-6 text-sm leading-6 text-[#52716f]">Ainda não há planos publicados. Retorne em breve ou fale com a equipe responsável.</div> : !filteredCatalog.length ? <div className="rounded-2xl border border-dashed border-[#b8cfc8] bg-[#fafcfb] p-6 text-sm leading-6 text-[#52716f]">Nenhum curso corresponde aos filtros. Toque em Limpar para ver todos os cursos.</div> : <div className="grid gap-4 lg:grid-cols-2">{filteredCatalog.map(plan => <article key={plan.id} className={`relative flex min-w-0 flex-col rounded-2xl border p-5 ${plan.isHighlighted || plan.id === initialPlanId ? "border-[#0e5a70] bg-[#f0f8f6] shadow-sm" : "border-[#ddd4c6] bg-white"}`}>
            {(plan.isHighlighted || plan.id === initialPlanId) && <span className="absolute -top-3 left-5 rounded-full bg-[#0e5a70] px-3 py-1 text-[10px] font-bold tracking-wider text-white">{plan.id === initialPlanId ? "PACOTE ESCOLHIDO" : "RECOMENDADO"}</span>}
            <PlanCoverCarousel images={plan.coverImageUrls} planTitle={plan.title} />
            <div className="flex items-start justify-between gap-3"><div className="min-w-0"><p className="text-[10px] font-bold tracking-[0.16em] text-[#4b7776]">{plan.planType === "subscription" ? "ASSINATURA" : "CURSO AVULSO"}</p><h4 className="font-display mt-1 break-words text-xl font-bold text-[#173d4a]">{plan.title}</h4></div><span className="shrink-0 text-right font-display text-xl font-extrabold text-[#0e5a70]">{formatCurrency(plan.priceCents)}</span></div>
            <p className="mt-3 min-h-10 text-sm leading-6 text-[#52716f]">{plan.description || "Acesso organizado às trilhas incluídas neste plano."}</p>
            <div className="mt-4 rounded-xl border border-[#dce9e5] bg-[#f9fcfb] p-3"><p className="text-[10px] font-bold tracking-wider text-[#48716f]">INCLUI</p><ul className="mt-2 space-y-2 text-sm text-[#315a5d]">{plan.courseIds.map(courseId => { const course = plan.courses?.find(item => item.id === courseId); return <li key={courseId} className="flex min-w-0 items-center gap-2">{course?.coverImageUrl ? <img src={course.coverImageUrl} alt="" className="h-8 w-11 shrink-0 rounded-md border border-[#cfe0db] object-cover" /> : <Check className="h-4 w-4 shrink-0 text-[#17644e]" />}<span className="break-words">{course?.title ?? courseId}</span></li>; })}</ul></div>
            <div className="mt-4 flex items-center justify-between gap-3"><span className="flex items-center gap-1.5 text-xs font-semibold text-[#52716f]"><Clock3 className="h-4 w-4" />{plan.accessDurationDays} dia{plan.accessDurationDays === 1 ? "" : "s"} de acesso</span><button onClick={() => requestPlan(plan.id)} disabled={createOrder.isPending || checkout.isPending} className="action-button shrink-0 disabled:opacity-60">{selectedPlanId === plan.id && (createOrder.isPending || checkout.isPending) ? <Loader2 className="h-4 w-4 animate-spin" /> : <CreditCard className="h-4 w-4" />}{plan.priceCents === 0 ? "Liberar" : "Pagar com Mercado Pago"}</button></div>
          </article>)}</div>}
        </section>
        <section className="flex gap-3 rounded-2xl border border-[#d4dfdb] bg-[#f7fbfa] p-4"><ShieldCheck className="mt-0.5 h-5 w-5 shrink-0 text-[#0e5a70]" /><p className="text-xs leading-6 text-[#52716f]">O pagamento é concluído no ambiente seguro do Mercado Pago. Nenhum dado de cartão ou Pix é armazenado pelo Núcleo Concursos; o acesso é liberado somente após a confirmação registrada pelo provedor.</p></section>
      </div>
    </section>
  </div>;
}
