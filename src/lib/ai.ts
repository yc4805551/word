import type { StructurePattern } from '../data/week3-data';

export interface AIConfig {
    apiKey: string;
    endpoint: string;
    model: string;
}

export function getAIConfig(
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): AIConfig {
    const env = import.meta.env;

    // Helper to ensure endpoint ends with /chat/completions
    const normalizeEndpoint = (url: string | undefined, defaultUrl: string) => {
        if (!url) return defaultUrl;
        if (url.includes('/chat/completions')) return url;
        const base = url.endsWith('/') ? url.slice(0, -1) : url;
        return `${base}/chat/completions`;
    };

    let apiKey = '';
    let endpoint = '';
    let model = '';

    switch (provider) {
        case 'deepseek':
            apiKey = overrides?.apiKey || env.VITE_DEEPSEEK_API_KEY || '';
            endpoint = normalizeEndpoint(env.VITE_DEEPSEEK_ENDPOINT, 'https://api.deepseek.com/chat/completions');
            model = overrides?.model || env.VITE_DEEPSEEK_MODEL || 'deepseek-chat';
            break;
        case 'gemini':
            apiKey = overrides?.apiKey || env.VITE_GEMINI_API_KEY || '';
            endpoint = normalizeEndpoint(env.VITE_GEMINI_ENDPOINT, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
            model = overrides?.model || env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
            break;
        case 'qwen':
            apiKey = overrides?.apiKey || env.VITE_ALI_API_KEY || env.VITE_QWEN_API_KEY || '';
            endpoint = normalizeEndpoint(env.VITE_ALI_ENDPOINT || env.VITE_QWEN_ENDPOINT, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
            model = overrides?.model || env.VITE_ALI_MODEL || env.VITE_QWEN_MODEL || 'qwen-plus';
            break;
        case 'bytedance':
            apiKey = overrides?.apiKey || env.VITE_DOUBAO_API_KEY || env.VITE_BYTEDANCE_API_KEY || '';
            endpoint = normalizeEndpoint(env.VITE_DOUBAO_ENDPOINT || env.VITE_BYTEDANCE_ENDPOINT, 'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
            model = overrides?.model || env.VITE_DOUBAO_MODEL || env.VITE_BYTEDANCE_MODEL || 'doubao-pro-4k';
            break;
        case 'depocr':
            apiKey = overrides?.apiKey || env.VITE_DEPOCR_API_KEY || '';
            endpoint = normalizeEndpoint(env.VITE_DEPOCR_ENDPOINT, 'https://api.openai.com/v1/chat/completions');
            model = overrides?.model || env.VITE_DEPOCR_MODEL || 'DeepSeek-OCR-Free';
            break;
        case 'anythingllm':
            apiKey = overrides?.apiKey || env.VITE_ANYTHINGLLM_API_KEY || '';
            endpoint = normalizeEndpoint(env.VITE_ANYTHINGLLM_ENDPOINT, 'https://ycoffice.tail36f59d.ts.net/api/v1/openai/chat/completions');
            model = overrides?.model || env.VITE_ANYTHINGLLM_MODEL || 'inf_work';
            break;
        default: // openai
            apiKey = overrides?.apiKey || env.VITE_OPENAI_API_KEY || '';
            endpoint = normalizeEndpoint(env.VITE_OPENAI_ENDPOINT, 'https://api.openai.com/v1/chat/completions');
            model = overrides?.model || env.VITE_OPENAI_MODEL || 'gpt-4o';
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

    const timer = window.setTimeout(() => {
        const error = new Error(`请求超时 (60秒)，请检查网络或尝试简化要求。`);
        error.name = 'TimeoutError';
        controller.abort(error);
    }, timeoutMs);
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
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<AIResponse> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return { success: false, error: `未配置 ${provider} 的 API Key，请在“系统设置”中填写。` };

    try {
        const text = await callChatCompletion(history, config, undefined);
        if (!text) return { success: false, error: "AI 响应为空，请重试。" };
        return { success: true, data: text };
    } catch (e) {
        const msg = getErrorMessage(e);
        if (msg.includes('AbortError')) return { success: false, error: '请求超时，请稍后重试或切换模型。' };
        return { success: false, error: msg || "网络错误" };
    }
}

export async function generateText(prompt: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<string> {
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
    finalPair?: 'in/ing' | 'en/eng';
    optionFinals?: { A?: string; B?: string };
    correctFinal?: string;
}

export async function generateQuiz(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string },
    options?: { preferPair?: 'in/ing' | 'en/eng'; preferWords?: string[] }
): Promise<Quiz[]> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return [];

    const preferPair = options?.preferPair;
    const preferWords = Array.isArray(options?.preferWords) ? options?.preferWords.filter(w => typeof w === 'string' && w.trim()) : [];

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
                    "correct": "B",
                    "finalPair": "in/ing 或 en/eng（必填）",
                    "optionFinals": { "A": "in/ing/en/eng 之一（必填）", "B": "in/ing/en/eng 之一（必填）" },
                    "correctFinal": "in/ing/en/eng 之一（必填）"
                }
            ]
            注意：返回纯JSON array.`
        },
        {
            role: "user",
            content: `请分析以下文本并生成拼音辨析题。
优先考察：${preferPair ?? '自动'}
优先覆盖这些常错词（若文本中出现则尽量出题）：${preferWords.length ? JSON.stringify(preferWords) : '无'}
文本：
${text}`
        }
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

export async function generatePinyinQuiz(
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string },
    options?: { preferPair?: 'in/ing' | 'en/eng'; preferWords?: string[] }
): Promise<Quiz[]> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return [];

    const preferPair = options?.preferPair;
    const preferWords = Array.isArray(options?.preferWords) ? options?.preferWords.filter(w => typeof w === 'string' && w.trim()) : [];

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
                    "note": "‘深化’中的‘深’是前鼻音。",
                    "finalPair": "in/ing 或 en/eng（必填）",
                    "optionFinals": { "A": "in/ing/en/eng 之一（必填）", "B": "in/ing/en/eng 之一（必填）" },
                    "correctFinal": "in/ing/en/eng 之一（必填）"
                }
            ]`
        },
        {
            role: "user",
            content: `请生成一组前后鼻音辨析题。
优先考察：${preferPair ?? '自动'}
优先覆盖这些常错词（若合理则尽量融入）：${preferWords.length ? JSON.stringify(preferWords) : '无'}`
        }
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

export interface SmartWeek1Training {
    article: string;
    guidance: string;
    quizzes: Quiz[];
}

export async function generateSmartWeek1Training(
    input: {
        preferPair?: 'in/ing' | 'en/eng';
        preferWords?: string[];
        styleReference?: string;
    },
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<SmartWeek1Training | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) {
        throw new Error(`未配置 ${provider} 的 API Key，请在“系统设置”中填写。`);
    }

    const preferPair = input.preferPair;
    const preferWords = Array.isArray(input.preferWords) ? input.preferWords.filter(w => typeof w === 'string' && w.trim()) : [];
    const styleReference = typeof input.styleReference === 'string' ? input.styleReference.trim() : '';

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是汉语拼音训练设计师，专注前后鼻音(in/ing, en/eng)辨析。生成一个JSON对象，包含三个字段：
- article：120字左右的公文风格短段落，自然融入 in/ing 和 en/eng 词汇。
- guidance：1句话说明本次训练重点。
- quizzes：4个前后鼻音辨析题数组。

每道题格式：{"word":"词语","focus":"易混字","options":{"A":"正确拼音(前/后)","B":"错误拼音(前/后)"},"correct":"A或B","finalPair":"in/ing或en/eng","optionFinals":{"A":"in/ing/en/eng","B":"in/ing/en/eng"},"correctFinal":"in/ing/en/eng"}

注意：只用 in/ing/en/eng 韵母，禁止 an/ang，词语必须是常见公文词语，只返回JSON对象。`
        },
        {
            role: "user",
            content: `重点考察：${preferPair ?? 'in/ing和en/eng各半'}
常错词（尽量覆盖）：${preferWords.length ? preferWords.join('、') : '无'}
风格参考：${styleReference ? styleReference.slice(0, 500) : '无'}`
        }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        if (!content) throw new Error("AI 返回了空消息，请重试。");

        const parsed = safeJsonParse<SmartWeek1Training>(content);
        if (!parsed) {
            console.error("【AI 数据解析失败】请检查 F12 控制台原始输出:", content);
            throw new Error("AI 响应格式不完整或非合法 JSON，请重试。");
        }

        if (!parsed.article || !Array.isArray(parsed.quizzes) || parsed.quizzes.length === 0) {
            console.warn("【AI 字段缺失】", parsed);
            throw new Error("AI 生成的文章或题目数据缺失。");
        }

        return parsed;
    } catch (e) {
        if (e instanceof Error) throw e;
        throw new Error(String(e));
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

export async function analyzeAndGeneratePractice(article: string, focusWords: string[], provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<SmartLesson | null> {
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

export async function polishText(text: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<PolishedText | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个精通公文写作与纠错的文字专家。请对用户提供的段落进行“体检式”润色。你的首要任务是：
1. **纠正错别字与标点符号**：发现并修正所有错别字、用词不当、标点符号使用错误。
2. **修正语法与成分**：修复病句、成分残缺、指代不明等语法问题。
3. **优化逻辑连贯性**：确保句子之间逻辑紧密，转承自然。
4. **提升专业风格**：在保证准确的基础，将语体调整为专业、克制、严谨的“工信部及政府公文风格”。

请返回严格的 JSON 格式（不要输出全文本，仅输出修改点，以极大提升速度）：
{
  "original": "原始文本片段（可选，若太长可忽略）",
  "changes": [
    {
      "original_word": "修改前的片段",
      "polished_word": "修改后的片段",
      "rationale": "修改理由，如：修正错别字、语法纠错、提升专业度等"
    }
  ],
  "overall_comment": "总体评价，涵盖文章优缺点及改进重点"
}`
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

export async function generateScenarioPractice(word: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<ScenarioPractice | null> {
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

export async function generateUsagePractice(word: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<ScenarioPractice | null> {
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

export async function generateStructurePractice(topic: string, structure: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<StructurePractice | null> {
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

export interface FranklinFeedback {
    standard_version: string;
    score: number;
    diff_analysis: string;
    key_improvements: string[];
}

export async function generateFranklinFeedback(
    topic: string,
    structure_template: string,
    user_draft: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<FranklinFeedback | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一位精通“富兰克林写作法”的公文写作教练。该方法的核是：模仿、对比、反馈。
请执行以下任务：
1. **生成标杆**：根据用户提供的“主题”和“句式模板”，撰写一个高质量、标准的公文句子（标杆范文）。
2. **对比分析**：将用户的“仿写初稿”与你生成的“标杆范文”进行对比。
3. **评价反馈**：
   - 打分（0-100分）。
   - 差距分析（Diff Analysis）：指出用户在词汇选用、逻辑递进、气势营造上与标杆的差距。
   - 改进建议（Key Improvements）：列出3个具体的修改建议。

返回严谨的JSON格式：
{
    "standard_version": "...",
    "score": 85,
    "diff_analysis": "...",
    "key_improvements": ["...", "...", "..."]
}`
        },
        {
            role: "user",
            content: `
主题：${topic}
句式模板：${structure_template}
用户的仿写初稿：${user_draft}`
        }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<FranklinFeedback>(content) : null;
    } catch { return null; }
}

export interface LogicExpansion {
    original: string;
    expanded: string;
    logic_mode: string;
    breakdown: string;
}

export async function expandLogic(point: string, mode: string, instruction?: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<LogicExpansion | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `公文写作教练，擅长逻辑扩写。
返回JSON: { "original": "...", "expanded": "...", "logic_mode": "...", "breakdown": "..." }`
        },
        { role: "user", content: `核心观点：${point}\n逻辑模式：${mode}\n${instruction ? `具体指导要求：${instruction}` : ''}` }
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

export async function generateOutline(theme: string, type: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<OutlineResult | null> {
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

export async function generateArticle(topic: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<string | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        { role: "system", content: "撰写约150字优美公文段落。" },
        { role: "user", content: `主题：${topic}` }
    ];
    return callChatCompletion(messages, config, undefined);
}

export async function extractStructureFromText(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<StructurePattern[]> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return [];

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个语言学专家和公文写作教练，擅长拆解文章中的修辞手法和句式结构。
请分析用户提供的文本，提取出其中具有“可复用性”的高价值句式（如：排比、递进、对仗、因果、对比等）。

请返回一个 JSON 数组，每个元素包含：
- id: 随机生成一个数字ID.
- name: 给这个句式起一个专业的名称（4-6字，如“层层递进式”）.
- template: 提炼出的句式骨架（用...代表变量内容）.
- description: 简要说明该句式的用法和修辞效果。
- difficulty: 难度等级 (1-5).

返回格式：
[
  {
    "id": 101,
    "name": "...",
    "template": "...",
    "description": "...",
    "difficulty": 3
  }
]
注意：请严格返回 JSON 数组。`
        },
        {
            role: "user",
            content: `文本内容：
${text.slice(0, 2000)}`
        }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        if (!content) return [];

        const parsed = safeJsonParse(content);
        if (Array.isArray(parsed)) return parsed as StructurePattern[];
        // Handle wrapped object case
        if (isObject(parsed) && Array.isArray((parsed as any).patterns)) return (parsed as any).patterns as StructurePattern[];

        return [];
    } catch {
        return [];
    }
}

export interface EvidenceCheckResult {
    original_text: string;
    claims: Array<{
        segment: string;
        issue: string; // 例如：“缺乏数据支撑”、“论断过于主观”
        suggestion: string; // 例如：“请补充具体的增长数据”、“建议引用权威报告”
    }>;
    overall_score: number; // 0-100 严谨度评分
}

export async function analyzeEvidence(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<EvidenceCheckResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个严谨的审稿人，专注于“基于证据的论证”（Evidence-Based Argumentation）。
请分析用户文本，找出那些“缺乏证据支撑”的断言（Claims）。
对于每个问题断言，请指出具体问题（如：数据缺失、来源不明、过于主观），并给出补充证据的建议（如：引用具体数据、文献、案例）。

请返回 JSON 格式：
{
  "original_text": "...",
  "claims": [
    { "segment": "原文中的具体句子...", "issue": "缺乏数据支撑", "suggestion": "补充具体的同比增长率数据" }
  ],
  "overall_score": 75 
}`
        },
        {
            role: "user",
            content: `请分析这段文本的论证严谨性：\n${text}`
        }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<EvidenceCheckResult>(content) : null;
    } catch {
        return null;
    }
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

export async function analyzeWinstonStar(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<WinstonStarResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个沟通专家，擅长使用“温斯顿之星”（Winston's Star）模型来提升沟通的吸引力。
请分析用户提供的文本，检查是否包含以下五个要素：
1. Slogan (口号/金句)：是否有一句朗朗上口的总结性语句？
2. Symbol (象征/符号)：是否有可视化的比喻或象征？
3. Salient (突出的核心点)：核心观点是否突出？
4. Surprise (惊奇/新知)：是否提供了反直觉的数据、新观点或令人惊讶的事实？
5. Story (故事/案例)：是否讲述了具体生动的故事或案例？

对于每个要素，判断是否存在，提取存在的内容，或给出改进建议。
返回 JSON 格式：
{
  "original_text": "...",
  "elements": {
    "slogan": { "present": false, "content": "", "suggestion": "建议提炼一句朗朗上口的各种..." },
    "symbol": { "present": true, "content": "把项目比作引擎", "suggestion": "" },
    ...
  },
  "overall_score": 60
}`
        },
        {
            role: "user",
            content: `请分析这段文本的吸引力：\n${text}`
        }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<WinstonStarResult>(content) : null;
    } catch {
        return null;
    }
}

export interface AuthenticityResult {
    original_text: string;
    score: number; // 0-100 (100 = Very Real/Authentic, 0 = Full of Jargon/BS)
    issues: Array<{
        segment: string;
        type: 'cliche' | 'jargon' | 'empty'; // 陈词滥调 | 堆砌行话 | 空洞废话
        suggestion: string;
    }>;
    comment: string;
}

export async function checkAuthenticity(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<AuthenticityResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个“废话探测器”和“真实性”捍卫者，类似于 MIT 教授强调的 "True! True! True!"。
请检查用户文本，找出那些“假大空”、陈词滥调、为了显得专业而堆砌的行话（Jargon）或空洞的废话。
你需要严厉地指出这些问题，并建议更朴实、更具体、更真诚的表达方式。

返回 JSON 格式：
{
  "original_text": "...",
  "score": 40, // 分数越低表示废话越多
  "issues": [
    { "segment": "协同范式转移", "type": "jargon", "suggestion": "直接说‘一起改变做事情的方法’" },
    { "segment": "狠抓落实", "type": "cliche", "suggestion": "具体说‘制定了每周检查制度’" }
  ],
  "comment": "整段话充满了正确的废话，没有信息量。"
}`
        },
        {
            role: "user",
            content: `请检测这段话的“含真率”（真实性）：\n${text}`
        }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<AuthenticityResult>(content) : null;
    } catch {
        return null;
    }
}
export async function chatWithDocument(
    history: ChatMessage[],
    documentContext: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<AIResponse> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return { success: false, error: `未配置 ${provider} 的 API Key，请在“系统设置”中填写。` };

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个专业的公文写作助手。以下是用户正在编辑的文档内容：
---
${documentContext.slice(0, 10000)}
---
请基于以上文档内容回答用户的问题。如果问题与文档无关，请委婉告知并尝试提供通用的公文写作建议。回复请保持专业、严谨且富有建设性。

**来源标注规则（必须遵守）**：
- 当你引用、推荐句子或词语时，如果内容来自知识库中的具体文件，请在引用后标注来源文件名，格式为：——出自《文件名》
- 如果内容不来自任何具体文件（即你基于通用知识生成的），请标注：——依据人工智能整理
- 每条推荐的句子或词语都要有来源标注，紧跟在内容之后`
        },
        ...history
    ];

    try {
        const text = await callChatCompletion(messages, config, undefined);
        if (!text) return { success: false, error: "AI 返回了空消息。" };
        return { success: true, data: text };
    } catch (e) {
        const msg = getErrorMessage(e);
        if (msg.includes('AbortError')) return { success: false, error: '请求超时，请稍后重试。' };
        return { success: false, error: msg || "连接 AI 服务失败。" };
    }
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

export async function deepAuditDocument(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<AuditResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages: ChatMessage[] = [
        {
            role: "system",
            content: `你是一个极其严苛且专业的公文审计专家。请从以下五个维度对文本进行深度诊断并打分：
1. **逻辑结构 (Logic)**：核心观点是否突出，论证是否严密。
2. **格式规范 (Format)**：是否符合政府公文行文习惯与排版逻辑。
3. **用词精准 (Wording)**：是否存在错别字、口语化表达、用词不当。
4. **简洁度 (Brevity)**：是否存在冗余内容或废话。
5. **严谨性 (Accuracy)**：语法是否正确，事实描述是否准确。

请返回严格的 JSON 格式（其中 suggestions 需给出具体的修改点）：
{
  "score": 总体分值,
  "dimensions": {
    "logic": { "score": 80, "comment": "..." },
    "format": { "score": 90, "comment": "..." },
    "wording": { "score": 85, "comment": "..." },
    "brevity": { "score": 85, "comment": "..." },
    "accuracy": { "score": 85, "comment": "..." }
  },
  "overall_comment": "总评...",
  "suggestions": ["发现错别字'X'，应为'Y'", "第二段逻辑跳跃，建议增加过渡", "语法错误：'...'成分残缺"]
}`
        },
        { role: "user", content: `请审计以下公文：\n${text}` }
    ];

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<AuditResult>(content) : null;
    } catch { return null; }
}


export interface AssociativeSentence {
    text: string;       // 完整句子，含【关键词】标记
    keywords: string[]; // 从 text 中提取的关键词，供单独点击插入
}

export interface AssociativeSuggestion {
    directions: string[];
    sentences: AssociativeSentence[];
}

// 解析可能带有 【词】 标记的句子（兼容纯字符串旧格式）
function normalizeAssociativeSentence(raw: unknown): AssociativeSentence | null {
    if (typeof raw === 'string') {
        const keywords = [...raw.matchAll(/【([^】]+)】/g)].map(m => m[1]);
        return { text: raw, keywords };
    }
    if (isObject(raw) && typeof raw.text === 'string') {
        const keywords = Array.isArray(raw.keywords)
            ? raw.keywords.filter((k): k is string => typeof k === 'string')
            : [...raw.text.matchAll(/【([^】]+)】/g)].map(m => m[1]);
        return { text: raw.text, keywords };
    }
    return null;
}

function normalizeAssociativeResult(raw: unknown): AssociativeSuggestion | null {
    if (!isObject(raw)) return null;
    const directions = Array.isArray(raw.directions)
        ? raw.directions.filter((d): d is string => typeof d === 'string')
        : [];
    const sentencesRaw = Array.isArray(raw.sentences) ? raw.sentences : [];
    const sentences = sentencesRaw.map(normalizeAssociativeSentence).filter((s): s is AssociativeSentence => s !== null);
    if (directions.length === 0 && sentences.length === 0) return null;
    return { directions, sentences };
}

// 构建联想灵感 prompt（可选：是否包含 directions）
function buildAssociativeMessages(textContext: string, includeDirections: boolean, sentenceCount: number): ChatMessage[] {
    const snippet = textContext.slice(-800);
    const systemContent = includeDirections
        ? `你是公文写作助手，结合知识库帮助用户在写作卡壳时继续下去。

**第一步：提取核心词汇**
从用户当前内容中提取 1-3 个核心名词或名词短语作为写作锚点。注意：提取的是名词概念而非动词。例如用户写"完成高质量数据集建设"，核心词是"高质量数据集"而非"完成"或"建设"。

**第二步：生成结果**
返回JSON对象，包含两个字段：

directions：2-3条接下来可以写的方向，每条不超过20字，围绕核心词汇展开。

sentences：${sentenceCount}条围绕核心词汇的公文句子，要求：
- 每条句子必须围绕第一步提取的核心名词展开，确保主题聚焦不跑偏
- 句子须符合公文行文规范：语体庄重、逻辑严密、表述精练
- 优先参考知识库中的相关表述和用法，使句子贴近实际业务场景
- 每条句子中把 1-2 个高级词汇或核心表达用【】标注，例如：在推进【数字化转型】的过程中，要【统筹兼顾】多方诉求
- 【】内的词要有学习价值（四字成语、专业术语、高频公文词组优先）
- 每条 sentences 元素格式：{"text": "含【词】的句子", "keywords": ["词1", "词2"]}

只返回JSON，格式：
{"directions": ["方向1", "方向2"], "sentences": [{"text": "...", "keywords": [...]}, ...]}\``
        : `你是公文写作助手。结合知识库，根据用户当前内容生成${sentenceCount}条公文句子。

**关键规则**：先从用户内容中识别核心名词概念（如"高质量数据集"、"数字化转型"），所有句子必须围绕这些核心名词展开。

要求：
- 每条句子围绕用户的核心名词概念，主题聚焦，不泛泛而谈
- 句子符合公文行文规范，语体庄重、逻辑严密、表述精练
- 优先参考知识库中的相关表述，贴近实际业务场景
- 每条把 1-2 个高级词汇用【】标注，例如：坚持【问题导向】，持续深化【改革攻坚】
- 每条格式：{"text": "含【词】的句子", "keywords": ["词1", "词2"]}

只返回JSON，格式：{"sentences": [{"text": "...", "keywords": [...]}, ...]}\``;

    return [
        { role: "system", content: systemContent },
        { role: "user", content: `当前写作内容：\n\n${snippet}` }
    ];
}

export async function generateAssociativeSuggestions(
    textContext: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'anythingllm',
    overrides?: { apiKey?: string; endpoint?: string; model?: string },
    onPartialResult?: (partial: AssociativeSuggestion) => void
): Promise<AssociativeSuggestion | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey) && provider !== 'anythingllm') return null;

    // 请求 A：优先，包含 directions + 前 7 条句子
    const messagesA = buildAssociativeMessages(textContext, true, 7);
    // 请求 B：后台，仅 8 条补充句子（prompt 更短，更快）
    const messagesB = buildAssociativeMessages(textContext, false, 8);

    // 同时发出两个请求
    const promiseA = callChatCompletion(messagesA, config, { type: "json_object" }).catch(() => null);
    const promiseB = callChatCompletion(messagesB, config, { type: "json_object" }).catch(() => null);

    const isKbFallback = (content: string | null) =>
        content?.includes("There is no relevant information") ||
        content?.includes("未能在当前专属文献库中完全匹配");

    // A 先到先渲染
    const contentA = await promiseA;
    if (isKbFallback(contentA)) {
        return {
            directions: ["未能在当前专属文献库中检索到完全匹配的业务内容。"],
            sentences: [{ text: "（本地知识库中暂无相关指导文本，请继续书写并触发联想）", keywords: [] }]
        };
    }

    const resultA = normalizeAssociativeResult(safeJsonParse(contentA ?? ''));
    if (resultA && onPartialResult) {
        onPartialResult(resultA); // 立即回调，让 UI 先渲染前 7 条
    }

    // B 后续追加
    const contentB = await promiseB;
    const resultB = isKbFallback(contentB) ? null : normalizeAssociativeResult(safeJsonParse(contentB ?? ''));

    // 合并两批结果
    const finalDirections = resultA?.directions ?? [];
    const sentencesA = resultA?.sentences ?? [];
    const sentencesB = resultB?.sentences ?? [];
    const allSentences = [...sentencesA, ...sentencesB];

    if (allSentences.length === 0 && finalDirections.length === 0) return null;
    return { directions: finalDirections, sentences: allSentences };
}
