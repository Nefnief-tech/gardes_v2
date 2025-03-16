import type { Subject, Grade } from "../types/grades";
import {
  syncSubjectsToCloud,
  getSubjectsFromCloud,
  ENABLE_CLOUD_FEATURES,
} from "@/lib/appwrite";

const STORAGE_KEY = "gradeCalculator";

// Debug function to log storage operations
const logStorageOperation = (operation: string, data: any) => {
  console.log(`Storage ${operation}:`, data);
};

// Initialize default subjects
export function initializeSubjects(): Subject[] {
  const defaultSubjects = [
    { id: "math", name: "Mathematics", grades: [] },
    { id: "german", name: "German", grades: [] },
    { id: "english", name: "English", grades: [] },
    { id: "science", name: "Science", grades: [] },
    { id: "history", name: "History", grades: [] },
  ];
  return defaultSubjects;
}

// Notify other components that subjects have been updated
export function notifySubjectsUpdated(): void {
  if (typeof window !== "undefined") {
    const event = new Event("subjectsUpdated");
    window.dispatchEvent(event);
  }
}

// Save subjects to localStorage with error handling
export async function saveSubjectsToStorage(
  subjects: Subject[],
  userId?: string,
  syncEnabled?: boolean
): boolean {
  try {
    const subjectsJson = JSON.stringify(subjects);
    logStorageOperation("saving", subjects);
    localStorage.setItem(STORAGE_KEY, subjectsJson);
    notifySubjectsUpdated();

    // If cloud features are enabled, user is logged in, and sync is enabled, sync to cloud
    if (ENABLE_CLOUD_FEATURES && userId && syncEnabled) {
      try {
        const syncSuccess = await syncSubjectsToCloud(userId, subjects);
        if (!syncSuccess) {
          console.log("Cloud sync failed - using local storage");
          window.dispatchEvent(new Event("syncPreferenceChanged"));
        }
      } catch (error) {
        console.error("Sync error:", error);
        window.dispatchEvent(new Event("syncPreferenceChanged"));
      }
    }

    return true;
  } catch (error) {
    console.error("Error saving subjects to localStorage:", error);
    return false;
  }
}

// Get subjects from localStorage or cloud with error handling
export async function getSubjectsFromStorage(
  userId?: string,
  syncEnabled?: boolean
): Promise<Subject[]> {
  try {
    // If cloud features are enabled, user is logged in, and sync is enabled, try to get from cloud first
    if (ENABLE_CLOUD_FEATURES && userId && syncEnabled) {
      try {
        const cloudSubjects = await getSubjectsFromCloud(userId);
        if (
          cloudSubjects &&
          Array.isArray(cloudSubjects) &&
          cloudSubjects.length > 0
        ) {
          // Save cloud subjects to local storage for offline access
          const subjectsJson = JSON.stringify(cloudSubjects);
          localStorage.setItem(STORAGE_KEY, subjectsJson);
          return cloudSubjects;
        }
      } catch (error) {
        console.error("Error getting subjects from cloud:", error);
        // Fall back to local storage if cloud fetch fails
      }
    }

    // Check if we're in a browser environment
    if (typeof window === "undefined") {
      return initializeSubjects();
    }

    const subjectsJson = localStorage.getItem(STORAGE_KEY);
    if (!subjectsJson) {
      const defaultSubjects = initializeSubjects();
      saveSubjectsToStorage(defaultSubjects, userId, syncEnabled);
      return defaultSubjects;
    }

    let subjects: Subject[] = [];
    try {
      const parsedData = JSON.parse(subjectsJson);
      subjects = Array.isArray(parsedData) ? parsedData : [];
    } catch (e) {
      console.error("Error parsing subjects JSON:", e);
      subjects = [];
    }

    // If subjects is empty, initialize with default subjects
    if (!Array.isArray(subjects) || subjects.length === 0) {
      subjects = initializeSubjects();
      saveSubjectsToStorage(subjects, userId, syncEnabled);
      return subjects;
    }

    // Migrate existing grades to include weights
    const migratedSubjects = subjects.map((subject) => {
      if (subject.grades && subject.grades.length > 0) {
        subject.grades = subject.grades.map((grade) => {
          if (grade.weight === undefined) {
            // Assign weight based on type
            grade.weight = grade.type === "Test" ? 2.0 : 1.0;
          }
          return grade;
        });
        // Recalculate average with weights
        subject.averageGrade = calculateAverage(subject.grades);
      }
      return subject;
    });

    // Save migrated subjects back to storage
    if (JSON.stringify(subjects) !== JSON.stringify(migratedSubjects)) {
      saveSubjectsToStorage(migratedSubjects, userId, syncEnabled);
    }

    logStorageOperation("retrieving", migratedSubjects);
    return migratedSubjects;
  } catch (error) {
    console.error("Error retrieving subjects from localStorage:", error);
    const defaultSubjects = initializeSubjects();
    saveSubjectsToStorage(defaultSubjects, userId, syncEnabled);
    return defaultSubjects;
  }
}

