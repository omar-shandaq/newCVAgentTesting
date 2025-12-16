// ai.js
// API wrapper, prompts application, parsing, recommendation engine, and chat rendering helpers.

import {
  GEMINI_PROXY_URL,
  // 16-12-2025 Ghaith's Change Start - streaming endpoint
  GEMINI_STREAM_URL,
  // 16-12-2025 Ghaith's Change End
  getFinalCertificateCatalog,
  //Ghaith's change start
  getFinalTrainingCoursesCatalog,
  //Ghaith's change end
} from "./constants.js";

import {
  certificateCatalog,
  getCatalogAsPromptString,
  //Ghaith's change start
  getTrainingCoursesCatalogAsPromptString,
  //Ghaith's change end
  summarizeRecommendationsForChat,
  calculateYearsFromPeriod,
  calculateTotalExperience,
} from "./storage-catalog.js";

import {
  CHAT_SYSTEM_PROMPT_BASE,
  ANALYSIS_SYSTEM_PROMPT,
  RULES_SYSTEM_PROMPT,
  CV_PARSER_SYSTEM_PROMPT,
} from "./prompts.js";

// 15-12-2025 Starting Taif's updates 

const RETRY_CONFIG = {
  maxRetries: 3,              // Number of retry attempts
  initialDelay: 1000,         // Initial delay in ms
  maxDelay: 5000,             // Maximum delay in ms
  backoffMultiplier: 2        // Exponential backoff multiplier
};

// 15-12-2025 Ending Taif's updates

// ---------------------------------------------------------------------------
// Proxy + Gemini call - INTEGRATED: Your proxy function
// ---------------------------------------------------------------------------
export async function callGeminiProxy(payload) {
  const response = await fetch(GEMINI_PROXY_URL, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(payload),
  });

  if (!response.ok) {
    const error = await response.text();
    throw new Error(`Gemini proxy error: ${error || response.statusText}`);
  }

  const data = await response.json();
  return data.text || "";
}

// 16-12-2025 Ghaith's Change Start
/**
 * Streaming proxy call: reads chunks from the Vercel edge function
 * and passes each chunk to the provided callbacks.
 *
 * @param {object} payload - The JSON body to send (prompt, history, etc.)
 * @param {(chunk: string) => void} onChunk - Called for each text chunk
 * @param {() => void} [onDone] - Called when the stream finishes
 * @param {(error: Error) => void} [onError] - Called if an error occurs
 */
export async function callGeminiProxyStream(
  payload,
  onChunk,
  onDone,
  onError
) {
  try {
    const response = await fetch(GEMINI_STREAM_URL, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(payload),
    });

    if (!response.ok) {
      const errorText = await response.text();
      throw new Error(errorText || response.statusText);
    }

    if (!response.body) {
      throw new Error("Streaming not supported by this response/browser.");
    }

    const reader = response.body.getReader();
    const decoder = new TextDecoder("utf-8");

    let done = false;
    while (!done) {
      const result = await reader.read();
      done = result.done;
      if (done) break;

      const chunkText = decoder.decode(result.value, { stream: true });
      if (chunkText && typeof onChunk === "function") {
        onChunk(chunkText);
      }
    }

    if (typeof onDone === "function") {
      onDone();
    }
  } catch (err) {
    console.error("callGeminiProxyStream error:", err);
    if (typeof onError === "function") {
      onError(err);
    }
  }
}
// 16-12-2025 Ghaith's Change End


export async function callGeminiAPI(userPrompt, history = [], systemPrompt = "") {
  const formattedHistory = history.map((msg) => ({
    role: msg.isUser ? "user" : "model",
    parts: [{ text: msg.text }],
  }));

  const combinedPrompt = systemPrompt
    ? `${systemPrompt.trim()}\n\nUser message:\n${userPrompt}`
    : userPrompt;

  const contents = [
    ...formattedHistory,
    { role: "user", parts: [{ text: combinedPrompt }] },
  ];

  const proxyPayload = { prompt: combinedPrompt, history: contents };
  return await callGeminiProxy(proxyPayload);
}

// ---------------------------------------------------------------------------
// Chat UI helpers (markdown + typing indicator)
// ---------------------------------------------------------------------------
export function addMessage(text, isUser = false) {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return;

  const messageDiv = document.createElement("div");
  messageDiv.className = `message ${isUser ? "user-message" : "bot-message"}`;

  if (!isUser && typeof marked !== "undefined") {
    messageDiv.innerHTML = marked.parse(text);
  } else {
    messageDiv.innerHTML = text.replace(/\n/g, "<br>");
  }

  // Append the message without automatically scrolling the container.
  // Overall scroll position is controlled explicitly by the chat streaming logic.
  chatMessages.appendChild(messageDiv);
}

