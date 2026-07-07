import { BadgeCheck, Users, Zap } from "lucide-react";
import { useTranslation } from "react-i18next";

export function EnhancedStatsSection() {
  const { t } = useTranslation();

  const statsData = [
    {
      value: "15,000+",
      label: t("compHomepageRedesign.studentsParticipated"),
      icon: Users,
    },
    {
      value: "450+",
      label: t("compHomepageRedesign.interviewScript"),
      icon: BadgeCheck,
    },
    {
      value: "98%",
      label: t("compHomepageRedesign.positiveResponseRate"),
      icon: Zap,
    },
  ];

  return (
    <section className="mx-auto max-w-7xl px-6 py-20">
      <div className="relative overflow-hidden rounded-2xl border border-[#0047AB]/12 bg-gradient-to-br from-white to-[#DCEEFF]/20 p-10 shadow-sm dark:border-[#66B2FF]/15 dark:from-[#0a1628] dark:to-[#0047AB]/10">
        {/* Subtle background decoration */}
        <div className="pointer-events-none absolute inset-0 -z-10">
          <div className="absolute -top-24 -right-24 h-80 w-80 rounded-full bg-[#0047AB]/6 blur-3xl dark:bg-[#66B2FF]/8" />
          <div className="absolute -bottom-24 -left-24 h-80 w-80 rounded-full bg-[#007BFF]/6 blur-3xl dark:bg-[#007BFF]/8" />
        </div>

        <div className="flex flex-col items-center gap-10 md:flex-row md:items-stretch md:justify-around">
          {statsData.map((stat, idx) => (
            <div key={stat.label} className="group flex flex-1 flex-col items-center text-center">
              {idx < statsData.length - 1 && (
                <div className="mb-8 hidden h-px w-full bg-[#0047AB]/10 md:mt-6 md:mr-auto md:mb-0 md:ml-0 md:h-20 md:w-px md:self-auto" />
              )}
              <div className="mb-4 flex h-12 w-12 items-center justify-center rounded-xl bg-[#0047AB]/10 transition-transform duration-300 group-hover:scale-110 dark:bg-[#0047AB]/20">
                <stat.icon className="h-6 w-6 text-[#0047AB] dark:text-[#66B2FF]" />
              </div>
              <div className="mb-2 text-4xl font-bold tracking-tight text-[#0047AB] dark:text-[#66B2FF]">
                {stat.value}
              </div>
              <div className="text-sm leading-relaxed font-medium text-slate-500 dark:text-slate-400">
                {stat.label}
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}
