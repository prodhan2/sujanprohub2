import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase'
import ReactMarkdown from 'react-markdown'
import { askProdhanAI } from '../services/aiService'
import { askKiraAI, generateKiraImage, generateKiraTTS, KIRA_MODELS } from '../services/kiraAiService'
import './ProdhanAIFullPage.css'

function ProdhanAIFullPage() {
  const navigate = useNavigate()

  // Active Mode: 'chat1' (Prodhan AI) | 'chat2' (Kira AI)
  const [chatMode, setChatMode] = useState('chat2') // Default to new Chat 2 to showcase Kira AI

  // Shared states
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [allProjects, setAllProjects] = useState([])
  const [downloadingRepo, setDownloadingRepo] = useState(null)
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)
  const fileInputRef = useRef(null)

  // -------------------------------------------------------------
  // Chat 1 (Prodhan AI) States
  // -------------------------------------------------------------
  const [chat1Query, setChat1Query] = useState('')
  const [chat1Searching, setChat1Searching] = useState(false)
  const [chat1Typing, setChat1Typing] = useState(false)
  const [localResults, setLocalResults] = useState([])
  const [githubResults, setGithubResults] = useState([])
  const [githubApiPage, setGithubApiPage] = useState(1)
  const [hasMoreGithubResults, setHasMoreGithubResults] = useState(true)
  const [loadingGithub, setLoadingGithub] = useState(false)
  const itemsPerPage = 100

  const [chat1Messages, setChat1Messages] = useState([
    {
      role: 'ai',
      text: '',
      fullText: 'Hello! I am Prodhan AI (Chat 1). I can answer questions about Sujan Prodhan, his skills, education, and search through his local projects and GitHub repositories. How can I help you today?'
    }
  ])

  // -------------------------------------------------------------
  // Chat 2 (Kira AI) States
  // -------------------------------------------------------------
  const [chat2Query, setChat2Query] = useState('')
  const [chat2Searching, setChat2Searching] = useState(false)
  const [chat2Typing, setChat2Typing] = useState(false)
  const [selectedKiraModel, setSelectedKiraModel] = useState('kira-3.5-flash')
  const [attachedImage, setAttachedImage] = useState(null) // base64 string for Vision
  const [generatingImage, setGeneratingImage] = useState(false)

  // TTS audio playback state
  const [playingAudioIndex, setPlayingAudioIndex] = useState(null)
  const [audioLoadingIndex, setAudioLoadingIndex] = useState(null)
  const currentAudioRef = useRef(null)

  const [chat2Messages, setChat2Messages] = useState([
    {
      role: 'ai',
      text: '',
      fullText: '👋 Hello! I am Kira AI (Chat 2), powered by the high-speed Kira Cognitive System.\n\nHere is what I can do for you:\n- 🚀 **Fast Chat & Reasoning**: Powered by Kira 3.5 Flash / Pro (1.0M context window).\n- 🖼️ **Image Generation**: Type `/image <description>` to generate AI images directly in chat!\n- 📎 **Vision Analysis**: Attach any photo or screenshot using the clip icon to analyze it.\n- 🔊 **Voice Speech (TTS)**: Click the speaker icon under my messages to listen to my voice.\n\nWhat would you like to explore today?'
    }
  ])

  // Fetch all projects from Firestore for Chat 1 search
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projectsList = snapshot.docs.map(d => ({
        id: d.id,
        ...d.data()
      }))
      setAllProjects(projectsList)
    })
    return unsubscribe
  }, [])

  // Fetch profile image from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(doc(db, 'portfolio', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const config = snapshot.data()
        setProfileImageUrl(config.profileImageUrl || '')
      }
    })
    return unsubscribe
  }, [])

  // -------------------------------------------------------------
  // Typing animation for Chat 1
  // -------------------------------------------------------------
  useEffect(() => {
    if (chatMode !== 'chat1') return
    const lastMessage = chat1Messages[chat1Messages.length - 1]
    if (lastMessage?.role === 'ai' && lastMessage?.fullText && lastMessage.text !== lastMessage.fullText) {
      setChat1Typing(true)
      const index = lastMessage.text.length
      if (index < lastMessage.fullText.length) {
        const remaining = lastMessage.fullText.length - index
        const step = remaining > 150 ? 5 : (remaining > 50 ? 3 : 1)
        const nextIndex = Math.min(index + step, lastMessage.fullText.length)
        const timer = setTimeout(() => {
          setChat1Messages(prev => {
            const next = [...prev]
            next[next.length - 1] = {
              ...next[next.length - 1],
              text: lastMessage.fullText.slice(0, nextIndex)
            }
            return next
          })
        }, 12)
        return () => clearTimeout(timer)
      } else {
        setChat1Typing(false)
      }
    } else {
      setChat1Typing(false)
    }
  }, [chat1Messages, chatMode])

  // -------------------------------------------------------------
  // Typing animation for Chat 2
  // -------------------------------------------------------------
  useEffect(() => {
    if (chatMode !== 'chat2') return
    const lastMessage = chat2Messages[chat2Messages.length - 1]
    if (lastMessage?.role === 'ai' && lastMessage?.fullText && lastMessage.text !== lastMessage.fullText) {
      setChat2Typing(true)
      const index = lastMessage.text.length
      if (index < lastMessage.fullText.length) {
        const remaining = lastMessage.fullText.length - index
        const step = remaining > 150 ? 6 : (remaining > 50 ? 3 : 1)
        const nextIndex = Math.min(index + step, lastMessage.fullText.length)
        const timer = setTimeout(() => {
          setChat2Messages(prev => {
            const next = [...prev]
            next[next.length - 1] = {
              ...next[next.length - 1],
              text: lastMessage.fullText.slice(0, nextIndex)
            }
            return next
          })
        }, 10)
        return () => clearTimeout(timer)
      } else {
        setChat2Typing(false)
      }
    } else {
      setChat2Typing(false)
    }
  }, [chat2Messages, chatMode])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [chat1Messages, chat2Messages, chat1Typing, chat2Typing, chatMode])

  // -------------------------------------------------------------
  // Chat 1 Search & Project logic
  // -------------------------------------------------------------
  const fetchGithubResults = async (query, page = 1) => {
    try {
      setLoadingGithub(true)
      const githubResponse = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${itemsPerPage}&page=${page}`
      )
      const githubData = await githubResponse.json()
      return { items: githubData.items || [], hasMore: githubData.items?.length === itemsPerPage }
    } catch (error) {
      console.error('GitHub search error:', error)
      return { items: [], hasMore: false }
    } finally {
      setLoadingGithub(false)
    }
  }

  const handleChat1Submit = async (e) => {
    e.preventDefault()
    const query = chat1Query.trim()
    if (!query) return

    setChat1Query('')
    const updatedMessages = [...chat1Messages, { role: 'user', text: query }]
    setChat1Messages(updatedMessages)
    setChat1Searching(true)
    setLocalResults([])
    setGithubResults([])
    setGithubApiPage(1)
    setHasMoreGithubResults(true)

    try {
      const isProjectQuery = /project|repo|github|কাজ|প্রজেক্ট|রিপো|সফটওয়্যার|অ্যাপ/i.test(query)
      let projectContext = ''

      if (isProjectQuery) {
        const searchKeywords = query.toLowerCase().replace(/projects|project|repos|repo|github|প্রজেক্ট|খুঁজে|দেখাও/gi, '').trim() || query.toLowerCase()

        const filteredLocalProjects = allProjects.filter(project =>
          project.title?.toLowerCase().includes(searchKeywords) ||
          project.description?.toLowerCase().includes(searchKeywords) ||
          project.category?.toLowerCase().includes(searchKeywords)
        )
        setLocalResults(filteredLocalProjects)

        const { items, hasMore } = await fetchGithubResults(searchKeywords || query, 1)
        setGithubResults(items)
        setHasMoreGithubResults(hasMore)
      }

      if (allProjects.length > 0) {
        projectContext = allProjects.map(p => `- ${p.title} (${p.category || 'General'}): ${p.description || ''}`).slice(0, 15).join('\n')
      }

      const aiReply = await askProdhanAI(updatedMessages, projectContext)

      setChat1Messages(prev => [...prev, {
        role: 'ai',
        text: '',
        fullText: aiReply
      }])
    } catch (error) {
      console.error('Chat 1 AI error:', error)
      setChat1Messages(prev => [...prev, {
        role: 'ai',
        text: '',
        fullText: 'দুঃখিত, এই মুহূর্তে উত্তর তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার চেষ্টা করুন।'
      }])
    } finally {
      setChat1Searching(false)
    }
  }

  // -------------------------------------------------------------
  // Chat 2 (Kira AI) Submission & Features
  // -------------------------------------------------------------
  const handleChat2Submit = async (e) => {
    if (e) e.preventDefault()
    const query = chat2Query.trim()
    const imageToAttach = attachedImage
    if (!query && !imageToAttach) return

    setChat2Query('')
    setAttachedImage(null)

    // Check if query is an Image Generation request (/image prompt or /img prompt)
    const isImageCommand = query.startsWith('/image ') || query.startsWith('/img ') || /^ছবি (আঁকো|বানাও|তৈরি করো)/i.test(query)
    
    if (isImageCommand) {
      const imagePrompt = query
        .replace(/^\/(image|img)\s+/i, '')
        .replace(/^ছবি (আঁকো|বানাও|তৈরি করো)\s*/i, '')
        .trim()

      const userMsg = { role: 'user', text: `🖼️ Generate image: "${imagePrompt}"` }
      setChat2Messages(prev => [...prev, userMsg])
      setGeneratingImage(true)

      try {
        const result = await generateKiraImage(imagePrompt, '1:1')
        if (result.success) {
          setChat2Messages(prev => [...prev, {
            role: 'ai',
            text: `Here is your generated image for: **"${imagePrompt}"**`,
            fullText: `Here is your generated image for: **"${imagePrompt}"**`,
            generatedImage: result.imageUrl,
            imagePrompt: imagePrompt
          }])
        } else {
          setChat2Messages(prev => [...prev, {
            role: 'ai',
            text: `দুঃখিত, ছবিটি তৈরি করা যায়নি: ${result.error}`,
            fullText: `দুঃখিত, ছবিটি তৈরি করা যায়নি: ${result.error}`
          }])
        }
      } catch (err) {
        setChat2Messages(prev => [...prev, {
          role: 'ai',
          text: `দুঃখিত, ছবি জেনারেশনে ত্রুটি হয়েছে।`,
          fullText: `দুঃখিত, ছবি জেনারেশনে ত্রুটি হয়েছে।`
        }])
      } finally {
        setGeneratingImage(false)
      }
      return
    }

    // Standard Chat / Vision Request
    const newUserMessage = {
      role: 'user',
      text: query || 'Analyze attached image',
      image: imageToAttach
    }

    const updatedMessages = [...chat2Messages, newUserMessage]
    setChat2Messages(updatedMessages)
    setChat2Searching(true)

    try {
      const aiReply = await askKiraAI(updatedMessages, selectedKiraModel, imageToAttach)

      setChat2Messages(prev => [...prev, {
        role: 'ai',
        text: '',
        fullText: aiReply
      }])
    } catch (error) {
      console.error('Kira AI Chat error:', error)
      setChat2Messages(prev => [...prev, {
        role: 'ai',
        text: '',
        fullText: 'দুঃখিত, Kira AI সার্ভার থেকে উত্তর পাওয়া যায়নি। অনুগ্রহ করে আবার চেষ্টা করুন।'
      }])
    } finally {
      setChat2Searching(false)
    }
  }

  // Handle image file selection for Vision
  const handleImageFileChange = (e) => {
    const file = e.target.files?.[0]
    if (!file) return

    if (!file.type.startsWith('image/')) {
      alert('অনুগ্রহ করে শুধুমাত্র ছবি ফাইল নির্বাচন করুন (JPG, PNG, WebP)।')
      return
    }

    if (file.size > 8 * 1024 * 1024) {
      alert('ছবির আকার সর্বোচ্চ 8MB হতে পারে।')
      return
    }

    const reader = new FileReader()
    reader.onload = () => {
      setAttachedImage(reader.result)
    }
    reader.readAsDataURL(file)
    e.target.value = ''
  }

  // Handle Text-to-Speech (TTS)
  const handlePlayTTS = async (text, msgIndex) => {
    // If currently playing this message, stop it
    if (playingAudioIndex === msgIndex) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      setPlayingAudioIndex(null)
      return
    }

    // Stop any previous playing audio
    if (currentAudioRef.current) {
      currentAudioRef.current.pause()
      currentAudioRef.current = null
    }

    setAudioLoadingIndex(msgIndex)

    try {
      const res = await generateKiraTTS(text)
      if (res.success && res.audioUrl) {
        const audio = new Audio(res.audioUrl)
        currentAudioRef.current = audio
        setPlayingAudioIndex(msgIndex)

        audio.onended = () => {
          setPlayingAudioIndex(null)
          currentAudioRef.current = null
        }
        audio.onerror = () => {
          setPlayingAudioIndex(null)
          currentAudioRef.current = null
        }

        await audio.play()
      } else {
        alert('ভয়েস অডিও তৈরি করা সম্ভব হয়নি।')
      }
    } catch (err) {
      console.error('TTS playback error:', err)
    } finally {
      setAudioLoadingIndex(null)
    }
  }

  // Copy text helper
  const handleCopyText = async (text) => {
    try {
      await navigator.clipboard.writeText(text)
      alert('Text copied to clipboard!')
    } catch (err) {
      console.error('Copy failed', err)
    }
  }

  // Clear chat helper
  const handleClearChat = () => {
    if (window.confirm('Are you sure you want to clear this conversation?')) {
      if (currentAudioRef.current) {
        currentAudioRef.current.pause()
        currentAudioRef.current = null
      }
      setPlayingAudioIndex(null)

      if (chatMode === 'chat1') {
        setChat1Messages([
          { role: 'ai', text: '', fullText: 'Conversation cleared! How can I help you?' }
        ])
        setLocalResults([])
        setGithubResults([])
      } else {
        setChat2Messages([
          { role: 'ai', text: '', fullText: 'Conversation cleared! How can Kira AI help you today?' }
        ])
      }
    }
  }

  // Direct repo download
  const handleDirectDownload = async (repo) => {
    const [owner, repoName] = repo.full_name.split('/')
    const defaultBranch = repo.default_branch || 'main'
    const downloadUrl = `https://github.com/${owner}/${repoName}/archive/refs/heads/${defaultBranch}.zip`

    setDownloadingRepo(repo.id)

    try {
      const response = await fetch(downloadUrl)
      const blob = await response.blob()
      const url = window.URL.createObjectURL(blob)
      const a = document.createElement('a')
      a.href = url
      a.download = `${repoName}-${defaultBranch}.zip`
      document.body.appendChild(a)
      a.click()
      a.remove()
      window.URL.revokeObjectURL(url)
    } catch (error) {
      console.error('Download error:', error)
      window.open(downloadUrl, '_blank')
    } finally {
      setDownloadingRepo(null)
    }
  }

  const activeMessages = chatMode === 'chat1' ? chat1Messages : chat2Messages
  const isTyping = chatMode === 'chat1' ? chat1Typing : chat2Typing
  const isSearching = chatMode === 'chat1' ? chat1Searching : (chat2Searching || generatingImage)

  return (
    <div className="prodhan-ai-full-page">
      {/* Hidden file input for Vision attachment */}
      <input
        type="file"
        ref={fileInputRef}
        onChange={handleImageFileChange}
        accept="image/*"
        style={{ display: 'none' }}
      />

      {/* Header */}
      <header className={`full-page-header ${chatMode === 'chat2' ? 'kira-theme' : ''}`}>
        <div className="header-content">
          <div className="header-left-side">
            <button className="back-btn" onClick={() => navigate('/')} title="Return to Portfolio">
              <i className="bi bi-arrow-left"></i>
            </button>
            <div className="header-left">
              <div className={`ai-avatar ${chatMode === 'chat2' ? 'kira' : ''}`}>
                {chatMode === 'chat1' && profileImageUrl ? (
                  <img src={profileImageUrl} alt="Prodhan" />
                ) : chatMode === 'chat2' ? (
                  <i className="bi bi-stars"></i>
                ) : (
                  <i className="bi bi-robot"></i>
                )}
              </div>
              <div className="header-info">
                <h1>
                  {chatMode === 'chat1' ? 'Prodhan AI' : 'Kira AI'}
                  <span className="status-badge">
                    {chatMode === 'chat1' ? 'Chat 1' : 'Chat 2'}
                  </span>
                </h1>
                <span className="status-text">
                  {chatMode === 'chat1' ? 'Portfolio & Project Assistant' : 'Cognitive System • 1.0M Context'}
                </span>
              </div>
            </div>
          </div>

          {/* Central Mode Switcher: Chat 1 vs Chat 2 */}
          <div className="chat-mode-switcher">
            <button
              type="button"
              className={`chat-tab-btn ${chatMode === 'chat1' ? 'active prodhan' : ''}`}
              onClick={() => setChatMode('chat1')}
            >
              <i className="bi bi-person-badge"></i>
              <span>Chat 1</span>
              <span className="chat-tab-badge">Prodhan</span>
            </button>
            <button
              type="button"
              className={`chat-tab-btn ${chatMode === 'chat2' ? 'active kira' : ''}`}
              onClick={() => setChatMode('chat2')}
            >
              <i className="bi bi-stars"></i>
              <span>Chat 2</span>
              <span className="chat-tab-badge">Kira AI</span>
            </button>
          </div>

          {/* Right Header Controls */}
          <div className="header-actions">
            <button
              type="button"
              className="header-action-btn"
              onClick={handleClearChat}
              title="Clear current chat"
            >
              <i className="bi bi-trash3"></i>
              <span>Clear</span>
            </button>
          </div>
        </div>
      </header>

      {/* Subbar for Chat 2: Kira Model Selector and features */}
      {chatMode === 'chat2' && (
        <div className="kira-subbar">
          <div className="kira-subbar-content">
            <div className="model-selector-group">
              <span className="model-label">
                <i className="bi bi-cpu me-1"></i>Model:
              </span>
              {KIRA_MODELS.map(m => (
                <button
                  key={m.id}
                  type="button"
                  className={`model-pill-btn ${selectedKiraModel === m.id ? 'active' : ''}`}
                  onClick={() => setSelectedKiraModel(m.id)}
                  title={m.desc}
                >
                  {m.id === 'kira-3.5-flash' && <i className="bi bi-lightning-charge-fill"></i>}
                  {m.id === 'kira-3.5-pro' && <i className="bi bi-award-fill"></i>}
                  {m.name}
                </button>
              ))}
            </div>
            <div className="kira-subbar-features">
              <span title="Ask to draw images with /image"><i className="bi bi-image"></i> AI Image Gen</span>
              <span title="Voice speech synthesis"><i className="bi bi-volume-up"></i> Voice TTS</span>
              <span title="Upload screenshots & photos"><i className="bi bi-eye"></i> Vision</span>
            </div>
          </div>
        </div>
      )}

      {/* Main Messages Container */}
      <main className="full-page-main">
        <div ref={messagesContainerRef} className="messages-container">
          {activeMessages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role} ${chatMode === 'chat2' ? 'kira' : ''}`}>
              <div className="message-wrapper">
                <div className={`msg-avatar ${chatMode === 'chat2' && msg.role === 'ai' ? 'kira' : ''}`}>
                  {msg.role === 'ai' ? (
                    chatMode === 'chat1' && profileImageUrl ? (
                      <img src={profileImageUrl} alt="Profile" />
                    ) : chatMode === 'chat2' ? (
                      <i className="bi bi-stars"></i>
                    ) : (
                      <i className="bi bi-robot"></i>
                    )
                  ) : (
                    <i className="bi bi-person-fill"></i>
                  )}
                </div>

                <div className="msg-content">
                  {/* If user attached an image */}
                  {msg.image && (
                    <div className="msg-attached-image">
                      <img src={msg.image} alt="User upload" />
                    </div>
                  )}

                  {/* Message Markdown Text */}
                  {msg.role === 'ai' ? (
                    <ReactMarkdown>{msg.text || ''}</ReactMarkdown>
                  ) : (
                    <div>{msg.text}</div>
                  )}

                  {/* If this AI message generated an image */}
                  {msg.generatedImage && (
                    <div className="generated-image-card">
                      <div className="generated-image-wrap">
                        <img src={msg.generatedImage} alt={msg.imagePrompt || 'Generated by Kira AI'} />
                      </div>
                      <div className="generated-image-footer">
                        <span className="generated-image-prompt" title={msg.imagePrompt}>
                          "{msg.imagePrompt}"
                        </span>
                        <a
                          href={msg.generatedImage}
                          download={`kira-ai-${Date.now()}.png`}
                          className="image-download-btn"
                        >
                          <i className="bi bi-download"></i> Download
                        </a>
                      </div>
                    </div>
                  )}

                  {/* Action bar for AI messages (Audio Speech / Copy) */}
                  {msg.role === 'ai' && msg.text && (
                    <div className="msg-actions-bar">
                      {chatMode === 'chat2' && (
                        <button
                          type="button"
                          className={`msg-action-btn ${playingAudioIndex === idx ? 'playing' : ''}`}
                          onClick={() => handlePlayTTS(msg.fullText || msg.text, idx)}
                          disabled={audioLoadingIndex === idx}
                          title="Listen to Kira voice speech"
                        >
                          {audioLoadingIndex === idx ? (
                            <>
                              <span className="spinner-border spinner-border-sm" style={{ width: 10, height: 10 }}></span>
                              <span>Loading...</span>
                            </>
                          ) : playingAudioIndex === idx ? (
                            <>
                              <div className="audio-wave">
                                <span></span><span></span><span></span>
                              </div>
                              <i className="bi bi-stop-fill text-danger ms-1"></i>
                              <span>Stop</span>
                            </>
                          ) : (
                            <>
                              <i className="bi bi-volume-up-fill text-primary"></i>
                              <span>Listen</span>
                            </>
                          )}
                        </button>
                      )}

                      <button
                        type="button"
                        className="msg-action-btn"
                        onClick={() => handleCopyText(msg.fullText || msg.text)}
                        title="Copy text"
                      >
                        <i className="bi bi-clipboard"></i>
                        <span>Copy</span>
                      </button>
                    </div>
                  )}
                </div>
              </div>
            </div>
          ))}

          {/* Chat 1 Local & GitHub Search Results */}
          {chatMode === 'chat1' && (localResults.length > 0 || githubResults.length > 0) && !isTyping && (
            <div className="message ai">
              <div className="message-wrapper">
                <div className="msg-avatar">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" />
                  ) : (
                    <i className="bi bi-robot"></i>
                  )}
                </div>
                <div className="msg-content projects-list">
                  {localResults.length > 0 && (
                    <>
                      <h4>Local Projects:</h4>
                      {localResults.map((project, index) => (
                        <div key={project.id} className="project-item">
                          <span className="serial-number">{index + 1}.</span>
                          <i className={`bi ${project.icon || 'bi-card-text'}`}></i>
                          <div>
                            <strong>{project.title}</strong>
                            {project.category && (
                              <span className="category-badge">{project.category}</span>
                            )}
                            <p>{project.description}</p>
                          </div>
                        </div>
                      ))}
                    </>
                  )}

                  {githubResults.length > 0 && (
                    <>
                      <h4>GitHub Repositories:</h4>
                      {githubResults.map((repo, index) => (
                        <div key={repo.id} className="project-item">
                          <span className="serial-number">{index + 1}.</span>
                          <i className="bi bi-github"></i>
                          <div>
                            <strong>
                              <a href={repo.html_url} target="_blank" rel="noopener noreferrer">
                                {repo.full_name}
                              </a>
                            </strong>
                            <div className="project-item-buttons">
                              <span className="category-badge">⭐ {repo.stargazers_count}</span>
                              <span className="category-badge" style={{ background: '#4a90d9' }}>
                                {repo.language || 'N/A'}
                              </span>
                              <button
                                onClick={() => handleDirectDownload(repo)}
                                disabled={downloadingRepo === repo.id}
                                className="download-zip-btn"
                                title="Download ZIP"
                              >
                                {downloadingRepo === repo.id ? (
                                  <i className="bi bi-hourglass-split"></i>
                                ) : (
                                  <i className="bi bi-file-earmark-zip"></i>
                                )}
                              </button>
                            </div>
                            <p>{repo.description || 'No description available'}</p>
                          </div>
                        </div>
                      ))}
                      {loadingGithub && (
                        <div style={{ textAlign: 'center', padding: '16px' }}>
                          <div className="typing-indicator">
                            <span></span><span></span><span></span>
                          </div>
                        </div>
                      )}
                    </>
                  )}
                </div>
              </div>
            </div>
          )}

          {/* Typing/Searching Indicators */}
          {(isSearching || isTyping) && (
            <div className={`message ai ${chatMode === 'chat2' ? 'kira' : ''}`}>
              <div className="message-wrapper">
                <div className={`msg-avatar ${chatMode === 'chat2' ? 'kira' : ''}`}>
                  {chatMode === 'chat2' ? (
                    <i className="bi bi-stars"></i>
                  ) : profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" />
                  ) : (
                    <i className="bi bi-robot"></i>
                  )}
                </div>
                <div className="msg-content">
                  <div className="d-flex align-items-center gap-2">
                    <div className="typing-indicator">
                      <span></span><span></span><span></span>
                    </div>
                    <span style={{ fontSize: '13px', color: '#64748b' }}>
                      {generatingImage ? 'Painting image with Kira AI...' : chatMode === 'chat2' ? 'Kira AI is thinking...' : 'Prodhan AI is typing...'}
                    </span>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* Quick Prompt Suggestion Chips for Chat 2 */}
          {chatMode === 'chat2' && chat2Messages.length <= 2 && (
            <div className="quick-prompt-chips">
              <span className="quick-prompt-title">
                <i className="bi bi-lightbulb"></i> Try asking Kira AI:
              </span>
              <button
                type="button"
                className="prompt-chip kira-chip"
                onClick={() => setChat2Query('Who is Sujan Prodhan and what are his top software skills?')}
              >
                👨‍💻 Tell me about Sujan Prodhan
              </button>
              <button
                type="button"
                className="prompt-chip kira-chip"
                onClick={() => setChat2Query('/image futuristic glowing cybernetic AI brain, digital neon art')}
              >
                🖼️ /image futuristic AI brain
              </button>
              <button
                type="button"
                className="prompt-chip kira-chip"
                onClick={() => setChat2Query('Write a clean React custom hook for debouncing search input')}
              >
                ⚡ Write a React debounce hook
              </button>
              <button
                type="button"
                className="prompt-chip kira-chip"
                onClick={() => setChat2Query('Explain quantum computing in simple Bengali')}
              >
                🇧🇩 কোয়ান্টাম কম্পিউটিং বাংলায় বুঝিয়ে বলো
              </button>
            </div>
          )}

          <div ref={messagesEndRef} />
        </div>

        {/* Input Bar */}
        <div className={`input-container ${chatMode === 'chat2' ? 'kira' : ''}`}>
          {/* Attachment Preview (Vision) */}
          {attachedImage && (
            <div className="attachment-preview-bar">
              <img src={attachedImage} alt="Attachment" className="attachment-thumb" />
              <span className="attachment-info">
                <i className="bi bi-image me-1"></i> Image attached for Kira Vision analysis
              </span>
              <button
                type="button"
                className="attachment-remove-btn"
                onClick={() => setAttachedImage(null)}
                title="Remove image"
              >
                <i className="bi bi-x-circle-fill"></i>
              </button>
            </div>
          )}

          <form
            className="input-form"
            onSubmit={chatMode === 'chat1' ? handleChat1Submit : handleChat2Submit}
          >
            {/* Vision / File attachment button for Chat 2 */}
            {chatMode === 'chat2' && (
              <button
                type="button"
                className="input-action-btn"
                onClick={() => fileInputRef.current?.click()}
                title="Attach photo or screenshot for Vision analysis"
              >
                <i className="bi bi-paperclip"></i>
              </button>
            )}

            {/* Quick Image Gen Prefix Button for Chat 2 */}
            {chatMode === 'chat2' && (
              <button
                type="button"
                className="input-action-btn"
                onClick={() => {
                  setChat2Query(prev => prev.startsWith('/image ') ? prev : `/image ${prev}`)
                }}
                title="Create AI Image (/image)"
              >
                <i className="bi bi-image"></i>
              </button>
            )}

            <textarea
              value={chatMode === 'chat1' ? chat1Query : chat2Query}
              onChange={(e) => {
                if (chatMode === 'chat1') setChat1Query(e.target.value)
                else setChat2Query(e.target.value)
              }}
              placeholder={
                chatMode === 'chat1'
                  ? "Ask Prodhan AI anything (e.g. 'Show me your projects')..."
                  : "Ask Kira AI anything or type '/image <prompt>' to draw..."
              }
              disabled={isSearching}
              rows={1}
              onKeyDown={(e) => {
                if (e.key === 'Enter' && !e.shiftKey) {
                  e.preventDefault()
                  if (chatMode === 'chat1') handleChat1Submit(e)
                  else handleChat2Submit(e)
                }
              }}
            />

            <button
              type="submit"
              className={`send-btn ${chatMode === 'chat2' ? 'kira' : ''}`}
              disabled={
                isSearching ||
                (chatMode === 'chat1' ? !chat1Query.trim() : (!chat2Query.trim() && !attachedImage))
              }
              title="Send message"
            >
              <i className="bi bi-send-fill"></i>
            </button>
          </form>
        </div>
      </main>
    </div>
  )
}

export default ProdhanAIFullPage
