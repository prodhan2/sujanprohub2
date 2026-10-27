import React, { useState, useRef, useEffect, useMemo } from 'react'
import { Link } from 'react-router-dom'
import JSZip from 'jszip'
import { askKiraAI } from '../services/kiraAiService'
import './MultiLanguageTranscription.css'

// Supported 99+ Languages Selection
const SUPPORTED_LANGUAGES = [
  { code: 'auto', name: 'Auto Detect Language', native: 'স্বয়ংক্রিয় সনাক্তকরণ' },
  { code: 'bn', name: 'Bengali (বাংলা)', native: 'বাংলা' },
  { code: 'en', name: 'English', native: 'English' },
  { code: 'hi', name: 'Hindi (हिन्दी)', native: 'हिन्दी' },
  { code: 'ur', name: 'Urdu (اردو)', native: 'اردو' },
  { code: 'ar', name: 'Arabic (العربية)', native: 'العربية' },
  { code: 'es', name: 'Spanish (Español)', native: 'Español' },
  { code: 'fr', name: 'French (Français)', native: 'Français' },
  { code: 'de', name: 'German (Deutsch)', native: 'Deutsch' },
  { code: 'zh', name: 'Chinese (中文)', native: '中文' },
  { code: 'ja', name: 'Japanese (日本語)', native: '日本語' },
  { code: 'ru', name: 'Russian (Русский)', native: 'Русский' },
  { code: 'pt', name: 'Portuguese (Português)', native: 'Português' },
  { code: 'tr', name: 'Turkish (Türkçe)', native: 'Türkçe' },
  { code: 'ko', name: 'Korean (한국어)', native: '한국어' },
  { code: 'it', name: 'Italian (Italiano)', native: 'Italiano' }
]

// Pre-loaded realistic sample data for instant 1-click test
const DEMO_SAMPLES = {
  bengali: {
    title: 'বাংলা সাক্ষাৎকার ও পডকাস্ট ডেমো',
    fileName: 'bangla_tech_podcast.mp3',
    language: 'bn',
    duration: 28,
    segments: [
      { id: 1, start: 0.5, end: 4.8, text: 'সুজন প্রধানের মাল্টি-ল্যাঙ্গুয়েজ ট্রান্সক্রিপশন টুলে আপনাকে স্বাগতম।' },
      { id: 2, start: 5.2, end: 11.4, text: 'এই টুলটি Whisper Large v3 মডেলের সাহায্যে যেকোনো অডিও বা ভিডিও নিমেষেই রূপান্তর করে।' },
      { id: 3, start: 12.0, end: 18.2, text: 'অন্যান্য টুলে বাংলা ও হিন্দির বানান ভুল হলেও, এখানে ২য় ধাপের AI বানান ও যতিচিহ্ন ঠিক করে।' },
      { id: 4, start: 19.0, end: 26.5, text: 'এখন আপনি এক ক্লিকেই TXT, MD, SRT, VTT এবং DOCX ফরম্যাটে সাবটাইটেল ডাউনলোড করতে পারবেন।' }
    ]
  },
  english: {
    title: 'English Keynote Presentation',
    fileName: 'ai_innovation_keynote.mp3',
    language: 'en',
    duration: 24,
    segments: [
      { id: 1, start: 0.5, end: 4.5, text: 'Welcome to the ultra-fast AI transcription engine powered by Whisper Large v3.' },
      { id: 2, start: 5.0, end: 10.2, text: 'Process 1 hour of recording in roughly 30 seconds with 99+ language support.' },
      { id: 3, start: 11.0, end: 16.8, text: 'Every sentence is time-synchronized with millisecond accuracy for YouTube and video editors.' },
      { id: 4, start: 17.5, end: 23.2, text: 'Export directly to SubRip SRT, WebVTT, Plain TXT, Word DOCX, and Markdown.' }
    ]
  }
}

// Time Formatters
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

// Export Generators
export function generateTXT(segments, includeTimestamps = false) {
  if (!includeTimestamps) {
    return segments.map(seg => seg.text.trim()).join(' ')
  }
  return segments.map(seg => `[${formatDisplayTime(seg.start)} - ${formatDisplayTime(seg.end)}] ${seg.text.trim()}`).join('\n\n')
}

export function generateMD(segments, metadata = {}) {
  const { fileName = 'audio_recording', duration = '00:00', language = 'Multi-Language' } = metadata
  const dateStr = new Date().toLocaleDateString()
  
  let md = `# 🎙️ Audio/Video Transcription Report\n\n`
  md += `| Attribute | Value |\n`
  md += `| :--- | :--- |\n`
  md += `| **Source File** | \`${fileName}\` |\n`
  md += `| **Duration** | ${duration} |\n`
  md += `| **Language** | ${language} |\n`
  md += `| **Total Subtitle Cues** | ${segments.length} |\n`
  md += `| **AI Model Pipeline** | OpenAI Whisper Large v3 (Groq LPU) + AI Polish |\n`
  md += `| **Generated On** | ${dateStr} |\n\n`
  md += `---\n\n`
  md += `## ⏱️ Timestamped Transcript\n\n`
  segments.forEach((seg, idx) => {
    md += `> **[${formatDisplayTime(seg.start)} ➔ ${formatDisplayTime(seg.end)}]** (Cue #${idx + 1})\n`
    md += `> ${seg.text.trim()}\n>\n`
  })
  md += `---\n\n`
  md += `## 📄 Full Continuous Text\n\n`
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
  let content = "WEBVTT - TranscriptGo Standard Transcription by Sujan Prodhan\n\n"
  content += segments.map((seg, idx) => {
    const start = formatVTTTime(seg.start)
    const end = formatVTTTime(seg.end)
    return `${idx + 1}\n${start} --> ${end}\n${seg.text.trim()}\n`
  }).join('\n')
  return content
}

