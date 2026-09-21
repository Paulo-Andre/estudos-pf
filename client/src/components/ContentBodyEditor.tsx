import React, { useRef } from "react";
import { Textarea } from "@/components/ui/textarea";

type ContentBodyEditorProps = {
  value: string;
  onChange: (value: string) => void;
};

/** Editor simples que grava marcações textuais portáveis no campo body do conteúdo. */
export function ContentBodyEditor({ value, onChange }: ContentBodyEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement | null>(null);

  const insert = (kind: "highlight" | "formula") => {
    const textarea = textareaRef.current;
    const start = textarea?.selectionStart ?? value.length;
    const end = textarea?.selectionEnd ?? value.length;
    const selection = value.slice(start, end).trim();
    const fallback = kind === "highlight" ? "texto importante" : "x^2 + y^2 = z^2";
    const marked = kind === "highlight"
      ? `[[${selection || fallback}]]`
      : `{{formula: ${selection || fallback}}}`;
    const prefix = kind === "formula" && start > 0 && value[start - 1] !== "\n" ? "\n\n" : "";
    const suffix = kind === "formula" && value[end] !== "\n" ? "\n\n" : "";
    const next = `${value.slice(0, start)}${prefix}${marked}${suffix}${value.slice(end)}`;
    onChange(next);
    window.requestAnimationFrame(() => {
      textarea?.focus();
      const caret = start + prefix.length + marked.length;
      textarea?.setSelectionRange(caret, caret);
    });
  };

  return <fieldset className="border border-[#b9d8cf] bg-[#f7fbf9] p-3">
    <legend className="px-1 text-[11px] font-bold text-[#1d4652]">Texto completo da aula</legend>
    <div className="mb-2 flex flex-wrap gap-2">
      <button type="button" onClick={() => insert("highlight")} className="border border-[#d7b76b] bg-[#fff8df] px-2.5 py-1.5 text-[10px] font-bold text-[#77511a] hover:bg-[#fff1be]">Destacar seleção</button>
      <button type="button" onClick={() => insert("formula")} className="border border-[#8dbfb2] bg-[#edf8f4] px-2.5 py-1.5 text-[10px] font-bold text-[#176a5a] hover:bg-[#e0f3ec]">Inserir fórmula</button>
    </div>
    <Textarea ref={textareaRef} value={value} onChange={event => onChange(event.target.value)} placeholder="Escreva a explicação da aula. Selecione uma frase e use os botões acima para dar destaque ou criar uma fórmula." className="min-h-40 bg-white text-xs leading-6" />
    <p className="mt-2 text-[10px] leading-4 text-[#5d7373]">Dica: selecione uma palavra ou frase antes de clicar em <b>Destacar seleção</b>. Para fórmulas, use notação LaTex, como <code>x^2 + y^2 = z^2</code>, <code>\\frac&#123;a&#125;&#123;b&#125;</code> ou <code>\\sqrt&#123;x&#125;</code>.</p>
  </fieldset>;
}
