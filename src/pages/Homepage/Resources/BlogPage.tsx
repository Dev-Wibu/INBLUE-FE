import { ArrowRight, BookOpen, Calendar, Clock, Search, Tag, TrendingUp, User } from "lucide-react";
import { useNavigate } from "react-router-dom";

import { Footer, Header } from "@/components/layouts";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Input } from "@/components/ui/input";

const blogPosts = [
  {
    id: 1,
    title: "10 lỗi phổ biến nhất khi phỏng vấn và cách khắc phục",
    excerpt:
      "Tìm hiểu những sai lầm thường gặp mà ứng viên hay mắc phải và học cách tránh chúng để tăng cơ hội thành công.",
    category: "Mẹo phỏng vấn",
    author: "Nguyễn Văn An",
    date: "15/01/2026",
    readTime: "8 phút",
    image: null,
  },
  {
    id: 2,
    title: "Phương pháp STAR: Hướng dẫn chi tiết từ A-Z",
    excerpt:
      "Học cách áp dụng phương pháp STAR (Situation, Task, Action, Result) để trả lời các câu hỏi hành vi một cách hiệu quả.",
    category: "Kỹ năng",
    author: "Trần Thị Bình",
    date: "12/01/2026",
    readTime: "10 phút",
    image: null,
  },
  {
    id: 3,
    title: "Xu hướng tuyển dụng Tech 2026: Bạn cần biết gì?",
    excerpt:
      "Cập nhật những xu hướng mới nhất trong lĩnh vực công nghệ và cách chuẩn bị để đón đầu cơ hội việc làm.",
    category: "Xu hướng",
    author: "Lê Minh Châu",
    date: "10/01/2026",
    readTime: "12 phút",
    image: null,
  },
  {
    id: 4,
    title: "Đàm phán lương như chuyên gia: Bí quyết từ HR",
    excerpt:
      "Những kỹ năng và chiến lược đàm phán lương được chia sẻ bởi các chuyên gia HR từ các công ty hàng đầu.",
    category: "Đàm phán",
    author: "Phạm Văn Đức",
    date: "08/01/2026",
    readTime: "7 phút",
    image: null,
  },
  {
    id: 5,
    title: "Chuẩn bị phỏng vấn Product Manager: Từ PM cho PM",
    excerpt:
      "Hướng dẫn toàn diện về cách chuẩn bị cho vị trí Product Manager tại các công ty công nghệ lớn.",
    category: "Ngành nghề",
    author: "Hoàng Thị Lan",
    date: "05/01/2026",
    readTime: "15 phút",
    image: null,
  },
  {
    id: 6,
    title: "Phỏng vấn online: 5 mẹo để gây ấn tượng qua màn hình",
    excerpt:
      "Những lưu ý quan trọng khi phỏng vấn qua video call và cách tạo ấn tượng tốt với nhà tuyển dụng.",
    category: "Mẹo phỏng vấn",
    author: "Ngô Quang Minh",
    date: "02/01/2026",
    readTime: "6 phút",
    image: null,
  },
];

const categories = [
  { name: "Tất cả", count: 24 },
  { name: "Mẹo phỏng vấn", count: 8 },
  { name: "Kỹ năng", count: 6 },
  { name: "Xu hướng", count: 4 },
  { name: "Đàm phán", count: 3 },
  { name: "Ngành nghề", count: 3 },
];

