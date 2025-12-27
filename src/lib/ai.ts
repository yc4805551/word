export interface AIConfig {
    apiKey: string;
    endpoint: string;
    model: string;
}

export function getAIConfig(provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string; endpoint?: string }): AIConfig {
    let apiKey = import.meta.env.VITE_OPENAI_API_KEY;
    let endpoint = import.meta.env.VITE_OPENAI_ENDPOINT || 'https://api.openai.com/v1/chat/completions';
    let model = import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o'; // Intelligent default

    // If overrides provided (from Context), use them
    if (overrides?.apiKey) {
        apiKey = overrides.apiKey;
    }

    // Helper to ensure endpoint ends with /chat/completions if it looks like a base URL
    const normalizeEndpoint = (url: string) => {
        if (url.includes('/chat/completions')) return url;
        // If it ends with slash, remove it before appending
        const base = url.endsWith('/') ? url.slice(0, -1) : url;
        return `${base}/chat/completions`;
    };

    if (provider === 'deepseek') {
        apiKey = overrides?.apiKey || import.meta.env.VITE_DEEPSEEK_API_KEY;
        const envEndpoint = import.meta.env.VITE_DEEPSEEK_ENDPOINT;
        endpoint = envEndpoint ? normalizeEndpoint(envEndpoint) : 'https://api.deepseek.com/chat/completions';
        model = import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat';
    } else if (provider === 'gemini') {
        apiKey = overrides?.apiKey || import.meta.env.VITE_GEMINI_API_KEY;
        const envEndpoint = import.meta.env.VITE_GEMINI_ENDPOINT;
        // Gemini's official openai-compat base often needs /chat/completions appended if user just pasted the base
        endpoint = envEndpoint ? normalizeEndpoint(envEndpoint) : 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions';
        model = import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
    } else {
        // OpenAI default
        apiKey = overrides?.apiKey || import.meta.env.VITE_OPENAI_API_KEY;
        const envEndpoint = import.meta.env.VITE_OPENAI_ENDPOINT;
        endpoint = envEndpoint ? normalizeEndpoint(envEndpoint) : 'https://api.openai.com/v1/chat/completions';
    }

    return { apiKey, endpoint, model };
}

function getErrorMessage(err: unknown) {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    try { return JSON.stringify(err); } catch { return '未知错误'; }
}

function normalizeApiKey(key: unknown) {
    return typeof key === 'string' ? key.trim() : '';
}

function buildHttpError(status: number, statusText: string, rawBody: string) {
    const clean = rawBody?.trim?.() ? rawBody.trim() : '';
    let message = `${status} ${statusText}`.trim();

    if (clean) {
        try {
            const obj = JSON.parse(clean);
            const apiMsg =
                obj?.error?.message ??
                obj?.message ??
                obj?.error ??
                obj?.detail ??
                obj?.msg;
            if (typeof apiMsg === 'string' && apiMsg.trim()) {
                message = `${message}: ${apiMsg.trim()}`;
            } else {
                message = `${message}: ${clean.slice(0, 400)}`;
            }
        } catch {
            message = `${message}: ${clean.slice(0, 400)}`;
        }
    }

    return new Error(message);
}

async function fetchWithTimeout(input: RequestInfo | URL, init: RequestInit | undefined, timeoutMs: number) {
    const controller = new AbortController();
    const parentSignal = init?.signal;

    if (parentSignal?.aborted) controller.abort();
    const onAbort = () => controller.abort();
    parentSignal?.addEventListener('abort', onAbort, { once: true });

    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        return await fetch(input, { ...init, signal: controller.signal });
    } finally {
        window.clearTimeout(timer);
        parentSignal?.removeEventListener('abort', onAbort);
    }
}

