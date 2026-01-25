import { Outlet } from "react-router-dom";

import { NotificationBell } from "@/components/notification";
import { MentorSidebar } from "./MentorSidebar";

export function MentorDashboardLayout() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      <MentorSidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with NotificationBell */}
        <header className="flex h-14 items-center justify-end gap-4 border-b border-emerald-100 px-6 dark:border-slate-800">
          <NotificationBell notificationsPath="/mentor/notifications" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
