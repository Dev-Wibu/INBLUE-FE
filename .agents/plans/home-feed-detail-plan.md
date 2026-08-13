# Home Feed Detail Page — Implementation Plan

## Goal
Replace the Home Feed post Modal (when clicking on a post's title/text) with a dedicated
full-page Detail view, similar to Facebook's post detail page. Apply across all roles
(User, Mentor, Staff).

## Routes
- `/user/home-feed/:postId` → HomeFeedDetailPage
- `/mentor/home-feed/:postId` → HomeFeedDetailPage
- `/staff/home-feed/:postId` → HomeFeedDetailPage

All routes are full-page (outside the ChromeTabs shell), so the back navigation
behaves like a normal browser back. The previously rendered Home Feed is what
gets restored.

## Scroll Restoration
- Enable `react-router-dom`'s `ScrollRestoration` (via `getKey` that returns
  `location.key`) so the browser-style back-button restores the prior scroll
  position of the Home Feed.
- Also keep the existing `ScrollToTop` for forward navigation only.

## Components
- `pages/Shared/HomeFeedDetail/HomeFeedDetailPage.tsx` — top-level page
- `components/post/feed/PostDetailHeader.tsx` — author info + close X
- `components/post/feed/PostDetailMedia.tsx` — cover image + lightbox
- `components/post/feed/PostDetailBody.tsx` — title + summary + content + tags
- `components/post/feed/PostDetailActionBar.tsx` — like / comment counts + buttons
- `components/post/feed/PostDetailComments.tsx` — wraps CommentSection with input
- Reuse: `LikeButton`, `LikeListModal`, `MediaLightboxDialog`, `CommentSection`

## What stays untouched
- API managers / `$api` / `usePostFeed`
- `PostFeedModal` (kept for fallback)
- `PostFeedCard` data fetching
- i18n JSON shape

## What changes
- `PostFeedCard.tsx` — replace `setModalOpen(true)` with `navigate(...)`
- `App.tsx` — add 3 routes + ScrollRestoration
- `Shared/index.ts` + `Shared/HomeFeedDetail/index.ts` — exports
- `i18n/{en,vi,ja}.json` — add new keys