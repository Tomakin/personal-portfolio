import { markdownify } from "@lib/utils/textConverter";
import shortcodes from "@shortcodes/all";
import { MDXRemote } from "next-mdx-remote";
import ImageFallback from "./components/ImageFallback";

const About = ({ data }) => {
  const { frontmatter, mdxContent } = data;
  const { title, image, education, experience } = frontmatter;

  return (
    <section style={{ marginTop: "0rem" }} className="section mt-16">
      <div className="container text-center">
        {image && (
          <div className="mb-8 mx-auto w-full max-w-[400px]">
            <ImageFallback
              src={image}
              width={400}
              height={400}
              alt={title}
              className="rounded-lg mx-auto"
            />
          </div>
        )}
        {markdownify(title, "h1", "h1 text-left lg:text-[55px] mt-12")}

        <div className="content text-left">
          <MDXRemote {...mdxContent} components={shortcodes} />
        </div>

        <div className="row mt-24 text-left lg:flex-nowrap">
          <div className="experience mt-10 lg:mt-0 lg:col-6">
            <div className="rounded border border-border p-6 dark:border-darkmode-border ">
              {markdownify(experience.title, "h2", "section-title mb-12")}
              <ul className="row">
                {experience?.list?.map((item, index) => (
                  <li
                    className="mb-5 text-lg font-bold text-dark dark:text-darkmode-light lg:col-6"
                    key={"experience-" + index}
                  >
                    {item}
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      </div>
    </section>
  );
};

export default About;
