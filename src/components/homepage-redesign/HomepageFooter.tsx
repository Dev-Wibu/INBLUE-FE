import icon2 from "@/assets/icon2.svg";
import { Facebook, Globe, Linkedin, Mail, Twitter } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-sm text-slate-500 transition-colors hover:text-[#0047AB] dark:text-slate-400 dark:hover:text-[#66B2FF]">
      {children}
    </Link>
  );
}

function SocialLink({ href, label, icon }: { href: string; label: string; icon: React.ReactNode }) {
  return (
    <a
      href={href}
      aria-label={label}
      className="flex h-9 w-9 items-center justify-center rounded-lg border border-slate-200 bg-slate-50 text-slate-500 transition-all hover:border-[#0047AB]/40 hover:bg-[#0047AB]/8 hover:text-[#0047AB] dark:border-slate-700 dark:bg-slate-800 dark:text-slate-400 dark:hover:border-[#66B2FF]/40 dark:hover:bg-[#66B2FF]/10 dark:hover:text-[#66B2FF]">
      {icon}
    </a>
  );
}

export function HomepageFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-900">
      {/* Main Footer Content */}
      <div className="mx-auto max-w-7xl px-6 py-14">
        <div className="grid grid-cols-1 gap-10 sm:grid-cols-2 lg:grid-cols-4">
          {/* Brand Column */}
          <div className="sm:col-span-2 lg:col-span-1">
            <Link to="/" className="mb-4 flex items-center gap-2.5">
              <img src={icon2} alt="INBLUE AI" className="h-9 w-9" />
              <span className="text-lg font-bold tracking-tight text-[#0047AB] dark:text-[#66B2FF]">
                INBLUE AI
              </span>
            </Link>
            <p className="mb-5 max-w-[220px] text-sm leading-relaxed text-slate-500 dark:text-slate-400">
              {t("compHomepageRedesign.practiceInterviewSkillsChallengeAlgorithms")}
            </p>
            <div className="flex gap-2">
              <SocialLink href="#" label="Website" icon={<Globe className="h-4 w-4" />} />
              <SocialLink href="#" label="Facebook" icon={<Facebook className="h-4 w-4" />} />
              <SocialLink href="#" label="LinkedIn" icon={<Linkedin className="h-4 w-4" />} />
              <SocialLink href="#" label="Twitter" icon={<Twitter className="h-4 w-4" />} />
              <SocialLink href="#" label="Email" icon={<Mail className="h-4 w-4" />} />
            </div>
          </div>

          {/* Platform */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Platform</h3>
            <ul className="space-y-2.5">
              <li>
                <FooterLink to="/features/ai-interview">AI Interview</FooterLink>
              </li>
              <li>
                <FooterLink to="/features/mentor-interview">Mentor Interview</FooterLink>
              </li>
              <li>
                <FooterLink to="/enterprise/companies">Companies</FooterLink>
              </li>
              <li>
                <FooterLink to="/questions/bank">Question Bank</FooterLink>
              </li>
            </ul>
          </div>

          {/* Resources */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Resources</h3>
            <ul className="space-y-2.5">
              <li>
                <FooterLink to="/resources/blog">Blog</FooterLink>
              </li>
              <li>
                <FooterLink to="/resources/faq">FAQ</FooterLink>
              </li>
              <li>
                <FooterLink to="/questions/tips">Interview Tips</FooterLink>
              </li>
              <li>
                <FooterLink to="/features/ai-interview">Getting Started</FooterLink>
              </li>
            </ul>
          </div>

          {/* Legal */}
          <div>
            <h3 className="mb-4 text-sm font-semibold text-slate-900 dark:text-white">Legal</h3>
            <ul className="space-y-2.5">
              <li>
                <FooterLink to="#">Privacy Policy</FooterLink>
              </li>
              <li>
                <FooterLink to="#">Terms of Service</FooterLink>
              </li>
              <li>
                <FooterLink to="#">Cookie Policy</FooterLink>
              </li>
              <li>
                <FooterLink to="#">Security</FooterLink>
              </li>
            </ul>
          </div>
        </div>
      </div>

      {/* Bottom Bar */}
      <div className="border-t border-slate-200 dark:border-slate-800">
        <div className="mx-auto flex max-w-7xl flex-col items-center justify-between gap-3 px-6 py-4 sm:flex-row">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} InBlue AI. All rights reserved.
          </p>
          <p className="text-xs text-slate-400 dark:text-slate-500">
            Smart Interview Preparation Platform
          </p>
        </div>
      </div>
    </footer>
  );
}
