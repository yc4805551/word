import type { StructurePattern } from '../data/week3-data';
import { 
    type AIConfig, 
    type ChatMessage, 
    type AIResponse,
    type PolishedText,
    type AuditResult,
    type AuthenticityResult,
    type AssociativeSuggestion,
    type AssociativeSentence,
    type Quiz,
    type LogicExpansion,
    type OutlineResult,
    type ScenarioPractice,
    type StructurePractice,
    type FranklinFeedback,
    type EvidenceCheckResult,
    type WinstonStarResult,
    type SmartWeek1Training,
    type SmartLesson,
    type ContextualPractice
} from './ai-types';
export * from './ai-types';
import { PROMPTS } from './prompts';
import { TRAINING_PROMPTS } from './training-prompts';
import { COMPLETION_PROMPTS } from './completion-prompts';

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
        const error = new Error(`请求超时 (90秒)，大模型响应缓慢请耐心等待或重试。`);
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
    let trimmed = text.trim();
    if (!trimmed) return null;

    // 清除可能存在的 DeepSeek/Qwen 思考过程
    trimmed = trimmed.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();

    const fenceMatch = trimmed.match(/```(?:json)?\s*([\s\S]*?)```/i);
    if (fenceMatch?.[1]) return fenceMatch[1].trim();

    const firstBrace = trimmed.search(/[{[]/);
    const lastBrace = Math.max(trimmed.lastIndexOf('}'), trimmed.lastIndexOf(']'));
    if (firstBrace === -1 || lastBrace === -1 || lastBrace < firstBrace) return null;
    
    const candidate = trimmed.slice(firstBrace, lastBrace + 1).trim();
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
    schema?: unknown,
    temperature: number = 0.7
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
            generationConfig: { temperature: temperature }
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
        }, 90_000);

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
            temperature: temperature,
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
        }, 90_000);

        if (!response.ok) {
            const errText = await response.text();
            throw buildHttpError(response.status, response.statusText, errText);
        }

        const data = await response.json();
        return data.choices?.[0]?.message?.content || null;
    }
}

// --- EXPORTED FUNCTIONS USING HELPER ---

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
        const messages = TRAINING_PROMPTS.generateText(prompt);

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

    const messages = TRAINING_PROMPTS.quiz(text, preferPair, preferWords);


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

    const messages = TRAINING_PROMPTS.pinyinQuiz(preferPair, preferWords);

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

    const messages = TRAINING_PROMPTS.smartWeek1(preferPair ?? 'in/ing和en/eng各半', preferWords, styleReference);

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




export async function analyzeAndGeneratePractice(article: string, focusWords: string[], provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<SmartLesson | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.practice(article, focusWords);

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



export async function generateContextualPractice(colloquial: string, official: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai'): Promise<ContextualPractice | null> {
    const config = getAIConfig(provider);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.contextualPractice(colloquial, official);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<ContextualPractice>(content) : null;
    } catch { return null; }
}



export async function polishText(text: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<PolishedText | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = PROMPTS.polish(text);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<PolishedText>(content) : null;
    } catch { return null; }
}



export async function generateScenarioPractice(word: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<ScenarioPractice | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.scenario(word);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<ScenarioPractice>(content) : null;
    } catch { return null; }
}

export async function generateUsagePractice(word: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<ScenarioPractice | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.usage(word);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<ScenarioPractice>(content) : null;
    } catch { return null; }
}



export async function generateStructurePractice(topic: string, structure: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<StructurePractice | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.structure(topic, structure);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<StructurePractice>(content) : null;
    } catch { return null; }
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

    const messages = TRAINING_PROMPTS.franklin(topic, structure_template, user_draft);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<FranklinFeedback>(content) : null;
    } catch { return null; }
}



export async function expandLogic(point: string, mode: string, instruction?: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<LogicExpansion | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.logicExpansion(point, mode, instruction);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<LogicExpansion>(content) : null;
    } catch { return null; }
}



export async function generateOutline(theme: string, type: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<OutlineResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.outline(theme, type);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<OutlineResult>(content) : null;
    } catch { return null; }
}

export async function generateArticle(topic: string, provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai', overrides?: { apiKey?: string; endpoint?: string; model?: string }): Promise<string | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.articleSummary(topic);
    return callChatCompletion(messages, config, undefined);
}