function extractJsonCandidate(text: string) {
    const trimmed = text.trim();
    if (!trimmed) return null;

    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) return fenceMatch[1].trim();

    const firstBrace = trimmed.search(/[{[]/);
    if (firstBrace === -1) return null;
    const candidate = trimmed.slice(firstBrace).trim();
    return candidate;
}

function safeJsonParse<T = unknown>(text: string): T | null {
    const candidate = extractJsonCandidate(text);
    if (!candidate) return null;
    try {
        return JSON.parse(candidate) as T;
    } catch {
        return null;
    }
}

function isObject(value: unknown): value is Record<string, unknown> {
    return typeof value === 'object' && value !== null;
}

function isSmartLessonPayload(value: unknown): value is Omit<SmartLesson, 'article'> {
    if (!isObject(value)) return false;
    if (!Array.isArray(value.keywords)) return false;
    if (!isObject(value.practice)) return false;
    if (typeof value.practice.text !== 'string') return false;
    if (!Array.isArray(value.practice.blanks)) return false;
    return true;
}

// Helper to unify API calls and handle Gemini Native vs OpenAI Compat
async function callChatCompletion(
    messages: ChatMessage[],
    config: AIConfig,
    schema?: unknown
): Promise<string | null> {

    // If user explicitly set .../openai/ endpoint, we TRY to use OpenAI compat, but if it fails with CORS (which we can't detect easily beforehand), 
    // we might want to default to native.
    // HOWEVER, the user's specific error "Failed to fetch" strongly suggests CORS on the compat endpoint.
    // Strategy: If it's Google host, FORCE Native API usage for reliability in browser, ignoring the /openai/ path suffix if present.

    const isGoogleHost = config.endpoint.includes('generativelanguage.googleapis.com');

    if (isGoogleHost) {
        // --- GEMINI NATIVE API MODE ---
        // Construct Native URL
        // Default: https://generativelanguage.googleapis.com/v1beta/models/gemini-1.5-flash:generateContent?key=API_KEY
        const nativeUrl = `https://generativelanguage.googleapis.com/v1beta/models/${config.model}:generateContent?key=${config.apiKey}`;

        const systemMsg = messages.find(m => m.role === 'system');
        const conversation = messages.filter(m => m.role !== 'system');

        const geminiContents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }> = conversation.map(m => ({
            role: m.role === 'user' ? 'user' : 'model',
            parts: [{ text: m.content }]
        }));

        const payload: {
            contents: Array<{ role: 'user' | 'model'; parts: Array<{ text: string }> }>;
            generationConfig: { temperature: number; response_mime_type?: string };
            system_instruction?: { parts: Array<{ text: string }> };
        } = {
            contents: geminiContents,
            generationConfig: { temperature: 0.7 }
        };

        if (systemMsg) {
            payload.system_instruction = { parts: [{ text: systemMsg.content }] };
        }

        if (schema) {
            payload.generationConfig.response_mime_type = "application/json";
        }

        const response = await fetchWithTimeout(nativeUrl, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify(payload)
        }, 60_000);

        if (!response.ok) {
            const errText = await response.text();
            throw buildHttpError(response.status, response.statusText, errText);
        }

        const data = await response.json();
        const text = data.candidates?.[0]?.content?.parts?.[0]?.text;
        return text || null;

    } else {
        // --- OPENAI COMPAT MODE (DeepSeek, OpenAI, or Custom Proxy) ---
        const payload: Record<string, unknown> = {
            model: config.model,
            messages: messages,
            temperature: 0.7,
        };

        if (schema) {
            payload.response_format = schema;
        }

        const response = await fetchWithTimeout(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify(payload),
        }, 60_000);

        if (!response.ok) {
            const errText = await response.text();
            throw buildHttpError(response.status, response.statusText, errText);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    }
}

// --- EXPORTED FUNCTIONS USING HELPER ---

export interface ChatMessage {
    role: 'system' | 'user' | 'assistant';
    content: string;
}

interface AIResponse {
    success: boolean;
    data?: string;
    error?: string;
}

export async function interactivePolish(
    history: ChatMessage[],
    provider: 'openai' | 'deepseek' | 'gemini' = 'openai',
    overrides?: { apiKey?: string }
): Promise<AIResponse> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return { success: false, error: `未配置 ${provider} 的 API Key，请在“系统设置”中填写。` };

    try {
        const text = await callChatCompletion(history, config, undefined);
        if (!text) return { success: false, error: "Empty response" };
        return { success: true, data: text };
    } catch (e) {
        const msg = getErrorMessage(e);
        if (msg.includes('AbortError')) return { success: false, error: '请求超时，请稍后重试或切换模型。' };
        return { success: false, error: msg || "网络错误" };
    }
}

