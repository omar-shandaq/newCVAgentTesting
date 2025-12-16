//Ghaith's change start
// training-courses-data.js
// Loads training courses from JSON file using fetch (browser-compatible)

let TRAINING_COURSES_DATABASE = null;
let loadPromise = null;

export async function loadTrainingCourses() {
  // Return cached data if already loaded
  if (TRAINING_COURSES_DATABASE) {
    return TRAINING_COURSES_DATABASE;
  }
  
  // Return existing promise if already loading
  if (loadPromise) {
    return loadPromise;
  }
  
  // Load training courses from JSON file
  loadPromise = fetch(new URL('./training_courses_500_varied.json', import.meta.url))
    .then((response) => {
      if (!response.ok) {
        throw new Error(`Failed to load training courses: ${response.statusText}`);
      }
      //Ghaith's change start - Handle malformed JSON (not wrapped in array)
      return response.text();
      //Ghaith's change end
    })
    .then((jsonText) => {
      //Ghaith's change start - Fix JSON format if needed
      let cleanedText = jsonText.trim();
      
      // If the JSON doesn't start with '[', it's likely not wrapped in an array
      // Try to wrap it in an array
      if (!cleanedText.startsWith('[')) {
        // Remove leading/trailing whitespace and newlines
        cleanedText = cleanedText.trim();
        
        // If it starts with '{', wrap it in an array
        if (cleanedText.startsWith('{')) {
          // Check if it ends with '}' (single object) or '}' followed by comma (multiple objects)
          // We need to find all objects and wrap them in an array
          // Simple approach: wrap the entire content in an array
          cleanedText = '[' + cleanedText;
          
          // Ensure it ends with ']'
          if (!cleanedText.endsWith(']')) {
            // Remove trailing comma if present
            cleanedText = cleanedText.replace(/,\s*$/, '');
            cleanedText = cleanedText + ']';
          }
        }
      }
      
      // Parse the cleaned JSON
      let coursesJson;
      try {
        coursesJson = JSON.parse(cleanedText);
      } catch (parseError) {
        console.error("JSON Parse Error:", parseError);
        console.error("First 500 chars of cleaned text:", cleanedText.substring(0, 500));
        throw new Error(`Failed to parse training courses JSON: ${parseError.message}`);
      }
      
      // Ensure it's an array
      if (!Array.isArray(coursesJson)) {
        // If it's a single object, wrap it in an array
        coursesJson = [coursesJson];
      }
      //Ghaith's change end
      
      TRAINING_COURSES_DATABASE = coursesJson.map((course, index) => ({
        id: `training_${index + 1}_${(course["Training Course Title"] || "")
          .replace(/\s+/g, "_")
          .toLowerCase()
          .slice(0, 30)}`,
        name: (course["Training Course Title"] || "").trim(),
        nameAr: (course["اسم الدورة التدريبية"] || "").trim(),
        overview: (course["Overview"] || "").trim(),
        overviewAr: (course["نبذة تعريفية"] || "").trim(),
        objective: (course["Objective"] || "").trim(),
        objectiveAr: (course["الهدف"] || "").trim(),
        targetAudience: (course["Target Audience"] || "").trim(),
        targetAudienceAr: (course["الفئة المستهدفة"] || "").trim(),
        level: (course["Training Level"] || "").trim(),
        levelAr: (course["مستوى الدورة"] || "").trim(),
        previousRequirements: (course["Previous Requirements"] || "").trim(),
        previousRequirementsAr: (course["المتطلبات السابقة"] || "").trim(),
        trainingLanguage: (course["Training Language"] || "").trim(),
        trainingLanguageAr: (course["لغة التدريب"] || "").trim(),
        fieldEn: (course["Training Field"] || "").trim(),
        fieldAr: (course["مجال التدريب"] || "").trim(),
        totalHours: course["Total Hours"] || course["عدد الساعات"] || 0,
        trainingType: (course["Training Type "] || "").trim(),
        trainingTypeAr: (course["نوع التدريب"] || "").trim(),
        // Keep original field names for compatibility
        "Training Course Title": (course["Training Course Title"] || "").trim(),
        "اسم الدورة التدريبية": (course["اسم الدورة التدريبية"] || "").trim(),
        "Total Hours": course["Total Hours"] || course["عدد الساعات"] || 0
      }));
      return TRAINING_COURSES_DATABASE;
    })
    .catch((err) => {
      console.error("Error loading training courses:", err);
      loadPromise = null; // Reset promise on error so we can retry
      return [];
    });
  
  return loadPromise;
}

// Export getter that ensures training courses are loaded
export function getTrainingCoursesDatabase() {
  return TRAINING_COURSES_DATABASE || [];
}
//Ghaith's change end

