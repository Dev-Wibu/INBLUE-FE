export const PENDING_JD_PURCHASE_ID_KEY = "pending_jd_purchase_id";
export const PENDING_JD_PURCHASE_RETURN_KEY = "pending_jd_purchase_return_url";

export function buildJdPurchaseReturnPath(jdId: number, mode?: "all" | "recommended"): string {
  const params = new URLSearchParams({ tab: "jobSearch" });
  if (mode === "recommended") params.set("mode", mode);
  params.set("jobId", String(jdId));
  return `/user?${params.toString()}`;
}

export function rememberPendingJdPurchase(
  jdId: number,
  storage: Pick<Storage, "setItem"> = localStorage,
  mode?: "all" | "recommended"
): void {
  storage.setItem(PENDING_JD_PURCHASE_ID_KEY, String(jdId));
  storage.setItem(PENDING_JD_PURCHASE_RETURN_KEY, buildJdPurchaseReturnPath(jdId, mode));
}

export function getPendingJdPurchaseId(
  search: string,
  storage: Pick<Storage, "getItem"> = localStorage
): number | null {
  const queryJdId = new URLSearchParams(search).get("jdId");
  const parsed = Number(queryJdId || storage.getItem(PENDING_JD_PURCHASE_ID_KEY));
  return Number.isInteger(parsed) && parsed > 0 ? parsed : null;
}

export function getJdPurchaseReturnPath(
  jdId: number,
  storage: Pick<Storage, "getItem"> = localStorage
): string {
  const storedPath = storage.getItem(PENDING_JD_PURCHASE_RETURN_KEY);
  const defaultPath = buildJdPurchaseReturnPath(jdId);
  const recommendedPath = buildJdPurchaseReturnPath(jdId, "recommended");
  return storedPath === defaultPath || storedPath === recommendedPath ? storedPath : defaultPath;
}

export function clearPendingJdPurchase(storage: Pick<Storage, "removeItem"> = localStorage): void {
  storage.removeItem(PENDING_JD_PURCHASE_ID_KEY);
  storage.removeItem(PENDING_JD_PURCHASE_RETURN_KEY);
}