// Add a grade to a specific subject
export async function addGradeToSubject(
  subjectid: string,
  grade: Grade,
  userId?: string,
  syncEnabled?: boolean
): Promise<boolean> {
  try {
    console.log(`Adding grade to subject ${subjectid}:`, grade);
    const subjects = await getSubjectsFromStorage(userId, syncEnabled);
    const subjectIndex = subjects.findIndex((s) => s.id === subjectid);

    if (subjectIndex === -1) {
      console.error(`Subject with id ${subjectid} not found`);
      return false;
    }

    const updatedSubject = { ...subjects[subjectIndex] };

    // Ensure grades array exists
    if (!updatedSubject.grades) {
      updatedSubject.grades = [];
    }

    updatedSubject.grades = [...updatedSubject.grades, grade];
    updatedSubject.averageGrade = calculateAverage(updatedSubject.grades);

    subjects[subjectIndex] = updatedSubject;
    const saveResult = await saveSubjectsToStorage(
      subjects,
      userId,
      syncEnabled
    );
    console.log("Subjects saved successfully:", saveResult);
    return saveResult;
  } catch (error) {
    console.error("Error adding grade to subject:", error);
    return false;
  }
}

// Delete a grade from a specific subject
export async function deleteGradeFromSubject(
  subjectid: string,
  gradeIndex: number,
  userId?: string,
  syncEnabled?: boolean
): Promise<boolean> {
  try {
    const subjects = await getSubjectsFromStorage(userId, syncEnabled);
    const subjectIndex = subjects.findIndex((s) => s.id === subjectid);

    if (subjectIndex === -1) {
      console.error(`Subject with id ${subjectid} not found`);
      return false;
    }

    const updatedSubject = { ...subjects[subjectIndex] };

    // Ensure grades array exists
    if (!updatedSubject.grades || updatedSubject.grades.length === 0) {
      return true; // Nothing to delete
    }

    updatedSubject.grades = updatedSubject.grades.filter(
      (_, i) => i !== gradeIndex
    );
    updatedSubject.averageGrade = calculateAverage(updatedSubject.grades);

    subjects[subjectIndex] = updatedSubject;
    return saveSubjectsToStorage(subjects, userId, syncEnabled);
  } catch (error) {
    console.error("Error deleting grade from subject:", error);
    return false;
  }
}

// Get a specific subject by ID
export async function getSubjectById(
  subjectId: string
): Promise<Subject | null> {
  try {
    const subjects = await getSubjectsFromStorage();
    const subject = subjects.find((s) => s.id === subjectId);
    return subject || null;
  } catch (error) {
    console.error("Error getting subject by ID:", error);
    return null;
  }
}

// Calculate average grade with weights
function calculateAverage(grades: Grade[]): number {
  if (!grades || grades.length === 0) return 0;

  // Calculate weighted sum and total weight
  const { weightedSum, totalWeight } = grades.reduce(
    (acc, grade) => {
      const weight = grade.weight || 1.0; // Default to 1.0 if weight is not defined
      return {
        weightedSum: acc.weightedSum + grade.value * weight,
        totalWeight: acc.totalWeight + weight,
      };
    },
    { weightedSum: 0, totalWeight: 0 }
  );

  // Return weighted average
  return Number.parseFloat((weightedSum / totalWeight).toFixed(2));
}

// Clear all grades data (for testing)
export function clearAllGradesData(): void {
  localStorage.removeItem(STORAGE_KEY);
}

export function ensureAllSubjectsExist(subjects: Subject[]): Subject[] {
  const defaultSubjects = initializeSubjects();
  const existingSubjectIds = subjects.map((s) => s.id);

  const missingSubjects = defaultSubjects.filter(
    (s) => !existingSubjectIds.includes(s.id)
  );

  return [...subjects, ...missingSubjects];
}

// Add a new subject
export async function addNewSubject(
  name: string,
  userId?: string,
  syncEnabled?: boolean
): Promise<boolean> {
  try {
    if (!name.trim()) {
      console.error("Subject name cannot be empty");
      return false;
    }

    const subjects = await getSubjectsFromStorage(userId, syncEnabled);

    // Generate a unique ID based on the name (lowercase, spaces replaced with hyphens)
    const id = name.toLowerCase().replace(/\s+/g, "-");

    // Check if a subject with this ID already exists
    if (subjects.some((s) => s.id === id)) {
      console.error(`Subject with id ${id} already exists`);
      return false;
    }

    const newSubject: Subject = {
      id,
      name,
      grades: [],
    };

    const updatedSubjects = [...subjects, newSubject];
    return saveSubjectsToStorage(updatedSubjects, userId, syncEnabled);
  } catch (error) {
    console.error("Error adding new subject:", error);
    return false;
  }
}
