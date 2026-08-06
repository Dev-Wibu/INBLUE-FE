import {
  AnxietyReliefStrip,
  FeedbackActionSection,
  FinalLandingCta,
  HomepageFooter,
  HomepageHeader,
  InterviewMapSection,
  NewHomepageHero,
  PracticeBeforePressureSection,
  SimpleTestimonials,
  StartingPointSection,
} from "@/components/homepage-redesign";

export function HomePage() {
  return (
    <div className="relative w-full overflow-hidden bg-white text-slate-950 dark:bg-slate-950 dark:text-white">
      <HomepageHeader />
      <main>
        <NewHomepageHero />
        <AnxietyReliefStrip />
        <InterviewMapSection />
        <PracticeBeforePressureSection />
        <FeedbackActionSection />
        <StartingPointSection />
        <SimpleTestimonials />
        <FinalLandingCta />
      </main>
      <HomepageFooter />
    </div>
  );
}
