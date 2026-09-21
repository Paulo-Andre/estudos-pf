import { AlertTriangle, CheckCircle2, XCircle } from "lucide-react";
import { Dialog, DialogContent, DialogDescription, DialogHeader, DialogTitle } from "@/components/ui/dialog";
import { trpc } from "@/lib/trpc";
import { resolvePlatformAlertLabel, resolvePlatformAlertTitle } from "@/lib/platformAlertPresentation";

const appearance = {
  improvement: { label: "Melhoria", icon: CheckCircle2, className: "border-[#78bfa5] bg-[#ecf8f1] text-[#145f48]" },
  warning: { label: "Aviso", icon: AlertTriangle, className: "border-[#e0a34a] bg-[#fff6df] text-[#825107]" },
  urgent: { label: "Urgência", icon: XCircle, className: "border-[#dc7772] bg-[#fff0ef] text-[#942d29]" },
} as const;

export function StudentAlerts() {
  const utils = trpc.useUtils();
  const alertsQuery = trpc.platform.alerts.useQuery(undefined, { refetchOnWindowFocus: false });
  const dismiss = trpc.platform.dismissAlert.useMutation({ onSuccess: () => void utils.platform.alerts.invalidate() });
  const alert = alertsQuery.data?.[0];
  if (!alert) return null;
  const level = alert.level as keyof typeof appearance;
  const style = appearance[level];
  const Icon = style.icon;
  const title = resolvePlatformAlertTitle(alert.title, level);
  const categoryLabel = resolvePlatformAlertLabel(alert.categoryLabel, level);
  const close = () => { if (!dismiss.isPending) dismiss.mutate({ alertId: alert.id }); };

  return <Dialog open onOpenChange={open => { if (!open) close(); }}>
    <DialogContent showCloseButton={!dismiss.isPending} className={`max-w-lg rounded-3xl border p-5 shadow-2xl sm:p-6 ${style.className}`}>
      <DialogHeader className="pr-8 text-left"><div className="flex items-center gap-3"><div className="grid h-11 w-11 shrink-0 place-items-center rounded-2xl border border-current/20 bg-white/55"><Icon className="h-5 w-5" /></div><div><p className="text-[10px] font-extrabold uppercase tracking-[0.16em]">{categoryLabel}</p><DialogTitle className="mt-1 text-xl font-extrabold leading-tight sm:text-2xl">{title}</DialogTitle></div></div></DialogHeader>
      <DialogDescription className="whitespace-pre-wrap text-sm font-medium leading-7 text-current sm:text-base">{alert.message}</DialogDescription>
      <div className="flex justify-end"><button type="button" disabled={dismiss.isPending} onClick={close} className="min-h-10 rounded-xl border border-current/30 px-4 text-sm font-bold transition hover:bg-white/50 disabled:opacity-50">{dismiss.isPending ? "Fechando…" : "Entendi"}</button></div>
    </DialogContent>
  </Dialog>;
}
