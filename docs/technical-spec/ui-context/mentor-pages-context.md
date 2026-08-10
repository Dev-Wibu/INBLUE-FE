# Mentor UI Context Pack — for external AI design sessions

> **Mục đích:** File này mô tả UI/UX hiện tại của **5 trang role Mentor** cần cải thiện.
> Paste toàn bộ file này vào box chat AI cùng với prompt redesign của bạn.
> AI sẽ hiểu rõ: trang nào có gì, đang dùng component nào, đang theo pattern gì,
> và từ đó đề xuất redesign có tính thực tiễn (không hallucinate).
>
> **Phạm vi file này CHỈ mô tả hiện trạng** — phần "Gợi ý chỉnh sửa" / "Redesign idea"
> do AI khác sinh ra, không có trong file này.

---

## 1. Tech stack & design system tổng quan

| Aspect       | Stack                                                                                                                |
| ------------ | -------------------------------------------------------------------------------------------------------------------- |
| Framework    | React 18 + Vite + TypeScript                                                                                         |
| Routing      | React Router (nested outlet `/mentor` → `?tab=`)                                                                     |
| Styling      | Tailwind CSS + shadcn/ui + custom dark-glass                                                                         |
| Icon         | `lucide-react`                                                                                                       |
| Animation    | `framer-motion` (có dùng trong 1 trang)                                                                              |
| i18n         | `react-i18next` (key dạng `common.xxx`, `mentorStudents.xxx`, `mentorReviews.xxx`, `mentorFeedback.xxx`)             |
| Theme        | Light + Dark mode (tự sinh class `dark:` cho mọi element)                                                            |
| Layout shell | `MentorDashboardPage` — sidebar trái cố định + header + content area `<div class="overflow-auto p-4 md:p-6 lg:p-8">` |

### 1.1. Cấu trúc Mentor dashboard (parent)

```tsx
// src/pages/Mentor/MentorDashboard/MentorDashboardPage.tsx
<div className="isolate flex h-screen bg-slate-50 dark:bg-slate-950">
  <DashboardSidebar menuGroups={...} activeTab={typedActiveTab} ... /> // fixed left
  <div className="relative z-0 flex flex-1 flex-col overflow-x-hidden">
    <MentorHeader title={currentTitle} category={currentCategory} ... />
    <div ref={contentRef} className="flex-1 overflow-auto p-4 md:p-6 lg:p-8">
      {outlet ?? renderContent()} // render <StudentsListPage />, <MentorReviewsPage />, v.v.
    </div>
    <ScrollToTopButton ... />
  </div>
</div>
```

**Các tab có sẵn trong sidebar mentor:**

- `homeFeed` — News icon (`text-orange-600`)
- `overview` — LayoutDashboard (`text-emerald-600`)
- `sessions` — Calendar (`text-blue-600`)
- **`students`** — Users (`text-purple-600`) ← trang này
- **`reviews`** — Star (`text-yellow-600`) ← trang này
- **`feedback`** — MessageSquare (`text-cyan-600`) ← trang này
- `kioskEntry`, `notifications`, `messenger`, `account` — ngoài phạm vi

### 1.2. Active sidebar item style

```tsx
// Sidebar theme — indigo accent, hiện đang dùng
activeItem: "bg-indigo-50 text-indigo-700 font-semibold rounded-xl shadow-xs ring-1 ring-indigo-500/20 dark:bg-indigo-500/10 dark:text-indigo-400 dark:ring-indigo-500/20",
inactiveItem: "text-slate-600 rounded-xl hover:bg-slate-100 hover:text-slate-900 transition-all dark:text-slate-400 dark:hover:bg-slate-800/60 dark:hover:text-slate-200",
```

### 1.3. Design tokens (từ polished pages `MentorSessionDetailPage`, `ReviewDetailPage`, `MentorSessionReviewViewPage`)

**Tailwind palette dùng nhiều nhất trong các trang đã polish:**

| Mục đích                          | Light                                                                         | Dark                                                             | Ghi chú                        |
| --------------------------------- | ----------------------------------------------------------------------------- | ---------------------------------------------------------------- | ------------------------------ |
| Surface card (glass)              | `bg-slate-500/[0.04] ring-slate-200/70`                                       | `dark:bg-white/[0.03] dark:ring-white/5`                         | Single tone cho cả dossier     |
| Gradient hero bg                  | `bg-gradient-to-br from-{hue}-50/80 via-white to-{hue}-50/80`                 | `dark:from-{hue}-950/40 dark:via-slate-900 dark:to-{hue}-950/40` | Có blob blur-3xl góc trên-phải |
| Icon badge gradient               | `bg-gradient-to-br from-{hue}-500 to-{hue}-600 shadow-sm shadow-{hue}-500/30` | —                                                                | Có `group-hover:scale-110`     |
| Text primary                      | `text-slate-900`                                                              | `dark:text-slate-100`                                            |                                |
| Text secondary                    | `text-slate-500`                                                              | `dark:text-slate-400`                                            |                                |
| Eyebrow label (uppercase tracked) | `text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase`        | `dark:text-slate-400`                                            |                                |

**Session status tones (`mentor-interview.constants.ts`):**

```
draft      → amber
scheduled  → sky (pulsing)
paid       → emerald
ongoing    → emerald-400 (pulsing)
completed  → slate
rejected   → rose
canceled   → rose-400
```

