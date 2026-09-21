import { useEffect, useRef, useState } from "react";
import { ExternalLink, Monitor, RefreshCw, Smartphone } from "lucide-react";
import { trpc } from "@/lib/trpc";
import { storefrontPreviewMessageType } from "@/lib/storefrontPreview";

type DraftSettings = Record<string, string | null | undefined>;
type Viewport = "desktop" | "mobile";

/** Prévia isolada: recebe o rascunho do formulário e nunca persiste suas alterações. */
export function StorefrontLivePreview() {
  const savedSettings = trpc.platform.settings.useQuery(undefined, { refetchOnWindowFocus: false });
  const [draft, setDraft] = useState<DraftSettings | null>(null);
  const [viewport, setViewport] = useState<Viewport>("desktop");
  const [reloadKey, setReloadKey] = useState(0);
  const frameRef = useRef<HTMLIFrameElement>(null);
  const settings = draft ?? savedSettings.data ?? {};
  const postDraft = () => frameRef.current?.contentWindow?.postMessage({ type: storefrontPreviewMessageType, settings }, window.location.origin);

  useEffect(() => {
    const receiveDraft = (event: Event) => setDraft((event as CustomEvent<DraftSettings>).detail);
    window.addEventListener("nucleo-settings-preview-draft", receiveDraft);
    return () => window.removeEventListener("nucleo-settings-preview-draft", receiveDraft);
  }, []);
  useEffect(() => { postDraft(); }, [settings]);

  const src = `/?preview=storefront&previewReload=${reloadKey}`;
  return <section className="flex min-h-[42rem] flex-col overflow-hidden border border-[#c8dcd6] bg-[#e6ece8] xl:min-h-0 xl:h-full">
    <header className="flex flex-wrap items-center justify-between gap-3 border-b border-[#c8dcd6] bg-[#fffdf8] px-4 py-3">
      <div><p className="text-[10px] font-bold tracking-[.17em] text-[#176a5a]">PRÉVIA SEM SALVAR</p><h3 className="font-display mt-1 text-sm font-bold text-[#173d4a]">Página inicial completa</h3></div>
      <div className="flex items-center gap-1"><button type="button" onClick={() => setViewport("desktop")} aria-pressed={viewport === "desktop"} className={`grid h-9 w-9 place-items-center rounded-lg border ${viewport === "desktop" ? "border-[#0e5a70] bg-[#e7f4f0] text-[#0e5a70]" : "border-[#d2cbc0] bg-white text-[#60777b]"}`} title="Visualização em computador"><Monitor className="h-4 w-4" /></button><button type="button" onClick={() => setViewport("mobile")} aria-pressed={viewport === "mobile"} className={`grid h-9 w-9 place-items-center rounded-lg border ${viewport === "mobile" ? "border-[#0e5a70] bg-[#e7f4f0] text-[#0e5a70]" : "border-[#d2cbc0] bg-white text-[#60777b]"}`} title="Visualização em celular"><Smartphone className="h-4 w-4" /></button><button type="button" onClick={() => setReloadKey(value => value + 1)} className="ml-1 grid h-9 w-9 place-items-center rounded-lg border border-[#d2cbc0] bg-white text-[#60777b]" title="Recarregar prévia"><RefreshCw className="h-4 w-4" /></button><a href={src} target="_blank" rel="noreferrer" className="ml-1 grid h-9 w-9 place-items-center rounded-lg border border-[#d2cbc0] bg-white text-[#60777b]" title="Abrir em tela maior"><ExternalLink className="h-4 w-4" /></a></div>
    </header>
    <div className="flex min-h-0 flex-1 justify-center overflow-auto p-3 sm:p-5"><div className={`origin-top shadow-[0_12px_30px_rgba(22,61,74,.18)] transition-all ${viewport === "mobile" ? "w-[375px] min-w-[375px]" : "w-full min-w-[920px]"}`}><iframe ref={frameRef} title="Prévia em tempo real da página inicial" src={src} onLoad={postDraft} className={`block border-0 bg-white ${viewport === "mobile" ? "h-[720px] w-[375px]" : "h-[720px] w-full"}`} /></div></div>
    <p className="border-t border-[#c8dcd6] bg-[#fffdf8] px-4 py-2 text-xs leading-5 text-[#567471]">As alterações aparecem aqui enquanto você digita. Nada é publicado até tocar em <strong>Salvar todas as configurações</strong>.</p>
  </section>;
}
