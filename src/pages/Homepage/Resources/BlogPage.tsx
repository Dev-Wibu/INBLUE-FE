import { HomepageFooter, HomepageHeader } from "@/components/homepage-redesign";
import { BlogFeedPage } from "@/components/post/feed/BlogFeedPage";
import { useTranslation } from "react-i18next";
export function BlogPage() {
  const { t } = useTranslation();
  return (
    <div className="relative min-h-screen w-full bg-white dark:bg-slate-950">
      <HomepageHeader />

      <main className="mx-auto max-w-2xl space-y-5 px-4 pt-20 pb-10">
        <BlogFeedPage
          title={t("general.feed")}
          description={t("common.updateTheLatestPostsFromTheCommuni")}
        />
      </main>

      <HomepageFooter />
    </div>
  );
}
