import Nav from "@/components/Nav";
import Hero from "@/components/Hero";
import About from "@/components/About";
import Projects from "@/components/Projects";
import Writing from "@/components/Writing";
import Approach from "@/components/Approach";
import Contact from "@/components/Contact";

export default function Home() {
  return (
    <>
      <Nav />
      <main>
        <Hero />
        <About />
        <Projects />
        <Writing />
        <Approach />
        <Contact />
      </main>
    </>
  );
}