export function showTypingIndicator() {
  const chatMessages = document.getElementById("chat-messages");
  if (!chatMessages) return null;

  const typingDiv = document.createElement("div");
  typingDiv.className = "message bot-message typing-indicator";
  typingDiv.id = "typing-indicator";
  typingDiv.innerHTML =
    '<span class="typing-dot"></span><span class="typing-dot"></span><span class="typing-dot"></span>';

  // Add the typing indicator without changing scroll position.
  chatMessages.appendChild(typingDiv);
  return typingDiv;
}

export function hideTypingIndicator() {
  const typingIndicator = document.getElementById("typing-indicator");
  if (typingIndicator) {
    typingIndicator.remove();
  }
}

// ---------------------------------------------------------------------------
// Chat context builders
// ---------------------------------------------------------------------------
export function buildChatSystemPrompt(uploadedCvs) {
  const catalogString = getCatalogAsPromptString();
  //Ghaith's change start
  const trainingCatalogString = getTrainingCoursesCatalogAsPromptString();
  //Ghaith's change end
  const hasCvContext = uploadedCvs.length > 0;
  
  // Safe handling if structured data is not yet parsed (isParsing=true)
  const cvContext = hasCvContext
    ? `\n\n**Available CV Context:**\nThe user has uploaded ${uploadedCvs.length} CV(s). You can reference their experience, skills, and background when making recommendations.`
    : `\n\n**Note:** The user has not uploaded a CV yet. You can still answer general questions about certifications, but for personalized recommendations, encourage them to upload their CV.`;

  return `${CHAT_SYSTEM_PROMPT_BASE.trim()}

**Available Certifications Catalog:**
${catalogString}
//Ghaith's change start
**Available Training Courses Catalog:**
${trainingCatalogString}
//Ghaith's change end
${cvContext}

When recommending certifications, always:
1. Reference specific certifications from the catalog above by their exact name
2. Explain the match clearly and conversationally:
   - **Skills Alignment**: Mention specific skills from their background that match the certification requirements (e.g., "Your experience with AWS services like EC2 and S3 aligns perfectly with...")
   - **Experience Level**: Reference their years of experience if relevant (e.g., "With your 5+ years in cloud architecture, you're well-positioned for...")
   - **Role Relevance**: Explain how the certification fits their current role or career goals (e.g., "As a Solutions Architect, this certification would validate your expertise in...")
   - **Career Impact**: Describe what the certification enables or validates (e.g., "This would demonstrate your ability to design scalable systems and could open doors to senior architect roles")
3. Be conversational and natural - respond as if having a friendly, helpful discussion
4. If the user asks about certifications not in the catalog, acknowledge it and suggest similar ones from the catalog
5. When users ask casual questions like "what certifications should I get?" or "what matches my experience?", provide personalized recommendations with clear explanations

**IMPORTANT - CV Upload Encouragement:**
${hasCvContext 
  ? "The user has uploaded their CV, so you can provide personalized recommendations based on their actual experience, skills, and background."
  : `When answering questions about certifications or courses:
- Always provide a helpful, informative answer first
- After your answer, naturally suggest: "If you'd like me to give you a more detailed review and personalized recommendations based on your specific experience, skills, and career goals, please upload your CV. I can then analyze your background and provide tailored certification suggestions that align perfectly with your profile."
- Be friendly and encouraging, not pushy
- Only mention CV upload once per conversation unless they ask about it again`}

Example of a good response (when no CV is uploaded):
"The AWS Certified Solutions Architect - Associate is an excellent certification for cloud professionals. It validates your ability to design and deploy scalable, highly available systems on AWS. The exam covers topics like EC2, S3, VPC, IAM, and cost optimization strategies.

If you'd like me to give you a more detailed review and personalized recommendations based on your specific experience, skills, and career goals, please upload your CV. I can then analyze your background and provide tailored certification suggestions that align perfectly with your profile."
`;
}

export function buildChatContextMessage(userMessage, userRules, lastRecommendations) {
  const rulesText =
    userRules && userRules.length > 0
      ? userRules.map((r, i) => `${i + 1}. ${r}`).join("\n")
      : "No explicit business rules provided.";

  const recSummary = summarizeRecommendationsForChat(lastRecommendations);

  return `${userMessage}

[Context]
Business rules:
${rulesText}

Latest recommendations:
${recSummary}`;
}

// ---------------------------------------------------------------------------
// CV parsing helpers (PDF, DOCX, TXT)
// ---------------------------------------------------------------------------

// Configure PDF.js worker
if (window.pdfjsLib) {
  window.pdfjsLib.GlobalWorkerOptions.workerSrc =
    "https://cdnjs.cloudflare.com/ajax/libs/pdf.js/3.11.174/pdf.worker.min.js";
}

async function extractTextFromPdf(file) {
  const arrayBuffer = await file.arrayBuffer();
  const pdf = await window.pdfjsLib.getDocument({ data: arrayBuffer }).promise;
  let fullText = "";
  for (let pageNum = 1; pageNum <= pdf.numPages; pageNum++) {
    const page = await pdf.getPage(pageNum);
    const content = await page.getTextContent();
    const strings = content.items.map((item) => item.str);
    fullText += strings.join(" ") + "\n\n";
  }
  return fullText;
}

