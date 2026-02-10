import _ from "lodash";
import type { ExerciseMatchResult } from "./types/coach.types.js";

const FUZZY_MATCH_THRESHOLD = 0.6;

/**
 * Common synonyms and abbreviations for exercise names.
 * Keys are normalized (lowercase, no punctuation).
 * Values are the canonical exercise names.
 */
const EXERCISE_SYNONYMS: Record<string, string> = {
  // Dumbbell abbreviations
  "incline db press": "Incline Dumbbell Press",
  "flat db press": "Dumbbell Bench Press",
  "db press": "Dumbbell Bench Press",
  "db bench": "Dumbbell Bench Press",
  "db curl": "Dumbbell Curl",
  "db row": "Dumbbell Row",
  "db fly": "Dumbbell Fly",
  "db flyes": "Dumbbell Fly",
  "db shoulder press": "Dumbbell Shoulder Press",
  "db lateral raise": "Dumbbell Lateral Raise",
  "db lunge": "Dumbbell Lunge",
  // Barbell abbreviations
  "bb curl": "Barbell Curl",
  "bb row": "Barbell Row",
  "bb bench": "Barbell Bench Press",
  "bb squat": "Barbell Squat",
  // Common short forms
  "bench": "Barbell Bench Press",
  "bench press": "Barbell Bench Press",
  "incline bench": "Incline Barbell Bench Press",
  "incline press": "Incline Barbell Bench Press",
  "decline bench": "Decline Barbell Bench Press",
  "squat": "Barbell Squat",
  "squats": "Barbell Squat",
  "back squat": "Barbell Squat",
  "front squat": "Barbell Front Squat",
  "deadlift": "Barbell Deadlift",
  "deadlifts": "Barbell Deadlift",
  "conventional deadlift": "Barbell Deadlift",
  "sumo deadlift": "Sumo Deadlift",
  "rdl": "Romanian Deadlift",
  "romanian deadlift": "Romanian Deadlift",
  "ohp": "Overhead Press",
  "overhead press": "Overhead Press",
  "military press": "Overhead Press",
  "shoulder press": "Overhead Press",
  "lat pulldown": "Lat Pulldown",
  "pulldown": "Lat Pulldown",
  "pull up": "Pull Up",
  "pullup": "Pull Up",
  "pullups": "Pull Up",
  "chin up": "Chin Up",
  "chinup": "Chin Up",
  "chinups": "Chin Up",
  "dip": "Dip",
  "dips": "Dip",
  "tricep dip": "Dip",
  "tricep pushdown": "Tricep Pushdown",
  "pushdown": "Tricep Pushdown",
  "cable fly": "Cable Fly",
  "cable flyes": "Cable Fly",
  "face pull": "Face Pull",
  "face pulls": "Face Pull",
  "leg press": "Leg Press",
  "leg curl": "Leg Curl",
  "leg extension": "Leg Extension",
  "calf raise": "Calf Raise",
  "calf raises": "Calf Raise",
  "hip thrust": "Hip Thrust",
  "hip thrusts": "Hip Thrust",
  "bicep curl": "Bicep Curl",
  "hammer curl": "Hammer Curl",
  "hammer curls": "Hammer Curl",
  "preacher curl": "Preacher Curl",
  "skull crusher": "Skull Crusher",
  "skull crushers": "Skull Crusher",
  "tricep extension": "Tricep Extension",
  "cable row": "Cable Row",
  "seated row": "Seated Cable Row",
  "pendlay row": "Pendlay Row",
  "t bar row": "T-Bar Row",
  "shrug": "Barbell Shrug",
  "shrugs": "Barbell Shrug",
};

/**
 * Normalize text for comparison: lowercase, remove punctuation, trim.
 */
