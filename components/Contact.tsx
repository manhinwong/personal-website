"use client";

import SocialLinks from "./SocialLinks";
import { useInView } from "./useInView";

export default function Contact() {
  const { ref, isInView } = useInView();

  return (
    <section
      id="contact"
      ref={ref as React.RefObject<HTMLElement>}
      className={`px-6 py-24 md:py-32 bg-bg-alt ${isInView ? "animate-fade-in-up" : "opacity-0"}`}
    >
      <div className="mx-auto max-w-[720px] text-center">
        <h2 className="font-display text-3xl md:text-4xl mb-4">
          Let&apos;s talk.
        </h2>
        <p className="text-text-secondary text-lg mb-2">
          I&apos;m currently looking for full-time Applied AI and Product roles
          starting June 2026.
        </p>
        <a
          href="mailto:marcusmhwong@gmail.com"
          className="text-accent hover:text-accent-hover transition-colors text-lg"
        >
          marcusmhwong@gmail.com
        </a>

        <div className="mt-8 flex justify-center">
          <SocialLinks />
        </div>

        <p className="mt-16 text-sm text-text-secondary">
          Built with Next.js and Claude Code. &copy; 2026 Marcus Wong.
        </p>
      </div>
    </section>
  );
}
