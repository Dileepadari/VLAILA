/**
 * Home — a reproduction of www.vlab.co.in, element for element.
 *
 * Class names, grid columns, inline styles and copy come from the live page
 * source; the stylesheets that lay them out are the platform's own, served
 * from /vl/css. The carousel, the Objectives / Philosophy tabs and the
 * testimonial more/less toggle reproduce in React what Bootstrap and the
 * site's own JS do there. Slider frames, institute crests and the video still
 * are the real image files.
 */

import { createFileRoute, Link } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { PageLayout } from "@/components/vlabs/PageLayout";
import { CounterStrip } from "@/components/vlabs/Shell";
import { ANNOUNCEMENTS, BROAD_AREAS, INSTITUTES, TESTIMONIALS } from "@/lib/mock-data";

export const Route = createFileRoute("/")({
  head: () => ({
    meta: [
      { title: "Virtual Labs" },
      {
        name: "description",
        content:
          "Virtual Labs — an initiative of the Ministry of Education under the National Mission on Education through ICT. Free browser-based simulation labs from IITs, IIITs and NITs.",
      },
    ],
  }),
  component: Home,
});

const SLIDES = [
  "/vl/images/slider/3.jpg",
  "/vl/images/slider/6.jpg",
  "/vl/images/slider/7.jpg",
  "/vl/images/slider/8.jpg",
  "/vl/images/slider/9.png",
  "/vl/images/slider/10.png",
  "/vl/images/slider/12.png",
  "/vl/images/slider/13.png",
];

function Carousel() {
  const [index, setIndex] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setIndex((i) => (i + 1) % SLIDES.length), 5000);
    return () => window.clearInterval(id);
  }, []);

  const go = (delta: number) => setIndex((i) => (i + delta + SLIDES.length) % SLIDES.length);

  return (
    <div id="myCarousel" className="carousel slide">
      <ol className="carousel-indicators">
        {SLIDES.map((src, i) => (
          <li
            key={src}
            className={i === index ? "active" : undefined}
            onClick={() => setIndex(i)}
          />
        ))}
      </ol>
      <div className="carousel-inner">
        {SLIDES.map((src, i) => (
          <div key={src} className={i === index ? "item active" : "item"}>
            <img src={src} style={{ width: "100%" }} alt="" />
          </div>
        ))}
      </div>
      <a
        className="left carousel-control"
        href="#myCarousel"
        onClick={(e) => {
          e.preventDefault();
          go(-1);
        }}
      >
        <span>
          <img
            src="/vl/images/previous-icon.png"
            style={{ width: "18%", paddingTop: 170 }}
            alt=""
          />
        </span>
        <span className="sr-only">Previous</span>
      </a>
      <a
        className="right carousel-control"
        href="#myCarousel"
        onClick={(e) => {
          e.preventDefault();
          go(1);
        }}
      >
        <span>
          <img src="/vl/images/next-icon.png" style={{ width: "18%", paddingTop: 170 }} alt="" />
        </span>
        <span className="sr-only">Next</span>
      </a>
    </div>
  );
}

