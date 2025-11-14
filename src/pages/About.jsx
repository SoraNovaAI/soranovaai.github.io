import './About.css'

function About() {
  return (
    <div className="about">
      <div className="container about-container">
        <h1>A team on a mission to make infrastructure work for you.</h1>

        <section className="about-section">
          <p>
            We're engineers who love solving hard problems in GPU orchestration. Our backgrounds span ML research, cloud architecture, GPU hardware, and robotics - but we're always learning from each other and the wider open source community.
          </p>
        </section>

        <section className="about-section">
          <p>
            Working across Singapore and India, our team brings together folks who've previously built large scale systems at companies like Meta, Nutanix, ByteDance, and Gojek. Many of us have spent substantial time in US and European tech ecosystems, and are now united back in Asia to build global tech from home.
          </p>
        </section>

        <section className="about-section">
          <p>
            We keep things simple: write good code, build reliable systems, and have fun doing it. If you're passionate about GPU infrastructure and enjoy diving deep into technical challenges, come join us!
          </p>
        </section>

        <section className="about-section">
          <h2>Get In Touch</h2>
          <p>
            Want to collaborate or have questions? Reach out to us at{' '}
            <a href="mailto:hello@soracloud.ai">hello@soracloud.ai</a>
            {' '}or on{' '}
            <a href="https://github.com/soranovaai" target="_blank" rel="noopener noreferrer">
              GitHub
            </a>
            .
          </p>
        </section>
      </div>
    </div>
  )
}

export default About
