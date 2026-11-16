"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";
import { Prism as SyntaxHighlighter } from "react-syntax-highlighter";
import { oneDark } from "react-syntax-highlighter/dist/esm/styles/prism";

// The backend cites sources inline as "[T1]", "[T2, T3]" etc. (plain text,
// see generation/generator.py's grounding prompt) — rewritten here into an
// inline-code marker so ReactMarkdown's own code renderer can intercept and
// render them as proper tier badges instead of raw brackets.
const TIER_LABELS: Record<string, string> = { T1: "CLRS", T2: "GeeksForGeeks", T3: "MIT OCW" };
const TIER_STYLES: Record<string, string> = {
  T1: "bg-rose-500/15 text-rose-300 border-rose-500/30",
  T2: "bg-amber-500/15 text-amber-300 border-amber-500/30",
  T3: "bg-emerald-500/15 text-emerald-300 border-emerald-500/30",
};

function markTierCitations(text: string): string {
  return text.replace(/\[(T[123](?:\s*,\s*T[123])*)\]/g, (_m, tiers: string) => `\`TIER:${tiers.replace(/\s+/g, "")}\``);
}

function TierBadge({ tiers }: { tiers: string }) {
  return (
    <span className="inline-flex gap-1 mx-0.5 align-middle">
      {tiers.split(",").map((t) => (
        <span
          key={t}
          title={TIER_LABELS[t] || t}
          className={`text-[10px] font-bold px-1.5 py-0.5 rounded border ${TIER_STYLES[t] || "bg-white/10 text-slate-300 border-white/20"}`}
        >
          {t}
        </span>
      ))}
    </span>
  );
}

export default function ChatMarkdown({ content }: { content: string }) {
  return (
    <ReactMarkdown
      remarkPlugins={[remarkGfm]}
      components={{
        h2: ({ children }) => (
          <h2 className="text-[15px] font-bold text-indigo-300 mt-5 mb-2 first:mt-0 pb-1.5 border-b border-white/10">
            {children}
          </h2>
        ),
        h3: ({ children }) => <h3 className="text-sm font-semibold text-slate-200 mt-3 mb-1.5">{children}</h3>,
        p: ({ children }) => <p className="mb-3 leading-relaxed last:mb-0">{children}</p>,
        strong: ({ children }) => <strong className="font-semibold text-slate-50">{children}</strong>,
        ul: ({ children }) => <ul className="list-disc list-outside ml-4 mb-3 space-y-1">{children}</ul>,
        ol: ({ children }) => <ol className="list-decimal list-outside ml-4 mb-3 space-y-1">{children}</ol>,
        li: ({ children }) => <li className="leading-relaxed">{children}</li>,
        a: ({ children, href }) => (
          <a href={href} target="_blank" rel="noreferrer" className="text-indigo-400 hover:text-indigo-300 underline">
            {children}
          </a>
        ),
        blockquote: ({ children }) => (
          <blockquote className="border-l-2 border-amber-500/50 bg-amber-500/5 pl-3 py-1.5 my-3 text-sm text-amber-200/90 rounded-r">
            {children}
          </blockquote>
        ),
        code({ className, children, ...props }) {
          const text = String(children).replace(/\n$/, "");
          const langMatch = /language-(\w+)/.exec(className || "");

          if (langMatch) {
            return (
              <SyntaxHighlighter
                language={langMatch[1]}
                style={oneDark}
                customStyle={{ borderRadius: "0.75rem", fontSize: "13px", margin: "0.75rem 0", padding: "1rem" }}
              >
                {text}
              </SyntaxHighlighter>
            );
          }
          if (text.startsWith("TIER:")) {
            return <TierBadge tiers={text.slice(5)} />;
          }
          return (
            <code className="bg-black/40 text-indigo-300 px-1.5 py-0.5 rounded text-[13px] font-mono" {...props}>
              {children}
            </code>
          );
        },
      }}
    >
      {markTierCitations(content)}
    </ReactMarkdown>
  );
}
