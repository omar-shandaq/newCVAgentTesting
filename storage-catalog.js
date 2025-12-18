// storage-catalog.js
// Persistence helpers, catalog utilities, and shared calculation helpers.

import {
  CHAT_HISTORY_KEY,
  CERT_CATALOG_KEY,
  //Ghaith's change start
  TRAINING_CATALOG_KEY,
  //Ghaith's change end
  USER_RULES_KEY,
  LAST_RECOMMENDATIONS_KEY,
  //18-12-2025 joud start
  LANGUAGE_KEY,
  //18-12-2025 joud end
  DEFAULT_RULES,
  initializeCertificates,
  //Ghaith's change start
  initializeTrainingCourses,
  //Ghaith's change end
  getFinalCertificateCatalog,
  //Ghaith's change start
  getFinalTrainingCoursesCatalog,
  //Ghaith's change end
} from "./constants.js";

// --- Persistence keys ---
export const PERSISTENCE_KEY = "skillMatchIsSessionSaved";
export const SUBMITTED_CVS_KEY = "skillMatchSubmittedCvs";

// Certificate catalog (loaded on init)
export let certificateCatalog = [];
//Ghaith's change start
// Training courses catalog (loaded on init)
export let trainingCoursesCatalog = [];
//Ghaith's change end

// --- Persistence helper functions ---
export function isPersistenceEnabled() {
  const value = localStorage.getItem(PERSISTENCE_KEY);
  return value === null || value === "true";
}

export function setPersistence(enabled) {
  localStorage.setItem(PERSISTENCE_KEY, enabled ? "true" : "false");
  if (!enabled) {
    // wipe personal data when turning persistence off
    localStorage.removeItem(CHAT_HISTORY_KEY);
    localStorage.removeItem(USER_RULES_KEY);
    localStorage.removeItem(LAST_RECOMMENDATIONS_KEY);
    localStorage.removeItem(SUBMITTED_CVS_KEY);
  }
}

// --- Data management (chat history, rules, recommendations) ---
export function saveChatHistory(chatHistory) {
  if (!isPersistenceEnabled()) return;
  try {
    localStorage.setItem(CHAT_HISTORY_KEY, JSON.stringify(chatHistory));
  } catch (err) {
    console.error("Failed to save chat history:", err);
  }
}

export function loadChatHistory() {
  const saved = localStorage.getItem(CHAT_HISTORY_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to parse chat history:", err);
    return [];
  }
}

export function saveUserRules(userRules) {
  if (!isPersistenceEnabled()) return;
  try {
    localStorage.setItem(USER_RULES_KEY, JSON.stringify(userRules));
  } catch (err) {
    console.error("Failed to save user rules:", err);
  }
}

export function loadUserRules() {
  const saved = localStorage.getItem(USER_RULES_KEY);
  if (!saved) return [...DEFAULT_RULES];
  try {
    const parsed = JSON.parse(saved);
    if (Array.isArray(parsed) && parsed.length > 0) {
      return parsed;
    }
  } catch (err) {
    console.error("Failed to parse user rules:", err);
  }
  return [...DEFAULT_RULES];
}

export function saveLastRecommendations(lastRecommendations) {
  if (!isPersistenceEnabled()) return;
  try {
    localStorage.setItem(
      LAST_RECOMMENDATIONS_KEY,
      JSON.stringify(lastRecommendations)
    );
  } catch (err) {
    console.error("Failed to save last recommendations:", err);
  }
}

export function loadLastRecommendations() {
  const saved = localStorage.getItem(LAST_RECOMMENDATIONS_KEY);
  if (!saved) return null;
  try {
    const parsed = JSON.parse(saved);
    return parsed && typeof parsed === "object" ? parsed : null;
  } catch (err) {
    console.error("Failed to parse last recommendations:", err);
    return null;
  }
}

