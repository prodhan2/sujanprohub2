import { useState, useEffect, useRef } from 'react'
import { collection, addDoc, deleteDoc, doc, onSnapshot, setDoc, serverTimestamp, writeBatch } from 'firebase/firestore'
import { db, storage, ref, uploadBytesResumable, getDownloadURL } from '../firebase'
import { Link, useNavigate } from 'react-router-dom'
import { jsPDF } from 'jspdf'
import { DEFAULT_AI_CONFIG, testAIConnection } from '../services/aiService'
import { DEFAULT_KIRA_CONFIG, testKiraConnection, KIRA_MODELS } from '../services/kiraAiService'
import './AdminPanel.css'

const PREDEFINED_NETWORKS = [
  { name: 'GitHub', image: 'https://img.icons8.com/color/96/github.png' },
  { name: 'Instagram', image: 'https://img.icons8.com/color/96/instagram-new.png' },
  { name: 'Facebook', image: 'https://img.icons8.com/color/96/facebook-new.png' },
  { name: 'Twitter/X', image: 'https://img.icons8.com/color/96/twitterx--v1.png' },
  { name: 'LinkedIn', image: 'https://img.icons8.com/color/96/linkedin.png' },
  { name: 'YouTube', image: 'https://img.icons8.com/color/96/youtube-play.png' },
  { name: 'WhatsApp', image: 'https://img.icons8.com/color/96/whatsapp.png' },
  { name: 'Telegram', image: 'https://img.icons8.com/color/96/telegram-app.png' },
  { name: 'TikTok', image: 'https://img.icons8.com/color/96/tiktok.png' },
  { name: 'Discord', image: 'https://img.icons8.com/color/96/discord-logo.png' },
  { name: 'Dribbble', image: 'https://img.icons8.com/color/96/dribbble.png' },
  { name: 'Behance', image: 'https://img.icons8.com/color/96/behance.png' }
]

