import type { AssociativeSuggestion } from './ai-types';

const timeoutMs = 60_000;
const maxContextLength = 800;

type KwikiApiErrorCode = 'INVALID_CONTEXT' | 'ORIGIN_NOT_ALLOWED' | 'UNSUPPORTED_MEDIA_TYPE' | 'UPSTREAM_TIMEOUT' | 'UPSTREAM_FAILURE' | 'NOT_FOUND';

export class KwikiAssociationError extends Error {
    readonly code: KwikiApiErrorCode | 'NETWORK' | 'INVALID_RESPONSE';

    constructor(code: KwikiApiErrorCode | 'NETWORK' | 'INVALID_RESPONSE') {
        super(code);
        this.code = code;
    }
}

function normalizeSuggestion(payload: unknown): AssociativeSuggestion | null {
    if (!payload || typeof payload !== 'object') return null;
    const record = payload as Record<string, unknown>;
    const directions = Array.isArray(record.directions)
        ? record.directions.filter((item): item is string => typeof item === 'string' && item.trim().length > 0).slice(0, 3)
        : [];
    const sentences = Array.isArray(record.sentences)
        ? record.sentences.flatMap((item) => {
            if (!item || typeof item !== 'object') return [];
            const sentence = item as Record<string, unknown>;
            if (typeof sentence.text !== 'string' || !sentence.text.trim()) return [];
            return [{
                text: sentence.text.trim().slice(0, 1_200),
                keywords: Array.isArray(sentence.keywords)
                    ? sentence.keywords.filter((keyword): keyword is string => typeof keyword === 'string' && keyword.trim().length > 1).slice(0, 8)
                    : [],
                source: typeof sentence.source === 'string' && sentence.source.trim() ? sentence.source.trim().slice(0, 160) : 'WPS 知识库',
            }];
        }).slice(0, 6)
        : [];
    const sources = Array.isArray(record.sources)
        ? record.sources.flatMap((item) => {
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
        }).slice(0, 10)
        : [];

    if (directions.length === 0 && sentences.length === 0) return null;
    return { directions, sentences, sources };
}

export async function fetchKwikiAssociations(context: string): Promise<AssociativeSuggestion> {
    const baseUrl = import.meta.env.VITE_KWIKI_API_BASE_URL?.trim();
    if (!baseUrl) throw new KwikiAssociationError('NETWORK');

    const controller = new AbortController();
    const timer = window.setTimeout(() => controller.abort(), timeoutMs);
    try {
        const response = await fetch(`${baseUrl.replace(/\/$/, '')}/api/associations`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ context: context.slice(-maxContextLength) }),
            signal: controller.signal,
        });
        const payload = await response.json().catch(() => null);
        if (!response.ok) {
            const code = payload && typeof payload === 'object' && 'error' in payload && payload.error && typeof payload.error === 'object' && 'code' in payload.error && typeof payload.error.code === 'string'
                ? payload.error.code as KwikiApiErrorCode
                : 'UPSTREAM_FAILURE';
            throw new KwikiAssociationError(code);
        }
        const suggestion = normalizeSuggestion(payload);
        if (!suggestion) throw new KwikiAssociationError('INVALID_RESPONSE');
        return suggestion;
    } catch (error) {
        if (error instanceof KwikiAssociationError) throw error;
        if (error instanceof DOMException && error.name === 'AbortError') throw new KwikiAssociationError('UPSTREAM_TIMEOUT');
        throw new KwikiAssociationError('NETWORK');
    } finally {
        window.clearTimeout(timer);
    }
}

export function isKwikiApiConfigured(): boolean {
    return Boolean(import.meta.env.VITE_KWIKI_API_BASE_URL?.trim());
}