### 1.4. Shared components

| Component                            | Path                                     | Dùng ở đâu                                  |
| ------------------------------------ | ---------------------------------------- | ------------------------------------------- |
| `PaginationControl`                  | `@/components/shared/PaginationControl`  | Students, Reviews, Feedback list            |
| `ReloadButton`                       | `@/components/shared/ReloadButton`       | Hầu hết header                              |
| `SortButton`                         | `@/components/shared/SortButton`         | Students, Reviews, Feedback                 |
| `usePagination`, `useHybridPageSize` | `@/hooks/usePagination`                  | Tất cả list                                 |
| `useSortable`                        | `@/hooks/useSortable`                    | Tất cả list                                 |
| `StarRating`                         | `@/components/ui/star-rating`            | Reviews, Feedback                           |
| `EmptyState`                         | `@/components/ui/empty-state`            | Khi list rỗng                               |
| `PanelSurface`                       | `Mentor/Sessions/components` (re-export) | Detail pages — `variant="elevated"\|"flat"` |
| `Avatar`                             | `@/components/ui/avatar`                 | Mọi nơi có user                             |
| `Card`/`CardHeader`/`CardContent`    | `@/components/ui/card`                   | Detail page (cũ)                            |
| `Tabs`                               | `@/components/ui/tabs`                   | StudentDetailPage                           |
| `Dialog`                             | `@/components/ui/dialog`                 | Feedback detail modal                       |

---

## 2. Trang 1 — `/mentor?tab=students`

### File source

`src/pages/Mentor/Students/StudentsListPage.tsx` (~510 dòng)

### Route

`/mentor?tab=students` (tab param) → render `<StudentsListPage />` trong `<MentorDashboardPage>`.
Nested route `/mentor/students/:userId` (xem trang 2) render riêng `<StudentDetailPage />`.

### Cấu trúc tổng thể

```
<div className="flex flex-col gap-6">       ← page wrapper
  <HeaderHero />                            ← gradient hero card (violet→fuchsia)
  <KPIStrip />                              ← 4 stat cards (1 row, sm:2, xl:4)
  <StudentListContainer>
    <FilterRow />                           ← Search input + Select filter
    <SortRow />                             ← "Sort by" + SortButton × 3
    <StudentRowList />                      ← vertical button list
    <Pagination />
  </StudentListContainer>
</div>
```

### HeaderHero (gradient violet→fuchsia)

```tsx
<div className="relative overflow-hidden rounded-2xl border border-violet-100/80 bg-gradient-to-br from-violet-50/80 via-white to-fuchsia-50/80 p-5 shadow-sm dark:border-violet-900/40 dark:from-violet-950/40 dark:via-slate-900 dark:to-fuchsia-950/40">
  <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-violet-300/40 to-fuchsia-300/40 blur-3xl ..." />
  <div className="relative flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
    <div className="flex items-start gap-3">
      <div className="flex h-11 w-11 ... rounded-xl bg-gradient-to-br from-violet-500 to-fuchsia-500 text-white shadow-md shadow-violet-500/30">
        <Users className="h-5 w-5" />
      </div>
      <div>
        <h1 className="text-2xl font-bold tracking-tight ...">{t("mentorStudents.student")}</h1>
        <p className="text-sm text-slate-500 ...">{t("mentorStudents.listOfStudentsWhoHave")}</p>
      </div>
    </div>
    <ReloadButton onReload={...} isLoading={...} tooltip={...} />
  </div>
</div>
```

### KPI Strip — 4 stat cards với gradient riêng từng cái

| Card | Hue     | Icon            | Value                   | Label            |
| ---- | ------- | --------------- | ----------------------- | ---------------- |
| 1    | violet  | `Users`         | `students.length`       | Total students   |
| 2    | sky     | `Calendar`      | `mentorSessions.length` | Total sessions   |
| 3    | emerald | `MessageSquare` | `feedbacks.length`      | Response sent    |
| 4    | amber   | `Star`          | `reviews.length`        | Reviews received |

```tsx
// Pattern: hover lift + group-hover:scale trên icon badge
<div className="group border-{hue}-100/80 via-{hue}-50/40 hover:border-{hue}-200 hover:shadow-{hue}-500/5 relative overflow-hidden rounded-xl border bg-gradient-to-br from-white to-white p-4 transition-all hover:shadow-md ...">
  <div className="mb-3 flex items-center justify-between">
    <p className="text-xs font-semibold tracking-wide text-slate-500 uppercase ...">{label}</p>
    <div className="from-{hue}-500 to-{hue}-600 flex h-9 w-9 rounded-lg bg-gradient-to-br transition-transform group-hover:scale-110 ... ...">
      <Icon className="h-4 w-4" />
    </div>
  </div>
  <p className="text-3xl font-bold tracking-tight ...">{value}</p>
  <p className="mt-1 text-xs ...">{sub}</p>
  <div className="bg-{hue}-500/5 pointer-events-none absolute -right-6 -bottom-6 h-20 w-20 rounded-full blur-2xl ..." />
</div>
```

### List container + Filter row

