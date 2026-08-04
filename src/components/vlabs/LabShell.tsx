/**
 * The lab template, reproducing the shell every *.vlabs.ac.in lab renders.
 *
 * This is a different design system from the vlab.co.in portal: Bootstrap 5,
 * Open Sans / Raleway, a sticky white header carrying the MoE lock-up, a
 * breadcrumb trail back to the broad area, a left sidebar of page links and
 * the dark four-column footer. Markup and class names are taken from a live
 * lab (cse02-iiith.vlabs.ac.in), and the stylesheets that lay them out are
 * that template's own, served from /vlabs/css.
 */

import { useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { useVlaila } from "@/lib/vlaila";

export type LabNavItem = {
  label: string;
  to: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
  current?: boolean;
};

export type Crumb = {
  label: string;
  to?: string;
  params?: Record<string, string>;
  search?: Record<string, string>;
};

function NavMenu({ items, onNavigate }: { items: LabNavItem[]; onNavigate?: () => void }) {
  return (
    <>
      {items.map((item) => (
        <div key={item.label}>
          <div className="d-flex nav-menu-body">
            <Link
              to={item.to}
              params={item.params as never}
              search={item.search as never}
              className={item.current ? "p-2 current-item" : "p-2"}
              onClick={onNavigate}
            >
              {item.label}
            </Link>
          </div>
        </div>
      ))}
    </>
  );
}

export function LabShell({
  crumbs,
  nav,
  children,
}: {
  crumbs: Crumb[];
  nav: LabNavItem[];
  children: ReactNode;
}) {
  const [menuOpen, setMenuOpen] = useState(false);
  useVlaila();

  return (
    <div className="p-0 container-fluid vlabs-page d-flex flex-column justify-content-between">
      <header className="vlabs-header sticky-top bg-white">
        <nav className="p-0 navbar navbar-light d-flex align-items-stretch">
          <button
            className="navbar-toggler px-4"
            type="button"
            onClick={() => setMenuOpen((v) => !v)}
            aria-label="Toggle navigation"
          >
            <span className="navbar-toggler-icon" />
          </button>
          <div className="d-flex justify-content-center">
            <Link to="/" className="navbar-brand">
              <img
                src="/vlabs/images/vlabs-color-small-moe.jpg"
                alt="vlabs logo"
                className="vlabs-logo"
              />
            </Link>
          </div>
          <div
            id="headerNavbar"
            className="d-none border-top flex-grow-1 d-lg-flex align-items-center"
          >
            <ul className="navbar-nav ml-auto text-center d-flex flex-md-row">
              <li className="nav-item px-2 m-1">
                <Link to="/">HOME</Link>
              </li>
              <li className="nav-item px-2 m-1">
                <Link to="/partners">PARTNERS</Link>
              </li>
              <li className="nav-item px-2 m-1">
                <Link to="/contact">CONTACT</Link>
              </li>
            </ul>
          </div>
        </nav>
      </header>

      <div className="container-fluid flex-fill d-flex flex-column vlabs-page-main">
        <div className="row d-flex justify-content-between">
          <div className="flex-column">
            <div className="row py-4 px-4 breadcrumbs">
              {crumbs.map((c, i) => (
                <span key={c.label} style={{ display: "contents" }}>
                  {i > 0 && (
                    <span className="mx-2">
                      <i aria-hidden="true" className="fa fa-angle-right" />
                    </span>
                  )}
                  {c.to ? (
                    <Link
                      to={c.to}
                      params={c.params as never}
                      search={c.search as never}
                      className="sidebar-a"
                    >
                      {c.label}
                    </Link>
                  ) : (
                    <span className="sidebar-a">{c.label}</span>
                  )}
                </span>
              ))}
            </div>
          </div>
        </div>

        <div className="row flex-grow-1 d-flex flex-nowrap flex-column flex-lg-row">
          {/* Mobile: the template swaps the sidebar for a modal sheet. */}
          {menuOpen && (
            <div className="nav flex-column sidebar nav-menu flex-shrink-0 px-lg-4 d-lg-none">
              <NavMenu items={nav} onNavigate={() => setMenuOpen(false)} />
            </div>
          )}

          <div
            className="nav flex-column sidebar nav-menu flex-shrink-0 px-lg-4 align-items-center align-items-lg-start d-none d-lg-flex"
            id="menu"
          >
            <NavMenu items={nav} />
          </div>

          <div className="vlabs-page-content px-5 pb-4 flex-grow-1 markdown-body">{children}</div>
        </div>
      </div>

      <LabFooter />
    </div>
  );
}

function LabFooter() {
  return (
    <footer className="text-light pt-2 vlabs-footer d-flex flex-column">
      <div className="row px-5 mx-0">
        <div className="col d-flex flex-column">
          <span className="font-weight-bold vlabs-footer-sect-name pb-2 mb-3">Community Links</span>
          <a href="https://www.sakshat.ac.in/" className="text-light">
            Sakshat Portal
          </a>
          <a href="http://outreach.vlabs.ac.in/" className="text-light">
            Outreach Portal
          </a>
          <a href="https://vlab.co.in/faq" className="text-light">
            FAQ: Virtual Labs
          </a>
        </div>
        <div className="col d-flex flex-column">
          <span className="font-weight-bold vlabs-footer-sect-name pb-2 mb-3">Contact Us</span>
          <span> Phone: General Information: 011-26582050 </span>
          <span> Email: support@vlabs.ac.in </span>
        </div>
        <div className="col d-flex flex-column">
          <span className="font-weight-bold vlabs-footer-sect-name pb-2 mb-3">Follow Us</span>
          <div className="social-links">
            {[
              ["#55acee", "fab fa-twitter", "https://twitter.com/TheVirtualLabs"],
              [
                "#3b5998",
                "fab fa-facebook",
                "https://www.facebook.com/Virtual-Labs-IIT-Delhi-301510159983871/",
              ],
              ["#e52d27", "fab fa-youtube", "https://www.youtube.com/watch?v=asxRaOgk6a0"],
              ["#2867B2", "fab fa-linkedin", "https://in.linkedin.com/in/virtual-labs-008ba9136"],
            ].map(([bg, icon, href]) => (
              <a
                key={href}
                className="p-2 mt-1 mr-2 d-inline-flex justify-content-center align-items-center"
                style={{ background: bg }}
                href={href}
              >
                <i className={icon} />
              </a>
            ))}
          </div>
        </div>
      </div>
      <div
        className="m-0 py-2 text-center"
        style={{ fontFamily: '"Open Sans", sans-serif', background: "#212121" }}
      >
        <a
          className="text-primary font-weight-bold"
          href="https://www.gnu.org/licenses/agpl-3.0.en.html"
        >
          {" "}
          AGPL 3.0{" "}
        </a>
        &nbsp;&amp;&nbsp;
        <a
          className="text-primary font-weight-bold"
          href="https://creativecommons.org/licenses/by-nc-sa/4.0/"
        >
          {" "}
          Creative Commons (CC BY-NC-SA 4.0){" "}
        </a>
      </div>
    </footer>
  );
}
