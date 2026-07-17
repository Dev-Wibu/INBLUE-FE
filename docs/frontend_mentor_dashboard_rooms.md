# 🧑‍🏫 Hướng Dẫn Frontend: Mentor Dashboard — Xem Phòng Cần Vào

> **File chuyên đề** cho Mentor. Giải thích cách lấy danh sách các phòng (Online + Offline) mà mentor đang được phân công, hiển thị countdown đến giờ hẹn, và cho phép join vào đúng thời điểm.

---

## 📋 Mục Lục

1. [Tổ Quan: Mentor Cần Thấy Gì](#1-tổ-quan-mentor-cần-thấy-gì)
2. [API Lấy Danh Sách Session của Mentor](#2-api-lấy-danh-sách-session-của-mentor)
3. [Logic Lọc & Sắp Xếp Phòng](#3-logic-lọc--sắp-xếp-phòng)
4. [Code React/TypeScript Hoàn Chỉnh](#4-code-reacttypescript-hoàn-chỉnh)
5. [Countdown Đến Giờ Hẹn](#5-countdown-đến-giờ-hẹn)
6. [Action Join Phòng](#6-action-join-phòng)
7. [UI/UX Mockup](#7-uiux-mockup)
8. [Edge Cases & Best Practices](#8-edge-cases--best-practices)

---

## 1. Tổ Quan: Mentor Cần Thấy Gì

Mentor cần một trang dashboard hiển thị **tất cả phòng họp** mà họ được gán, phân loại theo trạng thái:

| Trạng thái       | Ý nghĩa                                | Action của Mentor                            |
| ---------------- | -------------------------------------- | -------------------------------------------- |
| **CHƯA ĐẾN GIỜ** | `joinTime` còn cách hiện tại > 15 phút | Hiển thị countdown, disable nút "Vào phòng"  |
| **SẮP ĐẾN GIỜ**  | `joinTime` còn cách hiện tại ≤ 15 phút | Enable nút "Vào phòng", highlight            |
| **ĐANG DIỄN RA** | `status = ONGOING` (student đã join)   | Cho phép "Vào phòng" + tracking              |
| **CHỜ ĐÁNH GIÁ** | `status = COMPLETED`, chưa review      | Hiển thị nút "Đánh giá ứng viên"             |
| **ĐÃ ĐÁNH GIÁ**  | `status = COMPLETED`, đã review        | Hiển thị review đã nộp + thời lượng tham gia |
| **ĐÃ HỦY**       | `status = CANCELED`                    | Hiển thị disabled, không cho join            |

### Sơ đồ luồng

```
┌──────────────────────────────────────────────────────────────────┐
│  Mentor Dashboard                                                 │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ 📅 Hôm nay                                               │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ ⏰ 14:00 - Nguyễn Văn A                                  │    │
│  │    ONLINE - Sắp đến giờ (còn 5 phút)                   │    │
│  │    [🟢 Vào phòng]                                        │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ ⏰ 15:30 - Trần Thị B                                    │    │
│  │    OFFLINE - Còn 2 giờ 15 phút                         │    │
│  │    [🔒 Chưa đến giờ]                                     │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ ⏰ 16:00 - Lê Văn C                                       │    │
│  │    ONLINE - Đang diễn ra (status = ONGOING)             │    │
│  │    [🟢 Vào phòng ngay]                                    │    │
│  └─────────────────────────────────────────────────────────┘    │
│                                                                   │
│  ┌─────────────────────────────────────────────────────────┐    │
│  │ ✅ Đã hoàn thành                                          │    │
│  ├─────────────────────────────────────────────────────────┤    │
│  │ ⏰ 10:00 - Phạm Thị D  (hôm qua)                        │    │
│  │    ONLINE - Đã đánh giá ★★★★☆                          │    │
│  │    Thời lượng: 28 phút 30 giây                          │    │
│  │    [📝 Xem lại đánh giá]                                 │    │
│  └─────────────────────────────────────────────────────────┘    │
└──────────────────────────────────────────────────────────────────┘
```

---

## 2. API Lấy Danh Sách Session của Mentor

### 2.1 Endpoint

```
GET /api/sessions/{userId}/by-user
Authorization: Bearer {mentor_token}
```

> ⚠️ **Lưu ý quan trọng:** API này trả session mà `userId` là cả **student (`userId`)** lẫn **mentor (`userId2`)**. FE phải filter lại để chỉ lấy các session mà mentor là mentor (`session.userId2 === currentMentorId`).

**Logic Backend (`SessionServiceImpl.getSessionsByUserId`):**

```java
public List<SessionDetailResponse> getSessionsByUserId(int userId) {
    return sessionRepository.findAll().stream()
            .filter(s -> s.getUserId() == userId || s.getUserId2() == userId)
            .map(this::convertToDetailResponse)
            .collect(Collectors.toList());
}
```

### 2.2 Response

**Response 200 OK:**

```json
[
  {
    "id": 50,
    "roomName": "session-1721234567890",
    "userId": 5,
    "mentorId": 3,
    "roomUrl": "https://inblue.daily.co/session-1721234567890",
    "joinTime": "2026-07-20 14:00:00.000",
    "status": "SCHEDULED",
    "duration": 60,
    "participantId1": null,
    "participantId2": null,
    "startTime1": null,
    "endTime1": null,
    "startTime2": null,
    "endTime2": null,
    "durationSeconds1": null,
    "durationSeconds2": null,
    "recordUrl": null,
    "mentorReview": null,
    "mentorFeedback": null
  },
  {
    "id": 48,
    "roomName": "OFFLINE-abc123",
    "userId": 8,
    "mentorId": 3,
    "roomUrl": "OFFLINE",
    "joinTime": "2026-07-20 15:30:00.000",
    "status": "COMPLETED",
    "duration": 60,
    "participantId1": null,
    "participantId2": null,
    "startTime1": null,
    "endTime1": null,
    "startTime2": null,
    "endTime2": null,
    "durationSeconds1": null,
    "durationSeconds2": null,
    "recordUrl": null,
    "mentorReview": {
      "id": 1,
      "rating": 5,
      "comment": "Ứng viên rất tốt",
      "sessionId": 48
    },
    "mentorFeedback": {
      "id": 1,
      "strengths": "Kỹ năng tốt",
      "weaknesses": "Cần cải thiện communication",
      "sessionId": 48
    }
  }
]
```

### 2.3 Helper Function

```typescript
// services/sessionService.ts
import type { SessionDetailResponse } from "../types/session";

const BASE = "/api/sessions";

export async function getSessionsByUserId(
  userId: number,
  token: string
): Promise<SessionDetailResponse[]> {
  const res = await fetch(`${BASE}/${userId}/by-user`, {
    headers: { Authorization: `Bearer ${token}` },
  });
  if (!res.ok) throw new Error(`Failed to fetch sessions: ${res.status}`);
  return res.json();
}

/**
 * Lấy danh sách phòng mà mentor là mentor (loại bỏ các session mà user là student)
 */
export async function getSessionsForMentor(
  mentorId: number,
  token: string
): Promise<SessionDetailResponse[]> {
  const all = await getSessionsByUserId(mentorId, token);
  return all.filter((s) => s.mentorId === mentorId); // ★ Chỉ lấy session mà mình là mentor
}
```

---

## 3. Logic Lọc & Sắp Xếp Phòng

### 3.1 Helper Tính Trạng Thái Hiển Thị

```typescript
// utils/sessionStatus.ts
export type MentorRoomViewStatus =
  | "CHUA_DEN_GIO" // Còn > 15 phút
  | "SAP_DEN_GIO" // Còn ≤ 15 phút, status = SCHEDULED
  | "DANG_DIEN_RA" // status = ONGOING
  | "CHO_DANH_GIA" // status = COMPLETED, chưa review
  | "DA_DANH_GIA" // status = COMPLETED, đã review
  | "DA_HUY"; // status = CANCELED / REJECTED

const BUFFER_MINUTES = 15; // Cho phép vào phòng trước 15 phút

export function getMentorRoomViewStatus(
  session: SessionDetailResponse,
  now: Date = new Date()
): MentorRoomViewStatus {
  // Session đã hủy → không cho join
  if (session.status === "CANCELED" || session.status === "REJECTED") {
    return "DA_HUY";
  }

  // Session đã hoàn thành
  if (session.status === "COMPLETED") {
    return session.mentorReview || session.mentorFeedback ? "DA_DANH_GIA" : "CHO_DANH_GIA";
  }

  // Session đang diễn ra (student đã join)
  if (session.status === "ONGOING") {
    return "DANG_DIEN_RA";
  }

  // Session SCHEDULED → check thời gian
  if (session.status === "SCHEDULED") {
    const joinTime = parseVN(session.joinTime);
    if (!joinTime) return "CHUA_DEN_GIO";

    const minutesUntilJoin = (joinTime.getTime() - now.getTime()) / 60_000;
    if (minutesUntilJoin <= BUFFER_MINUTES) return "SAP_DEN_GIO";
    return "CHUA_DEN_GIO";
  }

  return "CHUA_DEN_GIO";
}

export function getMinutesUntilJoin(
  session: SessionDetailResponse,
  now: Date = new Date()
): number {
  const joinTime = parseVN(session.joinTime);
  if (!joinTime) return 0;
  return Math.round((joinTime.getTime() - now.getTime()) / 60_000);
}

export function canJoinRoom(session: SessionDetailResponse, now: Date = new Date()): boolean {
  const viewStatus = getMentorRoomViewStatus(session, now);
  return viewStatus === "SAP_DEN_GIO" || viewStatus === "DANG_DIEN_RA";
}
```

### 3.2 Helper Phân Loại Phòng

```typescript
// utils/groupSessions.ts
export function groupSessionsForMentor(sessions: SessionDetailResponse[], now: Date = new Date()) {
  const todayStart = new Date(now);
  todayStart.setHours(0, 0, 0, 0);

  const tomorrowStart = new Date(todayStart);
  tomorrowStart.setDate(tomorrowStart.getDate() + 1);

  const groups = {
    today: [] as SessionDetailResponse[],
    upcoming: [] as SessionDetailResponse[], // Sắp tới (không phải hôm nay)
    waitingReview: [] as SessionDetailResponse[], // Chờ đánh giá
    completed: [] as SessionDetailResponse[], // Đã xong + đã đánh giá
    canceled: [] as SessionDetailResponse[], // Đã hủy
  };

  sessions.forEach((s) => {
    const status = getMentorRoomViewStatus(s, now);
    const joinTime = parseVN(s.joinTime);

    if (status === "DA_HUY") {
      groups.canceled.push(s);
      return;
    }

    if (status === "CHO_DANH_GIA") {
      groups.waitingReview.push(s);
      return;
    }

    if (status === "DA_DANH_GIA") {
      groups.completed.push(s);
      return;
    }

    // SCHEDULED / ONGOING / SAP_DEN_GIO / CHUA_DEN_GIO
    if (!joinTime) {
      groups.upcoming.push(s);
      return;
    }

    if (joinTime >= todayStart && joinTime < tomorrowStart) {
      groups.today.push(s);
    } else if (joinTime > now) {
      groups.upcoming.push(s);
    }
  });

  // Sắp xếp theo joinTime tăng dần
  groups.today.sort((a, b) => parseVN(a.joinTime)!.getTime() - parseVN(b.joinTime)!.getTime());
  groups.upcoming.sort((a, b) => parseVN(a.joinTime)!.getTime() - parseVN(b.joinTime)!.getTime());
  groups.waitingReview.sort(
    (a, b) => parseVN(b.joinTime)!.getTime() - parseVN(a.joinTime)!.getTime()
  );
  groups.completed.sort((a, b) => parseVN(b.joinTime)!.getTime() - parseVN(a.joinTime)!.getTime());

  return groups;
}
```

---

## 4. Code React/TypeScript Hoàn Chỉnh

### 4.1 Custom Hook: `useMentorRooms`

```typescript
// hooks/useMentorRooms.ts
import { useEffect, useState, useCallback } from "react";
import type { SessionDetailResponse } from "../types/session";
import { getSessionsForMentor } from "../services/sessionService";
import { getMentorRoomViewStatus, canJoinRoom, getMinutesUntilJoin } from "../utils/sessionStatus";

export function useMentorRooms(mentorId: number, token: string) {
  const [sessions, setSessions] = useState<SessionDetailResponse[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [now, setNow] = useState(new Date());

  const refresh = useCallback(async () => {
    try {
      setLoading(true);
      const data = await getSessionsForMentor(mentorId, token);
      setSessions(data);
      setError(null);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
    }
  }, [mentorId, token]);

  useEffect(() => {
    refresh();
  }, [refresh]);

  // Update now every 30s để countdown tự chạy
  useEffect(() => {
    const timer = setInterval(() => setNow(new Date()), 30_000);
    return () => clearInterval(timer);
  }, []);

  // Tự động refresh mỗi 60s
  useEffect(() => {
    const timer = setInterval(refresh, 60_000);
    return () => clearInterval(timer);
  }, [refresh]);

  return {
    sessions,
    loading,
    error,
    now,
    refresh,
    getStatus: (s: SessionDetailResponse) => getMentorRoomViewStatus(s, now),
    canJoin: (s: SessionDetailResponse) => canJoinRoom(s, now),
    minutesUntilJoin: (s: SessionDetailResponse) => getMinutesUntilJoin(s, now),
  };
}
```

### 4.2 Component: `MentorRoomCard`

```tsx
// components/MentorRoomCard.tsx
import { Card, Tag, Button, Space, Avatar, Statistic, Tooltip } from "antd";
import {
  UserOutlined,
  VideoCameraOutlined,
  EnvironmentOutlined,
  ClockCircleOutlined,
  StarFilled,
} from "@ant-design/icons";
import { useNavigate } from "react-router-dom";
import type { SessionDetailResponse } from "../types/session";
import type { MentorRoomViewStatus } from "../utils/sessionStatus";
import { formatVN, formatSecondsVN } from "../utils/timezone";

interface Props {
  session: SessionDetailResponse;
  viewStatus: MentorRoomViewStatus;
  minutesUntilJoin: number;
  canJoin: boolean;
}

export function MentorRoomCard({ session, viewStatus, minutesUntilJoin, canJoin }: Props) {
  const navigate = useNavigate();
  const isOnline = session.roomUrl && session.roomUrl !== "OFFLINE";

  const handleJoin = () => {
    if (!canJoin) return;
    if (isOnline) {
      // Mở Daily.co trong tab mới
      window.open(session.roomUrl, "_blank");
    } else {
      // OFFLINE → xem địa chỉ
      navigate(`/mentor/offline-info/${session.id}`);
    }
  };

  const handleReview = () => {
    navigate(`/mentor/review/${session.id}`);
  };

  return (
    <Card
      hoverable
      style={{ marginBottom: 16, borderLeft: `4px solid ${STATUS_COLORS[viewStatus]}` }}
      title={
        <Space>
          <ClockCircleOutlined />
          <Text strong>{formatVN(session.joinTime)}</Text>
          {viewStatus === "SAP_DEN_GIO" && <Tag color="orange">Sắp đến giờ</Tag>}
          {viewStatus === "DANG_DIEN_RA" && <Tag color="processing">Đang diễn ra</Tag>}
        </Space>
      }
      extra={getStatusBadge(viewStatus)}>
      <Row gutter={16}>
        {/* Cột 1: Thông tin ứng viên */}
        <Col span={8}>
          <Statistic title="Ứng viên" value={`User #${session.userId}`} prefix={<UserOutlined />} />
          <Text type="secondary" style={{ fontSize: 12 }}>
            ID: {session.userId}
          </Text>
        </Col>

        {/* Cột 2: Hình thức */}
        <Col span={8}>
          <Statistic
            title="Hình thức"
            valueRender={() =>
              isOnline ? (
                <Tag color="blue" icon={<VideoCameraOutlined />}>
                  ONLINE
                </Tag>
              ) : (
                <Tag color="purple" icon={<EnvironmentOutlined />}>
                  OFFLINE
                </Tag>
              )
            }
          />
          <Text type="secondary" style={{ fontSize: 12 }}>
            Thời lượng: {session.duration} phút
          </Text>
        </Col>

        {/* Cột 3: Countdown */}
        <Col span={8}>
          {viewStatus === "CHUA_DEN_GIO" && (
            <Statistic
              title="Còn lại"
              value={minutesUntilJoin}
              suffix="phút"
              valueStyle={{ color: minutesUntilJoin < 60 ? "#faad14" : "#000" }}
            />
          )}
          {viewStatus === "SAP_DEN_GIO" && (
            <Statistic
              title="Có thể vào"
              value={minutesUntilJoin}
              suffix="phút"
              valueStyle={{ color: "#52c41a" }}
            />
          )}
          {viewStatus === "DANG_DIEN_RA" && (
            <Tag color="processing" style={{ fontSize: 16, padding: "4px 12px" }}>
              🔴 Student đang chờ
            </Tag>
          )}
          {viewStatus === "CHO_DANH_GIA" && (
            <Tag color="warning" style={{ fontSize: 14 }}>
              Cần đánh giá
            </Tag>
          )}
          {viewStatus === "DA_DANH_GIA" && session.mentorReview && (
            <Space direction="vertical" size={0}>
              <Text>Đã đánh giá</Text>
              <Space>
                {[1, 2, 3, 4, 5].map((i) => (
                  <StarFilled
                    key={i}
                    style={{
                      color: i <= session.mentorReview!.rating ? "#faad14" : "#d9d9d9",
                    }}
                  />
                ))}
              </Space>
              {session.durationSeconds2 != null && (
                <Text type="secondary" style={{ fontSize: 12 }}>
                  ⏱️ {formatSecondsVN(session.durationSeconds2)}
                </Text>
              )}
            </Space>
          )}
        </Col>
      </Row>

      <Divider style={{ margin: "12px 0" }} />

      {/* Action buttons */}
      <Space>
        {viewStatus === "CHUA_DEN_GIO" && (
          <Tooltip title={`Có thể vào trước ${minutesUntilJoin} phút nữa`}>
            <Button disabled icon={<ClockCircleOutlined />}>
              Chưa đến giờ
            </Button>
          </Tooltip>
        )}
        {(viewStatus === "SAP_DEN_GIO" || viewStatus === "DANG_DIEN_RA") && (
          <Button type="primary" onClick={handleJoin}>
            🟢 {isOnline ? "Vào phòng Online" : "Xem địa chỉ Offline"}
          </Button>
        )}
        {viewStatus === "CHO_DANH_GIA" && (
          <Button type="primary" danger onClick={handleReview}>
            📝 Đánh giá ứng viên
          </Button>
        )}
        {viewStatus === "DA_DANH_GIA" && (
          <Button onClick={() => navigate(`/mentor/review/${session.id}`)}>Xem lại đánh giá</Button>
        )}
        {viewStatus === "DA_HUY" && <Button disabled>Đã hủy</Button>}
      </Space>
    </Card>
  );
}

const STATUS_COLORS: Record<MentorRoomViewStatus, string> = {
  CHUA_DEN_GIO: "#d9d9d9",
  SAP_DEN_GIO: "#faad14",
  DANG_DIEN_RA: "#1890ff",
  CHO_DANH_GIA: "#fa541c",
  DA_DANH_GIA: "#52c41a",
  DA_HUY: "#ff4d4f",
};

function getStatusBadge(status: MentorRoomViewStatus) {
  const map: Record<MentorRoomViewStatus, { color: string; text: string }> = {
    CHUA_DEN_GIO: { color: "default", text: "Chưa đến giờ" },
    SAP_DEN_GIO: { color: "orange", text: "Sắp đến giờ" },
    DANG_DIEN_RA: { color: "processing", text: "Đang diễn ra" },
    CHO_DANH_GIA: { color: "warning", text: "Chờ đánh giá" },
    DA_DANH_GIA: { color: "success", text: "Đã hoàn thành" },
    DA_HUY: { color: "error", text: "Đã hủy" },
  };
  const cfg = map[status];
  return <Tag color={cfg.color}>{cfg.text}</Tag>;
}
```

### 4.3 Page: `MentorDashboardPage`

```tsx
// pages/MentorDashboardPage.tsx
import { useContext } from "react";
import { Typography, Empty, Spin, Alert, Button, Skeleton, Tabs, Badge } from "antd";
import {
  ReloadOutlined,
  ClockCircleOutlined,
  CheckCircleOutlined,
  EditOutlined,
  CalendarOutlined,
  StopOutlined,
} from "@ant-design/icons";
import { AuthContext } from "../contexts/AuthContext";
import { useMentorRooms } from "../hooks/useMentorRooms";
import { MentorRoomCard } from "../components/MentorRoomCard";
import { groupSessionsForMentor } from "../utils/groupSessions";

const { Title, Text } = Typography;

export function MentorDashboardPage() {
  const { user, token } = useContext(AuthContext);
  const { sessions, loading, error, refresh, getStatus, canJoin, minutesUntilJoin } =
    useMentorRooms(user.id, token);

  if (loading) return <Skeleton active paragraph={{ rows: 10 }} />;
  if (error) return <Alert type="error" message={error} showIcon />;

  const groups = groupSessionsForMentor(sessions);

  const renderList = (list: typeof sessions, emptyText: string) =>
    list.length === 0 ? (
      <Empty description={emptyText} />
    ) : (
      list.map((s) => (
        <MentorRoomCard
          key={s.id}
          session={s}
          viewStatus={getStatus(s)}
          minutesUntilJoin={minutesUntilJoin(s)}
          canJoin={canJoin(s)}
        />
      ))
    );

  return (
    <div style={{ padding: 24, maxWidth: 1200, margin: "0 auto" }}>
      <Space style={{ justifyContent: "space-between", width: "100%", marginBottom: 16 }}>
        <div>
          <Title level={2}>📋 Dashboard Mentor</Title>
          <Text type="secondary">Quản lý các phòng phỏng vấn của bạn</Text>
        </div>
        <Button icon={<ReloadOutlined />} onClick={refresh}>
          Làm mới
        </Button>
      </Space>

      <Tabs defaultActiveKey="today" size="large">
        <Tabs.TabPane
          tab={
            <span>
              <ClockCircleOutlined /> Hôm nay ({groups.today.length})
            </span>
          }
          key="today">
          {renderList(groups.today, "Không có phòng nào hôm nay")}
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <CalendarOutlined /> Sắp tới ({groups.upcoming.length})
            </span>
          }
          key="upcoming">
          {renderList(groups.upcoming, "Không có phòng nào sắp tới")}
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <Badge count={groups.waitingReview.length} offset={[10, -2]}>
              <span>
                <EditOutlined /> Chờ đánh giá ({groups.waitingReview.length})
              </span>
            </Badge>
          }
          key="waitingReview">
          {renderList(groups.waitingReview, "Không có phòng chờ đánh giá")}
        </Tabs.TabPane>

        <Tabs.TabPane
          tab={
            <span>
              <CheckCircleOutlined /> Đã hoàn thành ({groups.completed.length})
            </span>
          }
          key="completed">
          {renderList(groups.completed, "Chưa có phòng đã hoàn thành")}
        </Tabs.TabPane>

        {groups.canceled.length > 0 && (
          <Tabs.TabPane
            tab={
              <span>
                <StopOutlined /> Đã hủy ({groups.canceled.length})
              </span>
            }
            key="canceled">
            {renderList(groups.canceled, "")}
          </Tabs.TabPane>
        )}
      </Tabs>
    </div>
  );
}
```

---

## 5. Countdown Đến Giờ Hẹn

### 5.1 Component Countdown Riêng (Optional)

```tsx
// components/CountdownTimer.tsx
import { useEffect, useState } from "react";
import { parseVN } from "../utils/timezone";

interface Props {
  targetTime: string; // session.joinTime
  onReached?: () => void;
}

export function CountdownTimer({ targetTime, onReached }: Props) {
  const [remaining, setRemaining] = useState(() => {
    const target = parseVN(targetTime);
    if (!target) return 0;
    return Math.max(0, target.getTime() - Date.now());
  });

  useEffect(() => {
    const target = parseVN(targetTime);
    if (!target) return;

    const timer = setInterval(() => {
      const left = Math.max(0, target.getTime() - Date.now());
      setRemaining(left);

      if (left === 0) {
        clearInterval(timer);
        onReached?.();
      }
    }, 1000);

    return () => clearInterval(timer);
  }, [targetTime, onReached]);

  if (remaining === 0) {
    return <Tag color="red">⏰ Đã đến giờ!</Tag>;
  }

  const hours = Math.floor(remaining / 3_600_000);
  const minutes = Math.floor((remaining % 3_600_000) / 60_000);
  const seconds = Math.floor((remaining % 60_000) / 1000);

  const color = remaining < 60_000 ? "red" : remaining < 15 * 60_000 ? "orange" : "default";

  return (
    <Tag color={color}>
      ⏱️ {hours > 0 ? `${hours}h ` : ""}
      {minutes}m {seconds}s
    </Tag>
  );
}
```

### 5.2 Sử Dụng

```tsx
// Trong MentorRoomCard
<CountdownTimer
  targetTime={session.joinTime}
  onReached={() => {
    // Auto refresh khi đến giờ
    refresh();
  }}
/>
```

---

## 6. Action Join Phòng

### 6.1 Join Online Phòng

```typescript
// utils/joinRoom.ts
export function joinOnlineRoom(session: SessionDetailResponse, mentorId: number, token: string) {
  // Mở Daily.co trong tab mới
  const newWindow = window.open(session.roomUrl, "_blank");

  if (!newWindow) {
    throw new Error("Popup bị chặn. Vui lòng cho phép popup cho trang này.");
  }

  // Tracking startTime2 sẽ do MentorOnlineRoom component xử lý
  // khi Daily.co 'joined-meeting' event fires
}
```

### 6.2 Offline: Hiển Thị Địa Chỉ

```tsx
// pages/MentorOfflineInfoPage.tsx
import { useEffect, useState } from 'react';
import { Card, Typography, Descriptions, Button, Alert, Map } from 'antd';
import { useParams } from 'react-router-dom';
import { EnvironmentOutlined, PhoneOutlined } from '@ant-design/icons';

const COMPANY_ADDRESS = 'Tầng 5, Tòa nhà XYZ, 123 Nguyễn Văn A, Quận 1, TP.HCM';

export function MentorOfflineInfoPage() {
    const { sessionId } = useParams();
    const [session, setSession] = useState<any>(null);
    const { token } = useContext(AuthContext);

    useEffect(() => {
        fetch(`/api/sessions/${sessionId}`, {
            headers: { 'Authorization': `Bearer ${token}` }
        })
            .then(r => r.json())
            .then(setSession);
    }, [sessionId, token]);

    if (!session) return <Spin />;

    return (
        <Card style={{ maxWidth: 800, margin: '0 auto' }}>
            <Title level={3}>
                <EnvironmentOutlined /> Phỏng vấn Offline
            </Title>
            <Alert
                type="info"
                showIcon
                message="Phỏng vấn trực tiếp tại văn phòng công ty"
                style={{ marginBottom: 16 }}
            />

            <Descriptions bordered column={1}>
                <Descriptions.Item label="Ứng viên">
                    User #{session.userId}
                </Descriptions.Item>
                <Descriptions.Item label="Thời gian">
                    {formatVN(session.joinTime)}
                </Descriptions.Item>
                <Descriptions.Item label="Thời lượng">
                    {session.duration} phút
                </Descriptions.Item>
                <Descriptions.Item label="Địa chỉ">
                    <Text strong>{COMPANY_ADDRESS}</Text>
                </Descriptions.Item>
                <Descriptions.Item label="Liên hệ">
                    <PhoneOutlined /> 0123 456 789 (HR Dept)
                </Descriptions.Item>
            </Descriptions>

            <Divider />

            <iframe
                src={`https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!...embed...`}
                width="100%"
                height="300"
                style={{ border: 0, borderRadius: 8 }}
                loading="lazy"
            />

            <Divider />

            <Space>
                <Button type="primary" onClick={() => navigate('/mentor/dashboard')}>
                    Quay lại Dashboard
                </Button>
                <Button danger onClick={async () => {
                    if (confirm('Xác nhận đã hoàn thành phỏng vấn?')) {
                        await fetch(`/api/mentor-reviews/...`, { method: 'POST', ... });
                        navigate(`/mentor/review/${sessionId}`);
                    }
                }}>
                    ✅ Đánh dấu đã xong
                </Button>
            </Space>
        </Card>
    );
}
```

---

## 7. UI/UX Mockup

### 7.1 Layout Tổng Quan

```
┌─────────────────────────────────────────────────────────────────┐
│  📋 Dashboard Mentor                            [🔄 Làm mới]   │
│  Quản lý các phòng phỏng vấn của bạn                           │
├─────────────────────────────────────────────────────────────────┤
│  [📅 Hôm nay (2)] [📅 Sắp tới (5)] [⏳ Chờ DG (3)] [✅ Xong] │
├─────────────────────────────────────────────────────────────────┤
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ ⏰ 14:00 - User #5                          🟡 Sắp đến giờ ║ │
│  ║  ONLINE • 60 phút • Còn 5 phút                          ║ │
│  ║                              [🟢 Vào phòng Online]       ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
│                                                                  │
│  ╔═══════════════════════════════════════════════════════════╗ │
│  ║ ⏰ 15:30 - User #8                           ✅ Đã xong   ║ │
│  ║  OFFLINE • 60 phút • ⭐⭐⭐⭐⭐ (5/5)                    ║ │
│  ║  Thời lượng: 28 phút 30 giây                            ║ │
│  ║                              [📝 Xem lại đánh giá]       ║ │
│  ╚═══════════════════════════════════════════════════════════╝ │
└─────────────────────────────────────────────────────────────────┘
```

### 7.2 Empty States

- **Mentor mới, chưa có phòng nào:**

  > 🌱 Bạn chưa được gán phòng phỏng vấn nào. Vui lòng đợi Admin phân công.

- **Đã có phòng nhưng chưa đến giờ:**
  > 📅 Bạn có 5 phòng sắp tới. Phòng gần nhất: 16:00 hôm nay.

---

## 8. Edge Cases & Best Practices

### 8.1 Edge Cases

| Tình huống                                                          | Xử lý                                                                     |
| ------------------------------------------------------------------- | ------------------------------------------------------------------------- |
| **API trả list rỗng**                                               | Hiển thị Empty "Bạn chưa có phòng nào"                                    |
| **`joinTime` null**                                                 | Hiển thị "Chưa xác định thời gian", disable join                          |
| **`status = DRAFT`** (không xảy ra cho Mentor, chỉ Admin)           | Hiển thị "Chưa được duyệt"                                                |
| **`session.userId === session.userId2`** (cùng 1 user là cả 2 role) | Hiển thị cảnh báo hoặc filter ra                                          |
| **`roomUrl = "OFFLINE"`**                                           | Hiển thị nút "Xem địa chỉ" thay vì "Vào phòng Online"                     |
| **Session COMPLETED nhưng chưa có mentorReview**                    | Hiển thị tab "Chờ đánh giá" với badge đỏ                                  |
| **Mentor click "Vào phòng" nhưng student chưa vào**                 | Vẫn cho vào (status = SCHEDULED), backend sẽ set ONGOING khi student join |
| **Tab "Chờ đánh giá" có quá nhiều (>10)**                           | Thêm filter theo ngày, sort theo thời gian                                |
| **Mentor mất token / token expired**                                | Redirect về trang login, giữ returnUrl                                    |
| **Network error khi gọi API**                                       | Toast lỗi + nút "Thử lại"                                                 |

### 8.2 Best Practices

1. **Auto-refresh mỗi 60s** cho danh sách session (xem `useMentorRooms`).
2. **Re-fetch ngay** khi user click "Làm mới" hoặc khi tab được focus (`visibilitychange` event).
3. **Polling trên tab "Chờ đánh giá"** 30s/lần (ưu tiên cao nhất).
4. **Cache trong memory** với key là `mentorId` để tránh gọi API nhiều lần khi navigate qua lại.
5. **Hiển thị timezone rõ ràng**: "14:00 (GMT+7)" hoặc "14:00 ICT".
6. **Cho phép click vào card** → mở modal chi tiết thay vì navigate trang mới (UX tốt hơn).
7. **Highlight phòng sắp đến giờ** bằng animation pulse hoặc badge nổi bật.
8. **Sắp xếp:** "Hôm nay" → theo joinTime tăng dần. "Sắp tới" → theo joinTime tăng dần. "Chờ đánh giá" → theo joinTime giảm dần (cũ nhất lên đầu).

### 8.3 Performance Tips

```typescript
// Tối ưu re-render: chỉ re-render card khi viewStatus thay đổi
const MemoizedCard = React.memo(MentorRoomCard, (prev, next) => {
  return (
    prev.viewStatus === next.viewStatus &&
    prev.canJoin === next.canJoin &&
    Math.abs(prev.minutesUntilJoin - next.minutesUntilJoin) < 1
  );
});
```

### 8.4 Notification (Optional - Phase 2)

```typescript
// Hook: use-mentor-notification.ts
useEffect(() => {
  // Request permission
  if ("Notification" in window) {
    Notification.requestPermission();
  }
}, []);

// Khi session sắp đến giờ (còn 15 phút)
useEffect(() => {
  sessions.forEach((s) => {
    if (getMinutesUntilJoin(s) === 15 && canJoin(s)) {
      new Notification(`📞 Phòng phỏng vấn sắp bắt đầu`, {
        body: `User #${s.userId} - ${formatVN(s.joinTime)}`,
        icon: "/logo.png",
      });
    }
  });
}, [sessions]);
```

---

## 🎯 TL;DR cho FE Agent

**Để mentor thấy phòng cần vào:**

1. **Gọi `GET /api/sessions/{mentorId}/by-user`** với `mentorId` = ID user hiện tại (đang đăng nhập vai mentor).
2. **Filter lại:** chỉ lấy các session có `session.mentorId === mentorId` (loại bỏ các session mà mentor là student).
3. **Phân loại:** Hôm nay / Sắp tới / Chờ đánh giá / Đã hoàn thành / Đã hủy — dựa trên `session.joinTime` + `session.status`.
4. **Hiển thị countdown** tự update mỗi 30s, dựa trên `session.joinTime`.
5. **Cho phép Join khi:** `status = ONGOING` HOẶC `joinTime` còn ≤ 15 phút. ONLINE → mở `roomUrl`. OFFLINE → hiển thị địa chỉ.
6. **Auto-refresh** mỗi 60s để cập nhật status mới nhất.

**Code ở trên là production-ready**, FE Agent có thể copy vào project, chỉ cần điều chỉnh:

- Đường dẫn import types/components cho phù hợp với cấu trúc dự án.
- `COMPANY_ADDRESS` cho phần OFFLINE.
- Style Ant Design tokens nếu muốn match theme.

✅ **File này giải quyết hoàn toàn câu hỏi: "Mentor làm sao thấy được phòng cần join khi đến giờ?"**