export async function generateText(prompt: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<string> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) throw new Error(`未配置 ${provider} 的 API Key，请在“系统设置”中填写。`);

    try {
        const messages: ChatMessage[] = [
            { role: "system", content: "你是一个公文写作助手。请根据用户的主题，生成一篇标准的、格式规范的公文范文（如调研报告、通知、方案等）。内容要专业、严谨，符合中国政府公文语体风格。字数控制在300-500字左右，适合打字练习。" },
            { role: "user", content: `请以“${prompt}”为主题，生成一篇公文范文。` }
        ];

        let content = await callChatCompletion(messages, config, undefined);
        content = content || "生成失败";

        // Post-processing
        content = content.replace(/\*\*/g, '').replace(/\*/g, '');
        const lines = content.split('\n').map(l => l.trim()).filter(l => l.length > 0);
        return lines.join('\n');
    } catch (error) {
        const msg = getErrorMessage(error);
        if (msg.includes('AbortError')) throw new Error('请求超时，请稍后重试或切换模型。');
        throw new Error(msg);
    }
}

export interface Quiz {
    word: string;
    focus: string;
    options: { A: string; B: string };
    correct: 'A' | 'B';
    note?: string;
}

export async function generateQuiz(text: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<Quiz[]> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return [];

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个汉语拼音专家。请仔细分析用户提供的文本，执行以下步骤：
            1. 找出文本中所有包含前后鼻音韵母（in, ing, en, eng）的词语。请注意：**严格排除**包含 an, ang 的词语，只关注 in, ing, en, eng。
            2. 统计这些词语在文中出现的频率，优先选择出现频率较高或文中关键的词语。
            3. 基于这些高频/关键词语，生成6-8个拼音辨析题。
            
            请返回一个JSON数组，格式如下：
            [
                {
                    "word": "词语（如：运行）",
                    "focus": "易混字（如：行）",
                    "options": { "A": "xín (前)", "B": "xíng (后)" },
                    "correct": "B"
                }
            ]
            注意：返回纯JSON array.`
        },
        { role: "user", content: `请分析以下文本并生成拼音辨析题：\n${text}` }
    ];

    try {
        const content = await callChatCompletion(messages, config, undefined) || "[]";
        const parsed = safeJsonParse(content);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'object' && parsed !== null && 'quizzes' in parsed && Array.isArray((parsed as { quizzes?: unknown }).quizzes)) {
            return (parsed as { quizzes: Quiz[] }).quizzes;
        }
        return [];
    } catch {
        return [];
    }

}

export async function generatePinyinQuiz(provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<Quiz[]> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return [];

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个汉语拼音专家。请生成一组（8-10个）针对“前后鼻音”即(in/ing, en/eng)的易混词辨析题。
            请严格遵守以下规则：
            1. 词语必须是公文写作中常见的双字或四字词语。
            2. 重点考察的字必须包含 in, ing, en, eng 韵母。
            3. 题目格式必须包含：词语、易混字、正确选项、干扰选项（拼音错误或声调错误）。
            
            请返回一个JSON数组，格式如下：
            [
                {
                    "word": "词语（如：深化改革）",
                    "focus": "易混字（如：深）",
                    "options": { "A": "shēn (前)", "B": "shēng (后)" },
                    "correct": "A",
                    "note": "深化，Meaning 'deepen', uses front nasal sound."
                }
            ]`
        },
        { role: "user", content: `请生成一组前后鼻音辨析题。` }
    ];

    try {
        const content = await callChatCompletion(messages, config, undefined) || "[]";
        const parsed = safeJsonParse(content);
        if (Array.isArray(parsed)) return parsed;
        if (typeof parsed === 'object' && parsed !== null && 'quizzes' in parsed && Array.isArray((parsed as { quizzes?: unknown }).quizzes)) {
            return (parsed as { quizzes: Quiz[] }).quizzes;
        }
        return [];
    } catch {
        return [];
    }
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

export async function analyzeAndGeneratePractice(article: string, focusWords: string[], provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<SmartLesson | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个公文写作教学专家。
用户提供了一段公文和他们想要学习的“重点词汇”。
请执行以下任务并返回JSON：
1. 词汇解析与举一反三（释义、例句、近义词）。
2. 生成填空练习。文章中的填空位置请严格使用此格式：___[序号]___。注意：不要在横线中包含提示词，提示词请放在blanks数组中。例如：___[1]___。
返回格式（严格JSON）：
{
    "article": "...", 
    "keywords": [{ "word": "...", "meaning": "...", "analysis": "...", "example": "...", "expansion": ["..."] }],
    "practice": { "text": "文章内容...___[1]___...", "blanks": [{ "id": 1, "answer": "...", "hint": "（动词/名词/成语）" }] }
}`
        },
        { role: "user", content: `文章内容：${article}\n\n用户关注的词：${JSON.stringify(focusWords)}` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        if (!content) return null;
        const json = safeJsonParse(content);
        if (!isSmartLessonPayload(json)) return null;
        return { ...json, article };
    } catch {
        return null;
    }
}

// ... Additional simple functions using callChatCompletion ...

export interface ContextualPractice {
    scenario: string;
    sentence: string;
    target: string;
    hint: string;
}

export async function generateContextualPractice(colloquial: string, official: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai'): Promise<ContextualPractice | null> {
    const config = getAIConfig(provider);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个脑科学训练专家。请根据提供的“口语词”和“规范词”，设计一个场景化训练题。
返回JSON: { "scenario": "...", "sentence": "...", "target": "...", "hint": "..." }`
        },
        { role: "user", content: `口语词：${colloquial}，规范词：${official}` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<ContextualPractice>(content) : null;
    } catch { return null; }
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

