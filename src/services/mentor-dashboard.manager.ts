import { fetchClient } from "@/lib/api";
import type { components } from "../../schema-from-be";

export type MentorDashboardSummaryResponse =
  components["schemas"]["MentorDashboardSummaryResponse"];

export class MentorDashboardManager {
  /**
   * Get the dashboard summary for the mentor resolved from the bearer token.
   */
  async getSummary(): Promise<MentorDashboardSummaryResponse> {
    const response = await fetchClient.GET("/api/mentors/dashboard/summary", {});

    if (!response.data) {
      throw new Error("MENTOR_DASHBOARD_INVALID_RESPONSE");
    }

    return response.data;
  }
}

export const mentorDashboardManager = new MentorDashboardManager();
