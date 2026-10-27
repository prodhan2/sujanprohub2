import { useState, useEffect } from 'react'
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import './Resume.css'

function Resume() {
  const [cvData, setCvData] = useState({
    personalInfo: {
      name: '',
      photoUrl: '',
      dateOfBirth: '',
      nationality: '',
      address: '',
      phone: '',
      email: '',
      linkedin: '',
      github: '',
      website: '',
      portfolio: '',
      bio: '',
      summary: ''
    },
    education: [],
    experience: [],
    skills: [],
    projects: [],
    certifications: [],
    languages: [],
    hobbies: [],
    references: [],
    cvFileUrl: ''
  })

  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'portfolio', 'cv'), (snapshot) => {
      if (snapshot.exists()) {
        setCvData(prev => ({
          ...prev,
          ...snapshot.data(),
          personalInfo: {
            ...prev.personalInfo,
            ...snapshot.data().personalInfo
          },
          education: snapshot.data().education || [],
          experience: snapshot.data().experience || [],
          skills: snapshot.data().skills || [],
          projects: snapshot.data().projects || [],
          certifications: snapshot.data().certifications || [],
          languages: snapshot.data().languages || [],
          hobbies: snapshot.data().hobbies || [],
          references: snapshot.data().references || []
        }))
      }
    })
    return unsubscribe
  }, [])

  const hasData = 
    cvData.personalInfo.name || 
    cvData.personalInfo.summary || 
    (cvData.education && cvData.education.length > 0) || 
    (cvData.experience && cvData.experience.length > 0)

  return (
    <section id="resume" className="resume section py-3">
      <div className="container">
        <div className="section-title text-center mb-3">
          <div className="d-flex justify-content-center align-items-center gap-3">
            <h2 className="mb-0">Resume</h2>
            {cvData.cvFileUrl && (
              <a 
                href={cvData.cvFileUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="btn btn-sm btn-outline-primary rounded-pill px-3"
                title="Download CV"
              >
                <i className="bi bi-download me-1"></i> Download CV
              </a>
            )}
          </div>
        </div>

        {!hasData ? (
          <div className="text-center py-4">
            <p className="text-muted">No resume data yet. Please add data from the admin panel.</p>
          </div>
        ) : (
          <div className="row g-3">
            {/* Left Column: Summary & Education */}
            <div className="col-lg-6">
              <div className="resume-scroll-col">
                {cvData.personalInfo.summary && (
                  <div className="mb-2">
                    <h3 className="resume-title">
                      <i className="bi bi-person-badge text-primary"></i> Summary
                    </h3>
                    <div className="resume-item">
                      {cvData.personalInfo.name && <h4>{cvData.personalInfo.name}</h4>}
                      {cvData.personalInfo.bio && <p className="mb-1"><em>{cvData.personalInfo.bio}</em></p>}
                      <ul className="resume-contact-badges">
                        {cvData.personalInfo.address && (
                          <li><i className="bi bi-geo-alt text-danger me-1"></i>{cvData.personalInfo.address}</li>
                        )}
                        {cvData.personalInfo.phone && (
                          <li><i className="bi bi-telephone text-success me-1"></i>{cvData.personalInfo.phone}</li>
                        )}
                        {cvData.personalInfo.email && (
                          <li><i className="bi bi-envelope text-primary me-1"></i>{cvData.personalInfo.email}</li>
                        )}
                      </ul>
                    </div>
                  </div>
                )}

                {cvData.education && cvData.education.length > 0 && (
                  <div>
                    <h3 className="resume-title">
                      <i className="bi bi-mortarboard text-primary"></i> Education
                    </h3>
                    {cvData.education.map((edu, index) => (
                      <div key={index} className="resume-item">
                        <div className="resume-item-header">
                          {edu.degree && <h4>{edu.degree}{edu.major ? ` in ${edu.major}` : ''}</h4>}
                          {edu.startDate && <h5>{edu.startDate} - {edu.endDate || 'Present'}</h5>}
                        </div>
                        {edu.institution && <p className="mb-1 fw-semibold text-secondary"><em>{edu.institution}</em></p>}
                        {edu.result && <p className="mb-1 text-muted small">Result: <strong>{edu.result}</strong></p>}
                        {edu.description && <p className="mb-0 text-muted">{edu.description}</p>}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>

            {/* Right Column: Experience */}
            <div className="col-lg-6">
              <div className="resume-scroll-col">
                {cvData.experience && cvData.experience.length > 0 && (
                  <div>
                    <h3 className="resume-title">
                      <i className="bi bi-briefcase text-primary"></i> Professional Experience
                    </h3>
                    {cvData.experience.map((exp, index) => (
                      <div key={index} className="resume-item">
                        <div className="resume-item-header">
                          {exp.position && <h4>{exp.position}</h4>}
                          {exp.startDate && <h5>{exp.startDate} - {exp.endDate || 'Present'}</h5>}
                        </div>
                        {exp.company && <p className="mb-1 fw-semibold text-secondary"><em>{exp.company}</em> {exp.location ? `• ${exp.location}` : ''}</p>}
                        {exp.responsibilities && (
                          <ul>
                            {exp.responsibilities.split(',').map((resp, i) => (
                              <li key={i}>{resp.trim()}</li>
                            ))}
                          </ul>
                        )}
                      </div>
                    ))}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </section>
  )
}

export default Resume
