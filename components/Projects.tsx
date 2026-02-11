"use client";

import { projects } from "@/lib/data";
import ProjectCard from "./ProjectCard";
import { useInView } from "./useInView";
import { ChevronLeft, ChevronRight } from "lucide-react";
import { useRef } from "react";

export default function Projects() {
  const { ref, isInView } = useInView();
  const secondaryRowRef = useRef<HTMLDivElement>(null);

  const featured = projects.filter((p) => p.featured);
  const secondary = projects.filter((p) => !p.featured);

  const scrollSecondaryBy = (direction: "left" | "right") => {
    const el = secondaryRowRef.current;
    if (!el) return;
    const delta = Math.round(el.clientWidth * 0.9) * (direction === "left" ? -1 : 1);
    el.scrollBy({ left: delta, behavior: "smooth" });
  };

  return (
    <section
      id="projects"
      ref={ref as React.RefObject<HTMLElement>}
      className={`px-6 py-24 md:py-32 ${isInView ? "animate-fade-in-up" : "opacity-0"}`}
    >
      <div className="mx-auto max-w-[1080px]">
        <h2 className="font-display text-3xl md:text-4xl mb-2">Projects</h2>
        <p className="text-text-secondary mb-10">Things I&apos;ve built.</p>

        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
          {featured.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>

        <div className="flex items-center justify-end mb-3">
          <div className="flex gap-2">
            <button
              type="button"
              onClick={() => scrollSecondaryBy("left")}
              aria-label="Scroll projects left"
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border bg-white hover:-translate-y-0.5 hover:shadow-sm transition-all"
            >
              <ChevronLeft size={18} />
            </button>
            <button
              type="button"
              onClick={() => scrollSecondaryBy("right")}
              aria-label="Scroll projects right"
              className="h-9 w-9 inline-flex items-center justify-center rounded-full border border-border bg-white hover:-translate-y-0.5 hover:shadow-sm transition-all"
            >
              <ChevronRight size={18} />
            </button>
          </div>
        </div>

        <div
          ref={secondaryRowRef}
          className="no-scrollbar -mx-6 px-6 overflow-x-auto scroll-smooth snap-x snap-mandatory"
        >
          <div className="flex gap-4">
            {secondary.map((project) => (
              <div
                key={project.title}
                className="snap-start min-w-[85%] sm:min-w-[48%] md:min-w-[340px] lg:min-w-[360px]"
              >
                <ProjectCard project={project} />
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}
