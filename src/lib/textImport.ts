import mammoth from 'mammoth';

export interface ImportedText {
    id: string;
    fileName: string;
    content: string;
    paragraphs: string[];
    metadata: {
        fileSize: number;
        importTime: number;
        encoding: string;
        paragraphCount: number;
        characterCount: number;
    };
}

export interface ImportProgress {
    total: number;
    processed: number;
    currentFile: string;
    success: number;
    failed: number;
}

export interface ImportLog {
    timestamp: number;
    level: 'info' | 'warning' | 'error';
    message: string;
    fileName?: string;
}

export interface ImportError {
    fileName: string;
    error: string;
    details?: string;
}

const MAX_FILE_SIZE = 10 * 1024 * 1024;
const TARGET_PROCESSING_TIME = 3000;

function detectEncoding(buffer: ArrayBuffer): string {
    const uint8 = new Uint8Array(buffer);
    
    // 1. 检查 BOM
    if (uint8.length >= 3 && uint8[0] === 0xEF && uint8[1] === 0xBB && uint8[2] === 0xBF) return 'UTF-8';
    if (uint8.length >= 2 && uint8[0] === 0xFF && uint8[1] === 0xFE) return 'UTF-16LE';
    if (uint8.length >= 2 && uint8[0] === 0xFE && uint8[1] === 0xFF) return 'UTF-16BE';
    
    // 2. 启发式检测
    let utf8Probable = 0;
    let gbkProbable = 0;
    let isPureAscii = true;
    
    const checkLength = Math.min(uint8.length, 5000);
    
    for (let i = 0; i < checkLength; i++) {
        const byte = uint8[i];
        
        if (byte > 0x7F) isPureAscii = false;
        
        // UTF-8 特征
        if (byte >= 0xC2 && byte <= 0xDF) {
            if (i + 1 < uint8.length && uint8[i + 1] >= 0x80 && uint8[i + 1] <= 0xBF) {
                utf8Probable += 2;
                i++;
            }
        } else if (byte >= 0xE0 && byte <= 0xEF) {
            if (i + 2 < uint8.length && 
                uint8[i + 1] >= 0x80 && uint8[i + 1] <= 0xBF &&
                uint8[i + 2] >= 0x80 && uint8[i + 2] <= 0xBF) {
                utf8Probable += 3;
                i += 2;
            }
        }
        
        // GBK 特征 (0x81-0xFE followed by 0x40-0xFE)
        if (byte >= 0x81 && byte <= 0xFE) {
            if (i + 1 < uint8.length && uint8[i + 1] >= 0x40 && uint8[i + 1] <= 0xFE) {
                gbkProbable += 2;
                // 注意：这里不 i++，因为 GBK 的第二个字节也可能是下一个字符的开始（虽然概率低）
            }
        }
    }
    
    if (isPureAscii) return 'UTF-8';
    
    // 如果 UTF-8 特征明显，优先选 UTF-8
    if (utf8Probable > gbkProbable) return 'UTF-8';
    if (gbkProbable > utf8Probable) return 'GBK';
    
    return 'UTF-8'; // 默认
}

function decodeText(buffer: ArrayBuffer, encoding: string): string {
    const decoder = new TextDecoder(encoding, { fatal: false });
    return decoder.decode(buffer);
}

function preprocessText(text: string): string {
    let cleaned = text;
    
    // 移除 BOM
    cleaned = cleaned.replace(/^\uFEFF/, '');
    
    // 统一换行符
    cleaned = cleaned.replace(/\r\n/g, '\n').replace(/\r/g, '\n');
    
    // 处理硬换行：如果一行很短且下一行不是空行，尝试合并（常见于一些格式较差的 TXT）
    // 这里采用简单策略：如果行尾不是标点符号且下一行有内容，则尝试合并
    const lines = cleaned.split('\n');
    const resultLines: string[] = [];
    let currentParagraph = '';

    for (let i = 0; i < lines.length; i++) {
        const line = lines[i].trim();
        if (line === '') {
            if (currentParagraph) {
                resultLines.push(currentParagraph);
                currentParagraph = '';
            }
            continue;
        }

        // 判断是否是段落首行缩进（中文常见格式）
        const isIndented = lines[i].startsWith('　') || lines[i].startsWith('  ');
        
        if (isIndented && currentParagraph) {
            resultLines.push(currentParagraph);
            currentParagraph = line;
        } else {
            currentParagraph = currentParagraph ? (currentParagraph + line) : line;
        }

        // 如果行尾有明显的段落结束标志，则结束当前段落
        if (/[。！？…」』”]$/.test(line)) {
            resultLines.push(currentParagraph);
            currentParagraph = '';
        }
    }
    if (currentParagraph) resultLines.push(currentParagraph);

    cleaned = resultLines.join('\n\n');
    
    // 移除多余空白
    cleaned = cleaned.replace(/[^\S\n]+/g, ' ');
    
    // 限制连续换行
    cleaned = cleaned.replace(/\n{3,}/g, '\n\n');
    
    return cleaned.trim();
}

