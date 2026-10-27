import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import JSZip from 'jszip'
import './MultiLanguageTranscription.css'

// Supported Languages List
const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect Language', native: 'স্বয়ংক্রিয় সনাক্তকরণ' },
  { code: 'bn-BD', name: 'Bengali (Bangladesh)', native: 'বাংলা (বাংলাদেশ)' },
  { code: 'bn-IN', name: 'Bengali (India)', native: 'বাংলা (ভারত)' },
  { code: 'en-US', name: 'English (US)', native: 'English (US)' },
  { code: 'en-GB', name: 'English (UK)', native: 'English (UK)' },
  { code: 'hi-IN', name: 'Hindi', native: 'हिन्दी' },
  { code: 'ar-SA', name: 'Arabic', native: 'العربية' },
  { code: 'es-ES', name: 'Spanish', native: 'Español' },
  { code: 'fr-FR', name: 'French', native: 'Français' },
  { code: 'de-DE', name: 'German', native: 'Deutsch' },
  { code: 'zh-CN', name: 'Chinese (Simplified)', native: '简体中文' },
  { code: 'ja-JP', name: 'Japanese', native: '日本語' },
  { code: 'ru-RU', name: 'Russian', native: 'Русский' },
  { code: 'pt-BR', name: 'Portuguese', native: 'Português' },
  { code: 'ur-PK', name: 'Urdu', native: 'اردو' },
  { code: 'tr-TR', name: 'Turkish', native: 'Türkçe' },
  { code: 'ko-KR', name: 'Korean', native: '한국어' },
  { code: 'it-IT', name: 'Italian', native: 'Italiano' }
]

// Pre-packaged demo sample segments for instant 1-click testing
const DEMO_SAMPLES = {
  bengali: {
    title: 'বাংলা অডিও ডেমো (Bangla Speech Sample)',
    fileName: 'bangla_tech_discussion.mp3',
    language: 'bn-BD',
    duration: 24,
    segments: [
      { id: 1, start: 0.5, end: 4.8, text: 'সুজন প্রধানের পোর্টফোলিওতে আপনাকে স্বাগতম।' },
      { id: 2, start: 5.2, end: 10.6, text: 'এটি একটি সম্পূর্ণ মাল্টি-ল্যাঙ্গুয়েজ অডিও এবং ভিডিও ট্রান্সক্রিপশন টুল।' },
      { id: 3, start: 11.0, end: 16.5, text: 'যেকোনো অডিও বা ভিডিও ফাইল আপলোড করলেই তা স্বয়ংক্রিয়ভাবে সাবটাইটেল তৈরি করবে।' },
      { id: 4, start: 17.0, end: 23.8, text: 'তৈরিকৃত ফাইলটি TXT, MD, SRT এবং VTT ফরম্যাটে এক ক্লিকেই ডাউনলোড করতে পারবেন।' }
    ]
  },
  english: {
    title: 'English Tech Talk Sample',
    fileName: 'ai_innovation_keynote.mp3',
    language: 'en-US',
    duration: 22,
    segments: [
      { id: 1, start: 0.6, end: 4.2, text: 'Welcome to Sujan Prodhan\'s AI and Web Engineering showcase.' },
      { id: 2, start: 4.8, end: 9.8, text: 'This tool performs real-time speech-to-text with multi-language synchronization.' },
      { id: 3, start: 10.3, end: 15.6, text: 'Convert speech from MP4, MP3, WAV, or M4A directly into precise timestamped cues.' },
      { id: 4, start: 16.0, end: 21.5, text: 'Instantly export your captions into TXT, Markdown, SRT subtitles, and WebVTT files.' }
    ]
  }
}

// Time Formatting Utilities
export function formatSRTTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0)
  const hrs = Math.floor(s / 3600).toString().padStart(2, '0')
  const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
  const secs = Math.floor(s % 60).toString().padStart(2, '0')
  const millis = Math.floor((s % 1) * 1000).toString().padStart(3, '0')
  return `${hrs}:${mins}:${secs},${millis}`
}

export function formatVTTTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0)
  const hrs = Math.floor(s / 3600).toString().padStart(2, '0')
  const mins = Math.floor((s % 3600) / 60).toString().padStart(2, '0')
  const secs = Math.floor(s % 60).toString().padStart(2, '0')
  const millis = Math.floor((s % 1) * 1000).toString().padStart(3, '0')
  return `${hrs}:${mins}:${secs}.${millis}`
}

export function formatDisplayTime(seconds) {
  const s = Math.max(0, Number(seconds) || 0)
  const mins = Math.floor(s / 60).toString().padStart(2, '0')
  const secs = Math.floor(s % 60).toString().padStart(2, '0')
  return `${mins}:${secs}`
}

// Generators for requested export formats
export function generateTXT(segments, includeTimestamps = false) {
  if (!includeTimestamps) {
    return segments.map(seg => seg.text.trim()).join(' ')
  }
  return segments.map(seg => `[${formatDisplayTime(seg.start)} - ${formatDisplayTime(seg.end)}] ${seg.text.trim()}`).join('\n\n')
}

export function generateMD(segments, metadata = {}) {
  const { fileName = 'audio_recording', duration = '00:00', language = 'Multi-Language' } = metadata
  const dateStr = new Date().toLocaleDateString()
  
  let md = `# 🎙️ Multi-Language Audio/Video Transcription Report\n\n`
  md += `| Attribute | Value |\n`
  md += `| :--- | :--- |\n`
  md += `| **Source File** | \`${fileName}\` |\n`
  md += `| **Duration** | ${duration} |\n`
  md += `| **Language** | ${language} |\n`
  md += `| **Total Subtitle Segments** | ${segments.length} |\n`
  md += `| **Export Date** | ${dateStr} |\n`
  md += `| **Author / Portfolio** | Sujan Prodhan |\n\n`
  md += `---\n\n`
  md += `## ⏱️ Timestamped Subtitles & Dialogue\n\n`
  segments.forEach((seg, idx) => {
    md += `> **[${formatDisplayTime(seg.start)} ➔ ${formatDisplayTime(seg.end)}]** (Cue #${idx + 1})\n`
    md += `> ${seg.text.trim()}\n>\n`
  })
  md += `---\n\n`
  md += `## 📄 Continuous Full Text Transcript\n\n`
  md += segments.map(seg => seg.text.trim()).join(' ') + `\n\n`
  return md
}

