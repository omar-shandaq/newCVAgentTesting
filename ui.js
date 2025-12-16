// ui.js
// Entry point: wires DOM events, dynamic rules UI, and coordinates modules.

import {
  DEFAULT_RULES,
  DEFAULT_RULES_EN,
  DEFAULT_RULES_AR,
  getDefaultRules,
  getFinalCertificateCatalog,
  //Ghaith's change start
  getFinalTrainingCoursesCatalog,
  //Ghaith's change end
} from "./constants.js";

import {
  saveChatHistory,
  loadChatHistory,
  saveUserRules,
  loadUserRules,
  saveLastRecommendations,
  loadLastRecommendations,
  loadCertificateCatalog,
  //Ghaith's change start
  loadTrainingCoursesCatalog,
  //Ghaith's change end
  calculateTotalExperience,
  calculateYearsFromPeriod,
  // 12-15-2025 Joud start
  setPersistence,
  isPersistenceEnabled,
  saveSubmittedCvs, // Imported
  loadSubmittedCvs, // Imported
  // 12-15-2025 joud end
} from "./storage-catalog.js";

import {
  addMessage,
  showTypingIndicator,
  hideTypingIndicator,
  buildChatSystemPrompt,
  buildChatContextMessage,
  extractTextFromFile,
  parseCvIntoStructuredSections,
  parseAndApplyRules,
  analyzeCvsWithAI,
  displayRecommendations,
  // 16-12-2025 Ghaith's Change Start
  callGeminiAPI,
  callGeminiProxyStream,
  // 16-12-2025 Ghaith's Change End
  analyzeSingleCvWithAI, 
} from "./ai.js";

// --- GLOBAL STATE ---
let currentLang = 'en';
let uploadedCvs = [];
let submittedCvData = [];
let allRecommendationsMap = {};
let lastRecommendations = { candidates: [] }; 
let userRules = [];

// --- TRANSLATION DICTIONARY ---
// Starting Taif's updates
const UI_TEXT = {
  en: {
    // App Strings
    appTitle: "SkillMatch Pro",
    tagline: "AI-powered training and certification recommendations",
    chatTitle: "Chat Assistant",
    chatPlaceholder: "Ask about training programs, upload CVs, or set rules...",
    uploadTitle: "Upload CVs",
    dragDrop: "Drag & drop CV files here or click to browse",
    rulesTitle: "Business Rules",
    optional: "Optional",
    addRule: "Add Rule",
    generateBtn: "Generate Recommendations",
    uploadedCvs: "Uploaded CVs",
    reviewTitle: "CV Analysis Review",
    searchCv: "Search CV by name...",
    submit: "Submit",
    recommendationsTitle: "Recommendations",
    // 12-15-2025 Joud start
    // Save Toggle
    saveSession: "Save Session",
    // 12-15-2025 joud end
    downloadBtn: "Download Recommendations (PDF)",
    welcomeMessage: `Hello! I'm your training and certification assistant. I can help you:
      <ul>
        <li>Discuss training programs and certificates</li>
        <li>Analyze CVs for suitable recommendations</li>
        <li>Adjust recommendations based on your business rules</li>
      </ul>
      How can I help you today?`,
    toggleBtnText: "العربية",
    enterRule: "Enter a business rule...",
    
    // Timeline Text
    estTime: "Estimated time to complete:",
    total: "Total",
    hours: "hours",
    na: "N/A",
    rulesApplied: "Rules:",

    // CV Field Labels
    experience: "Experience",
    education: "Education",
    certifications: "Certifications",
    skills: "Skills",
    jobTitle: "Job Title",
    company: "Company Name",
    description: "Description",
    years: "Years",
    degree: "Degree and Field of study",
    school: "School",
    certification: "Certification",
    skill: "Skill",
    add: "+ Add",
    submitSingle: "Submit CV",
    submitAll: "Submit all CVs",
    
    // PDF Specific
    pdfTitle: "Training & Certification Recommendations",
    pdfGeneratedOn: "Generated on",
    pdfCandidate: "Candidate",
    pdfFile: "File",
        footerRights: "All rights reserved"

  },
  ar: {
    // App Strings
    appTitle: "SkillMatch Pro",
    tagline: "توصيات التدريب والشهادات المدعومة بالذكاء الاصطناعي",
    chatTitle: "المساعد الذكي",
    chatPlaceholder: "اسأل عن البرامج، ارفع السير الذاتية...",
    uploadTitle: "رفع السير الذاتية",
    dragDrop: "اسحب وأفلت الملفات هنا أو انقر للتصفح",
    rulesTitle: "قواعد العمل",
    optional: "اختياري",
    addRule: "إضافة قاعدة",
    generateBtn: "إصدار التوصيات",
    uploadedCvs: "السير الذاتية المرفوعة",
    reviewTitle: "مراجعة التحليل",
    searchCv: "بحث عن السيرة الذاتية...",
    submit: "إرسال",
    recommendationsTitle: "التوصيات",
    downloadBtn: "تحميل التوصيات (PDF)",
    welcomeMessage: `مرحباً! أنا مساعد التدريب والشهادات الخاص بك. يمكنني مساعدتك في:
      <ul>
        <li>مناقشة البرامج التدريبية والشهادات</li>
        <li>تحليل السيرة الذاتية للحصول على توصيات مناسبة</li>
        <li>تعديل التوصيات بناءً على قواعد عملك</li>
      </ul>
      كيف يمكنني مساعدتك اليوم؟`,
    toggleBtnText: "English",
    enterRule: "أدخل قاعدة عمل...",
    // 12-15-2025 Joud start
    // Save Toggle
    saveSession: "حفظ الجلسة",
    // 12-15-2025 Joud end
    // Timeline Text
    estTime: "الوقت التقديري لإكمال الشهادة:",
    total: "الإجمالي",
    hours: "ساعة",
    na: "غير متوفر",
    rulesApplied: "القواعد المطبقة:",

    // CV Field Labels
    experience: "الخبرة المهنية",
    education: "التعليم",
    certifications: "الشهادات",
    skills: "المهارات",
    jobTitle: "المسمى الوظيفي",
    company: "اسم الشركة",
    description: "الوصف",
    years: "السنوات",
    degree: "الدرجة ومجال الدراسة",
    school: "الجامعة / المدرسة",
    certification: "اسم الشهادة",
    skill: "المهارة",
    add: "+ إضافة",
    submitSingle: "إرسال السيرة الذاتية",
    submitAll: "إرسال جميع السير الذاتية",

    // PDF Specific
    pdfTitle: "توصيات التدريب والشهادات",
    pdfGeneratedOn: "تم الإصدار في",
    pdfCandidate: "المرشح",
    pdfFile: "الملف",
        footerRights: "جميع الحقوق محفوظة"
  }
};
// Ending Taif's updates
const STATUS_MESSAGES = {
  en: {
    analyzing: "Parsing details in background...",
    extracting: "Reading files...",
    parsing: "Parsing CV into sections...",
    success: "Files ready! You can generate recommendations now.",
    error: "Failed to read files.",
    selectFile: "Please select at least one CV file.",
    generating: "Generating recommendations...",
    genSuccess: "Recommendations generated successfully!",
    rulesSaved: "Rules saved successfully.",
    rulesCleared: "Rules cleared.",
    completedCVs: "Completed CVs."
  },
  ar: {
    analyzing: "جاري تحليل التفاصيل في الخلفية...",
    extracting: "جاري قراءة الملفات...",
    parsing: "جاري تقسيم السيرة الذاتية إلى أقسام...",
    success: "الملفات جاهزة! يمكنك إصدار التوصيات الآن.",
    error: "فشل في قراءة الملفات.",
    selectFile: "يرجى اختيار ملف سيرة ذاتية واحد على الأقل.",
    generating: "جاري إصدار التوصيات...",
    genSuccess: "تم إصدار التوصيات بنجاح!",
    rulesSaved: "تم حفظ القواعد بنجاح.",
    rulesCleared: "تم مسح القواعد.",
    completedCVs: "تم الانتهاء من السير الذاتية."
  }
};

function getStatusText(key) {
  return STATUS_MESSAGES[currentLang][key] || STATUS_MESSAGES['en'][key];
}

function getUiText(key) {
  return UI_TEXT[currentLang][key] || UI_TEXT['en'][key];
}

// ===========================================================================
// LANGUAGE HANDLING
// ===========================================================================

// 14-12-2025 Starting Taif's updates
function updateLanguage(lang) {
  currentLang = lang;
  document.documentElement.lang = lang;

  if (lang === 'ar') {
    document.body.classList.add('keep-ltr-layout');
    document.body.classList.remove('ltr-layout');
  } else {
    document.body.classList.add('ltr-layout');
    document.body.classList.remove('keep-ltr-layout');
  }

  document.querySelectorAll('[data-i18n]').forEach(el => {
    const key = el.getAttribute('data-i18n');
    if (el && UI_TEXT[lang][key]) {
      const icon = el.querySelector('i');
      if (icon) {
        const iconClone = icon.cloneNode(true);
        el.textContent = " " + UI_TEXT[lang][key];
        el.prepend(iconClone);
      } else {
        el.textContent = UI_TEXT[lang][key];
      }
    }
  });

  document.querySelectorAll('[data-i18n-placeholder]').forEach(el => {
    const key = el.getAttribute('data-i18n-placeholder');
    if (el && UI_TEXT[lang][key]) {
      el.placeholder = UI_TEXT[lang][key];
    }
  });

  const langTextSpan = document.getElementById('lang-text');
  if (langTextSpan) langTextSpan.textContent = UI_TEXT[lang].toggleBtnText;

  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    const firstMsg = chatMessages.querySelector('.bot-message');
    if (chatMessages.children.length === 1 && firstMsg) {
      firstMsg.innerHTML = UI_TEXT[lang].welcomeMessage;
    }
  }

  const currentRulesFromUI = getRulesFromUI();
  const prevLang = lang === 'en' ? 'ar' : 'en';
  const prevDefaults = prevLang === 'en' ? DEFAULT_RULES_EN : DEFAULT_RULES_AR;
  const newDefaults = lang === 'en' ? DEFAULT_RULES_EN : DEFAULT_RULES_AR;

  const isUsingDefaults = JSON.stringify(currentRulesFromUI) === JSON.stringify(prevDefaults);

  if (isUsingDefaults) {
    userRules = [...newDefaults];
    initializeRulesUI(userRules);
    saveUserRules(userRules);
  } else {
    const ruleInputs = document.querySelectorAll('.rule-input');
    ruleInputs.forEach(input => {
      input.placeholder = UI_TEXT[lang].enterRule;
    });
  }

  if (submittedCvData.length > 0) {
    renderSubmittedCvBubbles(submittedCvData);
  }

  const recommendationsContainer = document.getElementById("recommendations-container");
  const resultsSection = document.getElementById("results-section");

  if (
    recommendationsContainer &&
    lastRecommendations &&
    lastRecommendations.candidates &&
    lastRecommendations.candidates.length > 0
  ) {
    recommendationsContainer.innerHTML = `<div class="loader"></div>`;

    (async () => {
      try {
        const { translateRecommendations } = await import("./ai.js");
        const translatedRecommendations = await translateRecommendations(lastRecommendations, lang);

        lastRecommendations = translatedRecommendations;
        saveLastRecommendations(lastRecommendations);

        recommendationsContainer.innerHTML = "";
        displayRecommendations(translatedRecommendations, recommendationsContainer, resultsSection, lang);
      } catch (err) {
        recommendationsContainer.innerHTML = "";
        displayRecommendations(lastRecommendations, recommendationsContainer, resultsSection, lang);
      }
    })();
  }
}
// 14-12-2025 Ending Taif's updates

function initializeLanguage() {
  const toggleBtn = document.getElementById('language-toggle');
  updateLanguage('en');

  if (toggleBtn) {
    toggleBtn.addEventListener('click', () => {
      const newLang = currentLang === 'en' ? 'ar' : 'en';
      updateLanguage(newLang);
    });
  }
}

// ===========================================================================
// Rules UI
// ===========================================================================

function createRuleInput(ruleText = "") {
  const wrapper = document.createElement("div");
  wrapper.className = "rule-input-wrapper";

  const input = document.createElement("input");
  input.type = "text";
  input.placeholder = getUiText('enterRule');
  input.value = ruleText;
  input.className = "rule-input";

  const deleteBtn = document.createElement("button");
  deleteBtn.type = "button";
  deleteBtn.className = "delete-rule-btn";
  deleteBtn.innerHTML = "×";
  deleteBtn.title = "Delete this rule";

  deleteBtn.addEventListener("click", (e) => {
    e.preventDefault();
    wrapper.remove();
  });

  wrapper.appendChild(input);
  wrapper.appendChild(deleteBtn);
  return wrapper;
}

function initializeRulesUI(rules) {
  const container = document.getElementById("rules-container");
  if (!container) return;

  const statusOverlay = container.querySelector("#rules-status");
  container.innerHTML = "";
  if (statusOverlay) {
    container.appendChild(statusOverlay);
  }

  if (rules && rules.length > 0) {
    rules.forEach((rule) => {
      container.appendChild(createRuleInput(rule));
    });
  } else {
    container.appendChild(createRuleInput());
  }
}

function getRulesFromUI() {
  const container = document.getElementById("rules-container");
  if (!container) return [];

  const inputs = container.querySelectorAll(".rule-input");
  const rules = [];
  inputs.forEach((input) => {
    const value = input.value.trim();
    if (value) {
      rules.push(value);
    }
  });
  return rules;
}

// 14-12-2025 Starting Taif's updates
function updateGenerateButton(uploadedCvs) {
  const generateBtn = document.getElementById("generate-recommendations-btn");
  const fileInput = document.getElementById("file-input");
  if (generateBtn) {
    const hasFiles = fileInput && fileInput.files && fileInput.files.length > 0;
    const hasCvs = uploadedCvs.length > 0;
    generateBtn.disabled = !hasFiles && !hasCvs;
  }
}
// 14-12-2025 Ending Taif's updates

