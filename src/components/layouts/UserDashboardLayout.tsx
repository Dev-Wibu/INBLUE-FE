import { Outlet } from "react-router-dom";

import { NotificationBell } from "@/components/notification";
import { Sidebar } from "./Sidebar";

export function UserDashboardLayout() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      <Sidebar />
      <div className="flex flex-1 flex-col overflow-hidden">
        {/* Header with NotificationBell */}
        <header className="flex h-14 items-center justify-end gap-4 border-b border-slate-100 px-6 dark:border-slate-800">
          <NotificationBell notificationsPath="/dashboard/notifications" />
        </header>
        <main className="flex-1 overflow-auto p-6">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
