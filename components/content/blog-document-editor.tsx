"use client";

import { useState } from "react";
import Link from "next/link";
import { ArrowDown, ArrowUp, Image as ImageIcon, Plus, Trash2 } from "lucide-react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";
import { Field } from "@/components/ui/field";
import { MediaPicker } from "@/components/landing/editor-pickers";
import { mediaLabel } from "@/lib/media";
import {
  validatePageDocument,
  type BlogMediaItem,
  type BlogPostRecord,
  type PageDocument,
} from "@/lib/content-catalog";

/**
 * BlogDocumentEditor — `/staff/landing/blog`'s editor.
 *
 * The blog owns its own page document now (office, 2026-09-29): heading, intro
 * and the posts, stored through the SAME pages-and-content store the other page
 * documents use (`POST /api/content/pages`). Editing here cannot change the home
 * page and editing the home cannot change the blog — they are different
 * documents; `tests/unit/blog-document.test.ts` proves it.
 *
 * Each post is edited as itself: author, date, caption, optional link, and its
 * photographs/films (from the office's media library or a device upload through
 * the shared `MediaPicker`, the same picker every other editor uses).
 */
export function BlogDocumentEditor({
  initial,
  sessionName,
}: {
  initial: PageDocument;
  sessionName?: string;
}) {
  const [doc, setDoc] = useState<PageDocument>(() => structuredClone(initial));
  const [pending, setPending] = useState(false);
  const [notice, setNotice] = useState<{ tone: "success" | "danger"; text: string } | null>(null);
  const [picker, setPicker] = useState<{ postId: string; mediaId: string } | null>(null);

  const blog = doc.blog ?? { heading: "", intro: "", posts: [] };
  const dirty = JSON.stringify(doc) !== JSON.stringify(initial);

  function patchBlog(patch: Partial<typeof blog>) {
    setDoc((current) => ({ ...current, blog: { ...(current.blog ?? { heading: "", intro: "", posts: [] }), ...patch } }));
  }

  function patchPost(postId: string, patch: Partial<BlogPostRecord>) {
    patchBlog({ posts: blog.posts.map((post) => (post.id === postId ? { ...post, ...patch } : post)) });
  }

  function patchMedia(postId: string, mediaId: string, patch: Partial<BlogMediaItem>) {
    patchBlog({
      posts: blog.posts.map((post) =>
        post.id === postId
          ? { ...post, media: post.media.map((item) => (item.id === mediaId ? { ...item, ...patch } : item)) }
          : post,
      ),
    });
  }

  function movePost(index: number, delta: -1 | 1) {
    const next = [...blog.posts];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patchBlog({ posts: next });
  }

  function moveMedia(postId: string, index: number, delta: -1 | 1) {
    const post = blog.posts.find((entry) => entry.id === postId);
    if (!post) return;
    const next = [...post.media];
    const target = index + delta;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    patchPost(postId, { media: next });
  }

  async function save() {
    const verdict = validatePageDocument(doc, { skus: new Set(), rateRefs: new Set() });
    if (!verdict.ok) {
      setNotice({ tone: "danger", text: verdict.errors.join(" ") });
      return;
    }
    setPending(true);
    setNotice(null);
    try {
      const response = await fetch("/api/content/pages", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ key: doc.key, document: verdict.value }),
      });
      const payload: unknown = await response.json().catch(() => null);
      const body = typeof payload === "object" && payload !== null ? (payload as Record<string, unknown>) : {};
      if (!response.ok) {
        setNotice({
          tone: "danger",
          text: typeof body.error === "string" ? body.error : "The blog could not be saved.",
        });
        return;
      }
      const saved = body.document as PageDocument | undefined;
      if (saved) setDoc(structuredClone(saved));
      setNotice({
        tone: "success",
        text: "Published — /blog shows this document. The home page is a different document and is untouched.",
      });
    } catch {
      setNotice({ tone: "danger", text: "The blog could not be saved — check your connection." });
    } finally {
      setPending(false);
    }
  }

  return (
    <div className="stack-4">
      <div className="ed-console">
        <div className="ed-console__copy">
          <p className="ed-console__title">Public page · /blog</p>
          <p className="ed-console__sub">
            {sessionName ? `Good day, ${sessionName} — ` : ""}
            {dirty ? "Unsaved changes — /blog still shows the last published version." : "Everything published."}
          </p>
        </div>
        <div className="ed-console__actions">
          <Link href="/blog" target="_blank" rel="noreferrer" className="btn btn--ghost btn--sm">
            View live page
          </Link>
          <Button variant="accent" size="sm" onClick={() => void save()} disabled={pending || !dirty}>
            {pending ? "Publishing…" : "Publish changes"}
          </Button>
        </div>
      </div>

      {notice ? <Alert tone={notice.tone}>{notice.text}</Alert> : null}

      <section className="card">
        <div className="card__body stack-3">
          <h2 className="text-lg" style={{ margin: 0 }}>
            The blog
          </h2>
          <Field label="Page title" htmlFor="blog-title">
            <input
              id="blog-title"
              value={doc.title}
              onChange={(event) => setDoc((current) => ({ ...current, title: event.target.value }))}
            />
          </Field>
          <Field label="Heading" htmlFor="blog-heading">
            <input
              id="blog-heading"
              value={blog.heading}
              onChange={(event) => patchBlog({ heading: event.target.value })}
            />
          </Field>
          <Field label="Intro" htmlFor="blog-intro" hint="One or two lines under the heading.">
            <textarea
              id="blog-intro"
              rows={2}
              value={blog.intro}
              onChange={(event) => patchBlog({ intro: event.target.value })}
            />
          </Field>
        </div>
      </section>

      <section className="card">
        <div className="card__body stack-3">
          <div className="row row--space row--wrap">
            <h2 className="text-lg" style={{ margin: 0 }}>
              Posts
            </h2>
            <Button
              variant="secondary"
              size="sm"
              onClick={() =>
                patchBlog({
                  posts: blog.posts.concat({
                    id: `post-${Date.now().toString(36)}`,
                    author: "Villa Memorial Park",
                    date: new Date().toISOString().slice(0, 10),
                    caption: "",
                    media: [],
                    link: null,
                  }),
                })
              }
            >
              <Plus size={14} aria-hidden="true" /> Add post
            </Button>
          </div>

          {blog.posts.map((post, index) => (
            <div className="ed-card" key={post.id}>
              <div className="row" style={{ justifyContent: "space-between", alignItems: "center" }}>
                <p className="ed-card__title">Post {index + 1}</p>
                <span className="row" style={{ gap: "var(--space-1)" }}>
                  <button
                    type="button"
                    className="ed-icon-btn"
                    aria-label={`Move post ${index + 1} up`}
                    disabled={index === 0}
                    onClick={() => movePost(index, -1)}
                  >
                    <ArrowUp size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="ed-icon-btn"
                    aria-label={`Move post ${index + 1} down`}
                    disabled={index === blog.posts.length - 1}
                    onClick={() => movePost(index, 1)}
                  >
                    <ArrowDown size={14} aria-hidden="true" />
                  </button>
                  <button
                    type="button"
                    className="ed-icon-btn ed-icon-btn--danger"
                    aria-label={`Remove post ${index + 1}`}
                    onClick={() => patchBlog({ posts: blog.posts.filter((entry) => entry.id !== post.id) })}
                  >
                    <Trash2 size={14} aria-hidden="true" />
                  </button>
                </span>
              </div>

              <div className="field-grid field-grid--3">
                <Field label="Author" htmlFor={`blog-post-${post.id}-author`}>
                  <input
                    id={`blog-post-${post.id}-author`}
                    value={post.author}
                    onChange={(event) => patchPost(post.id, { author: event.target.value })}
                  />
                </Field>
                <Field label="Date" htmlFor={`blog-post-${post.id}-date`} hint="YYYY-MM-DD">
                  <input
                    id={`blog-post-${post.id}-date`}
                    type="date"
                    value={post.date}
                    onChange={(event) => patchPost(post.id, { date: event.target.value })}
                  />
                </Field>
                <Field label="Link (optional)" htmlFor={`blog-post-${post.id}-link`} hint="Leave empty for a plain post.">
                  <input
                    id={`blog-post-${post.id}-link`}
                    value={post.link ?? ""}
                    onChange={(event) => patchPost(post.id, { link: event.target.value || null })}
                  />
                </Field>
              </div>
              <Field label="Caption" htmlFor={`blog-post-${post.id}-caption`}>
                <textarea
                  id={`blog-post-${post.id}-caption`}
                  rows={3}
                  value={post.caption}
                  onChange={(event) => patchPost(post.id, { caption: event.target.value })}
                />
              </Field>

              <div className="stack-2">
                <div className="row row--space row--wrap">
                  <strong className="text-sm">Media</strong>
                  <Button
                    variant="secondary"
                    size="sm"
                    onClick={() =>
                      patchPost(post.id, {
                        media: post.media.concat({
                          id: `media-${Date.now().toString(36)}`,
                          kind: "photo",
                          src: "",
                          alt: "",
                          poster: null,
                        }),
                      })
                    }
                  >
                    <Plus size={14} aria-hidden="true" /> Add media
                  </Button>
                </div>
                {post.media.map((item, mediaIndex) => (
                  <div className="ed-card-row" key={item.id}>
                    {item.src && item.kind === "photo" ? (
                      // eslint-disable-next-line @next/next/no-img-element -- attached photo
                      <img className="cat-image__thumb" src={item.src} alt="" />
                    ) : (
                      <span className="cat-image__thumb cat-image__thumb--empty">{item.kind}</span>
                    )}
                    <div className="stack-2" style={{ flex: 1 }}>
                      <div className="row" style={{ gap: "var(--space-2)", alignItems: "center" }}>
                        <Button
                          variant="secondary"
                          size="sm"
                          onClick={() => setPicker({ postId: post.id, mediaId: item.id })}
                        >
                          <ImageIcon size={14} aria-hidden="true" /> {item.src ? "Change" : "Choose"}
                        </Button>
                        <span className="text-sm text-muted">{item.src ? mediaLabel(item.src) : "No file yet"}</span>
                        <span className="row" style={{ gap: "var(--space-1)", marginLeft: "auto" }}>
                          <button
                            type="button"
                            className="ed-icon-btn"
                            aria-label={`Move media ${mediaIndex + 1} up`}
                            disabled={mediaIndex === 0}
                            onClick={() => moveMedia(post.id, mediaIndex, -1)}
                          >
                            <ArrowUp size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ed-icon-btn"
                            aria-label={`Move media ${mediaIndex + 1} down`}
                            disabled={mediaIndex === post.media.length - 1}
                            onClick={() => moveMedia(post.id, mediaIndex, 1)}
                          >
                            <ArrowDown size={13} aria-hidden="true" />
                          </button>
                          <button
                            type="button"
                            className="ed-icon-btn ed-icon-btn--danger"
                            aria-label={`Remove media ${mediaIndex + 1}`}
                            onClick={() =>
                              patchPost(post.id, {
                                media: post.media.filter((entry) => entry.id !== item.id),
                              })
                            }
                          >
                            <Trash2 size={13} aria-hidden="true" />
                          </button>
                        </span>
                      </div>
                      <div className="field-grid field-grid--2">
                        <Field label="Kind" htmlFor={`blog-media-${item.id}-kind`}>
                          <select
                            id={`blog-media-${item.id}-kind`}
                            value={item.kind}
                            onChange={(event) =>
                              patchMedia(post.id, item.id, {
                                kind: event.target.value === "video" ? "video" : "photo",
                              })
                            }
                          >
                            <option value="photo">Photograph</option>
                            <option value="video">Film</option>
                          </select>
                        </Field>
                        <Field label="Alt text" htmlFor={`blog-media-${item.id}-alt`}>
                          <input
                            id={`blog-media-${item.id}-alt`}
                            value={item.alt}
                            onChange={(event) => patchMedia(post.id, item.id, { alt: event.target.value })}
                          />
                        </Field>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </section>

      <MediaPicker
        open={picker !== null}
        onClose={() => setPicker(null)}
        onPick={(src) => {
          const target = picker;
          setPicker(null);
          if (target) patchMedia(target.postId, target.mediaId, { src });
        }}
      />
    </div>
  );
}
