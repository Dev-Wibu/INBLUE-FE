import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-8 dark:border-slate-800 dark:bg-slate-900">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="text-sm font-medium text-slate-500 dark:text-slate-400">
          Copyright © 2025 INBLUE AI
        </div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-slate-500 dark:text-slate-400">All Rights Reserved | </span>
          <Link
            to="#"
            className="text-[#0047AB] hover:underline dark:text-[#66B2FF] dark:hover:text-[#A5C8F2]">
            Terms and Conditions
          </Link>
          <span className="text-slate-500 dark:text-slate-400"> | </span>
          <Link
            to="#"
            className="text-[#0047AB] hover:underline dark:text-[#66B2FF] dark:hover:text-[#A5C8F2]">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
