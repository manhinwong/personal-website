"use client";

import { approachItems } from "@/lib/data";
import { useInView } from "./useInView";

export default function Approach() {
  const { ref, isInView } = useInView();

  return (
    <section
      id="approach"
      ref={ref as React.RefObject<HTMLElement>}
      className={`px-6 py-24 md:py-32 ${isInView ? "animate-fade-in-up" : "opacity-0"}`}
    >
      <div className="mx-auto max-w-[1080px]">
        <h2 className="font-display text-3xl md:text-4xl mb-2">Approach</h2>
        <p className="text-text-secondary mb-10">How I work.</p>

        <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
          {approachItems.map((item) => (
            <div
              key={item.number}
              className="bg-bg-alt rounded-xl p-6 md:p-8"
            >
              <span className="font-mono text-sm text-accent mb-3 block">
                {item.number}
              </span>
              <h3 className="font-display text-xl mb-3">{item.title}</h3>
              <p className="text-text-secondary leading-relaxed">
                {item.description}
              </p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
