/**
 * The inner-page shell used by every page except Home.
 *
 * Reproduces the live site's inner layout element for element: the
 * `container-fluid innerHead` navy banner carrying the page title, the
 * breadcrumb rule, a `col-md-9` content column and the grey `#rightColm`
 * rail. Grid classes are Bootstrap's own so the columns land exactly where
 * they do on vlab.co.in.
 */

import { useEffect, useState, type ReactNode } from "react";
import { Link } from "@tanstack/react-router";
import { PageLayout } from "./PageLayout";

export function InnerPage({
  title,
  breadcrumb,
  children,
  rail,
}: {
  title: string;
  breadcrumb?: string;
  children: ReactNode;
  rail?: ReactNode;
}) {
  return (
    <PageLayout>
      <div className="container-fluid innerHead">
        <div className="container">
          <div className="row">
            <div className="col-md-7">
              <h3 className="innerhead-text">{title}</h3>
            </div>
          </div>
        </div>
      </div>

      <section>
        <div className="container">
          <div className="row">
            {/* The live inner pages keep the content in col-md-9 whether or
                not a rail is present, so the measure never changes. */}
            <div className="col-md-9">
              <nav className="bradcums_vlab">
                <Link to="/">Home</Link> &raquo; {breadcrumb ?? title}
              </nav>
              {children}
            </div>
            {rail && (
              <div id="rightColm" className="col-md-3">
                {rail}
              </div>
            )}
          </div>
        </div>
      </section>
    </PageLayout>
  );
}

/**
 * The contact card the live site puts at the top of the right rail, followed
 * by its rotating gallery of lab photographs.
 */
export function ContactRail() {
  return (
    <>
      <h3 style={{ color: "#fff" }}>Contact Us</h3>
      <div className="content">
        <div>
          <table style={{ fontSize: 13 }}>
            <tbody>
              <tr style={{ lineHeight: 2.5 }}>
                <td width="16%">
                  <i className="fa fa-envelope ftr_fa_icn" />
                </td>
                <td>
                  <a href="mailto:support@vlab.co.in">support@vlab.co.in</a>
                </td>
              </tr>
              <tr style={{ lineHeight: 2.5 }}>
                <td>
                  <i className="fa fa-phone ftr_fa_icn" />
                </td>
                <td>Phone(L) - 011-26582050</td>
              </tr>
              <tr style={{ lineHeight: 0.4 }}>
                <td />
                <td>&nbsp;</td>
              </tr>
              <tr style={{ lineHeight: 1.5 }}>
                <td style={{ verticalAlign: "top" }}>
                  <i className="fa fa-map-marker ftr_fa_icn" />
                </td>
                <td>
                  Wireless Research Lab <br />
                  Room No - 206/IIA
                  <br />
                  Bharti School of Telecom <br />
                  Indian Institute of Technology Delhi
                  <br />
                  Hauz Khas, New Delhi-110016
                </td>
              </tr>
            </tbody>
          </table>
        </div>
        <div className="space30" />
      </div>
      <InnerSlider />
    </>
  );
}

/**
 * The right rail's photo rotator (`#innerSlider` on the live site, a slick
 * carousel showing one frame at a time).
 */
function InnerSlider() {
  const [i, setI] = useState(0);

  useEffect(() => {
    const id = window.setInterval(() => setI((n) => (n + 1) % 5), 4000);
    return () => window.clearInterval(id);
  }, []);

  return (
    <section className="inner-slider">
      <div id="innerSlider">
        <div className="slide">
          <img src={`/vl/images/inner_slider/image${i + 1}.gif`} alt="" />
          <div className="slide-desc" />
        </div>
      </div>
    </section>
  );
}

/** The grey link list the live site puts in the right rail on some pages. */
export function Rail({
  heading,
  links,
}: {
  heading: string;
  links: { label: string; to?: string; href?: string }[];
}) {
  return (
    <>
      <h3>{heading}</h3>
      <ul>
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? <Link to={l.to}>{l.label}</Link> : <a href={l.href ?? "#"}>{l.label}</a>}
          </li>
        ))}
      </ul>
    </>
  );
}
