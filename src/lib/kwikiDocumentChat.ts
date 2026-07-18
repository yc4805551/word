import type { ChatMessage, KnowledgeSource } from './ai-types';

const timeoutMs = 60_000;
const maxQuestionLength = 1_200;
const maxDocumentContextLength = 6_000;
const maxHistoryMessages = 6;
const maxHistoryMessageLength = 1_000;

type KwikiDocumentChatErrorCode =
    | 'INVALID_QUESTION'
    | 'INVALID_DOCUMENT_CONTEXT'
    | 'INVALID_HISTORY'
    | 'ORIGIN_NOT_ALLOWED'
    | 'UPSTREAM_TIMEOUT'
    | 'UPSTREAM_FAILURE'
    | 'NETWORK'
    | 'UNCONFIGURED'
    | 'INVALID_RESPONSE';

export class KwikiDocumentChatError extends Error {
    readonly code: KwikiDocumentChatErrorCode;

    constructor(code: KwikiDocumentChatErrorCode) {
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

function normalizeHistory(history: ChatMessage[]) {
    return history
        .filter((message) => message.role === 'user' || message.role === 'assistant')
        .slice(-maxHistoryMessages)
        .flatMap((message) => {
            const content = message.content.trim().slice(0, maxHistoryMessageLength);
            return content ? [{ role: message.role, content }] : [];
        });
}

function normalizeSources(value: unknown): KnowledgeSource[] {
    if (!Array.isArray(value)) return [];
    return value.flatMap((item) => {
        if (!item || typeof item !== 'object') return [];
        const source = item as Record<string, unknown>;
        if (typeof source.title !== 'string' || typeof source.url !== 'string') return [];
        try {
            const url = new URL(source.url);
            if (url.protocol !== 'https:' || (!url.hostname.endsWith('.wps.cn') && !url.hostname.endsWith('.kdocs.cn'))) return [];
            return [{ title: source.title.trim().slice(0, 160) || 'WPS 知识库素材', url: url.toString() }];
        } catch {
            return [];
        }
    }).slice(0, 10);
}

export async function chatWithKwikiDocument(question: string, documentContext: string, history: ChatMessage[]) {
    const baseUrl = import.meta.env.VITE_KWIKI_API_BASE_URL?.trim();
    if (!baseUrl) throw new KwikiDocumentChatError('UNCONFIGURED');

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/document-chat`, {
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
                ? payload.error.code as KwikiDocumentChatErrorCode
                : 'UPSTREAM_FAILURE';
            throw new KwikiDocumentChatError(code);
        }
        if (!payload || typeof payload !== 'object' || !('matched' in payload) || typeof payload.matched !== 'boolean' || !('answer' in payload) || typeof payload.answer !== 'string') {
            throw new KwikiDocumentChatError('INVALID_RESPONSE');
        }
        return {
            matched: payload.matched,
            answer: payload.answer.trim().slice(0, 6_000),
            sources: normalizeSources('sources' in payload ? payload.sources : []),
        };
    } catch (error) {
        if (error instanceof KwikiDocumentChatError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') throw new KwikiDocumentChatError('UPSTREAM_TIMEOUT');
        throw new KwikiDocumentChatError('NETWORK');
    } finally {
        window.clearTimeout(timer);
    }
}
