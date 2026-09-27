/**
 * Header and footer, reproducing www.vlab.co.in markup element for element.
 *
 * The class names, grid columns, inline styles and copy below are taken from
 * the live page source, and the stylesheets that lay them out are the
 * platform's own (served from /vl/css). Images -- the logo lock-up, the
 * Facebook glyph, the app QR code, the Outreach mark -- are the real files
 * rather than stand-ins, so spacing derived from intrinsic image size matches
 * too.
 *
 * The only additions are the role switcher and the role-specific nav items,
 * which is what this console exists to demonstrate. They are styled to sit
 * inside the platform's own visual language.
 */

import { Link, useLocation } from "@tanstack/react-router";
import { useEffect, useRef, useState } from "react";
import { useRole } from "@/lib/role";
import type { Role } from "@/lib/mock-data";

const NAV: { to: string; label: string }[] = [
  { to: "/", label: "Home" },
  { to: "/about", label: "About us" },
  { to: "/outreach", label: "Outreach Portal" },
  { to: "/partners", label: "Participating Institutes" },
  { to: "/nmeict", label: "NMEICT" },
  { to: "/contact", label: "Contact us" },
];

/** The live top strip prints a running date/time into #dtontop. */
function useClock() {
  const [now, setNow] = useState<Date | null>(null);
  useEffect(() => {
    setNow(new Date());
    const id = window.setInterval(() => setNow(new Date()), 1000);
    return () => window.clearInterval(id);
  }, []);
  return now;
}

function formatStamp(d: Date) {
  const date = d.toLocaleDateString("en-GB", {
    day: "2-digit",
    month: "short",
    year: "numeric",
  });
  const time = d.toLocaleTimeString("en-US", {
    hour: "2-digit",
    minute: "2-digit",
    second: "2-digit",
    hour12: true,
  });
  return `${date} | ${time}`;
}

/**
 * The live site pins the navy nav to the top once you scroll past the logo
 * lock-up (Bootstrap's affix plugin adds `.affix`, and main.css fixes it to
 * `top: 0`). A spacer takes the bar's place so the page does not jump.
 */
function useAffix() {
  const sentinelRef = useRef<HTMLDivElement>(null);
  const [affixed, setAffixed] = useState(false);

  useEffect(() => {
    const onScroll = () => {
      const el = sentinelRef.current;
      if (!el) return;
      setAffixed(el.getBoundingClientRect().top <= 0);
    };
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    window.addEventListener("resize", onScroll);
    return () => {
      window.removeEventListener("scroll", onScroll);
      window.removeEventListener("resize", onScroll);
    };
  }, []);

  return { sentinelRef, affixed };
}