```tsx
<div className="space-y-4 rounded-xl border border-slate-200/80 bg-gradient-to-b from-white to-slate-50/60 p-4 shadow-xs ...">
  {/* Filter row: Search + Select */}
  <div className="grid grid-cols-1 gap-3 sm:grid-cols-[minmax(0,1fr)_220px]">
    <div className="relative">
      <Search className="absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2 text-slate-400" />
      <Input value={searchQuery} ... placeholder="Search by ID, name, email" />
    </div>
    <Select value={studentFilter} ...>
      <SelectItem value="all">All students</SelectItem>
      <SelectItem value="reviewed">Reviewed</SelectItem>
      <SelectItem value="feedbacked">Response sent</SelectItem>
      <SelectItem value="noReview">No review yet</SelectItem>
    </Select>
  </div>

  {/* Sort row */}
  <div className="flex flex-wrap items-center gap-3 border-t ... pt-3">
    <span><Filter /> Sort by</span>
    <SortButton {...getSortProps("sessionCount")}>Sessions</SortButton>
    <SortButton {...getSortProps("avgRating")}>Rating</SortButton>
    <SortButton {...getSortProps("name")}>Name</SortButton>
  </div>

  {/* List */}
  <div className="space-y-2">
    {pageData.map(student => <StudentRow ... />)}
  </div>

  <PaginationControl ... />
</div>
```

### Student row

```tsx
<button
  className="group flex w-full cursor-pointer items-center justify-between rounded-lg border border-slate-200/80 bg-white p-3 text-left transition-all hover:-translate-y-0.5 hover:border-violet-200 hover:shadow-md hover:shadow-violet-500/5 ..."
  onClick={() => navigate(`/mentor/students/${student.id}`)}>
  <div className="flex min-w-0 items-center gap-3">
    <Avatar className="h-10 w-10 shrink-0">
      <AvatarImage src={student.avatarUrl} />
      <AvatarFallback>{initial}</AvatarFallback>
    </Avatar>
    <div className="min-w-0">
      <p className="truncate text-sm font-semibold ...">{student.name || `Student #${id}`}</p>
      <p className="truncate text-xs text-slate-500 ...">{email || university}</p>
    </div>
  </div>
  <div className="flex shrink-0 items-center gap-5 text-xs">
    <div className="text-center">
      <p className="text-[11px] ...">Session</p>
      <p className="font-semibold ...">{count}</p>
    </div>
    <div className="text-center">
      <p className="text-[11px] ...">Feedback</p>
      <Badge>{count}</Badge>
    </div>
    <div className="text-center">
      <p className="text-[11px] ...">Rating</p>
      {reviewCount > 0 ? (
        <>
          <StarRating value={avgRating} readOnly size="sm" />
          <span>({count})</span>
        </>
      ) : (
        <span className="text-slate-400">-</span>
      )}
    </div>
  </div>
</button>
```

### Data sources (BE endpoints)

| Hook                                         | Endpoint                                 | Note                                                    |
| -------------------------------------------- | ---------------------------------------- | ------------------------------------------------------- | --- | -------- |
| `useSessions()`                              | `GET /api/sessions`                      | Admin endpoint (full list) — filter by mentor in client |
| `useMentorFeedbacksByMentor(mentorId)`       | `GET /api/mentor-feedbacks/mentor/{id}`  | Filter by Mentor.id (BE bug: not User.id)               |
| `useMentorReviewsByMentor(userIdForReviews)` | `GET /api/mentor-reviews/by-mentor/{id}` | `userIdForReviews = mentorId                            |     | user.id` |
| `useCurrentMentorProfile()`                  | internal                                 | Resolves Mentor.id from auth user email                 |

### Empty states

- **No sessions yet:** EmptyState với `Users` icon, "No students yet" + "You have not had any interview sessions"
- **Filter returns nothing:** EmptyState với `Search` icon, "No suitable students were found" + "Try another keyword or change"

---

## 3. Trang 2 — `/mentor/students/:userId`

### File source

`src/pages/Mentor/Students/StudentDetailPage.tsx` (~566 dòng)

### Route

`/mentor/students/:userId` (nested route trong `<MentorDashboardPage>`).

### Cấu trúc tổng thể

```
<div className="space-y-6">
  <BackButton />                  ← variant="ghost", ArrowLeft + "Back to the list"
  <StudentProfileCard />          ← Card with Avatar 80x80 + name + email + university + rating
  <StatsRow />                    ← 4 Card (totalSession, completed, feedback, review)
  <Tabs>
    Tab "Sessions"   → list of session rows (id + roomName + status Badge)
    Tab "Feedbacks"  → list of <FeedbackCard /> (component từ @/components/feedback)
    Tab "Reviews"    → list of <ReviewCard /> (component từ @/components/review)
    Tab "Profile"    → Candidate profile (targetRole, level, skills, projects, work exp, education, certs)
  </Tabs>
</div>
```

### StudentProfileCard

```tsx
<Card className="rounded-2xl border-slate-200/80 bg-white shadow-xs ...">
  <CardHeader>
    <div className="flex items-start gap-6">
      <Avatar className="h-20 w-20">
        <AvatarImage src={...} />
        <AvatarFallback className="bg-emerald-100 text-2xl text-emerald-700">{initial}</AvatarFallback>
      </Avatar>
      <div className="flex-1">
        <CardTitle className="text-2xl">{name || `Student #${id}`}</CardTitle>
        <div className="mt-2 space-y-1 text-sm text-slate-500">
          {email && <p><Mail /> {email}</p>}
          {university && <p><School /> {university}</p>}
        </div>
        {totalReviews > 0 && (
          <div className="mt-3 flex items-center gap-2">
            <span>Student reviews</span>
            <StarRating value={avgRating} readOnly size="sm" />
            <span>({totalReviews})</span>
          </div>
        )}
      </div>
    </div>
  </CardHeader>