// ---------------------------------------------------------------------------
// Candidate Card Creation (With Timeline)
// ---------------------------------------------------------------------------
function createCandidateCard(candidateData, language = 'en') {
  const catalog = getFinalCertificateCatalog();
  //Ghaith's change start
  const trainingCatalog = getFinalTrainingCoursesCatalog();
  //Ghaith's change end
  const candidateDiv = document.createElement("div");
  candidateDiv.className = "candidate-result";
  candidateDiv.style.opacity = "0"; 
  candidateDiv.style.animation = "slideIn 0.5s forwards"; 

  let displayCandidateName = candidateData.candidateName;
  if (!displayCandidateName || displayCandidateName === "N/A" || displayCandidateName === "n/a") {
      displayCandidateName = candidateData.cvName || (language === 'ar' ? "مرشح" : "Candidate");
  }

  const nameDiv = document.createElement("h3");
  nameDiv.className = "candidate-name";
  nameDiv.textContent = displayCandidateName;
  candidateDiv.appendChild(nameDiv);

  if (candidateData.cvName && candidateData.cvName !== displayCandidateName) {
    const fileDiv = document.createElement("div");
    fileDiv.className = "candidate-cv-name";
    fileDiv.textContent = `File: ${candidateData.cvName}`;
    candidateDiv.appendChild(fileDiv);
  }

  // 14-12-2025 Taif's intro in main UI cards as well
  const introDiv = document.createElement("div");
  introDiv.className = "recommendation-intro";

  let introText =
    candidateData.recommendationIntro ||
    candidateData.recommendationSummary ||
    "";

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

  if (candidateData.recommendations && candidateData.recommendations.length > 0) {
    candidateData.recommendations.forEach((rec) => {
      let displayName = rec.certName;
      let catalogEntry = null;

      // Try to find catalog entry to translate name
      if (catalog) {
        catalogEntry = catalog.find(c => c.id === rec.certId) ||
          catalog.find(c =>
            c.name === rec.certName ||
            c.Certificate_Name_EN === rec.certName
          );
      }

      if (language === 'ar') {
        if (catalogEntry && catalogEntry.nameAr) displayName = catalogEntry.nameAr;
      }

      // Timeline Data Collection
      let hours = catalogEntry?.Estimated_Hours_To_Complete || catalogEntry?.estimatedHours || 0;
      hours = Number(hours) || 0;
      //Ghaith's change start
      certTimeline.push({ name: displayName, hours });
      certTotalHours += hours;
      //Ghaith's change end

      const hourWord = getUiText('hours');
      const hoursText = hours > 0 ? `${hours} ${hourWord}` : getUiText('na');

      const card = document.createElement("div");
      card.className = "recommendation-card";
      card.innerHTML = `
        <div class="recommendation-title">${displayName}</div>
        <div class="recommendation-reason">
          <i class="fas fa-lightbulb"></i> ${rec.reason}
        </div>
        <div class="recommendation-hours">
          <i class="far fa-clock"></i>
          <span>${getUiText('estTime')}</span>
          <strong>${hoursText}</strong>
          ${rec.rulesApplied && rec.rulesApplied.length > 0
              ? `<span class="recommendation-rule-inline"><i class="fas fa-gavel"></i> ${getUiText('rulesApplied')} ${rec.rulesApplied.join(", ")}</span>`
              : ""
          }
        </div>
      `;
      //Ghaith's change start
      certificatesSubsection.appendChild(card);
      //Ghaith's change end
    });
  } else {
    const msg = document.createElement("p");
    msg.textContent = candidateData.error || (language === 'ar' ? "لم يتم العثور على توصيات." : "No specific recommendations found.");
    //Ghaith's change start
    certificatesSubsection.appendChild(msg);
    //Ghaith's change end
  }

  //Ghaith's change start
  // Certificates Timeline
  if (certTimeline.length > 0 && certTotalHours > 0) {
    const timelineWrapper = document.createElement("div");
    timelineWrapper.className = "timeline-wrapper";

    //Ghaith's change start - make timeline more compact by including total in title
    const hourWord = getUiText('hours');
    const isArabic = language === "ar";
    const baseTitleText = language === "ar" ? "الوقت التقريبي لإكمال الشهادات المقترحة" : "Estimated timeline to complete recommended certificates";
    const titleText = `${baseTitleText} (${getUiText('total')}: ${certTotalHours} ${hourWord})`;
    //Ghaith's change end

    // Helper color function
    function getColor(hours) {
      if (hours <= 100) return "#c8f7c5"; // Greenish
      if (hours < 200) return "#ffe5b4";  // Yellowish
      return "#f5b5b5";                   // Reddish
    }

    const barsHtml = `
      <div class="stacked-bar ${isArabic ? "stacked-bar-rtl" : ""}">
        ${certTimeline.map((item) => {
          const safeHours = Number(item.hours) || 0;
          const percentage = safeHours > 0 ? (safeHours / certTotalHours) * 100 : 0;
          const displayHours = `${safeHours} ${hourWord}`;
          const color = getColor(safeHours);

          return `
              <div class="bar-segment" style="width:${percentage}%; background:${color}" title="${item.name}: ${displayHours}">
                <span class="segment-hours">${safeHours > 0 ? safeHours : ''}</span>
              </div>
            `;
        }).join("")}
      </div>

      <div class="stacked-labels ${isArabic ? "stacked-labels-rtl" : ""}">
        ${certTimeline.map((item) => {
          const safeHours = Number(item.hours) || 0;
          const percentage = safeHours > 0 ? (safeHours / certTotalHours) * 100 : 0;
          if (percentage < 5) return ""; // Hide label if too small
          return `
              <div class="segment-label" style="width:${percentage}%">
                ${item.name}
              </div>
            `;
        }).join("")}
      </div>
    `;

    //Ghaith's change start - remove total row, total now in title
    timelineWrapper.innerHTML = `
      <h4 class="timeline-title ${isArabic ? "timeline-title-rtl" : ""}">${titleText}</h4>
      <div class="stacked-timeline ${isArabic ? "stacked-timeline-rtl" : ""}">
        ${barsHtml}
      </div>
    `;
    //Ghaith's change end
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

  if (candidateData.trainingCourses && candidateData.trainingCourses.length > 0) {
    candidateData.trainingCourses.forEach((rec) => {
      let displayName = rec.courseName;
      let catalogEntry = null;

      if (trainingCatalog) {
        catalogEntry = trainingCatalog.find(c => c.id === rec.courseId) ||
          trainingCatalog.find(c => c.name === rec.courseName) ||
          trainingCatalog.find(c => c["Training Course Title"] === rec.courseName) ||
          trainingCatalog.find(c => c.nameAr === rec.courseName) ||
          trainingCatalog.find(c => c["اسم الدورة التدريبية"] === rec.courseName);
      }

      if (language === 'ar') {
        if (catalogEntry && catalogEntry.nameAr) displayName = catalogEntry.nameAr;
      }

        //Ghaith's change start - training hours (prefer rec, then catalog) to avoid N/A
        let hours = 0;
        if (rec && (rec.hours || rec.totalHours || rec.estimatedHours)) {
          hours = rec.hours || rec.totalHours || rec.estimatedHours || 0;
        }
        if (hours === 0 && catalogEntry) {
          hours = catalogEntry.totalHours || 
                  catalogEntry["Total Hours"] || 
                  catalogEntry["عدد الساعات"] || 
                  0;
        }
        hours = Number(hours) || 0;
        //Ghaith's change end
      trainingTimeline.push({ name: displayName, hours });
      trainingTotalHours += hours;

      const hourWord = getUiText('hours');
      const hoursText = hours > 0 ? `${hours} ${hourWord}` : getUiText('na');

      const card = document.createElement("div");
      card.className = "recommendation-card";
      //Ghaith's change start
      card.innerHTML = `
        <div class="recommendation-title">${displayName}</div>
        <div class="recommendation-reason">
          <i class="fas fa-lightbulb"></i> ${rec.reason}
        </div>
        <div class="recommendation-hours">
          <i class="far fa-clock"></i>
          <span>${getUiText('estTime')}</span>
          <strong>${hoursText}</strong>
          ${rec.rulesApplied && rec.rulesApplied.length > 0
              ? `<span class="recommendation-rule-inline"><i class="fas fa-gavel"></i> ${getUiText('rulesApplied')} ${rec.rulesApplied.join(", ")}</span>`
              : ""
          }
        </div>
      `;
      //Ghaith's change end
      trainingSubsection.appendChild(card);
    });
  } else {
    const msg = document.createElement("p");
    msg.textContent = language === 'ar' ? "لا توجد توصيات للدورات التدريبية." : "No training course recommendations found.";
    trainingSubsection.appendChild(msg);
  }

  // Training Timeline
  if (trainingTimeline.length > 0 && trainingTotalHours > 0) {
    const timelineWrapper = document.createElement("div");
    timelineWrapper.className = "timeline-wrapper";

    //Ghaith's change start - make timeline more compact by including total in title
    const hourWord = getUiText('hours');
    const isArabic = language === "ar";
    const baseTitleText = language === "ar" ? "الوقت التقريبي لإكمال الدورات التدريبية المقترحة" : "Estimated timeline to complete recommended training courses";
    const titleText = `${baseTitleText} (${getUiText('total')}: ${trainingTotalHours} ${hourWord})`;
    //Ghaith's change end

    // Helper color function
    function getColor(hours) {
      if (hours <= 100) return "#c8f7c5"; // Greenish
      if (hours < 200) return "#ffe5b4";  // Yellowish
      return "#f5b5b5";                   // Reddish
    }

    const barsHtml = `
      <div class="stacked-bar ${isArabic ? "stacked-bar-rtl" : ""}">
        ${trainingTimeline.map((item) => {
          const safeHours = Number(item.hours) || 0;
          const percentage = safeHours > 0 ? (safeHours / trainingTotalHours) * 100 : 0;
          const displayHours = `${safeHours} ${hourWord}`;
          const color = getColor(safeHours);

          return `
              <div class="bar-segment" style="width:${percentage}%; background:${color}" title="${item.name}: ${displayHours}">
                <span class="segment-hours">${safeHours > 0 ? safeHours : ''}</span>
              </div>
            `;
        }).join("")}
      </div>

      <div class="stacked-labels ${isArabic ? "stacked-labels-rtl" : ""}">
        ${trainingTimeline.map((item) => {
          const safeHours = Number(item.hours) || 0;
          const percentage = safeHours > 0 ? (safeHours / trainingTotalHours) * 100 : 0;
          if (percentage < 5) return ""; // Hide label if too small
          return `
              <div class="segment-label" style="width:${percentage}%">
                ${item.name}
              </div>
            `;
        }).join("")}
      </div>
    `;

    //Ghaith's change start - remove total row, total now in title
    timelineWrapper.innerHTML = `
      <h4 class="timeline-title ${isArabic ? "timeline-title-rtl" : ""}">${titleText}</h4>
      <div class="stacked-timeline ${isArabic ? "stacked-timeline-rtl" : ""}">
        ${barsHtml}
      </div>
    `;
    //Ghaith's change end
    trainingSubsection.appendChild(timelineWrapper);
  }
  candidateDiv.appendChild(trainingSubsection);
  //Ghaith's change end

  return candidateDiv;
}

// ---------------------------------------------------------------------------
// Helpers
// ---------------------------------------------------------------------------

function updateStatus(element, messageKey, isError = false, rawText = null) {
  if (!element) return;
  const text = rawText || getStatusText(messageKey) || messageKey;

  element.innerHTML = `
    <div class="status-message ${isError ? "status-error" : "status-success"}">
      ${text}
    </div>
  `;
  setTimeout(() => { element.innerHTML = ""; }, 8000);
}

function showLoading(element, messageKey, rawText = null) {
  if (!element) return;
  const text = rawText || getStatusText(messageKey) || messageKey;
  element.innerHTML = `<div class="loader"></div>${text}`;
}

function hideLoading(element) {
  if (!element) return;
  element.innerHTML = "";
}

function clearChatHistoryDom() {
  const chatMessages = document.getElementById("chat-messages");
  if (chatMessages) {
    chatMessages.innerHTML = `<div class="message bot-message">${getUiText('welcomeMessage')}</div>`;
  }
}

function updateDownloadButtonVisibility(recommendations) {
  const downloadBtn = document.getElementById("download-recommendations-btn");
  if (!downloadBtn) return;

  if (!recommendations || !recommendations.candidates || recommendations.candidates.length === 0) {
    downloadBtn.classList.add("hidden");
  } else {
    downloadBtn.classList.remove("hidden");
  }
}
// Starting Taif's updates
function downloadRecommendationsAsPDF(recommendations, language = 'en') {
  if (!recommendations || !recommendations.candidates || recommendations.candidates.length === 0) {
    const message = language === 'ar' ? 'لا توجد توصيات للتحميل.' : 'No recommendations to download.';
    alert(message);
    return;
  }

  if (typeof html2pdf === 'undefined') {
    const err = language === 'ar' ? "لم يتم العثور على مكتبة PDF." : "PDF library not found.";
    alert(err);
    return;
  }

  // --- PDF GENERATION LOGIC ---
  const catalog = getFinalCertificateCatalog();
  //Ghaith's change start
  const trainingCatalog = getFinalTrainingCoursesCatalog();
  //Ghaith's change end
  const isArabic = language === 'ar';
  
  // 1. Create a container for the PDF content
  const pdfContainer = document.createElement('div');
  pdfContainer.className = 'pdf-content';
  //Ghaith's change start - remove top spacing so header is at very top of page
  pdfContainer.style.marginTop = '0';
  pdfContainer.style.paddingTop = '0';
  //Ghaith's change end
  if (isArabic) {
    pdfContainer.style.direction = 'rtl';
    pdfContainer.style.textAlign = 'right';
    pdfContainer.style.fontFamily = "'Cairo', sans-serif"; 
  } else {
    pdfContainer.style.fontFamily = "'Roboto', sans-serif";
  }

  // 2. Add Header (match UI header styling)
  //Ghaith's change start
  const header = document.createElement('div');
  header.className = 'pdf-header';
  //Ghaith's change start - ensure recommendations appear directly under header on same page, header at very top
  header.style.pageBreakAfter = 'avoid';
  header.style.breakAfter = 'avoid';
  header.style.marginTop = '0';
  header.style.marginBottom = '0';
  header.style.paddingTop = '0';
  header.style.paddingBottom = '0';
  //Ghaith's change end
  const now = new Date().toLocaleDateString(isArabic ? 'ar-SA' : 'en-US');
  
  const titleText = UI_TEXT[language].pdfTitle;
  const generatedText = UI_TEXT[language].pdfGeneratedOn;
  
  // Reuse the same brand logo SVG as the main UI header for visual consistency
  header.innerHTML = `
    <div style="
      background: linear-gradient(90deg, #074D31, #074D31);
      color: #fff;
      padding: 20px 24px;
      border-radius: 6px;
      display: flex;
      flex-direction: column;
      gap: 8px;
      box-shadow: 0 4px 12px rgba(7, 77, 49, 0.15);
      margin: -8px -8px 16px -8px;
      width: calc(100% + 16px);
    ">
      <div style="display:flex; align-items:center; gap:12px; font-size:20px; font-weight:700;">
        <svg xmlns="http://www.w3.org/2000/svg" width="86" height="40" viewBox="0 0 86 40" fill="none" class="brand-logo">
          <path d="M1.38806 18.0754C1.15332 18.0754 0.979388 17.9014 0.979388 17.6667C0.979388 17.4319 1.15332 17.2579 1.38806 17.2579C1.6228 17.2579 1.78883 17.4319 1.78883 17.6667C1.78883 17.9014 1.6228 18.0754 1.38806 18.0754ZM2.87354 17.6667C2.87354 17.4319 2.70751 17.2579 2.47278 17.2579C2.23804 17.2579 2.06411 17.4319 2.06411 17.6667C2.06411 17.9014 2.23804 18.0754 2.47278 18.0754C2.70751 18.0754 2.87354 17.9014 2.87354 17.6667ZM5.88858 23.3449C5.65384 23.3449 5.47991 23.5189 5.47991 23.7536C5.47991 23.9884 5.65384 24.1624 5.88858 24.1624C6.12332 24.1624 6.28935 23.9884 6.28935 23.7536C6.28935 23.5189 6.12332 23.3449 5.88858 23.3449ZM4.80406 23.3449C4.56932 23.3449 4.39519 23.5189 4.39519 23.7536C4.39519 23.9884 4.56932 24.1624 4.80406 24.1624C5.0388 24.1624 5.20463 23.9884 5.20463 23.7536C5.20463 23.5189 5.0388 23.3449 4.80406 23.3449ZM4.61375 22.6407H4.40329C3.70718 22.6407 3.15262 22.5476 2.89765 22.1024C2.66292 22.2076 2.27039 22.3452 1.74021 22.3452C0.898397 22.3452 0 21.9364 0 20.6859C0 19.5729 0.720391 18.9294 1.91431 18.9294H3.48872V21.3901C3.48872 21.9203 3.75981 22.0579 4.4276 22.0579H4.49637C5.22486 22.0579 5.58109 21.7543 5.58109 21.0137V18.9253H6.2852V21.1432C6.2852 22.1428 5.72672 22.6366 4.60565 22.6366M2.77236 19.496H1.99118C1.33149 19.496 0.696006 19.6781 0.696006 20.6778C0.696006 21.5924 1.38402 21.73 1.80088 21.73C2.21774 21.73 2.55786 21.645 2.77236 21.5115V19.496ZM15.9702 16.3392C15.7354 16.3392 15.5613 16.5132 15.5613 16.7479C15.5613 16.9827 15.7354 17.1567 15.9702 17.1567C16.2049 17.1567 16.3708 16.9827 16.3708 16.7479C16.3708 16.5132 16.2049 16.3392 15.9702 16.3392ZM15.0232 17.6626C15.0232 17.8973 15.1971 18.0714 15.4319 18.0714C15.6666 18.0714 15.8326 17.8973 15.8326 17.6626C15.8326 17.4279 15.6666 17.2538 15.4319 17.2538C15.1971 17.2538 15.0232 17.4279 15.0232 17.6626ZM16.1119 17.6626C16.1119 17.8973 16.2858 18.0714 16.5205 18.0714C16.7553 18.0714 16.9213 17.8973 16.9213 17.6626C16.9213 17.4279 16.7553 17.2538 16.5205 17.2538C16.2858 17.2538 16.1119 17.4279 16.1119 17.6626ZM20.9199 23.3125C20.6852 23.3125 20.511 23.4865 20.511 23.7213C20.511 23.956 20.6852 24.13 20.9199 24.13C21.1546 24.13 21.3205 23.956 21.3205 23.7213C21.3205 23.4865 21.1546 23.3125 20.9199 23.3125ZM23.3441 21.0096C23.3441 21.7503 22.988 22.0538 22.2595 22.0538C21.6605 22.0538 21.3045 21.7826 21.3045 21.2201V18.9253H20.592V21.0137C20.592 21.7543 20.252 22.0579 19.5154 22.0579H19.5073C18.8112 22.0579 18.5766 21.7381 18.5766 21.1432V18.9253H17.8643V21.0137C17.8643 21.4063 17.7873 22.0579 17.1519 22.0579C16.6744 22.0579 16.3506 21.7705 16.3506 21.2241V19.7388H15.6384V21.1027C15.6384 21.6167 15.4724 22.0579 14.8734 22.0579C14.3958 22.0579 14.0721 21.7705 14.0721 21.2241V19.7388H13.3597V21.1027C13.3597 21.6167 13.1939 22.0579 12.5949 22.0579H8.81469V18.9294H8.10248V22.4666C8.10248 23.2315 7.86776 23.5553 7.30924 23.5553C7.17973 23.5553 7.05014 23.5472 6.91658 23.5189L6.81955 24.1098C6.98549 24.1462 7.18362 24.1624 7.34956 24.1624C8.28851 24.1624 8.73383 23.6565 8.80263 22.6407H12.6718C13.4205 22.6407 13.732 22.3007 13.8818 22.0821C14.0639 22.4221 14.4282 22.6407 14.9503 22.6407C15.699 22.6407 16.0105 22.3007 16.1603 22.0821C16.3424 22.4221 16.7593 22.6407 17.2814 22.6407C17.848 22.6407 18.1759 22.3978 18.358 22.074C18.6089 22.4828 19.0864 22.6407 19.6166 22.6407H19.6247C20.337 22.6407 20.8269 22.4504 21.0859 22.0579C21.3166 22.4504 21.7657 22.6164 22.2716 22.6366C22.304 22.6366 22.3364 22.6366 22.3688 22.6366C23.4899 22.6366 24.0565 22.1428 24.0565 21.1432V16.2461H23.3441V21.0096ZM25.5336 22.6366H26.2461V16.2461H25.5336V22.6366Z" fill="white"/>
          <path d="M32.8547 20.6494V21.1432C32.8547 22.1509 32.4178 22.6366 31.3048 22.6366H29.4512V22.0538H31.1388C31.9118 22.0538 32.1384 21.7503 32.1384 21.0096V20.8113C32.1384 20.01 31.843 19.5081 30.6248 19.5081H29.9976V18.9253H30.8596C32.2599 18.9253 32.8508 19.6053 32.8508 20.6454M34.5264 22.4626C34.5264 23.2275 34.2915 23.5513 33.7371 23.5513C33.6076 23.5513 33.4782 23.5432 33.3446 23.5148L33.2474 24.1057C33.4133 24.1422 33.6117 24.1583 33.7776 24.1583C34.7934 24.1583 35.2386 23.5594 35.2386 22.3654V18.9213H34.5264V22.4585V22.4626ZM36.6754 22.6366H37.3877V16.2461H36.6754V22.6366ZM59.6432 16.2461H60.3554V21.1432C60.3554 22.1428 59.7889 22.6366 58.6678 22.6366C58.1093 22.6366 57.571 22.499 57.3201 21.9688C57.0165 22.414 56.547 22.673 55.9561 22.673C55.4947 22.673 55.0172 22.5152 54.5032 22.074C54.3737 22.3776 54.139 22.6407 53.5562 22.6407H41.9528C41.8557 23.5189 41.3862 24.1624 40.1883 24.1624C39.8402 24.1624 39.4153 24.1017 39.0753 24.0248L39.1806 23.4663C39.4518 23.527 39.8159 23.6039 40.1559 23.6039C40.852 23.6039 41.2001 23.3084 41.2406 22.6366H40.6497C38.8325 22.6366 38.4319 21.7422 38.4319 20.8639C38.4319 19.7064 39.1968 18.8727 40.2936 18.8727C41.3904 18.8727 41.9731 19.5243 41.9731 20.5766V22.0538H53.3497C53.7059 22.0538 54.0176 21.7948 54.0459 21.3334C54.1228 19.7429 54.7419 18.8727 55.9318 18.8727C57.2714 18.8727 57.6803 19.8481 57.6803 20.7263C57.6803 20.953 57.652 21.1594 57.6034 21.3617C57.648 21.8757 58.0283 22.0579 58.5585 22.0579C59.287 22.0579 59.6472 21.7543 59.6472 21.0137V16.2501L59.6432 16.2461ZM41.2487 20.8275C41.2487 20.0343 40.9774 19.4717 40.2327 19.4717C39.8604 19.4717 39.1725 19.6619 39.1725 20.8275C39.1725 21.8434 39.8079 22.0538 40.7104 22.0538H41.2487V20.8275ZM56.9558 20.7587C56.9558 19.8805 56.5713 19.4798 55.9197 19.4798C55.2681 19.4798 54.7704 20.1233 54.6935 21.4467C55.1387 21.8555 55.4947 22.066 55.9804 22.066C56.7818 22.066 56.9558 21.2848 56.9558 20.7628M61.8326 22.6407H62.545V16.2501H61.8326V22.6407Z" fill="white"/>
          <path d="M0.0078125 26.627H0.586434V28.6829H2.8691V26.627H3.44792V31.3662H2.8691V29.1686H0.586434V31.3662H0.0078125V26.627ZM8.02927 29.9659C8.02927 30.8279 7.3736 31.4472 6.28491 31.4472C5.19621 31.4472 4.54469 30.832 4.54469 29.9659V26.627H5.12332V29.9052C5.12332 30.5972 5.51998 30.9615 6.2768 30.9615C7.03363 30.9615 7.45045 30.5284 7.45045 29.9052V26.627H8.02927V29.9659ZM11.4127 30.8441H11.4249L12.7604 26.631H13.7479V31.3703H13.1894V27.0721H13.1774L11.769 31.3703H11.0445L9.6845 27.0721H9.67245V31.3703H9.13019V26.631H10.1054L11.4127 30.8441ZM15.468 31.3662H14.8528L16.6578 26.627H17.435L19.2482 31.3662H18.6168L18.0583 29.9456H16.0063L15.468 31.3662ZM16.1519 29.46H17.9166L17.0343 27.0641L16.1519 29.46ZM23.271 30.7551H23.2831V26.627H23.8256V31.3662H22.9756L20.8994 27.2057H20.8872V31.3662H20.3449V26.627H21.215L23.271 30.7551Z" fill="white"/>
          <path d="M26.9175 26.6278H28.5486C29.3864 26.6278 30.0216 27.0002 30.0216 27.8824C30.0216 28.4207 29.7182 28.8376 29.1476 28.9833V28.9954C29.5078 29.0804 29.6697 29.3152 29.8396 29.8858C29.9934 30.4119 30.123 30.849 30.2849 31.3671H29.6697C29.5645 30.9907 29.3905 30.3108 29.2974 29.987C29.1233 29.4163 28.9979 29.2383 28.2613 29.2383H27.4963V31.3671H26.9175V26.6278ZM27.4963 28.7526H28.4109C29.0463 28.7526 29.447 28.5017 29.447 27.9148C29.447 27.247 28.9492 27.1135 28.4514 27.1135H27.4963V28.7526ZM31.155 26.6278H33.7572V27.1135H31.7336V28.6878H33.5995V29.1735H31.7336V30.8855H33.81V31.3711H31.155V26.6319V26.6278ZM37.1933 27.2309C36.8615 27.0973 36.5013 27.0325 36.1533 27.0325C35.7041 27.0325 35.198 27.2066 35.198 27.757C35.198 28.1819 35.4489 28.4126 36.1855 28.7C37.0799 29.044 37.5455 29.4042 37.5455 30.1408C37.5455 31.0757 36.736 31.448 35.9549 31.448C35.538 31.448 34.9998 31.3549 34.5546 31.1566L34.7002 30.6588C35.1333 30.8693 35.5948 30.9664 35.9671 30.9664C36.5378 30.9664 36.9708 30.7155 36.9708 30.1853C36.9708 29.6996 36.5539 29.4568 35.8335 29.1614C35.0241 28.8376 34.6194 28.4329 34.6194 27.8015C34.6194 26.9273 35.4409 26.555 36.1572 26.555C36.5741 26.555 36.995 26.6197 37.3309 26.7533L37.1933 27.2389V27.2309ZM40.4513 31.444C39.1116 31.444 38.3468 30.4241 38.3468 29.0035C38.3468 27.583 39.0954 26.5469 40.4513 26.5469C41.8071 26.5469 42.5559 27.5749 42.5559 29.0035C42.5559 30.4322 41.7909 31.444 40.4513 31.444ZM40.4513 27.0325C39.4152 27.0325 38.9255 27.9229 38.9255 29.0035C38.9255 30.0841 39.4152 30.9624 40.4513 30.9624C41.4873 30.9624 41.9771 30.0801 41.9771 29.0035C41.9771 27.927 41.4873 27.0325 40.4513 27.0325ZM47.036 29.9667C47.036 30.8288 46.3804 31.448 45.2917 31.448C44.203 31.448 43.5556 30.8328 43.5556 29.9667V26.6278H44.1342V29.906C44.1342 30.5941 44.5309 30.9624 45.2877 30.9624C46.0445 30.9624 46.4614 30.5293 46.4614 29.906V26.6278H47.0402V29.9667H47.036ZM48.1168 26.6278H49.7477C50.5855 26.6278 51.221 27.0002 51.221 27.8824C51.221 28.4207 50.9174 28.8376 50.3467 28.9833V28.9954C50.7069 29.0804 50.8728 29.3152 51.0388 29.8858C51.1926 30.4119 51.3262 30.849 51.484 31.3671H50.8688C50.7636 30.9907 50.5896 30.3108 50.4965 29.987C50.3225 29.4163 50.197 29.2383 49.4604 29.2383H48.6954V31.3671H48.1168V26.6278ZM48.6954 28.7526H49.6102C50.2456 28.7526 50.6463 28.5017 50.6463 27.9148C50.6463 27.247 50.1483 27.1135 49.6505 27.1135H48.6954V28.7526ZM55.1871 27.2389C54.9483 27.1013 54.6286 27.0325 54.2927 27.0325C53.0907 27.0325 52.5282 27.9067 52.5282 29.0157C52.5282 30.0639 53.1191 30.9624 54.2807 30.9624C54.6854 30.9624 54.9766 30.8814 55.2559 30.7357L55.4219 31.185C55.0819 31.3711 54.6732 31.444 54.2483 31.444C52.8075 31.444 51.9535 30.4362 51.9535 29.0076C51.9535 27.5789 52.7751 26.5469 54.2888 26.5469C54.6854 26.5469 55.0982 26.6197 55.3693 26.7776L55.1913 27.2349L55.1871 27.2389ZM56.2881 26.6278H58.8903V27.1135H56.8667V28.6878H58.7326V29.1735H56.8667V30.8855H58.943V31.3711H56.2881V26.6319V26.6278ZM62.209 27.2309C61.8772 27.0973 61.5169 27.0325 61.1648 27.0325C60.7156 27.0325 60.2098 27.2066 60.2098 27.757C60.2098 28.1819 60.4607 28.4126 61.1972 28.7C62.0917 29.044 62.557 29.4042 62.557 30.1408C62.557 31.0757 61.7476 31.448 60.9625 31.448C60.5456 31.448 60.0074 31.3549 59.5622 31.1566L59.7078 30.6588C60.1409 30.8693 60.6022 30.9664 60.9745 30.9664C61.5452 30.9664 61.9784 30.7155 61.9784 30.1853C61.9784 29.6996 61.5614 29.4568 60.8451 29.1614C60.0357 28.8376 59.6309 28.4329 59.6309 27.8015C59.6309 26.9273 60.4526 26.555 61.169 26.555C61.5858 26.555 62.0067 26.6197 62.3426 26.7533L62.2049 27.2389L62.209 27.2309Z" fill="white"/>
          <path d="M0.0078125 34.2802H1.35556C2.82064 34.2802 3.67854 35.1908 3.67854 36.6478C3.67854 38.1048 2.81659 39.0154 1.35556 39.0154H0.0078125V34.2761V34.2802ZM0.586434 38.5338H1.27058C2.47664 38.5338 3.10387 37.8295 3.10387 36.6478C3.10387 35.466 2.48069 34.7618 1.27058 34.7618H0.586434V38.5297V38.5338ZM4.64983 34.2802H7.25224V34.7658H5.22865V36.3402H7.09434V36.8258H5.22865V38.5378H7.30481V39.0235H4.64983V34.2842V34.2802ZM7.66901 34.2802H8.28834L9.72917 38.4933H9.74122L11.1739 34.2802H11.7933L10.0934 39.0194H9.35686L7.67316 34.2802H7.66901ZM12.3962 34.2802H14.9986V34.7658H12.975V36.3402H14.8407V36.8258H12.975V38.5378H15.0512V39.0235H12.3962V34.2842V34.2802ZM15.982 34.2802H16.5608V38.5338H18.6573V39.0194H15.982V34.2802ZM20.9115 39.0963C19.5719 39.0963 18.8069 38.0724 18.8069 36.6559C18.8069 35.2393 19.5557 34.1992 20.9115 34.1992C22.2673 34.1992 23.0161 35.2272 23.0161 36.6559C23.0161 38.0845 22.2511 39.0963 20.9115 39.0963ZM20.9115 34.6849C19.8754 34.6849 19.3857 35.5753 19.3857 36.6559C19.3857 37.7365 19.8754 38.6147 20.9115 38.6147C21.9476 38.6147 22.4373 37.7324 22.4373 36.6559C22.4373 35.5793 21.9476 34.6849 20.9115 34.6849ZM23.7931 34.2802H25.3391C26.1809 34.2802 26.9054 34.5918 26.9054 35.6198C26.9054 36.6478 26.1809 37.0323 25.3472 37.0323H24.3718V39.0154H23.7931V34.2761V34.2802ZM24.3718 36.5506H25.2946C25.8451 36.5506 26.3307 36.3726 26.3307 35.64C26.3307 34.9075 25.845 34.7658 25.2379 34.7658H24.3759V36.5506H24.3718ZM29.9246 38.4933H29.9367L31.2723 34.2802H32.2598V39.0194H31.7014V34.7213H31.6891L30.2807 39.0194H29.5562L28.1964 34.7213H28.1844V39.0194H27.6419V34.2802H28.6174L29.9246 38.4933ZM33.1744 34.2802H35.7768V34.7658H33.7532V36.3402H35.6189V36.8258H33.7532V38.5378H35.8294V39.0235H33.1744V34.2842V34.2802ZM39.561 38.4083H39.573V34.2802H40.1194V39.0194H39.2695L37.1933 34.8589H37.1813V39.0194H36.6388V34.2802H37.5089L39.5649 38.4083H39.561ZM41.9488 34.7658H40.5202V34.2802H43.9157V34.7658H42.5234V39.0194H41.9448V34.7658H41.9488Z" fill="white"/>
          <path d="M46.4822 34.2814H48.9751V34.7671H47.0568V36.3414H48.8619V36.8271H47.0568V39.0247H46.478V34.2854L46.4822 34.2814ZM53.2085 37.6203C53.2085 38.4824 52.5528 39.1016 51.4641 39.1016C50.3754 39.1016 49.7239 38.4864 49.7239 37.6203V34.2814H50.3027V37.5596C50.3027 38.2517 50.6994 38.6159 51.4562 38.6159C52.213 38.6159 52.6298 38.1829 52.6298 37.5596V34.2814H53.2085V37.6203ZM57.1262 38.4095H57.1383V34.2814H57.6807V39.0206H56.8308L54.7546 34.8601H54.7424V39.0206H54.2001V34.2814H55.0702L57.1262 38.4095ZM58.8826 34.2814H60.2304C61.6954 34.2814 62.5535 35.192 62.5535 36.649C62.5535 38.106 61.6914 39.0166 60.2304 39.0166H58.8826V34.2773V34.2814ZM59.4614 38.535H60.1454C61.3515 38.535 61.9789 37.8308 61.9789 36.649C61.9789 35.4672 61.3555 34.763 60.1454 34.763H59.4614V38.5309V38.535Z" fill="white"/>
          <path d="M5.20873 14.6774C5.20873 14.4426 5.0427 14.2686 4.80797 14.2686C4.57323 14.2686 4.39929 14.4426 4.39929 14.6774C4.39929 14.9121 4.57323 15.0861 4.80797 15.0861C5.0427 15.0861 5.20873 14.9121 5.20873 14.6774ZM5.89664 15.0861C6.13137 15.0861 6.2974 14.9121 6.2974 14.6774C6.2974 14.4426 6.13137 14.2686 5.89664 14.2686C5.6619 14.2686 5.48796 14.4426 5.48796 14.6774C5.48796 14.9121 5.6619 15.0861 5.89664 15.0861ZM25.554 9.85313H26.2581V12.071C26.2581 13.0706 25.6996 13.5684 24.5785 13.5684C24.5421 13.5684 24.5096 13.5684 24.4813 13.5644C23.9713 13.5442 23.5221 13.3782 23.2914 12.9857C23.0324 13.3782 22.5428 13.5684 21.8305 13.5684C21.2719 13.5684 20.7336 13.4308 20.4827 12.9007C20.1792 13.3459 19.7097 13.6049 19.1188 13.6049C18.6574 13.6049 18.1799 13.447 17.6659 13.0059C17.5364 13.3094 17.3017 13.5725 16.7189 13.5725H7.36572C7.32929 13.5725 7.29287 13.5725 7.26454 13.5684C6.75864 13.5482 6.30953 13.3823 6.07884 12.9897C5.81577 13.3823 5.32997 13.5725 4.61766 13.5725H4.4074C3.71128 13.5725 3.15673 13.4754 2.90176 13.0342C2.66702 13.1394 2.2745 13.2771 1.74432 13.2771C0.9025 13.2771 0.00390625 12.8683 0.00390625 11.6177C0.00390625 10.5047 0.724298 9.86122 1.91822 9.86122H3.49263V12.3219C3.49263 12.8521 3.76372 12.9897 4.43151 12.9897H4.50047C5.24111 12.9897 5.57689 12.6862 5.57689 11.9455V9.85718H6.2893V12.1519C6.2893 12.7185 6.6454 12.9857 7.24438 12.9857H16.5043C16.8605 12.9857 17.1762 12.7226 17.2005 12.2653C17.2774 10.6747 17.8965 9.80456 19.0864 9.80456C20.426 9.80456 20.8349 10.7799 20.8349 11.6582C20.8349 11.8848 20.8066 12.0912 20.758 12.2936C20.8025 12.8076 21.1829 12.9897 21.7131 12.9897C22.4537 12.9897 22.7897 12.6862 22.7897 11.9455V9.85718H23.5019V12.1519C23.5019 12.7185 23.858 12.9857 24.457 12.9857C25.1855 12.9857 25.5458 12.6821 25.5458 11.9415V9.85313H25.554ZM2.78437 10.4278H2.00319C1.3435 10.4278 0.708212 10.61 0.708212 11.6096C0.708212 12.5243 1.39623 12.6619 1.81309 12.6619C2.22995 12.6619 2.56997 12.5769 2.78852 12.4433V10.4278H2.78437ZM20.1185 11.6865C20.1185 10.8083 19.734 10.4076 19.0824 10.4076C18.4308 10.4076 17.9371 11.0511 17.8562 12.3705C18.3014 12.7792 18.6574 12.9897 19.1431 12.9897C19.9444 12.9897 20.1185 12.2086 20.1185 11.6865ZM0.983294 8.59041C0.983294 8.35567 1.15743 8.18164 1.39216 8.18164C1.6269 8.18164 1.79273 8.35567 1.79273 8.59041C1.79273 8.82514 1.6269 8.99917 1.39216 8.99917C1.15743 8.99917 0.983294 8.82514 0.983294 8.59041ZM2.48083 8.99917C2.71557 8.99917 2.8816 8.82514 2.8816 8.59041C2.8816 8.35567 2.71557 8.18164 2.48083 8.18164C2.2461 8.18164 2.07216 8.35567 2.07216 8.59041C2.07216 8.82514 2.2461 8.99917 2.48083 8.99917ZM23.1539 8.99917C23.3886 8.99917 23.5545 8.82514 23.5545 8.59041C23.5545 8.35567 23.3886 8.18164 23.1539 8.18164C22.9192 8.18164 22.745 8.35567 22.745 8.59041C22.745 8.82514 22.9192 8.99917 23.1539 8.99917ZM26.3794 8.18164C26.1447 8.18164 25.9707 8.35567 25.9707 8.59041C25.9707 8.82514 26.1447 8.99917 26.3794 8.99917C26.6141 8.99917 26.7802 8.82514 26.7802 8.59041C26.7802 8.35567 26.6141 8.18164 26.3794 8.18164ZM25.2949 8.99917C25.5296 8.99917 25.6954 8.82514 25.6954 8.59041C25.6954 8.35567 25.5296 8.18164 25.2949 8.18164C25.0601 8.18164 24.886 8.35567 24.886 8.59041C24.886 8.82514 25.0601 8.99917 25.2949 8.99917Z" fill="white"/>
          <path d="M35.3682 13.2226C35.3682 14.4246 34.498 15.0762 32.3328 15.0762C30.4792 15.0762 29.4551 14.4327 29.4551 12.9272C29.4551 12.4739 29.613 11.8223 29.9246 11.2314L30.5681 11.4661C30.3171 12.0489 30.1957 12.5184 30.1957 12.9798C30.1957 14.024 30.9445 14.5015 32.4055 14.5015C33.8665 14.5015 34.6314 14.0563 34.6314 13.4047C34.4493 13.4735 34.2065 13.5626 33.7532 13.5626C32.4743 13.5626 31.8227 12.8058 31.8227 11.7899C31.8227 10.6324 32.5877 9.7987 33.6845 9.7987C34.7813 9.7987 35.3721 10.4503 35.3721 11.5026V13.2226H35.3682ZM34.6395 11.7535C34.6395 10.9602 34.413 10.3977 33.6238 10.3977C33.3122 10.3977 32.5634 10.5555 32.5634 11.7535C32.5634 12.737 33.2918 12.9798 33.822 12.9798C34.2308 12.9798 34.4979 12.8665 34.6395 12.7977V11.7535ZM40.0384 11.5026V13.2064C40.0384 14.2749 39.6217 15.0843 38.2538 15.0843C37.9057 15.0843 37.4807 15.0236 37.1408 14.9467L37.2459 14.3882C37.5171 14.4489 37.8814 14.5258 38.2214 14.5258C38.9094 14.5258 39.3061 14.2304 39.3061 13.4047C39.1239 13.4735 38.8809 13.5626 38.4277 13.5626C37.1568 13.5626 36.489 12.8058 36.489 11.7899C36.489 10.6324 37.2702 9.7987 38.3589 9.7987C39.4476 9.7987 40.0384 10.4503 40.0384 11.5026ZM39.3181 11.7535C39.3181 10.9602 39.0916 10.3977 38.3024 10.3977C37.9907 10.3977 37.242 10.5555 37.242 11.7535C37.242 12.737 37.9704 12.9798 38.5006 12.9798C38.9093 12.9798 39.1805 12.8665 39.3181 12.7977V11.7535ZM62.557 11.7616V12.0651C62.557 13.0729 62.1241 13.5626 61.0192 13.5626H56.4985C56.4661 13.5626 56.4378 13.5626 56.4135 13.5585C55.9157 13.5343 55.4744 13.3683 55.2478 12.9798C54.9888 13.3724 54.4991 13.5626 53.7868 13.5626H45.3727C45.3282 13.5626 45.2878 13.5626 45.2514 13.5545C44.9033 13.5221 44.4581 13.3643 44.2315 13.0122C43.9967 13.3683 43.5879 13.5585 42.8999 13.5585H41.0463V12.9757H42.7339C43.4988 12.9757 43.7256 12.6641 43.7256 11.9316V11.7333C43.7256 10.9319 43.43 10.4301 42.2118 10.4301H41.5846V9.84727H42.4547C43.8469 9.84727 44.4378 10.5272 44.4378 11.5673V12.142C44.4378 12.5832 44.7616 12.9757 45.2553 12.9757H53.6694C54.4101 12.9757 54.75 12.6722 54.75 11.9316V9.84322H55.4624V12.138C55.4624 12.7046 55.8185 12.9717 56.4175 12.9717H57.3645V9.84322H58.0769V10.4341C58.947 9.98892 59.6957 9.79061 60.4323 9.79061C62.0997 9.79061 62.5531 10.8065 62.5531 11.7575M61.8407 11.9397C61.8407 11.0614 61.44 10.3936 60.3554 10.3936C59.5541 10.3936 58.773 10.6648 58.0769 11.0695V12.9757H60.8492C61.6142 12.9757 61.8407 12.6722 61.8407 11.9397ZM33.7938 8.58455C33.7938 8.34981 33.9677 8.17578 34.2024 8.17578C34.4372 8.17578 34.6032 8.34981 34.6032 8.58455C34.6032 8.81928 34.4372 8.99331 34.2024 8.99331C33.9677 8.99331 33.7938 8.81928 33.7938 8.58455ZM33.1138 8.99331C33.3485 8.99331 33.5145 8.81928 33.5145 8.58455C33.5145 8.34981 33.3485 8.17578 33.1138 8.17578C32.879 8.17578 32.7051 8.34981 32.7051 8.58455C32.7051 8.81928 32.879 8.99331 33.1138 8.99331ZM55.0982 8.99331C55.3329 8.99331 55.4988 8.81928 55.4988 8.58455C55.4988 8.34981 55.3329 8.17578 55.0982 8.17578C54.8635 8.17578 54.6893 8.34981 54.6893 8.58455C54.6893 8.81928 54.8635 8.99331 55.0982 8.99331Z" fill="white"/>
          <path d="M71.3196 38.2399C73.2946 36.2406 81.9313 27.3044 84.1775 21.61C84.1775 21.61 75.2535 31.8615 70.061 34.8362C68.523 30.0443 67.8066 24.8599 67.9807 19.7038C69.9881 20.9786 71.2104 24.0019 72.2788 25.2929C72.5864 23.2005 72.6066 21.2012 72.3638 20.1206C73.9827 21.1931 75.4357 22.4073 76.6701 23.7631C76.5365 21.2903 75.6622 18.9793 74.1769 17.0043C77.0707 17.0771 79.8916 17.4859 82.5385 18.2306C80.2599 15.7739 77.0789 14.0418 73.4809 13.1757C73.7197 13.0745 73.9705 12.9612 74.2457 12.8316C77.099 11.5042 79.2521 10.1038 80.5188 9.19727C82.3805 11.9534 84.1047 14.8148 85.1367 17.1095C85.6345 18.1254 85.9138 19.2707 85.9138 20.4808C85.9138 21.5817 85.6831 22.6299 85.2622 23.5769C82.9837 28.5631 77.0788 35.6942 72.0521 39.883C71.7931 39.3448 71.5504 38.7984 71.3156 38.2439L71.3196 38.2399Z" fill="white"/>
          <path d="M78.2479 12.8068C77.05 12.8068 75.9208 13.082 74.909 13.5677C77.9161 14.5147 80.563 16.0971 82.538 18.2219C79.8911 17.4732 77.0702 17.0644 74.1764 16.9916C75.6617 18.9706 76.536 21.2775 76.6696 23.7544C75.4392 22.3986 73.9822 21.1845 72.3633 20.116C72.6061 21.1926 72.5859 23.1919 72.2783 25.2843C73.6422 26.976 75.7145 28.0728 78.0416 28.1335C81.4008 24.7946 84.177 21.6054 84.177 21.6054C83.4485 23.4549 82.0441 25.6445 80.4172 27.8259C83.5942 26.891 85.9174 23.9527 85.9174 20.4722C85.9174 16.2388 82.4853 12.8027 78.2479 12.8027" fill="white"/>
          <path d="M70.3765 7.00695C71.2223 4.68791 72.2947 2.45387 73.6101 0.357422C74.0714 0.818801 74.6017 1.40564 75.1845 2.08962C73.7801 3.8461 72.1694 5.5014 70.3765 7.011" fill="white"/>
          <path d="M79.7579 8.08331C77.1475 8.48398 73.9178 9.33389 72.7441 9.65362C74.2497 7.53694 75.2413 5.21385 75.8525 2.88672C77.0626 4.36799 78.4264 6.17708 79.7579 8.08331Z" fill="white"/>
        </svg>
        <span>SkillMatch Pro</span>
      </div>
      <div style="font-size:14px; font-weight:400; opacity:0.95;">
        ${titleText} - ${generatedText}: ${now}
      </div>
    </div>
  `;
  pdfContainer.appendChild(header);
  //Ghaith's change end

  //Ghaith's change start - inline compact styles for PDF cards/timelines (smaller to fit pages)
  const pdfStyle = document.createElement('style');
  pdfStyle.textContent = `
    /*Ghaith's change start - compact PDF */
    .pdf-content { font-size: 12px; }
    /* 16-12-2025 Ghaith's Change - use padding instead of margin so sections don't float between pages */
    .pdf-candidate-result { margin-top: 0; padding: 8px 0 6px 0; }
    .pdf-candidate-result:first-child { margin-top: 0 !important; padding-top: 0 !important; }
    .pdf-subsection { margin-top: 4px; }
    .pdf-subsection h3 { font-size: 13.5px; margin: 6px 0 4px 0; }
    .pdf-recommendation-card { font-size: 12px; padding: 6px 8px !important; }
    .pdf-recommendation-title { font-size: 13px; }
    .pdf-recommendation-reason { font-size: 12px; }
    .pdf-recommendation-hours, .pdf-recommendation-rule { font-size: 11.5px; }
    .timeline-wrapper { margin-top: 4px; }
    .timeline-title { font-size: 12px; margin-bottom: 3px; }
    .stacked-bar .segment-hours { font-size: 10.5px; }
    .stacked-labels .segment-label { font-size: 10.5px; }
    .total-label { font-size: 11.5px; }
    /*Ghaith's change end */
  `;
  pdfContainer.appendChild(pdfStyle);
  //Ghaith's change end

  // 3. Iterate candidates and build content
  recommendations.candidates.forEach((candidate, index) => {
    const candidateSection = document.createElement('div');
    candidateSection.className = 'pdf-candidate-result';
    //Ghaith's change start - avoid page breaks splitting candidate sections, each CV starts on new page (except first)
    candidateSection.style.pageBreakInside = 'avoid';
    candidateSection.style.breakInside = 'avoid';
    if (index === 0) {
      candidateSection.style.pageBreakBefore = 'avoid';
      candidateSection.style.breakBefore = 'avoid';
      candidateSection.style.marginTop = '0';
      candidateSection.style.paddingTop = '0';
    } else {
      candidateSection.style.pageBreakBefore = 'always';
      candidateSection.style.breakBefore = 'page';
    }
    //Ghaith's change end

    // Candidate Name
    let displayCandidateName = candidate.candidateName;
    if (!displayCandidateName || displayCandidateName === "N/A" || displayCandidateName === "n/a") {
      displayCandidateName = candidate.cvName || (isArabic ? "مرشح" : "Candidate");
    }

    const nameHeader = document.createElement('h3');
    nameHeader.className = 'pdf-candidate-name';
    nameHeader.style.color = '#074D31';
    // 16-12-2025 Ghaith's Change Start - CV section title directly under header (minimal gap)
    nameHeader.style.marginTop = '4px';
    nameHeader.style.marginBottom = '6px';
    // 16-12-2025 Ghaith's Change End
    nameHeader.textContent = `${UI_TEXT[language].pdfCandidate}: ${displayCandidateName}`;
    candidateSection.appendChild(nameHeader);

    if (candidate.cvName && candidate.cvName !== displayCandidateName) {
      const fileDiv = document.createElement('div');
      fileDiv.className = 'pdf-candidate-cv-name';
      //Ghaith's change start - darken file name text, reduce spacing for first candidate
      fileDiv.style.color = '#1B8354';
      fileDiv.style.fontWeight = '600';
      if (index === 0) {
        fileDiv.style.marginBottom = '4px';
      }
      //Ghaith's change end
      fileDiv.textContent = `${UI_TEXT[language].pdfFile}: ${candidate.cvName}`;
      candidateSection.appendChild(fileDiv);
    }

    //Ghaith's change start
    // ========== CERTIFICATES SUBSECTION ==========
    if (candidate.recommendationIntro) {
      const introDiv = document.createElement('p');
      introDiv.className = 'pdf-recommendation-intro';
      introDiv.style.margin = '8px 0 16px 0';
      introDiv.style.padding = '0';
      introDiv.style.fontSize = '11px';
      introDiv.style.lineHeight = '1.6';
      introDiv.style.color = '#1B8354';
      introDiv.textContent = candidate.recommendationIntro;
      candidateSection.appendChild(introDiv);
    }

    if (candidate.recommendations && candidate.recommendations.length > 0) {
      const certSubsection = document.createElement('div');
      certSubsection.className = 'pdf-subsection';
      //Ghaith's change start - certificates section should start on page 1 for first candidate
      const certMarginTop = index === 0 ? '12px' : '20px';
      certSubsection.innerHTML = `<h3 style="color:#1B8354; margin-top:${certMarginTop};">${language === 'ar' ? 'الشهادات' : 'Certificates'}</h3>`;
      //Ghaith's change start - avoid page breaks in certificates subsection, ensure first one starts on page 1
      certSubsection.style.pageBreakInside = 'avoid';
      certSubsection.style.breakInside = 'avoid';
      certSubsection.style.pageBreakBefore = 'avoid';
      certSubsection.style.pageBreakAfter = 'avoid';
      certSubsection.style.breakBefore = 'avoid';
      certSubsection.style.breakAfter = 'avoid';
      //Ghaith's change end
      
      let certTimeline = [];
      let certTotalHours = 0;
    //Ghaith's change end

      candidate.recommendations.forEach(rec => {
        let displayName = rec.certName;
        let catalogEntry = null;

        // Find entry for translation/hours
        if (catalog) {
          catalogEntry = catalog.find(c => c.id === rec.certId) ||
            catalog.find(c => c.name === rec.certName || c.Certificate_Name_EN === rec.certName);
        }

        if (isArabic && catalogEntry && catalogEntry.nameAr) {
          displayName = catalogEntry.nameAr;
        }

        // Timeline Stats
        let hours = catalogEntry?.Estimated_Hours_To_Complete || catalogEntry?.estimatedHours || 0;
        hours = Number(hours) || 0;
        //Ghaith's change start
        certTimeline.push({ name: displayName, hours });
        certTotalHours += hours;
        //Ghaith's change end

        const hourWord = UI_TEXT[language].hours;
        const hoursText = hours > 0 ? `${hours} ${hourWord}` : UI_TEXT[language].na;

        // Recommendation Card
        const card = document.createElement('div');
        card.className = 'pdf-recommendation-card';
        //Ghaith's change start - make each card a separate object that won't split across pages
        // Inline styles for safe PDF rendering if external CSS lags
        card.style.marginBottom = '12px';
        card.style.padding = '10px';
        card.style.borderLeft = isArabic ? 'none' : '4px solid #DF7C2E';
        card.style.borderRight = isArabic ? '4px solid #DF7C2E' : 'none';
        card.style.backgroundColor = '#fbfbfc';
        card.style.pageBreakInside = 'avoid';
        card.style.breakInside = 'avoid';
        //Ghaith's change end

        //Ghaith's change start - match exact UI format with icons and inline rules
        card.innerHTML = `
          <div class="recommendation-title" style="font-weight:600; font-size:1rem; margin:0 0 8px 0; color:#1B8354;">${displayName}</div>
          <div class="recommendation-reason" style="margin:8px 0; color:#1B8354; line-height:1.6;">
            <i class="fas fa-lightbulb"></i> ${rec.reason}
          </div>
          <div class="recommendation-hours" style="margin-top:4px; font-size:0.9rem; color:#7E9196; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <i class="far fa-clock" style="color:#074D31;"></i>
            <span>${UI_TEXT[language].estTime}</span>
            <strong style="color:#1B8354; font-weight:600;">${hoursText}</strong>
            ${rec.rulesApplied && rec.rulesApplied.length > 0
              ? `<span class="recommendation-rule-inline" style="margin-top:0; font-size:0.85rem; color:#7E9196; font-style:italic;"><i class="fas fa-gavel"></i> ${UI_TEXT[language].rulesApplied} ${rec.rulesApplied.join(", ")}</span>`
              : ""
            }
          </div>
        `;
        //Ghaith's change end
        //Ghaith's change start
        certSubsection.appendChild(card);
      });

      // Certificates Timeline
      if (certTimeline.length > 0 && certTotalHours > 0) {
        const timelineWrapper = document.createElement('div');
        timelineWrapper.className = 'timeline-wrapper';
        //Ghaith's change start - make timeline a separate object that won't split across pages
        timelineWrapper.style.pageBreakInside = 'avoid';
        timelineWrapper.style.breakInside = 'avoid';
        timelineWrapper.style.pageBreakBefore = 'avoid';
        timelineWrapper.style.pageBreakAfter = 'avoid';
        timelineWrapper.style.breakBefore = 'avoid';
        timelineWrapper.style.breakAfter = 'avoid';
        //Ghaith's change end
        
        //Ghaith's change start - make timeline more compact by including total in title
        const hourWord = UI_TEXT[language].hours;
        const baseTitleText = isArabic ? "الوقت التقريبي لإكمال الشهادات المقترحة" : "Estimated timeline to complete recommended certificates";
        const titleText = `${baseTitleText} (${UI_TEXT[language].total}: ${certTotalHours} ${hourWord})`;
        //Ghaith's change end

        function getColor(hours) {
          if (hours <= 100) return "#c8f7c5";
          if (hours < 200) return "#ffe5b4";
          return "#f5b5b5";
        }

        const barsHtml = `
          <div class="stacked-bar ${isArabic ? "stacked-bar-rtl" : ""}">
            ${certTimeline.map((item) => {
              const safeHours = Number(item.hours) || 0;
              const percentage = safeHours > 0 ? (safeHours / certTotalHours) * 100 : 0;
              const displayHours = `${safeHours} ${hourWord}`;
              const color = getColor(safeHours);

              return `
                  <div class="bar-segment" style="width:${percentage}%; background:${color}" title="${item.name}: ${displayHours}">
                    <span class="segment-hours">${safeHours > 0 ? safeHours : ''}</span>
                  </div>
                `;
            }).join("")}
          </div>

          <div class="stacked-labels ${isArabic ? "stacked-labels-rtl" : ""}">
            ${certTimeline.map((item) => {
              const safeHours = Number(item.hours) || 0;
              const percentage = safeHours > 0 ? (safeHours / certTotalHours) * 100 : 0;
              if (percentage < 5) return "";
              return `
                  <div class="segment-label" style="width:${percentage}%">
                    ${item.name}
                  </div>
                `;
            }).join("")}
          </div>
        `;

        //Ghaith's change start - remove total row, total now in title
        timelineWrapper.innerHTML = `
          <h4 class="timeline-title ${isArabic ? "timeline-title-rtl" : ""}">${titleText}</h4>
          <div class="stacked-timeline ${isArabic ? "stacked-timeline-rtl" : ""}">
            ${barsHtml}
          </div>
        `;
        //Ghaith's change end
        certSubsection.appendChild(timelineWrapper);
      }

      candidateSection.appendChild(certSubsection);
    }

    // ========== TRAINING COURSES SUBSECTION ==========
    if (candidate.trainingCourses && candidate.trainingCourses.length > 0) {
      const trainingSubsection = document.createElement('div');
      trainingSubsection.className = 'pdf-subsection';
      // 16-12-2025 Ghaith's Change Start - training directly after certificates (minimal gap, allow header to move up)
      trainingSubsection.innerHTML = `<h3 style="color:#023B42; margin-top:6px;">${language === 'ar' ? 'الدورات التدريبية' : 'Training Courses'}</h3>`;
      // Allow page breaks inside the subsection so the header can appear on the previous page
      // while each card/timeline object still avoids splitting.
      // trainingSubsection.style.pageBreakInside = 'avoid';
      // trainingSubsection.style.breakInside = 'avoid';
      trainingSubsection.style.pageBreakBefore = 'avoid';
      trainingSubsection.style.breakBefore = 'avoid';
      trainingSubsection.style.pageBreakAfter = 'avoid';
      trainingSubsection.style.breakAfter = 'avoid';
      trainingSubsection.style.paddingTop = '4px';
      // 16-12-2025 Ghaith's Change End
      
      let trainingTimeline = [];
      let trainingTotalHours = 0;

      candidate.trainingCourses.forEach(rec => {
        let displayName = rec.courseName;
        let catalogEntry = null;

        if (trainingCatalog) {
          catalogEntry = trainingCatalog.find(c => c.id === rec.courseId) ||
            trainingCatalog.find(c => c.name === rec.courseName) ||
            trainingCatalog.find(c => c["Training Course Title"] === rec.courseName) ||
            trainingCatalog.find(c => c.nameAr === rec.courseName) ||
            trainingCatalog.find(c => c["اسم الدورة التدريبية"] === rec.courseName);
        }

        if (isArabic && catalogEntry && catalogEntry.nameAr) {
          displayName = catalogEntry.nameAr;
        }

        //Ghaith's change start - training hours (prefer rec, then catalog) to avoid N/A
        let hours = 0;
        if (rec && (rec.hours || rec.totalHours || rec.estimatedHours)) {
          hours = rec.hours || rec.totalHours || rec.estimatedHours || 0;
        }
        if (hours === 0 && catalogEntry) {
          hours = catalogEntry.totalHours || 
                  catalogEntry["Total Hours"] || 
                  catalogEntry["عدد الساعات"] || 
                  0;
        }
        hours = Number(hours) || 0;
        //Ghaith's change end
        trainingTimeline.push({ name: displayName, hours });
        trainingTotalHours += hours;

        const hourWord = UI_TEXT[language].hours;
        const hoursText = hours > 0 ? `${hours} ${hourWord}` : UI_TEXT[language].na;

        const card = document.createElement('div');
        card.className = 'pdf-recommendation-card';
        //Ghaith's change start - make each card a separate object that won't split across pages
        card.style.marginBottom = '12px';
        card.style.padding = '10px';
        card.style.borderLeft = isArabic ? 'none' : '4px solid #DF7C2E';
        card.style.borderRight = isArabic ? '4px solid #DF7C2E' : 'none';
        card.style.backgroundColor = '#fbfbfc';
        card.style.pageBreakInside = 'avoid';
        card.style.breakInside = 'avoid';
        //Ghaith's change end

        //Ghaith's change start - match exact UI format with icons and inline rules
        card.innerHTML = `
          <div class="recommendation-title" style="font-weight:600; font-size:1rem; margin:0 0 8px 0; color:#1B8354;">${displayName}</div>
          <div class="recommendation-reason" style="margin:8px 0; color:#1B8354; line-height:1.6;">
            <i class="fas fa-lightbulb"></i> ${rec.reason}
          </div>
          <div class="recommendation-hours" style="margin-top:4px; font-size:0.9rem; color:#7E9196; display:flex; align-items:center; gap:8px; flex-wrap:wrap;">
            <i class="far fa-clock" style="color:#074D31;"></i>
            <span>${UI_TEXT[language].estTime}</span>
            <strong style="color:#1B8354; font-weight:600;">${hoursText}</strong>
            ${rec.rulesApplied && rec.rulesApplied.length > 0
              ? `<span class="recommendation-rule-inline" style="margin-top:0; font-size:0.85rem; color:#7E9196; font-style:italic;"><i class="fas fa-gavel"></i> ${UI_TEXT[language].rulesApplied} ${rec.rulesApplied.join(", ")}</span>`
              : ""
            }
          </div>
        `;
        //Ghaith's change end
        trainingSubsection.appendChild(card);
      });

      // Training Courses Timeline
      if (trainingTimeline.length > 0 && trainingTotalHours > 0) {
      const timelineWrapper = document.createElement('div');
      timelineWrapper.className = 'timeline-wrapper';
      //Ghaith's change start - avoid page breaks on training timeline
      timelineWrapper.style.pageBreakInside = 'avoid';
      timelineWrapper.style.breakInside = 'avoid';
      timelineWrapper.style.pageBreakBefore = 'avoid';
      timelineWrapper.style.pageBreakAfter = 'avoid';
      timelineWrapper.style.breakBefore = 'avoid';
      timelineWrapper.style.breakAfter = 'avoid';
      //Ghaith's change end
        
        //Ghaith's change start - make timeline more compact by including total in title
        const hourWord = UI_TEXT[language].hours;
        const baseTitleText = isArabic ? "الوقت التقريبي لإكمال الدورات التدريبية المقترحة" : "Estimated timeline to complete recommended training courses";
        const titleText = `${baseTitleText} (${UI_TEXT[language].total}: ${trainingTotalHours} ${hourWord})`;
        //Ghaith's change end

        function getColor(hours) {
          if (hours <= 100) return "#c8f7c5";
          if (hours < 200) return "#ffe5b4";
          return "#f5b5b5";
        }

        const barsHtml = `
          <div class="stacked-bar ${isArabic ? "stacked-bar-rtl" : ""}">
            ${trainingTimeline.map((item) => {
              const safeHours = Number(item.hours) || 0;
              const percentage = safeHours > 0 ? (safeHours / trainingTotalHours) * 100 : 0;
              const displayHours = `${safeHours} ${hourWord}`;
              const color = getColor(safeHours);

              return `
                  <div class="bar-segment" style="width:${percentage}%; background:${color}" title="${item.name}: ${displayHours}">
                    <span class="segment-hours">${safeHours > 0 ? safeHours : ''}</span>
                  </div>
                `;
            }).join("")}
          </div>

          <div class="stacked-labels ${isArabic ? "stacked-labels-rtl" : ""}">
            ${trainingTimeline.map((item) => {
              const safeHours = Number(item.hours) || 0;
              const percentage = safeHours > 0 ? (safeHours / trainingTotalHours) * 100 : 0;
              if (percentage < 5) return "";
              return `
                  <div class="segment-label" style="width:${percentage}%">
                    ${item.name}
                  </div>
                `;
            }).join("")}
          </div>
        `;

        //Ghaith's change start - remove total row, total now in title
        timelineWrapper.innerHTML = `
          <h4 class="timeline-title ${isArabic ? "timeline-title-rtl" : ""}">${titleText}</h4>
          <div class="stacked-timeline ${isArabic ? "stacked-timeline-rtl" : ""}">
            ${barsHtml}
          </div>
        `;
        //Ghaith's change end
        trainingSubsection.appendChild(timelineWrapper);
      }

      candidateSection.appendChild(trainingSubsection);
    }
    //Ghaith's change end

    pdfContainer.appendChild(candidateSection);
    // Divider
    pdfContainer.appendChild(document.createElement('hr'));
  });

  // 5. Trigger PDF Download
  //Ghaith's change start - add white space at top of each page
  const opt = {
    margin: [10, 10, 10, 10], // top, left, bottom, right - top margin for white space on each page
    filename: `SkillMatch_Recommendations_${new Date().toISOString().slice(0,10)}.pdf`,
    image: { type: 'jpeg', quality: 0.98 },
    html2canvas: { scale: 2, useCORS: true },
    jsPDF: { unit: 'mm', format: 'a4', orientation: 'portrait' }
  };
  //Ghaith's change end

  html2pdf().set(opt).from(pdfContainer).save().catch(err => {
    console.error("PDF generation failed:", err);
    alert(isArabic ? "فشل في إنشاء ملف PDF. يرجى المحاولة مرة أخرى." : "Failed to generate PDF. Please try again.");
  });
}
// Ending Taif's updates
// ---------------------------------------------------------------------------
// Modal helpers (CV review)
// ---------------------------------------------------------------------------
function formatDescriptionAsBullets(text) {
  if (!text) return "";
  const withBreaks = text.replace(/\r/g, "").replace(/\.\s+/g, ".\n");
  const sentences = [];
  withBreaks.split(/\n+/).forEach((part) => {
    const cleaned = part.replace(/^[\s•\-]+/, "").trim();
    if (!cleaned) return;
    cleaned.split(".").map((s) => s.trim()).filter(Boolean).forEach((s) => sentences.push(s));
  });
  if (sentences.length === 0) return text.trim();
  return sentences.map((s) => `• ${s}`).join("\n");
}

function createItemRow(item, fields) {
  const row = document.createElement("div");
  row.className = "item-row";
  const deleteBtn = document.createElement("span");
  deleteBtn.className = "delete-item-btn";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", () => row.remove());
  row.appendChild(deleteBtn);

  fields.forEach((f) => {
    const field = typeof f === "string" ? { name: f } : f;
    const isTextarea = field.type === "textarea" || field.multiline;
    const isDescriptionField = field.name === "description";
    const input = document.createElement(isTextarea ? "textarea" : "input");
    if (!isTextarea) input.type = "text";
    let autoResizeFn = null;
    if (isTextarea) {
      input.rows = field.rows || 1;
      input.wrap = "soft";
      input.style.resize = "none";
      autoResizeFn = (el) => {
        el.style.height = "auto";
        el.style.height = `${el.scrollHeight}px`;
      };
      autoResizeFn(input);
      input.addEventListener("input", () => autoResizeFn(input));
    }
    const placeholderText = field.placeholder || (field.name ? field.name.charAt(0).toUpperCase() + field.name.slice(1) : "");
    input.placeholder = placeholderText;
    input.value = item[field.name] || "";
    if (isDescriptionField) {
      const applyFormattedBullets = () => {
        input.value = formatDescriptionAsBullets(input.value);
        if (autoResizeFn) autoResizeFn(input);
      };
      applyFormattedBullets();
      input.addEventListener("blur", () => applyFormattedBullets());
      input.addEventListener("keydown", (e) => {
        if (e.key === "Enter") {
          e.preventDefault();
          const { selectionStart, selectionEnd, value } = input;
          const insertText = "\n• ";
          const newValue = value.slice(0, selectionStart) + insertText + value.slice(selectionEnd);
          input.value = newValue;
          const newPos = selectionStart + insertText.length;
          input.setSelectionRange(newPos, newPos);
          if (autoResizeFn) autoResizeFn(input);
        }
      });
    }
    input.dataset.field = field.name || "";
    if (field.className) input.classList.add(field.className);
    if (field.isBold) input.style.fontWeight = "700";
    if (autoResizeFn) requestAnimationFrame(() => autoResizeFn(input));
    row.appendChild(input);
  });
  return row;
}

function createSkillBubble(item, fields) {
  const bubble = document.createElement("div");
  bubble.className = "skill-bubble";
  const input = document.createElement("input");
  input.type = "text";
  input.className = "skill-input";
  const primaryField = typeof fields[0] === "string" ? fields[0] : fields[0].name;
  input.placeholder = typeof fields[0] === "object" && fields[0].placeholder ? fields[0].placeholder : primaryField.charAt(0).toUpperCase() + primaryField.slice(1);
  const skillValue = item[primaryField] || item.title || "";
  input.value = skillValue;
  input.dataset.field = primaryField;
  const minWidth = 10;
  input.style.minWidth = `${minWidth}ch`;
  input.style.maxWidth = "20ch";
  const calculatedWidth = Math.max(minWidth, skillValue.length + 1);
  input.style.width = `${calculatedWidth}ch`;
  input.addEventListener("input", (e) => {
    input.style.width = `${Math.max(minWidth, e.target.value.length + 1)}ch`;
  });
  bubble.appendChild(input);
  const deleteBtn = document.createElement("span");
  deleteBtn.className = "delete-item-btn";
  deleteBtn.textContent = "×";
  deleteBtn.addEventListener("click", (e) => { e.stopPropagation(); e.preventDefault(); bubble.remove(); });
  bubble.appendChild(deleteBtn);
  return bubble;
}

function renderCvDetails(cv) {
  const container = document.getElementById("cvResultsContainer");
  if (!container) return;
  container.innerHTML = "";

  if (!cv.structured && !cv.education) { 
    container.innerHTML = `<div class="status-message"><div class="loader"></div> ${getStatusText('analyzing')}</div>`;
      return;
  }

  const t = (k) => getUiText(k);

  const sections = [
    {
      key: "experience",
      label: t("experience"),
      fields: [
        { name: "jobTitle", placeholder: t("jobTitle"), className: "cv-field-job-title", isBold: true },
        { name: "company", placeholder: t("company"), className: "cv-field-company" },
        { name: "description", placeholder: t("description"), className: "cv-description-textarea", multiline: true },
        { name: "years", placeholder: t("years") },
      ],
    },
    {
      key: "education",
      label: t("education"),
      fields: [
        { name: "degreeField", placeholder: t("degree"), className: "education-degree-input", isBold: true },
        { name: "school", placeholder: t("school") },
      ],
    },
    { key: "certifications", label: t("certifications"), fields: [{ name: "title", placeholder: t("certification") }] },
    { key: "skills", label: t("skills"), fields: [{ name: "title", placeholder: t("skill") }] },
  ];

  sections.forEach((sec) => {
    const secDiv = document.createElement("div");
    //Ghaith's change start - add section-specific class to apply layout (company under title)
    secDiv.className = `cv-section${sec.key ? ` cv-section-${sec.key}` : ""}`;
    //Ghaith's change end
    secDiv.innerHTML = `<h3>${sec.label}</h3>`;
    let listDiv;
    if (sec.key === "skills") {
      listDiv = document.createElement("div");
      listDiv.className = "skills-bubble-list";
      listDiv.id = `${cv.name}_${sec.key}_list`;
      (cv[sec.key] || []).forEach((item) => listDiv.appendChild(createSkillBubble(item, sec.fields)));
    } else {
      listDiv = document.createElement("div");
      listDiv.id = `${cv.name}_${sec.key}_list`;
      (cv[sec.key] || []).forEach((item) => listDiv.appendChild(createItemRow(item, sec.fields)));
    }
    const addBtn = document.createElement("button");
    addBtn.className = "add-btn";
    addBtn.textContent = `${t("add")} ${sec.label}`;
    addBtn.addEventListener("click", () => {
      const emptyItem = {};
      sec.fields.forEach(f => { const field = typeof f === "string" ? { name: f } : f; if (field.name) emptyItem[field.name] = ""; });
      if (sec.key === "skills") listDiv.appendChild(createSkillBubble(emptyItem, sec.fields));
      else listDiv.appendChild(createItemRow(emptyItem, sec.fields));
    });
    secDiv.appendChild(listDiv);
    secDiv.appendChild(addBtn);
    container.appendChild(secDiv);
  });
}

// Modal state
let modalCvData = [];
let activeCvIndex = 0;

function upsertByName(existing, incoming) {
  const map = new Map();
  existing.forEach((cv) => map.set(cv.name, cv));
  incoming.forEach((cv) => map.set(cv.name, cv));
  return Array.from(map.values());
}

function deepClone(obj) {
  try { return structuredClone(obj); } catch (_) { return JSON.parse(JSON.stringify(obj)); }
}

function readCvFromDom(cv) {
  if (!cv || !cv.structured) return cv; 
  const updated = deepClone(cv);
  ["experience", "education", "certifications", "skills"].forEach((sec) => {
    const list = document.getElementById(`${cv.name}_${sec}_list`);
    if (!list) return;
    if (sec === "skills") {
      updated.skills = [];
      list.querySelectorAll(".skill-bubble").forEach((bubble) => {
        const input = bubble.querySelector("input");
        if (input) updated.skills.push({ title: input.value });
      });
    } else {
      updated[sec] = [];
      list.querySelectorAll(".item-row").forEach((row) => {
        const entry = {};
        row.querySelectorAll("input, textarea").forEach((input) => {
          const key = input.dataset.field || input.placeholder.toLowerCase();
          entry[key] = input.value;
        });
        updated[sec].push(entry);
      });
    }
  });
  return updated;
}

function syncActiveCvFromDom() {
  if (!modalCvData.length) return;
  const current = modalCvData[activeCvIndex];
  if (current.isParsing) return;
  const updated = readCvFromDom(current);
  modalCvData[activeCvIndex] = updated;
}

function openCvModal(allCvResults, initialIndex = 0) {
  const modal = document.getElementById("cvModal");
  const tabs = document.getElementById("cvTabsContainer");
  const content = document.getElementById("cvResultsContainer");
  const submitBtn = document.getElementById("submitCvReview");
  const searchInput = document.getElementById("cvSearchInput");
  
  if (!modal || !tabs || !content) return;
  if (searchInput) searchInput.value = "";

  modalCvData = allCvResults;
  activeCvIndex = initialIndex;

  modal.style.display = "flex";
  modal.removeAttribute("hidden");
  tabs.innerHTML = "";
  content.innerHTML = "";

  modalCvData.forEach((cv, index) => {
    const tab = document.createElement("div");
    tab.className = "cv-tab";
    tab.textContent = cv.name;
    tab.dataset.index = index;
    if (index === initialIndex) tab.classList.add("active");

    tab.addEventListener("click", () => {
      syncActiveCvFromDom();
      document.querySelectorAll(".cv-tab").forEach((t) => t.classList.remove("active"));
      tab.classList.add("active");
      activeCvIndex = index;
      renderCvDetails(modalCvData[index]);
    });
    tabs.appendChild(tab);
  });

  renderCvDetails(modalCvData[initialIndex] || modalCvData[0]);
  if (submitBtn) submitBtn.textContent = modalCvData.length > 1 ? getUiText("submitAll") : getUiText("submitSingle");
}

const upsertAndRenderSubmittedCvs = (cvResultsForModal) => {
  if (!cvResultsForModal || !cvResultsForModal.length) return;
  submittedCvData = upsertByName(submittedCvData, cvResultsForModal);
  renderSubmittedCvBubbles(submittedCvData);
};

const renderSubmittedCvBubbles = (allResults) => {
  const counterEl = document.getElementById("uploaded-cv-count");
  if (counterEl) counterEl.textContent = allResults ? allResults.length : 0;

  const container = document.getElementById("submitted-cv-bubbles");
  if (!container) return;
  container.innerHTML = "";

  const recommendationsContainer = document.getElementById("recommendations-container");
  const resultsSection = document.getElementById("results-section");

  allResults.forEach((cv, idx) => {
    const bubble = document.createElement("div");
    bubble.className = "cv-summary-bubble";
    // Added for cv Selection (START)
    const checkbox = document.createElement("input"); // Added for cv Selection
    checkbox.type = "checkbox";
    checkbox.className = "cv-select-checkbox";
    checkbox.checked = cv.selected !== false;
    
    checkbox.addEventListener("change", (e) => {
      cv.selected = e.target.checked;
      updateGenerateButton(submittedCvData);
    });
    
    bubble.appendChild(checkbox);
    bubble.title = "Click to re-open CV review";
    const nameEl = document.createElement("span");
    nameEl.className = "bubble-name";
    nameEl.textContent = cv.name || "CV";
    const metaEl = document.createElement("span");
    metaEl.className = "bubble-meta";
    
    if (cv.isParsing) {
      //Ghaith's change start - use status text to avoid undefined during parsing
      metaEl.innerHTML = `<i class="fas fa-circle-notch fa-spin"></i> ${getStatusText('analyzing') || ''}`;
      //Ghaith's change end
    } else {
      const expCount = (cv.experience || []).length;
      const skillCount = (cv.skills || []).length;
      metaEl.textContent = `${expCount} exp | ${skillCount} skills`;
    }

    const deleteBtn = document.createElement("button");
    deleteBtn.type = "button";
    deleteBtn.className = "delete-bubble-btn";
    deleteBtn.innerHTML = "×";
    deleteBtn.style.zIndex = "10"; 
    
    // Explicit click handler with proper propagation stopping
    deleteBtn.onclick = async (e) => {
      e.preventDefault();
      e.stopPropagation();
      
      const cvToRemove = submittedCvData[idx];
      submittedCvData = submittedCvData.filter((_, i) => i !== idx);

      // 12-15-2025 Joud start
      // SAVE CVs after deletion
      saveSubmittedCvs(submittedCvData);
      // 12-15-2025 joud end
      
      if (cvToRemove && cvToRemove.name && allRecommendationsMap[cvToRemove.name]) {
        delete allRecommendationsMap[cvToRemove.name];
        const allRecommendations = { candidates: Object.values(allRecommendationsMap) };
        lastRecommendations = allRecommendations;
        saveLastRecommendations(lastRecommendations);
        
        // Use imported function to update view
        const { displayRecommendations } = await import("./ai.js");
        displayRecommendations(allRecommendations, recommendationsContainer, resultsSection, currentLang);
      }
      
      //Ghaith's change start - tie recommendations to uploaded CVs; clear when none remain
      if (submittedCvData.length === 0) {
        const recommendationsContainer = document.getElementById("recommendations-container");
        const resultsSection = document.getElementById("results-section");
        allRecommendationsMap = {};
        lastRecommendations = { candidates: [] };
        saveLastRecommendations(lastRecommendations);
        if (recommendationsContainer) recommendationsContainer.innerHTML = "";
        if (resultsSection) resultsSection.classList.add("hidden");
        updateDownloadButtonVisibility(lastRecommendations);
      } else {
        updateDownloadButtonVisibility(lastRecommendations);
      }
      //Ghaith's change end
      
      renderSubmittedCvBubbles(submittedCvData);
      if (submittedCvData.length === 0) updateGenerateButton([]);
    };

    bubble.appendChild(nameEl);
    bubble.appendChild(metaEl);
    bubble.appendChild(deleteBtn);
    // Start
    bubble.addEventListener("click", (e) => {
      if (e.target.closest(".cv-select-checkbox")) return;
      openCvModal(submittedCvData, idx);
    });
    // END
    container.appendChild(bubble);
  });
};

// ---------------------------------------------------------------------------
// Main bootstrap
// ---------------------------------------------------------------------------
document.addEventListener("DOMContentLoaded", async () => {
  // 1. Declare variables first
  let chatHistory = []; 
  
  // 2. Initialize Language FIRST (prevents re-triggering loader on existing data)
  initializeLanguage();
  // 12-15-2025 Joud start
  // 3. Persistence Logic
  if (!isPersistenceEnabled()) {
    setPersistence(false); 
    saveChatHistory([]);
    saveLastRecommendations({ candidates: [] });
  } else {
    // Load data
    chatHistory = loadChatHistory();
    lastRecommendations = loadLastRecommendations() || { candidates: [] };

    // Restore chat
    if (chatHistory.length > 0) {
        const chatContainer = document.getElementById("chat-messages");
        if (chatContainer) {
            chatContainer.innerHTML = ""; 
            chatHistory.forEach(msg => addMessage(msg.text, msg.isUser));
        }
    }

    // Restore recommendations (Displays instantly without loader)
    if (lastRecommendations && lastRecommendations.candidates && lastRecommendations.candidates.length > 0) {
      lastRecommendations.candidates.forEach(cand => {
        if (cand.cvName) {
          allRecommendationsMap[cand.cvName] = cand;
        }
      });

      const recommendationsContainer = document.getElementById("recommendations-container");
      const resultsSection = document.getElementById("results-section");
      
      if (recommendationsContainer && resultsSection) {
        displayRecommendations(lastRecommendations, recommendationsContainer, resultsSection, currentLang);
        updateDownloadButtonVisibility(lastRecommendations);
      }
    }
  }
  // 12-15-2025 joud end
  await loadCertificateCatalog();
  //Ghaith's change start
  await loadTrainingCoursesCatalog();
  //Ghaith's change end

    // 12-15-2025 Joud start
  // 5. NEW: Load Persisted CVs
  const savedCvs = loadSubmittedCvs();
  if (savedCvs && savedCvs.length > 0) {
    submittedCvData = savedCvs;
    renderSubmittedCvBubbles(submittedCvData);
    updateGenerateButton(submittedCvData);
  }
  // 12-15-2025 joud end
  
  const userInput = document.getElementById("user-input");
  const sendButton = document.getElementById("send-button");
  const fileInput = document.getElementById("file-input");
  const cvUploadArea = document.getElementById("cv-upload-area");
  const uploadStatus = document.getElementById("upload-status");
  const rulesStatus = document.getElementById("rules-status");
  const resultsSection = document.getElementById("results-section");
  const recommendationsContainer = document.getElementById("recommendations-container");

  const addRuleBtn = document.getElementById("add-rule-btn");
  const generateBtn = document.getElementById("generate-recommendations-btn");

  const defaultRulesForLang = getDefaultRules(currentLang);
  initializeRulesUI(defaultRulesForLang);
  userRules = [...defaultRulesForLang];
  saveUserRules(userRules);

  clearChatHistoryDom();
  // 12-15-2025 Joud start
  // Setup Persistence Toggle
  const persistenceToggle = document.getElementById("persistence-toggle");
  if (persistenceToggle) {
    persistenceToggle.checked = isPersistenceEnabled();
    persistenceToggle.addEventListener("change", (e) => {
      const isEnabled = e.target.checked;
      setPersistence(isEnabled);
      
      const msg = currentLang === 'ar' 
        ? (isEnabled ? "تم تفعيل حفظ الجلسة." : "تم مسح البيانات المحفوظة.")
        : (isEnabled ? "Session saving enabled." : "Session data cleared.");
        
      if (isEnabled) {
        // Force save current state immediately
        saveChatHistory(chatHistory);
        saveUserRules(getRulesFromUI());
        saveLastRecommendations(lastRecommendations);
        saveSubmittedCvs(submittedCvData); // Save CVs
      }
      
      updateStatus(uploadStatus, msg, false, msg);
    });
  }
  // 12-15-2025 joud end
  // Chat Handler

  
  // 16-12-2025 Ghaith's Change Start
  async function handleSendMessage() {
    const message = (userInput.value || "").trim();
    if (!message) return;

    // Add user message to the chat UI
    addMessage(message, true);
    chatHistory.push({ text: message, isUser: true });
    // --- FIX START joud 16-12-2025: Save immediately after user sends message ---
    saveChatHistory(chatHistory);
    // --- FIX END ---
    userInput.value = "";
    sendButton.disabled = true;
    const typingEl = showTypingIndicator();

    try {
      const cvArrayForChat =
        submittedCvData.length > 0 ? submittedCvData : uploadedCvs;
      const normalizedCvsForChat = cvArrayForChat.map((cv) => ({
        name: cv.name,
        text: cv.text,
        structured: cv.structured || cv,
      }));

      const enhancedSystemPrompt = buildChatSystemPrompt(
        normalizedCvsForChat,
        currentLang
      );

      const enhancedMessage = buildChatContextMessage(
        message,
        userRules,
        lastRecommendations,
        currentLang
      );

      // Prepare payload for the streaming proxy (reusing the same structure
      // that callGeminiAPI builds internally).
      const formattedHistory = chatHistory.map((msg) => ({
        role: msg.isUser ? "user" : "model",
        parts: [{ text: msg.text }],
      }));
      const combinedPrompt = enhancedSystemPrompt
        ? `${enhancedSystemPrompt.trim()}\n\nUser message:\n${enhancedMessage}`
        : enhancedMessage;
      const contents = [
        ...formattedHistory,
        { role: "user", parts: [{ text: combinedPrompt }] },
      ];
      const proxyPayload = { prompt: combinedPrompt, history: contents };

      // Create an empty bot message div we will progressively fill as chunks arrive
      const chatMessages = document.getElementById("chat-messages");
      const botMessageDiv = document.createElement("div");
      botMessageDiv.className = "message bot-message";
      botMessageDiv.innerHTML = "";
      // 16-12-2025 Ghaith's Change Start - hide empty bot bubble until content arrives
      botMessageDiv.style.display = "none";
      // 16-12-2025 Ghaith's Change End
      if (chatMessages) {
        chatMessages.appendChild(botMessageDiv);
        // 16-12-2025 Ghaith's Change - delete these (auto-scroll on bot message)
        // chatMessages.scrollTop = chatMessages.scrollHeight;
      }

      let accumulatedText = "";
      // Track if any non-empty content was received
      let hasContent = false;
      // Track if we've done the initial scroll adjustment
      let hasPerformedInitialScroll = false;

      await callGeminiProxyStream(
        proxyPayload,
        (chunk) => {
          accumulatedText += chunk;
          if (botMessageDiv) {
            // First real chunk: show bubble, hide typing, perform initial scroll adjustment
            if (!hasContent && accumulatedText.trim()) {
              hasContent = true;
              botMessageDiv.style.display = "";
              hideTypingIndicator();
              
              // Render the first chunk content so we can measure it
              if (typeof marked !== "undefined") {
                botMessageDiv.innerHTML = marked.parse(accumulatedText);
              } else {
                botMessageDiv.innerHTML = accumulatedText.replace(/\n/g, "<br>");
              }
              
              // Perform a single initial scroll adjustment to maximize visibility of the first chunk
              // Use requestAnimationFrame to ensure DOM has updated and measurements are accurate
              if (!hasPerformedInitialScroll && chatMessages) {
                hasPerformedInitialScroll = true;
                requestAnimationFrame(() => {
                  const container = chatMessages;
                  const bubble = botMessageDiv;
                  
                  if (!container || !bubble) return;
                  
                  // Get bubble's position within the scrollable container
                  const bubbleTop = bubble.offsetTop;
                  const bubbleHeight = bubble.offsetHeight;
                  const containerHeight = container.clientHeight;
                  const currentScrollTop = container.scrollTop;
                  
                  // Calculate how much of the bubble is currently visible
                  const bubbleBottom = bubbleTop + bubbleHeight;
                  const visibleTop = Math.max(0, bubbleTop - currentScrollTop);
                  const visibleBottom = Math.min(containerHeight, bubbleBottom - currentScrollTop);
                  const currentlyVisible = Math.max(0, visibleBottom - visibleTop);
                  
                  // Determine if we need to scroll to improve visibility
                  // We want to maximize visible content by positioning the bubble near the top
                  // of the viewport, but leave a small margin for visual spacing
                  const needsScroll = 
                    bubbleTop < currentScrollTop || // Bubble is above viewport
                    currentlyVisible < Math.min(bubbleHeight, containerHeight * 0.5); // Less than half visible
                  
                  if (needsScroll) {
                    // Position bubble near the top of viewport to maximize visible lines
                    // Use a small margin (20px) to leave some visual breathing room
                    const targetMargin = 20;
                    const optimalScrollTop = Math.max(0, bubbleTop - targetMargin);
                    
                    // Smooth scroll to the optimal position
                    container.scrollTop = optimalScrollTop;
                  }
                });
              }
            } else if (hasContent) {
              // Subsequent chunks: just update content without changing scroll position
              if (typeof marked !== "undefined") {
                botMessageDiv.innerHTML = marked.parse(accumulatedText);
              } else {
                botMessageDiv.innerHTML = accumulatedText.replace(/\n/g, "<br>");
              }
            }
          }
        },
        () => {
          // 16-12-2025 Ghaith's Change Start - if no content ever arrived, remove empty bubble
          if (!hasContent && botMessageDiv && botMessageDiv.parentNode) {
            botMessageDiv.parentNode.removeChild(botMessageDiv);
          }

          if (hasContent && accumulatedText.trim()) {
            chatHistory.push({ text: accumulatedText, isUser: false });
            // --- FIX START joud 16-12-2025: Save immediately after bot finishes replying ---
            saveChatHistory(chatHistory);
            // --- FIX END ---
          }
          // Typing indicator is already hidden on first chunk if any content exists
          hideTypingIndicator();
          sendButton.disabled = false;
          // 16-12-2025 Ghaith's Change End
        },
        (err) => {
          console.error("Chat streaming error:", err);
          hideTypingIndicator();
          if (botMessageDiv) {
            botMessageDiv.innerHTML =
              "Connection error while streaming. Please try again.";
          } else {
            addMessage("Connection error while streaming. Please try again.", false);
          }
          sendButton.disabled = false;
        }
      );
    } catch (err) {
      console.error("Chat Handler Error:", err);
      hideTypingIndicator();
      addMessage("Connection error. Please try again.", false);
      sendButton.disabled = false;
    }
  }
  // 16-12-2025 Ghaith's Change End


  if (sendButton) sendButton.addEventListener("click", handleSendMessage);
  if (userInput) {
    userInput.addEventListener("keypress", (e) => {
      if (e.key === "Enter") handleSendMessage();
    });
  }

  if (generateBtn) {
    generateBtn.addEventListener("click", async () => {
      function setButtonLoading(btn, loading) {
          if(loading) { btn.disabled = true; btn.innerHTML = '<div class="loader"></div>'; }
          else { btn.disabled = false; btn.innerHTML = getUiText('generateBtn'); }
      }

      setButtonLoading(generateBtn, true);
      recommendationsContainer.innerHTML = "";
      resultsSection.classList.remove("hidden");
      // NOTE: no automatic scrolling here; user controls page scroll

      //Ghaith's change start - remove empty business rule inputs before generating
      const rulesContainer = document.getElementById("rules-container");
      if (rulesContainer) {
        const ruleInputs = rulesContainer.querySelectorAll(".rule-input");
        ruleInputs.forEach(input => {
          if (!input.value.trim()) {
            const wrapper = input.closest(".rule-input-wrapper");
            if (wrapper) wrapper.remove();
          }
        });
      }
      //Ghaith's change end

      const rules = getRulesFromUI();
      // const cvArray = submittedCvData; replaced this line with the below line 
      const cvArray = submittedCvData.filter(cv => cv.selected); 
      
      allRecommendationsMap = {}; 
      lastRecommendations = { candidates: [] };
      saveLastRecommendations(lastRecommendations);
      // added below function for CV Selection //Start
      if (cvArray.length === 0) {
        setButtonLoading(generateBtn, false);
        alert(currentLang === 'ar'
          ? "يرجى اختيار سيرة ذاتية واحدة على الأقل"
          : "Please select at least one CV");
        return;
      }
      // End
      let completedCount = 0;
      for (const cv of cvArray) {
        const placeholder = document.createElement("div");
        placeholder.className = "candidate-result";
        placeholder.innerHTML = `<h3 class="candidate-name">${cv.name}</h3><div class="loader" style="margin: 10px 0;"></div> ${getStatusText('generating')}`;
        recommendationsContainer.appendChild(placeholder);

        try {
      const result = await analyzeSingleCvWithAI(cv, rules, currentLang);
      const resultCard = createCandidateCard(result, currentLang);
      recommendationsContainer.replaceChild(resultCard, placeholder);
      
      allRecommendationsMap[cv.name] = {
         candidateName: result.candidateName || cv.name,
         cvName: cv.name,
         // Taif's update start - store intro text for each CV
         recommendationIntro: result.recommendationIntro || "",
         //Ghaith's change start - store both certificates and training courses for PDF/UI
         recommendations: result.recommendations || [],
         trainingCourses: result.trainingCourses || []
         //Ghaith's change end
      };

          lastRecommendations = { candidates: Object.values(allRecommendationsMap) };
          saveLastRecommendations(lastRecommendations);
        } catch (err) {
          console.error(err);
          placeholder.innerHTML = `<p style="color:red">Error analyzing ${cv.name}</p>`;
        }
        completedCount++;
      }

      setButtonLoading(generateBtn, false);
      //Ghaith's change start - remove popup/status in business rules after generating recs
      if (rulesStatus) rulesStatus.innerHTML = "";
      //Ghaith's change end
      updateDownloadButtonVisibility(lastRecommendations);
    });
  }

  // File Upload
  if (cvUploadArea) {
    cvUploadArea.addEventListener("click", () => fileInput && fileInput.click());
    cvUploadArea.addEventListener("dragover", (e) => { e.preventDefault(); cvUploadArea.style.borderColor = "var(--primary)"; });
    cvUploadArea.addEventListener("dragleave", () => { cvUploadArea.style.borderColor = "var(--border-color)"; });
    cvUploadArea.addEventListener("drop", (e) => {
      e.preventDefault();
      cvUploadArea.style.borderColor = "var(--border-color)";
      if (!fileInput) return;
      fileInput.files = e.dataTransfer.files;
      if (fileInput.files.length) {
         updateStatus(uploadStatus, `Selected ${fileInput.files.length} file(s)`);
         runFastFileProcessing();
      }
    });
  }

  if (fileInput) {
    fileInput.addEventListener("change", () => {
      if (fileInput.files.length > 0) {
        updateStatus(uploadStatus, `Selected ${fileInput.files.length} file(s)`);
        runFastFileProcessing();
      }
    });
  }

  async function runFastFileProcessing() {
    if (!fileInput || !fileInput.files || fileInput.files.length === 0) return;
    const files = Array.from(fileInput.files);
    showLoading(uploadStatus, "extracting");

    try {
        const extracted = await Promise.all(files.map(async (file) => {
            const rawText = await extractTextFromFile(file);
            return { name: file.name, text: rawText, structured: null, isParsing: true, selected: true  }; // ✅ ADD selected: true  to THIS
        }));

        upsertAndRenderSubmittedCvs(extracted);
        // 12-15-2025 Joud start
        // SAVE newly uploaded CVs
        saveSubmittedCvs(submittedCvData);
        // 12-15-2025 joud end
        updateStatus(uploadStatus, "success");
        const generateBtn = document.getElementById("generate-recommendations-btn");
        if (generateBtn) generateBtn.disabled = false;
        runBackgroundParsing(extracted);

    } catch (err) {
        console.error("Extraction error:", err);
        updateStatus(uploadStatus, "error", true);
    }
  }

  async function runBackgroundParsing(cvsToParse) {
      cvsToParse.forEach(async (cvRef) => {
          try {
              const structuredSections = await parseCvIntoStructuredSections(cvRef.text);
              const processed = {
                  experience: (structuredSections.experience || []).map((exp) => ({
                      jobTitle: exp.jobTitle || exp.title || "",
                      company: exp.company || exp.companyName || "",
                      description: exp.description || "",
                      years: exp.period || exp.years || "",
                  })),
                  education: (structuredSections.education || []).map((edu) => ({
                      degreeField: edu.degree || edu.major || "",
                      school: edu.school || edu.institution || "",
                  })),
                  certifications: (structuredSections.certifications || []).map((cert) => ({ title: cert.title || "" })),
                  skills: (structuredSections.skills || []).map((skill) => ({ title: typeof skill === "string" ? skill : skill.title || "" })),
              };

              cvRef.experience = processed.experience;
              cvRef.education = processed.education;
              cvRef.certifications = processed.certifications;
              cvRef.skills = processed.skills;
              cvRef.structured = structuredSections;
              cvRef.isParsing = false;
              renderSubmittedCvBubbles(submittedCvData);
              // 12-15-2025 Joud start
              // SAVE after parsing complete
              saveSubmittedCvs(submittedCvData);
              // 12-15-2025 joud end
          } catch (err) {
              console.error(`Background parsing failed for ${cvRef.name}`, err);
              cvRef.isParsing = false;
              renderSubmittedCvBubbles(submittedCvData);
              // 12-15-2025 Joud start
              // Save anyway to remove spinner state
              saveSubmittedCvs(submittedCvData);
              // 12-15-2025 joud end
          }
      });
  }

  // Add Rule
  if (addRuleBtn) {
    addRuleBtn.addEventListener("click", (e) => {
      e.preventDefault();
      const container = document.getElementById("rules-container");
      if (container) {
        //Ghaith's change start - check if there's already an empty rule input
        const existingInputs = container.querySelectorAll(".rule-input");
        let hasEmptyInput = false;
        for (const input of existingInputs) {
          if (!input.value.trim()) {
            hasEmptyInput = true;
            input.focus();
            break; // Focus the first empty input and stop
          }
        }
        
        if (!hasEmptyInput) {
          const newInput = createRuleInput();
          container.appendChild(newInput);
          const input = newInput.querySelector('input');
          if (input) input.focus();
        }
        //Ghaith's change end
      }
    });
  }

  // --- MERGED: Liyan's Maximize Logic ---
  const maximizeRulesBtn = document.getElementById("maximize-rules-btn");
  const rulesModal = document.getElementById("rulesModal");
  const closeRulesModalBtn = document.getElementById("closeRulesModal");
  const rulesContainer = document.getElementById("rules-container");
  const rulesModalBody = document.getElementById("rules-modal-body");
  const rulesModalAddContainer = document.getElementById("rules-modal-add-container");
  const rulesModalFooter = document.getElementById("rules-modal-footer");
  const sidebarSection = document.querySelector(".merged-section"); 

  function toggleRulesModal(show) {
    if (!rulesModal || !rulesModalBody) return;
    if (show) {
      rulesModalBody.appendChild(rulesContainer);
      rulesModalAddContainer.appendChild(addRuleBtn);
      rulesModalFooter.appendChild(generateBtn);
      rulesModal.style.display = "flex";
    } else {
      rulesModal.style.display = "none";
      if (sidebarSection) {
        sidebarSection.appendChild(rulesContainer);
        sidebarSection.appendChild(addRuleBtn);
        sidebarSection.appendChild(generateBtn);
      }
    }
  }

  if (maximizeRulesBtn) maximizeRulesBtn.addEventListener("click", (e) => { e.preventDefault(); toggleRulesModal(true); });
  if (closeRulesModalBtn) closeRulesModalBtn.addEventListener("click", () => toggleRulesModal(false));
  window.addEventListener("click", (e) => { if (e.target === rulesModal) toggleRulesModal(false); });
  if (generateBtn) generateBtn.addEventListener("click", () => { if (rulesModal && rulesModal.style.display !== 'none') toggleRulesModal(false); });

  // Maximize Uploaded
  const maximizeUploadedBtn = document.getElementById("maximize-uploaded-btn");
  if (maximizeUploadedBtn) {
    maximizeUploadedBtn.addEventListener("click", (e) => {
      e.preventDefault();
      if (typeof submittedCvData !== 'undefined' && submittedCvData.length > 0) {
        openCvModal(submittedCvData, 0);
      } else {
        alert(currentLang === 'ar' ? "يرجى رفع وتحليل سيرة ذاتية أولاً." : "Please upload and analyze a CV first to view details.");
      }
    });
  }

  // Search Input
  const cvSearchInput = document.getElementById("cvSearchInput");
  if (cvSearchInput) {
    cvSearchInput.addEventListener("input", (e) => {
      const searchTerm = e.target.value.toLowerCase().trim();
      const tabs = document.querySelectorAll(".cv-tab");
      tabs.forEach(tab => {
        const name = (tab.textContent || "").toLowerCase();
        tab.style.display = name.includes(searchTerm) ? "" : "none";
      });
    });
  }
  
  // Submit CV Modal
  const submitCvReview = document.getElementById("submitCvReview");
  if (submitCvReview) {
    submitCvReview.addEventListener("click", async () => {
      syncActiveCvFromDom();
      // 12-15-2025 Joud start
      // SAVE updated data from modal
      saveSubmittedCvs(submittedCvData);
      // 12-15-2025 Joud end
     
      document.getElementById("cvModal").style.display = "none";
      if (submittedCvData.length > 0) {
        const generateBtn = document.getElementById("generate-recommendations-btn");
        if (generateBtn) generateBtn.click();
      }
    });
  }
  
  // Close CV Modal
  const closeCvModalBtn = document.getElementById("closeCvModalBtn");
  const cvModal = document.getElementById("cvModal");
  
  if (closeCvModalBtn) {
    closeCvModalBtn.addEventListener("click", () => {
      if (cvModal) cvModal.style.display = "none";
    });
  }
  
  // Also close on outside click for CV Modal (good practice)
  window.addEventListener("click", (e) => {
    if (e.target === cvModal) {
      cvModal.style.display = "none";
    }
  });
  
  // Download Button Logic
  const downloadBtn = document.getElementById("download-recommendations-btn");
  if (downloadBtn) {
    downloadBtn.addEventListener("click", () => {
      downloadRecommendationsAsPDF(lastRecommendations, currentLang);
    });
  }
});


