import { describe, it, expect } from "vitest";
import { readFileSync } from "fs";
import { join } from "path";

/**
 * Interpretation Output Contract Evaluator
 *
 * This test harness evaluates AI interpretation outputs against the Aletheia rubric.
 * Used to validate local and cloud model outputs for contract fidelity.
 */

// Types
type UserIntent = "clarity" | "comfort" | "challenge" | "guidance";

interface EvalCase {
  id: string;
  source_language: "vi" | "en";
  passage: {
    id: string;
    source_id: string;
    reference: string;
    text: string;
  };
  symbol: {
    id: string;
    display_name: string;
  };
  situation_text: string | null;
  user_intent: UserIntent;
  expected_output_markers: {
    language: "vi" | "en";
    should_mirror_situation: boolean;
    mirrored_keywords?: string[];
    tone: string;
    forbidden_patterns: string[];
  };
}

interface EvalDataset {
  version: string;
  output_contract: Record<string, string>;
  rubric: Record<string, { weight: number; pass_criteria: string; fail_examples: string[] }>;
  eval_cases: EvalCase[];
}

interface EvalResult {
  case_id: string;
  passed: boolean;
  scores: Record<string, { score: number; weight: number; passed: boolean; reason: string }>;
  total_weighted_score: number;
  failures: string[];
}

interface InterpretationOutput {
  text: string;
  model: string;
  provider: string;
  latency_ms: number;
  used_fallback: boolean;
}

// Load eval dataset
function loadEvalDataset(): EvalDataset {
  const path = join(__dirname, "fixtures", "interpretation-eval-dataset.json");
  const content = readFileSync(path, "utf-8");
  return JSON.parse(content) as EvalDataset;
}

// Language detection
function detectLanguage(text: string): "vi" | "en" {
  // Vietnamese-specific Unicode characters (diacritics)
  const viDiacritics = /[àáạảãâầấậẩẫăằắặẳẵèéẹẻẽêềếệểễìíịỉĩòóọỏõôồốộổỗơờớợởỡùúụủũưừứựửữỳýỵỷỹđ]/i;
  
  // Vietnamese common words with proper diacritics
  const viWords = /\b(là|của|và|cho|nhưng|khi|này|có|một|người|ấy|với|không|thì|bị|bởi|tạo|nếu|hay|sẽ|như|đang|trong|trên|đâu|làm|gì|phần|nhiều|hết|ngày|tháng|năm|quý|lúc|tạo|bao|sau|trước|đến|đầu|vì|tuy|rằng|chi|nhiều|thêm|ít|luôn|mãi|lần|như|những|người|chỉ|chúng|phần|lần|nhanh|và|hoặc|hay|nhưng|người|chúng)\b/i;

  // Check for Vietnamese diacritics first (most reliable)
  if (viDiacritics.test(text)) {
    return "vi";
  }
  
  // Check for Vietnamese words
  if (viWords.test(text)) {
    return "vi";
  }
  
  return "en";
}

// Count words (handles both Vietnamese and English)
function countWords(text: string): number {
  // Remove the final question (in italics) before counting
  const mainText = text.replace(/\*[^*]+\*\s*$/, "").trim();
  // Split by whitespace and filter empty strings
  return mainText.split(/\s+/).filter(Boolean).length;
}

// Check for forbidden patterns
function checkForbiddenPatterns(text: string, patterns: string[]): { found: string[]; passed: boolean } {
  const found: string[] = [];
  const lowerText = text.toLowerCase();

  for (const pattern of patterns) {
    if (lowerText.includes(pattern.toLowerCase())) {
      found.push(pattern);
    }
  }

  return { found, passed: found.length === 0 };
}

// Check for ending question
function checkEndingQuestion(text: string): { passed: boolean; reason: string } {
  // Check for italicized question at end: *[question]*
  const italicQuestionMatch = text.match(/\*([^*]+)\*\s*$/);

  if (!italicQuestionMatch) {
    return { passed: false, reason: "No italicized question found at end" };
  }

  const question = italicQuestionMatch[1].trim();

  // Check if it's a question (contains ? or question words)
  const isQuestion = question.includes("?") ||
    /\b(what|where|when|why|how|who|which|c|gì|âu|khi nào|t sao|nh th nào|ai|cái nào)\b/i.test(question);

  if (!isQuestion) {
    return { passed: false, reason: "Final italicized text is not a question" };
  }

  // Check length (< 15 words)
  const wordCount = question.split(/\s+/).filter(Boolean).length;
  if (wordCount > 15) {
    return { passed: false, reason: `Question too long: ${wordCount} words (max 15)` };
  }

  // Check it's about present moment (not future)
  const futurePatterns = /\b(s|will|going to|planning|tomorrow|next|future|tng lai|s|k|ti|mai)/i;
  if (futurePatterns.test(question)) {
    return { passed: false, reason: "Question appears to be about future, not present moment" };
  }

  return { passed: true, reason: "Valid ending question found" };
}

