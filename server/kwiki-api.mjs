import { createServer } from 'node:http';
import { spawn } from 'node:child_process';

const host = '127.0.0.1';
const port = Number.parseInt(process.env.KWIKI_API_PORT ?? '8787', 10);
const maxBodyBytes = 16_384;
const maxContextLength = 800;
const maxSentences = 6;
const maxDirections = 3;
const timeoutMs = 20_000;
const allowedOrigins = new Set(
    (process.env.KWIKI_CORS_ORIGINS ?? 'https://yc4805551.github.io,http://localhost:5173')
        .split(',')
        .map((origin) => origin.trim())
        .filter(Boolean),
);
const knowledgeBases = (process.env.KWIKI_DEFAULT_KUIDS ?? '0s_3125676226')
    .split(',')
    .map((kuid) => kuid.trim())
    .filter((kuid) => /^0s[\w-]+$/.test(kuid));

if (!Number.isInteger(port) || port < 1 || port > 65_535) {
    throw new Error('KWIKI_API_PORT must be a valid TCP port.');
}
if (knowledgeBases.length === 0) {
    throw new Error('KWIKI_DEFAULT_KUIDS must contain at least one valid knowledge-base ID.');
}

function getCorsHeaders(request) {
    const origin = request.headers.origin;
    if (!origin || !allowedOrigins.has(origin)) return {};
    return {
        'Access-Control-Allow-Origin': origin,
        'Access-Control-Allow-Methods': 'POST, OPTIONS',
        'Access-Control-Allow-Headers': 'Content-Type',
        'Access-Control-Max-Age': '600',
        Vary: 'Origin',
    };
}

function sendJson(response, status, body, corsHeaders = {}) {
    response.writeHead(status, {
        ...corsHeaders,
        'Cache-Control': 'no-store',
        'Content-Type': 'application/json; charset=utf-8',
    });
    response.end(JSON.stringify(body));
}

function sendError(response, status, code, corsHeaders) {
    sendJson(response, status, { error: { code } }, corsHeaders);
}

async function readJsonBody(request) {
    const chunks = [];
    let size = 0;

    for await (const chunk of request) {
        size += chunk.length;
        if (size > maxBodyBytes) throw new Error('BODY_TOO_LARGE');
        chunks.push(chunk);
    }

    try {
        return JSON.parse(Buffer.concat(chunks).toString('utf8'));
    } catch {
        throw new Error('INVALID_JSON');
    }
}

function normalizeText(value, maxLength) {
    return typeof value === 'string' ? value.trim().slice(0, maxLength) : '';
}

function isSafeSourceUrl(value) {
    try {
        const url = new URL(value);
        return url.protocol === 'https:' && (url.hostname.endsWith('.wps.cn') || url.hostname.endsWith('.kdocs.cn'));
    } catch {
        return false;
    }
}

function normalizeSourceUrl(value) {
    if (typeof value !== 'string' || !value.trim()) return '';
    const absolute = value.startsWith('/') ? `https://www.kdocs.cn${value}` : value;
    return isSafeSourceUrl(absolute) ? absolute : '';
}

function collectSources(value, sources) {
    if (!value || typeof value !== 'object') return;
    if (Array.isArray(value)) {
        value.forEach((item) => collectSources(item, sources));
        return;
    }

    const record = value;
    const sourceUrl = normalizeSourceUrl(record.url ?? record.link ?? record.href ?? record.link_url);
    const title = normalizeText(record.title ?? record.name ?? record.file_name ?? record.fileName ?? record.fname, 160);
    if (sourceUrl || title) {
        const key = `${title}|${sourceUrl}`;
        if (!sources.has(key)) {
            sources.set(key, {
                title: title || 'WPS 知识库素材',
                url: sourceUrl,
            });
        }
    }
}

function extractRecommendationTexts(value) {
    const text = normalizeText(value, 7_200);
    if (!text) return [];
    const parts = text.split(/(?:^|\n)\s*\d+[.、]\s*/).map((part) => part.trim()).filter(Boolean);
    return (parts.length > 1 ? parts : [text]).map((part) => part.slice(0, 1_200));
}