function splitIntoParagraphs(text: string): string[] {
    // 支持多种分段逻辑：双换行、或特定缩进
    return text.split(/\n\n+/)
        .map(p => p.trim())
        .filter(p => p.length > 0);
}

function cleanContent(text: string): string {
    let cleaned = text;
    
    // 1. 移除控制字符
    cleaned = cleaned.replace(/[\x00-\x08\x0B\x0C\x0E-\x1F\x7F]/g, '');
    
    // 2. 规范化标点符号（可选，但对 AI 训练有好处）
    // 比如：将连续的句号改为省略号，或者规范化全角半角
    // cleaned = cleaned.replace(/\.{3,}/g, '…');
    
    // 3. 移除常见的 TXT 干扰项，如“本章未完”、“点击下一页”等（可扩展）
    const distractions = [
        /第\s*\d+\s*页/g,
        /本章未完.*/g,
        /待续.*/g
    ];
    distractions.forEach(regex => {
        cleaned = cleaned.replace(regex, '');
    });
    
    return cleaned.trim();
}

function validateFileSize(file: File): { valid: boolean; error?: string } {
    if (file.size > MAX_FILE_SIZE) {
        return {
            valid: false,
            error: `文件 "${file.name}" 超过大小限制（最大 10MB）`
        };
    }
    return { valid: true };
}

function validateFileType(file: File): { valid: boolean; error?: string } {
    const validExtensions = ['.txt', '.docx', '.md', '.log', '.csv', '.json', '.yml', '.yaml'];
    const fileName = file.name.toLowerCase();
    const isValid = validExtensions.some(ext => fileName.endsWith(ext));
    
    if (!isValid) {
        return {
            valid: false,
            error: `文件 "${file.name}" 格式不支持，支持 .txt, .docx, .md, .log, .csv, .json 等文本格式`
        };
    }
    return { valid: true };
}

export async function importSingleFile(
    file: File,
    onProgress?: (progress: number) => void
): Promise<ImportedText | ImportError> {
    const logs: ImportLog[] = [];
    
    const addLog = (level: 'info' | 'warning' | 'error', message: string) => {
        logs.push({
            timestamp: Date.now(),
            level,
            message,
            fileName: file.name
        });
    };
    
    try {
        addLog('info', `开始导入文件: ${file.name}`);
        
        const sizeValidation = validateFileSize(file);
        if (!sizeValidation.valid) {
            addLog('error', sizeValidation.error!);
            return {
                fileName: file.name,
                error: sizeValidation.error!
            };
        }
        
        const typeValidation = validateFileType(file);
        if (!typeValidation.valid) {
            addLog('error', typeValidation.error!);
            return {
                fileName: file.name,
                error: typeValidation.error!
            };
        }
        
        onProgress?.(10);
        
        const startTime = performance.now();
        const arrayBuffer = await file.arrayBuffer();
        const readTime = performance.now() - startTime;
        
        addLog('info', `文件读取完成，耗时: ${readTime.toFixed(2)}ms`);
        
        onProgress?.(30);
        
        let content = '';
        let encoding = 'Binary/Unknown';
        const fileName = file.name.toLowerCase();

        if (fileName.endsWith('.docx')) {
            addLog('info', `检测到 Word 文档，开始解析...`);
            const result = await mammoth.extractRawText({ arrayBuffer });
            content = result.value;
            encoding = 'DOCX';
            addLog('info', `Word 解析完成`);
            if (result.messages.length > 0) {
                result.messages.forEach(msg => addLog('warning', `Mammoth: ${msg.message}`));
            }
        } else {
            encoding = detectEncoding(arrayBuffer);
            addLog('info', `检测到文本编码: ${encoding}`);
            content = decodeText(arrayBuffer, encoding);
        }

        onProgress?.(60);
        
        const textWithoutBOM = preprocessText(content);
        const textCleaned = cleanContent(textWithoutBOM);
        onProgress?.(80);
        
        const paragraphs = splitIntoParagraphs(textCleaned);
        onProgress?.(95);
        
        const processingTime = performance.now() - startTime;
        const fileSizeMB = file.size / (1024 * 1024);
        const timePerMB = processingTime / fileSizeMB;
        
        addLog('info', `处理完成，耗时: ${processingTime.toFixed(2)}ms (${timePerMB.toFixed(2)}ms/MB)`);
        
        if (timePerMB > TARGET_PROCESSING_TIME) {
            addLog('warning', `处理速度较慢，建议优化: ${timePerMB.toFixed(2)}ms/MB`);
        }
        
        const importedText: ImportedText = {
            id: `${Date.now()}-${Math.random().toString(36).substr(2, 9)}`,
            fileName: file.name,
            content: textCleaned,
            paragraphs,
            metadata: {
                fileSize: file.size,
                importTime: Date.now(),
                encoding,
                paragraphCount: paragraphs.length,
                characterCount: textCleaned.length
            }
        };
        
        addLog('info', `导入成功: ${paragraphs.length} 段落, ${textCleaned.length} 字符`);
        
        onProgress?.(100);
        
        return importedText;
        
    } catch (error) {
        const errorMessage = error instanceof Error ? error.message : '未知错误';
        addLog('error', `导入失败: ${errorMessage}`);
        return {
            fileName: file.name,
            error: `导入失败: ${errorMessage}`,
            details: errorMessage
        };
    }
}