async function extractTextFromDocx(file) {
  const arrayBuffer = await file.arrayBuffer();
  const result = await window.mammoth.extractRawText({ arrayBuffer });
  return result.value || "";
}

export async function extractTextFromFile(file) {
  const name = file.name.toLowerCase();
  const type = file.type;

  if (type === "application/pdf" || name.endsWith(".pdf")) {
    return await extractTextFromPdf(file);
  }
  if (
    type ===
      "application/vnd.openxmlformats-officedocument.wordprocessingml.document" ||
    name.endsWith(".docx")
  ) {
    return await extractTextFromDocx(file);
  }
  if (type === "text/plain" || name.endsWith(".txt")) {
    return await file.text();
  }

  console.warn(
    `Unknown file type (${type}, ${name}); attempting file.text() anyway.`
  );
  return await file.text();
}

export async function parseCvIntoStructuredSections(rawText) {
  const prompt = `
${CV_PARSER_SYSTEM_PROMPT.trim()}

CV Text to parse:
---
${rawText}
---

Return the JSON object only, no other text.
`;

  const rawResponse = await callGeminiAPI(prompt, [], "");
  const cleaned = rawResponse.replace(/```json\s*|\s*```/g, "").trim();

  try {
    const parsed = JSON.parse(cleaned);
    return {
      experience: Array.isArray(parsed.experience) ? parsed.experience : [],
      education: Array.isArray(parsed.education) ? parsed.education : [],
      certifications: Array.isArray(parsed.certifications) ? parsed.certifications : [],
      skills: Array.isArray(parsed.skills) ? parsed.skills : [],
      other: {
        achievements: parsed.other?.achievements || [],
        languages: parsed.other?.languages || [],
        summary: parsed.other?.summary || "",
        interests: parsed.other?.interests || ""
      }
    };
  } catch (err) {
    console.error("Failed to parse CV sections:", err);
    console.error("Raw AI response:", rawResponse);
    return null;
  }
}

// ---------------------------------------------------------------------------
// Rule parsing
// ---------------------------------------------------------------------------
export async function parseAndApplyRules(rulesText) {
  const prompt = `
${RULES_SYSTEM_PROMPT.trim()}

User's rules:
${rulesText}

Remember:
- Respond with ONLY a JSON array of strings.
- No extra commentary or formatting.
`;

  const rawResponse = await callGeminiAPI(prompt, [], "");
  const cleaned = rawResponse.replace(/```json\s*|\s*```/g, "").trim();

  const parsed = JSON.parse(cleaned);
  if (!Array.isArray(parsed)) {
    throw new Error("Parsed rules are not an array.");
  }
  return parsed;
}

// ---------------------------------------------------------------------------
// Recommendation engine
// ---------------------------------------------------------------------------
export function buildAnalysisPromptForCvs(cvArray, rulesArray, language = 'en') {
  const catalogString = getCatalogAsPromptString();
  //Ghaith's change start
  const trainingCatalogString = getTrainingCoursesCatalogAsPromptString();
  //Ghaith's change end
  const langInstruction = language === 'ar' 
    //Ghaith's change start
    ? "Output the 'reason' field strictly in Arabic. Keep 'candidateName', 'certName', and 'courseName' in their original text."
    //Ghaith's change end
    : "Output the 'reason' field in English.";
  return `
${ANALYSIS_SYSTEM_PROMPT.trim()}

**Catalog of Certifications:**
${catalogString}
//Ghaith's change start
**Catalog of Training Courses:**
${trainingCatalogString}
//Ghaith's change end
${langInstruction}
**Business Rules:**
${rulesArray && rulesArray.length > 0
      ? rulesArray.map((r) => `- ${r}`).join("\n")
      : "No specific business rules provided."
    }

**CVs to Analyze:**
${cvArray
      .map((cv) => `--- CV for: ${cv.name} ---\n${cv.text}`)
      .join("\n\n")}

**Task:**
For each CV, provide recommendations in a structured JSON format. The JSON must be an object with a "candidates" field, where each candidate is an object.

**JSON Structure:**
{
  "candidates": [
    {
      "candidateName": "Full Name of Candidate",
      "recommendations": [
        {
          "certId": "pmp",
          "certName": "Project Management Professional (PMP)",
          "reason": "Clear explanation of why this certification is relevant.",
          "rulesApplied": ["List of rules that influenced this recommendation"]
        }
      ],
//Ghaith's change start
      "trainingCourses": [
        {
          "courseId": "training_1_...",
          "courseName": "Fundamentals of Entrepreneurship",
          "reason": "Clear explanation of why this training course is relevant.",
          "rulesApplied": ["List of rules that influenced this recommendation"]
        }
      ]
//Ghaith's change end
    }
  ]
}

**CRITICAL INSTRUCTIONS:**
- You MUST respond with ONLY a valid JSON object. Nothing else.
- Do NOT include any introductory text, explanations, comments, or markdown formatting.
- Do NOT wrap the JSON in code blocks like \`\`\`json or \`\`\`.
- Do NOT add any text before or after the JSON object.
- Start your response with { and end with }.
- The entire response must be parseable as JSON without any modifications.
- If no recommendations can be made for a candidate, provide an empty array [] for their "recommendations" field.
//Ghaith's change start
- If no training courses can be recommended, provide an empty array [] for their "trainingCourses" field.
//Ghaith's change end

**Example of correct response format:**
{"candidates":[{"candidateName":"John Doe","recommendations":[],"trainingCourses":[]}]}

Begin your response now with the JSON object only:
`;
}

