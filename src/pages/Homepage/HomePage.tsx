import {
  CompanyGridSection,
  EnhancedStatsSection,
  HomepageFooter,
  HomepageHeader,
  HomepageHero,
  JobSearchSection,
} from "@/components/homepage-redesign";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { TestimonialCarousel } from "@/components/ui/testimonial-carousel";
import { useHomepageInterviewModes } from "@/constants/homepage";
import { CheckCircle2, FileText, Mic, Video } from "lucide-react";
import { useTranslation } from "react-i18next";
export function HomePage() {
  const { t } = useTranslation();
  const homepageInterviewModes = useHomepageInterviewModes();
  return (
    <div className="relative w-full overflow-hidden bg-white dark:bg-slate-950">
      {/* Header - Homepage Redesign with 3 main menus */}
      <HomepageHeader />

      {/* Hero Section - New design from Stitch */}
      <HomepageHero />

      {/* Job Search Section with 3D hover effect */}
      <JobSearchSection />

      {/* Company Grid Section */}
      <CompanyGridSection />

      {/* Enhanced Stats Section */}
      <EnhancedStatsSection />

      {/* Interview Styles Section */}
      <section className="relative w-full bg-white py-16 dark:bg-slate-950">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-4 dark:border-slate-700 dark:text-slate-300">
              {t("common.interviewMode")}
            </Badge>
            <h2 className="mb-3 text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl dark:text-white">
              {t("homepageHomepage.chooseYourInterviewStyle")}
            </h2>
            <p className="mx-auto max-w-2xl text-sm text-slate-600 dark:text-slate-400">
              {t("homepageHomepage.practiceInterviewingInTheWay")}
            </p>
          </div>

          <div className="grid gap-5 md:grid-cols-3">
            {homepageInterviewModes.map((mode) => (
              <Card
                key={mode.id}
                className="group cursor-pointer transition-all hover:border-[#007BFF]/50 hover:shadow-xl dark:border-slate-700 dark:bg-slate-900">
                <CardHeader className="pb-3">
                  <div className="mb-2 flex h-14 w-14 items-center justify-center rounded-xl bg-[#DCEEFF] transition-colors group-hover:bg-[#A5C8F2] dark:bg-[#0047AB]/30 dark:group-hover:bg-[#0047AB]/50">
                    {mode.icon === "text" && (
                      <FileText className="h-7 w-7 text-[#0047AB] dark:text-[#66B2FF]" />
                    )}
                    {mode.icon === "mic" && (
                      <Mic className="h-7 w-7 text-[#0047AB] dark:text-[#66B2FF]" />
                    )}
                    {mode.icon === "video" && (
                      <Video className="h-7 w-7 text-[#0047AB] dark:text-[#66B2FF]" />
                    )}
                  </div>
                  <CardTitle className="text-lg dark:text-white">{mode.title}</CardTitle>
                  <CardDescription className="text-xs dark:text-slate-400">
                    {mode.description}
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <ul className="space-y-2">
                    {mode.benefits.map((benefit, index) => (
                      <li
                        key={index}
                        className="flex items-start gap-2 text-sm text-slate-600 dark:text-slate-400">
                        <CheckCircle2 className="mt-0.5 h-4 w-4 shrink-0 text-green-500" />
                        {benefit}
                      </li>
                    ))}
                  </ul>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      </section>

      {/* Testimonials Section */}
      <section className="relative w-full bg-slate-50 py-16 dark:bg-slate-900/50">
        <div className="mx-auto max-w-7xl px-6">
          <div className="mb-10 text-center">
            <Badge variant="outline" className="mb-4 dark:border-slate-700 dark:text-slate-300">
              {t("common.evaluate")}
            </Badge>
            <h2 className="text-2xl font-bold tracking-tight text-slate-900 lg:text-3xl dark:text-white">
              {t("homepageHomepage.whatDoPeopleSayAbout")}
            </h2>
          </div>
          <div className="mt-8">
            <TestimonialCarousel
              testimonials={[
                {
                  id: 1,
                  name: t("common.nguyenPhamThuHa"),
                  role: t("common.roleSoftwareEngineering"),
                  content: t("common.testimonialHaContent"),
                  avatar: null,
                  rating: 5,
                },
                {
                  id: 2,
                  name: t("homepageHomepage.tranMinhDuc"),
                  role: t("common.roleDataScience"),
                  content: t("common.testimonialDucContent"),
                  avatar: null,
                  rating: 5,
                },
                {
                  id: 3,
                  name: t("common.leThiMaiAnh"),
                  role: t("common.roleProductManagement"),
                  content: t("common.testimonialAnhContent"),
                  avatar: null,
                  rating: 5,
                },
                {
                  id: 4,
                  name: t("common.phamVanHung"),
                  role: t("common.roleFrontendDeveloper"),
                  content: t("common.phamVanHungTestimonial"),
                  avatar: null,
                  rating: 5,
                },
                {
                  id: 5,
                  name: t("common.hoangThiLinh"),
                  role: t("common.roleUxDesigner"),
                  content: t("common.designInterviewQuestionsAreDifficult"),
                  avatar: null,
                  rating: 4,
                },
                {
                  id: 6,
                  name: t("homepageHomepage.ngoDinhKhoa"),
                  role: t("common.roleBackendEngineer"),
                  content: t("common.aiInterviewHelpsMeBeMuchMoreConfi"),
                  avatar: null,
                  rating: 5,
                },
              ]}
              speed={40}
              pauseOnHover={true}
              className="py-4"
            />
          </div>
        </div>
      </section>

      {/* Footer - Homepage Redesign */}
      <HomepageFooter />
    </div>
  );
}
