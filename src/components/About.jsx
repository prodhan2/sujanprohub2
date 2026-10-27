import './About.css'

function About() {
  return (
    <section id="about" className="about section py-5">
      <div className="container">
        <div className="section-title text-center mb-5">
          <h2>About</h2>
          <p>Hi, I am Sujan Pradhan. Currently studying Computer Science and Engineering in Rajshahi University. Besides, I am working on editing Google Maps and various pages. You can say, a content writer, website designer, graphic designer. And finally a programmer. Search "sujan prodhan" you can see all my details. Thank you for reading so carefully.</p>
        </div>

        <div className="row justify-content-center">
          <div className="col-lg-8 content">
            <h2>UI/UX Designer & Web Developer.</h2>
            <p className="fst-italic py-3">Some add info</p>
            <div className="row">
              <div className="col-lg-6">
                <ul className="list-unstyled">
                  <li className="mb-2"><i className="bi bi-chevron-right me-2"></i><strong>Birthday:</strong> <span>27 October</span></li>
                  <li className="mb-2"><i className="bi bi-chevron-right me-2"></i><strong>Website:</strong> <span>prodhan2.github.io</span></li>
                  <li className="mb-2"><i className="bi bi-chevron-right me-2"></i><strong>Phone:</strong> <span>+880190238-3808</span></li>
                  <li className="mb-2"><i className="bi bi-chevron-right me-2"></i><strong>City:</strong> <span>Dinajpur, Bangladesh</span></li>
                </ul>
              </div>
              <div className="col-lg-6">
                <ul className="list-unstyled">
                  <li className="mb-2"><i className="bi bi-chevron-right me-2"></i><strong>Age:</strong> <span>22</span></li>
                  <li className="mb-2"><i className="bi bi-chevron-right me-2"></i><strong>Degree:</strong> <span>Computer Science and Engineering at Rajshahi University</span></li>
                  <li className="mb-2"><i className="bi bi-chevron-right me-2"></i><strong>Email:</strong> <span>sujan.ru.cse@gmail.com</span></li>
                  <li className="mb-2"><i className="bi bi-chevron-right me-2"></i><strong>Freelance:</strong> <span>Available</span></li>
                </ul>
              </div>
            </div>
          </div>
        </div>
      </div>
    </section>
  )
}

export default About
