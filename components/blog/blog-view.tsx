import Link from "next/link";
import { libraryThumb, libraryThumbSet } from "@/lib/media";
import type { BlogDocument, BlogPostRecord } from "@/lib/content-catalog";
import type { AboutSection } from "@/lib/api-client/landing";

/**
 * BlogView — `/blog`'s own page (office, 2026-09-29).
 *
 * The blog is its own page document now (`PageDocument` key `blog`, schema
 * `BlogDocument`: heading · intro · posts), and the page leads with it: the
 * heading, the intro, then ONE ROW PER POST, each row horizontal — the post's
 * photograph beside its text — so a reader scans a list of stories instead of
 * scrolling past tall cards. The posts are the office's own words and pictures,
 * migrated out of the landing document, so editing the home cannot change the
 * blog and vice versa.
 *
 * RETAINED, AND REPORTED: the About band (story · mission · vision) is the one
 * band from the former LandingView that has no other home in the product; it
 * sits under the posts until the office places it. Everything else the old
 * storefront carried has its own route now (/plans, /lots, /map, /products,
 * /builder).
 */
export function BlogView({
  blog,
  about,
  wordmark,
}: {
  blog: BlogDocument;
  /** The landing document's About copy — the one retained former band. */
  about: AboutSection;
  wordmark: string;
}) {
  return (
    <div className="blog-page">
      <header className="blog-head">
        <p className="blog-head__kicker">From the grounds</p>
        <h1 className="blog-head__title">{blog.heading}</h1>
        {blog.intro ? <p className="blog-head__lead">{blog.intro}</p> : null}
      </header>

      {blog.posts.length === 0 ? (
        <p className="blog-empty">
          No posts yet — the office publishes them from Pages &amp; content → Blog.
        </p>
      ) : (
        <ul className="blog-rows">
          {blog.posts.map((post) => (
            <BlogRow key={post.id} post={post} />
          ))}
        </ul>
      )}

      {/* The one retained band from the former storefront, reported in the PR
          status: mission/vision copy that exists nowhere else. */}
      <section className="blog-about" aria-labelledby="blog-about-title">
        <h2 id="blog-about-title" className="blog-about__title">
          {about.heading || `About ${wordmark}`}
        </h2>
        <div className="blog-about__grid">
          {about.story ? (
            <div className="blog-about__item">
              <h3>Our story</h3>
              <p>{about.story}</p>
            </div>
          ) : null}
          {about.mission ? (
            <div className="blog-about__item">
              <h3>Our mission</h3>
              <p>{about.mission}</p>
            </div>
          ) : null}
          {about.vision ? (
            <div className="blog-about__item">
              <h3>Our vision</h3>
              <p>{about.vision}</p>
            </div>
          ) : null}
        </div>
        <div className="blog-about__actions">
          <Link className="btn btn--secondary" href="/contact">
            Reach the office
          </Link>
          <Link className="btn btn--secondary" href="/map">
            Walk the grounds
          </Link>
        </div>
      </section>
    </div>
  );
}

/** One post — a wide horizontal row: its media beside its text. */
function BlogRow({ post }: { post: BlogPostRecord }) {
  const first = post.media[0];
  const photo = first && first.kind === "photo" ? first : null;
  const video = first && first.kind === "video" ? first : null;
  const body = (
    <>
      <p className="blog-row__date">{post.date}</p>
      <p className="blog-row__caption">{post.caption}</p>
      <p className="blog-row__author">— {post.author}</p>
    </>
  );
  return (
    <li className="blog-row">
      <div className="blog-row__media">
        {photo ? (
          // The picture is whole: the frame takes its own shape, never a crop.
          // eslint-disable-next-line @next/next/no-img-element
          <img
            className="blog-row__photo"
            src={libraryThumb(photo.src, 960)}
            srcSet={libraryThumbSet(photo.src)}
            sizes={libraryThumbSet(photo.src) ? "(max-width: 48rem) 92vw, 22rem" : undefined}
            alt={photo.alt}
            width={960}
            height={960}
            loading="lazy"
            decoding="async"
          />
        ) : video ? (
          <video
            className="blog-row__video"
            src={video.src}
            poster={video.poster ?? undefined}
            controls
            preload="metadata"
          />
        ) : (
          <span className="blog-row__nomedia" aria-hidden="true">
            No picture
          </span>
        )}
      </div>
      <div className="blog-row__body">
        {post.link ? (
          <>
            {body}
            <Link className="btn btn--secondary btn--sm blog-row__link" href={post.link}>
              Read this post
            </Link>
          </>
        ) : (
          body
        )}
      </div>
    </li>
  );
}
