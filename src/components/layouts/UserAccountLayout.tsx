import { Outlet } from "react-router-dom";

import { HomepageHeader } from "@/components/homepage-redesign";

export function UserAccountLayout() {
  return (
    <div className="bg-background flex min-h-screen flex-col dark:bg-slate-950">
      <HomepageHeader />
      <main className="flex flex-1 pt-16">
        <div className="w-full">
          <Outlet />
        </div>
      </main>
    </div>
  );
}