export function saveSubmittedCvs(cvs) {
  if (!isPersistenceEnabled()) return;
  try {
    localStorage.setItem(SUBMITTED_CVS_KEY, JSON.stringify(cvs));
  } catch (err) {
    console.warn("Failed to save CVs (likely quota exceeded):", err);
  }
}

export function loadSubmittedCvs() {
  const saved = localStorage.getItem(SUBMITTED_CVS_KEY);
  if (!saved) return [];
  try {
    const parsed = JSON.parse(saved);
    return Array.isArray(parsed) ? parsed : [];
  } catch (err) {
    console.error("Failed to parse saved CVs:", err);
    return [];
  }
}
//18-12-2025 joud start
export function saveLanguagePreference(lang) {
  try {
    localStorage.setItem(LANGUAGE_KEY, lang);
  } catch (err) {
    console.error("Failed to save language preference:", err);
  }
}

export function loadLanguagePreference() {
  const saved = localStorage.getItem(LANGUAGE_KEY);
  // Return saved language, or default to 'en' if not found
  return saved === 'ar' || saved === 'en' ? saved : 'en'; 
}
//18-12-2025 joud end
// --- Catalog loading/persistence ---
export async function loadCertificateCatalog() {
  await initializeCertificates();
  certificateCatalog = getFinalCertificateCatalog();
  if (certificateCatalog && certificateCatalog.length > 0) {
    saveCertificateCatalog(certificateCatalog);
  }
  return certificateCatalog;
}

//Ghaith's change start
export async function loadTrainingCoursesCatalog() {
  await initializeTrainingCourses();
  trainingCoursesCatalog = getFinalTrainingCoursesCatalog();
  if (trainingCoursesCatalog && trainingCoursesCatalog.length > 0) {
    saveTrainingCoursesCatalog(trainingCoursesCatalog);
  }
  return trainingCoursesCatalog;
}

export function saveTrainingCoursesCatalog(catalogArray) {
  try {
    localStorage.setItem(TRAINING_CATALOG_KEY, JSON.stringify(catalogArray));
  } catch (err) {
    console.error("Failed to save training courses catalog:", err);
  }
}
//Ghaith's change end

export function saveCertificateCatalog(catalogArray) {
  try {
    localStorage.setItem(CERT_CATALOG_KEY, JSON.stringify(catalogArray));
  } catch (err) {
    console.error("Failed to save certificate catalog:", err);
  }
}

export function getCatalogAsPromptString() {
  const catalog =
    certificateCatalog && certificateCatalog.length > 0
      ? certificateCatalog
      : getFinalCertificateCatalog();

  return catalog
    .map(
      (c) =>
        `- **${c.name || c.Certificate_Name_EN || "Unknown Certificate"}** (${c.level || c.Level || "N/A"}): ${
          c.description || c.Description || ""
        }${
          c.fieldEn || c.Certificate_Field_EN
            ? ` | Field: ${c.fieldEn || c.Certificate_Field_EN}`
            : ""
        }${
          c.entity || c.Certificate_Entity
            ? ` | Entity: ${c.entity || c.Certificate_Entity}`
            : ""
        }${c.officialLink ? ` | Link: ${c.officialLink}` : ""}`
    )
    .join("\n");
}

//Ghaith's change start
export function getTrainingCoursesCatalogAsPromptString() {
  const catalog =
    trainingCoursesCatalog && trainingCoursesCatalog.length > 0
      ? trainingCoursesCatalog
      : getFinalTrainingCoursesCatalog();

  return catalog
    .map(
      (c) =>
        `- **${c.name || c["Training Course Title"] || "Unknown Course"}** (${c.level || c["Training Level"] || "N/A"}): ${c.overview || c["Overview"] || ""}$${
          c.fieldEn || c["Training Field"]
            ? ` | Field: ${c.fieldEn || c["Training Field"]}`
            : ""
        }${
          c.totalHours || c["Total Hours"]
            ? ` | Hours: ${c.totalHours || c["Total Hours"]}`
            : ""
        }`
    )
    .join("\n");
}
//Ghaith's change end