function ObjectiveTabs() {
  const [tab, setTab] = useState<"objective" | "philosophy">("objective");

  return (
    <section className="tab-vlab">
      <div className="container">
        <div className="obj-tabs" style={{ display: "flex" }}>
          <div
            className={tab === "objective" ? "obj-tab-col active" : "obj-tab-col"}
            onClick={() => setTab("objective")}
          >
            Objectives
          </div>
          <div
            className={tab === "philosophy" ? "obj-tab-col active" : "obj-tab-col"}
            style={{ borderRight: "1px solid #ccc" }}
            onClick={() => setTab("philosophy")}
          >
            The Philosophy
          </div>
          <div style={{ flexGrow: 1, borderBottom: "1px solid #ccc" }} />
        </div>
        <div className="tab-content">
          {tab === "objective" ? (
            <div id="objective" className="tab-pane fade in active">
              <div className="row">
                <div className="col-md-12 col-lg-12 col-xs-12 col-sm-12 obj-heading text-blue">
                  Objectives
                </div>
              </div>
              <div className="row">
                <div className="col-md-12 col-lg-12 col-xs-12 col-sm-12">
                  <div className="obj-text">
                    <p>
                      1. To provide remote-access to simulation-based Labs in various disciplines of
                      Science and Engineering.{" "}
                    </p>
                    <p>
                      2. To enthuse students to conduct experiments by arousing their curiosity.
                      This would help them in learning basic and advanced concepts through remote
                      experimentation.
                    </p>
                    <p>
                      3. To provide a complete Learning Management System around the Virtual Labs
                      where the students/ teachers can avail the various tools for learning,
                      including additional web-resources, video-lectures, animated demonstrations
                      and self-evaluation.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          ) : (
            <div id="philosophy" className="tab-pane fade in active">
              <div className="row">
                <div className="col-md-12 col-lg-12 col-xs-12 col-sm-12 obj-heading text-blue">
                  The Philosophy
                </div>
              </div>
              <div className="row">
                <div className="col-md-12 col-lg-12 col-xs-12 col-sm-12">
                  <div className="obj-text">
                    <p>
                      Good lab facilities and updated lab experiments are critical for any
                      engineering college. Paucity of lab facilities often make it difficult to
                      conduct experiments. Also, good teachers are always a scarce resource. The
                      Virtual Labs project addresses this issue of lack of good lab facilities, as
                      well as trained teachers, by providing remote-access to simulation-based Labs
                      in various disciplines of science and engineering. Yet another objective is to
                      arouse the curiosity of the students and permit them to learn at their own
                      pace. This student-centric approach facilitates the absorption of basic and
                      advanced concepts through simulation-based experimentation. Internet-based
                      experimentation further permits use of additional web-resources,
                      video-lectures, animated demonstrations and self-evaluation. Specifically, the
                      Virtual Labs project addresses the following:{" "}
                    </p>
                    {/* The source nests this <ul> inside a <p>; browsers split
                        it back out, which is what is reproduced here. */}
                    <ul>
                      <li>
                        Access to online labs to those engineering colleges that lack these lab
                        facilities
                      </li>
                      <li>
                        Access to online labs as a complementary facility to those colleges that
                        already have labs
                      </li>
                      <li>
                        Training and skill-set augmentation through workshops and on-site/ online
                        training
                      </li>
                    </ul>
                    <p>
                      Virtual labs are any place, any pace, any-time, any-type labs. It is a
                      paradigm shift in student-centric, online education.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}
        </div>
      </div>
    </section>
  );
}

/** One of the two Broad Areas columns; the live page splits the ten areas 5/5. */
function BroadAreaColumn({ areas }: { areas: typeof BROAD_AREAS }) {
  return (
    <div className="col-md-6 col-lg-6 col-xs-12 col-sm-6 ba-text">
      <ul>
        {areas.map((a) => (
          <li key={a.slug}>
            <table>
              <tbody>
                <tr style={{ color: "#003a68", verticalAlign: "top" }}>
                  <td>
                    <i className="fa fa-cube" />
                  </td>
                  <td>
                    <Link to="/broad-areas/$area" params={{ area: a.slug }}>
                      {a.name}
                    </Link>
                  </td>
                </tr>
              </tbody>
            </table>
          </li>
        ))}
      </ul>
    </div>
  );
}

/**
 * Levels the three cards to the tallest, which is what the live site's JS
 * does -- they measure 281.7px each there despite quotes of different lengths.
 * Doing it by measurement rather than with flexbox keeps `.show_more` floated,
 * so it still contributes its height to the row through Bootstrap's clearfix.
 */
function useEqualHeights(deps: unknown[]) {
  const rowRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const level = () => {
      const row = rowRef.current;
      if (!row) return;
      const cards = [...row.querySelectorAll<HTMLElement>(".testimonial_block")];
      cards.forEach((c) => {
        c.style.height = "auto";
      });
      const tallest = Math.max(...cards.map((c) => c.getBoundingClientRect().height));
      cards.forEach((c) => {
        c.style.height = `${tallest}px`;
      });
    };
    level();
    window.addEventListener("resize", level);
    return () => window.removeEventListener("resize", level);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, deps);

  return rowRef;
}