export function generateDOCXHtml(segments, metadata = {}) {
  const { fileName = 'transcript', duration = '00:00', language = 'Bengali/English' } = metadata
  return `<html xmlns:o='urn:schemas-microsoft-com:office:office' xmlns:w='urn:schemas-microsoft-com:office:word' xmlns='http://www.w3.org/TR/REC-html40'>
  <head><meta charset='utf-8'><title>Transcription - ${fileName}</title>
  <style>
    body { font-family: 'Segoe UI', Arial, sans-serif; line-height: 1.6; margin: 40px; color: #111; }
    h1 { color: #f9532d; border-bottom: 2px solid #ddd; padding-bottom: 8px; }
    .meta { background: #f4f4f5; padding: 12px; border-radius: 6px; margin-bottom: 24px; font-size: 14px; }
    .cue { margin-bottom: 14px; padding-left: 10px; border-left: 3px solid #f9532d; }
    .time { color: #777; font-weight: bold; font-size: 12px; }
    .text { margin-top: 4px; font-size: 15px; }
  </style>
  </head>
  <body>
    <h1>Audio/Video Transcription Report</h1>
    <div class="meta">
      <strong>File:</strong> ${fileName} | <strong>Duration:</strong> ${duration} | <strong>Language:</strong> ${language} | <strong>Model:</strong> Whisper Large v3 + AI Polish
    </div>
    <h2>Timestamped Subtitles & Dialogue</h2>
    ${segments.map((seg, idx) => `
      <div class="cue">
        <div class="time">[${formatDisplayTime(seg.start)} - ${formatDisplayTime(seg.end)}] (Cue #${idx + 1})</div>
        <div class="text">${seg.text}</div>
      </div>
    `).join('')}
    <h2>Continuous Text</h2>
    <p>${segments.map(s => s.text).join(' ')}</p>
  </body>
  </html>`
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

  // Language & Engine settings (Whisper Large v3 default)
  const [selectedLanguage, setSelectedLanguage] = useState('bn')
  const [engine, setEngine] = useState('groq') // 'groq' (Whisper Large v3), 'browser', 'openai'
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

  // 2nd-Pass AI Polish & Summary states (TranscriptGo core feature)
  const [isPolishing, setIsPolishing] = useState(false)
  const [isSummarizing, setIsSummarizing] = useState(false)
  const [aiSummary, setAiSummary] = useState('')
  const [isTranslating, setIsTranslating] = useState(false)
  const [targetTranslationLang, setTargetTranslationLang] = useState('en')
  const [translatedSegments, setTranslatedSegments] = useState([])

  // View & Export states
  const [activeTab, setActiveTab] = useState('segments') // 'segments', 'summary', 'translation', 'fulltext', 'export'
  const [exportPreviewFormat, setExportPreviewFormat] = useState('srt') // 'txt', 'md', 'srt', 'vtt', 'docx'
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

  // Track playback time for live subtitle sync
  const handleTimeUpdate = () => {
    if (!mediaElementRef.current) return
    const cur = mediaElementRef.current.currentTime
    setCurrentTime(cur)
    const idx = segments.findIndex(s => cur >= s.start && cur <= s.end)
    setActiveSegmentIndex(idx)
  }

  // Handle file selection
  const processSelectedFile = (file) => {
    if (!file) return
    setSelectedFile(file)
    setIsVideo(file.type.startsWith('video/'))
    const url = URL.createObjectURL(file)
    setMediaUrl(url)
    setSegments([])
    setAiSummary('')
    setTranslatedSegments([])
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

  // Load sample demo
  const loadDemoSample = (sampleKey) => {
    const sample = DEMO_SAMPLES[sampleKey]
    if (!sample) return

    setSelectedFile({
      name: sample.fileName,
      size: 1024 * 1024 * 1.8,
      type: 'audio/mp3'
    })
    setIsVideo(false)
    setMediaUrl('')
    setSelectedLanguage(sample.language)
    setMediaDuration(sample.duration)
    setSegments(sample.segments)
    setActiveTab('segments')
    setProgressStatus(`Loaded ${sample.title} with ${sample.segments.length} cues!`)
  }

  // Jump player to segment time
  const seekToSegment = (startTime) => {
    if (mediaElementRef.current) {
      mediaElementRef.current.currentTime = startTime
      mediaElementRef.current.play().catch(() => {})
      setIsPlaying(true)
    }
  }

  // Text change handler
  const handleSegmentTextChange = (id, newText) => {
    setSegments(prev => prev.map(seg => seg.id === id ? { ...seg, text: newText } : seg))
  }

  const handleDeleteSegment = (id) => {
    setSegments(prev => prev.filter(seg => seg.id !== id))
  }

  const handleAddSegment = () => {
    const lastSeg = segments[segments.length - 1]
    const newStart = lastSeg ? Number((lastSeg.end + 0.4).toFixed(2)) : Number(currentTime.toFixed(2))
    const newEnd = Number((newStart + 4.0).toFixed(2))
    const newId = Date.now()
    setSegments(prev => [...prev, { id: newId, start: newStart, end: newEnd, text: 'নতুন সাবটাইটেল টেক্সট...' }])
  }

  // Mic recording
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

  // In-Browser Speech Recognition
  const transcribeWithBrowserSpeech = () => {
    const SpeechRecognition = window.SpeechRecognition || window.webkitSpeechRecognition
    if (!SpeechRecognition) {
      alert('Your browser does not support Web Speech Recognition. Please use Google Chrome, Microsoft Edge, or switch to Whisper Large v3 AI.')
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
      recognition.lang = selectedLanguage === 'auto' ? 'bn-BD' : (selectedLanguage === 'bn' ? 'bn-BD' : `${selectedLanguage}-${selectedLanguage.toUpperCase()}`)

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
        if (e.error !== 'no-speech') {
          setProgressStatus(`Recognition status: ${e.error}`)
        }
      }

      recognition.onend = () => {
        setIsTranscribing(false)
        setTranscribeProgress(100)
        setProgressStatus('Transcription finished! You can now run 2nd-Pass AI Polish, view summary, or export.')
      }

      recognition.start()
    } catch (err) {
      setIsTranscribing(false)
      alert('Error initializing Speech Recognition: ' + err.message)
    }
  }

  // Whisper Large v3 (Groq LPU / OpenAI)
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
    setProgressStatus(`Uploading to ${provider === 'groq' ? 'Groq Whisper Large v3 (30s engine)' : 'OpenAI Whisper'}...`)

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
        formData.append('language', selectedLanguage.split('-')[0])
      }

      setTranscribeProgress(45)
      setProgressStatus('AI Speech Recognition running on Groq LPU (detecting cues & timestamps)...')

      const response = await fetch(endpoint, {
        method: 'POST',
        headers: {
          'Authorization': `Bearer ${key}`
        },
        body: formData
      })

      setTranscribeProgress(85)

      if (!response.ok) {
        const errorData = await response.json().catch(() => ({}))
        throw new Error(errorData.error?.message || `API request failed with HTTP ${response.status}`)
      }

      const data = await response.json()
      setTranscribeProgress(95)
      setProgressStatus('Formatting subtitle cues and time intervals...')

      if (data.segments && data.segments.length > 0) {
        const parsedSegments = data.segments.map((seg, idx) => ({
          id: seg.id ?? idx + 1,
          start: Number(seg.start.toFixed(2)),
          end: Number(seg.end.toFixed(2)),
          text: seg.text.trim()
        }))
        setSegments(parsedSegments)
      } else if (data.text) {
        const dur = mediaElementRef.current?.duration || 10
        setSegments([
          { id: 1, start: 0, end: Number(dur.toFixed(2)), text: data.text.trim() }
        ])
      }

      setTranscribeProgress(100)
      setProgressStatus(`Success! Generated ${data.segments?.length || 1} cues in ${data.language || selectedLanguage}.`)
      setActiveTab('segments')
    } catch (err) {
      console.error('Transcription error:', err)
      alert(`Transcription Failed: ${err.message}`)
      setProgressStatus(`Error: ${err.message}`)
    } finally {
      setIsTranscribing(false)
    }
  }

  // SECONDARY AI PASS (TranscriptGo's Core Technique: "দ্বিতীয় একটি AI ধাপ বানান ঠিক করে")
  const runSecondPassPolish = async () => {
    if (segments.length === 0) return
    setIsPolishing(true)
    setProgressStatus('Running 2nd-Pass AI Polish: Correcting spelling, proper nouns, and punctuation...')

    try {
      const rawText = segments.map(s => `[${s.id}] ${s.text}`).join('\n')
      const prompt = `You are an expert bilingual speech-to-text proofreader and editor for Bengali, English, and South Asian languages.
Review the following transcribed speech segments. Clean up any speech recognition spelling errors, fix Bengali/English proper nouns, fix missing punctuation (।, ?, ,) and ensure the sentence flow is natural while strictly keeping the meaning and cue IDs.

Return ONLY a valid JSON array of objects with "id" and "text" fields, matching the exact IDs. No markdown formatting, no explanations. Example:
[{"id": 1, "text": "শুদ্ধ বাক্য।"}]

Input segments:
${rawText}`

      const responseText = await askKiraAI([{ role: 'user', text: prompt }])
      
      // Parse JSON from response
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const polishedList = JSON.parse(jsonMatch[0])
        const polishMap = {}
        polishedList.forEach(item => {
          polishMap[item.id] = item.text
        })

        setSegments(prev => prev.map(seg => ({
          ...seg,
          text: polishMap[seg.id] || seg.text
        })))
        setProgressStatus('✨ 2nd-Pass AI Polish Complete! Spelling and punctuation perfected.')
      } else {
        setProgressStatus('AI Polish finished.')
      }
    } catch (err) {
      console.warn('AI Polish fallback:', err)
      setProgressStatus('AI Polish: Could not connect to AI service, kept original transcript.')
    } finally {
      setIsPolishing(false)
    }
  }

  // AI Summary Generator (সারাংশ)
  const generateAiSummary = async () => {
    if (segments.length === 0) return
    setIsSummarizing(true)
    setActiveTab('summary')
    setProgressStatus('Generating AI Summary, key topics, and action items...')

    try {
      const fullText = segments.map(s => s.text).join(' ')
      const prompt = `Please provide a comprehensive and structured summary of this audio/video transcription:
1. 📌 **মূল বিষয়বস্তু (Executive Summary)**
2. 🔑 **প্রধান পয়েন্টসমূহ (Key Discussion Points in bullet format)**
3. 💡 **গুরুত্বপূর্ণ সিদ্ধান্ত ও অ্যাকশন আইটেম (Key Takeaways / Action Items)**

Write the summary clearly in the same primary language as the transcript (if Bengali, in Bengali; if English, in English).

Transcript text:
${fullText}`

      const summaryText = await askKiraAI([{ role: 'user', text: prompt }])
      setAiSummary(summaryText)
      setProgressStatus('AI Summary generated successfully!')
    } catch (err) {
      console.error('Summary error:', err)
      setAiSummary('Failed to generate summary: ' + err.message)
    } finally {
      setIsSummarizing(false)
    }
  }

  // Side-by-Side Translation
  const translateTranscript = async () => {
    if (segments.length === 0) return
    setIsTranslating(true)
    setActiveTab('translation')
    setProgressStatus(`Translating subtitles into ${targetTranslationLang.toUpperCase()}...`)

    try {
      const targetLangName = SUPPORTED_LANGUAGES.find(l => l.code === targetTranslationLang)?.name || targetTranslationLang
      const rawText = segments.map(s => `[${s.id}] ${s.text}`).join('\n')
      const prompt = `Translate the following timestamped subtitle dialogue into ${targetLangName}. 
Maintain the same cue IDs. Return ONLY a valid JSON array of objects with "id" and "text" fields. Example:
[{"id": 1, "text": "Translated sentence"}]

Cues to translate:
${rawText}`

      const responseText = await askKiraAI([{ role: 'user', text: prompt }])
      const jsonMatch = responseText.match(/\[[\s\S]*\]/)
      if (jsonMatch) {
        const transList = JSON.parse(jsonMatch[0])
        const transMap = {}
        transList.forEach(item => {
          transMap[item.id] = item.text
        })
        setTranslatedSegments(segments.map(s => ({
          ...s,
          translatedText: transMap[s.id] || s.text
        })))
        setProgressStatus(`Subtitles translated into ${targetLangName}!`)
      }
    } catch (err) {
      console.error('Translation error:', err)
      alert('Translation failed: ' + err.message)
    } finally {
      setIsTranslating(false)
    }
  }

  // Trigger main transcription
  const handleStartTranscribe = () => {
    if (engine === 'browser') {
      transcribeWithBrowserSpeech()
    } else if (engine === 'groq') {
      transcribeWithWhisperAPI('groq')
    } else if (engine === 'openai') {
      transcribeWithWhisperAPI('openai')
    }
  }

  const handleStopTranscribe = () => {
    if (recognitionRef.current) recognitionRef.current.stop()
    setIsTranscribing(false)
    setProgressStatus('Transcription stopped.')
  }

  // Search filter
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

  // Export strings
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
      vtt: generateVTT(segments),
      docx: generateDOCXHtml(segments, meta)
    }
  }, [segments, selectedFile, mediaDuration, selectedLanguage, includeTxtTimestamps])

  // File download helper
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

  // Download All as ZIP (TXT, MD, SRT, VTT, DOCX)
  const downloadAllAsZip = async () => {
    if (segments.length === 0) return
    const zip = new JSZip()
    const baseName = (selectedFile?.name || 'transcript').replace(/\.[^/.]+$/, "")

    zip.file(`${baseName}.txt`, exportStrings.txt)
    zip.file(`${baseName}.md`, exportStrings.md)
    zip.file(`${baseName}.srt`, exportStrings.srt)
    zip.file(`${baseName}.vtt`, exportStrings.vtt)
    zip.file(`${baseName}.doc`, exportStrings.docx)

    const zipBlob = await zip.generateAsync({ type: 'blob' })
    const url = URL.createObjectURL(zipBlob)
    const a = document.createElement('a')
    a.href = url
    a.download = `${baseName}_transcripts_bundle.zip`
    document.body.appendChild(a)
    a.click()
    document.body.removeChild(a)
    URL.revokeObjectURL(url)
  }

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
        
        {/* Top Navigation Bar */}
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

        {/* Hero Header Banner (TranscriptGo Inspired) */}
        <div className="transcription-header">
          <div className="header-badge">
            <i className="bi bi-stars"></i>
            <span>TranscriptGo Architecture · OpenAI Whisper Large v3 + AI Polish</span>
          </div>
          <h1 className="header-title">
            বাংলা, হিন্দি ও ইংরেজি <span className="text-gradient">নির্ভুল অডিও/ভিডিও ট্রান্সক্রিপশন</span>
          </h1>
          <p className="header-desc">
            TranscriptGo-এর আর্কিটেকচারে তৈরি: <strong>OpenAI Whisper Large v3 (Groq LPU)</strong> দিয়ে ১ ঘণ্টার অডিও প্রায় ৩০ সেকেন্ডে ট্রান্সক্রাইব হয়। 
            এরপর <strong>২য় ধাপের AI</strong> স্বয়ংক্রিয়ভাবে বাংলা ও আঞ্চলিক ভাষার বানান ও যতিচিহ্ন ঠিক করে। 
            টাইমস্ট্যাম্প সহ সরাসরি ডাউনলোড করুন <strong>TXT, MD, SRT, VTT, এবং DOCX</strong>।
          </p>

          <div className="header-highlights-row">
            <span className="highlight-chip">
              <i className="bi bi-lightning-charge-fill"></i> ঘণ্টাপ্রতি ৩০ সেকেন্ড
            </span>
            <span className="highlight-chip">
              <i className="bi bi-translate"></i> ৯৯+ ভাষা সাপোর্ট
            </span>
            <span className="highlight-chip">
              <i className="bi bi-check-all"></i> ২য় ধাপ AI বানান শুদ্ধি
            </span>
            <span className="highlight-chip">
              <i className="bi bi-clock-history"></i> মিলিসেকেন্ড টাইমস্ট্যাম্প
            </span>
            <span className="highlight-chip">
              <i className="bi bi-file-earmark-arrow-down"></i> SRT, VTT, TXT, MD, DOCX
            </span>
            <span className="highlight-chip">
              <i className="bi bi-shield-check"></i> সম্পূর্ণ নিরাপদ ও গোপনীয়
            </span>
          </div>
        </div>

        {/* Upload & Source Selection Card */}
        <div className="glass-card">
          <div className="card-topbar">
            <h5 className="card-topbar-title">
              <i className="bi bi-cloud-arrow-up-fill text-warning"></i>
              Step 1: অডিও বা ভিডিও ফাইল আপলোড / রেকর্ড করুন
            </h5>
            <div className="d-flex gap-2 align-items-center flex-wrap">
              <span className="text-muted small">টেস্ট স্যাম্পল:</span>
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
              <i className="bi bi-soundwave dropzone-icon"></i>
              <div className="dropzone-title">
                {selectedFile ? selectedFile.name : 'যেকোনো অডিও বা ভিডিও ফাইল এখানে ড্র্যাগ ও ড্রপ করুন'}
              </div>
              <div className="dropzone-subtitle">
                MP4, WEBM, MKV, MOV, MP3, WAV, M4A, OGG, AAC, FLAC (সীমাহীন সময়কাল)
              </div>
              <div className="d-flex justify-content-center gap-3 flex-wrap">
                <button 
                  type="button" 
                  className="btn btn-sm btn-primary px-3 py-2 fw-bold"
                  style={{ background: '#f9532d', borderColor: '#f9532d' }}
                  onClick={(e) => { e.stopPropagation(); fileInputRef.current?.click(); }}
                >
                  <i className="bi bi-folder2-open me-2"></i>লোকাল ফাইল ব্রাউজ করুন
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
                  {isRecording ? `রেকর্ড হচ্ছে... (${recordingSeconds}s) বন্ধ করতে ক্লিক করুন` : 'মাইক্রোফোন থেকে রেকর্ড'}
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

            {/* Media Player with Live Subtitle Overlay */}
            {mediaUrl && (
              <div className="media-preview-box mt-3">
                <div className="d-flex justify-content-between align-items-center mb-2">
                  <span className="fw-bold text-light">
                    <i className={`bi ${isVideo ? 'bi-film' : 'bi-soundwave'} me-2 text-warning`}></i>
                    মিডিয়া প্লেয়ার ও লাইভ সাবটাইটেল সিঙ্ক
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

                  {/* Active Subtitle Overlay */}
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
                      title="৫ সেকেন্ড পেছনে যান"
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
                      title="৫ সেকেন্ড সামনে যান"
                    >
                      +5s <i className="bi bi-arrow-clockwise"></i>
                    </button>
                  </div>
                </div>
              </div>
            )}

            {/* Language & Model Settings */}
            <div className="settings-grid mt-4">
              <div>
                <label className="form-label-custom">
                  <i className="bi bi-translate text-primary"></i> অডিওর ভাষা (Spoken Language):
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
                  <i className="bi bi-cpu-fill text-warning"></i> ট্রান্সক্রিপশন ইঞ্জিন (AI Model):
                </label>
                <select 
                  className="select-dark w-100" 
                  value={engine}
                  onChange={(e) => setEngine(e.target.value)}
                >
                  <option value="groq">Whisper Large v3 on Groq LPU (TranscriptGo মডেল - ৩০ সেঃ)</option>
                  <option value="browser">Browser Native Speech (অফলাইন ও ১০০% ফ্রি)</option>
                  <option value="openai">OpenAI Whisper-1 Official</option>
                </select>
              </div>
            </div>

            {/* Engine Notice */}
            <div className="second-pass-banner">
              <div>
                <strong className="text-warning">
                  <i className="bi bi-lightning-charge-fill me-1"></i>
                  TranscriptGo স্টাইল পাইপলাইন:
                </strong>
                <span className="ms-2 small text-light">
                  {engine === 'groq' && 'OpenAI Whisper Large v3 মডেল Groq LPU-তে সেকেন্ডে প্রসেস হয়। ফ্রি API কী ব্যবহার করুন বা সরাসরি টেস্ট স্যাম্পল রান করুন।'}
                  {engine === 'browser' && 'কোনো API কী ছাড়াই আপনার ব্রাউজারের স্পিচ ইঞ্জিন ব্যবহার করে সম্পূর্ণ বিনামূল্যে কনভার্ট করুন।'}
                  {engine === 'openai' && 'অফিসিয়াল OpenAI Whisper API দিয়ে নির্ভুল ট্রান্সক্রিপশন।'}
                </span>
              </div>
              {!groqApiKey && engine === 'groq' && (
                <button 
                  className="btn btn-sm btn-outline-warning py-1"
                  onClick={() => setShowKeyModal(true)}
                >
                  <i className="bi bi-key me-1"></i>Groq Key দিন
                </button>
              )}
            </div>

            {/* Start Buttons */}
            <div className="d-flex gap-3 align-items-center flex-wrap pt-2">
              <button 
                className="btn-transcribe-main"
                disabled={isTranscribing || (!selectedFile && segments.length === 0)}
                onClick={handleStartTranscribe}
              >
                {isTranscribing ? (
                  <>
                    <span className="spinner-border spinner-border-sm" role="status"></span>
                    রূপান্তর করা হচ্ছে...
                  </>
                ) : (
                  <>
                    <i className="bi bi-play-circle-fill"></i>
                    অডিও/ভিডিও কনভার্ট শুরু করুন
                  </>
                )}
              </button>

              {isTranscribing && (
                <button 
                  className="btn btn-secondary-dark"
                  onClick={handleStopTranscribe}
                >
                  <i className="bi bi-stop-circle text-danger"></i> থামুন
                </button>
              )}

              {segments.length > 0 && (
                <div className="ms-auto d-flex gap-2 align-items-center flex-wrap">
                  {/* TranscriptGo 2nd Pass Polish Button */}
                  <button 
                    className="btn btn-sm btn-outline-info"
                    disabled={isPolishing}
                    onClick={runSecondPassPolish}
                    title="২য় ধাপের AI দিয়ে বাংলা ও ইংরেজি বানান ও যতিচিহ্ন ঠিক করুন"
                  >
                    {isPolishing ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i className="bi bi-magic me-1"></i>
                    )}
                    AI ২য় ধাপ: বানান শুদ্ধি
                  </button>

                  {/* AI Summary Button */}
                  <button 
                    className="btn btn-sm btn-outline-warning"
                    disabled={isSummarizing}
                    onClick={generateAiSummary}
                    title="অডিও থেকে গুরুত্বপূর্ণ সারাংশ ও সিদ্ধান্ত বের করুন"
                  >
                    {isSummarizing ? (
                      <span className="spinner-border spinner-border-sm me-1"></span>
                    ) : (
                      <i className="bi bi-journal-text me-1"></i>
                    )}
                    AI সারাংশ
                  </button>
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
                <i className="bi bi-list-task"></i> সাবটাইটেল সেগমেন্ট ({segments.length})
              </button>
              <button 
                className={`custom-tab-btn ${activeTab === 'summary' ? 'active' : ''}`}
                onClick={() => setActiveTab('summary')}
              >
                <i className="bi bi-file-earmark-text text-warning"></i> AI সারাংশ (Summary)
              </button>
              <button 
                className={`custom-tab-btn ${activeTab === 'translation' ? 'active' : ''}`}
                onClick={() => setActiveTab('translation')}
              >
                <i className="bi bi-translate text-info"></i> পাশাপাশি অনুবাদ (Translation)
              </button>
              <button 
                className={`custom-tab-btn ${activeTab === 'fulltext' ? 'active' : ''}`}
                onClick={() => setActiveTab('fulltext')}
              >
                <i className="bi bi-text-paragraph"></i> সম্পূর্ণ টেক্সট
              </button>
              <button 
                className={`custom-tab-btn ${activeTab === 'export' ? 'active' : ''}`}
                onClick={() => setActiveTab('export')}
              >
                <i className="bi bi-download text-success"></i> এক্সপোর্ট হাব (TXT, MD, SRT, VTT, DOCX)
              </button>
            </div>

            {/* Tab 1: Subtitle Segments Editor */}
            {activeTab === 'segments' && (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <div className="input-group input-group-sm" style={{ maxWidth: '300px' }}>
                      <span className="input-group-text bg-dark border-secondary text-secondary">
                        <i className="bi bi-search"></i>
                      </span>
                      <input 
                        type="text" 
                        className="form-control form-control-dark" 
                        placeholder="যেকোনো শব্দ বা বাক্য খুঁজুন..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                      />
                    </div>
                  </div>
                  <div className="d-flex gap-2 align-items-center flex-wrap">
                    <span className="text-muted small">
                      {totalWords} শব্দ | {totalChars} অক্ষর
                    </span>
                    <button 
                      className="btn btn-sm btn-secondary-dark"
                      onClick={handleAddSegment}
                    >
                      <i className="bi bi-plus-circle me-1 text-success"></i> নতুন লাইন যোগ করুন
                    </button>
                  </div>
                </div>

                <div className="segments-list-container">
                  {filteredSegments.length === 0 ? (
                    <div className="text-center text-muted py-5">
                      "{searchQuery}" দিয়ে কোনো সাবটাইটেল সেগমেন্ট পাওয়া যায়নি।
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
                              title="ক্লিক করলেই সরাসরি এই মুহূর্তে অডিও প্লে হবে"
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
                              title="লাইনটি মুছে ফেলুন"
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

            {/* Tab 2: AI Summary (TranscriptGo Feature) */}
            {activeTab === 'summary' && (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <h6 className="text-light mb-0">
                    <i className="bi bi-file-earmark-check text-warning me-2"></i>
                    AI অটোমেটেড সারাংশ ও মূল বক্তব্য
                  </h6>
                  <button 
                    className="btn btn-sm btn-outline-warning"
                    disabled={isSummarizing}
                    onClick={generateAiSummary}
                  >
                    <i className="bi bi-arrow-clockwise me-1"></i>
                    পুনরায় সারাংশ তৈরি করুন
                  </button>
                </div>

                {aiSummary ? (
                  <div 
                    className="p-4 rounded" 
                    style={{ background: '#0b0f19', border: '1px solid #1f2937', color: '#e5e7eb', whiteSpace: 'pre-wrap', lineHeight: '1.8' }}
                  >
                    {aiSummary}
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <p>এখনো সারাংশ তৈরি করা হয়নি। নিচে ক্লিক করে মূল বক্তব্যগুলো নিমেষেই বের করে নিন।</p>
                    <button 
                      className="btn btn-warning fw-bold px-4 py-2"
                      disabled={isSummarizing}
                      onClick={generateAiSummary}
                    >
                      {isSummarizing ? 'সারাংশ তৈরি হচ্ছে...' : 'AI সারাংশ তৈরি করুন'}
                    </button>
                  </div>
                )}
              </div>
            )}

            {/* Tab 3: Side-by-Side Translation (TranscriptGo Feature) */}
            {activeTab === 'translation' && (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3 flex-wrap gap-2">
                  <div className="d-flex align-items-center gap-2">
                    <span className="small text-light">টার্গেট অনুবাদ ভাষা:</span>
                    <select 
                      className="select-dark"
                      value={targetTranslationLang}
                      onChange={(e) => setTargetTranslationLang(e.target.value)}
                    >
                      {SUPPORTED_LANGUAGES.filter(l => l.code !== 'auto').map(lang => (
                        <option key={lang.code} value={lang.code}>
                          {lang.native} - {lang.name}
                        </option>
                      ))}
                    </select>
                    <button 
                      className="btn btn-sm btn-primary"
                      disabled={isTranslating}
                      onClick={translateTranscript}
                    >
                      {isTranslating ? 'অনুবাদ হচ্ছে...' : 'অনুবাদ করুন'}
                    </button>
                  </div>
                </div>

                {translatedSegments.length > 0 ? (
                  <div className="translation-grid">
                    <div>
                      <h6 className="text-muted mb-2">মূল ভাষা (Original)</h6>
                      <div className="segments-list-container">
                        {translatedSegments.map((s, idx) => (
                          <div key={s.id} className="segment-item">
                            <span className="badge bg-secondary mb-1">#{idx + 1}</span>
                            <div className="small text-light">{s.text}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                    <div>
                      <h6 className="text-info mb-2">অনূদিত ভাষা ({targetTranslationLang.toUpperCase()})</h6>
                      <div className="segments-list-container">
                        {translatedSegments.map((s, idx) => (
                          <div key={s.id} className="segment-item" style={{ borderColor: 'rgba(59, 130, 246, 0.4)' }}>
                            <span className="badge bg-primary mb-1">#{idx + 1}</span>
                            <div className="small text-info">{s.translatedText}</div>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                ) : (
                  <div className="text-center py-5 text-muted">
                    <p>যেকোনো ভাষায় সাবটাইটেল পাশাপাশি অনুবাদ করতে উপরের বাটনে ক্লিক করুন।</p>
                  </div>
                )}
              </div>
            )}

            {/* Tab 4: Full Continuous Text */}
            {activeTab === 'fulltext' && (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-3">
                  <h6 className="text-light mb-0">পড়ার উপযোগী পূর্ণাঙ্গ টেক্সট</h6>
                  <button 
                    className="btn btn-sm btn-secondary-dark"
                    onClick={() => copyToClipboard(generateTXT(segments, false), 'fulltext')}
                  >
                    <i className={`bi ${copiedFormat === 'fulltext' ? 'bi-check2 text-success' : 'bi-clipboard'} me-1`}></i>
                    {copiedFormat === 'fulltext' ? 'কপি হয়েছে!' : 'পুরো টেক্সট কপি করুন'}
                  </button>
                </div>
                <div 
                  className="p-3 rounded"
                  style={{ 
                    background: '#0b0f19', 
                    border: '1px solid #1f2937', 
                    lineHeight: '1.8', 
                    fontSize: '1rem',
                    color: '#e5e7eb',
                    whiteSpace: 'pre-wrap'
                  }}
                >
                  {generateTXT(segments, false)}
                </div>
              </div>
            )}

            {/* Tab 5: Export Hub (Requested: TXT, MD, SRT, VTT, DOCX) */}
            {activeTab === 'export' && (
              <div className="p-4">
                <div className="d-flex justify-content-between align-items-center mb-4 flex-wrap gap-2">
                  <div>
                    <h5 className="text-light mb-1">
                      <i className="bi bi-file-earmark-arrow-down-fill text-warning me-2"></i>
                      মাল্টি-ফরম্যাট এক্সপোর্ট সেন্টার
                    </h5>
                    <p className="text-muted small mb-0">
                      YouTube, Premiere, DaVinci, Word বা যেকোনো নোটের জন্য আদর্শ ফরম্যাটে ডাউনলোড করুন।
                    </p>
                  </div>
                  <button 
                    className="btn btn-success fw-bold px-3 py-2"
                    onClick={downloadAllAsZip}
                  >
                    <i className="bi bi-file-zip me-2"></i>সব ফরম্যাট একসাথে .ZIP ডাউনলোড
                  </button>
                </div>

                {/* 5 Format Cards Grid */}
                <div className="row g-3 mb-4">
                  {/* Format 1: TXT */}
                  <div className="col-md-6 col-lg">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill txt">.TXT</span>
                          <i className="bi bi-filetype-txt fs-3 text-info"></i>
                        </div>
                        <h6 className="text-light fw-bold">Plain Text</h6>
                        <p className="export-card-desc">
                          সাধারণ নোট, ডকুমেন্ট বা নিবন্ধের জন্য পরিষ্কার টেক্সট।
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
                            টাইমস্ট্যাম্প সহ
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
                          {copiedFormat === 'txt' ? 'কপি' : 'কপি'}
                        </button>
                        <button 
                          className="btn btn-sm btn-primary flex-grow-1"
                          style={{ background: '#3b82f6', borderColor: '#3b82f6' }}
                          onClick={() => downloadFile(`${baseFileName}.txt`, exportStrings.txt)}
                        >
                          <i className="bi bi-download me-1"></i>ডাউনলোড
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Format 2: MD */}
                  <div className="col-md-6 col-lg">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill md">.MD</span>
                          <i className="bi bi-filetype-md fs-3 text-primary"></i>
                        </div>
                        <h6 className="text-light fw-bold">Markdown</h6>
                        <p className="export-card-desc">
                          টেবিল, মেটাডেটা ও ব্লককোট সমৃদ্ধ সুন্দর ডকুমেন্ট।
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
                          {copiedFormat === 'md' ? 'কপি' : 'কপি'}
                        </button>
                        <button 
                          className="btn btn-sm btn-primary flex-grow-1"
                          style={{ background: '#a855f7', borderColor: '#a855f7' }}
                          onClick={() => downloadFile(`${baseFileName}.md`, exportStrings.md)}
                        >
                          <i className="bi bi-download me-1"></i>ডাউনলোড
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Format 3: SRT */}
                  <div className="col-md-6 col-lg">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill srt">.SRT</span>
                          <i className="bi bi-badge-cc fs-3 text-warning"></i>
                        </div>
                        <h6 className="text-light fw-bold">SubRip SRT</h6>
                        <p className="export-card-desc">
                          YouTube, Reels ও যেকোনো ভিডিও এডিটরের স্ট্যান্ডার্ড সাবটাইটেল।
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
                          {copiedFormat === 'srt' ? 'কপি' : 'কপি'}
                        </button>
                        <button 
                          className="btn btn-sm btn-primary flex-grow-1"
                          style={{ background: '#f97316', borderColor: '#f97316' }}
                          onClick={() => downloadFile(`${baseFileName}.srt`, exportStrings.srt)}
                        >
                          <i className="bi bi-download me-1"></i>ডাউনলোড
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Format 4: VTT */}
                  <div className="col-md-6 col-lg">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill vtt">.VTT</span>
                          <i className="bi bi-badge-cc-fill fs-3 text-success"></i>
                        </div>
                        <h6 className="text-light fw-bold">WebVTT</h6>
                        <p className="export-card-desc">
                          ওয়েব প্লেয়ার ও আধুনিক HTML5 ভিডিও ক্যাপশনের জন্য।
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
                          {copiedFormat === 'vtt' ? 'কপি' : 'কপি'}
                        </button>
                        <button 
                          className="btn btn-sm btn-success flex-grow-1"
                          onClick={() => downloadFile(`${baseFileName}.vtt`, exportStrings.vtt)}
                        >
                          <i className="bi bi-download me-1"></i>ডাউনলোড
                        </button>
                      </div>
                    </div>
                  </div>

                  {/* Format 5: DOCX */}
                  <div className="col-md-6 col-lg">
                    <div className="export-card">
                      <div>
                        <div className="export-card-header">
                          <span className="export-format-badge format-pill docx">.DOC</span>
                          <i className="bi bi-file-earmark-word fs-3 text-info"></i>
                        </div>
                        <h6 className="text-light fw-bold">Word Doc</h6>
                        <p className="export-card-desc">
                          Microsoft Word এবং Google Docs-এ খোলার উপযোগী।
                        </p>
                        <div className="export-preview-box">
                          {exportStrings.txt.substring(0, 100)}...
                        </div>
                      </div>
                      <div className="d-flex gap-2 mt-2">
                        <button 
                          className="btn btn-sm btn-info flex-grow-1"
                          onClick={() => downloadFile(`${baseFileName}.doc`, exportStrings.docx, 'application/msword;charset=utf-8')}
                        >
                          <i className="bi bi-download me-1"></i>Word Doc
                        </button>
                      </div>
                    </div>
                  </div>
                </div>

                {/* Big Live Code Preview */}
                <div className="mt-4 p-3 rounded" style={{ background: '#0b0f19', border: '1px solid #1f2937' }}>
                  <div className="d-flex justify-content-between align-items-center mb-2 flex-wrap gap-2">
                    <div className="d-flex gap-2">
                      <button 
                        className={`btn btn-sm ${exportPreviewFormat === 'srt' ? 'btn-warning' : 'btn-secondary-dark'}`}
                        onClick={() => setExportPreviewFormat('srt')}
                      >
                        SRT প্রিভিউ
                      </button>
                      <button 
                        className={`btn btn-sm ${exportPreviewFormat === 'vtt' ? 'btn-success' : 'btn-secondary-dark'}`}
                        onClick={() => setExportPreviewFormat('vtt')}
                      >
                        VTT প্রিভিউ
                      </button>
                      <button 
                        className={`btn btn-sm ${exportPreviewFormat === 'txt' ? 'btn-info' : 'btn-secondary-dark'}`}
                        onClick={() => setExportPreviewFormat('txt')}
                      >
                        TXT প্রিভিউ
                      </button>
                      <button 
                        className={`btn btn-sm ${exportPreviewFormat === 'md' ? 'btn-primary' : 'btn-secondary-dark'}`}
                        onClick={() => setExportPreviewFormat('md')}
                      >
                        MD প্রিভিউ
                      </button>
                    </div>
                    <button 
                      className="btn btn-sm btn-outline-light"
                      onClick={() => copyToClipboard(exportStrings[exportPreviewFormat], 'raw')}
                    >
                      <i className="bi bi-clipboard me-1"></i>সক্রিয় প্রিভিউ কপি করুন
                    </button>
                  </div>
                  <pre 
                    style={{ 
                      maxHeight: '260px', 
                      overflowY: 'auto', 
                      background: '#111827', 
                      padding: '14px', 
                      borderRadius: '8px',
                      color: '#60a5fa',
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
            style={{ backgroundColor: 'rgba(0,0,0,0.75)', backdropFilter: 'blur(5px)' }}
          >
            <div className="modal-dialog modal-dialog-centered">
              <div className="modal-content" style={{ background: '#111827', border: '1px solid #374151', color: '#f9fafb' }}>
                <div className="modal-header border-secondary">
                  <h5 className="modal-title">
                    <i className="bi bi-key-fill text-warning me-2"></i>
                    AI Engine API Keys (TranscriptGo মডেল)
                  </h5>
                  <button 
                    type="button" 
                    className="btn-close btn-close-white" 
                    onClick={() => setShowKeyModal(false)}
                  ></button>
                </div>
                <div className="modal-body">
                  <p className="small text-muted mb-3">
                    আপনার API কি স্থানীয়ভাবে আপনার ব্রাউজারে সংরক্ষিত থাকে এবং সরাসরি প্রোভাইডারের নিরাপদ এন্ডপয়েন্টে কল হয়।
                  </p>
                  
                  {/* Groq Key */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-info">
                      Groq API Key (Whisper Large v3 - সুপার ফাস্ট ও ফ্রি):
                    </label>
                    <input 
                      type="password"
                      className="form-control form-control-dark"
                      placeholder="gsk_..."
                      value={groqApiKey}
                      onChange={(e) => setGroqApiKey(e.target.value)}
                    />
                    <div className="form-text small text-muted">
                      ফ্রি কি নিন: <a href="https://console.groq.com/keys" target="_blank" rel="noreferrer" className="text-info">console.groq.com/keys</a>
                    </div>
                  </div>

                  {/* OpenAI Key */}
                  <div className="mb-3">
                    <label className="form-label small fw-bold text-warning">
                      OpenAI API Key (ঐচ্ছিক):
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
                    সম্পন্ন
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
