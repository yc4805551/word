export type FinalPair = 'in/ing' | 'en/eng';

export interface Week1QuizLike {
    word: string;
    focus: string;
    options: { A: string; B: string };
    correct: 'A' | 'B';
    note?: string;
    finalPair?: FinalPair;
    optionFinals?: { A?: string; B?: string };
    correctFinal?: string;
}

export interface Week1PairStat {
    attempts: number;
    correct: number;
    wrong: number;
    lastAt?: number;
}

export interface Week1ItemStat {
    attempts: number;
    correct: number;
    wrong: number;
    streak: number;
    lastAt?: number;
    dueAt?: number;
    word?: string;
    finalPair?: FinalPair;
}

export interface Week1MemoryV1 {
    version: 1;
    pairs: Partial<Record<FinalPair, Week1PairStat>>;
    items: Record<string, Week1ItemStat>;
}

const STORAGE_KEY = 'writer.week1.memory.v1';

function clamp(n: number, min: number, max: number) {
    return Math.min(max, Math.max(min, n));
}

export function makeQuizKey(q: Week1QuizLike) {
    const a = q.options?.A ?? '';
    const b = q.options?.B ?? '';
    return [q.word, q.focus, a, b, q.correct].join('|');
}

export function loadWeek1Memory(): Week1MemoryV1 {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        if (!raw) return { version: 1, pairs: {}, items: {} };
        const parsed = JSON.parse(raw) as unknown;
        if (!parsed || typeof parsed !== 'object') return { version: 1, pairs: {}, items: {} };
        const mem = parsed as Partial<Week1MemoryV1>;
        if (mem.version !== 1 || !mem.items || !mem.pairs) return { version: 1, pairs: {}, items: {} };
        return { version: 1, pairs: mem.pairs, items: mem.items };
    } catch {
        return { version: 1, pairs: {}, items: {} };
    }
}

export function saveWeek1Memory(memory: Week1MemoryV1) {
    try {
        localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
    } catch {
        return;
    }
}

export function getWeaknessScores(memory: Week1MemoryV1) {
    const pairs: FinalPair[] = ['in/ing', 'en/eng'];
    const scores = pairs.map((pair) => {
        const stat = memory.pairs[pair];
        const attempts = stat?.attempts ?? 0;
        const wrong = stat?.wrong ?? 0;
        const correct = stat?.correct ?? 0;
        const errorRate = attempts > 0 ? wrong / attempts : 0;
        const recency = stat?.lastAt ? clamp((Date.now() - stat.lastAt) / (1000 * 60 * 60 * 24), 0, 14) : 14;
        const recencyBoost = 1 - recency / 14;
        const score = errorRate * 0.75 + recencyBoost * 0.25 + clamp((wrong - correct) / 50, -0.2, 0.4);
        return { pair, score, attempts, wrong, correct };
    });

    scores.sort((a, b) => b.score - a.score);
    return scores;
}

export function pickWeakPair(memory: Week1MemoryV1): FinalPair {
    const scores = getWeaknessScores(memory);
    return scores[0]?.pair ?? 'in/ing';
}

export function getTopWrongWords(memory: Week1MemoryV1, limit = 6) {
    const entries = Object.values(memory.items)
        .filter((s) => typeof s.word === 'string' && s.word.trim().length > 0)
        .sort((a, b) => (b.wrong - b.correct) - (a.wrong - a.correct));
    const result: string[] = [];
    for (const e of entries) {
        if (!e.word) continue;
        const w = e.word.trim();
        if (!w) continue;
        if (!result.includes(w)) result.push(w);
        if (result.length >= limit) break;
    }
    return result;
}

export function recordQuizAttempt(memory: Week1MemoryV1, quiz: Week1QuizLike, isCorrect: boolean, at = Date.now()): Week1MemoryV1 {
    const key = makeQuizKey(quiz);
    const prevItem = memory.items[key] ?? { attempts: 0, correct: 0, wrong: 0, streak: 0 };
    const nextItem: Week1ItemStat = {
        ...prevItem,
        attempts: prevItem.attempts + 1,
        correct: prevItem.correct + (isCorrect ? 1 : 0),
        wrong: prevItem.wrong + (isCorrect ? 0 : 1),
        streak: isCorrect ? prevItem.streak + 1 : 0,
        lastAt: at,
        word: quiz.word,
        finalPair: quiz.finalPair ?? prevItem.finalPair,
    };

    const intervalDays = isCorrect ? clamp(1 + nextItem.streak, 1, 10) : 1;
    nextItem.dueAt = at + intervalDays * 24 * 60 * 60 * 1000;

    const pair = quiz.finalPair ?? prevItem.finalPair;
    const prevPair: Week1PairStat | undefined = pair ? memory.pairs[pair] : undefined;
    const nextPairs = { ...memory.pairs };
    if (pair) {
        const base = prevPair ?? { attempts: 0, correct: 0, wrong: 0 };
        nextPairs[pair] = {
            attempts: base.attempts + 1,
            correct: base.correct + (isCorrect ? 1 : 0),
            wrong: base.wrong + (isCorrect ? 0 : 1),
            lastAt: at
        };
    }

    return {
        version: 1,
        pairs: nextPairs,
        items: { ...memory.items, [key]: nextItem }
    };
}

export function pickDueItems(memory: Week1MemoryV1, pair: FinalPair | null, limit = 10) {
    const now = Date.now();
    const items = Object.entries(memory.items)
        .map(([key, stat]) => ({ key, stat }))
        .filter(({ stat }) => !pair || stat.finalPair === pair)
        .filter(({ stat }) => (stat.dueAt ?? 0) <= now)
        .sort((a, b) => {
            const aScore = (a.stat.wrong - a.stat.correct) + (a.stat.lastAt ? (now - a.stat.lastAt) / (1000 * 60 * 60 * 24) : 999);
            const bScore = (b.stat.wrong - b.stat.correct) + (b.stat.lastAt ? (now - b.stat.lastAt) / (1000 * 60 * 60 * 24) : 999);
            return bScore - aScore;
        });

    return items.slice(0, limit).map(({ key }) => key);
}