// --- Search & indexing utilities ---
export function searchCertificates(query) {
  if (!query) return certificateCatalog;
  const q = query.toLowerCase();
  return certificateCatalog.filter((c) => {
    const haystack = [
      c.name,
      c.nameAr,
      c.entity,
      c.fieldEn,
      c.fieldAr,
      c.description,
      c.level,
      c.Certificate_Name_EN,
      c.Certificate_Name_AR,
      c.Certificate_Entity,
      c.Certificate_Field_EN,
      c.Certificate_Field_AR,
      c.Description,
      c.Level,
    ]
      .filter(Boolean)
      .join(" ")
      .toLowerCase();
    return haystack.includes(q);
  });
}

let fieldIndex = null;
export function buildFieldIndex() {
  if (fieldIndex) return fieldIndex;
  fieldIndex = new Map();
  certificateCatalog.forEach((c) => {
    const field = (c.fieldEn || c.Certificate_Field_EN || "").toLowerCase();
    if (!field) return;
    if (!fieldIndex.has(field)) fieldIndex.set(field, []);
    fieldIndex.get(field).push(c);
  });
  return fieldIndex;
}

export function searchByField(fieldName) {
  if (!fieldName) return [];
  const idx = buildFieldIndex();
  return idx.get(fieldName.toLowerCase()) || [];
}

// --- Recommendation summarization for chat grounding ---
export function summarizeRecommendationsForChat(recs) {
  if (!recs || !Array.isArray(recs.candidates) || recs.candidates.length === 0) {
    return "No recommendations generated yet.";
  }

  const lines = [];
  recs.candidates.forEach((candidate) => {
    lines.push(`Candidate: ${candidate.candidateName || "Candidate"}`);

    // 1. Summarize Certificates
    if (candidate.recommendations && candidate.recommendations.length > 0) {
      lines.push("Recommended Certificates:");
      candidate.recommendations.forEach((rec) => {
        lines.push(
          `- ${rec.certName || "Certification"}${rec.certId ? ` [${rec.certId}]` : ""}: ${rec.reason || "Reason not provided"}`
        );
      });
    }

    // 2. Summarize Training Courses (This was missing)
    if (candidate.trainingCourses && candidate.trainingCourses.length > 0) {
      lines.push("Recommended Training Courses:");
      candidate.trainingCourses.forEach((course) => {
        lines.push(
          `- ${course.courseName || "Training Course"}${course.courseId ? ` [${course.courseId}]` : ""}: ${course.reason || "Reason not provided"}`
        );
      });
    }

    lines.push("");
  });

  return lines.join("\n").trim();
}

// --- Year and experience calculation helpers ---
export function extractYear(str) {
  const match = str.match(/\b(19|20)\d{2}\b/);
  return match ? parseInt(match[0], 10) : null;
}

export function calculateYearsFromPeriod(period) {
  if (!period || typeof period !== "string") return 0;
  const currentYear = new Date().getFullYear();
  const parts = period.split(/\s*[-–—to]+\s*/i);
  if (parts.length < 2) return 0;
  const startYear = extractYear(parts[0].trim());
  const endYear =
    parts[1].toLowerCase().includes("present") ||
    parts[1].toLowerCase().includes("current") ||
    parts[1].toLowerCase().includes("now")
      ? currentYear
      : extractYear(parts[1].trim());
  if (!startYear || !endYear) return 0;
  return Math.max(0, endYear - startYear);
}

export function calculateTotalExperience(experienceArray) {
  if (!Array.isArray(experienceArray)) return 0;
  let totalYears = 0;
  experienceArray.forEach((exp) => {
    const period = exp.period || exp.years || "";
    totalYears += calculateYearsFromPeriod(period);
  });
  return Math.round(totalYears * 10) / 10;
}


