"use client";

import { X } from "lucide-react";
import { useEffect } from "react";

interface CaseStudyModalProps {
  isOpen: boolean;
  onClose: () => void;
  title: string;
  content: string;
}

export default function CaseStudyModal({
  isOpen,
  onClose,
  title,
  content,
}: CaseStudyModalProps) {
  useEffect(() => {
    if (isOpen) {
      document.body.style.overflow = "hidden";
    } else {
      document.body.style.overflow = "auto";
    }
    return () => {
      document.body.style.overflow = "auto";
    };
  }, [isOpen]);

  if (!isOpen) return null;

  return (
    <div
      className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4"
      onClick={onClose}
    >
      <div
        className="bg-white rounded-xl max-w-2xl w-full max-h-[80vh] overflow-y-auto relative animate-fade-in"
        onClick={(e) => e.stopPropagation()}
      >
        <button
          onClick={onClose}
          className="sticky top-4 right-4 float-right h-8 w-8 flex items-center justify-center rounded-lg hover:bg-bg-alt transition-colors z-10"
          aria-label="Close case study"
        >
          <X size={20} className="text-text-secondary" />
        </button>

        <div className="p-6 md:p-8">
          <h2 className="font-display text-2xl md:text-3xl mb-6">{title}</h2>
          <div className="prose prose-sm max-w-none text-text-secondary leading-relaxed space-y-4">
            {content.split("\n\n").map((paragraph, idx) => {
              if (paragraph.startsWith("## ")) {
                return (
                  <h3
                    key={idx}
                    className="font-display text-lg text-text mt-6 mb-2"
                  >
                    {paragraph.slice(3)}
                  </h3>
                );
              }
              if (paragraph.startsWith("- ")) {
                return (
                  <ul key={idx} className="list-disc list-inside space-y-1">
                    {paragraph
                      .split("\n")
                      .filter((line) => line.startsWith("- "))
                      .map((line, i) => (
                        <li key={i}>{line.slice(2)}</li>
                      ))}
                  </ul>
                );
              }
              return <p key={idx}>{paragraph}</p>;
            })}
          </div>
        </div>
      </div>
    </div>
  );
}
