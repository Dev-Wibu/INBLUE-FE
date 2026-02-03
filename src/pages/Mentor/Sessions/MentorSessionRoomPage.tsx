/**
 * MentorSessionRoomPage.tsx
 * Active video call room for mentor sessions
 * Route: /mentor/sessions/room/:sessionId
 */

import { AlertCircle, ArrowLeft, Calendar, Clock, User as UserIcon } from "lucide-react";
import { useEffect, useState } from "react";
import { useNavigate, useParams } from "react-router-dom";

import { Alert, AlertDescription, AlertTitle } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { VideoCallProvider, VideoCallRoom } from "@/components/video-call";
import { useJoinSession, useSessionById } from "@/hooks/useSession";
import { useAuthStore } from "@/stores/authStore";

export function MentorSessionRoomPage() {
  const { sessionId } = useParams<{ sessionId: string }>();
  const navigate = useNavigate();
  const user = useAuthStore((state) => state.user);
  const [hasJoinedTracking, setHasJoinedTracking] = useState(false);

  const { data: session, isLoading, error } = useSessionById(Number(sessionId));
  const joinSessionMutation = useJoinSession();

  // Validate session and user
  const canJoin =
    session &&
    (session.status === "SCHEDULED" || session.status === "ONGOING") &&
    session.roomUrl &&
    user;

  // Handle when mentor joins the call (callback from VideoCallRoom)
  const handleJoined = async (participantId: string) => {
    if (hasJoinedTracking || !session?.roomName || !user?.id) return;

    // Track join via API
    await joinSessionMutation.mutateAsync({
      sessionName: session.roomName,
      userId: user.id,
      participantId,
      mentor: true, // Mentor is joining
    });

    setHasJoinedTracking(true);
  };

  // Handle when mentor leaves the call
  const handleLeave = () => {
    navigate("/mentor/sessions");
  };

  // Handle errors from video call
  const handleError = (errorMessage: string) => {
    console.error("Video call error:", errorMessage);
  };

  // Redirect if session is not available
  useEffect(() => {
    if (!isLoading && !session) {
      navigate("/mentor/sessions");
    }
  }, [isLoading, session, navigate]);

  if (isLoading) {
    return (
      <div className="container max-w-6xl py-6">
        <Skeleton className="h-8 w-48" />
        <div className="mt-6 grid gap-6 lg:grid-cols-4">
          <div className="lg:col-span-3">
            <Skeleton className="h-[500px] w-full rounded-lg" />
          </div>
          <div className="lg:col-span-1">
            <Skeleton className="h-48 w-full rounded-lg" />
          </div>
        </div>
      </div>
    );
  }

  if (error || !session) {
    return (
      <div className="container max-w-4xl py-6">
        <Alert variant="destructive">
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Lỗi</AlertTitle>
          <AlertDescription>Không tìm thấy phiên phỏng vấn. Vui lòng thử lại sau.</AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  if (!canJoin) {
    return (
      <div className="container max-w-4xl py-6">
        <Alert>
          <AlertCircle className="h-4 w-4" />
          <AlertTitle>Không thể tham gia</AlertTitle>
          <AlertDescription>
            {session.status === "COMPLETED" && "Phiên phỏng vấn này đã kết thúc."}
            {session.status === "CANCELED" && "Phiên phỏng vấn này đã bị hủy."}
            {!session.roomUrl && "Phòng họp chưa được tạo."}
          </AlertDescription>
        </Alert>
        <Button className="mt-4" variant="outline" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
      </div>
    );
  }

  return (
    <div className="container max-w-6xl py-6">
      {/* Header */}
      <div className="mb-6 flex items-center gap-4">
        <Button variant="ghost" size="sm" onClick={() => navigate(-1)}>
          <ArrowLeft className="mr-2 h-4 w-4" />
          Quay lại
        </Button>
        <h1 className="text-2xl font-bold">Phòng phỏng vấn (Mentor)</h1>
      </div>

      <div className="grid gap-6 lg:grid-cols-4">
        {/* Main Video Area */}
        <div className="lg:col-span-3">
          <VideoCallProvider>
            <VideoCallRoom
              roomUrl={session.roomUrl!}
              userName={user?.name || "Mentor"}
              onLeave={handleLeave}
              onError={handleError}
              onJoined={handleJoined}
              className="min-h-[500px]"
            />
          </VideoCallProvider>
        </div>

        {/* Session Info Sidebar */}
        <div className="lg:col-span-1">
          <Card>
            <CardHeader>
              <CardTitle className="text-lg">Thông tin phiên</CardTitle>
              <CardDescription>Chi tiết buổi phỏng vấn</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              <div className="flex items-center gap-2 text-sm">
                <UserIcon className="text-muted-foreground h-4 w-4" />
                <span>Phòng: {session.roomName}</span>
              </div>
              {session.startTime1 && (
                <div className="flex items-center gap-2 text-sm">
                  <Calendar className="text-muted-foreground h-4 w-4" />
                  <span>
                    {new Date(session.startTime1).toLocaleDateString("vi-VN", {
                      weekday: "long",
                      year: "numeric",
                      month: "long",
                      day: "numeric",
                    })}
                  </span>
                </div>
              )}
              {session.startTime1 && (
                <div className="flex items-center gap-2 text-sm">
                  <Clock className="text-muted-foreground h-4 w-4" />
                  <span>
                    {new Date(session.startTime1).toLocaleTimeString("vi-VN", {
                      hour: "2-digit",
                      minute: "2-digit",
                    })}
                  </span>
                </div>
              )}
              <div className="pt-2">
                <span
                  className={`inline-flex items-center rounded-full px-2 py-1 text-xs font-medium ${
                    session.status === "ONGOING"
                      ? "bg-green-100 text-green-700"
                      : session.status === "SCHEDULED"
                        ? "bg-blue-100 text-blue-700"
                        : "bg-gray-100 text-gray-700"
                  }`}>
                  {session.status === "ONGOING" && "Đang diễn ra"}
                  {session.status === "SCHEDULED" && "Đã lên lịch"}
                </span>
              </div>

              {/* Action buttons for mentor */}
              {session.status === "COMPLETED" && (
                <Button
                  className="mt-4 w-full"
                  onClick={() => navigate(`/mentor/sessions/${sessionId}/feedback`)}>
                  Viết nhận xét
                </Button>
              )}
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
