import React from "react";
import { BlockMath } from "react-katex";
import "katex/dist/katex.min.css";

export type RichContentBlock =
  | { type: "formula"; formula: string }
  | { type: "paragraph"; text: string };

/** Transforma a marcação persistida pelo editor em blocos seguros, sem HTML livre. */
export function parseRichContentBody(body: string): RichContentBlock[] {
  return body.split(/\n{2,}/).map(block => block.trim()).filter(Boolean).map(block => {
    const formula = block.match(/^\{\{formula:\s*([\s\S]+?)\s*\}\}$/i);
    return formula ? { type: "formula", formula: formula[1] } : { type: "paragraph", text: block };
  });
}

function HighlightedText({ text }: { text: string }) {
  const parts = text.split(/(\[\[[\s\S]*?\]\])/g);
  return <>{parts.map((part, index) => {
    const highlighted = part.match(/^\[\[([\s\S]*?)\]\]$/);
    if (highlighted) return <mark key={index} className="rounded bg-[#fff0b8] px-1 font-semibold text-[#62490c]">{highlighted[1]}</mark>;
    const lines = part.split("\n");
    return <span key={index}>{lines.map((line, lineIndex) => <span key={lineIndex}>{line}{lineIndex < lines.length - 1 && <br />}</span>)}</span>;
  })}</>;
}

export function RichContentBody({ body }: { body: string }) {
  const blocks = parseRichContentBody(body);
  return <div className="space-y-4">
    {blocks.map((block, index) => block.type === "formula"
      ? <div key={`${block.formula}-${index}`} className="overflow-x-auto rounded-2xl border border-[#8dbfb2] bg-[#edf8f4] px-4 py-5 text-center text-[#174f45]"><BlockMath math={block.formula} errorColor="#a3472c" /></div>
      : <p key={`${block.text.slice(0, 30)}-${index}`} className="text-[15px] leading-7 text-[#405861]"><HighlightedText text={block.text} /></p>)}
  </div>;
}
