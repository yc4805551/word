import type { StructurePattern } from '../data/week3-data';
import {
    type AIConfig,
    type ChatMessage,
    type AIResponse,
    type PolishedText,
    type AuditResult,
    type AuthenticityResult,
    type AssociativeSuggestion,
    type AssociativeSuggestionsResult,
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
    type ContextualPractice,
    type SentenceFeedback
} from './ai-types';
export * from './ai-types';
import { PROMPTS } from './智能画布-提示词';
import { TRAINING_PROMPTS } from './特训营-提示词';
import { COMPLETION_PROMPTS } from './智能补全-提示词';
import knowledgeBase from '../data/knowledge-base.json';
import { fetchKwikiAssociations, isKwikiApiConfigured, KwikiAssociationError } from './kwikiAssociations';

export function getAIConfig(
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): AIConfig {
    const env = import.meta.env;

    // Helper to ensure endpoint ends with /chat/completions
    const normalizeEndpoint = (url: string | undefined, defaultUrl: string, skipAppend: boolean = false) => {
        if (!url) return defaultUrl;
        // 清除非 ASCII 字符，防止 fetch URL 编码报错
        const cleaned = url.replace(/[^\x20-\x7E]/g, '');
        // 如果 URL 已经包含完整路径（以 /chat/completions 或 /api/ 结尾），则不拼接
        if (cleaned.includes('/chat/completions') || cleaned.includes('/api/') || skipAppend) return cleaned;
        const base = cleaned.endsWith('/') ? cleaned.slice(0, -1) : cleaned;
        return `${base}/chat/completions`;
    };

    let apiKey = '';
    let endpoint = '';
    let model = '';

    // 安全约束：apiKey 只能来自调用方传入的 overrides（即用户在“系统设置”里填的
    // localStorage 值）。严禁回退到 import.meta.env.VITE_*_API_KEY——Vite 会把
    // VITE_* 明文内联进前端 bundle，公开站点可直接读取，等同密钥泄露。
    switch (provider) {
        case 'deepseek':
            apiKey = overrides?.apiKey || '';
            endpoint = normalizeEndpoint(overrides?.endpoint || env.VITE_DEEPSEEK_ENDPOINT, 'https://api.deepseek.com/chat/completions');
            model = overrides?.model || env.VITE_DEEPSEEK_MODEL || 'deepseek-chat';
            break;
        case 'gemini':
            apiKey = overrides?.apiKey || '';
            endpoint = normalizeEndpoint(overrides?.endpoint || env.VITE_GEMINI_ENDPOINT, 'https://generativelanguage.googleapis.com/v1beta/openai/chat/completions');
            model = overrides?.model || env.VITE_GEMINI_MODEL || 'gemini-1.5-flash';
            break;
        case 'qwen':
            apiKey = overrides?.apiKey || '';
            endpoint = normalizeEndpoint(overrides?.endpoint || env.VITE_ALI_ENDPOINT || env.VITE_QWEN_ENDPOINT, 'https://dashscope.aliyuncs.com/compatible-mode/v1/chat/completions');
            model = overrides?.model || env.VITE_ALI_MODEL || env.VITE_QWEN_MODEL || 'qwen-plus';
            break;
        case 'bytedance':
            apiKey = overrides?.apiKey || '';
            endpoint = normalizeEndpoint(overrides?.endpoint || env.VITE_DOUBAO_ENDPOINT || env.VITE_BYTEDANCE_ENDPOINT, 'https://ark.cn-beijing.volces.com/api/v3/chat/completions');
            model = overrides?.model || env.VITE_DOUBAO_MODEL || env.VITE_BYTEDANCE_MODEL || 'doubao-pro-4k';
            break;
        case 'depocr':
            apiKey = overrides?.apiKey || '';
            // depocr 允许自定义完整 URL（不自动拼接 /chat/completions）
            endpoint = normalizeEndpoint(overrides?.endpoint || env.VITE_DEPOCR_ENDPOINT, 'https://api.openai.com/v1/chat/completions', true);
            model = overrides?.model || env.VITE_DEPOCR_MODEL || 'DeepSeek-OCR-Free';
            break;
        case 'anythingllm':
            apiKey = overrides?.apiKey || '';
            endpoint = normalizeEndpoint(overrides?.endpoint || env.VITE_ANYTHINGLLM_ENDPOINT, 'https://ycoffice.tail36f59d.ts.net/api/v1/openai/chat/completions');
            model = overrides?.model || env.VITE_ANYTHINGLLM_MODEL || 'inf_work';
            break;
        default: // openai
            apiKey = overrides?.apiKey || '';
            endpoint = normalizeEndpoint(overrides?.endpoint || env.VITE_OPENAI_ENDPOINT, 'https://api.openai.com/v1/chat/completions');
            model = overrides?.model || env.VITE_OPENAI_MODEL || 'gpt-4o';
    }

    // 清除 apiKey 和 endpoint 中可能的非 ASCII 字符，防止 fetch header 编码报错
    apiKey = apiKey.replace(/[^\x20-\x7E]/g, '').trim();

    return { apiKey, endpoint, model };
}