export function VlabsHeader() {
  const { role, setRole, name } = useRole();
  const [menuOpen, setMenuOpen] = useState(false);
  const [accountOpen, setAccountOpen] = useState(false);
  const loc = useLocation();
  const now = useClock();
  const { sentinelRef, affixed } = useAffix();

  const roleNav =
    role === "faculty"
      ? [
          { to: "/faculty", label: "Faculty" },
          { to: "/studio", label: "Author Studio" },
        ]
      : role === "admin"
        ? [
            { to: "/admin", label: "Admin" },
            { to: "/studio", label: "Author Studio" },
          ]
        : role === "student"
          ? [{ to: "/dashboard", label: "My Dashboard" }]
          : [];

  const items = [...NAV, ...roleNav];

  return (
    <section className="header">
      <div className="container-fluid sm-hdr-top">
        <div className="container">
          <div className="row">
            <div className="col-md-4 col-sm-6 col-xs-6" id="dtontop">
              {now ? formatStamp(now) : ""}
            </div>
            <div className="col-md-7 col-sm-4 col-xs-4">
              <div style={{ textAlign: "right" }}>Visitors &nbsp;52575993</div>
            </div>
            <div className="col-md-1 col-sm-2 col-xs-2">
              <span style={{ float: "right" }}>
                <a
                  href="https://www.facebook.com/VLabsIITDelhi/"
                  target="_blank"
                  rel="noreferrer"
                  title="Vlab Facebook Page"
                >
                  {/* Height is set inline, not via the attribute: Tailwind's
                      preflight sets `img { height: auto }`, which outranks a
                      presentational hint and would render this at its natural
                      32px, making the strip taller than the live one. */}
                  <img src="/vl/images/fb-icon.png" style={{ height: 20, marginTop: -4 }} alt="" />
                </a>
              </span>
            </div>
          </div>
        </div>
      </div>

      <header className="container hdr-logo">
        <div className="row">
          <div className="col-md-8 col-lg-8 col-sm-12 col-xs-12">
            <h1 className="logo">
              <ul className="logo-ul">
                <li className="logo-img">
                  <Link to="/">
                    <img src="/vl/images/logo.jpg" alt="Virtual Labs" />
                  </Link>
                  <div className="hdr-logo-border" />
                </li>
                <li className="logo-text">
                  <div className="logo-text-big">An Initiative of</div>
                  <div style={{ fontWeight: 600 }}>
                    Ministry of Education
                    <br />
                    <span style={{ fontWeight: "normal" }}>
                      Under the National Mission on Education through{" "}
                      <span style={{ color: "red" }}>ICT</span>
                    </span>
                  </div>
                </li>
              </ul>
            </h1>
          </div>
          <div className="col-md-4 col-sm-4 col-xs-12 hdr-search">
            <form className="glb_search_frm" onSubmit={(e) => e.preventDefault()}>
              <input
                type="text"
                className="form-control gl-search"
                name="search_item"
                id="search-box"
                placeholder="Search Lab"
                autoComplete="off"
              />
              <i className="fa fa-search search-icon" />
            </form>

            {/*
             * Console addition: view the platform as any of the four roles.
             * Positioned out of flow so the header keeps the live site's exact
             * 184px height rather than growing to accommodate it.
             */}
            <div style={{ position: "absolute", right: 15, top: 76, textAlign: "right" }}>
              <button
                onClick={() => setAccountOpen((v) => !v)}
                style={{
                  background: "none",
                  border: "1px solid #ccc",
                  borderRadius: 200,
                  padding: "3px 12px",
                  fontSize: 11,
                  color: "#464646",
                  cursor: "pointer",
                }}
              >
                {name} · {role} ▾
              </button>
              {accountOpen && (
                <div
                  style={{
                    position: "absolute",
                    right: 0,
                    marginTop: 4,
                    background: "#fff",
                    border: "1px solid #ccc",
                    minWidth: 170,
                    zIndex: 1000,
                    textAlign: "left",
                    boxShadow: "0 2px 8px rgba(0,0,0,.15)",
                  }}
                >
                  <div style={{ padding: "8px 12px", fontSize: 11, color: "#888" }}>View as</div>
                  {(["student", "faculty", "admin", "guest"] as Role[]).map((r) => (
                    <button
                      key={r}
                      onClick={() => {
                        setRole(r);
                        setAccountOpen(false);
                      }}
                      style={{
                        display: "block",
                        width: "100%",
                        textAlign: "left",
                        padding: "8px 12px",
                        border: 0,
                        background: role === r ? "#f3f3f3" : "transparent",
                        fontSize: 12,
                        cursor: "pointer",
                        textTransform: "capitalize",
                      }}
                    >
                      {r}
                    </button>
                  ))}
                </div>
              )}
            </div>
          </div>
        </div>
      </header>

      <div ref={sentinelRef} />
      {affixed && <div style={{ height: 42 }} />}
      <div className={affixed ? "fix-hdr affix" : "fix-hdr"}>
        <div
          className="container-fluid navWrap"
          style={{ backgroundColor: "#00446d", color: "#fff" }}
        >
          <div className="container">
            <nav className="navbar desk_nav">
              <ul className="nav navbar-nav">
                {items.map((item) => {
                  const active =
                    item.to === "/" ? loc.pathname === "/" : loc.pathname.startsWith(item.to);
                  return (
                    <li key={item.to} className={active ? "active" : undefined}>
                      <Link to={item.to} className={active ? "nav-selected" : undefined}>
                        {item.label}
                      </Link>
                    </li>
                  );
                })}
              </ul>
            </nav>
            <span className="hamburger" onClick={() => setMenuOpen((v) => !v)}>
              &#9776;
            </span>
            <div className="mobile_nav">
              <div className="row">
                <div className="col-md-12 col-xs-12">
                  <div id="mySidenav" className="sidenav" style={{ width: menuOpen ? 250 : 0 }}>
                    <a
                      href="#close"
                      className="closebtn"
                      onClick={(e) => {
                        e.preventDefault();
                        setMenuOpen(false);
                      }}
                    >
                      &times;
                    </a>
                    {items.map((item) => (
                      <Link key={item.to} to={item.to} onClick={() => setMenuOpen(false)}>
                        {item.label}
                      </Link>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
}

/**
 * The counter strip alternates between two pairs of figures on a timer on the
 * live site; this reproduces that swap.
 *
 * It appears on the home page only -- the inner pages run their footer
 * straight after the content -- so it is exported for Home to render rather
 * than living in the shared footer.
 */
export function CounterStrip() {
  const [second, setSecond] = useState(false);
  useEffect(() => {
    const id = window.setInterval(() => setSecond((v) => !v), 5000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <div style={{ background: "#ddd" }}>
      <div className="container">
        <div className="row ftr-counter">
          <div className="col-md-4 col-lg-4 col-xs-12 col-sm-6 ftr-logo-2">
            <a href="https://centraloutreach.vlabs.co.in/" target="_blank" rel="noreferrer">
              <img
                src="/vl/images/Outreach_logo_main_1000dpi.png"
                width="220"
                alt="Vlabs Outreach"
              />
            </a>
          </div>
          {second ? (
            <span className="count_2">
              <div className="col-md-4 col-lg-4 col-xs-12 col-sm-6 ftr-counter-3">
                NODAL CENTERS<p>1531</p>
              </div>
              <div className="col-md-4 col-lg-4 col-xs-12 col-sm-6 ftr-counter-4">
                USAGE<p>4679904</p>
              </div>
            </span>
          ) : (
            <span className="count_1">
              <div className="col-md-4 col-lg-4 col-xs-12 col-sm-6 ftr-counter-1">
                Website PageViews<p>81330147</p>
              </div>
              <div className="col-md-4 col-lg-4 col-xs-12 col-sm-6 ftr-counter-2">
                PARTICIPANTS ATTENDED<p>8560251</p>
              </div>
            </span>
          )}
        </div>
      </div>
    </div>
  );
}

/**
 * The live site parks `.toTop` off-canvas at `right: -90px` and slides it to
 * `right: 20px` once you scroll away from the top.
 */
function ToTop() {
  const [shown, setShown] = useState(false);

  useEffect(() => {
    const onScroll = () => setShown(window.scrollY > 300);
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
    return () => window.removeEventListener("scroll", onScroll);
  }, []);

  return (
    <div
      className="toTop"
      style={{ right: shown ? 20 : -90 }}
      onClick={() => window.scrollTo({ top: 0, behavior: "smooth" })}
      role="button"
      aria-label="Back to top"
    >
      <i className="fa fa-angle-up fa-4x" />
    </div>
  );
}

export function VlabsFooter() {
  return (
    <>
      <section className="footer">
        <footer>
          <div className="ftr">
            <div className="container">
              <div className="row">
                <div className="col-md-3 col-lg-3 col-xs-12 col-sm-12">
                  <p className="ftr_head">Quick Links</p>
                  <ul className="ftr_details">
                    <li>
                      <a
                        href="http://38.100.110.143/feedback/feedback.html"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Lab Feedback Form
                      </a>
                    </li>
                    <li>
                      <a
                        href="http://38.100.110.143/labassessment/assessmentform.html"
                        target="_blank"
                        rel="noreferrer"
                      >
                        Lab Assessment Form
                      </a>
                    </li>
                    <li>
                      <a href="https://www.vlab.co.in/faq">FAQ</a>
                    </li>
                    <li>
                      <a href="http://www.sakshat.ac.in/">Shakshat Portal</a>
                    </li>
                  </ul>
                </div>
                <div className="col-md-3 col-lg-3 col-xs-12 col-sm-12">
                  <p className="ftr_head">About VLAB</p>
                  <ul className="ftr_details">
                    <li>
                      <Link to="/">Home</Link>
                    </li>
                    <li>
                      <Link to="/about">About us</Link>
                    </li>
                    <li>
                      <Link to="/contact">Contact Us</Link>
                    </li>
                  </ul>
                </div>
                <div className="col-md-2 col-lg-2 col-xs-12 col-sm-12 bdr-ftr">
                  <p className="ftr_head" />
                  <ul className="ftr_lst">
                    <li>
                      <span style={{ marginLeft: 20 }} />
                      <img src="/vl/images/qr-code-mob6.png" width="110" alt="Virtual Labs app" />
                    </li>
                  </ul>
                </div>
                <div className="col-md-4 col-lg-4 col-xs-12 col-sm-12">
                  <p className="ftr_head">
                    <u>Get In Touch With Us</u>
                  </p>
                  <ul className="ftr_lst">
                    <li />
                    <li>
                      <i className="fa fa-envelope ftr_fa_icn" />
                      &nbsp;&nbsp;
                      <a href="mailto:support@vlab.co.in">support@vlab.co.in</a>
                    </li>
                    <li>
                      <i className="fa fa-phone ftr_fa_icn" />
                      &nbsp;&nbsp; Phone(O) - +91-9211460624
                    </li>
                    <li>
                      <i className="fa fa-map-marker ftr_fa_icn" />
                      &nbsp;&nbsp;Wireless Research Lab <br />
                      Room No - 206/IIA <br />
                      Bharti School of Telecom
                      <br /> Indian Institute of Technology Delhi
                      <br />
                      Hauz Khas, New Delhi-110016
                    </li>
                  </ul>
                </div>
              </div>
            </div>
          </div>
        </footer>
      </section>

      <ToTop />
    </>
  );
}
