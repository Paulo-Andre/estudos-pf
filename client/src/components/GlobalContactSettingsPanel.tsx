import { ExternalLink, Mail, Save, Send, ShieldCheck } from "lucide-react";
import { useEffect, useState } from "react";
import { trpc } from "@/lib/trpc";

type ContactForm = {
  email: string;
  telegramUrl: string;
};

const emptyContactForm: ContactForm = { email: "", telegramUrl: "" };

export function GlobalContactSettingsPanel() {
  const contactsQuery = trpc.admin.contacts.get.useQuery(undefined, { refetchOnWindowFocus: false });
  const utils = trpc.useUtils();
  const [form, setForm] = useState<ContactForm>(emptyContactForm);
  const [message, setMessage] = useState<string | null>(null);

  useEffect(() => {
    if (!contactsQuery.data) return;
    setForm({
      email: contactsQuery.data.email ?? "",
      telegramUrl: contactsQuery.data.telegramUrl ?? "",
    });
  }, [contactsQuery.data]);

  const saveMutation = trpc.admin.contacts.save.useMutation({
    onSuccess: async () => {
      setMessage("Canais de contato atualizados para toda a plataforma.");
      await Promise.all([utils.admin.contacts.get.invalidate(), utils.platform.contacts.invalidate()]);
    },
    onError: (error) => setMessage(error.message),
  });

  const submit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    setMessage(null);
    saveMutation.mutate(form);
  };

  return (
    <section className="h-full overflow-y-auto bg-[#f5f1e8] p-4 sm:p-6 lg:p-8">
      <div className="mx-auto max-w-3xl">
        <div className="rounded-2xl border border-[#274a54] bg-[#183542] p-5 text-white sm:p-7">
          <div className="flex items-center gap-2 text-[#9be0d2]"><ShieldCheck className="h-4 w-4" /><p className="text-[10px] font-bold tracking-[0.2em]">ROOT / COMUNICAÇÃO GLOBAL</p></div>
          <h3 className="font-display mt-3 text-2xl font-bold">Canais de contato</h3>
          <p className="mt-3 max-w-2xl text-sm leading-6 text-[#d3e6e1]">Defina os canais oficiais do Núcleo. As informações salvas aparecem para visitantes na vitrine e para alunos dentro da área de estudos.</p>
        </div>

        <form onSubmit={submit} className="mt-5 rounded-2xl border border-[#d4dfdb] bg-[#fffdf8] p-5 shadow-[0_12px_28px_rgba(22,61,74,.06)] sm:p-7">
          <div className="flex items-start gap-3 rounded-xl border border-[#c9dfd8] bg-[#edf7f4] p-4 text-sm leading-6 text-[#365e61]"><Mail className="mt-0.5 h-5 w-5 shrink-0 text-[#0e5a70]" /><p>Preencha pelo menos um canal. Para ocultar um canal, apague seu valor e salve novamente. O e-mail e o link de Telegram permanecem sob controle exclusivo do ROOT.</p></div>
          <div className="mt-6 grid gap-5">
            <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-[#315a5d]"><Mail className="h-4 w-4 text-[#0e5a70]" />E-MAIL DE CONTATO</span><input type="email" value={form.email} onChange={(event) => setForm((current) => ({ ...current, email: event.target.value }))} placeholder="contato@exemplo.com" className="h-11 w-full rounded-xl border border-[#cfc7ba] bg-white px-3 text-sm text-[#173d4a] outline-none transition focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/45" /></label>
            <label className="block"><span className="mb-2 flex items-center gap-2 text-xs font-bold tracking-wide text-[#315a5d]"><Send className="h-4 w-4 text-[#0e5a70]" />LINK DO TELEGRAM</span><input type="url" value={form.telegramUrl} onChange={(event) => setForm((current) => ({ ...current, telegramUrl: event.target.value }))} placeholder="https://t.me/seu_canal" className="h-11 w-full rounded-xl border border-[#cfc7ba] bg-white px-3 text-sm text-[#173d4a] outline-none transition focus:border-[#0e5a70] focus:ring-2 focus:ring-[#8ad2c3]/45" /><p className="mt-2 text-xs leading-5 text-[#637a7b]">Use o endereço completo, começando por <b>https://</b>.</p></label>
          </div>
          {message && <p role="status" className={`mt-5 rounded-xl border p-3 text-sm ${saveMutation.isError ? "border-[#e0b6a8] bg-[#fff2ed] text-[#97452d]" : "border-[#b9d6cb] bg-[#edf8f4] text-[#17644e]"}`}>{message}</p>}
          <div className="mt-6 flex flex-col gap-3 border-t border-[#e3dbcf] pt-5 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs text-[#687f7e]">Última atualização: {contactsQuery.data?.updatedAt ? new Date(contactsQuery.data.updatedAt).toLocaleString("pt-BR") : "ainda não configurado"}.</p><button type="submit" disabled={saveMutation.isPending || contactsQuery.isLoading} className="inline-flex min-h-11 items-center justify-center gap-2 rounded-xl bg-[#0e5a70] px-4 text-sm font-bold text-white transition hover:bg-[#09495b] disabled:cursor-not-allowed disabled:opacity-60"><Save className="h-4 w-4" />{saveMutation.isPending ? "Salvando..." : "Salvar contatos"}</button></div>
        </form>

        {(form.email || form.telegramUrl) && <div className="mt-5 rounded-2xl border border-[#d4dfdb] bg-white p-5"><p className="text-[10px] font-bold tracking-[0.18em] text-[#52716f]">PRÉVIA DOS LINKS</p><div className="mt-3 flex flex-wrap gap-3">{form.email && <a href={`mailto:${form.email}`} className="inline-flex items-center gap-2 rounded-xl border border-[#b9d8d0] bg-[#edf7f4] px-3 py-2 text-sm font-bold text-[#0e5a70]"><Mail className="h-4 w-4" />{form.email}</a>}{form.telegramUrl && <a href={form.telegramUrl} target="_blank" rel="noreferrer" className="inline-flex items-center gap-2 rounded-xl border border-[#b9d8d0] bg-[#edf7f4] px-3 py-2 text-sm font-bold text-[#0e5a70]"><Send className="h-4 w-4" />Telegram<ExternalLink className="h-3.5 w-3.5" /></a>}</div></div>}
      </div>
    </section>
  );
}