function normalizeText(text: string): string {
  return _.toLower(text)
    .replace(/[^\w\s]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

/**
 * Calculate similarity score between two strings using Levenshtein distance.
 * Returns a value between 0 and 1, where 1 is an exact match.
 */
function calculateSimilarity(str1: string, str2: string): number {
  const s1 = normalizeText(str1);
  const s2 = normalizeText(str2);
  if (s1 === s2) return 1;
  if (s1.length === 0 || s2.length === 0) return 0;
  const maxLen = Math.max(s1.length, s2.length);
  const distance = levenshteinDistance(s1, s2);
  return 1 - distance / maxLen;
}

/**
 * Calculate Levenshtein distance between two strings.
 */
function levenshteinDistance(str1: string, str2: string): number {
  const m = str1.length;
  const n = str2.length;
  const dp: number[][] = Array.from({ length: m + 1 }, () => Array(n + 1).fill(0));
  for (let i = 0; i <= m; i++) dp[i][0] = i;
  for (let j = 0; j <= n; j++) dp[0][j] = j;
  for (let i = 1; i <= m; i++) {
    for (let j = 1; j <= n; j++) {
      const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
      dp[i][j] = Math.min(
        dp[i - 1][j] + 1,
        dp[i][j - 1] + 1,
        dp[i - 1][j - 1] + cost
      );
    }
  }
  return dp[m][n];
}

/**
 * Check if the message contains a reference to an exercise using synonyms.
 */
function matchBySynonym(normalizedMessage: string): string | null {
  for (const [synonym, canonical] of Object.entries(EXERCISE_SYNONYMS)) {
    if (normalizedMessage.includes(synonym)) {
      return canonical;
    }
  }
  return null;
}

/**
 * Find the best fuzzy match from known exercise names.
 */
function findBestFuzzyMatch(
  normalizedMessage: string,
  knownExercises: string[]
): { exercise: string; score: number } | null {
  const words = normalizedMessage.split(" ");
  let bestMatch: { exercise: string; score: number } | null = null;
  for (const exercise of knownExercises) {
    const normalizedExercise = normalizeText(exercise);
    // Check if exercise name appears as substring
    if (normalizedMessage.includes(normalizedExercise)) {
      return { exercise, score: 1.0 };
    }
    // Check similarity with sliding window of words
    const exerciseWordCount = normalizedExercise.split(" ").length;
    for (let i = 0; i <= words.length - exerciseWordCount; i++) {
      const windowPhrase = words.slice(i, i + exerciseWordCount + 1).join(" ");
      const similarity = calculateSimilarity(windowPhrase, normalizedExercise);
      if (similarity > (bestMatch?.score ?? 0)) {
        bestMatch = { exercise, score: similarity };
      }
    }
    // Also check full message similarity for short exercise names
    const fullSimilarity = calculateSimilarity(normalizedMessage, normalizedExercise);
    if (fullSimilarity > (bestMatch?.score ?? 0)) {
      bestMatch = { exercise, score: fullSimilarity };
    }
  }
  return bestMatch;
}

/**
 * Extract exercise tokens from user message that might be exercise references.
 * Returns potential exercise phrases for LLM fallback.
 */
export function extractPotentialExercisePhrases(message: string): string[] {
  const normalized = normalizeText(message);
  const words = normalized.split(" ");
  const phrases: string[] = [];
  // Extract 1-4 word combinations that could be exercise names
  for (let windowSize = 1; windowSize <= 4; windowSize++) {
    for (let i = 0; i <= words.length - windowSize; i++) {
      const phrase = words.slice(i, i + windowSize).join(" ");
      // Filter out common non-exercise words
      const nonExercisePatterns = [
        /^(how|what|why|when|can|should|is|are|my|the|a|an|i|you|do|did|have|has|been|was|were|will|would|could|about|with|for|from|this|that|these|those)$/,
        /^(progress|workout|session|today|yesterday|last|next|week|month|help|advice|tips|feedback)$/,
      ];
      const isNonExercise = nonExercisePatterns.some((pattern) => pattern.test(phrase));
      if (!isNonExercise && phrase.length > 2) {
        phrases.push(phrase);
      }
    }
  }
  return _.uniq(phrases);
}

/**
 * Try to match an exercise from the user message using deterministic methods.
 * Returns the matched exercise name or null if no confident match.
 */
export function matchExerciseDeterministic(
  userMessage: string,
  knownExercises: string[]
): ExerciseMatchResult {
  const normalizedMessage = normalizeText(userMessage);
  // Step 1: Try synonym matching first (highest confidence)
  const synonymMatch = matchBySynonym(normalizedMessage);
  if (synonymMatch) {
    // Verify the synonym maps to a known exercise (case-insensitive)
    const matchedKnown = _.find(knownExercises, (ex) =>
      normalizeText(ex) === normalizeText(synonymMatch)
    );
    if (matchedKnown) {
      return {
        matchedExercise: matchedKnown,
        confidence: 0.95,
        method: "deterministic",
      };
    }
    // Synonym mapped to a canonical name not in user's exercises
    // Try fuzzy match against known exercises using the synonym's canonical name
    const fuzzyFromSynonym = findBestFuzzyMatch(normalizeText(synonymMatch), knownExercises);
    if (fuzzyFromSynonym && fuzzyFromSynonym.score >= FUZZY_MATCH_THRESHOLD) {
      return {
        matchedExercise: fuzzyFromSynonym.exercise,
        confidence: fuzzyFromSynonym.score * 0.9,
        method: "deterministic",
      };
    }
  }
  // Step 2: Try fuzzy matching against known exercises
  const fuzzyMatch = findBestFuzzyMatch(normalizedMessage, knownExercises);
  if (fuzzyMatch && fuzzyMatch.score >= FUZZY_MATCH_THRESHOLD) {
    return {
      matchedExercise: fuzzyMatch.exercise,
      confidence: fuzzyMatch.score,
      method: "deterministic",
    };
  }
  // No confident match
  return {
    matchedExercise: null,
    confidence: 0,
    method: "none",
  };
}

/**
 * Get unique exercise names from logs.
 */
export function getExerciseNamesFromLogs(
  logs: Array<{ exerciseId: unknown }>
): string[] {
  return _.uniq(
    _.compact(
      _.map(logs, (log) => {
        const exerciseId = log.exerciseId as unknown;
        if (exerciseId && typeof exerciseId === "object" && "name" in exerciseId) {
          return (exerciseId as Record<string, unknown>).name as string;
        }
        return null;
      })
    )
  );
}
