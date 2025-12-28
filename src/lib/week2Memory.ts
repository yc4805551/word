export interface Week2MemoryV1 {
    version: '1';
    // 词汇记忆库：记录每个词的学习情况
    vocabulary: Record<string, {
        encounters: number;      // 遇到次数（在练习中出现过）
        correct: number;         // 回答正确的次数
        lastSeen: number;        // 最后一次见到的时间戳
        lastScore: number;       // 上次练习的得分（0-1，用于填空/场景评分）
    }>;
    // 文档学习历史：记录用户上传/生成过的文档主题
    documents: Array<{
        source: 'ai-generated' | 'user-uploaded';
        titleOrTopic: string;    // 主题或文件名
        trainedAt: number;
        keywordsLearned: string[]; // 从该文档中学过的词
    }>;
}

// 初始记忆
const DEFAULT_MEMORY: Week2MemoryV1 = {
    version: '1',
    vocabulary: {},
    documents: []
};

const STORAGE_KEY = 'week2-memory-v1';

export function loadWeek2Memory(): Week2MemoryV1 {
    try {
        const raw = localStorage.getItem(STORAGE_KEY);
        return raw ? JSON.parse(raw) : DEFAULT_MEMORY;
    } catch {
        return DEFAULT_MEMORY;
    }
}

export function saveWeek2Memory(memory: Week2MemoryV1): void {
    localStorage.setItem(STORAGE_KEY, JSON.stringify(memory));
}

/**
 * 记录一次词汇练习结果
 */
export function recordWordPractice(
    word: string,
    result: { isCorrect: boolean; score?: number } // score: 0-1 之间的掌握度评分
): void {
    const memory = loadWeek2Memory();
    const current = memory.vocabulary[word] || {
        encounters: 0,
        correct: 0,
        lastSeen: Date.now(),
        lastScore: 0
    };

    current.encounters += 1;
    if (result.isCorrect) current.correct += 1;
    current.lastSeen = Date.now();
    current.lastScore = result.score ?? (result.isCorrect ? 1 : 0);

    memory.vocabulary[word] = current;
    saveWeek2Memory(memory);
}

/**
 * 获取需要复习的词汇（按照掌握度排序，掌握度低的在前）
 */
export function getWordsNeedingReview(limit = 5): string[] {
    const memory = loadWeek2Memory();
    const words = Object.entries(memory.vocabulary)
        .map(([word, data]) => ({
            word,
            // 掌握度 = 正确率 * 时间衰减因子（最近学的权重高）
            mastery: (data.correct / data.encounters) * Math.exp(-(Date.now() - data.lastSeen) / (1000 * 60 * 60 * 24 * 7)) // 一周衰减
        }))
        .sort((a, b) => a.mastery - b.mastery) // 掌握度低的在前
        .slice(0, limit)
        .map(item => item.word);

    return words;
}

/**
 * 记录一次文档学习历史
 */
export function recordDocumentStudy(
    source: 'ai-generated' | 'user-uploaded',
    titleOrTopic: string,
    keywordsLearned: string[]
): void {
    const memory = loadWeek2Memory();
    memory.documents.unshift({
        source,
        titleOrTopic,
        trainedAt: Date.now(),
        keywordsLearned
    });
    // 只保留最近20条记录
    if (memory.documents.length > 20) memory.documents.pop();
    saveWeek2Memory(memory);
}