function normalizeCliResult(payload) {
    const answerCitations = Array.isArray(payload?.answer_citations) ? payload.answer_citations : [];
    const sources = new Map();
    const sentences = [];
    const directions = [];

    for (const citation of answerCitations) {
        const texts = extractRecommendationTexts(citation?.text);
        for (const text of texts) {
            if (sentences.length >= maxSentences) break;
            sentences.push({
                text,
                keywords: [],
                source: normalizeText(citation?.source ?? citation?.title, 160) || 'WPS 知识库',
            });
        }
        collectSources(citation?.reply_sources, sources);
        collectSources(citation?.citations, sources);
    }

    const answer = normalizeText(payload?.answer ?? payload?.text, 7_200);
    if (sentences.length === 0 && answer) {
        for (const text of extractRecommendationTexts(answer).slice(0, maxSentences)) {
            sentences.push({ text, keywords: [], source: 'WPS 知识库' });
        }
    }

    const processDisplay = Array.isArray(payload?.process_display) ? payload.process_display : [];
    for (const item of processDisplay) {
        const direction = normalizeText(typeof item === 'string' ? item : item?.text, 160);
        if (direction && directions.length < maxDirections) directions.push(direction);
    }

    return {
        directions,
        sentences,
        sources: [...sources.values()].slice(0, 10),
    };
}

function runKwiki(context) {
    const prompt = [
        '请仅依据指定知识库，为下面这段公文写作上下文提供不超过 6 条可直接参考的表达。',
        '每条表达应简洁、可插入正文，并尽可能保留来源信息；没有相关材料时请明确说明。',
        `写作上下文：${context}`,
    ].join('\n');
    const args = ['kwiki', 'knowledge-view-ask', '--input', prompt, '--format', 'json'];
    for (const kuid of knowledgeBases) args.push('--kuid', kuid);

    return new Promise((resolve, reject) => {
        const child = spawn('kwiki-cli', args, { shell: false, stdio: ['ignore', 'pipe', 'pipe'] });
        const stdout = [];
        const stderr = [];
        const timer = setTimeout(() => child.kill('SIGTERM'), timeoutMs);

        child.stdout.on('data', (chunk) => stdout.push(chunk));
        child.stderr.on('data', (chunk) => stderr.push(chunk));
        child.on('error', () => reject(new Error('UPSTREAM_FAILURE')));
        child.on('close', (code) => {
            clearTimeout(timer);
            if (code !== 0) {
                reject(new Error(code === null ? 'UPSTREAM_TIMEOUT' : 'UPSTREAM_FAILURE'));
                return;
            }
            try {
                resolve(JSON.parse(Buffer.concat(stdout).toString('utf8')));
            } catch {
                reject(new Error('UPSTREAM_FAILURE'));
            }
        });
    });
}

const server = createServer(async (request, response) => {
    const corsHeaders = getCorsHeaders(request);
    const origin = request.headers.origin;
    if (origin && Object.keys(corsHeaders).length === 0) {
        sendError(response, 403, 'ORIGIN_NOT_ALLOWED', {});
        return;
    }

    if (request.method === 'OPTIONS' && request.url === '/api/associations') {
        response.writeHead(204, corsHeaders);
        response.end();
        return;
    }

    if (request.method === 'GET' && request.url === '/healthz') {
        sendJson(response, 200, { ok: true }, corsHeaders);
        return;
    }

    if (request.method !== 'POST' || request.url !== '/api/associations') {
        sendError(response, 404, 'NOT_FOUND', corsHeaders);
        return;
    }

    if (!request.headers['content-type']?.startsWith('application/json')) {
        sendError(response, 415, 'UNSUPPORTED_MEDIA_TYPE', corsHeaders);
        return;
    }

    try {
        const body = await readJsonBody(request);
        const context = normalizeText(body?.context, maxContextLength);
        if (!context) {
            sendError(response, 400, 'INVALID_CONTEXT', corsHeaders);
            return;
        }

        const result = normalizeCliResult(await runKwiki(context));
        sendJson(response, 200, result, corsHeaders);
    } catch (error) {
        const code = error instanceof Error ? error.message : 'UPSTREAM_FAILURE';
        const status = code === 'BODY_TOO_LARGE' ? 413 : code === 'INVALID_JSON' ? 400 : code === 'UPSTREAM_TIMEOUT' ? 504 : 502;
        sendError(response, status, code, corsHeaders);
    }
});

server.listen(port, host, () => {
    console.log(`Kwiki API listening on http://${host}:${port}`);
});
