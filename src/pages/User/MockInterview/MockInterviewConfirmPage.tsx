/**
 * MockInterviewConfirmPage - redirects to schedule page
 * The confirmation step is now part of the redesigned scheduling flow.
 */

import { useEffect } from "react";
import { useNavigate } from "react-router-dom";

export function MockInterviewConfirmPage() {
  const navigate = useNavigate();

  useEffect(() => {
    navigate("/dashboard/mock-interview/schedule", { replace: true });
  }, [navigate]);

  return null;
}
