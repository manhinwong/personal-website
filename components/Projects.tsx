"use client";

import { projects } from "@/lib/data";
import ProjectCard from "./ProjectCard";
import { useInView } from "./useInView";

export default function Projects() {
  const { ref, isInView } = useInView();

  const featured = projects.filter((p) => p.featured);
  const secondary = projects.filter((p) => !p.featured);

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

        <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-6">
          {secondary.map((project) => (
            <ProjectCard key={project.title} project={project} />
          ))}
        </div>
      </div>
    </section>
  );
}
