import {
  Bot,
  CircleHelp,
  Cpu,
  LayoutDashboard,
  LogOut,
  MessageSquare,
  User,
  Users,
} from "lucide-react";
import { Link, useLocation } from "react-router-dom";

const menuItems = [
  {
    label: "Tổng quan",
    icon: LayoutDashboard,
    path: "/dashboard",
  },
  {
    label: "Phỏng vấn với Mentor",
    icon: Users,
    path: "/dashboard/mock-interview",
  },
  {
    label: "Phỏng vấn với AI",
    icon: Bot,
    path: "/dashboard/ai-interview",
  },
  {
    label: "AI Chat",
    icon: MessageSquare,
    path: "/dashboard/ai-chat",
  },
  {
    label: "Bộ câu hỏi",
    icon: CircleHelp,
    path: "/dashboard/questions",
  },
  {
    label: "Tài khoản",
    icon: User,
    path: "/dashboard/account",
  },
];

export function Sidebar() {
  const location = useLocation();

  const isActive = (path: string) => {
    return location.pathname === path || location.pathname.startsWith(path + "/");
  };

  return (
    <aside className="flex h-screen w-72 flex-col border-r border-slate-100 bg-slate-50">
      {/* Logo */}
      <div className="flex h-16 items-center gap-2 border-b border-slate-100 px-6">
        <div className="flex h-9 w-9 items-center justify-center rounded-lg bg-gradient-to-br from-[#0047AB] to-[#007BFF]">
          <Cpu className="h-5 w-5 text-white" />
        </div>
        <span className="text-lg font-bold text-[#002654]">INBLUE AI</span>
      </div>

      {/* Navigation */}
      <nav className="flex flex-1 flex-col gap-1 px-3 py-4">
        {menuItems.map((item) => {
          const Icon = item.icon;
          const active = isActive(item.path);
          return (
            <Link
              key={item.path}
              to={item.path}
              className={`flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors ${
                active
                  ? "bg-[#0047AB]/10 text-[#0047AB]"
                  : "text-slate-600 hover:bg-slate-100 hover:text-slate-900"
              }`}>
              <Icon className={`h-5 w-5 ${active ? "text-[#0047AB]" : "text-slate-500"}`} />
              <span>{item.label}</span>
            </Link>
          );
        })}
      </nav>

      {/* Logout button */}
      <div className="border-t border-slate-100 p-3">
        <button className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-slate-600 transition-colors hover:bg-slate-100 hover:text-slate-900">
          <LogOut className="h-5 w-5 text-slate-500" />
          <span>Đăng xuất</span>
        </button>
      </div>
    </aside>
  );
}