export async function importMultipleFiles(
    files: File[],
    onProgress?: (progress: ImportProgress) => void,
): Promise<{ success: ImportedText[]; failed: ImportError[] }> {
    const success: ImportedText[] = [];
    const failed: ImportError[] = [];
    
    const progress: ImportProgress = {
        total: files.length,
        processed: 0,
        currentFile: '',
        success: 0,
        failed: 0
    };
    
    for (let i = 0; i < files.length; i++) {
        const file = files[i];
        progress.currentFile = file.name;
        onProgress?.({ ...progress });
        
        const result = await importSingleFile(file, () => {
            onProgress?.({ ...progress });
        });
        
        if ('id' in result) {
            success.push(result);
            progress.success++;
        } else {
            failed.push(result);
            progress.failed++;
        }
        
        progress.processed++;
        onProgress?.({ ...progress });
    }
    
    return { success, failed };
}

export function calculateImportStats(results: { success: ImportedText[]; failed: ImportError[] }) {
    const total = results.success.length + results.failed.length;
    const successRate = total > 0 ? (results.success.length / total) * 100 : 0;
    const totalSize = results.success.reduce((sum, item) => sum + item.metadata.fileSize, 0);
    const totalCharacters = results.success.reduce((sum, item) => sum + item.metadata.characterCount, 0);
    const totalParagraphs = results.success.reduce((sum, item) => sum + item.metadata.paragraphCount, 0);
    
    return {
        totalFiles: total,
        successFiles: results.success.length,
        failedFiles: results.failed.length,
        successRate: successRate.toFixed(2),
        totalSize: (totalSize / (1024 * 1024)).toFixed(2),
        totalCharacters,
        totalParagraphs,
        meetsTarget: successRate >= 99.9
    };
}

export function formatFileSize(bytes: number): string {
    if (bytes < 1024) return `${bytes} B`;
    if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(2)} KB`;
    return `${(bytes / (1024 * 1024)).toFixed(2)} MB`;
}

export function formatTimestamp(timestamp: number): string {
    const date = new Date(timestamp);
    return date.toLocaleString('zh-CN', {
        year: 'numeric',
        month: '2-digit',
        day: '2-digit',
        hour: '2-digit',
        minute: '2-digit',
        second: '2-digit'
    });
}

export function previewText(text: string, maxLength: number = 500): string {
    if (text.length <= maxLength) return text;
    return text.substring(0, maxLength) + '...';
}

export function mergeImportedTexts(texts: ImportedText[], separator: string = '\n\n'): string {
    return texts.map(t => t.content).join(separator);
}

export function filterTextsByKeyword(texts: ImportedText[], keyword: string): ImportedText[] {
    const lowerKeyword = keyword.toLowerCase();
    return texts.filter(text => 
        text.content.toLowerCase().includes(lowerKeyword) ||
        text.fileName.toLowerCase().includes(lowerKeyword)
    );
}

export function sortTextsByDate(texts: ImportedText[], ascending: boolean = false): ImportedText[] {
    return [...texts].sort((a, b) => {
        const diff = a.metadata.importTime - b.metadata.importTime;
        return ascending ? diff : -diff;
    });
}

export function sortTextsBySize(texts: ImportedText[], ascending: boolean = false): ImportedText[] {
    return [...texts].sort((a, b) => {
        const diff = a.metadata.fileSize - b.metadata.fileSize;
        return ascending ? diff : -diff;
    });
}