function getErrorMessage(err: unknown) {
    if (err instanceof Error) return err.message;
    if (typeof err === 'string') return err;
    try { return JSON.stringify(err); } catch { return '未知错误'; }
}

function normalizeApiKey(key: unknown) {
    if (typeof key !== 'string') return '';
    // 二次保险：getAIConfig 已做清洗，此处再兜底
    return key.replace(/[^\x20-\x7E]/g, '').trim();
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

function stripThinking(text: string | null): string | null {
    if (!text) return text;
    return text.replace(/<think>[\s\S]*?<\/think>/gi, '').trim();
}

function extractJsonCandidate(text: string) {
    let trimmed = text.trim();
    if (!trimmed) return null;

    // 清除可能存在的 DeepSeek/Qwen 思考过程
    trimmed = stripThinking(trimmed) || '';

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

// ==================== 段落级缓存（增量审查） ====================
const POLISH_CACHE_PREFIX = 'polish_cache_v1:';
const POLISH_CACHE_MAX = 200; // 最多缓存 200 条，避免 localStorage 爆满

/** 简单字符串哈希（djb2），用于生成缓存 key */
function hashString(str: string): string {
    let hash = 5381;
    for (let i = 0; i < str.length; i++) {
        hash = ((hash << 5) + hash) + str.charCodeAt(i);
        hash |= 0;
    }
    return (hash >>> 0).toString(36);
}

function getPolishCacheKey(text: string, provider: string, model: string): string {
    return `${POLISH_CACHE_PREFIX}${provider}:${model}:${hashString(text)}`;
}

function getPolishCache(text: string, provider: string, model: string): PolishedText | null {
    try {
        const key = getPolishCacheKey(text, provider, model);
        const raw = localStorage.getItem(key);
        if (!raw) return null;
        return JSON.parse(raw) as PolishedText;
    } catch {
        return null;
    }
}

function setPolishCache(text: string, provider: string, model: string, result: PolishedText) {
    try {
        const key = getPolishCacheKey(text, provider, model);
        localStorage.setItem(key, JSON.stringify(result));
        // 简单淘汰：超过上限时清理最旧的（按 key 前缀扫描）
        const keys = Object.keys(localStorage).filter(k => k.startsWith(POLISH_CACHE_PREFIX));
        if (keys.length > POLISH_CACHE_MAX) {
            keys.slice(0, keys.length - POLISH_CACHE_MAX).forEach(k => localStorage.removeItem(k));
        }
    } catch {
        // localStorage 满或不可用，静默忽略
    }
}

// ==================== 流式调用（SSE） ====================
/**
 * 流式调用 OpenAI 兼容接口，逐 token 回调，返回完整文本。
 * 仅支持非 Gemini 提供方。
 */
async function callChatCompletionStream(
    messages: ChatMessage[],
    config: AIConfig,
    onDelta: (accText: string) => void,
    schema?: unknown,
    temperature: number = 0.7,
    maxTokens?: number
): Promise<string | null> {
    const payload: Record<string, unknown> = {
        model: config.model,
        messages: messages,
        temperature: temperature,
        stream: true,
    };
    if (schema) payload.response_format = schema;
    if (maxTokens) payload.max_tokens = maxTokens;

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

    const reader = response.body?.getReader();
    if (!reader) return null;

    const decoder = new TextDecoder('utf-8');
    let buffer = '';
    let fullText = '';

    // 解析 SSE 事件并累积 content
    const parseSSE = (raw: string) => {
        const events = raw.split('\n\n');
        for (const event of events) {
            const lines = event.split('\n');
            for (const line of lines) {
                const trimmed = line.trim();
                if (!trimmed.startsWith('data:')) continue;
                const dataStr = trimmed.slice(5).trim();
                if (dataStr === '[DONE]') continue;
                try {
                    const data = JSON.parse(dataStr);
                    const delta = data.choices?.[0]?.delta?.content;
                    if (typeof delta === 'string' && delta) {
                        fullText += delta;
                        onDelta(fullText);
                    }
                } catch {
                    // 忽略单条解析失败
                }
            }
        }
    };

    while (true) {
        const { done, value } = await reader.read();
        if (done) break;
        buffer += decoder.decode(value, { stream: true });

        // SSE 按空行分割事件，最后一段可能不完整，留到下次
        const events = buffer.split('\n\n');
        buffer = events.pop() || '';
        parseSSE(events.join('\n\n'));
    }

    // 流结束后处理缓冲区残余 + flush decoder
    buffer += decoder.decode();
    if (buffer) parseSSE(buffer);

    return stripThinking(fullText || null);
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
    temperature: number = 0.7,
    maxTokens?: number
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
            generationConfig: { temperature: number; response_mime_type?: string; maxOutputTokens?: number };
            system_instruction?: { parts: Array<{ text: string }> };
        } = {
            contents: geminiContents,
            generationConfig: { temperature: temperature }
        };

        if (maxTokens) {
            payload.generationConfig.maxOutputTokens = maxTokens;
        }

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
        return stripThinking(text || null);

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

        if (maxTokens) {
            payload.max_tokens = maxTokens;
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
        return stripThinking(data.choices?.[0]?.message?.content || null);
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

/**
 * 通用 JSON 生成：强制 AI 返回纯 JSON 对象
 * 用于结构化分析场景，避免复用 generateText（会被当作"生成公文范文"）
 */
export async function generateJSON<T = any>(
    userPrompt: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<T | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) throw new Error(`未配置 ${provider} 的 API Key，请在"系统设置"中填写。`);

    const messages: ChatMessage[] = [
        {
            role: 'system',
            content: '你是一个严格的 JSON 生成器。无论用户的 prompt 内容是什么，你都必须：\n1. 只输出一个合法的 JSON 对象，不要任何解释文字\n2. 不要用 ```json 代码块包裹\n3. 不要输出通知、公文、范文等任何自然语言内容\n4. 若无法完成分析，输出 {"error":"原因"}'
        },
        { role: 'user', content: userPrompt }
    ];

    try {
        // 使用 response_format: json_object 强制 JSON（OpenAI/Qwen/DeepSeek 支持）
        const content = await callChatCompletion(messages, config, { type: 'json_object' }, 0.3);
        if (!content) return null;
        return safeJsonParse<T>(content);
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



export async function polishText(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string },
    onDelta?: (accText: string) => void,
): Promise<PolishedText | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    // 增量审查：命中缓存直接返回，跳过 API 调用
    const cached = getPolishCache(text, provider, config.model);
    if (cached) {
        onDelta?.(JSON.stringify(cached));
        return cached;
    }

    const messages = PROMPTS.polish(text);
    const isGoogleHost = config.endpoint.includes('generativelanguage.googleapis.com');
    const temp = 0.3; // 审查场景用低温，保证结果稳定可复现

    try {
        let content: string | null;
        if (isGoogleHost) {
            // Gemini 原生 API 不走 SSE 流式
            content = await callChatCompletion(messages, config, { type: "json_object" }, temp);
        } else {
            content = await callChatCompletionStream(messages, config, (acc) => onDelta?.(acc), { type: "json_object" }, temp);
            // 流式失败或返回空时，回退非流式（兼容不支持 SSE 的端点）
            if (!content) {
                content = await callChatCompletion(messages, config, { type: "json_object" }, temp);
            }
        }
        const result = content ? safeJsonParse<PolishedText>(content) : null;
        if (result) setPolishCache(text, provider, config.model, result);
        return result;
    } catch { return null; }
}

/**
 * 将长文档按段落分块，并发调用模型审查，大幅缩短全文审查耗时。
 * 支持：段落级缓存（未变化段落跳过）、逐块流式结果回调。
 * @param text 全文
 * @param provider 模型提供方
 * @param overrides API 配置
 * @param onProgress 进度回调 (已完成数, 总数)
 * @param onPartialResult 逐块结果回调 (当前已合并的 changes)，用于 UI 渐进展示
 * @returns 合并后的审查结果
 */
export async function polishTextInParallel(
    text: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string },
    onProgress?: (done: number, total: number) => void,
    onPartialResult?: (changes: NonNullable<PolishedText['changes']>) => void,
): Promise<PolishedText | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const MAX_CHUNK_CHARS = 1500;
    const CONCURRENCY = 5;

    // 按段落（双换行）切分，再合并到接近 MAX_CHUNK_CHARS 的块
    const paragraphs = text.split(/\n{2,}/).map(p => p.trim()).filter(Boolean);
    const chunks: string[] = [];
    let current = '';
    for (const para of paragraphs) {
        if ((current + '\n\n' + para).length > MAX_CHUNK_CHARS && current) {
            chunks.push(current);
            current = para;
        } else {
            current = current ? `${current}\n\n${para}` : para;
        }
    }
    if (current) chunks.push(current);

    // 单块直接走原逻辑
    if (chunks.length <= 1) {
        onProgress?.(0, 1);
        const result = await polishText(text, provider, overrides);
        onProgress?.(1, 1);
        if (result?.changes) onPartialResult?.(result.changes);
        return result;
    }

    const total = chunks.length;
    let done = 0;

    // 受控并发池
    const allChanges: NonNullable<PolishedText['changes']> = [];
    const comments: string[] = [];
    let index = 0;

    async function worker() {
        while (index < chunks.length) {
            const i = index++;
            try {
                const result = await polishText(chunks[i], provider, overrides);
                if (result?.changes?.length) {
                    allChanges.push(...result.changes);
                    // 每完成一块就把当前累积的结果推给 UI
                    onPartialResult?.([...allChanges]);
                }
                if (result?.overall_comment) {
                    comments.push(result.overall_comment);
                }
            } catch {
                // 单块失败不影响整体
            } finally {
                done++;
                onProgress?.(done, total);
            }
        }
    }

    const workers = Array.from({ length: Math.min(CONCURRENCY, total) }, worker);
    await Promise.all(workers);

    return {
        original: text,
        polished: text,
        changes: allChanges,
        overall_comment: comments.length > 0 ? comments.join('\n') : '',
    };
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

/**
 * 从 AnythingLLM「求是杂志」工作区检索真实句子素材（RAG 检索增强生成）
 * 使用 OpenAI 兼容端点（/api/v1/openai/chat/completions），该端点走 validApiKey 中间件，
 * 与用户已配置的 API Key 认证方式一致，避免 /api/v1/workspace/ 端点的 JWT 403 问题。
 */
async function searchQiushiKnowledgeBase(
    query: string,
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<string | null> {
    const config = getAIConfig('anythingllm', overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const ragMessages: ChatMessage[] = [
        {
            role: 'system',
            content: '你是一个公文知识库检索助手。请从知识库中检索与用户查询相关的公文段落。只返回原文中的完整句子，每个句子单独一行，不要编造。如果没有相关内容，请回复"未检索到相关内容"。'
        },
        { role: 'user', content: query }
    ];

    try {
        const content = await callChatCompletion(ragMessages, config, undefined, 0.3);
        if (!content || content.includes('未检索到相关内容')) return null;

        console.log('[RAG] Retrieved from knowledge base:', content.slice(0, 200) + '...');
        return content;
    } catch (e) {
        console.warn('[RAG] Knowledge base search failed:', e);
        return null;
    }
}

export async function chatForSentenceGeneration(
    history: ChatMessage[],
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<AIResponse> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) {
        return { success: false, error: `未配置 ${provider} 的 API Key，请在"系统设置"中填写。` };
    }

    // 获取用户最新消息，判断是否需要触发 RAG 检索
    const lastUserMsg = [...history].reverse().find(m => m.role === 'user');
    const lastUserText = lastUserMsg?.content?.trim() || '';

    // 判断是否是“选择”指令（如“选1”）或者直接给的长句子
    const isSelectionReply = /^(选|我选|第|就|用|处理|转为|帮我).{0,5}[1-3一二三]/.test(lastUserText)
        || /^[1-3]$/.test(lastUserText);
    const isDirectSentence = lastUserText.length > 40;
    const isFirstRound = history.filter(m => m.role === 'assistant').length === 0;

    // 第一阶段：首轮主题查询时，从知识库检索真实句子
    let ragContext = '';
    if (!isSelectionReply && !isDirectSentence && lastUserText.length > 0 && isFirstRound) {
        const anythingllmConfig = getAIConfig('anythingllm');
        const ragQuery = `请从知识库中检索与"${lastUserText}"相关的公文段落。我需要完整的、结构丰满的长句（60-150字），请直接引用原文中的句子，不要自己编造。请列出3-5个最相关的完整句子，每个句子单独一行。`;
        const retrieved = await searchQiushiKnowledgeBase(ragQuery, {
            apiKey: anythingllmConfig.apiKey,
            endpoint: anythingllmConfig.endpoint,
            model: anythingllmConfig.model,
        });
        if (retrieved) {
            ragContext = retrieved;
        }
    }

    // 第二阶段：构建带或不带 RAG 上下文的提示词
    const messages = ragContext
        ? TRAINING_PROMPTS.sentenceGenerationChatWithRAG(history, ragContext)
        : TRAINING_PROMPTS.sentenceGenerationChat(history);

    try {
        const text = await callChatCompletion(messages, config, undefined);
        if (!text) return { success: false, error: 'AI 返回了空消息。' };
        return { success: true, data: text };
    } catch (e) {
        const msg = getErrorMessage(e);
        if (msg.includes('AbortError')) return { success: false, error: '请求超时，请稍后重试。' };
        return { success: false, error: msg || '连接 AI 服务失败。' };
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
type KnowledgeBaseRecord = {
    text: string;
    keywords: string[];
    source: string;
};

function normalizeKnowledgeBase(): KnowledgeBaseRecord[] {
    return knowledgeBase.flatMap((record): KnowledgeBaseRecord[] => {
        if (typeof record.text !== 'string' || !record.text.trim()) return [];
        const keywords = Array.isArray(record.keywords)
            ? record.keywords.filter((keyword): keyword is string => typeof keyword === 'string' && keyword.trim().length > 1)
            : [];
        if (keywords.length === 0) return [];
        return [{
            text: record.text.trim(),
            keywords: [...new Set(keywords.map(keyword => keyword.trim()))],
            source: typeof record.source === 'string' && record.source.trim() ? record.source.trim() : '本地知识库'
        }];
    });
}

const localKnowledgeBase = normalizeKnowledgeBase();

function normalizeMatchText(value: string): string {
    return value.toLowerCase().replace(/\s+/g, '');
}

function scoreKeywordMatch(query: string, keyword: string): number {
    if (query.includes(keyword)) return 20;
    if (keyword.length >= 3 && keyword.includes(query)) return 12;

    const minLength = Math.min(query.length, keyword.length);
    for (let length = Math.min(5, minLength); length >= 2; length -= 1) {
        for (let index = 0; index <= query.length - length; index += 1) {
            if (keyword.includes(query.slice(index, index + length))) return length * 2;
        }
    }
    return 0;
}

function generateLocalAssociativeSuggestions(textContext: string): AssociativeSuggestion | null {
    const query = normalizeMatchText(textContext.slice(-200));
    if (!query) return null;

    const matches = localKnowledgeBase
        .map((item, index) => {
            const keywordScores = item.keywords.map(keyword => ({
                keyword,
                score: scoreKeywordMatch(query, normalizeMatchText(keyword))
            })).filter(match => match.score > 0);
            const bodyScore = item.text.length >= 3 && query.includes(normalizeMatchText(item.text)) ? 3 : 0;
            return {
                item,
                index,
                score: keywordScores.reduce((total, match) => total + match.score, bodyScore),
                matchedKeywords: keywordScores.map(match => match.keyword)
            };
        })
        .filter(match => match.score > 0)
        .sort((left, right) => right.score - left.score || left.index - right.index)
        .slice(0, 6);

    if (matches.length === 0) return null;

    const matchedKeywords = [...new Set(matches.flatMap(match => match.matchedKeywords))].slice(0, 3);
    return {
        directions: matchedKeywords.map(keyword => `围绕「${keyword}」补充具体举措和实施成效`),
        sentences: matches.map(match => ({
            text: match.item.text,
            keywords: match.item.keywords,
            source: match.item.source
        }))
    };
}

export async function generateAssociativeSuggestions(textContext: string): Promise<AssociativeSuggestionsResult> {
    if (!isKwikiApiConfigured()) {
        return { suggestion: generateLocalAssociativeSuggestions(textContext), origin: 'local', fallbackReason: 'unconfigured' };
    }

    try {
        return { suggestion: await fetchKwikiAssociations(textContext), origin: 'wps' };
    } catch (error) {
        if (error instanceof KwikiAssociationError && ['INVALID_CONTEXT', 'ORIGIN_NOT_ALLOWED', 'UNSUPPORTED_MEDIA_TYPE'].includes(error.code)) {
            return { suggestion: null, origin: 'wps' };
        }
        const fallbackReason = error instanceof KwikiAssociationError
            ? error.code === 'UPSTREAM_TIMEOUT' ? 'timeout' : error.code === 'INVALID_RESPONSE' ? 'invalid-response' : error.code === 'NETWORK' ? 'network' : 'http'
            : 'network';
        return { suggestion: generateLocalAssociativeSuggestions(textContext), origin: 'local', fallbackReason };
    }
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
        // 低温度保证续写的确定性，超时3秒则放弃（避免阻塞光标），限制极短的输出长度(50)以提升速度
        const controller = new AbortController();
        const timer = window.setTimeout(() => controller.abort(), 8000);
        const content = await callChatCompletion(messages, config, undefined, 0.2, 50)
            .finally(() => window.clearTimeout(timer));
        if (!content) return null;

        // 去除引号、书名号、空白、思考过程（虽然 callChatCompletion 已经做过一次）
        const cleaned = content
            .replace(/<think>[\s\S]*?<\/think>/gi, '')
            .trim()
            .replace(/^["'\u201c\u300c\u300e]|["'\u201d\u300d\u300f]$/g, '')
            .trim();
        return cleaned.length > 0 ? cleaned : null;
    } catch {
        return null;
    }
}

export async function getSentenceTrainingFeedback(
    topic: string,
    structure_template: string,
    standard_example: string,
    user_draft: string,
    method_name: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<SentenceFeedback | null> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return null;

    const messages = TRAINING_PROMPTS.sentenceTraining(topic, structure_template, standard_example, user_draft, method_name);

    try {
        const content = await callChatCompletion(messages, config, { type: "json_object" });
        return content ? safeJsonParse<SentenceFeedback>(content) : null;
    } catch {
        return null;
    }
}

export async function chatAboutSentence(
    history: ChatMessage[],
    topic: string,
    structure_template: string,
    standard_example: string,
    user_draft: string,
    ai_feedback: string,
    provider: 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm' = 'openai',
    overrides?: { apiKey?: string; endpoint?: string; model?: string }
): Promise<AIResponse> {
    const config = getAIConfig(provider, overrides);
    if (!normalizeApiKey(config.apiKey)) return { success: false, error: `未配置 ${provider} 的 API Key，请在“系统设置”中填写。` };

    const messages = TRAINING_PROMPTS.sentenceTrainingChat(history, topic, structure_template, standard_example, user_draft, ai_feedback);

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

