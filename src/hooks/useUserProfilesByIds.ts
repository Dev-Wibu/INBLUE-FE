import type { User } from "@/interfaces";
import { fetchClient } from "@/lib/api";
import { useQueries } from "@tanstack/react-query";
import { useMemo } from "react";

export function useUserProfilesByIds(userIds: Array<number | undefined>) {
  const ids = useMemo(
    () =>
      Array.from(
        new Set(
          userIds.filter(
            (id): id is number => typeof id === "number" && Number.isFinite(id) && id > 0
          )
        )
      ).sort((a, b) => a - b),
    [userIds]
  );

  const queries = useQueries({
    queries: ids.map((id) => ({
      queryKey: ["user-profile", id],
      queryFn: async () => {
        const response = await fetchClient.GET("/api/users/find-by-id/{userId}", {
          params: { path: { userId: id } },
        });
        return response.data ? (response.data as User) : null;
      },
      staleTime: 5 * 60 * 1000,
    })),
  });

  const profilesById = new Map<number, User>();
  queries.forEach((query, index) => {
    if (query.data) profilesById.set(ids[index], query.data);
  });

  return {
    profilesById,
    isRefetching: queries.some((query) => query.isRefetching),
    refetch: () => Promise.all(queries.map((query) => query.refetch())),
  };
}