// START OF EDIT BY JOUD
/**
 * NEW: Analyzes a single CV and returns recommendations for just that person.
 * Includes robust JSON extraction to handle AI chatter.
 */
export async function analyzeSingleCvWithAI(cv, rulesArray, language = 'en', maxRetries = 3) {
  const catalogString = getCatalogAsPromptString();
  //Ghaith's change start
  const trainingCatalogString = getTrainingCoursesCatalogAsPromptString();
  //Ghaith's change end

  // 14-12-2025 Taif + Ghaith/Joud merged instruction
  const langInstruction =
    language === 'ar'
      ? "Output the 'reason' field AND 'recommendationIntro' field strictly in Arabic. Keep 'candidateName', 'certName', and 'courseName' in their original text."
      : "Output the 'reason' field AND 'recommendationIntro' field in English.";

  const introTemplate =
    language === 'ar'
      ? "مقدمة موجزة تنتهي بـ: بناءً على ذلك، نوصي بالشهادات التالية: (50 كلمة كحد أقصى)"
      : "Brief intro ending with: Based on this, we recommend the following certificates: (MAXIMUM 50 WORDS)";

  const prompt = `
${ANALYSIS_SYSTEM_PROMPT.trim()}

**Catalog of Certifications:**
${catalogString}
//Ghaith's change start
**Catalog of Training Courses:**
${trainingCatalogString}
//Ghaith's change end

**LANGUAGE INSTRUCTION:**
${langInstruction}

**Business Rules:**
${rulesArray && rulesArray.length > 0 ? rulesArray.map((r) => `- ${r}`).join("\n") : "No specific business rules provided."}

**CV to Analyze:**
--- CV Name: ${cv.name} ---
${cv.text}

**Task:**
Provide recommendations for this specific candidate in strict JSON format.

**JSON Structure (SINGLE OBJECT, NOT ARRAY):**
{
  "candidateName": "Full Name Extracted from CV",
  "recommendationIntro": "${introTemplate}",
  "recommendations": [
    {
      "certId": "pmp",
      "certName": "Project Management Professional (PMP)",
      "reason": "${language === 'ar' ? 'السبب باللغة العربية' : 'Reason in English'}",
      "rulesApplied": ["Rule 1"]
    }
  ],
  //Ghaith's change start
  "trainingCourses": [
    {
      "courseId": "training_1_...",
      "courseName": "Fundamentals of Entrepreneurship",
      "reason": "Clear explanation of why this training course matches.",
      "rulesApplied": ["Rule 1"]
    }
  ]
  //Ghaith's change end
}

**CRITICAL REMINDERS:**
- recommendationIntro MUST be in ${language === 'ar' ? 'Arabic' : 'English'}
- recommendationIntro MUST be MAXIMUM 50 WORDS
- recommendationIntro MUST end with "${language === 'ar' ? 'بناءً على ذلك، نوصي بالشهادات التالية:' : 'Based on this, we recommend the following certificates:'}"
- recommendationIntro should ONLY describe candidate background (seniority, years, expertise)
- Do NOT mention WHY certifications are recommended in the intro
- reason field MUST be in ${language === 'ar' ? 'Arabic' : 'English'}
- Respond with a SINGLE OBJECT, NOT wrapped in "candidates" array
- Response must be valid JSON only
- No markdown formatting
- Start with { and end with }
`;

  // 15-12-2025 Starting Taif's updates 
  let lastError = null;

  for (let attempt = 1; attempt <= maxRetries; attempt++) {
    try {
      const rawResponse = await callGeminiAPI(prompt, [], "");

      // --- ROBUST JSON EXTRACTION LOGIC (Joud's code) ---
      let cleaned = rawResponse.trim();

      // Helper to extract JSON by balancing braces
      function extractJSON(str) {
        const startIndex = str.indexOf('{');
        if (startIndex === -1) return null;

        let balance = 0;
        let inString = false;
        let escaped = false;

        for (let i = startIndex; i < str.length; i++) {
          const char = str[i];

          if (inString) {
            if (char === '\\' && !escaped) escaped = true;
            else if (char === '"' && !escaped) inString = false;
            else escaped = false;
          } else {
            if (char === '"') {
              inString = true;
            } else if (char === '{') {
              balance++;
            } else if (char === '}') {
              balance--;
              if (balance === 0) {
                // Found the matching closing brace
                return str.substring(startIndex, i + 1);
              }
            }
          }
        }
        return null;
      }

      const jsonSubset = extractJSON(cleaned);

      // Fallback to original cleaning if extractor fails (rare)
      if (jsonSubset) {
        cleaned = jsonSubset;
      } else {
        cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
        const firstBrace = cleaned.indexOf("{");
        const lastBrace = cleaned.lastIndexOf("}");
        if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
          cleaned = cleaned.substring(firstBrace, lastBrace + 1);
        }
      }
      // -------------------------------------

      const singleResult = JSON.parse(cleaned);
      singleResult.cvName = cv.name;

      // Ensure recommendationIntro exists as a string for downstream UI/PDF usage
      if (typeof singleResult.recommendationIntro !== "string") {
        singleResult.recommendationIntro =
          language === "ar"
            ? "لم يتم العثور على توصيات مناسبة بناءً على المعلومات المتاحة. بناءً على ذلك، نوصي بالشهادات التالية:"
            : "No suitable recommendations found based on available information. Based on this, we recommend the following certificates:";
      }

      
      return singleResult;

    } catch (err) {
      lastError = err;
      console.error(`Attempt ${attempt}/${maxRetries} failed for CV ${cv.name}:`, err.message);

      
      if (attempt < maxRetries) {
        const delay = Math.min(
          RETRY_CONFIG.initialDelay * Math.pow(RETRY_CONFIG.backoffMultiplier, attempt - 1),
          RETRY_CONFIG.maxDelay
        );
        console.error(`Retrying in ${delay}ms...`);
        await new Promise(resolve => setTimeout(resolve, delay));
      }
    }
  }

  // All retries exhausted - return fallback
  console.error(`All ${maxRetries} attempts failed for CV ${cv.name}:`, lastError);

  return {
    candidateName: cv.name,
    cvName: cv.name,
    recommendationIntro:
      language === "ar"
        ? "لم يتم العثور على توصيات مناسبة بناءً على المعلومات المتاحة. بناءً على ذلك، نوصي بالشهادات التالية:"
        : "No suitable recommendations found based on available information. Based on this, we recommend the following certificates:",
    recommendations: [],
    error: `Failed to generate recommendations after ${maxRetries} attempts.`
  };
  // 15-12-2025 Ending Taif's updates - Retry mechanism
}
// END OF EDIT BY JOUD