</Card>
```

### StatsRow — 4 simple Card (no gradient, no icon scale)

```tsx
<div className="grid grid-cols-1 gap-4 sm:grid-cols-4">
  <Card>
    <CardHeader className="pb-2">
      <CardDescription>
        <Calendar className="text-blue-500" /> Total session
      </CardDescription>
      <CardTitle className="text-2xl font-bold">{n}</CardTitle>
    </CardHeader>
  </Card>
  <Card>
    ...<CardTitle className="text-emerald-600">completed</CardTitle>
  </Card>
  <Card>
    ...
    <CardDescription>
      <MessageSquare className="text-sky-500" /> Feedback
    </CardDescription>
    <CardTitle className="text-sky-600">n</CardTitle>
  </Card>
  <Card>
    ...
    <CardDescription>
      <Star className="text-amber-500" /> Review
    </CardDescription>
    <CardTitle className="text-amber-500">n</CardTitle>
  </Card>
</div>
```

### Tabs (4 tabs)

```tsx
<Tabs defaultValue="sessions">
  <TabsList className="grid w-full grid-cols-4">
    <TabsTrigger value="sessions">Sessions ({n})</TabsTrigger>
    <TabsTrigger value="feedbacks">Feedbacks ({n})</TabsTrigger>
    <TabsTrigger value="reviews">Reviews ({n})</TabsTrigger>
    <TabsTrigger value="profile">
      <FileText /> Profile
    </TabsTrigger>
  </TabsList>

  {/* Sessions tab */}
  <TabsContent value="sessions">
    <Card>
      <CardHeader>
        <CardTitle>Interview session history</CardTitle>...
      </CardHeader>
      <CardContent>
        <div className="space-y-4">
          {sessions.map((s) => (
            <div className="flex items-center justify-between rounded-lg border p-4">
              <div>
                <p>{s.roomName || `Session #${s.id}`}</p>
                <p>ID: {s.id}</p>
              </div>
              <Badge
                variant={
                  s.status === "COMPLETED"
                    ? "default"
                    : s.status === "CANCELED"
                      ? "destructive"
                      : "secondary"
                }>
                {statusLabel}
              </Badge>
            </div>
          ))}
        </div>
      </CardContent>
    </Card>
  </TabsContent>

  {/* Feedbacks + Reviews tabs dùng <FeedbackCard /> / <ReviewCard /> */}
  {/* Profile tab: Basic info + Skills (technical/soft/tools) + Projects + Work exp + Education + Certs + Achievements */}
</Tabs>
```

### Access control

- Nếu `totalSessions === 0` → render "No student found" + back button
- Access by route param only (không check role ngoài `ProtectedRoute allowedRoles={["MENTOR"]}` của React Router)

### Empty states

- **No sessions yet:** `<EmptyState icon={Calendar} title="There are no sessions yet" />`
- **No feedbacks:** EmptyState với MessageSquare
- **No reviews:** EmptyState với Star
- **No candidate profile:** EmptyState với FileText

---

## 4. Trang 3 — `/mentor?tab=reviews`

### File source

`src/pages/Mentor/Reviews/MentorReviewsPage.tsx` (~325 dòng)

### Route

`/mentor?tab=reviews` (tab param) → render `<MentorReviewsPage />`.
Click vào 1 review → navigate `/mentor/reviews/:id` (xem trang 4).

### Cấu trúc tổng thể

```
<div className="flex flex-col gap-6">
  <HeaderHero />                            ← gradient emerald→teal (khác với Students)
  <KPIStrip />                              ← 3 stat cards (sm:grid-cols-3)
  <ReviewStatsChart />                      ← <ReviewStats reviews={reviews} /> - bar/distribution chart
  <ReviewListContainer>
    <FilterRow />                           ← Search input + rating Select
    <SortRow />                             ← "Sort by" + SortButton × 2 (rating, latest)
    <ReviewList />                          ← vertical list of <ReviewCard>
    <Pagination />
  </ReviewListContainer>
</div>
```

### HeaderHero (gradient emerald→teal, tương tự Students nhưng hue khác)

```tsx
<div className="rounded-2xl border border-emerald-100/80 bg-gradient-to-br from-emerald-50/80 via-white to-teal-50/80 ...">
  <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-emerald-300/40 to-teal-300/40 blur-3xl ..." />
  ...
  <div className="... bg-gradient-to-br from-emerald-500 to-teal-500 ...">
    <Send className="h-5 w-5" />
  </div>
  <h1>{t("common.reviewSubmitted")}</h1>
  <p>{t("mentorReviews.viewTheAssessmentsYouSent")}</p>
  <ReloadButton ... />
