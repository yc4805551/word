export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

export interface AIConfig {
    apiKey: string;
    endpoint: string;
    model: string;
}

export interface AIResponse {
    success: boolean;
    data?: string;
    error?: string;
}

export interface PolishedText {
    original: string;
    polished: string;
    changes: Array<{
        original_word: string;
        polished_word: string;
        rationale: string;
    }>;
    overall_comment: string;
}

export interface AuditResult {
    score: number;
    dimensions: {
        logic: { score: number; comment: string };
        format: { score: number; comment: string };
        wording: { score: number; comment: string };
        brevity: { score: number; comment: string };
        accuracy: { score: number; comment: string };
    };
    overall_comment: string;
    suggestions: string[];
}

export interface AuthenticityResult {
    original_text: string;
    score: number;
    issues: Array<{
        segment: string;
        type: 'cliche' | 'jargon' | 'empty';
        suggestion: string;
    }>;
    comment: string;
}

export interface AssociativeSentence {
    text: string;
    keywords: string[];
}

export interface AssociativeSuggestion {
    directions: string[];
    sentences: AssociativeSentence[];
}

export interface Quiz {
    word: string;
    focus: string;
    options: { A: string; B: string };
    correct: 'A' | 'B';
    note?: string;
    finalPair?: 'in/ing' | 'en/eng';
    optionFinals?: { A?: string; B?: string };
    correctFinal?: string;
}

export interface LogicExpansion {
    original: string;
    expanded: string;
    logic_mode: string;
    breakdown: string;
}

export interface OutlineResult {
    title: string;
    sections: {
        lvl1: string;
        lvl2: string[];
    }[];
    comment: string;
}

export interface ScenarioPractice {
    scenario: string;
    sentence: string;
    target_possibilities: string[];
    hint: string;
    explanation: string;
}

export interface StructurePractice {
    skeleton: string;
    example: string;
    analysis: string;
}

export interface FranklinFeedback {
    standard_version: string;
    score: number;
    diff_analysis: string;
    key_improvements: string[];
}

export interface EvidenceCheckResult {
    original_text: string;
    claims: Array<{
        segment: string;
        issue: string;
        suggestion: string;
    }>;
    overall_score: number;
}

export interface WinstonStarResult {
    original_text: string;
    elements: {
        slogan: { present: boolean; content: string; suggestion: string };
        symbol: { present: boolean; content: string; suggestion: string };
        salient: { present: boolean; content: string; suggestion: string };
        surprise: { present: boolean; content: string; suggestion: string };
        story: { present: boolean; content: string; suggestion: string };
    };
    overall_score: number;
}

export interface SmartWeek1Training {
    article: string;
    guidance: string;
    quizzes: Quiz[];
}

export interface SmartLesson {
    article: string;
    keywords: Array<{
        word: string;
        meaning: string;
        analysis: string;
        example: string;
        expansion: string[];
    }>;
    practice: {
        text: string;
        blanks: Array<{
            id: number;
            answer: string;
            hint: string;
        }>;
    };
}

export interface ContextualPractice {
    scenario: string;
    sentence: string;
    target: string;
    hint: string;
}