/**
 * The institute strip, which is a slick carousel on the live site: eleven
 * 103px slides in a 1140px window, autoplaying through cloned slides with a
 * round arrow at each end. The list is duplicated so the track can advance
 * past the last crest and snap back invisibly, which is what slick's clones
 * achieve there.
 */
function InstituteStrip() {
  const [offset, setOffset] = useState(0);
  const [animate, setAnimate] = useState(true);

  useEffect(() => {
    const id = window.setInterval(() => setOffset((o) => o + 1), 3000);
    return () => window.clearInterval(id);
  }, []);

  // Once a full cycle has scrolled past, jump back without a transition.
  useEffect(() => {
    if (offset < INSTITUTES.length) return;
    const id = window.setTimeout(() => {
      setAnimate(false);
      setOffset(0);
    }, 400);
    return () => window.clearTimeout(id);
  }, [offset]);

  useEffect(() => {
    if (animate) return;
    const id = window.setTimeout(() => setAnimate(true), 50);
    return () => window.clearTimeout(id);
  }, [animate]);

  // One slide is 1/22 of the track, since the track holds two copies.
  const step = 100 / (INSTITUTES.length * 2);

  return (
    <div className="customer-logos">
      <span
        className="control-c a-left"
        onClick={() => setOffset((o) => Math.max(0, o - 1))}
        role="button"
        aria-label="Previous institutes"
      >
        <i className="fa fa-chevron-circle-left" />
      </span>
      <div className="vl-slick-list">
        <div
          className="vl-slick-track"
          style={{
            transform: `translateX(-${offset * step}%)`,
            transition: animate ? "transform .4s ease" : "none",
          }}
        >
          {[...INSTITUTES, ...INSTITUTES].map((inst, i) => (
            <div className="slide" key={`${inst.img}-${i}`}>
              <Link to="/partners">
                <img src={`/vl/Inst_logo/${inst.img}`} style={{ width: 90, height: 90 }} alt="" />{" "}
                <p>{inst.name}</p>
              </Link>
            </div>
          ))}
        </div>
      </div>
      <span
        className="control-c a-right"
        onClick={() => setOffset((o) => o + 1)}
        role="button"
        aria-label="Next institutes"
      >
        <i className="fa fa-chevron-circle-right" />
      </span>
    </div>
  );
}

