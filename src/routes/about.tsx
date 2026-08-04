import { createFileRoute } from "@tanstack/react-router";
import { InnerPage, ContactRail } from "@/components/vlabs/InnerPage";

export const Route = createFileRoute("/about")({
  head: () => ({ meta: [{ title: "About VLAB — Virtual Labs" }] }),
  component: About,
});

/** Copy, headings and imagery transcribed from https://www.vlab.co.in/about-us. */
function About() {
  return (
    <InnerPage title="About VLAB" breadcrumb="About Us" rail={<ContactRail />}>
      <div className="obj-heading-inner">Overview</div>
      <div className="obj-text-inner">
        <p>
          Virtual Labs project is an initiative of Ministry of Education (MoE), Government of India
          under the aegis of National Mission on Education through Information and Communication
          Technology (NMEICT). This project is a consortium activity of twelve participating
          institutes and IIT Delhi is coordinating institute. It is a paradigm shift in ICT-based
          education. For the first time, such an initiative has been taken-up in
          remote&#8208;experimentation. Under Virtual Labs project, over 175 Virtual Labs consisting
          of approximately 1590+ web-enabled experiments were designed for remote-operation and
          viewing.
        </p>
        <p>
          <i>The intended beneficiaries of the projects are:</i>
        </p>
        <ul>
          <li>
            All students and Faculty Members of Science and Engineering Colleges who do not have
            access to good lab&#8208;facilities and/or instruments.
          </li>
          <li>
            High&#8208;school students, whose inquisitiveness will be triggered, possibly motivating
            them to take up higher&#8208;studies. Researchers in different institutes who can
            collaborate and share resources.
          </li>
          <li>
            Different engineering colleges who can benefit from the content and related teaching
            resources.
          </li>
        </ul>
        {/* The source wraps the list above in a <p>; splitting it leaves this
            empty paragraph behind, which is 18px of the column's height. */}
        <p />
        <p style={{ marginTop: -16 }}>
          Virtual Labs do not require any additional infrastructural setup for conducting
          experiments at user premises. The simulations-based experiments can be accessed remotely
          via internet.
        </p>
      </div>
      <div className="about-img">
        <img src="/vl/images/about.png" className="img-responsive" alt="" />
      </div>
      <br />
      <br />
    </InnerPage>
  );
}
