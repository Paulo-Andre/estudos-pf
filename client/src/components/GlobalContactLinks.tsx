import React from "react";
import { Mail, Send } from "lucide-react";
import { trpc } from "@/lib/trpc";

type GlobalContactLinksProps = {
  variant?: "footer" | "sidebar" | "login";
};

export function GlobalContactLinks({ variant = "footer" }: GlobalContactLinksProps) {
  const contactsQuery = trpc.platform.contacts.useQuery(undefined, { refetchOnWindowFocus: false });
  const settingsQuery = trpc.platform.settings.useQuery(undefined, { refetchOnWindowFocus: false });
  const contacts = contactsQuery.data;
  const brandName = settingsQuery.data?.brandName ?? "Núcleo Concursos";
  const accentColor = settingsQuery.data?.accentColor ?? "#9be0d2";
  const mutedTextColor = settingsQuery.data?.mutedTextColor ?? "#597370";
  const textColor = settingsQuery.data?.textColor ?? "#315a5d";
  const iconColor = settingsQuery.data?.iconColor ?? "#0e5a70";
  const hasEmail = Boolean(contacts?.email);
  const hasTelegram = Boolean(contacts?.telegramUrl);

  if (contactsQuery.isLoading || (!hasEmail && !hasTelegram)) return null;

  if (variant === "sidebar") {
    return (
      <div className="mt-5 border-t border-white/10 pt-4">
        <p style={{ color: accentColor }} className="px-2 text-[9px] font-bold tracking-[0.16em]">SUPORTE DO {brandName.toUpperCase()}</p>
        <div className="mt-2 space-y-1">
          {hasEmail && <a href={`mailto:${contacts?.email}`} className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-[#c6d7dc] transition hover:bg-white/10 hover:text-white"><Mail style={{ color: accentColor }} className="h-3.5 w-3.5" /><span className="truncate">{contacts?.email}</span></a>}
          {hasTelegram && <a href={contacts?.telegramUrl ?? "#"} target="_blank" rel="noreferrer" className="flex items-center gap-2 rounded-lg px-2 py-2 text-xs font-semibold text-[#c6d7dc] transition hover:bg-white/10 hover:text-white"><Send style={{ color: accentColor }} className="h-3.5 w-3.5" /><span>Telegram de {brandName}</span></a>}
        </div>
      </div>
    );
  }

  if (variant === "login") {
    return (
      <div className="mt-7 border-t border-white/15 pt-5 text-xs">
        <p style={{ color: accentColor }} className="text-[9px] font-bold tracking-[0.16em]">PRECISA DE AJUDA?</p>
        <p className="mt-1.5 leading-5 text-[#a8c1c3]">Fale com o suporte da plataforma caso precise de orientação para entrar ou recuperar sua conta.</p>
        <div className="mt-3 flex flex-wrap gap-x-4 gap-y-2">
          {hasEmail && <a href={`mailto:${contacts?.email}`} className="inline-flex max-w-full items-center gap-1.5 font-semibold text-[#e5f7f1] hover:text-white hover:underline"><Mail style={{ color: accentColor }} className="h-3.5 w-3.5 shrink-0" /><span className="truncate">{contacts?.email}</span></a>}
          {hasTelegram && <a href={contacts?.telegramUrl ?? "#"} target="_blank" rel="noreferrer" className="inline-flex items-center gap-1.5 font-semibold text-[#e5f7f1] hover:text-white hover:underline"><Send style={{ color: accentColor }} className="h-3.5 w-3.5" />Telegram</a>}
        </div>
      </div>
    );
  }

  return (
    <div style={{ color: mutedTextColor }} className="flex flex-wrap items-center gap-x-4 gap-y-2 text-xs">
      <span style={{ color: textColor }} className="font-bold">Fale conosco</span>
      {hasEmail && <a href={`mailto:${contacts?.email}`} style={{ color: iconColor }} className="inline-flex items-center gap-1.5 font-semibold hover:underline"><Mail className="h-3.5 w-3.5" />{contacts?.email}</a>}
      {hasTelegram && <a href={contacts?.telegramUrl ?? "#"} target="_blank" rel="noreferrer" style={{ color: iconColor }} className="inline-flex items-center gap-1.5 font-semibold hover:underline"><Send className="h-3.5 w-3.5" />Telegram</a>}
    </div>
  );
}