function Testimonials() {
  const [expanded, setExpanded] = useState(false);
  const [first, second, third, fourth] = TESTIMONIALS;
  const rowRef = useEqualHeights([expanded]);

  return (
    <section className="testimonials">
      <div className="container">
        <div className="row" style={{ marginTop: -30 }}>
          <div
            className="col-md-12 col-lg-12 col-xs-12 col-sm-12 obj-heading"
            style={{ marginBottom: 20 }}
          >
            Testimonials
          </div>
        </div>
        <div className="row" id="block-1" ref={rowRef}>
          {[first, second, third].map((t, i) => (
            <div className="col-md-4 col-lg-4 col-xs-12 col-sm-12" key={t.by}>
              <div className="testimonial_block" id={`tst-${i + 1}`}>
                <div className="testimonial_body testimonial-text">"{t.quote}"</div>
                <div className="testimonial_by text-blue">
                  {t.by}
                  <br />
                  {t.org}
                </div>
              </div>
              {i === 2 && !expanded && (
                <span
                  className="text-blue show_more"
                  id="show_more"
                  onClick={() => setExpanded(true)}
                >
                  more <img src="/vl/images/down.jpg" width="14" style={{ marginTop: -2 }} alt="" />
                </span>
              )}
            </div>
          ))}
        </div>
        {expanded && (
          <div id="block-2">
            <div className="row" style={{ marginTop: 20 }}>
              <div className="col-md-4 col-lg-4 col-xs-12 col-sm-12" />
              <div className="col-md-4 col-lg-4 col-xs-12 col-sm-12">
                <div className="testimonial_block" id="tst-4">
                  <div className="testimonial_body testimonial-text">"{fourth.quote}"</div>
                  <div className="testimonial_by text-blue">
                    {fourth.by}
                    <br />
                    {fourth.org}
                  </div>
                </div>
              </div>
              <div className="col-md-4 col-lg-4 col-xs-12 col-sm-12" />
            </div>
            <div
              className="row text-blue show_more"
              id="show_less"
              onClick={() => setExpanded(false)}
            >
              less{" "}
              <img
                src="/vl/images/down.jpg"
                width="14"
                style={{ marginTop: -2, transform: "scaleY(-1)" }}
                alt=""
              />
            </div>
          </div>
        )}
      </div>
    </section>
  );
}

function Home() {
  return (
    <PageLayout>
      <section>
        <Carousel />
      </section>

      <ObjectiveTabs />

      <section className="ba-section">
        <div className="container">
          <div className="row">
            <div className="col-md-12 col-lg-12 col-xs-12 col-sm-12 obj-heading">
              Broad Areas of Virtual Labs
            </div>
          </div>
          <div className="row">
            <BroadAreaColumn areas={BROAD_AREAS.slice(0, 5)} />
            <BroadAreaColumn areas={BROAD_AREAS.slice(5)} />
            {/* The live template emits a third, empty column here. It renders
                as ~70px of blank space below the two lists; kept so the
                section height matches. */}
            <BroadAreaColumn areas={[]} />
          </div>
        </div>
      </section>

      <div className="container">
        <div className="row">
          <div className="col-md-12 col-lg-12 col-xs-12 col-sm-12 obj-heading">
            Participating Institutes
          </div>
        </div>
        <div className="row">
          <div className="col-md-12 col-lg-12 col-xs-12 col-sm-12 inst-text">
            <InstituteStrip />
          </div>
        </div>
      </div>

      <section className="ba-section">
        <div className="use">
          <div className="container">
            <div className="use_grp">
              <div className="row">
                <div className="col-md-6 col-lg-6 col-xs-12 col-sm-12">
                  <div
                    className="use_cnt ansmt-txt"
                    style={{ minHeight: 360, textAlign: "center", backgroundColor: "white" }}
                  >
                    <div className="cmn-heading" style={{ display: "inline-block" }}>
                      Announcements
                    </div>
                    <div
                      style={{
                        width: "80%",
                        display: "inline-block",
                        minHeight: 290,
                        maxHeight: 290,
                        overflowY: "auto",
                      }}
                    >
                      {ANNOUNCEMENTS.map((a) => (
                        <p
                          className="ansmt-sub-txt"
                          style={{ marginTop: 40, width: "96%" }}
                          key={a.href}
                        >
                          <a target="_blank" rel="noreferrer" href={a.href}>
                            {a.text}
                          </a>
                          {a.isNew && (
                            <>
                              &nbsp;
                              <img src="/vl/images/new.gif" width="40" alt="New" />
                            </>
                          )}
                        </p>
                      ))}
                    </div>
                  </div>
                </div>
                <div className="col-md-6 col-lg-6 col-xs-12 col-sm-12">
                  <div id="yt">
                    <img
                      src="/vl/images/vlab-hqdefault.png"
                      alt="Virtual Labs Video"
                      className="img-responsive"
                      style={{ cursor: "pointer" }}
                    />
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      <Testimonials />

      <CounterStrip />
    </PageLayout>
  );
}
