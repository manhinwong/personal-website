import SocialLinks from "./SocialLinks";

export default function Hero() {
  return (
    <section id="hero" className="px-6 pt-32 pb-24 md:pt-40 md:pb-32">
      <div className="mx-auto max-w-[720px]">
        <p className="text-accent font-mono text-sm mb-4 tracking-wide">
          &bull; Hello
        </p>
        <h1 className="font-display text-[clamp(2.5rem,5vw,4rem)] leading-[1.1] mb-6">
          Marcus Wong
        </h1>
        <p className="text-xl md:text-2xl text-text-secondary leading-relaxed mb-4 max-w-lg">
          I build AI products that close the gap between capability and
          adoption.
        </p>
        <p className="text-text-secondary mb-8">
          UC Berkeley &apos;26 · Data Science and Economics
          <br />
          Anthropic Campus Ambassador · Prev. SJF Ventures, Doordash
        </p>
        <SocialLinks />
      </div>
    </section>
  );
}
