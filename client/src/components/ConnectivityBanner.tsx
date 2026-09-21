import { useEffect, useState } from "react";
import { WifiOff } from "lucide-react";

export function ConnectivityBanner() {
  const [offline,setOffline]=useState(() => typeof navigator !== "undefined" && !navigator.onLine);

  useEffect(() => {
    const onOnline=() => setOffline(false);
    const onOffline=() => setOffline(true);
    window.addEventListener("online",onOnline);
    window.addEventListener("offline",onOffline);
    return () => {
      window.removeEventListener("online",onOnline);
      window.removeEventListener("offline",onOffline);
    };
  },[]);

  if (!offline) return null;
  return (
    <div role="status" aria-live="polite" className="fixed bottom-[max(.75rem,env(safe-area-inset-bottom))] left-1/2 z-[100] w-[calc(100%-1.5rem)] max-w-lg -translate-x-1/2 rounded-xl border border-[#d7bb7f] bg-[#fff7e5] px-4 py-3 text-xs font-semibold leading-5 text-[#76541c] shadow-xl">
      <span className="flex items-start gap-2"><WifiOff className="mt-0.5 h-4 w-4 shrink-0" />Sem conexão. A interface continua disponível, mas sincronização, pagamentos e novos conteúdos exigem internet.</span>
    </div>
  );
}