</div>
```

### KPI Strip — 3 stat cards

| Card | Hue     | Icon        | Value                 | Label               |
| ---- | ------- | ----------- | --------------------- | ------------------- |
| 1    | indigo  | `Star`      | `reviews.length`      | Total rating        |
| 2    | amber   | `Star fill` | `avg` (1 decimal)     | Average star rating |
| 3    | emerald | `Trophy`    | `count of rating===5` | 5-star rating       |

### Review Stats Chart

```tsx
{
  reviews.length > 0 && <ReviewStats reviews={reviews} />;
}
// File: src/components/review/ReviewStats.tsx (xem riêng)
// Thường là bar chart: 1★, 2★, 3★, 4★, 5★ distribution
```

### Filter row (chỉ Search + Select rating, không có filter dropdown phức tạp)

```tsx
<div className="flex flex-wrap items-center gap-3">
  <div className="relative min-w-0 flex-1">
    <Search ... />
    <Input placeholder="Search by student, email, interview room" ... />
  </div>
  <Select value={ratingFilter} ...>
    <SelectTrigger className="w-[180px]"><SelectValue placeholder="Filter by score" /></SelectTrigger>
    <SelectContent>
      <SelectItem value="all">All points</SelectItem>
      <SelectItem value="high">5 stars</SelectItem>
      <SelectItem value="medium">3-4 stars</SelectItem>
      <SelectItem value="low">1-2 stars</SelectItem>
    </SelectContent>
  </Select>
</div>

{/* Sort (chỉ khi có data) */}
{sortedData.length > 0 && (
  <div className="flex flex-wrap items-center gap-3 border-t pt-3">
    <span><Filter/> Sort by</span>
    <SortButton {...getSortProps("rating")}>Rating</SortButton>
    <SortButton {...getSortProps("newestSortValue")}>Latest</SortButton>
  </div>
)}
```

### ReviewList — dùng shared component

```tsx
<ReviewList
  reviews={pageData}
  isLoading={isLoading}
  showUser // show student info
  showMentor={false} // hide mentor (current user)
  onSelect={(review) => review.id && navigate(`/mentor/reviews/${review.id}`)}
  emptyTitle="There are no reviews yet"
  emptyDescription="You have not sent any"
/>
```

### Data sources

| Hook                        | Note                                                                                  |
| --------------------------- | ------------------------------------------------------------------------------------- |
| `useMentorReviews()`        | `GET /api/mentor-reviews` (all, filter client-side by `session.userId2 === mentorId`) |
| `useCurrentMentorProfile()` | Resolve mentorId from email                                                           |

### Empty states

- **No reviews:** EmptyState `Star` icon, "There are no reviews yet" + "You have not sent any"

---

## 5. Trang 4 — `/mentor/reviews/:id`

### File source

`src/pages/Mentor/Reviews/ReviewDetailPage.tsx` (~456 dòng, v3 "Assessment Dossier")

### Route

`/mentor/reviews/:id` (nested route trong `<MentorDashboardPage>`).
Trang đã được redesign gần đây — đang theo dark-glass dossier aesthetic, dùng framer-motion.

### Cấu trúc tổng thể

```
<motion.div className="mx-auto flex w-full max-w-6xl flex-col gap-5"
  variants={staggerContainer} initial="hidden" animate="show">

  <TopActionBar>                        ← Back button + Edit button
  <HeroPanel>                           ← Student avatar + name/email/university + rating big number
  <STARSection>                         ← 2x2 grid: Situation, Task, Action, Result
  <AdditionalSection>                   ← 3 cols: Strength, Weakness, Improvements
  <SessionMetaStrip>                    ← PanelSurface variant="flat" - session id + room name
</motion.div>
```

### TopActionBar

```tsx
<div className="flex flex-wrap items-center gap-2">
  <Button variant="ghost" onClick={() => navigate("/mentor?tab=reviews")}>
    <ArrowLeft /> Back to the list
  </Button>
  <Button
    variant="outline"
    onClick={() => navigate(`/mentor/sessions/${sessionId}/review`)}
    disabled={!sessionId}
    className="ml-auto">
    Edit Review
  </Button>
</div>
```

### HeroPanel (với sky blur góc trên-phải, NO amber accent cho rating)

```tsx
<PanelSurface className="relative overflow-hidden">
  <div className="pointer-events-none absolute -top-16 -right-12 h-48 w-48 rounded-full bg-sky-300/15 opacity-60 blur-3xl ..." />
  <div className="relative flex flex-col gap-5 p-5 sm:flex-row sm:items-center sm:justify-between sm:p-6">
    <div className="flex min-w-0 items-center gap-4">
      <Avatar className="h-14 w-14 ring-2 ring-sky-400/30">
        <AvatarImage src={...} />
        <AvatarFallback className="bg-slate-200/60 ...">{initial}</AvatarFallback>
      </Avatar>
      <div className="min-w-0 space-y-1">
        <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase ...">Student information</p>
        <h1 className="text-xl font-semibold tracking-[-0.02em] ...">{studentName}</h1>
        <div className="flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs ...">
          {email && <span><Mail/> {email}</span>}
          {university && <span><Sparkles/> {university}</span>}
        </div>
      </div>
    </div>

    {/* Rating block — NEUTRAL, no amber accent */}
    <div className="rounded-2xl p-4 text-center ring-1 backdrop-blur ring-inset sm:min-w-[200px] bg-slate-900/[0.04] ring-slate-900/10 dark:bg-white/[0.05] dark:ring-white/10">
      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase ...">Overall assessment</p>
      <p className="mt-1 text-4xl font-bold tracking-[-0.04em] ...">{review.rating}<span className="ml-1 text-base opacity-60">/5</span></p>
      <div className="mt-1 flex justify-center"><StarRating value={review.rating || 0} readOnly size="sm" /></div>
      {endedAt && <p className="mt-1 text-[10px] ..."><TimeAgo date={String(endedAt)} /></p>}
    </div>
  </div>
