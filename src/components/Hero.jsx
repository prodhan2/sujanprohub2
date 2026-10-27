import './Hero.css'
import CircleProfile from './CircleProfile'
import { useState, useEffect } from 'react'
import { doc, onSnapshot, collection } from 'firebase/firestore'
import { jsPDF } from 'jspdf'
import autoTable from 'jspdf-autotable'
import { useNavigate } from 'react-router-dom'
import { db } from '../firebase'

function Hero() {
  const navigate = useNavigate()
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
  const [currentRoleIndex, setCurrentRoleIndex] = useState(0)
  const [bio, setBio] = useState('')
  const [roles, setRoles] = useState(['App Developer', 'Student', 'Web Developer'])

  useEffect(() => {
    const unsubscribeCv = onSnapshot(doc(db, 'portfolio', 'cv'), (snapshot) => {
      if (snapshot.exists()) {
        setCvData(snapshot.data())
      }
    })
    
    const unsubscribeConfig = onSnapshot(doc(db, 'portfolio', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        setBio(snapshot.data().bio || '')
      }
    })

    const unsubscribeRoles = onSnapshot(collection(db, 'roleskeyword'), (snapshot) => {
      const rolesData = snapshot.docs.map(doc => ({
        id: doc.id, ...doc.data()
      }))
      const sortedRoles = [...rolesData].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map(r => r.name)
      setRoles(sortedRoles.length > 0 ? sortedRoles : ['App Developer', 'Student', 'Web Developer'])
    })
    
    return () => {
      unsubscribeCv()
      unsubscribeConfig()
      unsubscribeRoles()
    }
  }, [])

  useEffect(() => {
    const interval = setInterval(() => {
      setCurrentRoleIndex((prev) => (prev + 1) % roles.length)
    }, 2000)
    return () => clearInterval(interval)
  }, [roles.length])

  const generatePDF = async () => {
    const doc = new jsPDF()
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()

    // Header
    doc.setFillColor(33, 150, 243)
    doc.rect(0, 0, pageWidth, 50, 'F')
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(22)
    doc.setFont(undefined, 'bold')
    
    // Add profile photo if available
    if (cvData.personalInfo.photoUrl) {
      try {
        doc.addImage(cvData.personalInfo.photoUrl, 'JPEG', 10, 10, 30, 30)
      } catch (e) {
        console.error('Error adding photo to PDF:', e)
      }
    }
    
    doc.text(cvData.personalInfo.name || 'Sujan Prodhan', pageWidth / 2, 30, { align: 'center' })
    
    doc.setFontSize(12)
    doc.setFont(undefined, 'normal')
    const contactDetails = [
      cvData.personalInfo.email,
      cvData.personalInfo.phone,
      cvData.personalInfo.address
    ].filter(Boolean).join(' | ')
    doc.text(contactDetails, pageWidth / 2, 40, { align: 'center' })

    let yPosition = 60
    
    // Professional Summary
    if (cvData.personalInfo.summary) {
      doc.setTextColor(33, 150, 243)
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Professional Summary', 14, yPosition)
      yPosition += 10
      
      doc.setTextColor(0, 0, 0)
      doc.setFontSize(10)
      doc.setFont(undefined, 'normal')
      const summaryLines = doc.splitTextToSize(cvData.personalInfo.summary, pageWidth - 28)
      doc.text(summaryLines, 14, yPosition)
      yPosition += summaryLines.length * 6 + 10
    }

    // Experience
    if (cvData.experience && cvData.experience.length > 0) {
      if (yPosition > pageHeight - 50) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setTextColor(33, 150, 243)
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Work Experience', 14, yPosition)
      yPosition += 12

      doc.setTextColor(0, 0, 0)
      cvData.experience.forEach(exp => {
        if (yPosition > pageHeight - 80) {
          doc.addPage()
          yPosition = 20
        }
        
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text(`${exp.position} at ${exp.company}`, 14, yPosition)
        yPosition += 6
        
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(100, 100, 100)
        const dates = `${exp.startDate || ''} - ${exp.endDate || 'Present'}`
        doc.text(`${dates} | ${exp.location || ''}`, 14, yPosition)
        yPosition += 8
        
        doc.setTextColor(0, 0, 0)
        if (exp.responsibilities) {
          const respLines = doc.splitTextToSize(exp.responsibilities, pageWidth - 28)
          doc.text(respLines, 14, yPosition)
          yPosition += respLines.length * 6 + 8
        } else {
          yPosition += 8
        }
      })
    }

    // Education
    if (cvData.education && cvData.education.length > 0) {
      if (yPosition > pageHeight - 50) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setTextColor(33, 150, 243)
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Education', 14, yPosition)
      yPosition += 12

      doc.setTextColor(0, 0, 0)
      cvData.education.forEach(edu => {
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = 20
        }
        
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text(`${edu.degree} in ${edu.major}`, 14, yPosition)
        yPosition += 6
        
        doc.setFontSize(10)
        doc.setFont(undefined, 'normal')
        doc.setTextColor(100, 100, 100)
        const eduDates = `${edu.startDate || ''} - ${edu.endDate || ''}`
        doc.text(`${edu.institution} | ${eduDates}`, 14, yPosition)
        yPosition += 6
        
        if (edu.result) {
          doc.setTextColor(0, 0, 0)
          doc.text(`Result: ${edu.result}`, 14, yPosition)
          yPosition += 6
        }
        
        if (edu.description) {
          const descLines = doc.splitTextToSize(edu.description, pageWidth - 28)
          doc.text(descLines, 14, yPosition)
          yPosition += descLines.length * 6
        }
        
        yPosition += 8
      })
    }

    // Skills
    if (cvData.skills && cvData.skills.length > 0) {
      if (yPosition > pageHeight - 50) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setTextColor(33, 150, 243)
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Skills', 14, yPosition)
      yPosition += 10

      const skillTableData = cvData.skills.map(skill => [skill.name, skill.level])
      autoTable(doc, {
        startY: yPosition,
        head: [['Skill', 'Level']],
        body: skillTableData,
        theme: 'grid',
        headStyles: { fillColor: [33, 150, 243], textColor: 255 },
        margin: { left: 14, right: 14 }
      })
      
      yPosition = (doc.lastAutoTable?.finalY || yPosition) + 10
    }

    // Projects
    if (cvData.projects && cvData.projects.length > 0) {
      if (yPosition > pageHeight - 50) {
        doc.addPage()
        yPosition = 20
      }
      
      doc.setTextColor(33, 150, 243)
      doc.setFontSize(14)
      doc.setFont(undefined, 'bold')
      doc.text('Projects', 14, yPosition)
      yPosition += 12

      doc.setTextColor(0, 0, 0)
      cvData.projects.forEach(proj => {
        if (yPosition > pageHeight - 60) {
          doc.addPage()
          yPosition = 20
        }
        
        doc.setFontSize(12)
        doc.setFont(undefined, 'bold')
        doc.text(proj.name, 14, yPosition)
        yPosition += 6
        
        if (proj.technologies) {
          doc.setFontSize(10)
          doc.setTextColor(100, 100, 100)
          doc.text(`Tech: ${proj.technologies}`, 14, yPosition)
          yPosition += 6
        }
        
        if (proj.description) {
          doc.setTextColor(0, 0, 0)
          const descLines = doc.splitTextToSize(proj.description, pageWidth - 28)
          doc.text(descLines, 14, yPosition)
          yPosition += descLines.length * 6
        }
        
        if (proj.url) {
          doc.setTextColor(33, 150, 243)
          doc.textWithLink(proj.url, 14, yPosition, { url: proj.url })
          yPosition += 6
        }
        
        yPosition += 8
      })
    }

    doc.save(`${cvData.personalInfo.name || 'Sujan_Prodhan'}_CV.pdf`)
  }

  return (
    <section className="hero-section container py-5" id="hero">
      <div className="row align-items-center">
        <div className="col-lg-6">
          <CircleProfile />
        </div>
        <div className="col-lg-6 detail">
          <h3>Hi, I'm</h3>
          <h1 style={{ display: 'flex', alignItems: 'center', whiteSpace: 'nowrap', overflow: 'hidden' }}>
            <span style={{ color: '#f9532d' }}>Sujan</span> Prodhan
            <span 
              className="role-swapper ms-2"
              style={{ 
                color: '#f9532d',
                display: 'inline-block',
                animation: 'fadeIn 0.5s ease-in-out',
                flexShrink: 0
              }}
              key={currentRoleIndex}
            >
              {roles[currentRoleIndex]}
            </span>
          </h1>
          <h3 style={{ margin: 0, marginBottom: '0.5rem' }}>Computer Science and Engineering</h3>
          <div className="d-flex align-items-center gap-2 mb-3">
            <img 
              src="https://images.seeklogo.com/logo-png/61/2/rajshahi-university-logo-png_seeklogo-611732.png" 
              alt="University of Rajshahi" 
              style={{ width: '30px', height: '30px', objectFit: 'contain' }}
            />
            <h4 style={{ margin: 0 }}>University of Rajshahi</h4>
          </div>
          {bio && (
            <p style={{ marginTop: '0.5rem', marginBottom: '1rem', color: '#555' }}>{bio}</p>
          )}
          <div style={{ marginTop: '1rem' }}>
            <button className="btn btn-primary me-2" onClick={() => navigate('/contact')}>Contact Me</button>
            <button className="btn btn-outline-primary me-2" onClick={generatePDF}>Download CV</button>
          </div>
        </div>
      </div>
    </section>
  )
}

export default Hero
