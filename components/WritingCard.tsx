import { ArrowUpRight } from "lucide-react";
import type { Article } from "@/lib/data";

export default function WritingCard({ article }: { article: Article }) {
  return (
    <div className="border-l-4 border-accent bg-white rounded-r-xl p-6 md:p-8">
      <p className="text-sm text-text-secondary mb-2">{article.date}</p>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="font-display text-xl md:text-2xl hover:text-accent transition-colors"
      >
        {article.title}
      </a>
      <p className="text-text-secondary leading-relaxed mt-3 mb-4">
        {article.preview}
      </p>
      <a
        href={article.url}
        target="_blank"
        rel="noopener noreferrer"
        className="text-sm text-accent hover:text-accent-hover transition-colors flex items-center gap-1"
      >
        Read on Substack
        <ArrowUpRight size={14} />
      </a>
    </div>
  );
}