export async function extractStructureFromText(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<StructurePattern[]> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return [];

    const messages = TRAINING_PROMPTS.extractStructure(text);

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



export async function analyzeEvidence(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<EvidenceCheckResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.evidenceAnalysis(text);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<EvidenceCheckResult>(content) : null;
    } catch {
        return null;
    }
}



export async function analyzeWinstonStar(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<WinstonStarResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.winstonStar(text);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<WinstonStarResult>(content) : null;
    } catch {
        return null;
    }
}



export async function checkAuthenticity(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<AuthenticityResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.authenticity(text);

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

    const messages = PROMPTS.docChat(documentContext, history);

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



export async function deepAuditDocument(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<AuditResult | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.audit(text);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<AuditResult>(content) : null;
    } catch { return null; }
}




// 解析可能带有 【词】 标记的句子（兼容纯字符串旧格式）
function normalizeAssociativeSentence(raw: unknown): AssociativeSentence | null {
    if (typeof raw === 'string') {
        const keywords = [...raw.matchAll(/【([^】]+)】/g)].map(m => m[1]);
        return { text: raw, keywords };
    }
    if (isObject(raw) && typeof raw.text === 'string') {
        let text = raw.text;
        const keywords = Array.isArray(raw.keywords)
            ? raw.keywords.filter((k): k is string => typeof k === 'string')
            : [...text.matchAll(/【([^】]+)】/g)].map(m => m[1]);
            
        // 动态补全大模型漏加的【】标记
        if (keywords.length > 0) {
            keywords.forEach(kw => {
                if (!text.includes(`【${kw}】`) && text.includes(kw)) {
                    text = text.replace(kw, `【${kw}】`);
                }
            });
        }
        return { text, keywords };
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
    const longContext = textContext.slice(-800);
    const shortQuery = textContext.slice(-60).trim() || "公文";
    return PROMPTS.associative(longContext, shortQuery, includeDirections, sentenceCount);
}

export async function generateAssociativeSuggestions(
    textContext: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'anythingllm',
    overrides?: { apiKey?: string; endpoint?: string; model?: string },
    onPartialResult?: (partial: AssociativeSuggestion) => void
): Promise<AssociativeSuggestion | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey) && provider !== 'anythingllm') return null;

    // 请求 A：优先，包含 directions + 前 10 条句子
    const messagesA = buildAssociativeMessages(textContext, true, 10);
    // 请求 B：后台，仅 10 条补充句子
    const messagesB = buildAssociativeMessages(textContext, false, 10);

    // 为了保护本地私有模型AnythingLLM不会被瞬发的并发请求撑崩或触发CORS并发风暴，我们改为串行执行，同时移除可能导致底层拒收的严格 json_object 参数
    const contentA = await callChatCompletion(messagesA, config, undefined, 0.1).catch((e) => { console.error("API Error A:", e.message); return null; });
    const promiseB = callChatCompletion(messagesB, config, undefined, 0.1).catch((e) => { console.error("API Error B:", e.message); return null; });

    const isKbFallback = (content: string | null) =>
        content?.includes("There is no relevant information") ||
        content?.includes("未能在当前专属文献库中完全匹配");

    // A 先到先渲染（由于改为了串行，此时contentA已经获取完毕）
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

/**
 * 智能写作补全 (generateCompletion) — 快速画布「AI 补全」
 * 基于 AnythingLLM 知识库，为光标前文生成内联续写建议
 */
export async function generateCompletion(
    precedingText: string,
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<string | null> {
    const config = getAIConfig('anythingllm', overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = COMPLETION_PROMPTS.complete(precedingText);

    try {
        // 低温度保证续写的确定性，超时3秒则放弃（避免阻塞光标）
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 8000);
        const content = await callChatCompletion(messages, config, undefined, 0.2)
            .finally(() => window.clearTimeout(timer));
        if (!content) return null;

        // 去除引号、书名号、空白
        const cleaned = content
            .trim()
            .replace(/^["'\u201c\u300c\u300e]|["'\u201d\u300d\u300f]$/g, '')
            .trim();
        return cleaned.length > 0 ? cleaned : null;
    } catch {
        return null;
    }
}
