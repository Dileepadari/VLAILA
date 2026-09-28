import { createFileRoute } from "@tanstack/react-router";
import { InnerPage } from "@/components/vlabs/InnerPage";

export const Route = createFileRoute("/contact")({
  head: () => ({ meta: [{ title: "Contact Us - Virtual Labs" }] }),
  component: Contact,
});

/** Copy, address block and embedded map from https://www.vlab.co.in/contact-us. */
function Contact() {
  return (
    <InnerPage title="Contact Us" breadcrumb="Contact Us">
      <div className="obj-heading-inner">Contact Us</div>
      <div className="space10" />
      <div style={{ fontSize: 14 }}>
        <p>Wireless Research Lab </p>
        <p>Room No - 206/IIA </p>
        <p>Bharti School of Telecom </p>
        <p>Indian Institute of Technology Delhi</p>
        <p>Hauz Khas, New Delhi-110016, INDIA</p>
        <p>
          <i className="fa fa-phone" aria-hidden="true" /> : +91-9211460624
        </p>
        <p>
          <i className="fa fa-envelope" /> :{" "}
          <a href="mailto:support@vlab.co.in">support@vlab.co.in</a>
        </p>
      </div>
      <div className="space30" />
      <iframe
        title="Indian Institute of Technology Delhi"
        src="https://www.google.com/maps/embed?pb=!1m18!1m12!1m3!1d3504.824967967758!2d77.19043971445447!3d28.544980294790165!2m3!1f0!2f0!3f0!3m2!1i1024!2i768!4f13.1!3m3!1m2!1s0x390d1df6b9055fb5%3A0x81c10b266b1ea3c0!2sIndian+Institute+of+Technology+Delhi!5e0!3m2!1sen!2sin!4v1530701748838"
        width="830"
        height="250"
        frameBorder="0"
        style={{ border: 1 }}
        allowFullScreen
      />
      {/* The live contact page follows its section with a space30 block. */}
      <div className="space30" />
    </InnerPage>
  );
}
