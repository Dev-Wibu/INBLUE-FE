import { Navigate, useLocation, useParams } from "react-router-dom";

/** Backward-compatible entry point for old review links. */
export function WriteFeedbackPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const location = useLocation();

  return (
    <Navigate to={`/mentor/sessions/${sessionId}/review/view`} replace state={location.state} />
  );
}
