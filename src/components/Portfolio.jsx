import './Portfolio.css'

function Portfolio() {
  const portfolioItems = [
    {
      type: 'app',
      title: 'App 1',
      description: 'Lorem ipsum, dolor sit amet consectetur',
    },
    {
      type: 'app',
      title: 'App 2',
      description: 'Lorem ipsum, dolor sit amet consectetur',
    },
    {
      type: 'app',
      title: 'App 3',
      description: 'Lorem ipsum, dolor sit amet consectetur',
    },
    {
      type: 'books',
      title: 'Books 1',
      description: 'Lorem ipsum, dolor sit amet consectetur',
    },
    {
      type: 'books',
      title: 'Books 2',
      description: 'Lorem ipsum, dolor sit amet consectetur',
    },
    {
      type: 'books',
      title: 'Books 3',
      description: 'Lorem ipsum, dolor sit amet consectetur',
    },
  ]

  return (
    <section id="portfolio" className="portfolio section py-5 bg-light">
      <div className="container">
        <div className="section-title text-center mb-5">
          <h2>Portfolio</h2>
        </div>

        <div className="row gy-4">
          {portfolioItems.map((item, index) => (
            <div key={index} className="col-lg-4 col-md-6 portfolio-item">
              <div className="portfolio-content h-100">
                <div className="portfolio-info p-3 bg-white">
                  <h4>{item.title}</h4>
                  <p>{item.description}</p>
                  <a href="#" className="preview-link"><i className="bi bi-zoom-in"></i></a>
                  <a href="#" className="details-link"><i className="bi bi-link-45deg"></i></a>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </section>
  )
}

export default Portfolio
