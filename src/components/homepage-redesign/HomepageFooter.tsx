import icon2 from "@/assets/icon2.svg";
import { ArrowRight, Mail } from "lucide-react";
import { useTranslation } from "react-i18next";
import { Link } from "react-router-dom";

function FooterLink({ to, children }: { to: string; children: React.ReactNode }) {
  return (
    <Link
      to={to}
      className="text-sm text-slate-500 transition-colors duration-200 hover:text-[#0047AB] dark:text-slate-400 dark:hover:text-[#66B2FF]">
      {children}
    </Link>
  );
}

export function HomepageFooter() {
  const { t } = useTranslation();
  return (
    <footer className="border-t border-slate-200 bg-white dark:border-slate-800 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6 py-12">
        <div className="grid gap-10 lg:grid-cols-[1.2fr_2fr]">
          <div>
            <Link to="/" className="mb-4 flex items-center gap-2.5">
              <img src={icon2} alt="INBLUE AI" className="h-9 w-9" />
              <span className="text-lg font-bold tracking-tight text-[#0047AB] dark:text-[#66B2FF]">
                INBLUE AI
              </span>
            </Link>
            <p className="max-w-sm text-sm leading-7 text-slate-500 dark:text-slate-400">
              {t("compHomepageRedesign.practiceInterviewSkillsChallengeAlgorithms")}
            </p>
            <a
              href="mailto:hello@inblue.ai"
              className="mt-5 inline-flex items-center gap-2 text-sm font-semibold text-slate-700 transition-colors hover:text-[#0047AB] dark:text-slate-200 dark:hover:text-[#66B2FF]">
              <Mail className="h-4 w-4" />
              hello@inblue.ai
            </a>
          </div>

          <div className="grid gap-8 sm:grid-cols-3">
            <div>
              <h3 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">Platform</h3>
              <ul className="space-y-3">
                <li>
                  <FooterLink to="/features/ai-interview">AI Interview</FooterLink>
                </li>
                <li>
                  <FooterLink to="/features/mentor-interview">Mentor Interview</FooterLink>
                </li>
                <li>
                  <FooterLink to="/enterprise/companies">
                    {t("homepageFooter.linksCompanies", "Companies")}
                  </FooterLink>
                </li>
              </ul>
            </div>

            <div>
              <h3 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">Resources</h3>
              <ul className="space-y-3">
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

            <div>
              <h3 className="mb-4 text-sm font-bold text-slate-950 dark:text-white">Start</h3>
              <ul className="space-y-3">
                <li>
                  <FooterLink to="/login">{t("common.logIn")}</FooterLink>
                </li>
                <li>
                  <FooterLink to="/signup">{t("common.register")}</FooterLink>
                </li>
                <li>
                  <FooterLink to="/enterprise/companies">{t("common.company")}</FooterLink>
                </li>
              </ul>
            </div>
          </div>
        </div>

        <div className="mt-10 flex flex-col justify-between gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center dark:border-slate-800">
          <p className="text-sm text-slate-400 dark:text-slate-500">
            &copy; {new Date().getFullYear()} INBLUE AI. All rights reserved.
          </p>
          <Link
            to="/signup"
            className="group inline-flex items-center text-sm font-semibold text-[#0047AB] dark:text-[#66B2FF]">
            {t("common.register")}
            <ArrowRight className="ml-2 h-4 w-4 transition-transform group-hover:translate-x-1" />
          </Link>
        </div>
      </div>
    </footer>
  );
}