// Check situation mirroring
function checkSituationMirroring(
  text: string,
  situationText: string | null,
  expectedKeywords: string[] | undefined,
  shouldMirror: boolean
): { passed: boolean; reason: string } {
  if (!shouldMirror || !situationText) {
    return { passed: true, reason: "No situation mirroring required" };
  }

  if (!expectedKeywords || expectedKeywords.length === 0) {
    return { passed: true, reason: "No keywords to check" };
  }

  const lowerText = text.toLowerCase();
  const mirroredKeywords: string[] = [];

  for (const keyword of expectedKeywords) {
    if (lowerText.includes(keyword.toLowerCase())) {
      mirroredKeywords.push(keyword);
    }
  }

  // At least 50% of keywords should be mirrored
  const mirrorRatio = mirroredKeywords.length / expectedKeywords.length;

  if (mirrorRatio < 0.5) {
    return {
      passed: false,
      reason: `Only ${mirroredKeywords.length}/${expectedKeywords.length} keywords mirrored: ${mirroredKeywords.join(", ")}`
    };
  }

  return { passed: true, reason: `Mirrored ${mirroredKeywords.length}/${expectedKeywords.length} keywords` };
}

// Check tone fidelity
function checkToneFidelity(text: string, expectedTone: string): { passed: boolean; reason: string } {
  const toneIndicators: Record<string, { positive: string[]; negative: string[] }> = {
    "analytical, clear, structured": {
      positive: ["nh", "th", "c th", "khi", "vì", "nên", "clearly", "thus", "therefore", "this means"],
      negative: ["tuyt vi", "tuyt", "wow", "amazing", "awesome", "thât tuyt"]
    },
    "warm, healing, gentle": {
      positive: ["l", "c", "yên", "bình", "nh", "gentle", "peace", "rest", "healing", "soft"],
      negative: ["phi", "sai", "nhm", "wrong", "bad", "should have", "nên ã"]
    },
    "direct, unflinching, honest": {
      positive: ["nhng", "tuy", "th", "c th", "but", "yet", "actually", "in fact", "however"],
      negative: ["c", "n", "try", "hopefully", "maybe", "c l", "hy vng"]
    },
    "open, non-directive, spacious": {
      positive: ["c", "th", "nhiu", "có l", "perhaps", "might", "could", "wonder", "curious"],
      negative: ["nên", "phi", "c", "must", "should", "have to", "need to"]
    }
  };

  const indicators = toneIndicators[expectedTone];
  if (!indicators) {
    return { passed: true, reason: `Unknown tone: ${expectedTone}` };
  }

  const lowerText = text.toLowerCase();
  let positiveCount = 0;
  let negativeCount = 0;

  for (const word of indicators.positive) {
    if (lowerText.includes(word.toLowerCase())) {
      positiveCount++;
    }
  }

  for (const word of indicators.negative) {
    if (lowerText.includes(word.toLowerCase())) {
      negativeCount++;
    }
  }

  if (negativeCount > positiveCount) {
    return { passed: false, reason: `Tone mismatch: ${negativeCount} negative indicators vs ${positiveCount} positive` };
  }

  return { passed: true, reason: `Tone indicators: ${positiveCount} positive, ${negativeCount} negative` };
}