export function generateSRT(segments) {
  return segments.map((seg, idx) => {
    const start = formatSRTTime(seg.start)
    const end = formatSRTTime(seg.end)
    return `${idx + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`
  }).join('\n')
}

export function generateVTT(segments) {
  let content = "WEBVTT - Multi-Language Transcription by Sujan Prodhan\n\n"
  content += segments.map((seg, idx) => {
    const start = formatVTTTime(seg.start)
    const end = formatVTTTime(seg.end)
    return `${idx + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`
  }).join('\n')
  return content
}

function MultiLanguageTranscription() {
  // File & media states
  const [selectedFile, setSelectedFile] = useState(null)
  const [mediaUrl, setMediaUrl] = useState('')
  const [isVideo, setIsVideo] = useState(false)
  const [mediaDuration, setMediaDuration] = useState(0)
  const [currentTime, setCurrentTime] = useState(0)
  const [isPlaying, setIsPlaying] = useState(false)
  const [isDragging, setIsDragging] = useState(false)

  // Language & Engine settings
  const [selectedLanguage, setSelectedLanguage] = useState('bn-BD')
  const [engine, setEngine] = useState('groq') // 'groq', 'browser', 'openai', 'gemini'
  const [groqApiKey, setGroqApiKey] = useState(() => localStorage.getItem('groq_api_key') || '')
  const [openaiApiKey, setOpenaiApiKey] = useState(() => localStorage.getItem('openai_api_key') || '')
  const [showKeyModal, setShowKeyModal] = useState(false)

  // Transcription states
  const [segments, setSegments] = useState([])
  const [isTranscribing, setIsTranscribing] = useState(false)
  const [transcribeProgress, setTranscribeProgress] = useState(0)
  const [progressStatus, setProgressStatus] = useState('')
  const [activeSegmentIndex, setActiveSegmentIndex] = useState(-1)
  const [searchQuery, setSearchQuery] = useState('')

  // View & Export states
  const [activeTab, setActiveTab] = useState('segments') // 'segments', 'fulltext', 'export'
  const [exportPreviewFormat, setExportPreviewFormat] = useState('srt') // 'txt', 'md', 'srt', 'vtt'
  const [includeTxtTimestamps, setIncludeTxtTimestamps] = useState(true)
  const [copiedFormat, setCopiedFormat] = useState('')

  // Live recording states
  const [isRecording, setIsRecording] = useState(false)
  const [recordingSeconds, setRecordingSeconds] = useState(0)
  const mediaRecorderRef = useRef(null)
  const recordedChunksRef = useRef([])
  const recordingTimerRef = useRef(null)

  // DOM Refs
  const fileInputRef = useRef(null)
  const mediaElementRef = useRef(null)
  const recognitionRef = useRef(null)

  // Save API keys to localStorage
  useEffect(() => {
    if (groqApiKey) localStorage.setItem('groq_api_key', groqApiKey)
    if (openaiApiKey) localStorage.setItem('openai_api_key', openaiApiKey)
  }, [groqApiKey, openaiApiKey])

  // Track media playback currentTime for live subtitle highlight
  const handleTimeUpdate = () => {
    if (!mediaElementRef.current) return
    const cur = mediaElementRef.current.currentTime
    setCurrentTime(cur)
    
    // Find active subtitle cue
    const idx = segments.findIndex(s => cur >= s.start && cur <= s.end)
    setActiveSegmentIndex(idx)
  }

  // Handle file selection
  const processSelectedFile = (file) => {
    if (!file) return
    setSelectedFile(file)
    const isVid = file.type.startsWith('video/')
    setIsVideo(isVid)
    
    // Create local object URL
    const url = URL.createObjectURL(file)
    setMediaUrl(url)
    setSegments([])
    setActiveSegmentIndex(-1)
    setCurrentTime(0)
  }

  const handleDrop = (e) => {
    e.preventDefault()
    setIsDragging(false)
    if (e.dataTransfer.files && e.dataTransfer.files.length > 0) {
      processSelectedFile(e.dataTransfer.files[0])
    }
  }

  // Load preset demo sample
  const loadDemoSample = (sampleKey) => {
    const sample = DEMO_SAMPLES[sampleKey]
    if (!sample) return

    setSelectedFile({
      name: sample.fileName,
      size: 1024 * 1024 * 1.5,
      type: 'audio/mp3'
    })
    setIsVideo(false)
    setMediaUrl('') // In demo mode, synthetic or silence
    setSelectedLanguage(sample.language)
    setMediaDuration(sample.duration)
    setSegments(sample.segments)
    setActiveTab('segments')
    setProgressStatus(`Loaded ${sample.title} with ${sample.segments.length} segments!`)
  }

  // Jump player to segment start
  const seekToSegment = (startTime) => {
    if (mediaElementRef.current) {
      mediaElementRef.current.currentTime = startTime
      mediaElementRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  // Segment editing handlers
  const handleSegmentTextChange = (id, newText) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, text: newText } : seg))
  }

  const handleDeleteSegment = (id) => {
    setSegments(prev => prev.filter(seg => seg.id !== id))
  }

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1]
    const newStart = lastSeg ? Number((lastSeg.end + 0.5).toFixed(2)) : Number(currentTime.toFixed(2))
    const newEnd = Number((newStart + 4.0).toFixed(2))
    const newId = Date.now()
    setSegments(prev => [...prev, { id: newId, start: newStart, end: newEnd, text: 'New subtitle text...' }])
  }

  // Live Microphone Recording
  const startMicRecording = async () => {
    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true })
      recordedChunksRef.current = []
      const recorder = new MediaRecorder(stream)
      mediaRecorderRef.current = recorder

      recorder.ondataavailable = (e) => {
        if (e.data.size > 0) recordedChunksRef.current.push(e.data)
      }

      recorder.onstop = () => {
        const blob = new Blob(recordedChunksRef.current, { type: 'audio/webm' })
        const file = new File([blob], `mic_recording_${Date.now()}.webm`, { type: 'audio/webm' })
        processSelectedFile(file)
        stream.getTracks().forEach(t => t.stop())
      }

      recorder.start()
      setIsRecording(true)
      setRecordingSeconds(0)
      recordingTimerRef.current = setInterval(() => {
        setRecordingSeconds(sec => sec + 1)
      }, 1000)
    } catch (err) {
      console.error('Microphone error:', err)
      alert('Could not access microphone: ' + err.message)
    }
  }

  const stopMicRecording = () => {
    if (mediaRecorderRef.current && isRecording) {
      mediaRecorderRef.current.stop()
      setIsRecording(false)
      clearInterval(recordingTimerRef.current)
    }
  }

  // Web Speech API in-browser transcription
  const transcribeWithBrowserSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Your browser does not support Web Speech Recognition. Please try Google Chrome, Microsoft Edge, or switch to Groq Whisper AI engine.')
      return
    }

    setIsTranscribing(true)
    setProgressStatus('Initializing in-browser speech recognition...')
    setTranscribeProgress(20)

    try {
      const recognition = new SpeechRecognition()
      recognitionRef.current = recognition
      recognition.continuous = true
      recognition.interimResults = true
      recognition.lang = selectedLanguage === 'auto' ? 'en-US' : selectedLanguage

      let currentSegmentList = [...segments]
      let startTime = mediaElementRef.current ? mediaElementRef.current.currentTime : 0

      if (mediaElementRef.current) {
        mediaElementRef.current.play().catch(() => {})
        setIsPlaying(true)
      }

      recognition.onstart = () => {
        setTranscribeProgress(40)
        setProgressStatus(`Listening in ${selectedLanguage} (Syncing with playback/mic)...`)
      }

      recognition.onresult = (event) => {
        for (let i = event.resultIndex; i < event.results.length; ++i) {
          const transcript = event.results[i][0].transcript
          if (event.results[i].isFinal) {
            const endPlaybackTime = mediaElementRef.current ? mediaElementRef.current.currentTime : startTime + 4.0
            const seg = {
              id: Date.now() + Math.random(),
              start: Number(startTime.toFixed(2)),
              end: Number(Math.max(startTime + 1.5, endPlaybackTime).toFixed(2)),
              text: transcript.trim()
            }
            currentSegmentList = [...currentSegmentList, seg]
            setSegments([...currentSegmentList])
            startTime = endPlaybackTime + 0.2
            setTranscribeProgress(Math.min(95, currentSegmentList.length * 15))
          }
        }
      }

      recognition.onerror = (e) => {
        console.warn('Speech recognition status:', e.error)
        if (e.error !== 'no-speech') {
          setProgressStatus(`Recognition info: ${e.error}.`)
        }
      }

      recognition.onend = () => {
        setIsTranscribing(false)
        setTranscribeProgress(100)
        setProgressStatus('Transcription completed! You can now review, edit, or export.')
      }

      recognition.start()
    } catch (err) {
      console.error(err)
      setIsTranscribing(false)
      alert('Error initializing Speech Recognition: ' + err.message)
    }
  }

  // Cloud Whisper AI Transcription (Groq or OpenAI)
  const transcribeWithWhisperAPI = async (provider = 'groq') => {
    if (!selectedFile) {
      alert('Please select or drop an audio or video file first!')
      return
    }

    const key = provider === 'groq' ? groqApiKey : openaiApiKey
    if (!key) {
      setShowKeyModal(true)
      return
    }

    setIsTranscribing(true)
    setTranscribeProgress(15)
    setProgressStatus(`Preparing ${selectedFile.name} for ${provider === 'groq' ? 'Groq Whisper-large-v3' : 'OpenAI Whisper'}...`)

    try {
      const endpoint = provider === 'groq' 
        ? 'https://api.groq.com/openai/v1/audio/transcriptions'
        : 'https://api.openai.com/v1/audio/transcriptions'
      const model = provider === 'groq' ? 'whisper-large-v3' : 'whisper-1'

      const formData = new FormData()
      formData.append('file', selectedFile)
      formData.append('model', model)
      formData.append('response_format', 'verbose_json')
      if (selectedLanguage && selectedLanguage !== 'auto') {
        // Pass language code without regional tag (e.g., 'bn' or 'en')
        formData.append('language', selectedLanguage.split('-')[0])
      }

      setTranscribeProgress(45)
      setProgressStatus('Transcribing speech with AI neural model (detecting cues & timestamps)...')

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`
        },
        body: formData
      })

      setTranscribeProgress(80)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API request failed with status ${response.status}`)
      }

      const data = await response.json()
      setTranscribeProgress(95)
      setProgressStatus('Formatting subtitle cues and timing...')

      // Process segments from verbose_json
      if (data.segments && data.segments.length > 0) {
        const parsedSegments = data.segments.map((seg, idx) => ({
          id: seg.id ?? idx + 1,
          start: Number(seg.start.toFixed(2)),
          end: Number(seg.end.toFixed(2)),
          text: seg.text.trim()
        }))
        setSegments(parsedSegments)
      } else if (data.text) {
        // Fallback if no granular segments
        const duration = mediaElementRef.current?.duration || 10
        setSegments([
          { id: 1, start: 0, end: Number(duration.toFixed(2)), text: data.text.trim() }
        ])
      }

      setTranscribeProgress(100)
      setProgressStatus(`Success! Generated ${data.segments?.length || 1} subtitle segments in ${data.language || selectedLanguage}.`)
      setActiveTab('segments')
    } catch (err) {
      console.error('Transcription error:', err)
      alert(`Transcription Failed: ${err.message}`)
      setProgressStatus(`Error: ${err.message}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  // Main Transcribe Trigger
  const handleStartTranscribe = () => {
    if (engine === 'browser') {
      transcribeWithBrowserSpeech()
    } else if (engine === 'groq') {
      transcribeWithWhisperAPI('groq')
    } else if (engine === 'openai') {
      transcribeWithWhisperAPI('openai')
    }
  }

  // Stop transcription if in progress
  const handleStopTranscribe = () => {
    if (recognitionRef.current) {
      recognitionRef.current.stop()
    }
    setIsTranscribing(false)
    setProgressStatus('Transcription stopped by user.')
  }

  // Filtered segments for search
  const filteredSegments = useMemo(() => {
    if (!searchQuery.trim()) return segments
    return segments.filter(seg => seg.text.toLowerCase().includes(searchQuery.toLowerCase()))
  }, [segments, searchQuery])

  // Statistics
  const totalWords = useMemo(() => {
    return segments.reduce((sum, seg) => sum + (seg.text.trim().split(/\s+/).filter(Boolean).length), 0)
  }, [segments])

  const totalChars = useMemo(() => {
    return segments.reduce((sum, seg) => sum + seg.text.length, 0)
  }, [segments])

  // Export content strings
  const exportStrings = useMemo(() => {
    const meta = {
      fileName: selectedFile?.name || 'media_transcription',
      duration: formatDisplayTime(mediaDuration),
      language: SUPPORTED_LANGUAGES.find(l => l.code === selectedLanguage)?.name || selectedLanguage
    }
    return {
      txt: generateTXT(segments, includeTxtTimestamps),
      md: generateMD(segments, meta),
      srt: generateSRT(segments),
      vtt: generateVTT(segments)
    }
  }, [segments, selectedFile, mediaDuration, selectedLanguage, includeTxtTimestamps])

  // Single file download helper
  const downloadFile = (filename, content, mimeType = 'text/plain;charset=utf-8') => {
    const blob = new Blob([content], { type: mimeType })
    const url = URL.createObjectURL(blob)
    const a = document.createElement('a')
    a.href = url
    a.download = filename
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Download All as ZIP (TXT, MD, SRT, VTT)
  const downloadAllAsZip = async () => {
    if (segments.length === 0) return
    const zip = new JSZip()
    const baseName = (selectedFile?.name || 'transcript').replace(/\.[^/.]+$/, "")

    zip.file(`${baseName}.txt`, exportStrings.txt)
    zip.file(`${baseName}.md`, exportStrings.md)
    zip.file(`${baseName}.srt`, exportStrings.srt)
    zip.file(`${baseName}.vtt`, exportStrings.vtt)

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}_subtitles_bundle.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

  // Copy to clipboard
  const copyToClipboard = async (text, formatKey) => {
    try {
      await navigator.clipboard.writeText(text)
      setCopiedFormat(formatKey)
      setTimeout(() => setCopiedFormat(''), 2500)
    } catch (err) {
      alert('Failed to copy: ' + err.message)
    }
  }

  const baseFileName = (selectedFile?.name || 'transcription').replace(/\.[^/.]+$/, "")

  return (
    <div className="transcription-container">
      <div className="transcription-wrapper">
        
        {/* Breadcrumb / Top Bar */}
        <div className="d-flex justify-content-between align-items-center mb-3">
          <Link to="/" className="text-secondary text-decoration-none">
            <i className="bi bi-arrow-left me-2"></i>Back to Home
          </Link>
          <div className="d-flex align-items-center gap-2">
            <button 
              className="btn btn-sm btn-secondary-dark"
              onClick={() => setShowKeyModal(true)}
              title="Configure AI API Keys"
            >
              <i className="bi bi-key-fill text-warning me-1"></i>
              API Keys {groqApiKey ? '(Connected)' : ''}
            </button>
          </div>
        </div>

        {/* Hero Header Banner */}
        <div className="transcription-header">
          <div className="header-badge">
            <i className="bi bi-soundwave"></i>
            <span>AI Powered Multi-Language Engine</span>
          </div>
          <h1 className="header-title">
            Multi-Language <span className="text-gradient">Transcription</span> & Subtitles
          </h1>
          <p className="header-desc">
            Convert any video or audio file into precise, time-synchronized subtitles and text transcripts in 
            <strong> Bengali, English, Hindi, Arabic, Spanish</strong>, and 70+ languages. 
            Download instantly in all industry standard formats: 
            <strong> TXT, MD, SRT, and VTT</strong>.
          </p>
          <div className="header-pills">
            <span className="format-pill txt"><i className="bi bi-filetype-txt me-1"></i>TXT Export</span>
            <span className="format-pill md"><i className="bi bi-filetype-md me-1"></i>Markdown Report</span>
            <span className="format-pill srt"><i className="bi bi-badge-cc me-1"></i>SRT Subtitles</span>
            <span className="format-pill vtt"><i className="bi bi-badge-cc-fill me-1"></i>WebVTT Captions</span>
            <span className="format-pill"><i className="bi bi-translate me-1"></i>70+ Languages</span>
            <span className="format-pill"><i className="bi bi-mic me-1"></i>Live Voice Input</span>
          </div>
        </div>

        {/* Upload & Source Selection Card */}
        <div className="glass-card">
          <div className="card-topbar">
            <h5 className="card-topbar-title">
              <i className="bi bi-file-earmark-play text-warning"></i>
              Step 1: Choose Audio/Video Source
            </h5>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <span className="text-muted small">Try sample:</span>
              <button 
                className="sample-pill-btn" 
                onClick={() => loadDemoSample('bengali')}
              >
                🇧🇩 বাংলা ডেমো
              </button>
              <button 
                className="sample-pill-btn" 
                onClick={() => loadDemoSample('english')}
              >
                🇺🇸 English Demo
              </button>
            </div>
          </div>

          <div className="p-4">
            {/* Drag & Drop Area */}
            <div 
              className={`dropzone-area ${isDragging ? 'dragging' : ''}`}
              onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
              onDragLeave={() => setIsDragging(false)}
              onDrop={handleDrop}
              onClick={() => fileInputRef.current?.click()}
            >
              <i className="bi bi-cloud-arrow-up dropzone-icon"></i>
              <div className="dropzone-title">
                {selectedFile ? selectedFile.name : 'Drag & Drop Video or Audio File Here'}
              </div>
              <div className="dropzone-subtitle">
                Supports MP4, WEBM, MKV, MOV, MP3, WAV, M4A, OGG, AAC, FLAC (Up to 500MB)
              </div>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button 
                  type="button" 
                  className="btn btn-sm btn-primary px-3 py-2 fw-bold"
                  style={{ background: '#f9532d', borderColor: '#f9532d' }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <i className="bi bi-folder2-open me-2"></i>Browse Local File
                </button>
                <button
                  type="button"
                  className={`btn btn-sm ${isRecording ? 'btn-danger' : 'btn-outline-danger'} px-3 py-2 fw-bold`}
                  onClick={(e) => {
                    e.stopPropagation();
                    isRecording ? stopMicRecording() : startMicRecording();
                  }}
                >
                  <i className={`bi ${isRecording ? 'bi-stop-circle-fill' : 'bi-mic-fill'} me-2`}></i>
                  {isRecording ? `Recording... (${recordingSeconds}s) Click to Stop` : 'Record from Microphone'}
                </button>
              </div>
              <input 
                type="file" 
                ref={fileInputRef} 
                style={{ display: 'none' }} 
                accept="audio/*,video/*,.mp3,.wav,.m4a,.aac,.ogg,.flac,.mp4,.webm,.mkv,.mov,.avi" 
                onChange={(e) => {
                  if (e.target.files?.[0]) processSelectedFile(e.target.files[0])
                }} 
              />
            </div>

            {/* Media Player & Live Synchronizer */}
            {mediaUrl && (
              <div className="media-preview-box mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold text-light">
                    <i className={`bi ${isVideo ? 'bi-film' : 'bi-soundwave'} me-2 text-warning`}></i>
                    Media Player & Live Subtitle Preview
                  </span>
                  <span className="file-meta-pill">
                    {formatDisplayTime(currentTime)} / {formatDisplayTime(mediaDuration)}
                  </span>
                </div>

                <div className="media-player-wrapper">
                  {isVideo ? (
                    <video 
                      ref={mediaElementRef}
                      src={mediaUrl}
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={(e) => setMediaDuration(e.target.duration)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  ) : (
                    <audio 
                      ref={mediaElementRef}
                      src={mediaUrl}
                      controls
                      onTimeUpdate={handleTimeUpdate}
                      onLoadedMetadata={(e) => setMediaDuration(e.target.duration)}
                      onPlay={() => setIsPlaying(true)}
                      onPause={() => setIsPlaying(false)}
                    />
                  )}

                  {/* Active Subtitle Cue Overlay */}
                  {activeSegmentIndex >= 0 && segments[activeSegmentIndex] && (
                    <div className="subtitle-live-overlay">
                      {segments[activeSegmentIndex].text}
                    </div>
                  )}
                </div>

                <div className="media-controls-bar">
                  <div className="d-flex gap-2 flex-wrap align-items-center">
                    <span className="file-meta-pill">
                      <i className="bi bi-file-earmark me-1"></i>{selectedFile?.name}
                    </span>
                    <span className="file-meta-pill">
                      <i className="bi bi-hdd me-1"></i>
                      {selectedFile?.size ? (selectedFile.size / (1024 * 1024)).toFixed(2) + ' MB' : '0 MB'}
                    </span>
                  </div>
                  <div className="d-flex gap-2">
                    <button 
                      className="btn btn-sm btn-secondary-dark"
                      onClick={() => {
                        if (mediaElementRef.current) {
                          mediaElementRef.current.currentTime = Math.max(0, mediaElementRef.current.currentTime - 5)
                        }
                      }}
                      title="Rewind 5s"
                    >
                      <i className="bi bi-arrow-counterclockwise"></i> -5s
                    </button>
                    <button 
                      className="btn btn-sm btn-secondary-dark"
                      onClick={() => {
                        if (mediaElementRef.current) {
                          mediaElementRef.current.currentTime = Math.min(mediaDuration, mediaElementRef.current.currentTime + 5)
                        }
                      }}
                      title="Forward 5s"
                    >
                      +5s <i className="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Language & Engine Options */}
            <div className="settings-grid mt-4">
              <div>
                <label className="form-label-custom">
                  <i className="bi bi-translate text-primary"></i> Spoken / Target Language:
                </label>
                <select 
                  className="select-dark w-100" 
                  value={selectedLanguage}
                  onChange={(e) => setSelectedLanguage(e.target.value)}
                >
                  {SUPPORTED_LANGUAGES.map(lang => (
                    <option key={lang.code} value={lang.code}>
                      {lang.native} - {lang.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="form-label-custom">
                  <i className="bi bi-cpu text-warning"></i> Transcription Engine:
                </label>
                <select 
                  className="select-dark w-100" 
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                >
                  <option value="groq">Groq Whisper Large-v3 (Ultra-Fast AI)</option>
                  <option value="browser">Browser Native Speech (Offline & 100% Free)</option>
                  <option value="openai">OpenAI Whisper-1 Official</option>
                </select>
              </div>
            </div>

            {/* Engine Notice / Help */}
            <div className="p-3 mb-3 rounded" style={{ background: '#0d1117', border: '1px solid #21262d' }}>
              <div className="d-flex justify-content-between align-items-center flex-wrap gap-2">
                <div className="small text-muted">
                  {engine === 'groq' && (
                    <>
                      <strong className="text-info">Groq Whisper AI:</strong> Transcribes 10-minute audio in ~3 seconds with millisecond timestamp cues for Bengali, English & 98 languages. 
                      {groqApiKey ? ' (API Key is configured)' : ' (Needs Groq Key — click "API Keys" to configure or use Browser engine).'}
                    </>
                  )}
                  {engine === 'browser' && (
                    <>
                      <strong className="text-success">Browser Speech Engine:</strong> 100% free, runs client-side with Chrome/Edge Web Speech API. Syncs speech with playback.
                    </>
                  )}
                  {engine === 'openai' && (
                    <>
                      <strong className="text-warning">OpenAI Whisper:</strong> Standard OpenAI Whisper model with full punctuation and segment timestamps.
                    </>
                  )}
                </div>
                {!groqApiKey && engine === 'groq' && (
                  <button 
                    className="btn btn-sm btn-outline-warning py-1"
                    onClick={() => setShowKeyModal(true)}
                  >
                    Add API Key
                  </button>
                )}
              </div>
            </div>

            {/* Transcribe Trigger Actions */}
            <div className="d-flex gap-3 align-items-center flex-wrap pt-2">
              <button 
                className="btn-transcribe-main"
                disabled={isTranscribing || (!selectedFile && segments.length === 0)}
                onClick={handleStartTranscribe}
              >
                {isTranscribing ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    Transcribing Audio...
                  </>
                ) : (
                  <>
                    <i className="bi bi-magic"></i>
                    Start Multi-Language Transcription
                  </>
                )}
              </button>

              {isTranscribing && (
                <button 
                  className="btn btn-secondary-dark"
                  onClick={handleStopTranscribe}
                >
                  <i className="bi bi-stop-circle text-danger"></i> Stop
                </button>
              )}

              {segments.length > 0 && (
                <div className="audio-wave-anim ms-auto">
                  <div className="audio-wave-bar"></div>
                  <div className="audio-wave-bar"></div>
                  <div className="audio-wave-bar"></div>
                  <div className="audio-wave-bar"></div>
                  <div className="audio-wave-bar"></div>
                  <span className="text-success small ms-2 fw-bold">
                    {segments.length} Cues Ready
                  </span>
                </div>
              )}
            </div>

            {/* Progress Bar & Status */}
            {(isTranscribing || progressStatus) && (
              <div className="progress-dark-container">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="small text-light fw-bold">
                    <i className="bi bi-gear-wide-connected me-1 text-warning"></i>
                    {progressStatus}
                  </span>
                  <span className="small text-muted">{transcribeProgress}%</span>
                </div>
                <div className="progress-dark">
                  <div 
                    className="progress-bar-glow h-100" 
                    style={{ width: `${transcribeProgress}%`, transition: 'width 0.4s ease' }}
                  ></div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Results, Subtitle Editor & Export Hub */}
        {segments.length > 0 && (
          <div className="glass-card">
            {/* Custom Navigation Tabs */}
            <div className="custom-tabs-nav">
              <button 
                className={`custom-tab-btn ${activeTab === 'segments' ? 'active' : ''}`}
                onClick={() => setActiveTab('segments')}
              >
                <i className="bi bi-list-task"></i> Subtitle Segments ({segments.length})
              </button>
              <button 
                className={`custom-tab-btn ${activeTab === 'fulltext' ? 'active' : ''}`}
                onClick={() => setActiveTab('fulltext')}
              >
                <i className="bi bi-file-text"></i> Full Text Transcript
              </button>
              <button 
                className={`custom-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
                onClick={() => setActiveTab('export')}
              >
                <i className="bi bi-download text-warning"></i> Export Center (TXT, MD, SRT, VTT)
              </button>
            </div>

            {/* Tab 1: Subtitle Segments Editor */}
            {activeTab === 'segments' && (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="input-group input-group-sm" style={{ maxWidth: '280px' }}>
                      <span className="input-group-text bg-dark border-secondary text-secondary">
                        <i className="bi bi-search"></i>
                      </span>
                      <input 
                        type="text" 
                        className="form-control form-control-dark" 
                        placeholder="Search dialogue words..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2 align-items-center">
                    <span className="text-muted small">
                      {totalWords} words | {totalChars} characters
                    </span>
                    <button 
                      className="btn btn-sm btn-secondary-dark"
                      onClick={handleAddSegment}
                    >
                      <i className="bi bi-plus-circle me-1 text-success"></i> Add Cue
                    </button>
                  </div>
                </div>

                <div className="segments-list-container">
                  {filteredSegments.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      No matching subtitle segments found for "{searchQuery}".
                    </div>
                  ) : (
                    filteredSegments.map((seg, idx) => (
                      <div 
                        key={seg.id} 
                        className={`segment-item ${idx === activeSegmentIndex ? 'active' : ''}`}
                      >
                        <div className="segment-header">
                          <div className="d-flex align-items-center gap-2">
                            <span className="badge bg-secondary">#{idx + 1}</span>
                            <span 
                              className="segment-time-pill"
                              onClick={() => seekToSegment(seg.start)}
                              title="Click to jump and play here"
                            >
                              <i className="bi bi-play-fill me-1"></i>
                              {formatDisplayTime(seg.start)} ➔ {formatDisplayTime(seg.end)}
                            </span>
                            <span className="text-muted small">
                              ({(seg.end - seg.start).toFixed(1)}s)
                            </span>
                          </div>
                          <div>
                            <button 
                              className="btn btn-sm text-danger p-0 border-0 bg-transparent"
                              onClick={() => handleDeleteSegment(seg.id)}
                              title="Delete this segment"
                            >
                              <i className="bi bi-trash"></i>
                            </button>
                          </div>
                        </div>
                        <textarea 
                          rows={2}
                          className="segment-text-input"
                          value={seg.text}
                          onChange={(e) => handleSegmentTextChange(seg.id, e.target.value)}
                        />
                      </div>
                    ))
                  )}
                </div>
              </div>
            )}

            {/* Tab 2: Full Continuous Text */}
            {activeTab === 'fulltext' && (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-light mb-0">Continuous Reading View</h6>
                  <button 
                    className="btn btn-sm btn-secondary-dark"
                    onClick={() => copyToClipboard(generateTXT(segments, false), 'fulltext')}
                  >
                    <i className={`bi ${copiedFormat === 'fulltext' ? 'bi-check2 text-success' : 'bi-clipboard'} me-1`}></i>
                    {copiedFormat === 'fulltext' ? 'Copied Full Text!' : 'Copy Entire Text'}
                  </button>
                </div>
                <div 
                  className="p-3 rounded"
                  style={{ 
                    background: '#0d1117', 
                    border: '1px solid #30363d', 
                    lineHeight: '1.8', 
                    fontSize: '1rem',
                    color: '#c9d1d9',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {generateTXT(segments, false)}
                </div>
              </div>
            )}

            {/* Tab 3: Export Center (Requested: TXT, MD, SRT, VTT) */}
            {activeTab === 'export' && (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <div>
                    <h5 className="text-light mb-1">
                      <i className="bi bi-file-earmark-arrow-down text-warning me-2"></i>
                      Instant Multi-Format Export Center
                    </h5>
                    <p className="text-muted small mb-0">
                      Download your transcription in TXT, Markdown, SRT, or WebVTT.
                    </p>
                  </div>
                  <button 
                    className="btn btn-success fw-bold px-3 py-2"
                    onClick={downloadAllAsZip}
                  >
                    <i className="bi bi-file-zip me-2"></i>Download All in .ZIP
                  </button>
                </div>

                {/* 4 Format Cards Grid */}
                <div className="row g-3 mb-4">
                  {/* Format 1: TXT */}
                  <div className="col-md-6 col-lg-3">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill txt">.TXT</span>
                          <i className="bi bi-filetype-txt fs-3 text-info"></i>
                        </div>
                        <h6 className="text-light fw-bold">Plain Text</h6>
                        <p className="export-card-desc">
                          Clean paragraph text or timestamped dialogue for notes and articles.
                        </p>
                        <div className="form-check form-switch mb-2">
                          <input 
                            className="form-check-input" 
                            type="checkbox" 
                            id="txtTimeToggle"
                            checked={includeTxtTimestamps}
                            onChange={(e) => setIncludeTxtTimestamps(e.target.checked)}
                          />
                          <label className="form-check-label small text-muted" htmlFor="txtTimeToggle">
                            Include timestamps
                          </label>
                        </div>
                        <div className="export-preview-box">
                          {exportStrings.txt}
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button 
                          className="btn btn-sm btn-secondary-dark flex-grow-1"
                          onClick={() => copyToClipboard(exportStrings.txt, 'txt')}
                        >
                          <i className={`bi ${copiedFormat === 'txt' ? 'bi-check2 text-success' : 'bi-clipboard'} me-1`}></i>
                          {copiedFormat === 'txt' ? 'Copied' : 'Copy'}
                        </button>
                        <button 
                          className="btn btn-sm btn-primary flex-grow-1"
                          style={{ background: '#58a6ff', borderColor: '#58a6ff' }}
                          onClick={() => downloadFile(`${baseFileName}.txt`, exportStrings.txt)}
                        >
                          <i className="bi bi-download me-1"></i>Download
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Format 2: MD (Markdown) */}
                  <div className="col-md-6 col-lg-3">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill md">.MD</span>
                          <i className="bi bi-filetype-md fs-3 text-primary"></i>
                        </div>
                        <h6 className="text-light fw-bold">Markdown Document</h6>
                        <p className="export-card-desc">
                          Formatted with file details, metadata tables, quote blocks, and summary.
                        </p>
                        <div className="export-preview-box">
                          {exportStrings.md}
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button 
                          className="btn btn-sm btn-secondary-dark flex-grow-1"
                          onClick={() => copyToClipboard(exportStrings.md, 'md')}
                        >
                          <i className={`bi ${copiedFormat === 'md' ? 'bi-check2 text-success' : 'bi-clipboard'} me-1`}></i>
                          {copiedFormat === 'md' ? 'Copied' : 'Copy'}
                        </button>
                        <button 
                          className="btn btn-sm btn-primary flex-grow-1"
                          style={{ background: '#d2a8ff', borderColor: '#d2a8ff', color: '#0d1117' }}
                          onClick={() => downloadFile(`${baseFileName}.md`, exportStrings.md)}
                        >
                          <i className="bi bi-download me-1"></i>Download
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Format 3: SRT */}
                  <div className="col-md-6 col-lg-3">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill srt">.SRT</span>
                          <i className="bi bi-badge-cc fs-3 text-warning"></i>
                        </div>
                        <h6 className="text-light fw-bold">SubRip Subtitles</h6>
                        <p className="export-card-desc">
                          Standard subtitle file compatible with YouTube, Premiere, VLC, DaVinci.
                        </p>
                        <div className="export-preview-box">
                          {exportStrings.srt}
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button 
                          className="btn btn-sm btn-secondary-dark flex-grow-1"
                          onClick={() => copyToClipboard(exportStrings.srt, 'srt')}
                        >
                          <i className={`bi ${copiedFormat === 'srt' ? 'bi-check2 text-success' : 'bi-clipboard'} me-1`}></i>
                          {copiedFormat === 'srt' ? 'Copied' : 'Copy'}
                        </button>
                        <button 
                          className="btn btn-sm btn-primary flex-grow-1"
                          style={{ background: '#f0883e', borderColor: '#f0883e' }}
                          onClick={() => downloadFile(`${baseFileName}.srt`, exportStrings.srt)}
                        >
                          <i className="bi bi-download me-1"></i>Download
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Format 4: VTT */}
                  <div className="col-md-6 col-lg-3">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill vtt">.VTT</span>
                          <i className="bi bi-badge-cc-fill fs-3 text-success"></i>
                        </div>
                        <h6 className="text-light fw-bold">WebVTT Captions</h6>
                        <p className="export-card-desc">
                          W3C standard WebVTT subtitles for modern HTML5 video tags and web players.
                        </p>
                        <div className="export-preview-box">
                          {exportStrings.vtt}
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button 
                          className="btn btn-sm btn-secondary-dark flex-grow-1"
                          onClick={() => copyToClipboard(exportStrings.vtt, 'vtt')}
                        >
                          <i className={`bi ${copiedFormat === 'vtt' ? 'bi-check2 text-success' : 'bi-clipboard'} me-1`}></i>
                          {copiedFormat === 'vtt' ? 'Copied' : 'Copy'}
                        </button>
                        <button 
                          className="btn btn-sm btn-success flex-grow-1"
                          onClick={() => downloadFile(`${baseFileName}.vtt`, exportStrings.vtt)}
                        >
                          <i className="bi bi-download me-1"></i>Download
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Live Preview Box */}
                <div className="mt-4 p-3 rounded" style={{ background: '#0d1117', border: '1px solid #30363d' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div className="d-flex gap-2">
                      <button 
                        className={`btn btn-sm ${exportPreviewFormat === 'srt' ? 'btn-warning' : 'btn-secondary-dark'}`}
                        onClick={() => setExportPreviewFormat('srt')}
                      >
                        SRT Preview
                      </button>
                      <button 
                        className={`btn btn-sm ${exportPreviewFormat === 'vtt' ? 'btn-success' : 'btn-secondary-dark'}`}
                        onClick={() => setExportPreviewFormat('vtt')}
                      >
                        VTT Preview
                      </button>
                      <button 
                        className={`btn btn-sm ${exportPreviewFormat === 'txt' ? 'btn-info' : 'btn-secondary-dark'}`}
                        onClick={() => setExportPreviewFormat('txt')}
                      >
                        TXT Preview
                      </button>
                      <button 
                        className={`btn btn-sm ${exportPreviewFormat === 'md' ? 'btn-primary' : 'btn-secondary-dark'}`}
                        onClick={() => setExportPreviewFormat('md')}
                      >
                        MD Preview
                      </button>
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-light"
                      onClick={() => copyToClipboard(exportStrings[exportPreviewFormat], 'raw')}
                    >
                      <i className="bi bi-clipboard me-1"></i>Copy Active Preview
                    </button>
                  </div>
                  <pre 
                    style={{ 
                      maxHeight: '260px', 
                      overflowY: 'auto', 
                      background: '#161b22', 
                      padding: '14px', 
                      borderRadius: '8px',
                      color: '#58a6ff',
                      fontSize: '0.85rem'
                    }}
                  >
                    {exportStrings[exportPreviewFormat]}
                  </pre>
                </div>
              </div>
            )}
          </div>
        )}

        {/* API Key Modal */}
        {showKeyModal && (
          <div 
            className="modal show d-block" 
            tabIndex="-1" 
            style={{ backgroundColor: 'rgba(0,0,0,0.7)', backdropFilter: 'blur(5px)' }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content" style={{ background: '#161b22', border: '1px solid #30363d', color: '#f0f6fc' }}>
                <div className="modal-header border-secondary">
                  <h5 className="modal-title">
                    <i className="bi bi-key-fill text-warning me-2"></i>
                    AI Engine API Keys
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowKeyModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="small text-muted mb-3">
                    Your API keys are stored locally in your browser (localStorage) and never sent to any external server other than the direct API endpoint.
                  </p>
                  
                  {/* Groq Key */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-info">
                      Groq Cloud API Key (Whisper Large v3 - Recommended, Super Fast & Free):
                    </label>
                    <input 
                      type="password"
                      className="form-control form-control-dark"
                      placeholder="gsk_..."
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                    />
                    <div className="form-text small text-muted">
                      Get a free key from <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-info">console.groq.com/keys</a>
                    </div>
                  </div>

                  {/* OpenAI Key */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-warning">
                      OpenAI API Key (Optional):
                    </label>
                    <input 
                      type="password"
                      className="form-control form-control-dark"
                      placeholder="sk-..."
                      value={openaiApiKey}
                      onChange={(e) => setOpenaiApiKey(e.target.value)}
                    />
                  </div>
                </div>
                <div className="modal-footer border-secondary">
                  <button 
                    type="button" 
                    className="btn btn-secondary-dark" 
                    onClick={() => setShowKeyModal(false)}
                  >
                    Done
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

      </div>
    </div>
  )
}

export default MultiLanguageTranscription
