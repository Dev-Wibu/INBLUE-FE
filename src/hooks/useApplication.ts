import { $api } from "@/lib/api";

export const useApplications = (enabled = true) =>
  $api.useQuery("get", "/api/applications", undefined, { enabled });

export const useApplication = (id: number, enabled = true) =>
  $api.useQuery(
    "get",
    "/api/applications/{id}",
    { params: { path: { id } } },
    { enabled: enabled && id > 0 }
  );

export const useMyApplications = (enabled = true) =>
  $api.useQuery("get", "/api/applications/me", undefined, { enabled });

export const useApplyJobDescription = () => $api.useMutation("post", "/api/applications");

export const useUserById = (userId: number, enabled = true) =>
  $api.useQuery(
    "get",
    "/api/users/find-by-id/{userId}",
    { params: { path: { userId } } },
    { enabled: enabled && userId > 0 }
  );

export const useUsers = (enabled = true) =>
  $api.useQuery("get", "/api/users", undefined, { enabled });