</PanelSurface>
```

### STAR Section (2x2 grid, single dark glass + subtle per-card hue gradient)

```tsx
const STAR_HUE = {
  situation: "from-sky-500/10 to-transparent",
  task: "from-indigo-500/10 to-transparent",
  action: "from-blue-500/10 to-transparent",
  result: "from-cyan-500/10 to-transparent",
};
const STAR_INK = {
  situation: "text-sky-600 dark:text-sky-300",
  task: "text-indigo-600 dark:text-indigo-300",
  action: "text-blue-600 dark:text-blue-300",
  result: "text-cyan-600 dark:text-cyan-300",
};

// Each STAR card:
<motion.article className="relative overflow-hidden rounded-2xl bg-slate-500/[0.04] p-5 ring-1 ring-slate-200/70 backdrop-blur-sm transition-all ring-inset hover:-translate-y-0.5 dark:bg-white/[0.03] dark:ring-white/5">
  <div
    aria-hidden
    className="{STAR_HUE[key]} pointer-events-none absolute inset-0 bg-gradient-to-br opacity-60"
  />
  <div className="relative flex items-center justify-between gap-2">
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 rounded-lg bg-slate-900/[0.04] ring-1 ring-slate-900/10 ring-inset ...">
        <Icon className={STAR_INK[key]} />
      </div>
      <div>
        <p className="{STAR_INK[key]} text-[10px] font-semibold tracking-[0.08em] uppercase">
          {label}
        </p>
        <p className="font-mono text-[10px] text-slate-400 dark:text-slate-500">
          {key.toUpperCase()}
        </p>
      </div>
    </div>
  </div>
  <p className="relative mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
    {value}
  </p>
</motion.article>;
```

### Additional Section (3 cols: Strength, Weakness, Improvements)

```tsx
<div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
  {/* Same GLASS_SURFACE pattern */}
  <article className="rounded-2xl bg-slate-500/[0.04] p-5 ring-1 ring-slate-200/70 backdrop-blur-sm transition-all ring-inset hover:-translate-y-0.5 dark:bg-white/[0.03] dark:ring-white/5">
    <div className="flex items-center gap-2.5">
      <div className="flex h-9 w-9 rounded-lg bg-slate-900/[0.04] ring-1 ring-slate-900/10 ring-inset ...">
        <Icon className="h-4 w-4 text-slate-600 dark:text-slate-300" />
      </div>
      <p className="text-[10px] font-semibold tracking-[0.08em] text-slate-500 uppercase ...">
        {label}
      </p>
    </div>
    {value ? (
      <p className="mt-3 text-sm leading-relaxed whitespace-pre-wrap text-slate-700 dark:text-slate-200">
        {value}
      </p>
    ) : (
      <p className="mt-3 text-sm text-slate-500 italic">—</p>
    )}
  </article>
</div>
```

### SessionMetaStrip

```tsx
<PanelSurface variant="flat" className="p-4 sm:p-5">
  <div className="flex flex-wrap items-center gap-x-5 gap-y-2 text-xs">
    <span>
      <Calendar /> Session code #{review.session?.id}
    </span>
    <span>Room name {review.session?.roomName || `Session #${id}`}</span>
  </div>
</PanelSurface>
```

### Data sources

| Hook                                   | Endpoint                                                                |
| -------------------------------------- | ----------------------------------------------------------------------- |
| `useMentorReviewById(reviewId)`        | `GET /api/mentor-reviews/{id}`                                          |
| `chatManager.getUserDetail(studentId)` | internal — enrich student info                                          |
| Access check                           | `review.session?.userId2 !== currentUser.id` → render "No access" panel |

### Loading / Empty states

- **Loading:** Skeleton placeholders (3 of them)
- **No review:** PanelSurface với Star icon + "No reviews found"
- **No access:** PanelSurface với User icon + "No access" + back button

---

## 6. Trang 5 — `/mentor?tab=feedback` + feedback detail (modal)

### File source

`src/pages/Mentor/Feedback/GivenFeedbackListPage.tsx` (~410 dòng)

### Route

`/mentor?tab=feedback` (tab param) → render `<GivenFeedbackListPage />`.
**Hiện KHÔNG có route detail** cho feedback. Click vào 1 feedback → mở `Dialog` modal (max-w-2xl) inline.

### Cấu trúc tổng thể

```
<div className="flex flex-col gap-6">
  <HeaderHero />                            ← gradient rose→pink (KHÁC 2 trên)
  <KPIStrip />                              ← 4 stat cards (sm:2, xl:4)
  <FeedbackStatsChart />                    ← <FeedbackStats feedbacks={feedbacks} />
  <FeedbackListContainer>
    <FilterRow />                           ← Search + rating Select
    <SortRow />                             ← "Sort by" + SortButton × 3 (latest, rating, student name)
    <FeedbackList />                        ← vertical list of <FeedbackCard onClick={openModal}>
    <Pagination />
  </FeedbackListContainer>
  <Dialog open={isDetailOpen} onOpenChange={...}> ← INLINE MODAL, không có route
    <DialogContent className="max-w-2xl">
      ...rating + comment + session meta
    </DialogContent>
  </Dialog>
