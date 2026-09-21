import { useState } from "react";
import { AlertTriangle, KeyRound, Loader2, MonitorSmartphone, RefreshCcw, ShieldCheck, UsersRound } from "lucide-react";
import { trpc } from "@/lib/trpc";

const fmt=(value?:string|null)=>value?new Date(value).toLocaleString("pt-BR"):"—";

export function AdminSecurityPanel(){
  const [selected,setSelected]=useState<number|null>(null);
  const overview=trpc.admin.security.overview.useQuery(undefined,{refetchOnWindowFocus:false});
  const events=trpc.admin.security.events.useQuery(undefined,{refetchOnWindowFocus:false});
  const users=trpc.admin.users.useQuery({});
  const sessions=trpc.admin.userSessions.useQuery({userId:selected??0},{enabled:Boolean(selected)});
  const revokeAll=trpc.admin.revokeUserSessions.useMutation({onSuccess:()=>{void sessions.refetch();void overview.refetch();}});
  const revokeOne=trpc.admin.revokeUserSession.useMutation({onSuccess:()=>{void sessions.refetch();void overview.refetch();}});
  const unlock=trpc.admin.unlockUserLogin.useMutation({onSuccess:()=>void overview.refetch()});
  const cards=[
    ["SESSÕES ATIVAS",overview.data?.activeSessions,MonitorSmartphone],
    ["EVENTOS 24H",overview.data?.securityEvents24h,ShieldCheck],
    ["FALHAS DE LOGIN",overview.data?.failedLogins24h,AlertTriangle],
    ["LIMITES ATIVOS",overview.data?.rateLimitEntries,KeyRound],
  ] as const;
  return <div className="h-full overflow-y-auto p-4 sm:p-6"><div className="flex flex-col gap-2 sm:flex-row sm:items-end sm:justify-between"><div><p className="eyebrow">SEGURANÇA</p><h2 className="font-display mt-1 text-2xl font-bold text-[#173d4a]">Centro de segurança</h2><p className="mt-2 max-w-2xl text-xs leading-5 text-[#60777a]">Sessões, tentativas de acesso, eventos e verificação de dados sensíveis.</p></div><button onClick={()=>{void overview.refetch();void events.refetch();}} className="ghost-button"><RefreshCcw className="h-4 w-4"/>Atualizar</button></div>
    <div className="mt-5 grid gap-3 sm:grid-cols-2 xl:grid-cols-4">{cards.map(([label,value,Icon])=><div key={label} className="rounded-xl border border-[#d7cfc1] bg-white p-4"><Icon className="h-4 w-4 text-[#0e5a70]"/><p className="mt-3 text-[10px] font-bold tracking-wider text-[#6c7c7f]">{label}</p><p className="font-display mt-1 text-2xl font-extrabold text-[#183542]">{value??"—"}</p></div>)}</div>
    {overview.data?.plaintextCpfRecords>0&&<div className="mt-4 rounded-xl border border-[#e0b27d] bg-[#fff5e5] p-4 text-xs font-semibold text-[#76541c]">Atenção: {overview.data.plaintextCpfRecords} CPF(s) legado(s) ainda precisam passar pelo comando protect_pii.</div>}
    <div className="mt-6 grid gap-5 xl:grid-cols-[.8fr_1.2fr]"><section className="rounded-xl border border-[#d7cfc1] bg-[#fffdf8] p-4"><div className="flex items-center gap-2"><UsersRound className="h-4 w-4 text-[#0e5a70]"/><h3 className="font-display font-bold">Sessões por usuário</h3></div><select value={selected??""} onChange={e=>setSelected(e.target.value?Number(e.target.value):null)} className="mt-3 h-11 w-full rounded-lg border border-[#cec6b8] bg-white px-3 text-sm"><option value="">Selecione uma conta</option>{users.data?.map((u:any)=><option key={u.id} value={u.id}>{u.name} (@{u.username})</option>)}</select>{selected&&<div className="mt-3 space-y-2">{sessions.isLoading?<Loader2 className="h-5 w-5 animate-spin"/>:sessions.data?.map((s:any)=><div key={s.id} className="rounded-lg border bg-white p-3"><p className="truncate text-xs font-bold">{s.userAgent||"Dispositivo não identificado"}</p><p className="mt-1 text-[10px] text-[#718087]">{fmt(s.lastSeenAt)}{s.revokedAt?" · revogada":""}</p>{!s.revokedAt&&<button onClick={()=>revokeOne.mutate({userId:selected,sessionId:s.id})} className="mt-2 text-xs font-bold text-[#9b4228]">Revogar sessão</button>}</div>)}</div>}{selected&&<div className="mt-3 flex flex-wrap gap-2"><button onClick={()=>revokeAll.mutate({userId:selected})} className="ghost-button text-xs">Revogar todas</button><button onClick={()=>unlock.mutate({userId:selected})} className="ghost-button text-xs">Liberar tentativas</button></div>}</section>
      <section className="rounded-xl border border-[#d7cfc1] bg-[#fffdf8] p-4"><h3 className="font-display font-bold">Eventos recentes</h3><div className="mt-3 space-y-2">{events.data?.slice(0,50).map((e:any)=><div key={e.id} className="rounded-lg border bg-white p-3"><div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs font-bold">{String(e.type).replaceAll("_"," ")}</p><span className="text-[10px] text-[#718087]">{fmt(e.createdAt)}</span></div><p className="mt-1 text-[10px] text-[#60777a]">{e.username?"@"+e.username:"Evento anônimo"}{e.userAgent?" · "+e.userAgent:""}</p></div>)}</div></section></div>
  </div>;
}
