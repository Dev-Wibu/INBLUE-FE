import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { Input } from "@/components/ui/input";
import type { SchemaMentorResponse } from "@/interfaces/schema.types";
import { chatManager } from "@/services/chat.manager";
import {
  Briefcase,
  CheckCircle2,
  Filter,
  Linkedin,
  Mail,
  MessageSquare,
  Search,
  Sparkles,
  Star,
  Users,
} from "lucide-react";
import { useEffect, useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function MentorListPage() {
  const navigate = useNavigate();
  const [mentors, setMentors] = useState<SchemaMentorResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedExpertise, setSelectedExpertise] = useState("all");

  useEffect(() => {
    const fetchMentors = async () => {
      try {
        setLoading(true);
        const res = await chatManager.getAllMentors();
        if (res.success && res.data) {
          setMentors(res.data);
        } else {
          toast.error("Không thể tải danh sách Mentor");
        }
      } catch (error) {
        console.error("Error fetching mentors:", error);
        toast.error("Đã xảy ra lỗi khi tải danh sách");
      } finally {
        setLoading(false);
      }
    };

    fetchMentors();
  }, []);

  const expertiseOptions = useMemo(
    () =>
      Array.from(new Set(mentors.map((mentor) => mentor.expertise).filter(Boolean))).slice(0, 8),
    [mentors]
  );

  const filteredMentors = useMemo(() => {
    const normalizedSearch = searchQuery.trim().toLowerCase();

    return mentors.filter((mentor) => {
      const matchSearch =
        normalizedSearch.length === 0 ||
        (mentor.name || "").toLowerCase().includes(normalizedSearch) ||
        (mentor.expertise || "").toLowerCase().includes(normalizedSearch) ||
        (mentor.currentCompany || "").toLowerCase().includes(normalizedSearch);

      const matchExpertise =
        selectedExpertise === "all" || (mentor.expertise || "") === selectedExpertise;

      return matchSearch && matchExpertise;
    });
  }, [mentors, searchQuery, selectedExpertise]);

  const mentorStats = useMemo(() => {
    const companies = new Set(mentors.map((mentor) => mentor.currentCompany).filter(Boolean));
    return {
      total: mentors.length,
      companies: companies.size,
      expertise: expertiseOptions.length,
    };
  }, [mentors, expertiseOptions.length]);

  const handleStartChat = (mentor: SchemaMentorResponse) => {
    if (mentor.id === undefined) {
      toast.error("Không đủ thông tin Mentor để bắt đầu hội thoại");
      return;
    }

    navigate("/user?tab=messenger", {
      state: {
        openMentorId: mentor.id,
        mentorData: mentor,
      },
    });
  };

  return (
    <section className="relative h-full overflow-hidden rounded-3xl border border-slate-200/70 bg-gradient-to-br from-white via-slate-50 to-blue-50/30 dark:border-slate-800 dark:from-slate-950 dark:via-slate-950 dark:to-slate-900">
      <div className="pointer-events-none absolute -top-24 -left-16 h-72 w-72 rounded-full bg-blue-200/40 blur-3xl dark:bg-blue-900/20" />
      <div className="pointer-events-none absolute -right-20 bottom-0 h-72 w-72 rounded-full bg-cyan-200/30 blur-3xl dark:bg-cyan-900/20" />

      <div className="relative flex h-full flex-col gap-8 p-5 md:p-6">
        <header className="space-y-5">
          <div className="flex flex-wrap items-center gap-3">
            <Badge className="rounded-full border border-blue-200 bg-blue-100 px-4 py-1 text-[11px] font-semibold tracking-wide text-blue-700 dark:border-blue-800 dark:bg-blue-900/40 dark:text-blue-300">
              <Sparkles className="mr-1 h-3.5 w-3.5" />
              Mạng lưới Mentor nổi bật
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full bg-white/80 px-4 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <Users className="mr-1 h-3.5 w-3.5" />
              {mentorStats.total} Mentor
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full bg-white/80 px-4 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <Briefcase className="mr-1 h-3.5 w-3.5" />
              {mentorStats.companies} công ty
            </Badge>
            <Badge
              variant="secondary"
              className="rounded-full bg-white/80 px-4 py-1 text-[11px] font-medium text-slate-700 dark:bg-slate-900/70 dark:text-slate-300">
              <Filter className="mr-1 h-3.5 w-3.5" />
              {mentorStats.expertise} chuyên môn
            </Badge>
          </div>

          <div className="space-y-2">
            <h1 className="text-3xl font-black tracking-tight text-slate-900 md:text-4xl dark:text-white">
              Tìm Mentor phù hợp với mục tiêu nghề nghiệp của bạn
            </h1>
            <p className="text-sm font-medium text-slate-600 md:text-base dark:text-slate-400">
              Lọc theo kỹ năng, công ty, chuyên môn rồi bắt đầu hội thoại ngay với mentor bạn muốn.
            </p>
          </div>

          <div className="rounded-2xl border border-slate-200/80 bg-white/80 p-3 shadow-sm backdrop-blur-sm dark:border-slate-800 dark:bg-slate-900/80">
            <div className="flex flex-col gap-3 lg:flex-row lg:items-center">
              <div className="relative flex-1">
                <Search className="absolute top-1/2 left-4 h-4 w-4 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm theo tên, kỹ năng hoặc công ty..."
                  className="h-11 border-slate-200 bg-white pl-11 text-sm focus-visible:ring-blue-500 dark:border-slate-700 dark:bg-slate-900"
                  value={searchQuery}
                  onChange={(e) => setSearchQuery(e.target.value)}
                />
              </div>

              <div className="flex items-center gap-2 overflow-x-auto pb-1">
                <Button
                  type="button"
                  size="sm"
                  variant={selectedExpertise === "all" ? "default" : "outline"}
                  className={
                    selectedExpertise === "all"
                      ? "h-9 shrink-0 rounded-full bg-blue-600 px-4 hover:bg-blue-700"
                      : "h-9 shrink-0 rounded-full border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                  }
                  onClick={() => setSelectedExpertise("all")}>
                  <Filter className="mr-1 h-3.5 w-3.5" />
                  Tất cả
                </Button>
                {expertiseOptions.map((expertise) => (
                  <Button
                    key={expertise}
                    type="button"
                    size="sm"
                    variant={selectedExpertise === expertise ? "default" : "outline"}
                    className={
                      selectedExpertise === expertise
                        ? "h-9 shrink-0 rounded-full bg-indigo-600 px-4 hover:bg-indigo-700"
                        : "h-9 shrink-0 rounded-full border-slate-200 bg-white px-4 text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                    }
                    onClick={() => setSelectedExpertise(expertise || "all")}>
                    {expertise}
                  </Button>
                ))}
              </div>
            </div>
          </div>
        </header>

        <div className="custom-scrollbar flex-1 overflow-y-auto pr-1">
          {loading ? (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {Array.from({ length: 4 }).map((_, index) => (
                <Card
                  key={index}
                  className="h-64 animate-pulse rounded-2xl border-slate-200/80 bg-white/80 p-6 dark:border-slate-800 dark:bg-slate-900/70">
                  <div className="flex h-full gap-4">
                    <div className="h-24 w-24 rounded-2xl bg-slate-200 dark:bg-slate-800" />
                    <div className="flex-1 space-y-3">
                      <div className="h-5 w-2/3 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-4 w-1/2 rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-16 w-full rounded bg-slate-200 dark:bg-slate-800" />
                      <div className="h-10 w-40 rounded-xl bg-slate-200 dark:bg-slate-800" />
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          ) : filteredMentors.length === 0 ? (
            <Card className="flex flex-col items-center justify-center gap-3 rounded-2xl border-slate-200/80 bg-white/85 py-20 text-center dark:border-slate-800 dark:bg-slate-900/75">
              <div className="flex h-16 w-16 items-center justify-center rounded-full bg-slate-100 text-slate-400 dark:bg-slate-800">
                <Search className="h-7 w-7" />
              </div>
              <h2 className="text-xl font-bold text-slate-900 dark:text-white">
                Không có mentor phù hợp với bộ lọc hiện tại
              </h2>
              <p className="max-w-md text-sm text-slate-500 dark:text-slate-400">
                Hãy thử đổi từ khóa tìm kiếm hoặc bấm "Tất cả" để xem toàn bộ mạng lưới mentor.
              </p>
              <Button
                variant="outline"
                className="rounded-full"
                onClick={() => {
                  setSearchQuery("");
                  setSelectedExpertise("all");
                }}>
                Đặt lại bộ lọc
              </Button>
            </Card>
          ) : (
            <div className="grid grid-cols-1 gap-5 xl:grid-cols-2">
              {filteredMentors.map((mentor, index) => (
                <Card
                  key={mentor.id ?? `${mentor.name ?? "mentor"}-${index}`}
                  className="group overflow-hidden rounded-2xl border border-slate-200/80 bg-white/85 shadow-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-xl dark:border-slate-800 dark:bg-slate-900/75">
                  <div className="flex h-full flex-col gap-5 p-5 md:flex-row">
                    <div className="relative shrink-0 self-center md:self-start">
                      <div className="absolute -inset-2 rounded-3xl bg-gradient-to-br from-blue-500/30 to-cyan-400/30 opacity-0 blur-lg transition-opacity group-hover:opacity-100" />
                      <Avatar className="h-28 w-28 rounded-3xl border-4 border-white shadow-md dark:border-slate-800">
                        <AvatarImage src={mentor.avatarUrl || ""} alt={mentor.name || "Mentor"} />
                        <AvatarFallback className="bg-slate-100 text-2xl font-black text-slate-400 dark:bg-slate-800 dark:text-slate-300">
                          {mentor.name?.charAt(0) || "M"}
                        </AvatarFallback>
                      </Avatar>
                      <div className="absolute -right-3 -bottom-3 flex items-center gap-1 rounded-full border border-amber-100 bg-white px-2.5 py-1 text-xs font-semibold text-amber-600 shadow-sm dark:border-amber-900/50 dark:bg-slate-900 dark:text-amber-400">
                        <Star className="h-3.5 w-3.5 fill-current" />
                        {mentor.averageRating?.toFixed(1) || "5.0"}
                      </div>
                    </div>

                    <div className="flex flex-1 flex-col gap-4">
                      <div className="flex flex-col justify-between gap-3 sm:flex-row sm:items-start">
                        <div className="min-w-0">
                          <h3 className="truncate text-2xl font-black tracking-tight text-slate-900 transition-colors group-hover:text-blue-600 dark:text-white">
                            {mentor.name || "Mentor chưa cập nhật tên"}
                          </h3>
                          <p className="mt-1 flex items-center gap-2 text-xs font-bold tracking-widest text-indigo-500 uppercase">
                            <CheckCircle2 className="h-4 w-4" />
                            {mentor.expertise || "Mentor chuyên nghiệp"}
                          </p>
                        </div>

                        <div className="flex items-center gap-2">
                          {mentor.linkedInUrl && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-blue-50 hover:text-blue-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                              onClick={() => window.open(mentor.linkedInUrl, "_blank")}>
                              <Linkedin className="h-4 w-4" />
                            </Button>
                          )}
                          {mentor.email && (
                            <Button
                              variant="outline"
                              size="icon"
                              className="h-10 w-10 rounded-xl border-slate-200 bg-white text-slate-600 hover:bg-rose-50 hover:text-rose-600 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-300"
                              onClick={() => (window.location.href = `mailto:${mentor.email}`)}>
                              <Mail className="h-4 w-4" />
                            </Button>
                          )}
                        </div>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Briefcase className="mr-1 h-3.5 w-3.5" />
                          {mentor.currentCompany || "Freelance Mentor"}
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Users className="mr-1 h-3.5 w-3.5" />
                          {mentor.totalSession || 0} phiên
                        </Badge>
                        <Badge
                          variant="secondary"
                          className="rounded-full bg-slate-100 text-slate-700 dark:bg-slate-800 dark:text-slate-300">
                          <Sparkles className="mr-1 h-3.5 w-3.5" />
                          {mentor.yearsOfExperience || 0} năm kinh nghiệm
                        </Badge>
                      </div>

                      <p className="line-clamp-3 text-sm leading-6 text-slate-600 dark:text-slate-400">
                        {mentor.bio ||
                          "Mentor sẵn sàng đồng hành để bạn luyện tập phỏng vấn thực tế, tối ưu câu trả lời và tăng tự tin khi ứng tuyển."}
                      </p>

                      <div className="mt-auto flex flex-wrap items-center gap-3">
                        <Button
                          className="h-11 rounded-xl bg-gradient-to-r from-blue-600 to-indigo-600 px-6 font-semibold shadow-md shadow-blue-500/20 transition-all hover:scale-[1.01] hover:from-blue-700 hover:to-indigo-700"
                          onClick={() => handleStartChat(mentor)}>
                          <MessageSquare className="mr-2 h-4 w-4" />
                          Bắt đầu hội thoại
                        </Button>
                        {mentor.email && (
                          <Button
                            type="button"
                            variant="outline"
                            className="h-11 rounded-xl border-slate-200 bg-white text-slate-700 hover:bg-slate-100 dark:border-slate-700 dark:bg-slate-900 dark:text-slate-200"
                            onClick={() => (window.location.href = `mailto:${mentor.email}`)}>
                            <Mail className="mr-2 h-4 w-4" />
                            Gửi email
                          </Button>
                        )}
                      </div>
                    </div>
                  </div>
                </Card>
              ))}
            </div>
          )}
        </div>
      </div>
    </section>
  );
}