function AdminPanel({ activeTab: propActiveTab }) {
  const [activeTab, setActiveTab] = useState(propActiveTab || 'projects')
  const navigate = useNavigate()
  const BEEIMG_API_KEY = '5332df6998fe852f2d004aca09d2830b'

  const [editingItem, setEditingItem] = useState(null)
  const [formData, setFormData] = useState({
    title: '',
    description: '',
    content: '',
    url: '',
    imageUrl: '',
    imageUrls: [],
    category: 'html',
    previewUrl: '',
    githubUrl: '',
    icon: 'bi-card-text',
    iconColor: 'text-primary'
  })
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
  
  const [newEducation, setNewEducation] = useState({
    degree: '',
    major: '',
    institution: '',
    startDate: '',
    endDate: '',
    result: '',
    description: ''
  })
  const [editingEducationIndex, setEditingEducationIndex] = useState(null)
  const [newExperience, setNewExperience] = useState({
    position: '',
    company: '',
    location: '',
    startDate: '',
    endDate: '',
    responsibilities: ''
  })
  const [editingExperienceIndex, setEditingExperienceIndex] = useState(null)
  const [newSkill, setNewSkill] = useState({
    name: '',
    level: 'Intermediate'
  })
  const [editingSkillIndex, setEditingSkillIndex] = useState(null)
  const [newProject, setNewProject] = useState({
    name: '',
    description: '',
    technologies: '',
    url: ''
  })
  const [editingProjectIndex, setEditingProjectIndex] = useState(null)
  const [newCertification, setNewCertification] = useState({
    name: '',
    issuer: '',
    date: '',
    url: ''
  })
  const [editingCertificationIndex, setEditingCertificationIndex] = useState(null)
  const [newLanguage, setNewLanguage] = useState({
    name: '',
    proficiency: 'Fluent'
  })
  const [editingLanguageIndex, setEditingLanguageIndex] = useState(null)
  const [newHobby, setNewHobby] = useState({
    name: ''
  })
  const [editingHobbyIndex, setEditingHobbyIndex] = useState(null)
  const [newReference, setNewReference] = useState({
    name: '',
    position: '',
    company: '',
    email: '',
    phone: ''
  })
  const [editingReferenceIndex, setEditingReferenceIndex] = useState(null)
  // Drag and drop states for CV sections
  const [draggedItemIndex, setDraggedItemIndex] = useState(null)
  const [draggedItemType, setDraggedItemType] = useState(null) // 'education', 'experience', etc.
  const [data, setData] = useState({
    projects: [],
    skills: [],
    posts: [],
    research: [],
    resources: [],
    gallery: [],
    contactMessages: [],
    profileImageUrl: '',
    socialIcons: [],
    bio: '',
    roles: []
  })
  const [newRole, setNewRole] = useState('')
  const [editingRoleId, setEditingRoleId] = useState(null)
  const [editingRoleName, setEditingRoleName] = useState('')
  const [draggedRoleId, setDraggedRoleId] = useState(null)
  const [uploading, setUploading] = useState(false)
  const [uploadProgress, setUploadProgress] = useState(0)
  const [isDragging, setIsDragging] = useState(false)
  const fileInputRef = useRef(null)
  const [uploadQueue, setUploadQueue] = useState([])
  const [aiSettings, setAiSettings] = useState({
    apiKey: DEFAULT_AI_CONFIG.apiKey,
    baseUrl: DEFAULT_AI_CONFIG.baseUrl,
    model: DEFAULT_AI_CONFIG.model,
    botName: DEFAULT_AI_CONFIG.botName,
    systemPrompt: DEFAULT_AI_CONFIG.systemPrompt
  })
  const [aiTesting, setAiTesting] = useState(false)
  const [aiTestResult, setAiTestResult] = useState(null)
  const [showAiApiKey, setShowAiApiKey] = useState(false)
  const [savingAiSettings, setSavingAiSettings] = useState(false)

  // Kira AI (Chat 2) settings
  const [activeAiTab, setActiveAiTab] = useState('kira') // 'kira' or 'prodhan'
  const [kiraSettings, setKiraSettings] = useState({
    apiKey: DEFAULT_KIRA_CONFIG.apiKey,
    baseUrl: DEFAULT_KIRA_CONFIG.baseUrl,
    model: DEFAULT_KIRA_CONFIG.model,
    imageModel: DEFAULT_KIRA_CONFIG.imageModel,
    ttsModel: DEFAULT_KIRA_CONFIG.ttsModel,
    ttsVoice: DEFAULT_KIRA_CONFIG.ttsVoice,
    botName: DEFAULT_KIRA_CONFIG.botName,
    systemPrompt: DEFAULT_KIRA_CONFIG.systemPrompt
  })
  const [kiraTesting, setKiraTesting] = useState(false)
  const [kiraTestResult, setKiraTestResult] = useState(null)
  const [showKiraApiKey, setShowKiraApiKey] = useState(false)
  const [savingKiraSettings, setSavingKiraSettings] = useState(false)

  useEffect(() => {
    if (propActiveTab && propActiveTab !== activeTab) {
      setActiveTab(propActiveTab)
      resetForm()
    }
  }, [propActiveTab])

  useEffect(() => {
    // Listen to CV changes
    const unsubscribeCv = onSnapshot(doc(db, 'portfolio', 'cv'), (snapshot) => {
      if (snapshot.exists()) {
        // Merge with default state to ensure all required properties exist
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

    // Listen to Config changes (API key, bio)
    const unsubscribeConfig = onSnapshot(doc(db, 'portfolio', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.data()
        if (config.beeImageApiKey) {
          setApiKey(config.beeImageApiKey)
        }
        if (config.aiApiKey) {
          setAiSettings(prev => ({
            ...prev,
            apiKey: config.aiApiKey || prev.apiKey,
            baseUrl: config.aiBaseUrl || prev.baseUrl,
            model: config.aiModel || prev.model,
            botName: config.aiBotName || prev.botName,
            systemPrompt: config.aiSystemPrompt !== undefined ? config.aiSystemPrompt : prev.systemPrompt
          }))
        }
        if (config.kiraApiKey || config.kiraModel) {
          setKiraSettings(prev => ({
            ...prev,
            apiKey: config.kiraApiKey || prev.apiKey,
            baseUrl: config.kiraBaseUrl || prev.baseUrl,
            model: config.kiraModel || prev.model,
            imageModel: config.kiraImageModel || prev.imageModel,
            ttsModel: config.kiraTtsModel || prev.ttsModel,
            ttsVoice: config.kiraTtsVoice || prev.ttsVoice,
            botName: config.kiraBotName || prev.botName,
            systemPrompt: config.kiraSystemPrompt !== undefined ? config.kiraSystemPrompt : prev.systemPrompt
          }))
        }
        setData(prev => ({ 
          ...prev, 
          profileImageUrl: config.profileImageUrl || '',
          bio: config.bio || ''
        }))
      }
    })

    // Listen to roleskeyword collection
    const unsubscribeRoles = onSnapshot(collection(db, 'roleskeyword'), (snapshot) => {
      const roles = snapshot.docs.map(doc => ({ id: doc.id, ...doc.data() }))
      setData(prev => ({ ...prev, roles }))
    })

    // Listen to all collections
    const collections = ['projects', 'skills', 'posts', 'research', 'resources', 'gallery', 'contactMessages', 'socialIcons']
    const unsubscribes = [unsubscribeCv, unsubscribeConfig, unsubscribeRoles]

    collections.forEach(col => {
      const unsub = onSnapshot(collection(db, col), (snapshot) => {
        const items = snapshot.docs.map(doc => ({
          id: doc.id,
          ...doc.data()
        }))
        setData(prev => ({ ...prev, [col]: items }))
      })
      unsubscribes.push(unsub)
    })

    return () => unsubscribes.forEach(unsub => unsub())
  }, [])

  const resetForm = () => {
    if (activeTab === 'projects') {
      setFormData({
        title: '',
        description: '',
        category: 'html',
        previewUrl: '',
        githubUrl: '',
        icon: 'bi-card-text',
        iconColor: 'text-primary',
        imageUrl: '',
        imageUrls: []
      })
    } else if (activeTab === 'skills') {
      setFormData({
        name: '',
        value: 50,
        icon: 'bi-card-text',
        iconColor: 'text-primary',
        imageUrl: '',
        imageUrls: []
      })
    } else {
      setFormData({
        title: '',
        description: '',
        url: '',
        imageUrl: '',
        imageUrls: []
      })
    }
    setEditingItem(null)
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    try {
      if (editingItem) {
        await setDoc(doc(db, activeTab, editingItem.id), formData, { merge: true })
        alert('Updated successfully!')
      } else {
        await addDoc(collection(db, activeTab), formData)
        alert('Added successfully!')
      }
      resetForm()
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleEdit = (item) => {
    setEditingItem(item)
    setFormData(item)
  }

  const handleDelete = async (id) => {
    if (window.confirm('Are you sure?')) {
      try {
        await deleteDoc(doc(db, activeTab, id))
        alert('Deleted successfully!')
      } catch (error) {
        alert('Error: ' + error.message)
      }
    }
  }

  const handleSaveApiKey = async () => {
    try {
      await setDoc(doc(db, 'portfolio', 'config'), {
        beeImageApiKey: apiKey
      }, { merge: true })
      alert('API key saved!')
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleSaveAiSettings = async (e) => {
    e?.preventDefault?.()
    setSavingAiSettings(true)
    try {
      await setDoc(doc(db, 'portfolio', 'config'), {
        aiApiKey: aiSettings.apiKey.trim(),
        aiBaseUrl: aiSettings.baseUrl.trim(),
        aiModel: aiSettings.model.trim(),
        aiBotName: aiSettings.botName.trim(),
        aiSystemPrompt: aiSettings.systemPrompt.trim()
      }, { merge: true })
      alert('AI settings saved successfully to Firestore!')
    } catch (error) {
      alert('Error saving AI settings: ' + error.message)
    } finally {
      setSavingAiSettings(false)
    }
  }

  const handleTestAiConnection = async () => {
    setAiTesting(true)
    setAiTestResult(null)
    try {
      const res = await testAIConnection({
        apiKey: aiSettings.apiKey.trim(),
        baseUrl: aiSettings.baseUrl.trim(),
        model: aiSettings.model.trim()
      })
      setAiTestResult(res)
    } catch (err) {
      setAiTestResult({ success: false, error: err.message })
    } finally {
      setAiTesting(false)
    }
  }

  const handleSaveKiraSettings = async (e) => {
    e?.preventDefault?.()
    setSavingKiraSettings(true)
    try {
      await setDoc(doc(db, 'portfolio', 'config'), {
        kiraApiKey: kiraSettings.apiKey.trim(),
        kiraBaseUrl: kiraSettings.baseUrl.trim(),
        kiraModel: kiraSettings.model.trim(),
        kiraImageModel: kiraSettings.imageModel.trim(),
        kiraTtsModel: kiraSettings.ttsModel.trim(),
        kiraTtsVoice: kiraSettings.ttsVoice.trim(),
        kiraBotName: kiraSettings.botName.trim(),
        kiraSystemPrompt: kiraSettings.systemPrompt.trim()
      }, { merge: true })
      alert('Kira AI (Chat 2) settings saved successfully to Firestore!')
    } catch (error) {
      alert('Error saving Kira AI settings: ' + error.message)
    } finally {
      setSavingKiraSettings(false)
    }
  }

  const handleTestKiraConnection = async () => {
    setKiraTesting(true)
    setKiraTestResult(null)
    try {
      const res = await testKiraConnection({
        apiKey: kiraSettings.apiKey.trim(),
        baseUrl: kiraSettings.baseUrl.trim(),
        model: kiraSettings.model.trim()
      })
      setKiraTestResult(res)
    } catch (err) {
      setKiraTestResult({ success: false, error: err.message })
    } finally {
      setKiraTesting(false)
    }
  }

  const handleAddEducation = () => {
    if (editingEducationIndex !== null) {
      // Update existing education
      const updatedEducation = [...cvData.education]
      updatedEducation[editingEducationIndex] = newEducation
      setCvData({
        ...cvData,
        education: updatedEducation
      })
      setEditingEducationIndex(null)
    } else {
      // Add new education
      setCvData({
        ...cvData,
        education: [...cvData.education, newEducation]
      })
    }
    setNewEducation({ degree: '', major: '', institution: '', startDate: '', endDate: '', result: '', description: '' })
  }

  const handleEditEducation = (index) => {
    setEditingEducationIndex(index)
    setNewEducation(cvData.education[index])
  }

  const handleRemoveEducation = (index) => {
    setCvData({
      ...cvData,
      education: cvData.education.filter((_, i) => i !== index)
    })
  }

  const handleAddExperience = () => {
    if (editingExperienceIndex !== null) {
      // Update existing experience
      const updatedExperience = [...cvData.experience]
      updatedExperience[editingExperienceIndex] = newExperience
      setCvData({
        ...cvData,
        experience: updatedExperience
      })
      setEditingExperienceIndex(null)
    } else {
      // Add new experience
      setCvData({
        ...cvData,
        experience: [...cvData.experience, newExperience]
      })
    }
    setNewExperience({ position: '', company: '', location: '', startDate: '', endDate: '', responsibilities: '' })
  }

  const handleEditExperience = (index) => {
    setEditingExperienceIndex(index)
    setNewExperience(cvData.experience[index])
  }

  const handleRemoveExperience = (index) => {
    setCvData({
      ...cvData,
      experience: cvData.experience.filter((_, i) => i !== index)
    })
  }
  const handleAddSkill = () => {
    if (editingSkillIndex !== null) {
      const updatedSkills = [...cvData.skills]
      updatedSkills[editingSkillIndex] = newSkill
      setCvData({ ...cvData, skills: updatedSkills })
      setEditingSkillIndex(null)
    } else {
      setCvData({ ...cvData, skills: [...cvData.skills, newSkill] })
    }
    setNewSkill({ name: '', level: 'Intermediate' })
  }

  const handleEditSkill = (index) => {
    setEditingSkillIndex(index)
    setNewSkill(cvData.skills[index])
  }

  const handleRemoveSkill = (index) => {
    setCvData({ ...cvData, skills: cvData.skills.filter((_, i) => i !== index) })
  }

  const handleAddProject = () => {
    if (editingProjectIndex !== null) {
      const updatedProjects = [...cvData.projects]
      updatedProjects[editingProjectIndex] = newProject
      setCvData({ ...cvData, projects: updatedProjects })
      setEditingProjectIndex(null)
    } else {
      setCvData({ ...cvData, projects: [...cvData.projects, newProject] })
    }
    setNewProject({ name: '', description: '', technologies: '', url: '' })
  }

  const handleEditProject = (index) => {
    setEditingProjectIndex(index)
    setNewProject(cvData.projects[index])
  }

  const handleRemoveProject = (index) => {
    setCvData({ ...cvData, projects: cvData.projects.filter((_, i) => i !== index) })
  }

  const handleAddCertification = () => {
    if (editingCertificationIndex !== null) {
      const updatedCertifications = [...cvData.certifications]
      updatedCertifications[editingCertificationIndex] = newCertification
      setCvData({ ...cvData, certifications: updatedCertifications })
      setEditingCertificationIndex(null)
    } else {
      setCvData({ ...cvData, certifications: [...cvData.certifications, newCertification] })
    }
    setNewCertification({ name: '', issuer: '', date: '', url: '' })
  }

  const handleEditCertification = (index) => {
    setEditingCertificationIndex(index)
    setNewCertification(cvData.certifications[index])
  }

  const handleRemoveCertification = (index) => {
    setCvData({ ...cvData, certifications: cvData.certifications.filter((_, i) => i !== index) })
  }

  const handleAddLanguage = () => {
    if (editingLanguageIndex !== null) {
      const updatedLanguages = [...cvData.languages]
      updatedLanguages[editingLanguageIndex] = newLanguage
      setCvData({ ...cvData, languages: updatedLanguages })
      setEditingLanguageIndex(null)
    } else {
      setCvData({ ...cvData, languages: [...cvData.languages, newLanguage] })
    }
    setNewLanguage({ name: '', proficiency: 'Fluent' })
  }

  const handleEditLanguage = (index) => {
    setEditingLanguageIndex(index)
    setNewLanguage(cvData.languages[index])
  }

  const handleRemoveLanguage = (index) => {
    setCvData({ ...cvData, languages: cvData.languages.filter((_, i) => i !== index) })
  }

  const handleAddHobby = () => {
    if (editingHobbyIndex !== null) {
      const updatedHobbies = [...cvData.hobbies]
      updatedHobbies[editingHobbyIndex] = newHobby
      setCvData({ ...cvData, hobbies: updatedHobbies })
      setEditingHobbyIndex(null)
    } else {
      setCvData({ ...cvData, hobbies: [...cvData.hobbies, newHobby] })
    }
    setNewHobby({ name: '' })
  }

  const handleEditHobby = (index) => {
    setEditingHobbyIndex(index)
    setNewHobby(cvData.hobbies[index])
  }

  const handleRemoveHobby = (index) => {
    setCvData({ ...cvData, hobbies: cvData.hobbies.filter((_, i) => i !== index) })
  }

  const handleAddReference = () => {
    if (editingReferenceIndex !== null) {
      const updatedReferences = [...cvData.references]
      updatedReferences[editingReferenceIndex] = newReference
      setCvData({ ...cvData, references: updatedReferences })
      setEditingReferenceIndex(null)
    } else {
      setCvData({ ...cvData, references: [...cvData.references, newReference] })
    }
    setNewReference({ name: '', position: '', company: '', email: '', phone: '' })
  }

  const handleEditReference = (index) => {
    setEditingReferenceIndex(index)
    setNewReference(cvData.references[index])
  }

  const handleRemoveReference = (index) => {
    setCvData({
      ...cvData,
      references: cvData.references.filter((_, i) => i !== index)
    })
  }

  // Drag and drop handlers for CV
  const handleCvDragStart = (index, type) => {
    setDraggedItemIndex(index)
    setDraggedItemType(type)
  }

  const handleCvDragOver = (e) => {
    e.preventDefault()
  }

  const handleCvDrop = (targetIndex, type) => {
    if (draggedItemIndex === null || draggedItemType !== type || draggedItemIndex === targetIndex) {
      setDraggedItemIndex(null)
      setDraggedItemType(null)
      return
    }

    // Reorder the array
    const arrayKey = type === 'education' ? 'education' :
                     type === 'experience' ? 'experience' :
                     type === 'skill' ? 'skills' :
                     type === 'project' ? 'projects' :
                     type === 'certification' ? 'certifications' :
                     type === 'language' ? 'languages' :
                     type === 'hobby' ? 'hobbies' :
                     type === 'reference' ? 'references' : null

    if (!arrayKey) return

    const newArray = [...cvData[arrayKey]]
    const removedItem = newArray.splice(draggedItemIndex, 1)[0]
    newArray.splice(targetIndex, 0, removedItem)

    setCvData({
      ...cvData,
      [arrayKey]: newArray
    })

    setDraggedItemIndex(null)
    setDraggedItemType(null)
  }

  // Helper function to auto-resize text to fit width
  const fitTextToWidth = (doc, text, maxWidth, startSize = 20, minSize = 8) => {
    let fontSize = startSize
    doc.setFontSize(fontSize)
    while (fontSize > minSize && doc.getTextWidth(text) > maxWidth) {
      fontSize -= 1
      doc.setFontSize(fontSize)
    }
    return fontSize
  }

  // Helper function to clean text
  const cleanText = (text) => {
    if (!text) return ''
    return text.toString().replace(/[^\x20-\x7E]/g, '').trim()
  }

  const generatePDF = async () => {
    const doc = new jsPDF({ unit: 'mm', format: 'a4' })
    const pageWidth = doc.internal.pageSize.getWidth()
    const pageHeight = doc.internal.pageSize.getHeight()
    const leftColWidth = 70
    const rightColX = leftColWidth + 10

    // Left Sidebar - Use a modern blue instead of gray
    doc.setFillColor(25, 118, 210)
    doc.rect(0, 0, leftColWidth, pageHeight, 'F')

    // Accent line at bottom of sidebar
    doc.setFillColor(30, 136, 229)
    doc.rect(0, pageHeight - 20, leftColWidth, 20, 'F')

    // Profile Photo
    if (cvData.personalInfo.photoUrl) {
      try {
        const imgResponse = await fetch(cvData.personalInfo.photoUrl)
        const imgBlob = await imgResponse.blob()
        const imgDataUrl = await new Promise((resolve, reject) => {
          const reader = new FileReader()
          reader.onloadend = () => resolve(reader.result)
          reader.onerror = reject
          reader.readAsDataURL(imgBlob)
        })
        // Photo with white border
        doc.setFillColor(255, 255, 255)
        doc.ellipse(35, 40, 26, 26, 'F')
        doc.addImage(imgDataUrl, 'JPEG', 10, 15, 50, 50)
      } catch (e) {
        console.error('Error adding photo to PDF:', e)
        doc.setDrawColor(255, 255, 255)
        doc.setFillColor(255, 255, 255)
        doc.setLineWidth(2)
        doc.ellipse(35, 40, 25, 25, 'FD')
      }
    } else {
      doc.setDrawColor(255, 255, 255)
      doc.setFillColor(255, 255, 255)
      doc.setLineWidth(2)
      doc.ellipse(35, 40, 25, 25, 'FD')
    }

    // Name with auto-resize
    doc.setTextColor(255, 255, 255)
    doc.setFont('helvetica', 'bold')
    const name = cleanText(cvData.personalInfo.name) || 'Your Name'
    const nameFontSize = fitTextToWidth(doc, name, leftColWidth - 20, 20, 12)
    doc.text(name, leftColWidth / 2, 80, { align: 'center' })

    // Job Title (Bio) with auto-resize
    doc.setFont('helvetica', 'normal')
    doc.setTextColor(220, 235, 255)
    const jobTitle = cleanText(cvData.personalInfo.bio) || 'Your Title'
    const bioFontSize = fitTextToWidth(doc, jobTitle, leftColWidth - 20, 14, 10)
    doc.text(jobTitle, leftColWidth / 2, 88, { align: 'center' })

    let leftY = 110

    // Contact Section
    doc.setTextColor(255, 255, 255)
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('CONTACT', 15, leftY)
    leftY += 3
    doc.setDrawColor(255, 255, 255)
    doc.setLineWidth(0.5)
    doc.line(15, leftY, leftColWidth - 5, leftY)
    leftY += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    
    // Phone
    if (cvData.personalInfo.phone) {
      const cleanPhone = cleanText(cvData.personalInfo.phone)
      doc.text(cleanPhone, 15, leftY)
      leftY += 7
    }
    // Email
    if (cvData.personalInfo.email) {
      const cleanEmail = cleanText(cvData.personalInfo.email)
      const emailFontSize = fitTextToWidth(doc, cleanEmail, leftColWidth - 25, 10, 7)
      doc.text(cleanEmail, 15, leftY)
      leftY += 7
    }
    // Address
    if (cvData.personalInfo.address) {
      const cleanAddr = cleanText(cvData.personalInfo.address)
      const addrLines = doc.splitTextToSize(cleanAddr, leftColWidth - 20)
      doc.text(addrLines, 15, leftY)
      leftY += addrLines.length * 7
    }

    // Skills Section
    leftY += 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('SKILLS', 15, leftY)
    leftY += 3
    doc.line(15, leftY, leftColWidth - 5, leftY)
    leftY += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (cvData.skills && cvData.skills.length > 0) {
      cvData.skills.forEach(skill => {
        const cleanSkill = cleanText(skill.name)
        doc.text(`• ${cleanSkill}`, 15, leftY)
        leftY += 7
      })
    }

    // Languages Section
    leftY += 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('LANGUAGES', 15, leftY)
    leftY += 3
    doc.line(15, leftY, leftColWidth - 5, leftY)
    leftY += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (cvData.languages && cvData.languages.length > 0) {
      cvData.languages.forEach(lang => {
        const langName = cleanText(lang.name)
        const langProf = cleanText(lang.proficiency)
        const langText = `• ${langName}: ${langProf}`
        doc.text(langText, 15, leftY)
        leftY += 7
      })
    }

    // Hobbies Section
    leftY += 10
    doc.setFontSize(14)
    doc.setFont('helvetica', 'bold')
    doc.text('HOBBIES', 15, leftY)
    leftY += 3
    doc.line(15, leftY, leftColWidth - 5, leftY)
    leftY += 8

    doc.setFontSize(10)
    doc.setFont('helvetica', 'normal')
    if (cvData.hobbies && cvData.hobbies.length > 0) {
      cvData.hobbies.forEach(hobby => {
        const cleanHobby = cleanText(hobby.name)
        doc.text(`• ${cleanHobby}`, 15, leftY)
        leftY += 7
      })
    }

    // Right Column Content
    let rightY = 20

    // Profile/Summary
    doc.setTextColor(25, 118, 210)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('PROFILE', rightColX, rightY)
    rightY += 3
    doc.setDrawColor(25, 118, 210)
    doc.setLineWidth(1)
    doc.line(rightColX, rightY, pageWidth - 15, rightY)
    rightY += 10

    doc.setTextColor(50, 50, 50)
    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    if (cvData.personalInfo.summary) {
      const cleanSummary = cleanText(cvData.personalInfo.summary)
      const summaryLines = doc.splitTextToSize(cleanSummary, pageWidth - rightColX - 10)
      doc.text(summaryLines, rightColX, rightY)
      rightY += summaryLines.length * 7 + 10
    }

    // Work Experience
    rightY += 5
    doc.setTextColor(25, 118, 210)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('WORK EXPERIENCE', rightColX, rightY)
    rightY += 3
    doc.line(rightColX, rightY, pageWidth - 15, rightY)
    rightY += 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    if (cvData.experience && cvData.experience.length > 0) {
      cvData.experience.forEach(exp => {
        // Position with auto-resize
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(33, 33, 33)
        const cleanPosition = cleanText(exp.position) || ''
        const posFontSize = fitTextToWidth(doc, cleanPosition, pageWidth - rightColX - 50, 14, 10)
        doc.text(cleanPosition, rightColX, rightY)
        rightY += 6

        // Date and Location
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        let dateText = ''
        if (exp.startDate) {
          dateText += cleanText(exp.startDate)
          if (exp.endDate) {
            dateText += ` - ${cleanText(exp.endDate)}`
          } else {
            dateText += ' - Present'
          }
        }
        if (exp.company) {
          const cleanCompany = cleanText(exp.company)
          doc.setFontSize(11)
          doc.text(cleanCompany, rightColX, rightY)
          if (dateText) {
            doc.setFontSize(10)
            doc.text(dateText, pageWidth - 15, rightY, { align: 'right' })
          }
          rightY += 6
          if (exp.location) {
            const cleanLocation = cleanText(exp.location)
            doc.text(cleanLocation, rightColX, rightY)
            rightY += 6
          }
        }

        // Responsibilities
        doc.setTextColor(66, 66, 66)
        doc.setFontSize(10)
        if (exp.responsibilities) {
          const cleanResp = cleanText(exp.responsibilities)
          const respLines = doc.splitTextToSize(cleanResp, pageWidth - rightColX - 10)
          doc.text(respLines, rightColX, rightY)
          rightY += respLines.length * 6 + 5
        } else {
          rightY += 5
        }

        rightY += 8
      })
    }

    // Education
    rightY += 5
    doc.setTextColor(25, 118, 210)
    doc.setFontSize(18)
    doc.setFont('helvetica', 'bold')
    doc.text('EDUCATION', rightColX, rightY)
    rightY += 3
    doc.line(rightColX, rightY, pageWidth - 15, rightY)
    rightY += 10

    doc.setFontSize(11)
    doc.setFont('helvetica', 'normal')
    if (cvData.education && cvData.education.length > 0) {
      cvData.education.forEach(edu => {
        // Degree and Major
        doc.setFont('helvetica', 'bold')
        doc.setTextColor(33, 33, 33)
        let degreeText = ''
        if (edu.degree) {
          degreeText = cleanText(edu.degree)
          if (edu.major) {
            degreeText += ` in ${cleanText(edu.major)}`
          }
        }
        const degreeFontSize = fitTextToWidth(doc, degreeText, pageWidth - rightColX - 50, 14, 10)
        doc.text(degreeText, rightColX, rightY)
        rightY += 6

        // Date and Institution
        doc.setFont('helvetica', 'normal')
        doc.setTextColor(100, 100, 100)
        let eduDateText = ''
        if (edu.startDate) {
          eduDateText += cleanText(edu.startDate)
          if (edu.endDate) {
            eduDateText += ` - ${cleanText(edu.endDate)}`
          }
        }
        if (edu.institution) {
          const cleanInstitution = cleanText(edu.institution)
          doc.setFontSize(11)
          doc.text(cleanInstitution, rightColX, rightY)
          if (eduDateText) {
            doc.setFontSize(10)
            doc.text(eduDateText, pageWidth - 15, rightY, { align: 'right' })
          }
          rightY += 6
        }

        // Result and Description
        doc.setTextColor(66, 66, 66)
        doc.setFontSize(10)
        if (edu.result) {
          const cleanResult = cleanText(edu.result)
          doc.text(`Result: ${cleanResult}`, rightColX, rightY)
          rightY += 6
        }
        if (edu.description) {
          const cleanDesc = cleanText(edu.description)
          const descLines = doc.splitTextToSize(cleanDesc, pageWidth - rightColX - 10)
          doc.text(descLines, rightColX, rightY)
          rightY += descLines.length * 6 + 5
        } else {
          rightY += 5
        }

        rightY += 8
      })
    }

    // Open the PDF in a new tab for preview
    const pdfBlob = doc.output('blob')
    const pdfUrl = URL.createObjectURL(pdfBlob)
    window.open(pdfUrl, '_blank')
  }

  const handleSaveCv = async () => {
    try {
      await setDoc(doc(db, 'portfolio', 'cv'), cvData)
      alert('CV saved!')
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  // Auto-save CV data with debounce
  useEffect(() => {
    const timer = setTimeout(async () => {
      try {
        // Only auto-save if we have actual data (not initial empty state)
        if (cvData.personalInfo.name || cvData.education.length > 0 || cvData.experience.length > 0) {
          await setDoc(doc(db, 'portfolio', 'cv'), cvData)
          console.log('CV auto-saved successfully')
        }
      } catch (error) {
        console.error('Error auto-saving CV:', error)
      }
    }, 500) // Wait 500ms after last change before saving

    return () => clearTimeout(timer) // Cleanup the timer on unmount or when cvData changes again
  }, [cvData])
  
  const handleAddRole = async () => {
    if (!newRole.trim()) return
    try {
      await addDoc(collection(db, 'roleskeyword'), { 
        name: newRole.trim(), 
        createdAt: serverTimestamp(),
        order: data.roles.length
      })
      setNewRole('')
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }
  
  const handleEditRole = (role) => {
    setEditingRoleId(role.id)
    setEditingRoleName(role.name)
  }

  const handleSaveEditRole = async () => {
    if (!editingRoleName.trim() || !editingRoleId) return
    try {
      await setDoc(doc(db, 'roleskeyword', editingRoleId), { name: editingRoleName.trim() }, { merge: true })
      setEditingRoleId(null)
      setEditingRoleName('')
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleDragStart = (role) => {
    setDraggedRoleId(role.id)
  }

  const handleDragOver = (e) => {
    e.preventDefault()
  }

  const handleDrop = async (targetRole) => {
    if (!draggedRoleId || draggedRoleId === targetRole.id) {
      setDraggedRoleId(null)
      return
    }
    
    const sortedRoles = [...data.roles].sort((a, b) => (a.order ?? 0) - (b.order ?? 0))
    const draggedIndex = sortedRoles.findIndex(r => r.id === draggedRoleId)
    const targetIndex = sortedRoles.findIndex(r => r.id === targetRole.id)
    
    // Reorder the array
    const newRoles = [...sortedRoles]
    const removed = newRoles.splice(draggedIndex, 1)[0]
    newRoles.splice(targetIndex, 0, removed)
    
    // Update Firestore with new orders
    try {
      const batch = writeBatch(db)
      newRoles.forEach((role, index) => {
        batch.set(doc(db, 'roleskeyword', role.id), { order: index }, { merge: true })
      })
      await batch.commit()
      setDraggedRoleId(null)
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const handleRemoveRole = async (roleId) => {
    try {
      await deleteDoc(doc(db, 'roleskeyword', roleId))
    } catch (error) {
      alert('Error: ' + error.message)
    }
  }

  const formatFileSize = (bytes) => {
    if (bytes === 0) return '0 Bytes'
    const k = 1024
    const sizes = ['Bytes', 'KB', 'MB', 'GB']
    const i = Math.floor(Math.log(bytes) / Math.log(k))
    return Math.round(bytes / Math.pow(k, i) * 100) / 100 + ' ' + sizes[i]
  }

  const convertToWebP = (file) => {
    return new Promise((resolve, reject) => {
      // Skip conversion if already WebP
      if (file.type === 'image/webp') {
        // Still need to check if resizing is needed
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const maxDimension = 1920
            if (img.width <= maxDimension && img.height <= maxDimension) {
              // No resize needed, return as-is
              resolve(file)
            } else {
              // Resize needed
              const canvas = document.createElement('canvas')
              let width = img.width
              let height = img.height
              
              if (width > maxDimension || height > maxDimension) {
                if (width > height) {
                  height = (height / width) * maxDimension
                  width = maxDimension
                } else {
                  width = (width / height) * maxDimension
                  height = maxDimension
                }
              }
              
              canvas.width = width
              canvas.height = height
              const ctx = canvas.getContext('2d')
              ctx.drawImage(img, 0, 0, width, height)
              
              canvas.toBlob((blob) => {
                if (blob) {
                  resolve(new File([blob], file.name, { type: 'image/webp' }))
                } else {
                  reject(new Error('Failed to resize WebP'))
                }
              }, 'image/webp', 0.8)
            }
          }
          img.onerror = reject
          img.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      } else {
        // Convert non-WebP to WebP
        const reader = new FileReader()
        reader.onload = (e) => {
          const img = new Image()
          img.onload = () => {
            const canvas = document.createElement('canvas')
            
            // Resize if image is too large (max 1920px width/height)
            const maxDimension = 1920
            let width = img.width
            let height = img.height
            
            if (width > maxDimension || height > maxDimension) {
              if (width > height) {
                height = (height / width) * maxDimension
                width = maxDimension
              } else {
                width = (width / height) * maxDimension
                height = maxDimension
              }
            }
            
            canvas.width = width
            canvas.height = height
            const ctx = canvas.getContext('2d')
            ctx.drawImage(img, 0, 0, width, height)
            
            // Use lower quality (0.6) for better compression
            canvas.toBlob((blob) => {
              if (blob) {
                resolve(new File([blob], file.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' }))
              } else {
                reject(new Error('Failed to convert to WebP'))
              }
            }, 'image/webp', 0.6)
          }
          img.onerror = reject
          img.src = e.target.result
        }
        reader.onerror = reject
        reader.readAsDataURL(file)
      }
    })
  }


  const uploadToBeeImage = async (file, itemId) => {
    return new Promise((resolve, reject) => {
      // Update progress to 10%
      setUploadQueue(prev => prev.map(q => 
        q.id === itemId ? { ...q, progress: 10 } : q
      ))

      const formData = new FormData()
      formData.append('file', file)
      formData.append('apikey', BEEIMG_API_KEY)

      console.log('Uploading to beeimg.com...')

      fetch('https://beeimg.com/api/upload/file/json/', {
        method: 'POST',
        body: formData
      })
      .then(async (response) => {
        console.log('Beeimg response status:', response.status)
        setUploadQueue(prev => prev.map(q => 
          q.id === itemId ? { ...q, progress: 50 } : q
        ))

        const text = await response.text()
        console.log('Beeimg raw response:', text)
        
        let data
        try {
          data = JSON.parse(text)
        } catch (e) {
          console.error('Failed to parse beeimg JSON:', e)
          throw new Error('Invalid response from beeimg')
        }

        console.log('Beeimg parsed data:', data)

        if (data.files && data.files.code === "200" && data.files.url) {
          setUploadQueue(prev => prev.map(q => 
            q.id === itemId ? { ...q, progress: 100 } : q
          ))
          resolve(data.files.url)
        } else {
          throw new Error(data.files?.status || 'Beeimg upload failed')
        }
      })
      .catch(error => {
        console.error('Beeimg upload error:', error)
        // Fallback to Firebase Storage
        uploadToFirebaseStorage(file, itemId).then(resolve).catch(reject)
      })
    })
  }

  const uploadToFirebaseStorage = (file, itemId) => {
    return new Promise((resolve, reject) => {
      const storageRef = ref(storage, `uploads/${Date.now()}_${file.name}`)
      const uploadTask = uploadBytesResumable(storageRef, file)

      uploadTask.on(
        'state_changed',
        (snapshot) => {
          const progress = Math.min((snapshot.bytesTransferred / snapshot.totalBytes) * 100, 100)
          setUploadQueue(prev => prev.map(q => 
            q.id === itemId ? { ...q, progress: Math.round(progress) } : q
          ))
        },
        (error) => {
          console.error('Firebase Storage upload error:', error)
          reject(error)
        },
        () => {
          getDownloadURL(uploadTask.snapshot.ref)
            .then((downloadURL) => {
              setUploadQueue(prev => prev.map(q => 
                q.id === itemId ? { ...q, progress: 100 } : q
              ))
              resolve(downloadURL)
            })
            .catch(reject)
        }
      )
    })
  }

  const handleImageUpload = async (files, forForm = true) => {
    console.log('handleImageUpload called', { files, forForm, activeTab })
    const imageFiles = Array.from(files).filter(file => file.type.startsWith('image/'))
    console.log('Filtered image files:', imageFiles)
    if (imageFiles.length === 0) {
      alert('Please select valid images!')
      return
    }

    // Create initial upload queue
    const initialQueue = imageFiles.map(file => ({
      file,
      id: Math.random().toString(36).substr(2, 9),
      preview: URL.createObjectURL(file),
      progress: 0,
      status: 'pending',
      url: null,
      originalSize: file.size,
      compressedSize: null
    }))
    setUploadQueue(initialQueue)
    setUploading(true)

    try {
      // Upload all files in parallel
      const uploadPromises = initialQueue.map(async (item, index) => {
        console.log(`Processing item ${index + 1}/${initialQueue.length}:`, item)
        
        // Update status to uploading
        setUploadQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, status: 'uploading' } : q
        ))

        // Convert to WebP first
        console.log('Converting to WebP...')
        const webpFile = await convertToWebP(item.file)
        console.log('Starting upload...')
        
        // Update with compressed size
        setUploadQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, compressedSize: webpFile.size } : q
        ))
        
        const imageUrl = await uploadToBeeImage(webpFile, item.id)
        console.log('Got image URL:', imageUrl)
        
        setUploadQueue(prev => prev.map(q => 
          q.id === item.id ? { ...q, progress: 100, status: 'complete', url: imageUrl } : q
        ))

        return imageUrl
      })

      const uploadedUrls = await Promise.all(uploadPromises)
      console.log('All uploaded URLs:', uploadedUrls)
      
      // Save to form data based on active tab
      if (forForm) {
        if (activeTab === 'posts') {
          // For posts, save all images as array
          console.log('Setting form data imageUrls array:', uploadedUrls)
          setFormData(prev => ({ 
            ...prev, 
            imageUrls: uploadedUrls,
            imageUrl: uploadedUrls[0] || '' // Keep first image as main imageUrl for backward compatibility
          }))
        } else {
          // For other tabs, only save first image
          console.log('Setting form data imageUrl (first image):', uploadedUrls[0])
          setFormData(prev => ({ ...prev, imageUrl: uploadedUrls[0] || '' }))
        }
      } else {
        // Save to Firestore gallery collection
        console.log('Saving to Firestore gallery collection...')
        for (const url of uploadedUrls) {
          await addDoc(collection(db, 'gallery'), {
            url: url,
            createdAt: serverTimestamp()
          })
        }
        alert('All images uploaded!')
      }
    } catch (error) {
      console.error('Error in handleImageUpload:', error)
      setUploadQueue(prev => prev.map(q => 
        q.status === 'uploading' ? { ...q, status: 'error' } : q
      ))
      alert('Upload error: ' + error.message)
    } finally {
      setUploading(false)
      // Clear upload queue after 3 seconds
      setTimeout(() => {
        setUploadQueue([])
      }, 3000)
    }
  }

  const handleGalleryDrop = async (e) => {
    e.preventDefault()
    setIsDragging(false)
    let files
    if (e.dataTransfer && e.dataTransfer.files) {
      // Drag and drop
      files = Array.from(e.dataTransfer.files)
    } else if (e.target && e.target.files) {
      // Regular file input
      files = Array.from(e.target.files)
      // Clear the file input
      if (fileInputRef.current) {
        fileInputRef.current.value = ''
      }
    }
    if (files) {
      handleImageUpload(files, false)
    }
  }

  const categories = [
    { id: 'html', label: 'HTML/CSS/JS' },
    { id: 'flutter', label: 'Flutter' },
    { id: 'react', label: 'React' },
    { id: 'laravel', label: 'Laravel' },
    { id: 'django', label: 'Django' }
  ]

  const iconColors = [
    { id: 'text-primary', label: 'Primary (Blue)' },
    { id: 'text-success', label: 'Success (Green)' },
    { id: 'text-danger', label: 'Danger (Red)' },
    { id: 'text-info', label: 'Info (Cyan)' }
  ]

  const icons = [
    'bi-card-text', 'bi-laptop', 'bi-heart-pulse', 'bi-book',
    'bi-phone', 'bi-airplane-engines', 'bi-mosque', 'bi-house-door',
    'bi-globe', 'bi-speedometer2', 'bi-pencil-square', 'bi-list-check',
    'bi-box-seam', 'bi-mortarboard', 'bi-camera-video', 'bi-palette',
    'bi-filetype-html', 'bi-filetype-css', 'bi-filetype-js',
    'bi-filetype-php', 'bi-layers', 'bi-react', 'bi-atom',
    'bi-filetype-py', 'bi-figma', 'bi-adobe'
  ]

  return (
    <div className="admin-panel">
      <div className="appbar bg-primary text-white py-3 px-4 mb-4 shadow-lg">
        <div className="container">
          <h1 className="h3 mb-0">Admin Panel</h1>
        </div>
      </div>
      
      <div className="container py-4">
        <ul className="nav nav-tabs mb-4" id="adminTabs" role="tablist">
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/projects"
            className={`nav-link ${activeTab === 'projects' ? 'active' : ''}`} 
          >
            Projects
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/skills"
            className={`nav-link ${activeTab === 'skills' ? 'active' : ''}`} 
          >
            Skills
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/posts"
            className={`nav-link ${activeTab === 'posts' ? 'active' : ''}`} 
          >
            Posts
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/research"
            className={`nav-link ${activeTab === 'research' ? 'active' : ''}`} 
          >
            Research
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/resources"
            className={`nav-link ${activeTab === 'resources' ? 'active' : ''}`} 
          >
            Resources
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/gallery"
            className={`nav-link ${activeTab === 'gallery' ? 'active' : ''}`} 
          >
            Image Gallery
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/messages"
            className={`nav-link ${activeTab === 'contactMessages' ? 'active' : ''}`} 
          >
            Contact Messages
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/cv"
            className={`nav-link ${activeTab === 'cv' ? 'active' : ''}`} 
          >
            CV
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/social-icons"
            className={`nav-link ${activeTab === 'socialIcons' ? 'active' : ''}`} 
          >
            Social Icons
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/profile"
            className={`nav-link ${activeTab === 'profile' ? 'active' : ''}`} 
          >
            Profile Settings
          </Link>
        </li>
        <li className="nav-item" role="presentation">
          <Link 
            to="/admin/ai-settings"
            className={`nav-link ${activeTab === 'aiSettings' ? 'active' : ''}`} 
          >
            <i className="bi bi-robot me-1"></i> AI Settings
          </Link>
        </li>
      </ul>

      {activeTab === 'contactMessages' ? (
        <div className="card">
          <div className="card-body">
            <h2 className="h4 mb-4">Contact Messages</h2>

            {data.contactMessages.length === 0 ? (
              <p className="text-center text-muted py-5">No messages yet</p>
            ) : (
              <div className="accordion" id="messagesAccordion">
                {data.contactMessages.sort((a, b) => (b.timestamp?.seconds || 0) - (a.timestamp?.seconds || 0)).map((msg, index) => (
                  <div key={msg.id} className="accordion-item">
                    <h2 className="accordion-header" id={`heading${index}`}>
                      <button
                        className="accordion-button collapsed"
                        type="button"
                        data-bs-toggle="collapse"
                        data-bs-target={`#collapse${index}`}
                        aria-expanded="false"
                        aria-controls={`collapse${index}`}
                      >
                        <div className="d-flex justify-content-between align-items-center w-100 pe-3">
                          <div>
                            <strong>{msg.name}</strong>
                            <span className="ms-3 text-muted">{msg.email}</span>
                          </div>
                          <div>
                            <span className="badge bg-secondary me-2">
                              {msg.timestamp ? new Date(msg.timestamp.seconds * 1000).toLocaleString() : 'No date'}
                            </span>
                            {!msg.read && (
                              <span className="badge bg-primary">New</span>
                            )}
                          </div>
                        </div>
                      </button>
                    </h2>
                    <div
                      id={`collapse${index}`}
                      className="accordion-collapse collapse"
                      aria-labelledby={`heading${index}`}
                      data-bs-parent="#messagesAccordion"
                    >
                      <div className="accordion-body">
                        <h5 className="mb-3">{msg.subject}</h5>
                        <p className="mb-4">{msg.message}</p>
                        <div className="d-flex gap-2">
                          <button
                            className="btn btn-sm btn-primary"
                            onClick={async () => {
                              try {
                                await setDoc(doc(db, 'contactMessages', msg.id), { read: !msg.read }, { merge: true })
                              } catch (error) {
                                alert('Error updating message: ' + error.message)
                              }
                            }}
                          >
                            {msg.read ? 'Mark as Unread' : 'Mark as Read'}
                          </button>
                          <button
                            className="btn btn-sm btn-danger"
                            onClick={async () => {
                              if (window.confirm('Are you sure you want to delete this message?')) {
                                try {
                                  await deleteDoc(doc(db, 'contactMessages', msg.id))
                                } catch (error) {
                                  alert('Error deleting message: ' + error.message)
                                }
                              }
                            }}
                          >
                            Delete
                          </button>
                        </div>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'cv' ? (
        <div className="card">
          <div className="card-body">
            <h2 className="h4 mb-4">Advanced CV Builder</h2>
            
            {/* Personal Information */}
            <h3 className="h5 mb-3">Personal Information</h3>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label">Full Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cvData.personalInfo?.name || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, name: e.target.value}})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Profile Photo</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-control" 
                  onChange={(e) => {
                    const file = e.target.files[0]
                    if (file) {
                      const convertToWebP = (fileToConvert) => {
                        return new Promise((resolve, reject) => {
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            const img = new Image()
                            img.onload = () => {
                              const canvas = document.createElement('canvas')
                              canvas.width = img.width
                              canvas.height = img.height
                              const ctx = canvas.getContext('2d')
                              ctx.drawImage(img, 0, 0)
                              canvas.toBlob((blob) => {
                                if (blob) {
                                  resolve(new File([blob], fileToConvert.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' }))
                                } else {
                                  reject(new Error('Failed to convert to WebP'))
                                }
                              }, 'image/webp', 0.8)
                            }
                            img.onerror = reject
                            img.src = ev.target.result
                          }
                          reader.onerror = reject
                          reader.readAsDataURL(fileToConvert)
                        })
                      }
                      
                      const uploadToBeeImage = async (webpFile) => {
                        return new Promise((resolve, reject) => {
                          const formData = new FormData()
                          formData.append('file', webpFile)
                          formData.append('apikey', BEEIMG_API_KEY)

                          console.log('Uploading profile photo to BeeImage...')

                          fetch('https://beeimg.com/api/upload/file/json/', {
                            method: 'POST',
                            body: formData
                          })
                          .then(async (response) => {
                            console.log('BeeImage response status:', response.status)
                            const text = await response.text()
                            console.log('BeeImage raw response:', text)
                            let data
                            try {
                              data = JSON.parse(text)
                            } catch (err) {
                              console.error('Failed to parse BeeImage JSON:', err)
                              throw new Error('Invalid response from BeeImage')
                            }
                            console.log('BeeImage parsed data:', data)
                            if (data.files && data.files.code === "200" && data.files.url) {
                              resolve(data.files.url)
                            } else {
                              throw new Error(data.files?.status || 'BeeImage upload failed')
                            }
                          })
                          .catch(async (err) => {
                            console.error('BeeImage upload error:', err)
                            console.log('Falling back to Firebase Storage')
                            const storageRef = ref(storage, `cv-photos/${Date.now()}_${webpFile.name}`)
                            const uploadTask = uploadBytesResumable(storageRef, webpFile)
                            return new Promise((resolve2, reject2) => {
                              uploadTask.on(
                                'state_changed',
                                (snapshot) => {
                                  const progress = (snapshot.bytesTransferred / snapshot.totalBytes) * 100
                                  console.log('Firebase upload is ' + progress + '% done')
                                },
                                (err2) => reject2(err2),
                                () => {
                                  getDownloadURL(uploadTask.snapshot.ref).then(resolve2).catch(reject2)
                                }
                              )
                            })
                          })
                        })
                      }
                      
                      convertToWebP(file).then(webpFile => {
                        uploadToBeeImage(webpFile).then(url => {
                          setCvData({
                            ...cvData,
                            personalInfo: {
                              ...cvData.personalInfo,
                              photoUrl: url
                            }
                          })
                        }).catch(err => {
                          console.error('Upload failed:', err)
                          alert('Error uploading photo.')
                        })
                      }).catch(err => {
                        console.error('Conversion failed:', err)
                        alert('Error converting photo to WebP.')
                      })
                    }
                  }} 
                />
                {cvData.personalInfo?.photoUrl && (
                  <img 
                    src={cvData.personalInfo.photoUrl} 
                    alt="Profile Preview" 
                    className="img-thumbnail mt-2" 
                    style={{ width: '100px', height: '100px', objectFit: 'cover' }} 
                  />
                )}
              </div>
              <div className="col-md-4">
                <label className="form-label">Date of Birth</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={cvData.personalInfo?.dateOfBirth || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, dateOfBirth: e.target.value}})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Nationality</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cvData.personalInfo?.nationality || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, nationality: e.target.value}})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Phone</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cvData.personalInfo?.phone || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, phone: e.target.value}})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={cvData.personalInfo?.email || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, email: e.target.value}})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">LinkedIn</label>
                <input 
                  type="url" 
                  className="form-control" 
                  value={cvData.personalInfo?.linkedin || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, linkedin: e.target.value}})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">GitHub</label>
                <input 
                  type="url" 
                  className="form-control" 
                  value={cvData.personalInfo?.github || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, github: e.target.value}})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Website</label>
                <input 
                  type="url" 
                  className="form-control" 
                  value={cvData.personalInfo?.website || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, website: e.target.value}})} 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Portfolio</label>
                <input 
                  type="url" 
                  className="form-control" 
                  value={cvData.personalInfo?.portfolio || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, portfolio: e.target.value}})} 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Address</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={cvData.personalInfo?.address || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, address: e.target.value}})} 
                />
              </div>
              <div className="col-12">
                <label className="form-label">Professional Summary</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  value={cvData.personalInfo?.summary || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, summary: e.target.value}})} 
                ></textarea>
              </div>
              <div className="col-12">
                <label className="form-label">Short Bio</label>
                <textarea 
                  className="form-control" 
                  rows="3" 
                  value={cvData.personalInfo?.bio || ''} 
                  onChange={(e) => setCvData({...cvData, personalInfo: {...cvData.personalInfo, bio: e.target.value}})} 
                ></textarea>
              </div>
            </div>

            {/* Education */}
            <h3 className="h5 mb-3">Education</h3>
            <div className="mb-3">
              {cvData.education && cvData.education.map((edu, index) => (
                <div key={index}
                     className="d-flex justify-content-between align-items-center mb-2 p-3 border rounded shadow-sm"
                     draggable
                     onDragStart={() => handleCvDragStart(index, 'education')}
                     onDragOver={handleCvDragOver}
                     onDrop={() => handleCvDrop(index, 'education')}
                     style={{ cursor: 'grab' }}
                >
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <i className="bi bi-grip-vertical text-muted"></i>
                    <div>
                      <strong>{edu.degree} in {edu.major}</strong><br/>
                      <small>{edu.institution} | {edu.startDate} - {edu.endDate}</small><br/>
                      <small className="text-muted">Result: {edu.result}</small>
                      {edu.description && <p className="mb-0 mt-1">{edu.description}</p>}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-warning btn-sm" 
                      onClick={() => handleEditEducation(index)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleRemoveEducation(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label">Degree</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newEducation.degree} 
                  onChange={(e) => setNewEducation({...newEducation, degree: e.target.value})} 
                  placeholder="e.g., B.Sc."
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Major</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newEducation.major} 
                  onChange={(e) => setNewEducation({...newEducation, major: e.target.value})} 
                  placeholder="e.g., CSE"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Institution</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newEducation.institution} 
                  onChange={(e) => setNewEducation({...newEducation, institution: e.target.value})} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Result</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newEducation.result} 
                  onChange={(e) => setNewEducation({...newEducation, result: e.target.value})} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Start Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={newEducation.startDate} 
                  onChange={(e) => setNewEducation({...newEducation, startDate: e.target.value})} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">End Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={newEducation.endDate} 
                  onChange={(e) => setNewEducation({...newEducation, endDate: e.target.value})} 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Description</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newEducation.description} 
                  onChange={(e) => setNewEducation({...newEducation, description: e.target.value})} 
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="button" className="btn btn-success" onClick={handleAddEducation}>
                  <i className="bi bi-plus-circle"></i> {editingEducationIndex !== null ? 'Update Education' : 'Add Education'}
                </button>
                {editingEducationIndex !== null && (
                  <button 
                    type="button" 
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingEducationIndex(null)
                      setNewEducation({ degree: '', major: '', institution: '', startDate: '', endDate: '', result: '', description: '' })
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Experience */}
            <h3 className="h5 mb-3">Experience</h3>
            <div className="mb-3">
              {cvData.experience && cvData.experience.map((exp, index) => (
                <div key={index}
                     className="d-flex justify-content-between align-items-center mb-2 p-3 border rounded shadow-sm"
                     draggable
                     onDragStart={() => handleCvDragStart(index, 'experience')}
                     onDragOver={handleCvDragOver}
                     onDrop={() => handleCvDrop(index, 'experience')}
                     style={{ cursor: 'grab' }}
                >
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <i className="bi bi-grip-vertical text-muted"></i>
                    <div>
                      <strong>{exp.position} at {exp.company}</strong><br/>
                      <small>{exp.location} | {exp.startDate} - {exp.endDate || 'Present'}</small><br/>
                      {exp.responsibilities && <p className="mb-0 mt-1">{exp.responsibilities}</p>}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-warning btn-sm" 
                      onClick={() => handleEditExperience(index)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleRemoveExperience(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="row g-3 mb-4">
              <div className="col-md-3">
                <label className="form-label">Position</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newExperience.position} 
                  onChange={(e) => setNewExperience({...newExperience, position: e.target.value})} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Company</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newExperience.company} 
                  onChange={(e) => setNewExperience({...newExperience, company: e.target.value})} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Location</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newExperience.location} 
                  onChange={(e) => setNewExperience({...newExperience, location: e.target.value})} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Start Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={newExperience.startDate} 
                  onChange={(e) => setNewExperience({...newExperience, startDate: e.target.value})} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">End Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={newExperience.endDate} 
                  onChange={(e) => setNewExperience({...newExperience, endDate: e.target.value})} 
                  placeholder="Leave empty for present"
                />
              </div>
              <div className="col-md-9">
                <label className="form-label">Responsibilities</label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  value={newExperience.responsibilities} 
                  onChange={(e) => setNewExperience({...newExperience, responsibilities: e.target.value})} 
                ></textarea>
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="button" className="btn btn-success" onClick={handleAddExperience}>
                  <i className="bi bi-plus-circle"></i> {editingExperienceIndex !== null ? 'Update Experience' : 'Add Experience'}
                </button>
                {editingExperienceIndex !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingExperienceIndex(null)
                      setNewExperience({ position: '', company: '', location: '', startDate: '', endDate: '', responsibilities: '' })
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Skills */}
            <h3 className="h5 mb-3">Skills</h3>
            <div className="mb-3 d-flex flex-wrap gap-2">
              {cvData.skills && cvData.skills.map((skill, index) => (
                <span key={index}
                      className="badge bg-primary d-flex align-items-center gap-2 px-3 py-2"
                      draggable
                      onDragStart={() => handleCvDragStart(index, 'skill')}
                      onDragOver={handleCvDragOver}
                      onDrop={() => handleCvDrop(index, 'skill')}
                      style={{ cursor: 'grab' }}
                >
                  <i className="bi bi-grip-vertical text-muted opacity-75"></i>
                  {skill.name} <span className="fw-light opacity-75">({skill.level})</span>
                  <button 
                    type="button" 
                    className="btn btn-warning btn-sm text-white"
                    onClick={() => handleEditSkill(index)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => handleRemoveSkill(index)}
                  ></button>
                </span>
              ))}
            </div>
            <div className="row g-3 mb-4">
              <div className="col-md-8">
                <label className="form-label">Skill Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newSkill.name} 
                  onChange={(e) => setNewSkill({...newSkill, name: e.target.value})} 
                  placeholder="e.g., JavaScript, React"
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Level</label>
                <select 
                  className="form-select" 
                  value={newSkill.level} 
                  onChange={(e) => setNewSkill({...newSkill, level: e.target.value})} 
                >
                  <option value="Beginner">Beginner</option>
                  <option value="Intermediate">Intermediate</option>
                  <option value="Advanced">Advanced</option>
                  <option value="Expert">Expert</option>
                </select>
              </div>
              <div className="col-md-1 d-flex align-items-end gap-2">
                <button type="button" className="btn btn-success w-100" onClick={handleAddSkill}>
                  <i className="bi bi-plus-lg"></i>
                </button>
                {editingSkillIndex !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingSkillIndex(null)
                      setNewSkill({ name: '', level: 'Intermediate' })
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Projects */}
            <h3 className="h5 mb-3">Projects</h3>
            <div className="mb-3">
              {cvData.projects && cvData.projects.map((proj, index) => (
                <div key={index}
                     className="d-flex justify-content-between align-items-center mb-2 p-3 border rounded shadow-sm"
                     draggable
                     onDragStart={() => handleCvDragStart(index, 'project')}
                     onDragOver={handleCvDragOver}
                     onDrop={() => handleCvDrop(index, 'project')}
                     style={{ cursor: 'grab' }}
                >
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <i className="bi bi-grip-vertical text-muted"></i>
                    <div className="flex-grow-1">
                      <strong>{proj.name}</strong><br/>
                      {proj.description && <p className="mb-1 mt-1">{proj.description}</p>}
                      {proj.technologies && <small className="text-muted">Tech: {proj.technologies}</small>}
                      {proj.url && <a href={proj.url} target="_blank" rel="noopener noreferrer" className="d-block mt-1">View Project</a>}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={() => handleEditProject(index)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleRemoveProject(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="row g-3 mb-4">
              <div className="col-md-6">
                <label className="form-label">Project Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newProject.name} 
                  onChange={(e) => setNewProject({...newProject, name: e.target.value})} 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Project URL</label>
                <input 
                  type="url" 
                  className="form-control" 
                  value={newProject.url} 
                  onChange={(e) => setNewProject({...newProject, url: e.target.value})} 
                />
              </div>
              <div className="col-md-12">
                <label className="form-label">Description</label>
                <textarea 
                  className="form-control" 
                  rows="2" 
                  value={newProject.description} 
                  onChange={(e) => setNewProject({...newProject, description: e.target.value})} 
                ></textarea>
              </div>
              <div className="col-md-12">
                <label className="form-label">Technologies (comma separated)</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newProject.technologies} 
                  onChange={(e) => setNewProject({...newProject, technologies: e.target.value})} 
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="button" className="btn btn-success" onClick={handleAddProject}>
                  <i className="bi bi-plus-circle"></i> {editingProjectIndex !== null ? 'Update Project' : 'Add Project'}
                </button>
                {editingProjectIndex !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingProjectIndex(null)
                      setNewProject({ name: '', description: '', technologies: '', url: '' })
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Certifications */}
            <h3 className="h5 mb-3">Certifications</h3>
            <div className="mb-3">
              {cvData.certifications && cvData.certifications.map((cert, index) => (
                <div key={index}
                     className="d-flex justify-content-between align-items-center mb-2 p-3 border rounded shadow-sm"
                     draggable
                     onDragStart={() => handleCvDragStart(index, 'certification')}
                     onDragOver={handleCvDragOver}
                     onDrop={() => handleCvDrop(index, 'certification')}
                     style={{ cursor: 'grab' }}
                >
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <i className="bi bi-grip-vertical text-muted"></i>
                    <div className="flex-grow-1">
                      <strong>{cert.name}</strong><br/>
                      <small>Issued by {cert.issuer} | {cert.date}</small>
                      {cert.url && <a href={cert.url} target="_blank" rel="noopener noreferrer" className="d-block mt-1">View Certificate</a>}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={() => handleEditCertification(index)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleRemoveCertification(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label">Certification Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCertification.name} 
                  onChange={(e) => setNewCertification({...newCertification, name: e.target.value})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Issuer</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newCertification.issuer} 
                  onChange={(e) => setNewCertification({...newCertification, issuer: e.target.value})} 
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">Date</label>
                <input 
                  type="date" 
                  className="form-control" 
                  value={newCertification.date} 
                  onChange={(e) => setNewCertification({...newCertification, date: e.target.value})} 
                />
              </div>
              <div className="col-md-2">
                <label className="form-label">URL</label>
                <input 
                  type="url" 
                  className="form-control" 
                  value={newCertification.url} 
                  onChange={(e) => setNewCertification({...newCertification, url: e.target.value})} 
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="button" className="btn btn-success" onClick={handleAddCertification}>
                  <i className="bi bi-plus-circle"></i> {editingCertificationIndex !== null ? 'Update Certification' : 'Add Certification'}
                </button>
                {editingCertificationIndex !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingCertificationIndex(null)
                      setNewCertification({ name: '', issuer: '', date: '', url: '' })
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Languages */}
            <h3 className="h5 mb-3">Languages</h3>
            <div className="mb-3 d-flex flex-wrap gap-2">
              {cvData.languages && cvData.languages.map((lang, index) => (
                <span key={index}
                      className="badge bg-secondary d-flex align-items-center gap-2 px-3 py-2"
                      draggable
                      onDragStart={() => handleCvDragStart(index, 'language')}
                      onDragOver={handleCvDragOver}
                      onDrop={() => handleCvDrop(index, 'language')}
                      style={{ cursor: 'grab' }}
                >
                  <i className="bi bi-grip-vertical text-muted opacity-75"></i>
                  {lang.name} <span className="fw-light opacity-75">({lang.proficiency})</span>
                  <button
                    type="button"
                    className="btn btn-warning btn-sm text-white"
                    onClick={() => handleEditLanguage(index)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => handleRemoveLanguage(index)}
                  ></button>
                </span>
              ))}
            </div>
            <div className="row g-3 mb-4">
              <div className="col-md-8">
                <label className="form-label">Language</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newLanguage.name} 
                  onChange={(e) => setNewLanguage({...newLanguage, name: e.target.value})} 
                />
              </div>
              <div className="col-md-3">
                <label className="form-label">Proficiency</label>
                <select 
                  className="form-select" 
                  value={newLanguage.proficiency} 
                  onChange={(e) => setNewLanguage({...newLanguage, proficiency: e.target.value})} 
                >
                  <option value="Native">Native</option>
                  <option value="Fluent">Fluent</option>
                  <option value="Professional">Professional</option>
                  <option value="Conversational">Conversational</option>
                  <option value="Beginner">Beginner</option>
                </select>
              </div>
              <div className="col-md-1 d-flex align-items-end gap-2">
                <button type="button" className="btn btn-success w-100" onClick={handleAddLanguage}>
                  <i className="bi bi-plus-lg"></i>
                </button>
                {editingLanguageIndex !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingLanguageIndex(null)
                      setNewLanguage({ name: '', proficiency: 'Fluent' })
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* Hobbies */}
            <h3 className="h5 mb-3">Hobbies & Interests</h3>
            <div className="mb-3 d-flex flex-wrap gap-2">
              {cvData.hobbies && cvData.hobbies.map((hobby, index) => (
                <span key={index}
                      className="badge bg-info text-dark d-flex align-items-center gap-2 px-3 py-2"
                      draggable
                      onDragStart={() => handleCvDragStart(index, 'hobby')}
                      onDragOver={handleCvDragOver}
                      onDrop={() => handleCvDrop(index, 'hobby')}
                      style={{ cursor: 'grab' }}
                >
                  <i className="bi bi-grip-vertical text-muted opacity-75"></i>
                  {hobby.name}
                  <button
                    type="button"
                    className="btn btn-warning btn-sm text-white"
                    onClick={() => handleEditHobby(index)}
                  >
                    <i className="bi bi-pencil"></i>
                  </button>
                  <button 
                    type="button" 
                    className="btn-close" 
                    onClick={() => handleRemoveHobby(index)}
                  ></button>
                </span>
              ))}
            </div>
            <div className="row g-3 mb-4">
              <div className="col-md-10">
                <label className="form-label">Hobby</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newHobby.name} 
                  onChange={(e) => setNewHobby({...newHobby, name: e.target.value})} 
                />
              </div>
              <div className="col-md-2 d-flex align-items-end gap-2">
                <button type="button" className="btn btn-success w-100" onClick={handleAddHobby}>
                  <i className="bi bi-plus-lg"></i>
                </button>
                {editingHobbyIndex !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingHobbyIndex(null)
                      setNewHobby({ name: '' })
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* References */}
            <h3 className="h5 mb-3">References</h3>
            <div className="mb-3">
              {cvData.references && cvData.references.map((ref, index) => (
                <div key={index}
                     className="d-flex justify-content-between align-items-center mb-2 p-3 border rounded shadow-sm"
                     draggable
                     onDragStart={() => handleCvDragStart(index, 'reference')}
                     onDragOver={handleCvDragOver}
                     onDrop={() => handleCvDrop(index, 'reference')}
                     style={{ cursor: 'grab' }}
                >
                  <div className="d-flex align-items-center gap-2 flex-grow-1">
                    <i className="bi bi-grip-vertical text-muted"></i>
                    <div className="flex-grow-1">
                      <strong>{ref.name}</strong><br/>
                      <small>{ref.position} at {ref.company}</small><br/>
                      {ref.email && <small>{ref.email}</small>}
                      {ref.phone && <small className="ms-3">{ref.phone}</small>}
                    </div>
                  </div>
                  <div className="d-flex gap-2">
                    <button
                      type="button"
                      className="btn btn-warning btn-sm"
                      onClick={() => handleEditReference(index)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleRemoveReference(index)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
            <div className="row g-3 mb-4">
              <div className="col-md-4">
                <label className="form-label">Name</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newReference.name} 
                  onChange={(e) => setNewReference({...newReference, name: e.target.value})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Position</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newReference.position} 
                  onChange={(e) => setNewReference({...newReference, position: e.target.value})} 
                />
              </div>
              <div className="col-md-4">
                <label className="form-label">Company</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newReference.company} 
                  onChange={(e) => setNewReference({...newReference, company: e.target.value})} 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Email</label>
                <input 
                  type="email" 
                  className="form-control" 
                  value={newReference.email} 
                  onChange={(e) => setNewReference({...newReference, email: e.target.value})} 
                />
              </div>
              <div className="col-md-6">
                <label className="form-label">Phone</label>
                <input 
                  type="text" 
                  className="form-control" 
                  value={newReference.phone} 
                  onChange={(e) => setNewReference({...newReference, phone: e.target.value})} 
                />
              </div>
              <div className="col-12 d-flex gap-2">
                <button type="button" className="btn btn-success" onClick={handleAddReference}>
                  <i className="bi bi-plus-circle"></i> {editingReferenceIndex !== null ? 'Update Reference' : 'Add Reference'}
                </button>
                {editingReferenceIndex !== null && (
                  <button
                    type="button"
                    className="btn btn-secondary"
                    onClick={() => {
                      setEditingReferenceIndex(null)
                      setNewReference({ name: '', position: '', company: '', email: '', phone: '' })
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            </div>

            {/* CV File */}
            <h3 className="h5 mb-3">CV File</h3>
            <div className="mb-4">
              <label className="form-label">CV File URL</label>
              <input 
                type="url" 
                className="form-control" 
                value={cvData.cvFileUrl || ''} 
                onChange={(e) => setCvData({...cvData, cvFileUrl: e.target.value})} 
              />
            </div>

            <div className="d-flex gap-2">
              <button type="button" className="btn btn-primary btn-lg" onClick={handleSaveCv}>
                <i className="bi bi-save"></i> Save CV
              </button>
              <button type="button" className="btn btn-info btn-lg text-white" onClick={generatePDF}>
                <i className="bi bi-eye"></i> Preview PDF
              </button>
            </div>
          </div>
        </div>
      ) : activeTab === 'gallery' ? (
        <div className="card">
          <div className="card-body">
            <h2 className="h4 mb-4">Image Gallery</h2>

            <div 
              className={`drop-zone mb-4 p-5 text-center border-3 border-dashed rounded ${isDragging ? 'border-primary bg-primary bg-opacity-10' : 'border-secondary'}`}
              onDragEnter={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDragLeave={(e) => { e.preventDefault(); setIsDragging(false) }}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true) }}
              onDrop={handleGalleryDrop}
              onClick={() => fileInputRef.current && fileInputRef.current.click()}
              style={{ cursor: 'pointer' }}
            >
              <i className="bi bi-cloud-arrow-up" style={{ fontSize: '4rem', marginBottom: '1rem' }}></i>
              <p className="mb-2">Drag & Drop images here or click to select</p>
              <p className="text-muted mb-0">Supports all image formats, auto-converts to WebP</p>
            </div>

            <input 
              type="file" 
              ref={fileInputRef}
              onChange={(e) => handleGalleryDrop(e)}
              multiple
              accept="image/*"
              className="d-none"
            />

            <div className="mb-4">
              <label className="form-label">Or enter image URLs (one per line)</label>
              <textarea 
                className="form-control" 
                rows="3"
                placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
                id="galleryUrlsInput"
              />
              <button 
                type="button" 
                className="btn btn-primary mt-2"
                onClick={async () => {
                  const urls = document.getElementById('galleryUrlsInput').value.split('\n').filter(url => url.trim() !== '')
                  if (urls.length === 0) {
                    alert('Please enter at least one URL')
                    return
                  }
                  
                  try {
                    for (const url of urls) {
                      await addDoc(collection(db, 'gallery'), {
                        url: url.trim(),
                        createdAt: serverTimestamp()
                      })
                    }
                    alert(`${urls.length} image(s) added to gallery!`)
                    document.getElementById('galleryUrlsInput').value = ''
                  } catch (error) {
                    alert('Error adding images: ' + error.message)
                  }
                }}
              >
                <i className="bi bi-plus-circle me-2"></i>Add URLs to Gallery
              </button>
            </div>

            {uploadQueue.length > 0 && (
              <div className="mb-4">
                <h5 className="mb-3">Uploading...</h5>
                <div className="row g-3">
                  {uploadQueue.map(item => (
                    <div key={item.id} className="col-3">
                      <div className="card h-100">
                        <img 
                          src={item.preview} 
                          alt="Uploading" 
                          className="card-img-top" 
                          style={{ height: '200px', objectFit: 'cover' }} 
                        />
                        <div className="card-body">
                          <div className="d-flex justify-content-between align-items-center mb-2">
                            <span>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</span>
                            <span className="fw-bold">{item.progress}%</span>
                          </div>
                          <div className="progress" style={{ height: '0.5rem' }}>
                            <div 
                              className={`progress-bar ${
                                item.status === 'complete' ? 'bg-success' : 
                                item.status === 'error' ? 'bg-danger' : 'progress-bar-striped progress-bar-animated'
                              }`}
                              style={{ width: `${item.progress}%` }}
                            ></div>
                          </div>
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            )}

            <h3 className="h5 mt-5 mb-3">Gallery Images</h3>
            <div className="row g-3">
              {data.gallery.map(img => (
                <div key={img.id} className="col-3">
                  <div className="position-relative">
                    <img src={img.url} alt="Gallery" className="img-thumbnail" style={{ width: '100%', height: '200px', objectFit: 'cover' }} />
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm position-absolute top-0 end-0 m-2"
                      onClick={() => handleDelete(img.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      ) : activeTab === 'profile' ? (
        <div className="card">
          <div className="card-body">
            <h2 className="h4 mb-4">Profile Settings</h2>
            
            <h3 className="h5 mb-3">Circle Profile Image</h3>
            <div className="row">
              <div className="col-md-4 mb-4">
                {data.profileImageUrl ? (
                  <img 
                    src={data.profileImageUrl} 
                    alt="Profile Preview" 
                    className="img-thumbnail" 
                    style={{ width: '200px', height: '200px', objectFit: 'cover', borderRadius: '50%' }} 
                  />
                ) : (
                  <div 
                    className="border border-3 border-dashed rounded-circle border-secondary d-flex align-items-center justify-content-center" 
                    style={{ width: '200px', height: '200px' }}
                  >
                    <span className="text-muted">No image</span>
                  </div>
                )}
              </div>
              <div className="col-md-8">
                <label className="form-label">Upload New Image</label>
                <input 
                  type="file" 
                  accept="image/*" 
                  className="form-control mb-3" 
                  onChange={async (e) => {
                    const file = e.target.files[0]
                    if (!file) return
                    
                    try {
                      const convertToWebP = (fileToConvert) => {
                        return new Promise((resolve, reject) => {
                          const reader = new FileReader()
                          reader.onload = (ev) => {
                            const img = new Image()
                            img.onload = () => {
                              const canvas = document.createElement('canvas')
                              canvas.width = img.width
                              canvas.height = img.height
                              const ctx = canvas.getContext('2d')
                              ctx.drawImage(img, 0, 0)
                              canvas.toBlob((blob) => {
                                if (blob) {
                                  resolve(new File([blob], fileToConvert.name.replace(/\.[^/.]+$/, '.webp'), { type: 'image/webp' }))
                                } else {
                                  reject(new Error('Failed to convert to WebP'))
                                }
                              }, 'image/webp', 0.8)
                            }
                            img.onerror = reject
                            img.src = ev.target.result
                          }
                          reader.onerror = reject
                          reader.readAsDataURL(fileToConvert)
                        })
                      }

                      const uploadToBeeImage = async (webpFile) => {
                        return new Promise((resolve, reject) => {
                          const formData = new FormData()
                          formData.append('file', webpFile)
                          formData.append('apikey', BEEIMG_API_KEY)
                          
                          console.log('Uploading profile image to BeeImage...')
                          
                          fetch('https://beeimg.com/api/upload/file/json/', {
                            method: 'POST',
                            body: formData
                          })
                          .then(async (response) => {
                            const text = await response.text()
                            let data
                            try {
                              data = JSON.parse(text)
                            } catch (err) {
                              throw new Error('Invalid response from BeeImage')
                            }
                            if (data.files && data.files.code === "200" && data.files.url) {
                              resolve(data.files.url)
                            } else {
                              throw new Error(data.files?.status || 'BeeImage upload failed')
                            }
                          })
                          .catch(async (err) => {
                            console.log('Falling back to Firebase Storage')
                            const storageRef = ref(storage, `profile-images/${Date.now()}_${webpFile.name}`)
                            const uploadTask = uploadBytesResumable(storageRef, webpFile)
                            return new Promise((resolve2, reject2) => {
                              uploadTask.on(
                                'state_changed',
                                () => {},
                                reject2,
                                () => getDownloadURL(uploadTask.snapshot.ref).then(resolve2).catch(reject2)
                              )
                            })
                          })
                        })
                      }
                      
                      const webpFile = await convertToWebP(file)
                      const url = await uploadToBeeImage(webpFile)
                      
                      await setDoc(doc(db, 'portfolio', 'config'), { profileImageUrl: url }, { merge: true })
                      alert('Profile image updated!')
                    } catch (error) {
                      console.error(error)
                      alert('Error uploading profile image: ' + error.message)
                    }
                  }}
                />
                <div className="mb-3">
                  <label className="form-label">Or enter URL directly</label>
                  <input 
                    type="url" 
                    className="form-control" 
                    value={data.profileImageUrl} 
                    onChange={async (e) => {
                      const url = e.target.value
                      try {
                        await setDoc(doc(db, 'portfolio', 'config'), { profileImageUrl: url }, { merge: true })
                      } catch (err) {
                        console.error(err)
                        alert('Error updating profile image URL: ' + err.message)
                      }
                    }} 
                  />
                </div>
                {data.profileImageUrl && (
                  <button 
                    className="btn btn-danger" 
                    onClick={async () => {
                      try {
                        await setDoc(doc(db, 'portfolio', 'config'), { profileImageUrl: '' }, { merge: true })
                        alert('Profile image removed!')
                      } catch (err) {
                          console.error(err)
                          alert('Error removing profile image: ' + err.message)
                      }
                    }}
                  >
                    Remove Image
                  </button>
                )}
              </div>

              <div className="mb-4">
                <label className="form-label">Bio Data</label>
                <textarea 
                  className="form-control" 
                  rows="4" 
                  value={data.bio}
                  onChange={async (e) => {
                    const bio = e.target.value
                    try {
                      await setDoc(doc(db, 'portfolio', 'config'), { bio: bio }, { merge: true })
                    } catch (err) {
                      console.error(err)
                      alert('Error updating bio: ' + err.message)
                    }
                  }}
                  placeholder="Write a short bio about yourself..."
                />
              </div>

              {/* Roles Management */}
              <div className="mb-4">
                <label className="form-label">Roles (Show in Hero Section)</label>
                
                {/* Existing Roles */}
                <div className="mb-3">
                  {data.roles.length === 0 ? (
                    <p className="text-muted">No roles added yet</p>
                  ) : (
                    <div className="d-flex flex-wrap gap-2 mb-3">
                      {[...data.roles].sort((a, b) => (a.order ?? 0) - (b.order ?? 0)).map((role) => (
                        <div 
                          key={role.id} 
                          draggable={!editingRoleId}
                          onDragStart={() => handleDragStart(role)}
                          onDragOver={handleDragOver}
                          onDrop={() => handleDrop(role)}
                          className={`d-flex align-items-center gap-2 bg-light p-2 rounded ${draggedRoleId === role.id ? 'opacity-50' : ''}`}
                          style={{ cursor: editingRoleId ? 'default' : 'grab' }}
                        >
                          {editingRoleId === role.id ? (
                            <>
                              <input 
                                type="text"
                                className="form-control form-control-sm"
                                value={editingRoleName}
                                onChange={(e) => setEditingRoleName(e.target.value)}
                                onKeyDown={(e) => {
                                  if (e.key === 'Enter') handleSaveEditRole();
                                  if (e.key === 'Escape') {
                                    setEditingRoleId(null);
                                    setEditingRoleName('');
                                  }
                                }}
                              />
                              <button 
                                type="button"
                                className="btn btn-success btn-sm"
                                onClick={handleSaveEditRole}
                              >
                                <i className="bi bi-check-lg"></i>
                              </button>
                              <button 
                                type="button"
                                className="btn btn-secondary btn-sm"
                                onClick={() => {
                                  setEditingRoleId(null);
                                  setEditingRoleName('');
                                }}
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-grip-vertical text-muted"></i>
                              <span>{role.name}</span>
                              <button 
                                type="button"
                                className="btn btn-warning btn-sm"
                                onClick={() => handleEditRole(role)}
                              >
                                <i className="bi bi-pencil"></i>
                              </button>
                              <button 
                                type="button"
                                className="btn btn-danger btn-sm"
                                onClick={() => handleRemoveRole(role.id)}
                              >
                                <i className="bi bi-x-lg"></i>
                              </button>
                            </>
                          )}
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Add New Role */}
                {!editingRoleId && (
                  <div className="input-group">
                    <input 
                      type="text"
                      className="form-control"
                      placeholder="e.g. App Developer"
                      value={newRole}
                      onChange={(e) => setNewRole(e.target.value)}
                      onKeyDown={(e) => {
                        if (e.key === 'Enter') {
                          handleAddRole();
                        }
                      }}
                    />
                    <button 
                      type="button"
                      className="btn btn-primary"
                      onClick={handleAddRole}
                    >
                      <i className="bi bi-plus-lg"></i> Add Role
                    </button>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      ) : activeTab === 'socialIcons' ? (
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4 mb-0">Social Icons</h2>
            </div>

            {/* Add New Icon Form */}
            <form onSubmit={async (e) => {
              e.preventDefault()
              const formData = new FormData(e.target)
              const selectedNetworkName = formData.get('network')
              const url = formData.get('url')
              const customName = formData.get('customName')
              const customImage = formData.get('customImage')
              
              let iconData = {}
              if (selectedNetworkName === 'Custom') {
                if (!customName || !customImage) {
                  alert('Please fill custom name and icon URL')
                  return
                }
                iconData = { name: customName, image: customImage }
              } else {
                // Find selected network from predefined list
                const selectedNetwork = PREDEFINED_NETWORKS.find(n => n.name === selectedNetworkName)
                if (!selectedNetwork) {
                  alert('Please select a network')
                  return
                }
                iconData = selectedNetwork
              }
              
              try {
                await addDoc(collection(db, 'socialIcons'), {
                  name: iconData.name,
                  url: url,
                  image: iconData.image,
                  createdAt: serverTimestamp()
                })
                alert('Icon added!')
                e.target.reset()
              } catch (error) {
                alert('Error adding icon: ' + error.message)
              }
            }}>
              <div className="row">
                <div className="col-md-6 mb-3">
                  <label className="form-label">Select Network</label>
                  <select name="network" className="form-select" id="network-select" required onChange={(e) => {
                    const customFields = document.getElementById('custom-network-fields')
                    if (e.target.value === 'Custom') {
                      customFields.style.display = 'block'
                    } else {
                      customFields.style.display = 'none'
                    }
                  }}>
                    <option value="">Choose a network...</option>
                    {PREDEFINED_NETWORKS.map(network => (
                      <option key={network.name} value={network.name}>
                        {network.name}
                      </option>
                    ))}
                    <option value="Custom">Custom Network</option>
                  </select>
                </div>
                <div className="col-md-6 mb-3">
                  <label className="form-label">Your Profile Link (optional)</label>
                  <input type="url" name="url" className="form-control" placeholder="https://github.com/yourprofile" />
                </div>
              </div>
              <div id="custom-network-fields" className="row mb-3" style={{ display: 'none' }}>
                <div className="col-md-6">
                  <label className="form-label">Custom Network Name</label>
                  <input type="text" name="customName" className="form-control" placeholder="e.g. My Website" />
                </div>
                <div className="col-md-6">
                  <label className="form-label">Custom Icon URL</label>
                  <input type="url" name="customImage" className="form-control" placeholder="https://..." />
                </div>
              </div>
              <button type="submit" className="btn btn-primary mb-4">
                <i className="bi bi-plus-circle me-2"></i>Add Icon
              </button>
            </form>

            {/* Existing Icons */}
            <h3 className="h5 mb-3">Current Icons</h3>
            {data.socialIcons.length === 0 ? (
              <p className="text-muted text-center py-5">No icons yet</p>
            ) : (
              <div className="row g-3">
                {data.socialIcons.map((icon) => (
                  <div key={icon.id} className="col-md-3">
                    <div className="card">
                      <div className="card-body text-center">
                        <img src={icon.image} alt={icon.name} style={{ width: '48px', height: '48px', objectFit: 'contain' }} />
                        <h5 className="mt-2">{icon.name}</h5>
                        <p className="text-muted small mb-2">{icon.url}</p>
                        <button 
                          className="btn btn-danger btn-sm"
                          onClick={async () => {
                            try {
                              await deleteDoc(doc(db, 'socialIcons', icon.id))
                              alert('Icon deleted!')
                            } catch (error) {
                              alert('Error deleting icon: ' + error.message)
                            }
                          }}
                        >
                          <i className="bi bi-trash"></i>
                        </button>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>
      ) : activeTab === 'aiSettings' ? (
        <div className="card shadow-sm border-0">
          <div className="card-body p-4">
            <div className="d-flex justify-content-between align-items-center mb-4 pb-3 border-bottom flex-wrap gap-2">
              <div>
                <h2 className="h4 mb-1 text-primary">
                  <i className="bi bi-robot me-2"></i>AI Assistant Settings
                </h2>
                <p className="text-muted mb-0 small">
                  Configure both <strong>Chat 1 (Prodhan AI)</strong> and <strong>Chat 2 (Kira AI)</strong> engines.
                </p>
              </div>

              {/* Engine Switcher */}
              <div className="btn-group" role="group">
                <button
                  type="button"
                  className={`btn btn-sm ${activeAiTab === 'kira' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveAiTab('kira')}
                >
                  <i className="bi bi-stars me-1"></i>Chat 2: Kira AI
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${activeAiTab === 'prodhan' ? 'btn-primary' : 'btn-outline-primary'}`}
                  onClick={() => setActiveAiTab('prodhan')}
                >
                  <i className="bi bi-robot me-1"></i>Chat 1: Prodhan AI
                </button>
              </div>
            </div>

            {/* TAB 1: KIRA AI (CHAT 2) */}
            {activeAiTab === 'kira' ? (
              <div>
                <div className="alert alert-info d-flex align-items-center justify-content-between mb-4 flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <i className="bi bi-stars fs-4 text-primary"></i>
                    <div>
                      <strong>Kira AI Integration Active</strong>
                      <div className="small text-muted">API: <code>https://kiraai.vn/api/v1</code> • Supports Text, Vision, TTS Voice & Image Gen</div>
                    </div>
                  </div>
                  <a
                    href="https://kiraai.vn/developer/"
                    target="_blank"
                    rel="noopener noreferrer"
                    className="btn btn-sm btn-outline-primary"
                  >
                    <i className="bi bi-box-arrow-up-right me-1"></i>Developer Hub
                  </a>
                </div>

                <form onSubmit={handleSaveKiraSettings}>
                  {/* Kira API Key */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">
                      Kira API Key <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-key-fill text-muted"></i>
                      </span>
                      <input
                        type={showKiraApiKey ? "text" : "password"}
                        className="form-control"
                        value={kiraSettings.apiKey}
                        onChange={(e) => setKiraSettings({ ...kiraSettings, apiKey: e.target.value })}
                        placeholder="kira_..."
                        required
                      />
                      <button
                        type="button"
                        className="btn btn-outline-secondary"
                        onClick={() => setShowKiraApiKey(!showKiraApiKey)}
                        title={showKiraApiKey ? "Hide Key" : "Show Key"}
                      >
                        <i className={`bi ${showKiraApiKey ? "bi-eye-slash" : "bi-eye"}`}></i>
                      </button>
                    </div>
                    <div className="form-text text-muted">
                      Default Key: <code>kira_c90a333e2bc6ded10d9e7f02870b7cf0</code>
                    </div>
                  </div>

                  {/* Kira Base URL */}
                  <div className="mb-4">
                    <label className="form-label fw-bold">
                      API Base URL <span className="text-danger">*</span>
                    </label>
                    <div className="input-group">
                      <span className="input-group-text bg-light">
                        <i className="bi bi-link-45deg text-muted"></i>
                      </span>
                      <input
                        type="url"
                        className="form-control"
                        value={kiraSettings.baseUrl}
                        onChange={(e) => setKiraSettings({ ...kiraSettings, baseUrl: e.target.value })}
                        placeholder="https://kiraai.vn/api/v1"
                        required
                      />
                    </div>
                  </div>

                  {/* Model Selection */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Default Chat Model</label>
                      <select
                        className="form-select"
                        value={kiraSettings.model}
                        onChange={(e) => setKiraSettings({ ...kiraSettings, model: e.target.value })}
                      >
                        {KIRA_MODELS.map(m => (
                          <option key={m.id} value={m.id}>{m.name} - {m.desc}</option>
                        ))}
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">Image Gen Engine</label>
                      <select
                        className="form-select"
                        value={kiraSettings.imageModel}
                        onChange={(e) => setKiraSettings({ ...kiraSettings, imageModel: e.target.value })}
                      >
                        <option value="kira-3.0-image">kira-3.0-image (Fast & Ultra-HD)</option>
                        <option value="kira-2.0-image">kira-2.0-image (Stable)</option>
                      </select>
                    </div>
                  </div>

                  {/* TTS Voice */}
                  <div className="row g-3 mb-4">
                    <div className="col-md-6">
                      <label className="form-label fw-bold">Text-to-Speech (TTS) Voice</label>
                      <select
                        className="form-select"
                        value={kiraSettings.ttsVoice}
                        onChange={(e) => setKiraSettings({ ...kiraSettings, ttsVoice: e.target.value })}
                      >
                        <option value="alloy">alloy (Kore - Natural & Crisp)</option>
                        <option value="echo">echo (Fenrir - Deep & Warm)</option>
                        <option value="fable">fable (Puck - Expressive)</option>
                        <option value="onyx">onyx (Charon - Professional)</option>
                        <option value="nova">nova (Aoede - Energetic)</option>
                      </select>
                    </div>

                    <div className="col-md-6">
                      <label className="form-label fw-bold">TTS Model</label>
                      <select
                        className="form-select"
                        value={kiraSettings.ttsModel}
                        onChange={(e) => setKiraSettings({ ...kiraSettings, ttsModel: e.target.value })}
                      >
                        <option value="kira-3.0-flash-tts">kira-3.0-flash-tts (Studio Quality)</option>
                        <option value="kira-2.0-flash-tts">kira-2.0-flash-tts (Fast Response)</option>
                      </select>
                    </div>
                  </div>

                  {/* System Prompt */}
                  <div className="mb-4">
                    <div className="d-flex justify-content-between align-items-center mb-1">
                      <label className="form-label fw-bold mb-0">System Instructions / Behavior Prompt</label>
                      <button
                        type="button"
                        className="btn btn-link btn-sm p-0 text-decoration-none"
                        onClick={() => setKiraSettings({ ...kiraSettings, systemPrompt: DEFAULT_KIRA_CONFIG.systemPrompt })}
                      >
                        Reset to Default
                      </button>
                    </div>
                    <textarea
                      className="form-control font-monospace"
                      style={{ fontSize: '0.875rem' }}
                      rows={5}
                      value={kiraSettings.systemPrompt}
                      onChange={(e) => setKiraSettings({ ...kiraSettings, systemPrompt: e.target.value })}
                    />
                  </div>

                  {/* Test Result Alert */}
                  {kiraTestResult && (
                    <div className={`alert ${kiraTestResult.success ? 'alert-success' : 'alert-danger'} d-flex align-items-center mb-4`}>
                      <i className={`bi ${kiraTestResult.success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 fs-5`}></i>
                      <div>
                        {kiraTestResult.success ? (
                          <>
                            <strong>Kira AI Connected!</strong>
                            <div className="small mt-1 text-secondary">Response: &quot;{kiraTestResult.reply}&quot;</div>
                          </>
                        ) : (
                          <>
                            <strong>Connection Failed:</strong> {kiraTestResult.error}
                          </>
                        )}
                      </div>
                    </div>
                  )}

                  {/* Buttons */}
                  <div className="d-flex gap-3 pt-2">
                    <button
                      type="button"
                      className="btn btn-outline-primary"
                      onClick={handleTestKiraConnection}
                      disabled={kiraTesting || !kiraSettings.apiKey}
                    >
                      {kiraTesting ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Testing Kira Connection...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-broadcast me-2"></i>Test Kira Connection
                        </>
                      )}
                    </button>

                    <button
                      type="submit"
                      className="btn btn-primary px-4"
                      disabled={savingKiraSettings || !kiraSettings.apiKey}
                    >
                      {savingKiraSettings ? (
                        <>
                          <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                          Saving...
                        </>
                      ) : (
                        <>
                          <i className="bi bi-save me-2"></i>Save Kira AI Settings
                        </>
                      )}
                    </button>
                  </div>
                </form>
              </div>
            ) : (
              /* TAB 2: PRODHAN AI (CHAT 1) */
              <form onSubmit={handleSaveAiSettings}>
                {/* API Key Input */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    API Key <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-key-fill text-muted"></i>
                    </span>
                    <input
                      type={showAiApiKey ? "text" : "password"}
                      className="form-control"
                      value={aiSettings.apiKey}
                      onChange={(e) => setAiSettings({ ...aiSettings, apiKey: e.target.value })}
                      placeholder="sk-..."
                      required
                    />
                    <button
                      type="button"
                      className="btn btn-outline-secondary"
                      onClick={() => setShowAiApiKey(!showAiApiKey)}
                      title={showAiApiKey ? "Hide Key" : "Show Key"}
                    >
                      <i className={`bi ${showAiApiKey ? "bi-eye-slash" : "bi-eye"}`}></i>
                    </button>
                  </div>
                  <div className="form-text text-muted">
                    The API key is securely saved in Firestore and dynamically loaded by the AI assistant.
                  </div>
                </div>

                {/* Base URL */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    API Base URL <span className="text-danger">*</span>
                  </label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-link-45deg text-muted"></i>
                    </span>
                    <input
                      type="url"
                      className="form-control"
                      value={aiSettings.baseUrl}
                      onChange={(e) => setAiSettings({ ...aiSettings, baseUrl: e.target.value })}
                      placeholder="https://api.hcnsec.cn/v1"
                      required
                    />
                  </div>
                </div>

                {/* Model Selection */}
                <div className="mb-4">
                  <label className="form-label fw-bold">
                    Model Name <span className="text-danger">*</span>
                  </label>
                  <div className="input-group mb-2">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-cpu text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={aiSettings.model}
                      onChange={(e) => setAiSettings({ ...aiSettings, model: e.target.value })}
                      placeholder="DeepSeek-V4-Flash"
                      required
                    />
                  </div>
                  <div className="d-flex flex-wrap gap-2 align-items-center">
                    <small className="text-muted me-1">Quick Select:</small>
                    {['DeepSeek-V4-Flash', 'DeepSeek-V4.1-Flash', 'qwen3.8-max', 'glm-5.3-flash', 'kimi-k3', 'auto'].map(m => (
                      <button
                        key={m}
                        type="button"
                        className={`btn btn-sm ${aiSettings.model === m ? 'btn-primary' : 'btn-outline-secondary'}`}
                        style={{ fontSize: '0.75rem', padding: '0.2rem 0.6rem' }}
                        onClick={() => setAiSettings({ ...aiSettings, model: m })}
                      >
                        {m}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Bot Name */}
                <div className="mb-4">
                  <label className="form-label fw-bold">Assistant Display Name</label>
                  <div className="input-group">
                    <span className="input-group-text bg-light">
                      <i className="bi bi-chat-dots text-muted"></i>
                    </span>
                    <input
                      type="text"
                      className="form-control"
                      value={aiSettings.botName}
                      onChange={(e) => setAiSettings({ ...aiSettings, botName: e.target.value })}
                      placeholder="Prodhan AI"
                    />
                  </div>
                </div>

                {/* System Prompt */}
                <div className="mb-4">
                  <div className="d-flex justify-content-between align-items-center mb-1">
                    <label className="form-label fw-bold mb-0">System Instructions / Behavior Prompt</label>
                    <button
                      type="button"
                      className="btn btn-link btn-sm p-0 text-decoration-none"
                      onClick={() => setAiSettings({ ...aiSettings, systemPrompt: DEFAULT_AI_CONFIG.systemPrompt })}
                    >
                      Reset to Default
                    </button>
                  </div>
                  <textarea
                    className="form-control font-monospace"
                    style={{ fontSize: '0.875rem' }}
                    rows={7}
                    value={aiSettings.systemPrompt}
                    onChange={(e) => setAiSettings({ ...aiSettings, systemPrompt: e.target.value })}
                    placeholder="System instructions for the AI assistant..."
                  />
                </div>

                {/* Test Result Alert */}
                {aiTestResult && (
                  <div className={`alert ${aiTestResult.success ? 'alert-success' : 'alert-danger'} d-flex align-items-center mb-4`}>
                    <i className={`bi ${aiTestResult.success ? 'bi-check-circle-fill' : 'bi-exclamation-triangle-fill'} me-2 fs-5`}></i>
                    <div>
                      {aiTestResult.success ? (
                        <>
                          <strong>Connection Successful!</strong>
                          <div className="small mt-1 text-secondary">Response: &quot;{aiTestResult.reply}&quot;</div>
                        </>
                      ) : (
                        <>
                          <strong>Connection Failed:</strong> {aiTestResult.error}
                        </>
                      )}
                    </div>
                  </div>
                )}

                {/* Buttons */}
                <div className="d-flex gap-3 pt-2">
                  <button
                    type="button"
                    className="btn btn-outline-primary"
                    onClick={handleTestAiConnection}
                    disabled={aiTesting || !aiSettings.apiKey}
                  >
                    {aiTesting ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Testing Connection...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-broadcast me-2"></i>Test Connection
                      </>
                    )}
                  </button>

                  <button
                    type="submit"
                    className="btn btn-primary px-4"
                    disabled={savingAiSettings || !aiSettings.apiKey}
                  >
                    {savingAiSettings ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status"></span>
                        Saving...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-save me-2"></i>Save AI Settings
                      </>
                    )}
                  </button>
                </div>
              </form>
            )}
          </div>
        </div>
      ) : (
        <div className="card">
          <div className="card-body">
            <div className="d-flex justify-content-between align-items-center mb-4">
              <h2 className="h4 mb-0">
                {editingItem ? 'Edit' : 'Add New'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
              </h2>
              {editingItem && (
                <button 
                  type="button" 
                  className="btn btn-secondary btn-sm" 
                  onClick={resetForm}
                >
                  Cancel
                </button>
              )}
            </div>



            <form onSubmit={handleSubmit}>
              {/* Project Form */}
              {activeTab === 'projects' && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="title" 
                      value={formData.title} 
                      onChange={(e) => setFormData({...formData, title: e.target.value})} 
                      required 
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea 
                      className="form-control" 
                      name="description" 
                      rows="3" 
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    ></textarea>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Category</label>
                    <select 
                      className="form-select" 
                      name="category" 
                      value={formData.category} 
                      onChange={(e) => setFormData({...formData, category: e.target.value})}
                    >
                      {categories.map(cat => (
                        <option key={cat.id} value={cat.id}>{cat.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Preview URL</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      name="previewUrl" 
                      value={formData.previewUrl} 
                      onChange={(e) => setFormData({...formData, previewUrl: e.target.value})} 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">GitHub URL</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      name="githubUrl" 
                      value={formData.githubUrl} 
                      onChange={(e) => setFormData({...formData, githubUrl: e.target.value})} 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Icon</label>
                    <select 
                      className="form-select" 
                      name="icon" 
                      value={formData.icon} 
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    >
                      {icons.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Icon Color</label>
                    <select 
                      className="form-select" 
                      name="iconColor" 
                      value={formData.iconColor} 
                      onChange={(e) => setFormData({...formData, iconColor: e.target.value})}
                    >
                      {iconColors.map(color => (
                        <option key={color.id} value={color.id}>{color.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Image</label>
                    {formData.imageUrl && (
                      <img src={formData.imageUrl} alt="Preview" className="img-thumbnail mb-2" style={{ maxWidth: '200px' }} />
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-control" 
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                    <small className="text-muted">Or enter URL manually:</small>
                    <input 
                      type="url" 
                      className="form-control mt-1" 
                      value={formData.imageUrl} 
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} 
                    />

                    {/* Upload Queue UI for this tab */}
                    {uploadQueue.length > 0 && (
                      <div className="mt-3">
                        <div className="row g-2">
                          {uploadQueue.map(item => (
                            <div key={item.id} className="col-3">
                              <div className="card h-100">
                                <img 
                                  src={item.preview} 
                                  alt="Uploading" 
                                  className="card-img-top" 
                                  style={{ height: '150px', objectFit: 'cover' }} 
                                />
                                <div className="card-body p-2">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <small>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</small>
                                    <small className="fw-bold">{item.progress}%</small>
                                  </div>
                                  {item.originalSize && (
                                    <div className="mb-1">
                                      <small className="text-muted">
                                        Original: {formatFileSize(item.originalSize)}
                                      </small>
                                    </div>
                                  )}
                                  {item.compressedSize && (
                                    <div className="mb-1">
                                      <small className="text-success">
                                        Compressed: {formatFileSize(item.compressedSize)}
                                        {item.originalSize && (
                                          <span className="text-muted ms-1">
                                            ({Math.round((1 - item.compressedSize / item.originalSize) * 100)}% smaller)
                                          </span>
                                        )}
                                      </small>
                                    </div>
                                  )}
                                  <div className="progress" style={{ height: '0.3rem' }}>
                                    <div 
                                      className={`progress-bar ${
                                        item.status === 'complete' ? 'bg-success' : 
                                        item.status === 'error' ? 'bg-danger' : 'progress-bar-striped progress-bar-animated'
                                      }`}
                                      style={{ width: `${item.progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Skill Form */}
              {activeTab === 'skills' && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Skill Name</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="name" 
                      value={formData.name} 
                      onChange={(e) => setFormData({...formData, name: e.target.value})} 
                      required 
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Proficiency (%)</label>
                    <input 
                      type="number" 
                      className="form-control" 
                      name="value" 
                      min="0" 
                      max="100" 
                      value={formData.value} 
                      onChange={(e) => setFormData({...formData, value: parseInt(e.target.value)})} 
                      required 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Icon</label>
                    <select 
                      className="form-select" 
                      name="icon" 
                      value={formData.icon} 
                      onChange={(e) => setFormData({...formData, icon: e.target.value})}
                    >
                      {icons.map(icon => (
                        <option key={icon} value={icon}>{icon}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Icon Color</label>
                    <select 
                      className="form-select" 
                      name="iconColor" 
                      value={formData.iconColor} 
                      onChange={(e) => setFormData({...formData, iconColor: e.target.value})}
                    >
                      {iconColors.map(color => (
                        <option key={color.id} value={color.id}>{color.label}</option>
                      ))}
                    </select>
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Image (optional)</label>
                    {formData.imageUrl && (
                      <img src={formData.imageUrl} alt="Preview" className="img-thumbnail mb-2" style={{ maxWidth: '200px' }} />
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      className="form-control" 
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                    <small className="text-muted">Or enter URL manually:</small>
                    <input 
                      type="url" 
                      className="form-control mt-1" 
                      value={formData.imageUrl} 
                      onChange={(e) => setFormData({...formData, imageUrl: e.target.value})} 
                    />

                    {/* Upload Queue UI */}
                    {uploadQueue.length > 0 && (
                      <div className="mt-3">
                        <div className="row g-2">
                          {uploadQueue.map(item => (
                            <div key={item.id} className="col-3">
                              <div className="card h-100">
                                <img 
                                  src={item.preview} 
                                  alt="Uploading" 
                                  className="card-img-top" 
                                  style={{ height: '150px', objectFit: 'cover' }} 
                                />
                                <div className="card-body p-2">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <small>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</small>
                                    <small className="fw-bold">{item.progress}%</small>
                                  </div>
                                  {item.originalSize && (
                                    <div className="mb-1">
                                      <small className="text-muted">
                                        Original: {formatFileSize(item.originalSize)}
                                      </small>
                                    </div>
                                  )}
                                  {item.compressedSize && (
                                    <div className="mb-1">
                                      <small className="text-success">
                                        Compressed: {formatFileSize(item.compressedSize)}
                                        {item.originalSize && (
                                          <span className="text-muted ms-1">
                                            ({Math.round((1 - item.compressedSize / item.originalSize) * 100)}% smaller)
                                          </span>
                                        )}
                                      </small>
                                    </div>
                                  )}
                                  <div className="progress" style={{ height: '0.3rem' }}>
                                    <div 
                                      className={`progress-bar ${
                                        item.status === 'complete' ? 'bg-success' : 
                                        item.status === 'error' ? 'bg-danger' : 'progress-bar-striped progress-bar-animated'
                                      }`}
                                      style={{ width: `${item.progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              {/* Posts/Research/Resources Form */}
              {(activeTab === 'posts' || activeTab === 'research' || activeTab === 'resources') && (
                <>
                  <div className="mb-3">
                    <label className="form-label">Title</label>
                    <input 
                      type="text" 
                      className="form-control" 
                      name="title" 
                      value={formData.title} 
                      onChange={(e) => setFormData({...formData, title: e.target.value})} 
                      required 
                    />
                  </div>
                  
                  <div className="mb-3">
                    <label className="form-label">Description</label>
                    <textarea 
                      className="form-control" 
                      name="description" 
                      rows="3" 
                      value={formData.description} 
                      onChange={(e) => setFormData({...formData, description: e.target.value})} 
                    ></textarea>
                  </div>

                  {activeTab === 'posts' && (
                    <div className="mb-3">
                      <label className="form-label">Content (optional, for longer posts)</label>
                      <textarea 
                        className="form-control" 
                        name="content" 
                        rows="10" 
                        value={formData.content || ''} 
                        onChange={(e) => setFormData({...formData, content: e.target.value})} 
                        placeholder="Write your long post content here..."
                      ></textarea>
                    </div>
                  )}

                  <div className="mb-3">
                    <label className="form-label">URL</label>
                    <input 
                      type="url" 
                      className="form-control" 
                      name="url" 
                      value={formData.url} 
                      onChange={(e) => setFormData({...formData, url: e.target.value})} 
                    />
                  </div>

                  <div className="mb-3">
                    <label className="form-label">Images (optional - multiple supported)</label>
                    {formData.imageUrl && (
                      <img src={formData.imageUrl} alt="Preview" className="img-thumbnail mb-2" style={{ maxWidth: '200px' }} />
                    )}
                    {formData.imageUrls && formData.imageUrls.length > 0 && (
                      <div className="mb-2">
                        <small className="text-muted">Current images ({formData.imageUrls.length}):</small>
                        <div className="row g-2 mt-1">
                          {formData.imageUrls.map((url, index) => (
                            <div key={index} className="col-3">
                              <img src={url} alt={`Image ${index + 1}`} className="img-thumbnail" style={{ maxWidth: '100%', height: '80px', objectFit: 'cover' }} />
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                    <input 
                      type="file" 
                      accept="image/*" 
                      multiple
                      className="form-control" 
                      onChange={(e) => handleImageUpload(e.target.files)}
                    />
                    <small className="text-muted">Or enter multiple URLs (one per line):</small>
                    <textarea 
                      className="form-control mt-1" 
                      rows="3"
                      value={formData.imageUrls ? formData.imageUrls.join('\n') : ''}
                      onChange={(e) => {
                        const urls = e.target.value.split('\n').filter(url => url.trim() !== '')
                        setFormData({
                          ...formData, 
                          imageUrls: urls,
                          imageUrl: urls[0] || ''
                        })
                      }}
                      placeholder="https://example.com/image1.jpg&#10;https://example.com/image2.jpg&#10;https://example.com/image3.jpg"
                    />

                    {/* Upload Queue UI */}
                    {uploadQueue.length > 0 && (
                      <div className="mt-3">
                        <div className="row g-2">
                          {uploadQueue.map(item => (
                            <div key={item.id} className="col-3">
                              <div className="card h-100">
                                <img 
                                  src={item.preview} 
                                  alt="Uploading" 
                                  className="card-img-top" 
                                  style={{ height: '150px', objectFit: 'cover' }} 
                                />
                                <div className="card-body p-2">
                                  <div className="d-flex justify-content-between align-items-center mb-1">
                                    <small>{item.status.charAt(0).toUpperCase() + item.status.slice(1)}</small>
                                    <small className="fw-bold">{item.progress}%</small>
                                  </div>
                                  {item.originalSize && (
                                    <div className="mb-1">
                                      <small className="text-muted">
                                        Original: {formatFileSize(item.originalSize)}
                                      </small>
                                    </div>
                                  )}
                                  {item.compressedSize && (
                                    <div className="mb-1">
                                      <small className="text-success">
                                        Compressed: {formatFileSize(item.compressedSize)}
                                        {item.originalSize && (
                                          <span className="text-muted ms-1">
                                            ({Math.round((1 - item.compressedSize / item.originalSize) * 100)}% smaller)
                                          </span>
                                        )}
                                      </small>
                                    </div>
                                  )}
                                  <div className="progress" style={{ height: '0.3rem' }}>
                                    <div 
                                      className={`progress-bar ${
                                        item.status === 'complete' ? 'bg-success' : 
                                        item.status === 'error' ? 'bg-danger' : 'progress-bar-striped progress-bar-animated'
                                      }`}
                                      style={{ width: `${item.progress}%` }}
                                    ></div>
                                  </div>
                                </div>
                              </div>
                            </div>
                          ))}
                        </div>
                      </div>
                    )}
                  </div>
                </>
              )}

              <div className="d-flex gap-2">
                <button type="submit" className="btn btn-primary">
                  {editingItem ? 'Update' : 'Add'} {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}
                </button>
                {uploading && <button className="btn btn-secondary" disabled>Uploading...</button>}
              </div>
            </form>

            <h3 className="h5 mt-5 mb-3">Existing {activeTab.charAt(0).toUpperCase() + activeTab.slice(1)}</h3>
            <div className="list-group">
              {data[activeTab].map(item => (
                <div key={item.id} className="list-group-item d-flex justify-content-between align-items-center">
                  <div>
                    <strong>{item.title || item.name}</strong>
                    {item.category && <span className="badge bg-secondary ms-2">{item.category}</span>}
                    {item.value && <span className="badge bg-primary ms-2">{item.value}%</span>}
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      type="button" 
                      className="btn btn-sm btn-warning" 
                      onClick={() => handleEdit(item)}
                    >
                      <i className="bi bi-pencil"></i>
                    </button>
                    <button 
                      type="button" 
                      className="btn btn-danger btn-sm" 
                      onClick={() => handleDelete(item.id)}
                    >
                      <i className="bi bi-trash"></i>
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
      </div>
    </div>
  )
}

export default AdminPanel
