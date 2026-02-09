"use client";

import { articles } from "@/lib/data";
import WritingCard from "./WritingCard";
import { useInView } from "./useInView";

export default function Writing() {
  const { ref, isInView } = useInView();

  return (
    <section
      id="writing"
      ref={ref as React.RefObject<HTMLElement>}
      className={`px-6 py-24 md:py-32 bg-bg-alt ${isInView ? "animate-fade-in-up" : "opacity-0"}`}
    >
      <div className="mx-auto max-w-[1080px]">
        <h2 className="font-display text-3xl md:text-4xl mb-2">Writing</h2>
        <p className="text-text-secondary mb-10">
          How I think about building.
        </p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {articles.map((article) => (
            <WritingCard key={article.title} article={article} />
          ))}
        </div>
      </div>
    </section>
  );
}
