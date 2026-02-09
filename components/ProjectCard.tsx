import { ArrowUpRight } from "lucide-react";
import type { Project } from "@/lib/data";

export default function ProjectCard({ project }: { project: Project }) {
  if (project.featured) {
    return (
      <div className="bg-white border border-border rounded-xl p-6 md:p-8 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
        <h3 className="font-display text-xl md:text-2xl mb-2">
          {project.title}
        </h3>
        <p className="text-accent italic mb-3">{project.tagline}</p>
        {project.description && (
          <p className="text-text-secondary leading-relaxed mb-4">
            {project.description}
          </p>
        )}
        <div className="flex flex-wrap gap-2 mb-4">
          {project.tech.map((t) => (
            <span
              key={t}
              className="font-mono text-xs px-2.5 py-1 rounded-md bg-tag-bg text-tag-text"
            >
              {t}
            </span>
          ))}
        </div>
        {project.links.length > 0 && (
          <div className="flex gap-4">
            {project.links.map((link) => (
              <a
                key={link.url}
                href={link.url}
                target="_blank"
                rel="noopener noreferrer"
                className="text-sm text-text-secondary hover:text-accent transition-colors flex items-center gap-1"
              >
                {link.label}
                <ArrowUpRight size={14} />
              </a>
            ))}
          </div>
        )}
      </div>
    );
  }

  return (
    <div className="bg-white border border-border rounded-xl p-5 hover:-translate-y-0.5 hover:shadow-lg transition-all duration-200">
      <h3 className="font-display text-lg mb-1">{project.title}</h3>
      <p className="text-text-secondary text-sm mb-3">{project.tagline}</p>
      <div className="flex flex-wrap gap-2 mb-3">
        {project.tech.map((t) => (
          <span
            key={t}
            className="font-mono text-xs px-2 py-0.5 rounded-md bg-tag-bg text-tag-text"
          >
            {t}
          </span>
        ))}
      </div>
      {project.links.length > 0 && (
        <div className="flex gap-3">
          {project.links.map((link) => (
            <a
              key={link.url}
              href={link.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-sm text-text-secondary hover:text-accent transition-colors flex items-center gap-1"
            >
              {link.label}
              <ArrowUpRight size={14} />
            </a>
          ))}
        </div>
      )}
    </div>
  );
}
