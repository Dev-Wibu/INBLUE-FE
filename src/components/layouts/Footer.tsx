import { Link } from "react-router-dom";

export function Footer() {
  return (
    <footer className="border-t border-gray-200 bg-white px-6 py-8">
      <div className="mx-auto flex max-w-7xl items-center justify-between">
        <div className="text-sm font-medium text-slate-500">Copyright © 2025 INBLUE AI</div>
        <div className="flex items-center gap-1 text-sm">
          <span className="text-slate-500">All Rights Reserved | </span>
          <Link to="/terms" className="text-[#0047AB] hover:underline">
            Terms and Conditions
          </Link>
          <span className="text-slate-500"> | </span>
          <Link to="/privacy" className="text-[#0047AB] hover:underline">
            Privacy Policy
          </Link>
        </div>
      </div>
    </footer>
  );
}
