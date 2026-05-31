import { CommunityFeedPage } from "@/components/post";
import { useTranslation } from "react-i18next";
export function HomeFeedPage() {
  const { t } = useTranslation();
  return (
    <CommunityFeedPage
      title={t("common.home")}
      description={t("common.updateTheLatestPostsFromTheCommuni")}
    />
  );
}
