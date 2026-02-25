import { markdownify } from "@lib/utils/textConverter";
import Link from "next/link";
import { BsArrowRightShort } from "react-icons/bs";
import { FaEnvelope, FaMapMarkerAlt, FaUserAlt } from "react-icons/fa";
import ImageFallback from "./components/ImageFallback";

const Contact = ({ data }) => {
  const { frontmatter } = data;
  const { title, form_action, phone, mail, location } = frontmatter;

  return (
    <section className="section lg:mt-16">
      <div className="container">
        <div className="row relative pb-16 items-stretch">
          {/* Hugging Face Chatbot - Left Side */}
          <div className="lg:col-6 mb-8 lg:mb-0 lg:pr-8">
            <div className="h-[500px] lg:h-[600px]" style={{ overflow: "hidden", border: "1px solid #ccc", height: "100%" }}>
              <h2>
                Chat with
                <span className="ml-1.5 inline-flex items-center text-primary">
                  Me
                  <BsArrowRightShort />
                </span>
              </h2>
              <iframe
                src="https://tomakinn-chatbot-me.hf.space"
                width="100%"
                height="100%"
                className="w-full h-full rounded border border-border overflow-hidden"
                title="Chatbot"
                style={{ paddingTop: "0px" }}
              ></iframe>
            </div>
          </div>

          {/* Contact Form - Right Side */}
          <div className="contact-form-wrapper rounded border border-border p-6 lg:col-6 lg:pl-8 flex flex-col">
            <h2>
              Send Me A
              <span className="ml-1.5 inline-flex items-center text-primary">
                Message
                <BsArrowRightShort />
              </span>
            </h2>
            <form
              className="contact-form mt-12 flex-grow"
              method="POST"
              action={form_action}
            >
              <div className="mb-6">
                <label className="mb-2 block font-secondary" htmlFor="name">
                  Full name
                  <small className="font-secondary text-sm text-primary">
                    *
                  </small>
                </label>
                <input
                  className="form-input w-full"
                  name="name"
                  type="text"
                  placeholder="Thomas Milano"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="mb-2 block font-secondary" htmlFor="email">
                  Email Address
                  <small className="font-secondary text-sm text-primary">
                    *
                  </small>
                </label>
                <input
                  className="form-input w-full"
                  name="email"
                  type="email"
                  placeholder="example@gmail.com"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="mb-2 block font-secondary" htmlFor="subject">
                  Subject
                  <small className="font-secondary text-sm text-primary">
                    *
                  </small>
                </label>
                <input
                  className="form-input w-full"
                  name="subject"
                  type="text"
                  placeholder="Blog advertisement"
                  required
                />
              </div>
              <div className="mb-6">
                <label className="mb-2 block font-secondary" htmlFor="message">
                  Your Message Here
                  <small className="font-secondary text-sm text-primary">
                    *
                  </small>
                </label>
                <textarea
                  className="form-textarea w-full"
                  name="message"
                  placeholder="Hello I'm Mr 'x' from………….."
                  rows="5"
                  required
                />
              </div>
              <input
                className="btn btn-primary"
                type="submit"
                value="Send Now"
              />
            </form>
          </div>
        </div>
        <div className="row">

          <div className="md:col-6 lg:col-4">

          </div>

          {mail && (
            <div className="md:col-6 lg:col-4">
              <Link
                href={`mailto:${mail}`}
                className="my-4 flex h-[100px] items-center justify-center
             rounded border border-border p-4 text-primary"
              >
                <FaEnvelope />
                <p className="ml-1.5 text-lg font-bold text-dark">
                  {mail}
                </p>
              </Link>
            </div>
          )}
        </div>
      </div>
    </section>
  );
};

export default Contact;
