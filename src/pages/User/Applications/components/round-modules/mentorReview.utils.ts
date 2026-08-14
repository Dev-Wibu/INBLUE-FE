import type { MentorResponse } from "@/hooks/useApplicationDetails";

type UnknownRecord = Record<string, unknown>;

function asRecord(value: unknown): UnknownRecord | null {
  return value !== null && typeof value === "object" ? (value as UnknownRecord) : null;
}

function toMentor(value: unknown): MentorResponse | null {
  const record = asRecord(value);
  if (!record) return null;

  const hasMentorIdentity =
    record.id != null ||
    typeof record.name === "string" ||
    typeof record.email === "string" ||
    typeof record.avatarUrl === "string" ||
    typeof record.expertise === "string";

  return hasMentorIdentity ? (record as MentorResponse) : null;
}

function mentorKey(mentor: MentorResponse): string | null {
  if (mentor.id != null) return `id:${Number(mentor.id)}`;
  if (mentor.email) return `email:${mentor.email.trim().toLowerCase()}`;
  if (mentor.name) return `name:${mentor.name.trim().toLowerCase()}`;
  return null;
}

function definedMentorFields(mentor: MentorResponse): Partial<MentorResponse> {
  return Object.fromEntries(
    Object.entries(mentor).filter(
      ([, value]) => value !== undefined && value !== null && value !== ""
    )
  ) as Partial<MentorResponse>;
}

export function mergeMentorResponses(
  ...groups: Array<ReadonlyArray<MentorResponse> | null | undefined>
): MentorResponse[] {
  const merged = new Map<string, MentorResponse>();
  let anonymousIndex = 0;

  groups.forEach((group) => {
    group?.forEach((mentor) => {
      const key = mentorKey(mentor) ?? `anonymous:${anonymousIndex++}`;
      const current = merged.get(key);
      merged.set(key, {
        ...current,
        ...definedMentorFields(mentor),
      });
    });
  });

  return Array.from(merged.values());
}

export function collectEmbeddedMentors(...sources: unknown[]): MentorResponse[] {
  const collected: MentorResponse[] = [];

  const addMentor = (value: unknown) => {
    const mentor = toMentor(value);
    if (mentor) collected.push(mentor);
  };

  sources.forEach((source) => {
    const record = asRecord(source);
    if (!record) return;

    [record.assignedMentors, record.assigned_mentors, record.mentors].forEach((value) => {
      if (Array.isArray(value)) value.forEach(addMentor);
    });

    addMentor(record.mentor);

    [record.mentorReview, record.mentorFeedback, record.sessionInfo, record.session].forEach(
      (nestedValue) => {
        const nested = asRecord(nestedValue);
        if (nested) addMentor(nested.mentor);
      }
    );

    const flatMentorName =
      typeof record.mentorName === "string" ? record.mentorName.trim() : undefined;
    const flatMentorAvatar =
      typeof record.mentorAvatarUrl === "string"
        ? record.mentorAvatarUrl
        : typeof record.mentorAvatar === "string"
          ? record.mentorAvatar
          : undefined;

    if (flatMentorName || flatMentorAvatar) {
      addMentor({
        id: record.mentorId,
        name: flatMentorName,
        avatarUrl: flatMentorAvatar,
      });
    }
  });

  return mergeMentorResponses(collected);
}

export function resolveSelectedMentor(
  mentors: ReadonlyArray<MentorResponse>,
  ...mentorIds: Array<number | string | null | undefined>
): MentorResponse | null {
  const normalizedIds = mentorIds
    .map((id) => Number(id))
    .filter((id) => Number.isFinite(id) && id > 0);

  const matched = mentors.find(
    (mentor) => mentor.id != null && normalizedIds.includes(Number(mentor.id))
  );

  if (matched) return matched;
  return mentors.length === 1 ? mentors[0] : null;
}

function toPositiveId(value: unknown): number | null {
  const id = Number(value);
  return Number.isInteger(id) && id > 0 ? id : null;
}

export function resolvePersistedMentorId(...sources: unknown[]): number | null {
  for (const source of sources) {
    const record = asRecord(source);
    if (!record) continue;

    const sessionInfo = asRecord(record.sessionInfo);
    const session = asRecord(record.session);
    const mentorReview = asRecord(record.mentorReview);
    const reviewMentor = asRecord(mentorReview?.mentor);
    const reviewSession = asRecord(mentorReview?.session);

    const candidates = [
      record.mentorId,
      record.userId2,
      sessionInfo?.mentorId,
      session?.mentorId,
      session?.userId2,
      reviewMentor?.id,
      reviewSession?.mentorId,
      reviewSession?.userId2,
    ];

    for (const candidate of candidates) {
      const id = toPositiveId(candidate);
      if (id) return id;
    }
  }

  return null;
}
