// Kira AI Service integration for Chat 2
// Developer Hub: https://kiraai.vn/developer/
import { doc, onSnapshot } from 'firebase/firestore'
import { db } from '../firebase'

export const DEFAULT_KIRA_CONFIG = {
  apiKey: "kira_c90a333e2bc6ded10d9e7f02870b7cf0",
  baseUrl: "https://kiraai.vn/api/v1",
  model: "kira-3.5-flash", // Options: kira-3.5-flash, kira-3.5-pro, kira-mini-1.0
  imageModel: "kira-3.0-image", // Options: kira-3.0-image, kira-2.0-image
  ttsModel: "kira-3.0-flash-tts", // Options: kira-3.0-flash-tts, kira-2.0-flash-tts
  ttsVoice: "alloy", // alloy, echo, fable, onyx, nova
  botName: "Kira AI",
  systemPrompt: `You are Kira AI, a powerful, fast, and helpful AI assistant embedded in Sujan Prodhan's portfolio website.
About Sujan Prodhan:
- Software Engineer, Web Developer, and Researcher from University of Rajshahi.
- Specializes in React, Node.js, JavaScript, Python, Full-Stack Development, UI/UX, and AI integrations.

Your capabilities:
1. Provide intelligent coding assistance, debugging, technical explanations, and creative writing.
2. Answer questions about Sujan's projects, experience, skills, and background when asked.
3. You speak fluent Bengali and English. Respond naturally in the language used by the user.
4. Always format your responses clearly using Markdown (code blocks, bold text, lists).`
};

export const KIRA_MODELS = [
  { id: "kira-3.5-flash", name: "Kira 3.5 Flash", desc: "Ultra-fast & intelligent (1M context)" },
  { id: "kira-3.5-pro", name: "Kira 3.5 Pro", desc: "Deep reasoning & coding powerhouse" },
  { id: "kira-mini-1.0", name: "Kira Mini 1.0", desc: "Lightweight & fast" }
];

let activeKiraConfig = { ...DEFAULT_KIRA_CONFIG };

// Real-time sync with Firestore portfolio/config
if (db) {
  try {
    onSnapshot(doc(db, 'portfolio', 'config'), (snapshot) => {
      if (snapshot.exists()) {
        const data = snapshot.data();
        activeKiraConfig = {
          apiKey: data.kiraApiKey || DEFAULT_KIRA_CONFIG.apiKey,
          baseUrl: data.kiraBaseUrl || DEFAULT_KIRA_CONFIG.baseUrl,
          model: data.kiraModel || DEFAULT_KIRA_CONFIG.model,
          imageModel: data.kiraImageModel || DEFAULT_KIRA_CONFIG.imageModel,
          ttsModel: data.kiraTtsModel || DEFAULT_KIRA_CONFIG.ttsModel,
          ttsVoice: data.kiraTtsVoice || DEFAULT_KIRA_CONFIG.ttsVoice,
          botName: data.kiraBotName || DEFAULT_KIRA_CONFIG.botName,
          systemPrompt: data.kiraSystemPrompt || DEFAULT_KIRA_CONFIG.systemPrompt
        };
      }
    }, (err) => {
      console.warn("Could not sync Kira AI config from Firestore, using defaults:", err);
    });
  } catch (err) {
    console.warn("Failed to attach Kira AI config listener:", err);
  }
}

export function getActiveKiraConfig() {
  return { ...activeKiraConfig };
}

/**
 * Ask Kira AI (Chat Completions)
 * Supports text, system instructions, and optional image attachment for Vision
 */
export async function askKiraAI(chatMessages, selectedModel = null, imageAttachment = null) {
  try {
    const config = activeKiraConfig;
    const modelToUse = selectedModel || config.model;
    const systemPromptText = config.systemPrompt || DEFAULT_KIRA_CONFIG.systemPrompt;

    const formattedMessages = [
      {
        role: "system",
        content: systemPromptText
      }
    ];

    chatMessages.forEach((m, idx) => {
      const isLastMessage = idx === chatMessages.length - 1;
      const role = m.role === 'ai' ? 'assistant' : 'user';

      // If this is the last user message and has an image attachment (Vision)
      if (isLastMessage && role === 'user' && (imageAttachment || m.image)) {
        const imgUrl = imageAttachment || m.image;
        formattedMessages.push({
          role: "user",
          content: [
            { type: "text", text: m.fullText || m.text || "Please analyze this image." },
            {
              type: "image_url",
              image_url: { url: imgUrl }
            }
          ]
        });
      } else {
        formattedMessages.push({
          role: role,
          content: m.fullText || m.text || ''
        });
      }
    });

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 45000);

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
        model: modelToUse,
        messages: formattedMessages,
        temperature: 0.7
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errBody = await response.text();
      console.error("Kira AI HTTP error:", response.status, errBody);
      throw new Error(`Kira API Error (${response.status})`);
    }

    const data = await response.json();
    const reply = data.choices?.[0]?.message?.content;

    if (!reply) {
      throw new Error("No response returned by Kira AI.");
    }

    return reply;
  } catch (error) {
    console.error("Error calling Kira AI:", error);
    if (error.name === 'AbortError') {
      return "দুঃখিত, Kira AI-এর সাথে সংযোগের সময় শেষ হয়েছে (Timeout)। অনুগ্রহ করে আবার চেষ্টা করুন।";
    }
    return "দুঃখিত, Kira AI সার্ভারে যোগাযোগে সাময়িক সমস্যা হচ্ছে। অনুগ্রহ করে একটু পর আবার চেষ্টা করুন।";
  }
}

