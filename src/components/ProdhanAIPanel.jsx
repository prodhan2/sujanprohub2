import { useState, useEffect, useRef } from 'react'
import { useNavigate } from 'react-router-dom'
import { collection, onSnapshot, doc } from 'firebase/firestore'
import { db } from '../firebase'
import ReactMarkdown from 'react-markdown'
import { askProdhanAI } from '../services/aiService'
import './ProdhanAIPanel.css'

function ProdhanAIPanel({ onClose }) {
  const navigate = useNavigate()
  const [searchQuery, setSearchQuery] = useState('')
  const [searching, setSearching] = useState(false)
  const [typing, setTyping] = useState(false)
  const [localResults, setLocalResults] = useState([])
  const [githubResults, setGithubResults] = useState([])
  const [allProjects, setAllProjects] = useState([])
  const [profileImageUrl, setProfileImageUrl] = useState('')
  const [messages, setMessages] = useState([
    { role: 'ai', text: '', fullText: 'Hello! I am Prodhan AI. I can chat with you, answer questions about Sujan Prodhan, coding, or help you find projects. How can I help you today?' }
  ])
  const messagesEndRef = useRef(null)
  const messagesContainerRef = useRef(null)

  // GitHub pagination states
  const [currentPage, setCurrentPage] = useState(1)
  const [totalResults, setTotalResults] = useState(0)
  const [loadingGithub, setLoadingGithub] = useState(false)
  const itemsPerPage = 100
  const [downloadingRepo, setDownloadingRepo] = useState(null)

  // Calculate total pages (GitHub API max 1000 results = 10 pages)
  const maxResults = Math.min(totalResults, 1000)
  const totalPages = Math.ceil(maxResults / itemsPerPage)

  // Fetch all projects from Firestore
  useEffect(() => {
    const unsubscribe = onSnapshot(collection(db, 'projects'), (snapshot) => {
      const projectsList = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
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

  // Typing animation with adaptive speed for smooth rendering
  useEffect(() => {
    const lastMessage = messages[messages.length - 1]
    if (lastMessage?.role === 'ai' && lastMessage?.fullText && lastMessage.text !== lastMessage.fullText) {
      setTyping(true)
      const index = lastMessage.text.length
      if (index < lastMessage.fullText.length) {
        const remaining = lastMessage.fullText.length - index
        const step = remaining > 150 ? 5 : (remaining > 50 ? 3 : 1)
        const nextIndex = Math.min(index + step, lastMessage.fullText.length)
        const timer = setTimeout(() => {
          setMessages(prev => {
            const newMessages = [...prev]
            newMessages[newMessages.length - 1] = {
              ...newMessages[newMessages.length - 1],
              text: lastMessage.fullText.slice(0, nextIndex)
            }
            return newMessages
          })
        }, 15)
        return () => clearTimeout(timer)
      } else {
        setTyping(false)
      }
    } else {
      setTyping(false)
    }
  }, [messages])

  // Auto scroll to bottom
  useEffect(() => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' })
  }, [messages, typing, githubResults])

  // Fetch GitHub results for a specific page
  const fetchGithubPage = async (query, page = 1) => {
    try {
      setLoadingGithub(true)
      const githubResponse = await fetch(
        `https://api.github.com/search/repositories?q=${encodeURIComponent(query)}&sort=stars&order=desc&per_page=${itemsPerPage}&page=${page}`
      )
      const githubData = await githubResponse.json()
      return {
        items: githubData.items || [],
        totalCount: githubData.total_count || 0
      }
    } catch (error) {
      console.error('GitHub search error:', error)
      return { items: [], totalCount: 0 }
    } finally {
      setLoadingGithub(false)
    }
  }

  // Handle page change
  const handlePageChange = async (page) => {
    if (page < 1 || page > totalPages || page === currentPage || loadingGithub) return

    setCurrentPage(page)
    const { items } = await fetchGithubPage(searchQuery, page)
    setGithubResults(items)

    // Scroll to top of results
    if (messagesContainerRef.current) {
      messagesContainerRef.current.scrollTop = messagesContainerRef.current.scrollHeight
    }
  }

  // Direct download function
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

  const handleSearch = async (e) => {
    e.preventDefault()
    const query = searchQuery.trim()
    if (!query) return

    setSearchQuery('')
    const updatedMessages = [...messages, { role: 'user', text: query }]
    setMessages(updatedMessages)
    setSearching(true)
    setLocalResults([])
    setGithubResults([])
    setCurrentPage(1)
    setTotalResults(0)

    try {
      // 1. Check if user intends to search or look for projects
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

        // Fetch GitHub repositories
        const { items, totalCount } = await fetchGithubPage(searchKeywords || query, 1)
        setGithubResults(items)
        setTotalResults(totalCount)
      }

      // 2. Prepare portfolio context for AI
      if (allProjects.length > 0) {
        projectContext = allProjects.map(p => `- ${p.title} (${p.category || 'General'}): ${p.description || ''}`).slice(0, 15).join('\n')
      }

      // 3. Call DeepSeek / OpenAI compatible API
      const aiReply = await askProdhanAI(updatedMessages, projectContext)

      setMessages(prev => [...prev, {
        role: 'ai',
        text: '',
        fullText: aiReply
      }])
    } catch (error) {
      console.error('Search / AI error:', error)
      setMessages(prev => [...prev, {
        role: 'ai',
        text: '',
        fullText: 'দুঃখিত, এই মুহূর্তে উত্তর তৈরিতে সমস্যা হয়েছে। অনুগ্রহ করে আবার প্রশ্ন করুন।'
      }])
    } finally {
      setSearching(false)
    }
  }

  // Generate page numbers to display
  const getPageNumbers = () => {
    const pages = []
    const maxVisible = 5

    if (totalPages <= maxVisible) {
      for (let i = 1; i <= totalPages; i++) pages.push(i)
    } else {
      if (currentPage <= 3) {
        pages.push(1, 2, 3, 4, '...', totalPages)
      } else if (currentPage >= totalPages - 2) {
        pages.push(1, '...', totalPages - 3, totalPages - 2, totalPages - 1, totalPages)
      } else {
        pages.push(1, '...', currentPage - 1, currentPage, currentPage + 1, '...', totalPages)
      }
    }
    return pages
  }

  return (
    <div className="prodhan-ai-overlay" onClick={onClose}>
      <div className="prodhan-ai-panel" onClick={(e) => e.stopPropagation()}>
        <div className="panel-header">
          <div className="header-left">
            <div className="ai-avatar">
              {profileImageUrl ? (
                <img src={profileImageUrl} alt="Profile" />
              ) : (
                <i className="bi bi-robot"></i>
              )}
            </div>
            <div className="header-info">
              <h3>Prodhan AI</h3>
              <span className="status">Online</span>
            </div>
          </div>
          <div className="header-buttons">
            <button
              className="expand-btn"
              onClick={() => {
                onClose()
                navigate('/chatbot')
              }}
              title="Open Full Page"
            >
              <i className="bi bi-arrows-fullscreen"></i>
            </button>
            <button className="close-btn" onClick={onClose}>
              <i className="bi bi-x-lg"></i>
            </button>
          </div>
        </div>

        <div
          ref={messagesContainerRef}
          className="panel-messages"
          style={{ overflowY: 'auto' }}
        >
          {messages.map((msg, idx) => (
            <div key={idx} className={`message ${msg.role}`}>
              {msg.role === 'ai' && (
                <div className="msg-avatar">
                  {profileImageUrl ? (
                    <img src={profileImageUrl} alt="Profile" />
                  ) : (
                    <i className="bi bi-robot"></i>
                  )}
                </div>
              )}
              <div className="msg-content">
                {msg.role === 'ai' ? (
                  <ReactMarkdown>{msg.text}</ReactMarkdown>
                ) : (
                  msg.text
                )}
              </div>
            </div>
          ))}

          {(localResults.length > 0 || githubResults.length > 0) && !typing && (
            <div className="message ai">
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
                    <h4>Local Projects ({localResults.length}):</h4>
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
                    <h4>
                      GitHub Repositories
                      <span style={{ fontSize: '12px', color: '#888', fontWeight: 'normal', marginLeft: '8px' }}>
                        (মোট {totalResults.toLocaleString()} টি, Page {currentPage}/{totalPages})
                      </span>
                    </h4>

                    {/* Info about current page range */}
                    <div style={{
                      fontSize: '12px',
                      color: '#666',
                      marginBottom: '10px',
                      padding: '6px 10px',
                      background: '#f5f5f5',
                      borderRadius: '4px'
                    }}>
                      দেখানো হচ্ছে {(currentPage - 1) * itemsPerPage + 1} - {Math.min(currentPage * itemsPerPage, totalResults)} / {totalResults.toLocaleString()}
                    </div>

                    {githubResults.map((repo, index) => {
                      const globalIndex = (currentPage - 1) * itemsPerPage + index + 1
                      return (
                        <div key={repo.id} className="project-item">
                          <span className="serial-number">{globalIndex}.</span>
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
                      )
                    })}

                    {loadingGithub && (
                      <div style={{ textAlign: 'center', padding: '20px' }}>
                        <div className="typing-indicator">
                          <span></span><span></span><span></span>
                        </div>
                        <p style={{ fontSize: '12px', color: '#888', marginTop: '8px' }}>
                          লোড হচ্ছে...
                        </p>
                      </div>
                    )}

                    {/* Pagination Controls */}
                    {totalPages > 1 && (
                      <div className="pagination-container" style={{
                        display: 'flex',
                        justifyContent: 'center',
                        alignItems: 'center',
                        gap: '6px',
                        marginTop: '20px',
                        padding: '15px 0',
                        flexWrap: 'wrap'
                      }}>
                        {/* Previous Button */}
                        <button
                          onClick={() => handlePageChange(currentPage - 1)}
                          disabled={currentPage === 1 || loadingGithub}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            background: currentPage === 1 ? '#f5f5f5' : '#fff',
                            color: currentPage === 1 ? '#aaa' : '#333',
                            borderRadius: '4px',
                            cursor: currentPage === 1 ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          <i className="bi bi-chevron-left"></i> Previous
                        </button>

                        {/* Page Numbers */}
                        {getPageNumbers().map((page, idx) => (
                          page === '...' ? (
                            <span key={`dots-${idx}`} style={{ padding: '8px 4px', color: '#888' }}>...</span>
                          ) : (
                            <button
                              key={page}
                              onClick={() => handlePageChange(page)}
                              disabled={loadingGithub}
                              style={{
                                padding: '8px 12px',
                                border: '1px solid',
                                borderColor: page === currentPage ? '#4a90d9' : '#ddd',
                                background: page === currentPage ? '#4a90d9' : '#fff',
                                color: page === currentPage ? '#fff' : '#333',
                                borderRadius: '4px',
                                cursor: loadingGithub ? 'not-allowed' : 'pointer',
                                fontWeight: page === currentPage ? 'bold' : 'normal',
                                fontSize: '14px',
                                minWidth: '40px'
                              }}
                            >
                              {page}
                            </button>
                          )
                        ))}

                        {/* Next Button */}
                        <button
                          onClick={() => handlePageChange(currentPage + 1)}
                          disabled={currentPage === totalPages || loadingGithub}
                          style={{
                            padding: '8px 12px',
                            border: '1px solid #ddd',
                            background: currentPage === totalPages ? '#f5f5f5' : '#fff',
                            color: currentPage === totalPages ? '#aaa' : '#333',
                            borderRadius: '4px',
                            cursor: currentPage === totalPages ? 'not-allowed' : 'pointer',
                            fontSize: '14px'
                          }}
                        >
                          Next <i className="bi bi-chevron-right"></i>
                        </button>
                      </div>
                    )}

                    {/* GitHub API Limit Note */}
                    {totalResults > 1000 && (
                      <div style={{
                        textAlign: 'center',
                        fontSize: '11px',
                        color: '#999',
                        marginTop: '10px',
                        fontStyle: 'italic'
                      }}>
                        * GitHub API সীমার কারণে প্রথম ১০০০ টি রেজাল্ট দেখানো হচ্ছে
                      </div>
                    )}
                  </>
                )}
              </div>
            </div>
          )}

          {searching && (
            <div className="message ai">
              <div className="msg-avatar">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" />
                ) : (
                  <i className="bi bi-robot"></i>
                )}
              </div>
              <div className="msg-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}

          {typing && !searching && (
            <div className="message ai">
              <div className="msg-avatar">
                {profileImageUrl ? (
                  <img src={profileImageUrl} alt="Profile" />
                ) : (
                  <i className="bi bi-robot"></i>
                )}
              </div>
              <div className="msg-content">
                <div className="typing-indicator">
                  <span></span>
                  <span></span>
                  <span></span>
                </div>
              </div>
            </div>
          )}
          <div ref={messagesEndRef} />
        </div>

        <form className="panel-input" onSubmit={handleSearch}>
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Ask Prodhan AI anything..."
            disabled={searching}
          />
          <button type="submit" disabled={searching || !searchQuery.trim()}>
            <i className="bi bi-send"></i>
          </button>
        </form>
      </div>
    </div>
  )
}

export default ProdhanAIPanel