export async function analyzeCvsWithAI(cvArray, rulesArray, language = 'en') {
  const analysisPrompt = buildAnalysisPromptForCvs(cvArray, rulesArray || [], language);
  const rawResponse = await callGeminiAPI(analysisPrompt, [], "");
  
  // Log raw response for debugging
  console.log("Raw AI Response:", rawResponse);
  
  // Try multiple cleaning strategies
  let cleaned = rawResponse.trim();
  
  // Remove markdown code blocks
  cleaned = cleaned.replace(/```json\s*/gi, "").replace(/```\s*/g, "").trim();
  
  // Try to extract JSON object if there's text before/after
  // Look for the first { and last } to extract the JSON object
  const firstBrace = cleaned.indexOf("{");
  const lastBrace = cleaned.lastIndexOf("}");
  
  if (firstBrace !== -1 && lastBrace !== -1 && lastBrace > firstBrace) {
    cleaned = cleaned.substring(firstBrace, lastBrace + 1);
  }
  
  // Remove any leading/trailing non-JSON text
  cleaned = cleaned.trim();

  let recommendations;
  try {
    recommendations = JSON.parse(cleaned);
  } catch (err) {
    console.error("JSON Parsing Error:", err);
    console.error("Cleaned response that failed to parse:", cleaned);
    console.error("First 500 chars of cleaned response:", cleaned.substring(0, 500));
    throw new Error(
      "The AI returned an invalid JSON format. Check the console for the raw response."
    );
  }
  return recommendations;
}