/**
 * Generate AI Image using Kira AI Image Model
 */
export async function generateKiraImage(prompt, aspectRatio = "1:1", selectedModel = null) {
  try {
    const config = activeKiraConfig;
    const modelToUse = selectedModel || config.imageModel || "kira-3.0-image";

    const targetBaseUrl = config.baseUrl.replace(/\/+$/, '');
    const endpoint = targetBaseUrl.endsWith('/v1')
      ? `${targetBaseUrl}/images/generations`
      : `${targetBaseUrl}/v1/images/generations`;

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 60000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: modelToUse,
        prompt: prompt,
        aspect_ratio: aspectRatio
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      const errText = await response.text();
      throw new Error(`Image Gen HTTP ${response.status}: ${errText}`);
    }

    const data = await response.json();
    if (data.data && data.data[0]?.b64_json) {
      return {
        success: true,
        imageUrl: `data:image/png;base64,${data.data[0].b64_json}`,
        prompt: prompt
      };
    } else if (data.data && data.data[0]?.url) {
      return {
        success: true,
        imageUrl: data.data[0].url,
        prompt: prompt
      };
    } else {
      throw new Error("No image data returned.");
    }
  } catch (error) {
    console.error("Error generating Kira image:", error);
    return {
      success: false,
      error: error.message || "Failed to generate image"
    };
  }
}

/**
 * Generate Voice Audio (TTS) using Kira AI
 * Returns an audio Blob URL
 */
export async function generateKiraTTS(text, voice = null) {
  try {
    const config = activeKiraConfig;
    const targetBaseUrl = config.baseUrl.replace(/\/+$/, '');
    const endpoint = targetBaseUrl.endsWith('/v1')
      ? `${targetBaseUrl}/audio/speech`
      : `${targetBaseUrl}/v1/audio/speech`;

    // Clean text: remove markdown symbols for natural reading
    const cleanText = text
      .replace(/```[\s\S]*?```/g, 'Code block omitted.')
      .replace(/`([^`]+)`/g, '$1')
      .replace(/[*_#~[\]()]/g, '')
      .slice(0, 500); // Limit length for speed

    const controller = new AbortController();
    const timeoutId = setTimeout(() => controller.abort(), 30000);

    const response = await fetch(endpoint, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Authorization": `Bearer ${config.apiKey}`
      },
      body: JSON.stringify({
        model: config.ttsModel || "kira-3.0-flash-tts",
        input: cleanText,
        voice: voice || config.ttsVoice || "alloy"
      }),
      signal: controller.signal
    });

    clearTimeout(timeoutId);

    if (!response.ok) {
      throw new Error(`TTS HTTP error ${response.status}`);
    }

    const blob = await response.blob();
    const audioUrl = URL.createObjectURL(blob);
    return { success: true, audioUrl };
  } catch (error) {
    console.error("Error generating Kira TTS:", error);
    return { success: false, error: error.message };
  }
}

/**
 * Test Connection for Admin Panel
 */
export async function testKiraConnection({ apiKey, baseUrl, model }) {
  const targetBaseUrl = (baseUrl || activeKiraConfig.baseUrl).replace(/\/+$/, '');
  const url = targetBaseUrl.endsWith('/v1') ? `${targetBaseUrl}/chat/completions` : `${targetBaseUrl}/v1/chat/completions`;
  const key = apiKey || activeKiraConfig.apiKey;
  const modelName = model || activeKiraConfig.model;

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
          { role: "system", content: "You are a test assistant. Reply with only: 'Kira AI connection successful!'" },
          { role: "user", content: "Test ping" }
        ],
        max_tokens: 40
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
    const reply = data.choices?.[0]?.message?.content || "Connected successfully!";
    return { success: true, reply };
  } catch (err) {
    clearTimeout(timeoutId);
    return { success: false, error: err.name === 'AbortError' ? 'Connection timed out (20s)' : err.message };
  }
}