</div>
```

### HeaderHero (gradient rose→pink, "received feedback" tone)

```tsx
<div className="rounded-2xl border border-rose-100/80 bg-gradient-to-br from-rose-50/80 via-white to-pink-50/80 ...">
  <div className="pointer-events-none absolute -top-12 -right-12 h-40 w-40 rounded-full bg-gradient-to-br from-rose-300/40 to-pink-300/40 blur-3xl ..." />
  <div className="... bg-gradient-to-br from-rose-500 to-pink-500 ..."><Inbox/></div>
  <h1>{t("mentorFeedback.feedbackReceived")}</h1>
  <p>{t("mentorFeedback.feedbackFromStudentsSentTo")}</p>
  <ReloadButton ... />
</div>
```

### KPI Strip — 4 stat cards (cùng pattern Students nhưng hue khác)

| Card | Hue     | Icon            | Value                 | Label               |
| ---- | ------- | --------------- | --------------------- | ------------------- |
| 1    | indigo  | `MessageSquare` | `feedbacks.length`    | Total response      |
| 2    | emerald | `TrendingUp`    | `avg` (1 decimal)     | Average star rating |
| 3    | sky     | `Users`         | `uniqueStudents.size` | Number of students  |
| 4    | amber   | `Trophy`        | `count rating===5`    | 5-star rating       |

### Filter + Sort (giống Reviews)

```tsx
{/* Filter */}
<Input placeholder="Search by name, email, feedback content, room name" />
<Select value={ratingFilter}>
  <SelectItem value="all">All</SelectItem>
  <SelectItem value="high">5 stars</SelectItem>
  <SelectItem value="medium">3-4 stars</SelectItem>
  <SelectItem value="low">1-2 stars</SelectItem>
</Select>

{/* Sort */}
<SortButton {...getSortProps("newestSortValue")}>Latest</SortButton>
<SortButton {...getSortProps("ratingSortValue")}>Rating score</SortButton>
<SortButton {...getSortProps("studentNameSortValue")}>Student name</SortButton>
```

### FeedbackList — vertical card list, click mở modal

```tsx
{
  pageData.map((feedback) => (
    <FeedbackCard
      key={feedback.id}
      feedback={feedback}
      showUser
      showMentor={false}
      showSession
      onClick={() => handleOpenDetail(feedback)} // ← mở modal
    />
  ));
}
```

### Feedback Detail Modal — **đây là vấn đề user đang nói**

```tsx
<Dialog open={isDetailOpen} onOpenChange={setIsDetailOpen}>
  <DialogContent className="max-w-2xl">
    {" "}
    ← max-w-2xl chỉ, không full screen
    <DialogHeader>
      <DialogTitle>Feedback details #{selectedFeedback?.id}</DialogTitle>
      <DialogDescription>Feedback from {studentName} sent to you</DialogDescription>
    </DialogHeader>
    {selectedFeedback && (
      <div className="space-y-4">
        <div className="flex items-center justify-center">
          <StarRating value={selectedFeedback.rating || 0} readOnly size="lg" />
        </div>
        <div>
          <h4>Response content</h4>
          <div className="rounded-lg bg-slate-50 p-4 dark:bg-slate-800">
            <p className="text-sm whitespace-pre-wrap">
              {selectedFeedback.comment || "Student has not left a detailed comment"}
            </p>
          </div>
        </div>
        <div className="grid grid-cols-1 gap-3 text-sm sm:grid-cols-2">
          <div>
            <span>Session code</span> #{sessionId}
          </div>
          <div>
            <span>Room name</span> {roomName}
          </div>
          <div>
            <span>Student</span> {name}
          </div>
          <div>
            <span>Email</span> {email}
          </div>
        </div>
      </div>
    )}
  </DialogContent>
