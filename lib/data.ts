export type Project = {
  title: string;
  tagline: string;
  description?: string;
  tech: string[];
  links: { label: string; url: string }[];
  featured: boolean;
};

export type Article = {
  title: string;
  date: string;
  preview: string;
  url: string;
};

export type ApproachItem = {
  number: string;
  title: string;
  description: string;
};

export const projects: Project[] = [
  {
    title: "Claude Showcase",
    tagline: "A platform for students to share what they've built with Claude.",
    description:
      "Ambassadors needed a central place to highlight student projects — demos were scattered across Slack threads and forgotten Google Docs. I built a showcase platform where students submit builds, browse what others have made, and get inspired to start their own. Shipped it to the ambassador community and received immediate adoption.",
    tech: ["TypeScript", "Next.js", "Vercel"],
    links: [
      { label: "GitHub", url: "https://github.com/manhinwong/claude-showcase" },
    ],
    featured: true,
  },
  {
    title: "AI Toolkit for Venture Capital",
    tagline: "AI-powered deal sourcing and portfolio tools for non-technical investors.",
    description:
      "During my internship at SJF Ventures, no one on the team had an engineering background, and off-the-shelf AI tools didn't fit their workflows. I built a suite of internal tools: a Salesforce automation for logging portfolio updates, an intelligent search engine for deal sourcing, and research assistants that could surface relevant market data. Every tool was designed for people who communicate in insights, not code.",
    tech: ["Python", "JavaScript", "Salesforce API", "Claude API"],
    links: [
      {
        label: "Case Study",
        url: "https://marcusdubs.substack.com/p/i-vibecoded-my-way-through-my-internship",
      },
    ],
    featured: true,
  },
  {
    title: "Personal Finance Assistant",
    tagline: "A conversational interface for understanding your money.",
    description:
      "Integrated the Plaid API to let users connect their bank accounts and ask natural-language questions about their spending, savings, and trends. The goal was to make financial data feel approachable — something you talk to, not a spreadsheet you stare at.",
    tech: ["Next.js", "Plaid API", "Claude API", "Supabase"],
    links: [],
    featured: true,
  },
  {
    title: "Postcards",
    tagline: "A web app for creating personalized digital postcards with photos and messages.",
    tech: ["JavaScript", "Next.js"],
    links: [
      { label: "GitHub", url: "https://github.com/manhinwong/postcards-demo" },
    ],
    featured: false,
  },
  {
    title: "BubuPass",
    tagline: "Maps and games for finding Labubus on Snackpass.",
    tech: ["TypeScript"],
    links: [
      { label: "GitHub", url: "https://github.com/manhinwong/bubupass" },
    ],
    featured: false,
  },
  {
    title: "Hydration Reminder",
    tagline: "A simple app that tracks your water intake and nudges you to drink more.",
    tech: ["JavaScript"],
    links: [
      {
        label: "GitHub",
        url: "https://github.com/manhinwong/hydration-reminder",
      },
    ],
    featured: false,
  },
];

export const articles: Article[] = [
  {
    title: "Yes, Even You Can Become Technical",
    date: "November 2025",
    preview:
      "My experience going from building no apps to building side projects every other week. A guide to when vibecoding works, when it breaks down, and the full stack I use to ship fast.",
    url: "https://marcusdubs.substack.com/p/yes-even-you-can-become-technical",
  },
  {
    title: "I Vibecoded My Way Through My Internship",
    date: "September 2025",
    preview:
      "Lessons from building AI tools at a venture capital firm where no one else had an engineering background. On choosing the right tech stack, prompt engineering as a skill, and building for the customer.",
    url: "https://marcusdubs.substack.com/p/i-vibecoded-my-way-through-my-internship",
  },
];

export const approachItems: ApproachItem[] = [
  {
    number: "01",
    title: "Observe first, build second",
    description:
      "As a campus ambassador, I see what confuses and excites users every week. Every project starts with a real pattern — a pain point someone mentioned at a demo, a workflow that clearly isn't working, a question students keep asking. The best products come from paying attention before opening a code editor.",
  },
  {
    number: "02",
    title: "Ship fast, learn faster",
    description:
      "Vibecoding collapses the feedback loop. I prototype in hours, put it in front of users, and iterate that same night. The code quality doesn't matter if the product is wrong — but once people are actually using something, that's when you invest in making it solid. Be wrong fast so you can be right faster.",
  },
  {
    number: "03",
    title: "Build for the person, not the prompt",
    description:
      "My best work has been for non-technical users — investors, students, community members — who need AI to feel like a natural extension of their existing workflow. If someone has to think about the technology, you've already lost them. The interface should disappear.",
  },
];

export const socialLinks = [
  { label: "GitHub", url: "https://github.com/manhinwong" },
  { label: "Substack", url: "https://marcusdubs.substack.com" },
  { label: "LinkedIn", url: "https://linkedin.com/in/marcusmhwong" },
  { label: "X", url: "https://x.com/marcusmhwong" },
  { label: "Email", url: "mailto:marcusmhwong@gmail.com" },
];
