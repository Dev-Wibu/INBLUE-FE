import { BadgeCheck, ShieldCheck, Users, Zap } from "lucide-react";
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
    <section className="bg-white py-16 dark:bg-slate-950">
      <div className="mx-auto max-w-7xl px-6">
        <div className="overflow-hidden rounded-2xl border border-slate-800 bg-slate-950 text-white dark:bg-slate-900">
          <div className="grid gap-0 lg:grid-cols-[0.9fr_1.1fr]">
            <div className="p-8 sm:p-10">
              <div>
                <div className="mb-5 flex h-11 w-11 items-center justify-center rounded-xl border border-white/10 bg-[#101b2b] text-[#66B2FF]">
                  <ShieldCheck className="h-6 w-6" />
                </div>
                <h2 className="max-w-lg text-3xl font-bold tracking-tight text-balance sm:text-4xl">
                  {t("landingRefactor.trustTitle")}
                </h2>
                <p className="mt-4 max-w-md text-sm leading-6 text-slate-300">
                  {t("landingRefactor.trustDescription")}
                </p>
              </div>
            </div>

            <div className="grid border-t border-white/10 sm:grid-cols-3 lg:border-t-0 lg:border-l">
              {statsData.map((stat) => (
                <div
                  key={stat.label}
                  className="border-b border-white/10 p-6 last:border-b-0 sm:border-r sm:border-b-0 sm:last:border-r-0">
                  <stat.icon className="mb-5 h-5 w-5 text-[#66B2FF]" />
                  <div className="text-3xl font-bold tracking-tight text-white">{stat.value}</div>
                  <div className="mt-2 text-sm leading-6 text-slate-300">{stat.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}
