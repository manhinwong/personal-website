"use client";

import { useInView } from "./useInView";

export default function About() {
  const { ref, isInView } = useInView();

  return (
    <section
      id="about"
      ref={ref as React.RefObject<HTMLElement>}
      className={`px-6 py-24 md:py-32 ${isInView ? "animate-fade-in-up" : "opacity-0"}`}
    >
      <div className="mx-auto max-w-[720px] space-y-6 text-lg leading-[1.75] text-text-secondary">
        <p className="text-xl text-text font-medium">
          I&apos;ve spent two years at the intersection of AI product
          development and user adoption.
        </p>
        <p>
          As an Anthropic Campus Ambassador at UC Berkeley, I run the frontline
          of how students discover and use Claude — organizing workshops,
          hackathons, and demos for hundreds of students. That work gives me
          pattern recognition most builders don&apos;t have: I see what excites
          new users, what confuses them, and where the gap between a
          model&apos;s capabilities and someone&apos;s actual workflow becomes a
          wall.
        </p>
        <p>
          At SJF Ventures, I built AI tools for investors who had never touched
          a terminal — Salesforce automations, intelligent search engines for
          deal sourcing, and portfolio monitoring systems. The constraint was
          always the same: if the person using this can&apos;t understand it in
          30 seconds, it doesn&apos;t matter how good the code is.
        </p>
        <p>
          Now I build my own products. I prototype fast, test with real users,
          and iterate the same night. Every project below started with a pattern
          I noticed and a question I couldn&apos;t stop thinking about.
        </p>
      </div>
    </section>
  );
}