export async function polishText(text: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<PolishedText | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个工信部风格公文写作专家。请润色文字并解析。
返回JSON: { "original": "...", "polished": "...", "changes": [...], "overall_comment": "..." }`
        },
        { role: "user", content: `请润色这段文字：${text}` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<PolishedText>(content) : null;
    } catch { return null; }
}

export interface ScenarioPractice {
    scenario: string;
    sentence: string;
    target_possibilities: string[];
    hint: string;
    explanation: string;
}

export async function generateScenarioPractice(word: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<ScenarioPractice | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `公文写作教练。针对口头禅“${word}”生成反例和规范词推荐。
返回JSON: { "scenario": "...", "sentence": "...", "target_possibilities": [...], "hint": "...", "explanation": "..." }`
        },
        { role: "user", content: `请针对口头禅“${word}”生成一个训练场景。` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<ScenarioPractice>(content) : null;
    } catch { return null; }
}

export async function generateUsagePractice(word: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<ScenarioPractice | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个公文写作教练。
请针对高级词汇“${word}”设计一个应用场景训练题。
1. 设定一个需要用到该词的公务场景（Scenario）。
2. 写一个句子（Sentence），其中该词的位置用 ____ 代替。
3. 提供提示（Hint），例如“填入一个表示XXX的二字词”。
4. 目标答案（target_possibilities）即为该词（也可以包含同义且恰当的词）。
5. 解析（Explanation）解释为什么这里用这个词最恰当。

返回JSON（Strict JSON）：
{
  "scenario": "...",
  "sentence": "...",
  "target_possibilities": ["..."],
  "hint": "...",
  "explanation": "..."
}`
        },
        { role: "user", content: `请针对词汇“${word}”生成一个正面应用训练场景。` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<ScenarioPractice>(content) : null;
    } catch { return null; }
}

export interface StructurePractice {
    skeleton: string;
    example: string;
    analysis: string;
}

export async function generateStructurePractice(topic: string, structure: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<StructurePractice | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `公文写作教练，擅长句式仿写。
返回JSON: { "skeleton": "...", "example": "...", "analysis": "..." }`
        },
        { role: "user", content: `主题：${topic}\n句式模板：${structure}` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<StructurePractice>(content) : null;
    } catch { return null; }
}

export interface LogicExpansion {
    original: string;
    expanded: string;
    logic_mode: string;
    breakdown: string;
}

export async function expandLogic(point: string, mode: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<LogicExpansion | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `公文写作教练，擅长逻辑扩写。
返回JSON: { "original": "...", "expanded": "...", "logic_mode": "...", "breakdown": "..." }`
        },
        { role: "user", content: `核心观点：${point}\n逻辑模式：${mode}` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<LogicExpansion>(content) : null;
    } catch { return null; }
}

export interface OutlineResult {
    title: string;
    sections: {
        lvl1: string;
        lvl2: string[];
    }[];
    comment: string;
}

export async function generateOutline(theme: string, type: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<OutlineResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `公文写作专家。搭建严密提纲。
返回JSON: { "title": "...", "sections": [{ "lvl1": "...", "lvl2": [...] }], "comment": "..." }`
        },
        { role: "user", content: `文种：${type}\n主题：${theme}` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<OutlineResult>(content) : null;
    } catch { return null; }
}

export async function generateArticle(topic: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai', overrides?: { apiKey?: string }): Promise<string | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        { role: "system", content: "撰写约150字优美公文段落。" },
        { role: "user", content: `主题：${topic}` }
    ];
    return callChatCompletion(messages, config, undefined);
}