export function displayRecommendations(recommendations, containerEl, resultsSectionEl, language = 'en') {
  console.log("📋 displayRecommendations called with:", recommendations);
  if (!containerEl || !resultsSectionEl) {
    console.error("❌ displayRecommendations: Missing container or resultsSection elements!");
    return;
  }
  const catalog = getFinalCertificateCatalog(); // Load catalog
  //Ghaith's change start
  const trainingCatalog = getFinalTrainingCoursesCatalog();
  //Ghaith's change end
  console.log("📚 Catalog loaded, certificates count:", catalog.length);
  //Ghaith's change start
  console.log("📚 Training catalog loaded, courses count:", trainingCatalog.length);
  //Ghaith's change end
  containerEl.innerHTML = "";

  function getColor(hours) {
    if (hours <= 100) return "#c8f7c5";
    if (hours < 200) return "#ffe5b4";
    return "#f5b5b5";
  }
  
  if (
    !recommendations ||
    !recommendations.candidates ||
    recommendations.candidates.length === 0
  ) {
    containerEl.innerHTML =
      "<p>No recommendations could be generated. Please check the CVs, rules, and the console for errors.</p>";
  } else {
    recommendations.candidates.forEach((candidate) => {
      const candidateDiv = document.createElement("div");
      candidateDiv.className = "candidate-result";

      // CV name (if available)
      if (candidate.cvName) {
        const cvNameDiv = document.createElement("div");
        cvNameDiv.className = "candidate-cv-name";
        cvNameDiv.textContent = candidate.cvName;
        candidateDiv.appendChild(cvNameDiv);
      }

      const nameDiv = document.createElement("h3");
      nameDiv.className = "candidate-name";
      const rawName = candidate.candidateName || "Candidate";
      // Avoid duplicate filename/title: if same as cvName, show a generic label
      if (
        candidate.cvName &&
        rawName.toLowerCase().trim() === candidate.cvName.toLowerCase().trim()
      ) {
        nameDiv.textContent = "Candidate";
      } else {
        nameDiv.textContent = rawName;
      }
      candidateDiv.appendChild(nameDiv);

      // 14-12-2025 Taif's update merged - candidate intro block
      const introDiv = document.createElement("div");
      introDiv.className = "recommendation-intro";

      let introText =
        candidate.recommendationIntro || candidate.recommendationSummary || "";

      if (!introText) {
        if (language === "ar") {
          introText =
            "هذا دور مهم ويتطلب خبرة قوية على المستوى الاستراتيجي. بناءً على خبرات المرشح الحالية ودوره المستهدف، تم ترشيح الشهادات التالية لأنها تعزز المهارات الأساسية وتدعم التقدّم المهني.";
        } else {
          introText =
            "This is a senior and critical role that requires strong strategic capability. Based on the candidate's background and target responsibilities, the following certifications are recommended to strengthen core skills and support career growth.";
        }
      }

      introDiv.textContent = introText;
      candidateDiv.appendChild(introDiv);

      //Ghaith's change start
      // ========== CERTIFICATES SUBSECTION ==========
      const certificatesSubsection = document.createElement("div");
      certificatesSubsection.className = "recommendations-subsection";
      const certTitle = document.createElement("h4");
      certTitle.className = "subsection-title";
      certTitle.textContent = language === "ar" ? "الشهادات" : "Certificates";
      certificatesSubsection.appendChild(certTitle);

      const certTimeline = [];
      let certTotalHours = 0;
      //Ghaith's change end

      if (candidate.recommendations && candidate.recommendations.length > 0) {
        candidate.recommendations.forEach((rec) => {
          let displayName = rec.certName;
          if (language === 'ar') {
            const found = catalog.find(c => c.name === rec.certName || c.Certificate_Name_EN === rec.certName);
            if (found && found.nameAr) displayName = found.nameAr;
          }

          // Find catalog entry for this recommendation
          const catalogEntry =
            catalog.find(c => c.id === rec.certId) ||
            catalog.find(c =>
              c.name === rec.certName ||
              c.Certificate_Name_EN === rec.certName
            );

          // Get hours from catalog entry
          const rawHours =
            catalogEntry?.Estimated_Hours_To_Complete ??
            catalogEntry?.estimatedHours ??
            catalogEntry?.estimated_hours ??
            0;
          let hours = Number(rawHours) || 0;
          
          // Debug: log if hours are found
          if (!hours && catalogEntry) {
            console.warn(`No hours found for certificate: ${rec.certName}`, catalogEntry);
          }
          
          //Ghaith's change start
          certTimeline.push({ name: displayName, hours });
          certTotalHours += hours;
          //Ghaith's change end

          const card = document.createElement("div");
          card.className = "recommendation-card";

          const hourWord = language === "ar" ? "ساعة" : "hours";
          const hoursText =
            hours > 0
              ? `${hours} ${hourWord}`
              : (language === "ar" ? "غير متوفر" : "N/A");

          card.innerHTML = `
            <div class="recommendation-title">${displayName}</div>
            <div class="recommendation-reason">
              <i class="fas fa-lightbulb"></i> ${rec.reason}
            </div>
            <div class="recommendation-hours recommendation-hours-inline">
              <i class="far fa-clock"></i>
              <span>${language === "ar"
                      ? "الوقت التقديري لإكمال الشهادة:"
                      : "Estimated time to complete:"}
              </span>
              <strong>${hoursText}</strong>
              ${
                rec.rulesApplied && rec.rulesApplied.length > 0
                  ? `<span class="recommendation-rule-inline">
                       <i class="fas fa-gavel"></i> Rules Applied: ${rec.rulesApplied.join(", ")}
                     </span>`
                  : ""
              }
            </div>
          `;
          //Ghaith's change start
          certificatesSubsection.appendChild(card);
          //Ghaith's change end
        });
      } else {
        const noRecP = document.createElement("p");
        noRecP.textContent =
          "No specific recommendations found for this candidate based on the current rules and catalog.";
        //Ghaith's change start
        certificatesSubsection.appendChild(noRecP);
        //Ghaith's change end
      }

      //Ghaith's change start
      // Certificates Timeline
      if (certTimeline.length > 0 && certTotalHours > 0) {
        const timelineWrapper = document.createElement("div");
        timelineWrapper.className = "timeline-wrapper";
        const titleText =
          language === "ar"
            ? "الوقت التقريبي لإكمال الشهادات المقترحة"
            : "Estimated timeline to complete recommended certificates";
        const totalLabel = language === "ar" ? "الإجمالي" : "Total";
        const hourWord = language === "ar" ? "ساعة" : "hours";
        const isArabic = language === "ar";
        const barsHtml = `
          <div class="stacked-bar ${isArabic ? "stacked-bar-rtl" : ""}">
            ${certTimeline
            .map((item) => {
              const safeHours = Number(item.hours) || 0;
              const percentage =
                safeHours > 0 ? (safeHours / certTotalHours) * 100 : 0;
              const displayHours = `${safeHours} ${hourWord}`;
              const color = getColor(safeHours);
              return `
                  <div class="bar-segment" style="width:${percentage}%; background:${color}">
                    <span class="segment-hours">${displayHours}</span>
                  </div>
                `;
            })
            .join("")}
          </div>
          <div class="stacked-labels ${isArabic ? "stacked-labels-rtl" : ""}">
            ${certTimeline
            .map((item) => {
              const safeHours = Number(item.hours) || 0;
              const percentage =
                safeHours > 0 ? (safeHours / certTotalHours) * 100 : 0;
              return `
                  <div class="segment-label" style="width:${percentage}%">
                    ${item.name}
                  </div>
                `;
            })
            .join("")}
          </div>
        `;
        timelineWrapper.innerHTML = `
          <h4 class="timeline-title ${isArabic ? "timeline-title-rtl" : ""}">
            ${titleText} — ${totalLabel}: <strong>${certTotalHours}</strong> ${hourWord}
          </h4>
          <div class="stacked-timeline ${isArabic ? "stacked-timeline-rtl" : ""}">
            ${barsHtml}
          </div>
        `;
        certificatesSubsection.appendChild(timelineWrapper);
      }
      candidateDiv.appendChild(certificatesSubsection);

      // ========== TRAINING COURSES SUBSECTION ==========
      const trainingSubsection = document.createElement("div");
      trainingSubsection.className = "recommendations-subsection";
      const trainingTitle = document.createElement("h4");
      trainingTitle.className = "subsection-title";
      trainingTitle.textContent = language === "ar" ? "الدورات التدريبية" : "Training Courses";
      trainingSubsection.appendChild(trainingTitle);

      const trainingTimeline = [];
      let trainingTotalHours = 0;

      if (candidate.trainingCourses && candidate.trainingCourses.length > 0) {
        candidate.trainingCourses.forEach((rec) => {
          let displayName = rec.courseName;
          if (language === 'ar') {
            const found = trainingCatalog.find(c => c.name === rec.courseName || c["Training Course Title"] === rec.courseName);
            if (found && found.nameAr) displayName = found.nameAr;
          }

          const catalogEntry =
            trainingCatalog.find(c => c.id === rec.courseId) ||
            trainingCatalog.find(c =>
              c.name === rec.courseName ||
              c["Training Course Title"] === rec.courseName
            );

          //Ghaith's change start - training hours (prefer rec, then catalog) to avoid N/A
          let hours = 0;
          if (rec && (rec.hours || rec.totalHours || rec.estimatedHours)) {
            hours = rec.hours || rec.totalHours || rec.estimatedHours || 0;
          } else if (catalogEntry) {
            hours = catalogEntry.totalHours || 
                    catalogEntry["Total Hours"] || 
                    catalogEntry["عدد الساعات"] || 
                    0;
          }
          hours = Number(hours) || 0;
          //Ghaith's change end
          
          trainingTimeline.push({ name: displayName, hours });
          trainingTotalHours += hours;

          const card = document.createElement("div");
          card.className = "recommendation-card";

          const hourWord = language === "ar" ? "ساعة" : "hours";
          const hoursText =
            hours > 0
              ? `${hours} ${hourWord}`
              : (language === "ar" ? "غير متوفر" : "N/A");

          card.innerHTML = `
            <div class="recommendation-title">${displayName}</div>
            <div class="recommendation-reason">
              <i class="fas fa-lightbulb"></i> ${rec.reason}
            </div>
            <div class="recommendation-hours">
              <i class="far fa-clock"></i>
              <span>${language === "ar"
                      ? "عدد الساعات:"
                      : "Total hours:"}
              </span>
              <strong>${hoursText}</strong>
              ${
                rec.rulesApplied && rec.rulesApplied.length > 0
                  ? `<span class="recommendation-rule-inline">
                       <i class="fas fa-gavel"></i> ${language === "ar" ? "القواعد:" : "Rules:"} ${rec.rulesApplied.join(", ")}
                     </span>`
                  : ""
              }
            </div>
          `;
          trainingSubsection.appendChild(card);
        });
      } else {
        const noRecP = document.createElement("p");
        noRecP.textContent = language === "ar" 
          ? "لا توجد توصيات للدورات التدريبية."
          : "No training course recommendations found.";
        trainingSubsection.appendChild(noRecP);
      }

      // Training Courses Timeline
      if (trainingTimeline.length > 0 && trainingTotalHours > 0) {
        const timelineWrapper = document.createElement("div");
        timelineWrapper.className = "timeline-wrapper";
        const titleText =
          language === "ar"
            ? "الوقت التقريبي لإكمال الدورات التدريبية المقترحة"
            : "Estimated timeline to complete recommended training courses";
        const totalLabel = language === "ar" ? "الإجمالي" : "Total";
        const hourWord = language === "ar" ? "ساعة" : "hours";
        const isArabic = language === "ar";
        const barsHtml = `
          <div class="stacked-bar ${isArabic ? "stacked-bar-rtl" : ""}">
            ${trainingTimeline
            .map((item) => {
              const safeHours = Number(item.hours) || 0;
              const percentage =
                safeHours > 0 ? (safeHours / trainingTotalHours) * 100 : 0;
              const displayHours = `${safeHours} ${hourWord}`;
              const color = getColor(safeHours);
              return `
                  <div class="bar-segment" style="width:${percentage}%; background:${color}">
                    <span class="segment-hours">${displayHours}</span>
                  </div>
                `;
            })
            .join("")}
          </div>
          <div class="stacked-labels ${isArabic ? "stacked-labels-rtl" : ""}">
            ${trainingTimeline
            .map((item) => {
              const safeHours = Number(item.hours) || 0;
              const percentage =
                safeHours > 0 ? (safeHours / trainingTotalHours) * 100 : 0;
              return `
                  <div class="segment-label" style="width:${percentage}%">
                    ${item.name}
                  </div>
                `;
            })
            .join("")}
          </div>
        `;
        timelineWrapper.innerHTML = `
          <h4 class="timeline-title ${isArabic ? "timeline-title-rtl" : ""}">
            ${titleText} — ${totalLabel}: <strong>${trainingTotalHours}</strong> ${hourWord}
          </h4>
          <div class="stacked-timeline ${isArabic ? "stacked-timeline-rtl" : ""}">
            ${barsHtml}
          </div>
        `;
        trainingSubsection.appendChild(timelineWrapper);
      }
      candidateDiv.appendChild(trainingSubsection);
      //Ghaith's change end

      containerEl.appendChild(candidateDiv);
    });
  }

  // Always show results section when recommendations are displayed
  if (resultsSectionEl) {
    resultsSectionEl.classList.remove("hidden");
    console.log("✅ Results section shown (hidden class removed)");
    console.log("   Results section classes:", resultsSectionEl.className);
  } else {
    console.error("❌ Results section element not found!");
  }
  
  console.log("📊 displayRecommendations completed. Total candidates displayed:", 
    recommendations?.candidates?.length || 0);
}