// Main evaluation function
export function evaluateInterpretation(
  evalCase: EvalCase,
  output: InterpretationOutput
): EvalResult {
  const scores: Record<string, { score: number; weight: number; passed: boolean; reason: string }> = {};
  const failures: string[] = [];

  // 1. Language fidelity
  const detectedLang = detectLanguage(output.text);
  const languagePassed = detectedLang === evalCase.source_language;
  scores.language_fidelity = {
    score: languagePassed ? 1 : 0,
    weight: 1.0,
    passed: languagePassed,
    reason: languagePassed
      ? `Language matches: ${detectedLang}`
      : `Language mismatch: expected ${evalCase.source_language}, got ${detectedLang}`
  };
  if (!languagePassed) failures.push("language_fidelity");

  // 2. Non-advice compliance
  const forbiddenCheck = checkForbiddenPatterns(output.text, evalCase.expected_output_markers.forbidden_patterns);
  scores.non_advice_compliance = {
    score: forbiddenCheck.passed ? 1 : 0,
    weight: 1.5,
    passed: forbiddenCheck.passed,
    reason: forbiddenCheck.passed
      ? "No forbidden advice patterns found"
      : `Found forbidden patterns: ${forbiddenCheck.found.join(", ")}`
  };
  if (!forbiddenCheck.passed) failures.push("non_advice_compliance");

  // 3. Ending question compliance
  const endingCheck = checkEndingQuestion(output.text);
  scores.ending_question_compliance = {
    score: endingCheck.passed ? 1 : 0,
    weight: 1.0,
    passed: endingCheck.passed,
    reason: endingCheck.reason
  };
  if (!endingCheck.passed) failures.push("ending_question_compliance");

  // 4. Length compliance
  const wordCount = countWords(output.text);
  const lengthPassed = wordCount >= 80 && wordCount <= 120;
  scores.length_compliance = {
    score: lengthPassed ? 1 : wordCount < 80 ? 0.5 : 0.5,
    weight: 0.5,
    passed: lengthPassed,
    reason: lengthPassed
      ? `Word count: ${wordCount} (within 80-120)`
      : `Word count: ${wordCount} (expected 80-120)`
  };
  if (!lengthPassed) failures.push("length_compliance");

  // 5. Situation mirroring
  const mirrorCheck = checkSituationMirroring(
    output.text,
    evalCase.situation_text,
    evalCase.expected_output_markers.mirrored_keywords,
    evalCase.expected_output_markers.should_mirror_situation
  );
  scores.situation_mirroring = {
    score: mirrorCheck.passed ? 1 : 0,
    weight: 1.0,
    passed: mirrorCheck.passed,
    reason: mirrorCheck.reason
  };
  if (!mirrorCheck.passed) failures.push("situation_mirroring");

  // 6. Tone fidelity
  const toneCheck = checkToneFidelity(output.text, evalCase.expected_output_markers.tone);
  scores.tone_fidelity = {
    score: toneCheck.passed ? 1 : 0,
    weight: 1.0,
    passed: toneCheck.passed,
    reason: toneCheck.reason
  };
  if (!toneCheck.passed) failures.push("tone_fidelity");

  // Calculate total weighted score
  let totalWeight = 0;
  let weightedSum = 0;
  for (const key of Object.keys(scores)) {
    const s = scores[key];
    weightedSum += s.score * s.weight;
    totalWeight += s.weight;
  }

  const totalWeightedScore = weightedSum / totalWeight;
  const passed = totalWeightedScore >= 0.8 && failures.length === 0;

  return {
    case_id: evalCase.id,
    passed,
    scores,
    total_weighted_score: totalWeightedScore,
    failures
  };
}

// Run evaluation on all cases
export function runEvaluation(
  outputs: Map<string, InterpretationOutput>
): { results: EvalResult[]; summary: { total: number; passed: number; avg_score: number } } {
  const dataset = loadEvalDataset();
  const results: EvalResult[] = [];

  for (const evalCase of dataset.eval_cases) {
    const output = outputs.get(evalCase.id);
    if (!output) {
      results.push({
        case_id: evalCase.id,
        passed: false,
        scores: {},
        total_weighted_score: 0,
        failures: ["no_output_provided"]
      });
      continue;
    }
    results.push(evaluateInterpretation(evalCase, output));
  }

  const passed = results.filter(r => r.passed).length;
  const avgScore = results.reduce((sum, r) => sum + r.total_weighted_score, 0) / results.length;

  return {
    results,
    summary: {
      total: results.length,
      passed,
      avg_score: avgScore
    }
  };
}

