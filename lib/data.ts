export type Project = {
  title: string;
  tagline: string;
  description?: string;
  tech: string[];
  links: { label: string; url: string }[];
  demoVideoUrl?: string;
  featured: boolean;
  caseStudy?: string;
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
    title: "AI Toolkit for Venture Capital",
    tagline: "AI-powered deal sourcing and workflow automation for investors.",
    description:
      "During my internship at SJF Ventures, no one on the team had an engineering background, and off-the-shelf AI tools didn't fit their workflows. I built a suite of internal tools: a Salesforce automation for logging portfolio updates, an intelligent search engine for deal sourcing, and research assistants that could surface relevant market data. I even developed prototypes and recommendations for new AI features for some of our portfolio companies. Every tool was designed for people who communicate in insights, not code.",
    tech: ["Python", "JavaScript", "Salesforce API", "OpenAI Deep Research API", "Langchain", "Zapier"],
    links: [
      {
        label: "Case Study",
        url: "https://marcusdubs.substack.com/p/i-vibecoded-my-way-through-my-internship",
      },
    ],
    featured: true,
  },
  {
    title: "ChatCHW - AI Health Assistant for Community Workers",
    tagline: "Making healthcare information accessible for frontline community health workers.",
    description:
      "Built an AI-powered health assistant for community health workers (CHWs) serving underserved populations. The system helps CHWs access medical information, answer patient questions, and navigate healthcare resources in real-time. Designed for users with limited technical literacy and unreliable internet access, prioritizing clarity and offline functionality over feature complexity.",
    tech: ["Python", "OpenAI API", "Pinecone", "Groq", "React"],
    links: [
      { label: "GitHub", url: "https://github.com/mabhi02/ChatCHW" },
    ],
    featured: true,
    caseStudy: `My most formative technical experience came through the ChatCHW project under Professor David Levine, where I built a mobile diagnostic tool for Community Health Workers in rural India with fellow researchers. I knew nothing about CHWs, maternal healthcare protocols, or complex app development when I started. But the project demanded I learn quickly.

The work required constant iteration informed by questions I didn't know to ask initially. I spent hours talking to the user research team: How do CHWs want symptom information presented? What's the cognitive load of a multi-page survey versus a chat interface on a 2G connection? I pestered our AI team about their model's training data and output formats so I could design the interface around realistic constraints, not idealized ones. I asked Professor Levine which diagnostic features mattered most when we inevitably had to cut scope.

Midway through development, we realized our carefully designed multi-page survey interface fundamentally didn't work with our small language model's conversational output. Rather than accept the sunk cost of weeks of work, I pushed back on the team's initial impulse to scale it anyway. I asked Professor Levine which diagnostic features actually mattered, the uncomfortable question that forced us to redesign from scratch. It was frustrating to scrap weeks of work, but the revised design we ended up with better served both the CHWs and the technical constraints we faced. That willingness to surface problems early, push back on flawed assumptions, and ask uncomfortable questions became essential to how I approach building AI products.`,
  },
  {
    title: "Claude Showcase",
    tagline: "A platform for students to share what they've built with Claude.",
    description:
      "Ambassadors needed a central place to highlight student projects — demos were scattered across Slack threads and forgotten Google Docs. I built a showcase platform where students submit builds, browse what others have made, and get inspired to start their own. Shipped it to the ambassador community and received immediate adoption.",
    tech: ["TypeScript", "Next.js", "Vercel", "Upstash", "Claude Code"],
    demoVideoUrl: "https://www.loom.com/share/2a3b92969376446b927bda003a001068",
    links: [
      { label: "GitHub", url: "https://github.com/manhinwong/claude-showcase" },
    ],
    featured: true,
  },
  {
    title: "Postcards",
    tagline: "A tool for sending personalized, storybook-style postcards to friends. ",
    description:
      'Maintaining close friendships after college is hard — everyone gets busy and "we should catch up" rarely turns into anything real. I wanted a way to reach out that felt intentional and personal, not just another DM. I built a digital postcard generator where each recipient gets a unique link to a storybook-style experience with pages for life updates, thoughtful questions, and shared memories. Shipped it to a close friend and it sparked a real conversation for the first time in months.',
    tech: ["JavaScript", "Next.js", "Vercel", "Claude Code", "Upstash"],
    demoVideoUrl: "https://www.loom.com/share/806fb18140194bb2997cd51289c8c422",
    links: [
      { label: "GitHub", url: "https://github.com/manhinwong/postcards-demo" },
      { label: "Live Demo", url: "https://postcards-demo.vercel.app/" },
    ],
    featured: true,
  },
  {
    title: "Personal Finance Assistant",
    tagline: "A conversational interface for understanding your money.",
    description:
      "Integrated the Plaid API (sandbox, not production) to let users connect their bank accounts and ask natural-language questions about their spending, savings, and trends. The goal was to make financial data feel approachable — something you talk to, not a spreadsheet you stare at.",
    tech: ["Next.js", "Plaid API", "Claude Code", "Vercel"],
    links: [
      { label: "Live Demo", url: "https://live-budget-tracker.vercel.app/" },
    ],
    featured: false,
  },
  {
    title: "StudentPass",
    tagline: "Student discounts, simplified.",
    tech: ["Vercel", "Claude Code", "Claude Skills"],
    links: [{ label: "Live Demo", url: "https://www.studentpass.live/" }],
    featured: false,
  },
  {
    title: "Knowledge Engine",
    tagline: "A dashboard for exploring a knowledge graph.",
    tech: ["Claude API", "Claude SDK", "Vercel"],
    links: [{ label: "Live Demo", url: "https://knowledge-engine.fly.dev/dashboard" }],
    featured: false,
  },
  {
    title: "BubuPass",
    tagline: "Maps and games on Snackpass with Labubus.",
    tech: ["TypeScript", "Claude Code", "Figma Make"],
    links: [
      { label: "GitHub", url: "https://github.com/manhinwong/bubupass" },
    ],
    featured: false,
  },
  {
    title: "Hydration Reminder",
    tagline: "A simple app that tracks your water intake and nudges you to drink more.",
    tech: ["JavaScript", "Electron", "Claude Code"
    ],
    links: [
      {
        label: "GitHub",
        url: "https://github.com/manhinwong/hydration-reminder",
      },
    ],
    featured: false,
  }
  
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