export function BlogPage() {
  const navigate = useNavigate();

  return (
    <div className="relative w-full overflow-hidden bg-white dark:bg-slate-950">
      <Header />

      {/* Hero Section */}
      <section className="relative overflow-hidden bg-gradient-to-b from-slate-50 via-white to-[#DCEEFF]/30 py-16 dark:from-slate-900 dark:via-slate-950 dark:to-slate-900">
        <div className="absolute inset-0 -z-10">
          <div className="absolute top-20 left-1/4 h-72 w-72 rounded-full bg-[#66B2FF]/20 blur-3xl" />
          <div className="absolute right-1/4 bottom-20 h-72 w-72 rounded-full bg-[#A5C8F2]/20 blur-3xl" />
        </div>

        <div className="mx-auto max-w-7xl px-6">
          <div className="text-center">
            <Badge
              variant="secondary"
              className="mb-4 bg-[#DCEEFF] text-[#0047AB] dark:bg-[#0047AB]/20 dark:text-[#66B2FF]">
              <BookOpen className="mr-2 h-4 w-4" />
              Blog
            </Badge>
            <h1 className="mb-4 text-4xl font-bold tracking-tight text-slate-900 lg:text-5xl dark:text-white">
              Kiến thức & Hướng dẫn
            </h1>
            <p className="mx-auto mb-8 max-w-2xl text-lg text-slate-600 dark:text-slate-400">
              Cập nhật những bài viết mới nhất về kỹ năng phỏng vấn, xu hướng tuyển dụng và mẹo nghề
              nghiệp
            </p>

            {/* Search */}
            <div className="mx-auto max-w-xl">
              <div className="relative">
                <Search className="absolute top-1/2 left-3 h-5 w-5 -translate-y-1/2 text-slate-400" />
                <Input
                  placeholder="Tìm kiếm bài viết..."
                  className="h-12 pl-10 dark:border-slate-700 dark:bg-slate-800"
                />
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Main Content */}
      <section className="py-16 dark:bg-slate-900">
        <div className="mx-auto max-w-7xl px-6">
          <div className="flex flex-col gap-12 lg:flex-row">
            {/* Blog Posts */}
            <div className="flex-1">
              <div className="mb-6 flex items-center justify-between">
                <h2 className="text-2xl font-bold text-slate-900 dark:text-white">
                  Bài viết mới nhất
                </h2>
                <Badge variant="outline" className="dark:border-slate-700">
                  <TrendingUp className="mr-1 h-3 w-3" />
                  Cập nhật hàng tuần
                </Badge>
              </div>

              <div className="grid gap-6 md:grid-cols-2">
                {blogPosts.map((post) => (
                  <Card
                    key={post.id}
                    className="group cursor-pointer transition-all hover:shadow-lg dark:border-slate-700 dark:bg-slate-800"
                    onClick={() => navigate("/login")}>
                    {/* Image placeholder */}
                    <div className="h-48 w-full bg-gradient-to-br from-[#DCEEFF] to-[#A5C8F2] dark:from-slate-700 dark:to-slate-600" />
                    <CardHeader>
                      <div className="mb-2 flex items-center gap-2">
                        <Badge
                          variant="secondary"
                          className="text-xs dark:bg-slate-700 dark:text-slate-300">
                          <Tag className="mr-1 h-3 w-3" />
                          {post.category}
                        </Badge>
                      </div>
                      <CardTitle className="line-clamp-2 text-lg transition-colors group-hover:text-[#0047AB] dark:text-white dark:group-hover:text-[#66B2FF]">
                        {post.title}
                      </CardTitle>
                      <CardDescription className="line-clamp-2 dark:text-slate-400">
                        {post.excerpt}
                      </CardDescription>
                    </CardHeader>
                    <CardContent>
                      <div className="flex items-center justify-between text-sm text-slate-500 dark:text-slate-400">
                        <div className="flex items-center gap-4">
                          <span className="flex items-center gap-1">
                            <User className="h-4 w-4" />
                            {post.author}
                          </span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-4 w-4" />
                            {post.readTime}
                          </span>
                        </div>
                        <span className="flex items-center gap-1">
                          <Calendar className="h-4 w-4" />
                          {post.date}
                        </span>
                      </div>
                    </CardContent>
                  </Card>
                ))}
              </div>

              <div className="mt-8 text-center">
                <Button
                  variant="outline"
                  size="lg"
                  className="rounded-full dark:border-slate-700"
                  onClick={() => navigate("/login")}>
                  Xem thêm bài viết
                  <ArrowRight className="ml-2 h-5 w-5" />
                </Button>
              </div>
            </div>

            {/* Sidebar */}
            <div className="w-full lg:w-80">
              {/* Categories */}
              <Card className="mb-6 dark:border-slate-700 dark:bg-slate-800">
                <CardHeader>
                  <CardTitle className="text-lg dark:text-white">Danh mục</CardTitle>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    {categories.map((category) => (
                      <Button
                        key={category.name}
                        variant="ghost"
                        className="w-full justify-between dark:hover:bg-slate-700"
                        onClick={() => navigate("/login")}>
                        <span>{category.name}</span>
                        <Badge
                          variant="secondary"
                          className="text-xs dark:bg-slate-700 dark:text-slate-300">
                          {category.count}
                        </Badge>
                      </Button>
                    ))}
                  </div>
                </CardContent>
              </Card>

              {/* Newsletter */}
              <Card className="bg-gradient-to-br from-[#0047AB] to-[#007BFF] text-white dark:from-[#0047AB]/80 dark:to-[#007BFF]/80">
                <CardHeader>
                  <CardTitle className="text-lg text-white">Đăng ký nhận tin</CardTitle>
                  <CardDescription className="text-[#A5C8F2]">
                    Nhận bài viết mới nhất mỗi tuần
                  </CardDescription>
                </CardHeader>
                <CardContent>
                  <div className="space-y-3">
                    <Input
                      placeholder="Email của bạn"
                      className="border-white/20 bg-white/10 text-white placeholder:text-white/60"
                    />
                    <Button
                      className="w-full bg-white text-[#0047AB] hover:bg-slate-100"
                      onClick={() => navigate("/signup")}>
                      Đăng ký
                    </Button>
                  </div>
                </CardContent>
              </Card>
            </div>
          </div>
        </div>
      </section>

      <Footer />
    </div>
  );
}
