import { useState, useCallback } from 'react';
import { useEditorContext } from './EditorProvider';
import { Sparkles, Check, X, Loader2, Bot, Send, Lightbulb } from 'lucide-react';
import { polishText, chatWithDocument, generateAssociativeSuggestions, type ChatMessage, type AssociativeSuggestion } from '../../lib/ai';
import { useSettings } from '../../context/SettingsContext';
import ReactMarkdown from 'react-markdown';

function ChatMessageItem({ msg }: { msg: ChatMessage }) {
    const [isExpanded, setIsExpanded] = useState(false);
    const isLong = msg.role === 'assistant' && msg.content.length > 300;

    return (
        <div className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
            <div className={`max-w-[92%] rounded-lg p-3 text-sm flex flex-col ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-sm' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'}`}>
                {msg.role === 'user' ? (
                     <div className="whitespace-pre-wrap">{msg.content}</div>
                ) : (
                    <>
                        <div className="relative">
                            <div className={`markdown-body ${!isExpanded && isLong ? 'max-h-[220px] overflow-hidden' : ''}`}>
                                <ReactMarkdown>{msg.content}</ReactMarkdown>
                            </div>
                            {!isExpanded && isLong && (
                                <div className="absolute bottom-0 left-0 right-0 h-16 bg-gradient-to-t from-slate-100 to-transparent pointer-events-none" />
                            )}
                        </div>
                        {isLong && (
                            <div className={`flex justify-center mt-2 relative z-10 ${isExpanded ? 'border-t border-slate-200 pt-2' : ''}`}>
                                <button 
                                    onClick={() => setIsExpanded(!isExpanded)}
                                    className="text-blue-600 hover:text-blue-700 font-medium text-xs bg-white px-3 py-1 rounded-full border border-slate-200 shadow-sm"
                                >
                                    {isExpanded ? '收起内容' : '展开阅读完整内容'}
                                </button>
                            </div>
                        )}
                    </>
                )}
            </div>
        </div>
    );
}


interface Suggestion {
    id: string;
    original: string;
    replacement: string;
    rationale: string;
}

