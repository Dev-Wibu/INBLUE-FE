/**
 * Admin Dashboard Overview Page
 * Updated: Separated Charts for Direct Income and Wallet Deposits
 * Removed Pie chart as requested
 */

import { useQuery } from "@tanstack/react-query";
import { format, subDays } from "date-fns";
import { vi } from "date-fns/locale";
import {
  Activity,
  ArrowUpRight,
  CreditCard,
  DollarSign,
  TrendingUp,
  UserCheck,
  Users,
  Wallet,
} from "lucide-react";
import { useMemo } from "react";
import {
  Area,
  AreaChart,
  ResponsiveContainer,
  Tooltip as RechartsTooltip,
  XAxis,
  YAxis,
  CartesianGrid,
} from "recharts";

import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { cn } from "@/lib/utils";
import { dashboardAdminManager } from "@/services";

// Helper to check for successful transaction states
const isSuccessTransaction = (status?: string) => {
  if (!status) return true;
  const s = status.toUpperCase();
  return s === "SUCCESS" || s === "COMPLETED" || s === "PAID" || s === "DONE";
};

export function DashboardOverviewPage() {
  // Fetch real data from Dashboard API
  const { data: userCount, isLoading: loadingUsers } = useQuery({
    queryKey: ["admin", "total-users"],
    queryFn: () => dashboardAdminManager.getTotalUsers(),
  });

  const { data: mentorCount, isLoading: loadingMentors } = useQuery({
    queryKey: ["admin", "total-mentors"],
    queryFn: () => dashboardAdminManager.getTotalMentors(),
  });

  const { data: incomeResponse, isLoading: loadingIncome } = useQuery({
    queryKey: ["admin", "total-income"],
    queryFn: () => dashboardAdminManager.getTotalIncome(),
  });

  const { data: transactionResponse, isLoading: loadingTransactions } = useQuery({
    queryKey: ["admin", "total-transactions"],
    queryFn: () => dashboardAdminManager.getTotalTransactions(),
  });

  // Calculate stats
  const stats = useMemo(() => {
    const directRevenue = (incomeResponse?.data || [])
      .filter((t) => isSuccessTransaction(t.status))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    const walletDeposits = (transactionResponse?.data || [])
      .filter((t) => isSuccessTransaction(t.status))
      .reduce((sum, t) => sum + (t.amount || 0), 0);

    return { directRevenue, walletDeposits };
  }, [incomeResponse, transactionResponse]);

  // Income Trend Data
  const incomeTrendData = useMemo(() => {
    const incomeData = (incomeResponse?.data || []).filter((t) => isSuccessTransaction(t.status));
    const datesMap: Record<string, { date: string, amount: number }> = {};
    for (let i = 14; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), "dd/MM");
      datesMap[dateStr] = { date: dateStr, amount: 0 };
    }
    incomeData.forEach(t => {
      const date = format(new Date(t.createdAt || ""), "dd/MM");
      if (datesMap[date]) datesMap[date].amount += (t.amount || 0);
    });
    return Object.values(datesMap);
  }, [incomeResponse]);

  // Wallet Trend Data
  const walletTrendData = useMemo(() => {
    const walletData = (transactionResponse?.data || []).filter((t) => isSuccessTransaction(t.status));
    const datesMap: Record<string, { date: string, amount: number }> = {};
    for (let i = 14; i >= 0; i--) {
      const dateStr = format(subDays(new Date(), i), "dd/MM");
      datesMap[dateStr] = { date: dateStr, amount: 0 };
    }
    walletData.forEach(t => {
      const date = format(new Date(t.createdAt || ""), "dd/MM");
      if (datesMap[date]) datesMap[date].amount += (t.amount || 0);
    });
    return Object.values(datesMap);
  }, [transactionResponse]);

  // Formatting currency
  const formatVND = (value: number) => {
    return new Intl.NumberFormat("vi-VN", {
      style: "currency",
      currency: "VND",
    }).format(value);
  };

  const OVERVIEW_STATS = [
    {
      title: "Tổng người dùng",
      value: loadingUsers ? "..." : userCount?.data?.toLocaleString() || "0",
      icon: Users,
      color: "text-blue-600",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
    {
      title: "Mentor",
      value: loadingMentors ? "..." : mentorCount?.data?.toLocaleString() || "0",
      icon: UserCheck,
      color: "text-emerald-600",
      bgColor: "bg-emerald-50 dark:bg-emerald-900/20",
    },
    {
      title: "Doanh thu trực tiếp",
      value: loadingIncome ? "..." : formatVND(stats.directRevenue),
      icon: DollarSign,
      color: "text-violet-600",
      bgColor: "bg-violet-50 dark:bg-violet-900/20",
    },
    {
      title: "Tổng nạp ví",
      value: loadingTransactions ? "..." : formatVND(stats.walletDeposits),
      icon: Wallet,
      color: "text-blue-500",
      bgColor: "bg-blue-50 dark:bg-blue-900/20",
    },
  ];

  const recentTransactions = useMemo(() => {
    const income = (incomeResponse?.data || []).map(t => ({ ...t, source: "INCOME" as const }));
    const wallet = (transactionResponse?.data || []).map(t => ({ ...t, source: "WALLET" as const }));
    return [...income, ...wallet]
      .sort((a, b) => new Date(b.createdAt || "").getTime() - new Date(a.createdAt || "").getTime())
      .slice(0, 8);
  }, [incomeResponse, transactionResponse]);

  return (
    <div className="min-h-screen bg-gray-50 p-6 dark:bg-slate-950">
      {/* Header */}
      <div className="mb-8 flex flex-col gap-2 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900 dark:text-white">
            Dashboard Overview
          </h1>
          <p className="text-slate-500 dark:text-slate-400">
            Theo dõi xu hướng doanh thu và nạp ví thời gian thực.
          </p>
        </div>
        <div className="flex items-center gap-2 rounded-lg bg-white p-2 shadow-sm dark:bg-slate-900">
          <div className="bg-primary/10 flex h-8 w-8 items-center justify-center rounded-md">
            <Activity className="text-primary h-4 w-4" />
          </div>
          <span className="text-sm font-medium dark:text-slate-300">
            Hệ thống: <span className="text-emerald-500 font-bold">Hoạt động tốt</span>
          </span>
        </div>
      </div>

      {/* Stats Cards */}
      <div className="mb-8 grid gap-4 sm:grid-cols-2 lg:grid-cols-4">
        {OVERVIEW_STATS.map((stat) => (
          <Card key={stat.title} className="border-0 shadow-sm dark:bg-slate-900 overflow-hidden relative">
            <CardContent className="p-6">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm font-medium text-slate-500 dark:text-slate-400">{stat.title}</p>
                  <p className="mt-1 text-2xl font-bold text-slate-900 dark:text-white">{stat.value}</p>
                </div>
                <div className={cn("rounded-xl p-3", stat.bgColor)}>
                  <stat.icon className={cn("h-6 w-6", stat.color)} />
                </div>
              </div>
            </CardContent>
            <div className={cn("absolute -bottom-6 -right-6 h-20 w-20 rounded-full opacity-5 blur-xl", stat.bgColor)} />
          </Card>
        ))}
      </div>

      {/* Separated Charts */}
      <div className="grid gap-6 lg:grid-cols-2">
        {/* Income Chart */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-violet-600">
               <TrendingUp className="h-5 w-5" />
               Xu hướng Doanh thu trực tiếp
            </CardTitle>
            <CardDescription>Biến động doanh thu 15 ngày qua</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={incomeTrendData}>
                  <defs>
                    <linearGradient id="colorIncome" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8b5cf6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#8b5cf6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <RechartsTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-white p-2 shadow-lg dark:bg-slate-900 dark:border-slate-800">
                          <p className="text-xs font-bold">{payload[0].payload.date}</p>
                          <p className="text-sm font-black text-violet-600">{formatVND(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Area type="monotone" dataKey="amount" stroke="#8b5cf6" strokeWidth={2} fillOpacity={1} fill="url(#colorIncome)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>

        {/* Wallet Chart */}
        <Card className="border-0 shadow-sm dark:bg-slate-900">
          <CardHeader>
            <CardTitle className="flex items-center gap-2 text-lg text-blue-500">
               <Wallet className="h-5 w-5" />
               Xu hướng Nạp tiền vào ví
            </CardTitle>
            <CardDescription>Biến động nạp tiền 15 ngày qua</CardDescription>
          </CardHeader>
          <CardContent>
            <div className="h-[250px] w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={walletTrendData}>
                  <defs>
                    <linearGradient id="colorWallet" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#3b82f6" stopOpacity={0.3} />
                      <stop offset="95%" stopColor="#3b82f6" stopOpacity={0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="#e2e8f0" />
                  <XAxis dataKey="date" axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} />
                  <YAxis axisLine={false} tickLine={false} tick={{ fontSize: 10, fill: "#64748b" }} tickFormatter={(v) => `${(v / 1000000).toFixed(1)}M`} />
                  <RechartsTooltip content={({ active, payload }) => {
                    if (active && payload && payload.length) {
                      return (
                        <div className="rounded-lg border bg-white p-2 shadow-lg dark:bg-slate-900 dark:border-slate-800">
                          <p className="text-xs font-bold">{payload[0].payload.date}</p>
                          <p className="text-sm font-black text-blue-600">{formatVND(payload[0].value as number)}</p>
                        </div>
                      );
                    }
                    return null;
                  }} />
                  <Area type="monotone" dataKey="amount" stroke="#3b82f6" strokeWidth={2} fillOpacity={1} fill="url(#colorWallet)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </CardContent>
        </Card>
      </div>

      {/* Transactions */}
      <Card className="mt-8 border-0 shadow-sm dark:bg-slate-900">
        <CardHeader>
          <CardTitle className="text-lg">Giao dịch gần đây</CardTitle>
          <CardDescription>Nhật ký thu chi mới nhất</CardDescription>
        </CardHeader>
        <CardContent>
          <div className="grid gap-4 md:grid-cols-2">
            {!loadingIncome && !loadingTransactions && recentTransactions.length === 0 ? (
               <div className="col-span-2 text-center py-10 text-slate-400">Không có dữ liệu giao dịch.</div>
            ) : (
              recentTransactions.map((tx) => (
                <div key={`${tx.id}-${tx.source}`} className="flex items-center justify-between rounded-xl border border-slate-100 p-4 dark:border-slate-800 hover:bg-slate-50 dark:hover:bg-slate-800/50 transition-colors">
                  <div className="flex items-center gap-3">
                    <div className={cn("h-10 w-10 flex items-center justify-center rounded-lg", tx.source === "INCOME" ? "bg-violet-100 text-violet-600" : "bg-blue-100 text-blue-600")}>
                       {tx.source === "INCOME" ? <CreditCard className="h-5 w-5" /> : <Wallet className="h-5 w-5" />}
                    </div>
                    <div>
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-bold text-slate-900 dark:text-white truncate max-w-[150px]">{tx.description || tx.transactionCode}</p>
                        <Badge className={cn("text-[8px] h-3.5", tx.source === "INCOME" ? "bg-violet-500" : "bg-blue-500")}>{tx.source === "INCOME" ? "THU NHẬP" : "NẠP VÍ"}</Badge>
                      </div>
                      <p className="text-xs text-slate-500">{format(new Date(tx.createdAt || ""), "HH:mm, dd/MM", { locale: vi })}</p>
                    </div>
                  </div>
                  <div className="text-right">
                    <p className={cn("text-sm font-black", isSuccessTransaction(tx.status) ? "text-emerald-600" : "text-amber-600")}>{formatVND(tx.amount || 0)}</p>
                    <p className="text-[9px] font-bold text-slate-400">{tx.status}</p>
                  </div>
                </div>
              ))
            )}
          </div>
        </CardContent>
      </Card>
    </div>
  );
}
