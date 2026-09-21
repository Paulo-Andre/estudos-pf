import { ExternalLink, PlayCircle, ShieldCheck } from "lucide-react";
import { resolveLessonVideoSource } from "@/lib/videoPlayer";

type Props = {
  url: string;
  title: string;
  channel?: string;
  note?: string;
};

export function LessonVideoPlayer({ url, title, channel, note }: Props) {
  const source = resolveLessonVideoSource(url);

  return (
    <section className="overflow-hidden rounded-2xl border border-[#c8d9e4] bg-[#f4f9fd]">
      <div className="flex items-start gap-3 p-5 pb-4">
        <span className="grid h-9 w-9 shrink-0 place-items-center rounded-xl bg-[#dcecf6] text-[#0e5a70]"><PlayCircle className="h-5 w-5" /></span>
        <div className="min-w-0">
          <p className="eyebrow text-[#245c70]">VÍDEO COMPLEMENTAR · OPCIONAL</p>
          <h3 className="font-display mt-1 text-base font-bold text-[#173d4a]">{title}</h3>
          {channel && <p className="mt-1 text-xs font-bold text-[#416a7c]">{channel}</p>}
          {note && <p className="mt-2 text-sm leading-6 text-[#426373]">{note}</p>}
        </div>
      </div>

      <div className="border-y border-[#c8d9e4] bg-[#173d4a] p-2 sm:p-3">
        {source.kind === "youtube" ? (
          <div className="aspect-video overflow-hidden rounded-xl bg-black">
            <iframe
              className="h-full w-full"
              src={source.embedUrl}
              title={`Vídeo: ${title}`}
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              allowFullScreen
              loading="lazy"
              referrerPolicy="strict-origin-when-cross-origin"
            />
          </div>
        ) : source.kind === "direct" ? (
          <video
            className="aspect-video w-full rounded-xl bg-black object-contain"
            controls
            controlsList="nodownload noremoteplayback"
            disablePictureInPicture
            playsInline
            preload="metadata"
            onContextMenu={(event) => event.preventDefault()}
          >
            <source src={source.url} />
            Seu navegador não conseguiu reproduzir este vídeo.
          </video>
        ) : (
          <div className="flex aspect-video flex-col items-center justify-center rounded-xl bg-[#102b35] p-5 text-center text-[#dbe8ea]">
            <PlayCircle className="h-8 w-8 text-[#93d6c6]" />
            <p className="mt-3 text-sm font-bold">Esta fonte ainda não permite reprodução integrada.</p>
            <a href={source.url} target="_blank" rel="noreferrer" className="mt-3 inline-flex items-center gap-2 rounded-lg border border-[#93d6c6]/60 px-3 py-2 text-xs font-bold text-white hover:bg-white/10">Abrir fonte autorizada <ExternalLink className="h-3.5 w-3.5" /></a>
          </div>
        )}
      </div>

      <div className="flex gap-2 p-4 text-[11px] leading-5 text-[#52717d]">
        <ShieldCheck className="mt-0.5 h-4 w-4 shrink-0 text-[#176a5a]" />
        <p>O player evita link de download direto e limita os controles do navegador. Para vídeos próprios, use um arquivo MP4, WebM ou OGV em armazenamento controlado; capturas de tela e ferramentas do próprio navegador não podem ser bloqueadas integralmente.</p>
      </div>
    </section>
  );
}
