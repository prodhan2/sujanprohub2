// AI Service for Prodhan AI using OpenAI-compatible endpoint with dynamic Firestore configuration
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export const DEFAULT_AI_CONFIG = {
  apiKey: "sk-Cz2vEgynWh7NJLvSqVsUTwZ14JhhtCgZUbZ1kjY6lmTc85dc",
  baseUrl: "https://api.hcnsec.cn/v1",
  model: "DeepSeek-V4-Flash",
  botName: "Prodhan AI",
  systemPrompt: `You are Prodhan AI, the smart, helpful, and friendly AI assistant for Sujan Prodhan's personal portfolio website.
About Sujan Prodhan:
- Software Engineer, Web Developer, and Researcher.
- Studied at the University of Rajshahi.
- Skilled in React, Node.js, JavaScript, Python, Firebase, Full-Stack Web Development, UI/UX, and AI integrations.
- Has built diverse projects ranging from web applications, conversion tools, 3D gallery, to interactive portfolio features.

Your role:
1. Greet visitors warmly and answer their questions about Sujan's projects, experience, skills, education, and contact details.
2. Answer general technical, programming, coding, and problem-solving questions clearly.
3. You speak fluent Bengali and English. Always reply in the same language the user writes to you (if user writes in Bengali or Banglish, respond in polite, clear Bengali; if English, respond in English).
4. Keep answers friendly, helpful, well-formatted, and concise with Markdown (bullet points, bold text, code blocks) when appropriate.`
};

// Current active configuration (starts with defaults, synced dynamically from Firestore)
let activeConfig = { ...DEFAULT_AI_CONFIG };

// Auto-sync config from Firestore portfolio/config
if (db) {
  try {
    onSnapshot(doc(db, 'portfolio', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        activeConfig = {
          apiKey: data.aiApiKey || DEFAULT_AI_CONFIG.apiKey,
          baseUrl: data.aiBaseUrl || DEFAULT_AI_CONFIG.baseUrl,
          model: data.aiModel || DEFAULT_AI_CONFIG.model,
          botName: data.aiBotName || DEFAULT_AI_CONFIG.botName,
          systemPrompt: data.aiSystemPrompt || DEFAULT_AI_CONFIG.systemPrompt
        };
      }
    }, (err) => {
      console.warn("Could not sync AI config from Firestore, using defaults:", err);
    });
  } catch (err) {
    console.warn("Failed to attach AI config listener:", err);
  }
}

export function getActiveAIConfig() {
  return { ...activeConfig };
}

// Test connection function for Admin Panel
export async function testAIConnection({ apiKey, baseUrl, model }) {
  const targetBaseUrl = (baseUrl || activeConfig.baseUrl).replace(/\/+$/, '');
  const url = targetBaseUrl.endsWith('/v1') ? `${targetBaseUrl}/chat/completions` : `${targetBaseUrl}/v1/chat/completions`;
  const key = apiKey || activeConfig.apiKey;
  const modelName = model || activeConfig.model;

  const controller = new AbortController();
  const timeoutId = setTimeout(() => controller.abort(), 20000);

  try {
    const response = await fetch(url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${key}`
      },
      body: JSON.stringify({
        model: modelName,
        messages: [
          { role: "system", content: "You are a test assistant. Reply with only: 'API connection successful!'" },
          { role: "user", content: "Test ping" }
        ],
        max_tokens: 50
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      let msg = `HTTP ${response.status}`;
      try {
        const json = JSON.parse(errText);
        if (json.error?.message) msg = json.error.message;
      } catch (e) {
        msg = errText || msg;
      }
      return { success: false, error: msg };
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content || "Connected";
    return { success: true, reply };
  } catch (err) {
    clearTimeout(timeoutId);
    return { success: false, error: err.name === 'AbortError' ? 'Connection timed out (20s)' : err.message };
  }
}

export async function askProdhanAI(chatMessages, additionalContext = '') {
  try {
    const config = activeConfig;
    const systemPromptText = config.systemPrompt || DEFAULT_AI_CONFIG.systemPrompt;
    
    const formattedMessages = [
      {
        role: "system",
        content: additionalContext 
          ? `${systemPromptText}\n\nAdditional live context about projects:\n${additionalContext}`
          : systemPromptText
      },
      ...chatMessages.map(m => ({
        role: m.role === 'ai' ? 'assistant' : 'user',
        content: m.fullText || m.text || ''
      }))
    ];

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 35000);

    const targetBaseUrl = config.baseUrl.replace(/\/+$/, '');
    const endpoint = targetBaseUrl.endsWith('/v1') 
      ? `${targetBaseUrl}/chat/completions` 
      : `${targetBaseUrl}/v1/chat/completions`;

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.model,
        messages: formattedMessages,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      console.error("AI API HTTP error:", response.status, errBody);
      throw new Error(`API Error (${response.status})`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;
    
    if (!reply) {
      throw new Error("No response generated from AI.");
    }

    return reply;
  } catch (error) {
    console.error("Error communicating with Prodhan AI:", error);
    if (error.name === 'AbortError') {
      return "দুঃখিত, সার্ভারের সাথে সংযোগের সময় শেষ হয়ে গেছে। অনুগ্রহ করে আবার চেষ্টা করুন।";
    }
    return "দুঃখিত, এই মুহূর্তে উত্তর তৈরি করতে সাময়িক সমস্যা হচ্ছে। একটু পরে আবার চেষ্টা করুন!";
  }
}
