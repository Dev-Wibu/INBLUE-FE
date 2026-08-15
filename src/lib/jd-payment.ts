export const PENDING_JD_PURCHASE_ID_KEY = "pending_jd_purchase_id";
export const PENDING_JD_PURCHASE_RETURN_KEY = "pending_jd_purchase_return_url";

export function buildJdPurchaseReturnPath(jdId: number): string {
  return `/user?tab=jobSearch&jobId=${jdId}`;
}

export function rememberPendingJdPurchase(
  jdId: number,
  storage: Pick<Storage, "setItem"> = localStorage
): void {
  storage.setItem(PENDING_JD_PURCHASE_ID_KEY, String(jdId));
  storage.setItem(PENDING_JD_PURCHASE_RETURN_KEY, buildJdPurchaseReturnPath(jdId));
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
  const expectedPath = buildJdPurchaseReturnPath(jdId);
  return storedPath === expectedPath ? storedPath : expectedPath;
}

export function clearPendingJdPurchase(storage: Pick<Storage, "removeItem"> = localStorage): void {
  storage.removeItem(PENDING_JD_PURCHASE_ID_KEY);
  storage.removeItem(PENDING_JD_PURCHASE_RETURN_KEY);
}
