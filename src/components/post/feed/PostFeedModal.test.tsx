import i18n from "@/lib/i18n";
import { fireEvent, render, screen, waitFor } from "@testing-library/react";
import { useState } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
const t = i18n.t.bind(i18n);

import type { components } from "../../../../schema-from-be";

import { PostFeedModal } from "./PostFeedModal";

const useAuthStoreMock = vi.hoisted(() => vi.fn());
const useCheckLikedMock = vi.hoisted(() => vi.fn());
const useCreateCommentMock = vi.hoisted(() => vi.fn());
const usePostByIdMock = vi.hoisted(() => vi.fn());

vi.mock("@/stores/authStore", () => ({
  useAuthStore: useAuthStoreMock,
}));

vi.mock("@/services/post.manager", () => ({
  useCheckLiked: useCheckLikedMock,
  useCreateComment: useCreateCommentMock,
  usePostById: usePostByIdMock,
}));

vi.mock("../CommentSection", () => ({
  CommentSection: () => <div data-testid="comment-section">comments</div>,
}));

vi.mock("../LikeButton", () => ({
  LikeButton: () => <div data-testid="like-button">likes</div>,
}));

type PostResponse = components["schemas"]["PostResponse"];

const MOCK_ITEM = {
  post: {
    postId: 101,
    title: t("compPost.photoTest"),
    creationDate: "2026-01-21T08:00:00.000Z",
    coverImgUrl: "https://example.com/post-cover.png",
    author: {
      name: t("compPost.authorTest"),
      avatar: "",
    },
    tags: [],
  },
  likeCount: 0,
  commentCount: 0,
  postLikes: [],
  postComments: [],
} as unknown as PostResponse;

function PostFeedModalHarness() {
  const [open, setOpen] = useState(true);

  return (
    <>
      <span data-testid="post-modal-state">{open ? "open" : "closed"}</span>
      <PostFeedModal item={MOCK_ITEM} open={open} onOpenChange={setOpen} />
    </>
  );
}

const openImageViewer = () => {
  fireEvent.click(screen.getByRole("img", { name: t("compPost.photoTest") }));
  expect(
    screen.getByRole("button", { name: t("compShared.closeTheMediaViewer") })
  ).toBeInTheDocument();
};

describe("PostFeedModal image viewer", () => {
  beforeEach(() => {
    useAuthStoreMock.mockReturnValue({
      user: {
        id: 12,
        name: t("compPost.userTest"),
        avatarUrl: "",
      },
    });
    useCheckLikedMock.mockReturnValue({ data: { liked: false } });
    useCreateCommentMock.mockReturnValue({
      mutate: vi.fn(),
      isPending: false,
    });
    usePostByIdMock.mockReturnValue({ data: undefined });
  });

  it(t("compPost.closeWithTheXButton"), async () => {
    render(<PostFeedModalHarness />);

    openImageViewer();
    fireEvent.click(screen.getByRole("button", { name: t("compShared.closeTheMediaViewer") }));

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: t("compShared.closeTheMediaViewer") })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(t("compPost.articleByAuthorTest"))).toBeInTheDocument();
    expect(screen.getByTestId("post-modal-state")).toHaveTextContent("open");
  });

  it(t("compPost.closeByBackgroundClickTurns"), async () => {
    render(<PostFeedModalHarness />);

    openImageViewer();

    // Radix UI closes when pressing Escape, simulating click on overlay is tricky in JSDOM
    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: t("compShared.closeTheMediaViewer") })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByText(t("compPost.articleByAuthorTest"))).toBeInTheDocument();
    expect(screen.getByTestId("post-modal-state")).toHaveTextContent("open");
  });

  it(t("compPost.pressEscapeTheFirstTime"), async () => {
    render(<PostFeedModalHarness />);

    openImageViewer();

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(
        screen.queryByRole("button", { name: t("compShared.closeTheMediaViewer") })
      ).not.toBeInTheDocument();
    });
    expect(screen.getByTestId("post-modal-state")).toHaveTextContent("open");

    fireEvent.keyDown(document, { key: "Escape" });

    await waitFor(() => {
      expect(screen.getByTestId("post-modal-state")).toHaveTextContent("closed");
    });
  });
});
