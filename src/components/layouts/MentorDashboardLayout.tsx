import { Outlet } from "react-router-dom";

import { MentorSidebar } from "./MentorSidebar";

export function MentorDashboardLayout() {
  return (
    <div className="flex min-h-screen bg-white dark:bg-slate-950">
      <MentorSidebar />
      <main className="flex-1 overflow-auto p-6">
        <Outlet />
      </main>
    </div>
  );
}
