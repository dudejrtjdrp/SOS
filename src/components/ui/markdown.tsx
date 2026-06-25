"use client";

import ReactMarkdown from "react-markdown";
import remarkGfm from "remark-gfm";

/** Markdown renderer with explicit element styling (no typography plugin needed). */
export function Markdown({ children }: { children: string }) {
  return (
    <div className="text-sm leading-relaxed text-foreground">
      <ReactMarkdown
        remarkPlugins={[remarkGfm]}
        components={{
          h1: (p) => <h1 className="mb-3 mt-5 text-xl font-semibold" {...p} />,
          h2: (p) => <h2 className="mb-2 mt-5 text-lg font-semibold" {...p} />,
          h3: (p) => <h3 className="mb-2 mt-4 text-base font-semibold" {...p} />,
          p: (p) => <p className="mb-3" {...p} />,
          ul: (p) => <ul className="mb-3 list-disc space-y-1 pl-5" {...p} />,
          ol: (p) => <ol className="mb-3 list-decimal space-y-1 pl-5" {...p} />,
          li: (p) => <li className="leading-relaxed" {...p} />,
          strong: (p) => <strong className="font-semibold text-foreground" {...p} />,
          a: (p) => <a className="text-primary underline underline-offset-2" {...p} />,
          blockquote: (p) => (
            <blockquote className="my-3 border-l-2 border-border pl-4 text-muted-foreground" {...p} />
          ),
          code: (p) => (
            <code className="rounded bg-secondary px-1.5 py-0.5 text-xs" {...p} />
          ),
          table: (p) => (
            <div className="my-3 overflow-x-auto">
              <table className="w-full border-collapse text-sm" {...p} />
            </div>
          ),
          th: (p) => <th className="border border-border bg-secondary px-3 py-1.5 text-left" {...p} />,
          td: (p) => <td className="border border-border px-3 py-1.5" {...p} />,
        }}
      >
        {children}
      </ReactMarkdown>
    </div>
  );
}
