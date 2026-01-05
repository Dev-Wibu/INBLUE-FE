import { ChevronDown, Cpu } from "lucide-react";
import { Link } from "react-router-dom";

import { Button } from "@/components/ui/button";

export function Header() {
  return (
    <header className="sticky top-0 z-50 w-full border-b border-slate-100 bg-white/95 backdrop-blur-md">
      <div className="mx-auto flex h-16 max-w-7xl items-center justify-between px-6">
        {/* Logo Section */}
        <Link to="/" className="flex items-center gap-2 transition-opacity hover:opacity-80">
          <div className="flex h-10 w-10 items-center justify-center rounded-lg bg-gradient-to-br from-[#0047AB] to-[#007BFF] shadow-sm">
            <Cpu className="h-6 w-6 text-white" />
          </div>
          <span className="text-lg font-bold tracking-tight text-[#002654]">INBLUE AI</span>
        </Link>

        {/* Navigation */}
        <nav className="hidden items-center gap-6 md:flex">
          <button className="flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-[#0047AB]">
            <span>Câu hỏi</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-[#0047AB]">
            <span>Tính năng</span>
            <ChevronDown className="h-4 w-4" />
          </button>
          <button className="flex items-center gap-1 text-sm font-medium text-slate-600 transition-colors hover:text-[#0047AB]">
            <span>Tài nguyên</span>
            <ChevronDown className="h-4 w-4" />
          </button>
        </nav>

        {/* Auth Buttons */}
        <div className="flex items-center gap-3">
          <Button variant="ghost" className="text-slate-600" asChild>
            <Link to="/login">Đăng nhập</Link>
          </Button>
          <Button
            className="rounded-full bg-gradient-to-r from-[#0047AB] to-[#007BFF] px-6 shadow-sm hover:shadow-md"
            asChild>
            <Link to="/signup">Bắt đầu</Link>
          </Button>
        </div>
      </div>
    </header>
  );
}
