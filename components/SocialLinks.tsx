import { Github, Mail, Linkedin, ExternalLink } from "lucide-react";
import { socialLinks } from "@/lib/data";

const iconMap: Record<string, React.ReactNode> = {
  GitHub: <Github size={18} />,
  Substack: <ExternalLink size={18} />,
  LinkedIn: <Linkedin size={18} />,
  X: (
    <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor">
      <path d="M18.244 2.25h3.308l-7.227 8.26 8.502 11.24H16.17l-5.214-6.817L4.99 21.75H1.68l7.73-8.835L1.254 2.25H8.08l4.713 6.231zm-1.161 17.52h1.833L7.084 4.126H5.117z" />
    </svg>
  ),
  Email: <Mail size={18} />,
};

export default function SocialLinks() {
  return (
    <div className="flex flex-wrap gap-5">
      {socialLinks.map((link) => (
        <a
          key={link.label}
          href={link.url}
          target={link.label === "Email" ? undefined : "_blank"}
          rel={link.label === "Email" ? undefined : "noopener noreferrer"}
          className="flex items-center gap-1.5 text-sm text-text-secondary hover:text-accent transition-colors"
        >
          {iconMap[link.label]}
          <span>{link.label}</span>
        </a>
      ))}
    </div>
  );
}