export default function AIAssistantSidebar() {
    const { editor } = useEditorContext();
    const { aiProvider, apiKeys, endpoints, models } = useSettings();
    const [mode, setMode] = useState<'realtime' | 'chat' | 'associative'>('realtime');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [hasAnalyzed, setHasAnalyzed] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [associativeData, setAssociativeData] = useState<AssociativeSuggestion | null>(null);
    const [isAssociating, setIsAssociating] = useState(false);
    const [associativeError, setAssociativeError] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { role: 'assistant', content: '您好！我是您的公文助手。我可以帮您润色文章、审查格式或回答相关问题。' }
    ]);

    const handleApplySuggestion = (id: string) => {
        const suggestion = suggestions.find(s => s.id === id);
        if (!suggestion || !editor) return;

        const { state } = editor;
        const { doc } = state;
        let found = false;

        // Normalize the search string (handle zero-width spaces or different types of quotes)
        const normalize = (str: string) => str.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        const searchTarget = normalize(suggestion.original);

        if (!searchTarget) {
            setSuggestions(prev => prev.filter(s => s.id !== id));
            return;
        }

        // Search for the original text in the document
        doc.descendants((node, pos) => {
            if (found) return false;
            if (node.isText && node.text) {
                const nodeText = normalize(node.text);
                if (nodeText.includes(searchTarget)) {
                    // Find the actual index in the original (un-normalized) node text
                    // because ProseMirror positions depend on the actual bytes
                    const actualIndex = node.text.indexOf(suggestion.original);
                    if (actualIndex !== -1) {
                        const from = pos + actualIndex;
                        const to = from + suggestion.original.length;
                        
                        editor.chain().focus().insertContentAt({ from, to }, suggestion.replacement).run();
                        found = true;
                        return false;
                    }
                }
            }
            return true;
        });

        if (found) {
            setSuggestions(prev => prev.filter(s => s.id !== id));
        } else {
            // Enhanced fallback: try a globally flat text search to see if it exists but is fragmented
            const fullText = doc.textContent;
            if (fullText.includes(suggestion.original)) {
                console.warn('Text found in doc but fragmented across nodes:', suggestion.original);
                alert(`无法自动替换：原文"${suggestion.original}"在文档中跨越了不同格式（如加粗或链接），请手动修改。`);
            } else {
                console.warn('Text completely not found:', suggestion.original);
                alert(`在文档中未找到原文："${suggestion.original}"，可能是您已手动修改。`);
            }
            setSuggestions(prev => prev.filter(s => s.id !== id));
        }
    };

    const handleDismissSuggestion = (id: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== id));
    };

    const handleHighlightSuggestion = (originalText: string) => {
        if (!editor || !originalText) return;

        const { state } = editor;
        const { doc } = state;
        let found = false;

        const normalize = (str: string) => str.replace(/[\u200B-\u200D\uFEFF]/g, '').trim();
        const searchTarget = normalize(originalText);

        if (!searchTarget) return;

        doc.descendants((node, pos) => {
            if (found) return false;
            if (node.isText && node.text) {
                const nodeText = normalize(node.text);
                if (nodeText.includes(searchTarget)) {
                    const actualIndex = node.text.indexOf(originalText);
                    if (actualIndex !== -1) {
                        const from = pos + actualIndex;
                        const to = from + originalText.length;
                        
                        editor.commands.setTextSelection({ from, to });
                        editor.commands.scrollIntoView();
                        editor.commands.focus();
                        found = true;
                        return false;
                    }
                }
            }
            return true;
        });
    };

    const handleRunRealtimeAnalysis = useCallback(async () => {
        if (!editor) return;
        const text = editor.getText();
        if (!text.trim()) return;

        setIsAnalyzing(true);
        setHasAnalyzed(true);
        setAnalysisError(null);
        try {
            const result = await polishText(text, aiProvider, { 
                apiKey: apiKeys[aiProvider],
                endpoint: endpoints[aiProvider],
                model: models[aiProvider] 
            });
            if (result && result.changes && result.changes.length > 0) {
                const newSuggestions = result.changes.map((c: any, i: number) => ({
                    id: Date.now().toString() + i,
                    original: c.original_word || '',
                    replacement: c.polished_word || '',
                    rationale: c.rationale || 'AI 建议修改'
                })).filter((s: Suggestion) => s.original && s.replacement);

                setSuggestions(newSuggestions);
            } else if (result && result.changes?.length === 0) {
                 setSuggestions([]);
            } else {
                setAnalysisError('无法获取分析结果，请检查 API 配置。');
            }
        } catch (e) {
            console.error("AI Analysis failed", e);
            setAnalysisError('分析过程中发生错误，请稍后重试。');
        } finally {
            setIsAnalyzing(false);
        }
    }, [editor, aiProvider, apiKeys, endpoints, models]);

    const handleGetAssociations = useCallback(async () => {
        if (!editor) return;
        const text = editor.getText();
        if (!text.trim()) return;

        setIsAssociating(true);
        setAssociativeError(null);
        try {
            const result = await generateAssociativeSuggestions(text, 'anythingllm', { 
                apiKey: apiKeys['anythingllm'],
                endpoint: endpoints['anythingllm'],
                model: models['anythingllm'] 
            });
            if (result) {
                setAssociativeData(result);
            } else {
                setAssociativeError('无法获取联想数据，请检查 API 配置。');
            }
        } catch (e: any) {
            console.error("AI Association failed", e);
            setAssociativeError(`错误: ${e.message || '未知异常'}`);
        } finally {
            setIsAssociating(false);
        }
    }, [editor, aiProvider, apiKeys, endpoints, models]);

    const handleInsertText = (text: string) => {
        if (!editor) return;
        editor.chain().focus().insertContent(text).run();
    };

    const handleSendMessage = async () => {
        if (!chatInput.trim() || !editor || isChatLoading) return;

        const userMsg: ChatMessage = { role: 'user', content: chatInput };
        setChatHistory(prev => [...prev, userMsg]);
        setChatInput('');
        setIsChatLoading(true);

        try {
            const documentContext = editor.getText();
            // Pass the updated history including the current user message
            const response = await chatWithDocument(
                [...chatHistory, userMsg], 
                documentContext, 
                aiProvider, 
                { 
                    apiKey: apiKeys[aiProvider], 
                    endpoint: endpoints[aiProvider],
                    model: models[aiProvider] 
                }
            );
            
            if (response.success && response.data) {
                setChatHistory(prev => [...prev, { role: 'assistant', content: response.data! }]);
            } else {
                setChatHistory(prev => [...prev, { role: 'assistant', content: `抱歉，遇到了一些麻烦：${response.error || '联络 AI 失败'}` }]);
            }
        } catch (err) {
            setChatHistory(prev => [...prev, { role: 'assistant', content: '网络异常，请检查连接。' }]);
        } finally {
            setIsChatLoading(false);
        }
    };

    return (
        <div className="flex flex-col h-full bg-slate-50 border-l border-slate-200">
            {/* Sidebar Header / Mode Switch */}
            <div className="flex p-2 gap-1 border-b border-slate-200 bg-white shrink-0">
                <button 
                    onClick={() => setMode('realtime')}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${mode === 'realtime' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <Sparkles className="w-3.5 h-3.5" /> 全文审查
                </button>
                <button 
                    onClick={() => setMode('chat')}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${mode === 'chat' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <Bot className="w-3.5 h-3.5" /> 写作问答
                </button>
                <button 
                    onClick={() => setMode('associative')}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${mode === 'associative' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <Lightbulb className="w-3.5 h-3.5" /> 灵感联想
                </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {mode === 'realtime' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
                            <span>发现的问题 ({suggestions.length})</span>
                            <button 
                                onClick={handleRunRealtimeAnalysis}
                                disabled={isAnalyzing}
                                className="text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                            >
                                <Sparkles className="w-3 h-3" />
                                {isAnalyzing ? '分析中...' : '重新分析'}
                            </button>
                        </div>
                        {isAnalyzing && (
                            <div className="flex items-center gap-2 text-blue-600 text-sm p-3 bg-blue-50 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                正在分析全文...
                            </div>
                        )}
                        {analysisError && (
                            <div className="text-xs text-red-500 p-3 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
                                <X className="w-3.5 h-3.5 shrink-0" />
                                <span>{analysisError}</span>
                                <button onClick={handleRunRealtimeAnalysis} className="ml-auto underline font-bold">重试</button>
                            </div>
                        )}
                        {!isAnalyzing && !hasAnalyzed && suggestions.length === 0 && (
                            <div className="text-center text-sm p-4 text-slate-500 mt-4 border border-blue-100 rounded-lg bg-white shadow-sm">
                                <div className="mb-4 text-xs font-medium text-blue-600 bg-blue-50 py-1 px-2 rounded-full inline-block">
                                    手动审核模式
                                </div>
                                <p className="mb-4 text-xs text-slate-500">点击下方按钮可对全文内容进行审查和纠错</p>
                                <button 
                                    onClick={handleRunRealtimeAnalysis}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium w-full shadow-sm"
                                >
                                    开始通篇分析
                                </button>
                            </div>
                        )}
                        {suggestions.map(s => (
                            <div 
                                key={s.id} 
                                onClick={() => handleHighlightSuggestion(s.original)}
                                className="bg-white p-3 rounded-lg border border-red-100 shadow-sm space-y-2 cursor-pointer hover:border-blue-300 hover:shadow-md transition-all group"
                            >
                                <div className="text-sm font-medium text-slate-700 flex flex-wrap items-center gap-2">
                                    <span className="line-through text-red-500 bg-red-50 px-1 rounded">{s.original}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-green-600 bg-green-50 px-1 rounded">{s.replacement}</span>
                                </div>
                                <div className="text-xs text-slate-600">{s.rationale}</div>
                                <div className="flex justify-end gap-2 pt-1 border-t border-slate-50 opacity-100 md:opacity-0 md:group-hover:opacity-100 transition-opacity">
                                    <button onClick={(e) => { e.stopPropagation(); handleDismissSuggestion(s.id); }} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={(e) => { e.stopPropagation(); handleApplySuggestion(s.id); }} className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-green-50/50">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {hasAnalyzed && suggestions.length === 0 && !isAnalyzing && (
                            <div className="text-center text-sm text-slate-500 py-8 bg-white rounded-lg border border-slate-100 shadow-sm mt-4">
                                <Sparkles className="w-8 h-8 mx-auto mb-3 text-green-500 opacity-50" />
                                <div className="mb-1 font-medium text-slate-700">太棒了！</div>
                                <div className="text-xs text-slate-400">未发现明显问题，若文段有更新可以点击上方重新分析</div>
                            </div>
                        )}
                    </div>
                )}

                {mode === 'associative' && (
                    <div className="space-y-4">
                        <div className="flex justify-between items-center text-xs text-slate-500 font-medium pb-2 border-b border-slate-100">
                            <span>写作灵感提示</span>
                            <button 
                                onClick={handleGetAssociations}
                                disabled={isAssociating}
                                className="text-blue-600 hover:text-blue-700 disabled:opacity-50 flex items-center gap-1 bg-blue-50 px-2 py-1 rounded"
                            >
                                <Lightbulb className="w-3 h-3" />
                                {isAssociating ? '获取中...' : '获取联想'}
                            </button>
                        </div>
                        {isAssociating && (
                            <div className="flex items-center gap-2 text-blue-600 text-sm p-3 bg-blue-50 rounded-lg">
                                <Loader2 className="w-4 h-4 animate-spin" />
                                正在思考接下来可以怎么写...
                            </div>
                        )}
                        {associativeError && (
                            <div className="text-xs text-red-500 p-3 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
                                <X className="w-3.5 h-3.5 shrink-0" />
                                <span>{associativeError}</span>
                                <button onClick={handleGetAssociations} className="ml-auto underline font-bold">重试</button>
                            </div>
                        )}
                        {!isAssociating && !associativeData && (
                            <div className="text-center text-sm p-4 text-slate-500 mt-4 border border-blue-100 rounded-lg bg-white shadow-sm">
                                <div className="mb-4 text-xs font-medium text-blue-600 bg-blue-50 py-1 px-2 rounded-full inline-block">
                                    💡 激发写作思路
                                </div>
                                <p className="mb-4 text-xs text-slate-500">点击下方按钮可基于您当前的写作进度获取思路指引，和好词名句推荐。</p>
                                <button 
                                    onClick={handleGetAssociations}
                                    className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium w-full shadow-sm"
                                >
                                    获取写作灵感
                                </button>
                            </div>
                        )}
                        {associativeData && !isAssociating && (
                            <div className="space-y-4">
                                {associativeData.directions && associativeData.directions.length > 0 && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-blue-500"></span> 后续思路指引
                                        </div>
                                        <ul className="text-xs text-slate-600 space-y-1 pl-3 list-disc">
                                            {associativeData.directions.map((d, i) => (
                                                <li key={i}>{d}</li>
                                            ))}
                                        </ul>
                                    </div>
                                )}
                                {associativeData.vocabulary && associativeData.vocabulary.length > 0 && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span> 推荐高级词汇
                                        </div>
                                        <div className="flex flex-wrap gap-2">
                                            {associativeData.vocabulary.map((v, i) => (
                                                <button 
                                                    key={i} 
                                                    onClick={() => handleInsertText(v)}
                                                    className="text-xs bg-slate-50 border border-slate-200 text-slate-700 px-2 py-1 rounded hover:bg-green-50 hover:border-green-300 hover:text-green-700 transition-colors"
                                                    title="点击插入光标处"
                                                >
                                                    {v}
                                                </button>
                                            ))}
                                        </div>
                                    </div>
                                )}
                                {associativeData.quotes && associativeData.quotes.length > 0 && (
                                    <div className="bg-white p-3 rounded-lg border border-slate-200 shadow-sm space-y-2">
                                        <div className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                            <span className="w-1.5 h-1.5 rounded-full bg-purple-500"></span> 推荐素材名言
                                        </div>
                                        <div className="space-y-2">
                                            {associativeData.quotes.map((q, i) => (
                                                <div key={i} className="group relative pr-8">
                                                    <div className="text-xs text-slate-600 bg-slate-50 p-2 rounded border border-slate-100">{q}</div>
                                                    <button 
                                                        onClick={() => handleInsertText(q)}
                                                        className="absolute right-1 top-1 bottom-1 px-2 text-slate-400 hover:text-blue-600 hover:bg-blue-50 rounded opacity-0 group-hover:opacity-100 transition-all flex justify-center items-center"
                                                        title="点击插入"
                                                    >
                                                        <Check className="w-3.5 h-3.5" />
                                                    </button>
                                                </div>
                                            ))}
                                        </div>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                )}


                {mode === 'chat' && (
                    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="flex-1 p-3 overflow-y-auto space-y-3">
                            {chatHistory.map((msg, i) => (
                                <ChatMessageItem key={i} msg={msg} />
                            ))}
                            {isChatLoading && (
                                <div className="flex justify-start">
                                    <div className="bg-slate-50 border border-slate-100 rounded-lg p-2 flex items-center gap-2">
                                        <Loader2 className="w-3.5 h-3.5 animate-spin text-blue-600" />
                                        <span className="text-xs text-slate-400">AI 正在思考...</span>
                                    </div>
                                </div>
                            )}
                        </div>
                        <div className="p-2 border-t border-slate-200 bg-slate-50 flex gap-2">
                            <input 
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="输入要求，例如：续写..."
                                className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                disabled={isChatLoading}
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && chatInput.trim()) {
                                        handleSendMessage();
                                    }
                                }}
                            />
                            <button 
                                onClick={handleSendMessage}
                                disabled={!chatInput.trim() || isChatLoading}
                                className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0 disabled:opacity-50"
                            >
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

