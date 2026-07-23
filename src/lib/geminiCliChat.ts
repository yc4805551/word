const timeoutMs = 90_000;
const maxQuestionLength = 1_200;
const maxDocumentContextLength = 6_000;
const maxHistoryMessages = 6;
const maxHistoryMessageLength = 1_000;

type GeminiCliErrorCode =
    | 'INVALID_QUESTION'
    | 'INVALID_DOCUMENT_CONTEXT'
    | 'INVALID_HISTORY'
    | 'ORIGIN_NOT_ALLOWED'
    | 'GEMINI_UNAVAILABLE'
    | 'GEMINI_AUTH_REQUIRED'
    | 'BUSY'
    | 'UPSTREAM_TIMEOUT'
    | 'UPSTREAM_FAILURE'
    | 'NETWORK'
    | 'UNCONFIGURED'
    | 'INVALID_RESPONSE';

export class GeminiCliError extends Error {
    readonly code: GeminiCliErrorCode;

    constructor(code: GeminiCliErrorCode) {
        super(code);
        this.code = code;
    }
}

function truncateDocumentContext(documentContext: string) {
    const text = documentContext.trim();
    if (text.length <= maxDocumentContextLength) return text;
    const half = Math.floor(maxDocumentContextLength / 2);
    return `${text.slice(0, half)}\n\n[中间内容已省略]\n\n${text.slice(-half)}`;
}

function normalizeHistory(history: { role: string; content: string }[]) {
    return history
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-maxHistoryMessages)
        .flatMap((message) => {
            const content = message.content.trim().slice(0, maxHistoryMessageLength);
            return content ? [{ role: message.role, content }] : [];
        });
}

export async function chatWithGeminiCli(question: string, documentContext: string, history: { role: string; content: string }[]) {
    const baseUrl = import.meta.env.VITE_KWIKI_API_BASE_URL?.trim();
    if (!baseUrl) throw new GeminiCliError('UNCONFIGURED');

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/gemini-chat`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
                question: question.trim().slice(0, maxQuestionLength),
                documentContext: truncateDocumentContext(documentContext),
                history: normalizeHistory(history),
            }),
            signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            const code = payload && typeof payload === 'object' && 'error' in payload && payload.error && typeof payload.error === 'object' && 'code' in payload.error && typeof payload.error.code === 'string'
                ? payload.error.code as GeminiCliErrorCode
                : 'UPSTREAM_FAILURE';
            throw new GeminiCliError(code);
        }
        if (!payload || typeof payload !== 'object' || typeof payload.answer !== 'string') {
            throw new GeminiCliError('INVALID_RESPONSE');
        }
        return { answer: payload.answer.trim().slice(0, 10_000) };
    } catch (error) {
        if (error instanceof GeminiCliError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') throw new GeminiCliError('UPSTREAM_TIMEOUT');
        throw new GeminiCliError('NETWORK');
    } finally {
        window.clearTimeout(timer);
    }
}