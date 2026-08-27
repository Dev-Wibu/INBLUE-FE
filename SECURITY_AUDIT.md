# Security Audit - 2026-08-28

## Scope

- Frontend repository on branch `codex/security-audit-2026-08-28`.
- Passive HTTP header check for `https://inblue-fpt-zeta.vercel.app/`.
- Static source review and production build verification.
- No DDoS, brute force, destructive requests, exploit payloads, or access to private accounts.

## Verified findings

### High: JWT is persisted in `localStorage`

`src/stores/authStore.ts` persists `token` under `auth-storage` using Zustand's `localStorage` adapter. Any XSS in the origin, compromised third-party script, or malicious browser extension can read and exfiltrate the token. Expiry checks reduce session lifetime but do not prevent theft.

**Recommendation:** Prefer a backend-issued `HttpOnly; Secure; SameSite` session cookie and keep only non-sensitive user state in the browser. If a migration is not immediately possible, remove tokens from persisted state, enforce a strict CSP, and audit every third-party script and URL sink.

### Medium: Missing browser hardening headers on the deployed HTML response

The response includes HTTPS/HSTS, but the check did not observe `Content-Security-Policy`, `X-Content-Type-Options`, `Referrer-Policy`, `Permissions-Policy`, or `X-Frame-Options`.

**Recommendation:** Add these at Vercel/edge configuration after testing required integrations. Start with `X-Content-Type-Options: nosniff`, `Referrer-Policy: strict-origin-when-cross-origin`, and a CSP in `Report-Only` mode; then enforce a CSP that explicitly covers ResponsiveVoice, Daily, Google viewer, payment, upload, and API origins.

### Medium: Untrusted API URLs are used as navigation/resource URLs

Examples include `company.website`, LinkedIn URLs, CV/file URLs, recording URLs, and email-preview URLs. These are passed to `href`, `src`, or iframe/viewer integrations in multiple components. A malicious or compromised backend record could introduce `javascript:`, `data:`, unexpected origins, or tracking content.

**Recommendation:** Normalize URLs through one shared helper. Permit only `https:` (plus narrowly required `mailto:`) and allowlist upload/viewer/payment domains. Add `rel="noopener noreferrer"` to every user-controlled `target="_blank"` link.

### Medium: Dynamic HTML construction requires continued input isolation

The code uses `dangerouslySetInnerHTML` for chart CSS and `innerHTML` for Monaco review UI. The Monaco description is escaped, but the chart CSS is assembled from configuration values. Keep these values developer-controlled or validate color/key formats before interpolation. Do not reuse this pattern for API-provided text.

### Low: Third-party script and public client key

The production HTML loads `https://code.responsivevoice.org/responsivevoice.js?key=L0x1u2UZ`. This key is visible to every visitor and must be treated as a public client identifier, not a secret. Confirm the provider supports origin restrictions and configure them for the Vercel domain.

## Dependency audit

`pnpm audit` reported 129 advisories in the installed dependency graph (8 low, 56 moderate, 63 high, 2 critical at audit time). Many are transitive or development-only packages, so they are not all production attack paths. Prioritize production dependencies first, then update the lockfile and run the full test/build suite. Review the audit output in CI rather than applying a blanket force upgrade.

## Operational checks for the backend/Vercel owner

1. Verify API CORS allows only the known frontend origins; do not rely on the static site's `Access-Control-Allow-Origin: *` response.
2. Confirm authentication and authorization are enforced server-side on every endpoint, especially admin, mentor, payment, upload, and WebSocket routes.
3. Confirm rate limits, request size limits, upload MIME/content validation, CSRF protection (if cookie auth is used), and centralized logging/alerting.
4. Validate that source maps, debug endpoints, Swagger credentials, and secrets are not deployed.
5. Run an authorized DAST scan against a staging environment with a written rate limit and stop conditions. Do not stress-test production with DDoS tooling.

## Verification

- `pnpm run build`: passed.
- `.env` exists locally but is ignored and not tracked by git; only variable names were inspected.
- Passive `HEAD`/`GET` requests to the deployment returned HTTP 200 and HSTS.