// 14-12-2025 Taif's updates merged - translateRecommendations helper
export async function translateRecommendations(recommendations, targetLang) {
  if (
    !recommendations ||
    !recommendations.candidates ||
    recommendations.candidates.length === 0
  ) {
    return recommendations;
  }

  const translationPrompt =
    targetLang === "ar"
      ? `You are a professional translator. Translate the following certification recommendation content from English to Arabic. Maintain the same meaning, tone, and professional style.

CRITICAL RULES:

- Translate ONLY the "recommendationIntro" and "reason" fields
- Keep "candidateName", "certName", "certId", and "rulesApplied" exactly as they are
- Maintain the same JSON structure
- Do not add or remove any information
- Keep the translation concise and professional
- Return ONLY valid JSON, no markdown, no explanations

Input JSON:
${JSON.stringify(recommendations, null, 2)}

Return the translated JSON object starting with { and ending with }:`
      : `You are a professional translator. Translate the following certification recommendation content from Arabic to English. Maintain the same meaning, tone, and professional style.

CRITICAL RULES:

- Translate ONLY the "recommendationIntro" and "reason" fields
- Keep "candidateName", "certName", "certId", and "rulesApplied" exactly as they are
- Maintain the same JSON structure
- Do not add or remove any information
- Keep the translation concise and professional
- Return ONLY valid JSON, no markdown, no explanations

Input JSON:
${JSON.stringify(recommendations, null, 2)}

Return the translated JSON object starting with { and ending with }:`;

  try {
    const rawResponse = await callGeminiAPI(translationPrompt, [], "");

    let cleaned = rawResponse.trim();
    cleaned = cleaned
      .replace(/```json\s*/gi, "")
      .replace(/```\s*/g, "")
      .trim();

    const firstBrace = cleaned.indexOf("{");
    const lastBrace = cleaned.lastIndexOf("}");
    if (firstBrace !== -1 && lastBrace !== -1) {
      cleaned = cleaned.substring(firstBrace, lastBrace + 1);
    }

    const translated = JSON.parse(cleaned);
    return translated;
  } catch (err) {
    console.error("Translation failed:", err);
    return recommendations;
  }
}

// Re-export utility used in UI for CV summary
export { calculateTotalExperience };