// Test suite
describe("Interpretation Eval Dataset", () => {
  it("should load valid eval dataset", () => {
    const dataset = loadEvalDataset();

    expect(dataset.version).toBe("1.0.0");
    expect(dataset.eval_cases.length).toBeGreaterThanOrEqual(20);
    expect(dataset.rubric).toBeDefined();
    expect(dataset.output_contract).toBeDefined();
  });

  it("should have valid eval cases", () => {
    const dataset = loadEvalDataset();

    for (const evalCase of dataset.eval_cases) {
      expect(evalCase.id).toMatch(/^eval_\d{3}$/);
      expect(evalCase.source_language).toMatch(/^(vi|en)$/);
      expect(evalCase.passage).toBeDefined();
      expect(evalCase.passage.text.length).toBeGreaterThan(0);
      expect(evalCase.symbol).toBeDefined();
      expect(evalCase.user_intent).toMatch(/^(clarity|comfort|challenge|guidance)$/);
      expect(evalCase.expected_output_markers.forbidden_patterns.length).toBeGreaterThan(0);
    }
  });

  it("should have balanced language distribution", () => {
    const dataset = loadEvalDataset();

    const viCount = dataset.eval_cases.filter(c => c.source_language === "vi").length;
    const enCount = dataset.eval_cases.filter(c => c.source_language === "en").length;

    // At least 30% each language
    expect(viCount / dataset.eval_cases.length).toBeGreaterThanOrEqual(0.3);
    expect(enCount / dataset.eval_cases.length).toBeGreaterThanOrEqual(0.3);
  });

  it("should have balanced intent distribution", () => {
    const dataset = loadEvalDataset();

    const intents = ["clarity", "comfort", "challenge", "guidance"] as const;

    for (const intent of intents) {
      const count = dataset.eval_cases.filter(c => c.user_intent === intent).length;
      // At least 10% for each intent
      expect(count / dataset.eval_cases.length).toBeGreaterThanOrEqual(0.1);
    }
  });

  it("should have cases with and without situation text", () => {
    const dataset = loadEvalDataset();

    const withSituation = dataset.eval_cases.filter(c => c.situation_text !== null).length;
    const withoutSituation = dataset.eval_cases.filter(c => c.situation_text === null).length;

    expect(withSituation).toBeGreaterThan(0);
    expect(withoutSituation).toBeGreaterThan(0);
  });
});

describe("Interpretation Evaluator", () => {
  it("should detect language correctly", () => {
    expect(detectLanguage("This is English text")).toBe("en");
    expect(detectLanguage("ây là tiâng Vi")).toBe("vi");
    expect(detectLanguage("The Creative works sublime success")).toBe("en");
    expect(detectLanguage("Tht là tuyt vi")).toBe("vi");
  });

  it("should count words correctly", () => {
    expect(countWords("This is a test.")).toBe(4);
    expect(countWords("ây là mt bài ki tra.")).toBe(6);
    expect(countWords("Short text *What do you think?*")).toBe(2); // Excludes question
  });

  it("should detect forbidden patterns", () => {
    const result1 = checkForbiddenPatterns("This is a normal text.", ["you should"]);
    expect(result1.passed).toBe(true);

    const result2 = checkForbiddenPatterns("You should try this.", ["you should"]);
    expect(result2.passed).toBe(false);
    expect(result2.found).toContain("you should");

    const result3 = checkForbiddenPatterns("B nên làm th này.", ["b nên"]);
    expect(result3.passed).toBe(false);
  });

  it("should validate ending question", () => {
    const result1 = checkEndingQuestion("Some text. *What do you think?*");
    expect(result1.passed).toBe(true);

    const result2 = checkEndingQuestion("Some text. No question here.");
    expect(result2.passed).toBe(false);

    const result3 = checkEndingQuestion("Some text. *This is a very long question that definitely exceeds the fifteen word limit for questions by having way too many words?*");
    expect(result3.passed).toBe(false);

    const result4 = checkEndingQuestion("Some text. *What will happen tomorrow?*");
    expect(result4.passed).toBe(false); // Future-oriented
  });

  it("should evaluate a complete interpretation", () => {
    const dataset = loadEvalDataset();
    const evalCase = dataset.eval_cases[0];

    const output: InterpretationOutput = {
      text: `D án hai nam cht chiu. Ngôi nén chiu m t s bât ân, khng phâi t thât. S kiên tri cht chiu, khng phâi t thây kêt quâ. Ngôi nén chiu m t s bât ân, khng phâi t thât. S kiên tri cht chiu, khng phâi t thây kêt quâ.

*Du âu trong d án này ang gôi tên b?*`,
      model: "test-model",
      provider: "test",
      latency_ms: 1000,
      used_fallback: false
    };

    const result = evaluateInterpretation(evalCase, output);

    expect(result.case_id).toBe(evalCase.id);
    expect(result.scores).toBeDefined();
    expect(result.total_weighted_score).toBeGreaterThanOrEqual(0);
    expect(result.passed).toBeDefined();
  });
});

// Export for use in other test files
export { type EvalCase, type InterpretationOutput, type EvalResult, loadEvalDataset };