</Dialog>
```

### Modal limitations (điểm đau khi redesign)

- Không thể share URL cho người khác
- Không có nút "Open full review" / link sang session detail
- Không có timestamp / metadata đầy đủ (session endTime, session room URL, v.v.)
- Không có action "Reply" / "Send message to student"
- Không có framer-motion animation, không có background blur như các detail page khác
- Phong cách lạc hậu so với `ReviewDetailPage` đã polish

### Data sources

| Hook                                 | Note                                                   |
| ------------------------------------ | ------------------------------------------------------ |
| `useMentorFeedbacksForCurrentUser()` | `GET /api/mentor-feedbacks/mentor/{id}` (Mentor-aware) |

### Empty states

- **No feedbacks:** EmptyState `MessageSquare` icon, "No response yet"

---

## 7. Tóm tắt các điểm đau (UX hiện tại)

### 7.1. Về tính nhất quán thiết kế

- **3 header hero** dùng 3 hue khác nhau: violet-fuchsia (Students), emerald-teal (Reviews), rose-pink (Feedback) → tốt cho phân biệt, nhưng thiếu unified identity cho cả dashboard.
- **Stats cards** dùng 4 màu khác nhau tùy page → giống nhau về pattern nhưng không có theme chung.
- **3 trang list** (Students/Reviews/Feedback) có layout gần giống hệt nhau: hero + KPI + filter + sort + list + pagination. Tốt cho muscle memory nhưng dễ nhàm.

### 7.2. Về Feedback detail (modal)

- Đây là **trang duy nhất** còn dùng modal thay vì route detail.
- Đã có route `/mentor/reviews/:id` (đã polish thành "Assessment Dossier") nhưng feedback detail vẫn là Dialog max-w-2xl.
- Phong cách modal lạc hậu, không consistent với các detail page khác (MentorSessionDetailPage, MentorSessionReviewViewPage, ReviewDetailPage).

### 7.3. Về phân cấp thông tin

- **StudentDetailPage** dùng pattern cũ (Card + CardHeader + Tabs 4 cột + simple border). Chưa có gradient hero, chưa có KPI strip style mới.
- **MentorReviewsPage** đã có hero + KPI + stats chart đẹp, nhưng `ReviewList` dùng shared component cũ.
- **GivenFeedbackListPage** giống MentorReviewsPage nhưng thiếu detail page route.

### 7.4. Về accessibility

- Tab labels trong `StudentDetailPage` đang hiển thị `({count})` inline nhưng không dùng SR-friendly format.
- Color-only status (Badge variants) — không có icon kèm theo.
- Keyboard navigation: Modal close bằng ESC OK, nhưng `ReviewList` click to detail → chỉ dùng mouse (no link semantics).

---

## 8. Patterns / tokens cho AI tham chiếu khi propose redesign

### 8.1. "Polished" pages — đã có pattern tốt để bám theo

| Pattern                                            | Files tham chiếu                                             |
| -------------------------------------------------- | ------------------------------------------------------------ |
| `HeroCommand` (gradient + icon badge + reload)     | `Mentor/Sessions/components/HeroCommand.tsx`                 |
| `PanelSurface` (single dark glass, no fruit salad) | `Mentor/Sessions/components/mentor-interview-primitives.tsx` |
| `SessionStatusBadge` (tone-driven)                 | `Mentor/Sessions/components/mentor-interview-primitives.tsx` |
| `CommandBar` (sticky action bar)                   | `Mentor/Sessions/components/CommandBar.tsx`                  |
| `SessionCard` (rich card with status personality)  | `Mentor/Sessions/components/SessionCard.tsx`                 |
| `STAR grid 2x2 with subtle hue gradient`           | `Mentor/Reviews/ReviewDetailPage.tsx`                        |
| `Certificate-style hero`                           | `Mentor/Sessions/MentorSessionReviewViewPage.tsx`            |
| `Bold hero + bento KPI strip`                      | `Mentor/Sessions/MentorSessionDetailPage.tsx`                |

### 8.2. Available primitives (existing)

```tsx
// Reuse these instead of inventing new ones
import {
  PanelSurface,
  SessionStatusBadge,
  SessionCard,
  HeroCommand,
  CommandBar,
} from "@/pages/Mentor/Sessions/components";
import { sessionStatusPalette } from "@/pages/Mentor/Sessions/components/mentor-interview.constants";

// shadcn primitives
import {
  Button,
  Card,
  Badge,
  Input,
  Select,
  Tabs,
  Dialog,
  EmptyState,
  Avatar,
  Skeleton,
  StarRating,
  TimeAgo,
} from "@/components/ui/*";
```

### 8.3. i18n keys reference

```
common.{home, overview, interviewSession, students, responseReceived, notification, messages, account, setting, back, editReview, backToTheList, totalSession, evaluate, name, session, feedback1, sessionCode1, roomName1, etc.}
mentorStudents.{student, totalStudents, listOfStudents, reviewed, reviewSubmitted, responseReceived1, etc.}
mentorReviews.{reviewSent, viewTheAssessmentsYouSent, situation, tasks, action, result, additionalComments, etc.}
mentorFeedback.{feedbackReceived, feedbackFromStudentsSentTo, ratingScore, studentName, numberOfStudents, etc.}
mentorMentordashboard.{reviewSent, mentorGate}
```

---

## 9. Checklist khi propose redesign

Khi AI đề xuất redesign, nên cover:

- [ ] Layout structure mới (hero / KPI / list / detail)
- [ ] Color tokens / gradient cụ thể (theo section)
- [ ] Component reuse (PanelSurface, HeroCommand, SessionCard, ...) thay vì tạo mới
- [ ] Dark mode variant rõ ràng
- [ ] Empty state / loading state / error state
- [ ] Accessibility (keyboard nav, ARIA, color contrast)
- [ ] Responsive breakpoint (mobile / tablet / desktop)
- [ ] i18n key suggestion (nếu thêm string mới)
- [ ] Có cần route detail mới không? (ví dụ feedback)
- [ ] Migration impact (existing data, navigation flow)

---

## 10. Note quan trọng cho AI

- 5 trang này hiện đang nằm trên nhánh `feat/mentor-ui-polish-v2` (mới tạo, base từ `main` sau khi merge 21 commits UI polish sessions/reviews).
- Codebase dùng **Vietnamese-first i18n** (key tồn tại trong `en.json`, `vi.json`, `ja.json`).
- Tất cả 5 trang này đều dùng `useAuthStore` để check role MENTOR, không cần check role thủ công trong component.
- BE filters `Mentor.id` (bảng mentor PK), không phải `User.id` (JWT sub) — đã được resolve trong `useCurrentMentorProfile`.
- Đừng đề xuất thay đổi backend; chỉ làm UI/UX.
- Đừng đề xuất thay đổi routing lớn (parent `<MentorDashboardPage>` + nested outlet). Hãy work trong từng page component.

---

_File này được generate tự động bởi Cursor từ việc đọc source code. Paste vào box chat AI khác và bắt đầu redesign._
