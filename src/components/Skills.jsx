import { useState, useEffect, useRef, useMemo } from 'react'
import { collection, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'
import './Skills.css'

import {
  Chart as ChartJS,
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
} from 'chart.js'
import { Bar } from 'react-chartjs-2'

ChartJS.register(
  CategoryScale,
  LinearScale,
  BarElement,
  Title,
  Tooltip,
  Legend
)

function Skills() {
  const [skills, setSkills] = useState([])
  const [viewMode, setViewMode] = useState('chart') // 'chart' | 'grid'
  const [isVisible, setIsVisible] = useState(false)
  const sectionRef = useRef(null)

  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'skills'), (snapshot) => {
      const skillsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }))
      setSkills(skillsList)
    })
    return unsubscribe
  }, [])

  useEffect(() => {
    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0]
        if (entry.isIntersecting) {
          setIsVisible(true)
        }
      },
      { threshold: 0.15 }
    )

    if (sectionRef.current) {
      observer.observe(sectionRef.current)
    }

    return () => {
      if (sectionRef.current) {
        observer.unobserve(sectionRef.current)
      }
    }
  }, [skills])

  // Color palette for column bars
  const barColors = [
    'rgba(20, 157, 221, 0.85)',
    'rgba(99, 102, 241, 0.85)',
    'rgba(16, 185, 129, 0.85)',
    'rgba(245, 158, 11, 0.85)',
    'rgba(239, 68, 68, 0.85)',
    'rgba(168, 85, 247, 0.85)',
    'rgba(236, 72, 153, 0.85)',
    'rgba(14, 165, 233, 0.85)',
    'rgba(132, 204, 22, 0.85)',
    'rgba(249, 115, 22, 0.85)',
    'rgba(6, 182, 212, 0.85)',
    'rgba(139, 92, 246, 0.85)',
    'rgba(20, 184, 166, 0.85)'
  ]

  const barHoverColors = [
    'rgba(20, 157, 221, 1)',
    'rgba(99, 102, 241, 1)',
    'rgba(16, 185, 129, 1)',
    'rgba(245, 158, 11, 1)',
    'rgba(239, 68, 68, 1)',
    'rgba(168, 85, 247, 1)',
    'rgba(236, 72, 153, 1)',
    'rgba(14, 165, 233, 1)',
    'rgba(132, 204, 22, 1)',
    'rgba(249, 115, 22, 1)',
    'rgba(6, 182, 212, 1)',
    'rgba(139, 92, 246, 1)',
    'rgba(20, 184, 166, 1)'
  ]

  const chartData = useMemo(() => {
    const labels = skills.map(s => s.name || 'Skill')
    const dataValues = skills.map(s => Number(s.value) || 0)

    return {
      labels,
      datasets: [
        {
          label: 'Proficiency Level (%)',
          data: isVisible ? dataValues : dataValues.map(() => 0),
          backgroundColor: skills.map((_, i) => barColors[i % barColors.length]),
          hoverBackgroundColor: skills.map((_, i) => barHoverColors[i % barHoverColors.length]),
          borderRadius: 8,
          borderSkipped: false,
          maxBarThickness: 42,
          barPercentage: 0.7
        }
      ]
    }
  }, [skills, isVisible])

  const chartOptions = useMemo(() => {
    return {
      responsive: true,
      maintainAspectRatio: false,
      animation: {
        duration: 1200,
        easing: 'easeOutQuart'
      },
      plugins: {
        legend: {
          display: false
        },
        tooltip: {
          backgroundColor: 'rgba(15, 23, 42, 0.92)',
          titleFont: { size: 13, family: 'Poppins, sans-serif', weight: '600' },
          bodyFont: { size: 13, family: 'Poppins, sans-serif' },
          padding: 10,
          cornerRadius: 8,
          displayColors: true,
          callbacks: {
            label: function (context) {
              return ` Proficiency: ${context.parsed.y}%`
            }
          }
        }
      },
      scales: {
        y: {
          beginAtZero: true,
          max: 100,
          ticks: {
            stepSize: 20,
            callback: (val) => `${val}%`,
            font: { size: 11, family: 'Poppins, sans-serif' },
            color: '#64748b'
          },
          grid: {
            color: '#e2e8f0',
            drawBorder: false
          }
        },
        x: {
          ticks: {
            maxRotation: 35,
            minRotation: 20,
            autoSkip: false,
            font: { size: 11, family: 'Poppins, sans-serif', weight: '500' },
            color: '#1e293b'
          },
          grid: {
            display: false
          }
        }
      }
    }
  }, [])

  return (
    <section id="skills" className="skills section py-3" ref={sectionRef}>
      <div className="container">
        <div className="skills-header-row mb-3">
          <div>
            <h2 className="skills-title mb-0">
              <i className="bi bi-bar-chart-line-fill text-primary me-2"></i>
              My Skills
            </h2>
            <small className="text-muted">Technical proficiencies & experience metrics</small>
          </div>

          <div className="skills-view-toggle">
            <button 
              className={`view-btn ${viewMode === 'chart' ? 'active' : ''}`}
              onClick={() => setViewMode('chart')}
              title="Column Chart View"
            >
              <i className="bi bi-bar-chart-fill me-1"></i> Column Chart
            </button>
            <button 
              className={`view-btn ${viewMode === 'grid' ? 'active' : ''}`}
              onClick={() => setViewMode('grid')}
              title="Compact Grid View"
            >
              <i className="bi bi-grid-fill me-1"></i> Compact Grid
            </button>
          </div>
        </div>

        {skills.length === 0 ? (
          <div className="text-center py-4">
            <p className="text-muted mb-0">No skills data yet. Please add skills from the admin panel.</p>
          </div>
        ) : (
          <div className="skills-card shadow-sm">
            {viewMode === 'chart' ? (
              <div className="skills-chart-container">
                <Bar data={chartData} options={chartOptions} />
              </div>
            ) : (
              <div className="skills-grid-wrapper">
                <div className="row g-2">
                  {skills.map((skill, index) => (
                    <div key={skill.id || index} className="col-12 col-md-6 col-lg-4">
                      <div className="skill-mini-card">
                        <div className="d-flex justify-content-between align-items-center mb-1">
                          <div className="d-flex align-items-center gap-2 text-truncate me-2">
                            <i className={`bi ${skill.icon || 'bi-code-slash'} ${skill.iconColor || 'text-primary'}`}></i>
                            <span className="skill-mini-name text-truncate" title={skill.name}>{skill.name}</span>
                          </div>
                          <span className="skill-mini-badge">{skill.value}%</span>
                        </div>
                        <div className="skill-mini-progress">
                          <div 
                            className="skill-mini-bar"
                            style={{ 
                              width: isVisible ? `${skill.value}%` : '0%',
                              backgroundColor: barColors[index % barColors.length]
                            }}
                          />
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}
          </div>
        )}
      </div>
    </section>
  )
}

export default Skills
