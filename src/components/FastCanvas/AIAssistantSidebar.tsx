import { useState, useEffect, useCallback, useRef } from 'react';
import { useEditorContext } from './EditorProvider';
import { Sparkles, Check, X, Loader2, Bot, FileText, Send, Award, Target, Zap, Shield } from 'lucide-react';
import { polishText, chatWithDocument, deepAuditDocument, type ChatMessage, type AuditResult } from '../../lib/ai';
import { useSettings } from '../../context/SettingsContext';

interface Suggestion {
    id: string;
    original: string;
    replacement: string;
    rationale: string;
}

export default function AIAssistantSidebar() {
    const { editor } = useEditorContext();
    const { aiProvider, apiKeys, endpoints, models } = useSettings();
    const [mode, setMode] = useState<'realtime' | 'audit' | 'chat'>('realtime');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [analysisError, setAnalysisError] = useState<string | null>(null);
    const [auditResult, setAuditResult] = useState<AuditResult | null>(null);
    const [isAuditing, setIsAuditing] = useState(false);
    const [auditError, setAuditError] = useState<string | null>(null);
    const [chatInput, setChatInput] = useState('');
    const [isChatLoading, setIsChatLoading] = useState(false);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([
        { role: 'assistant', content: '您好！我是您的公文助手。我可以帮您润色文章、审查格式或回答相关问题。' }
    ]);

    const handleApplySuggestion = (id: string) => {
        const suggestion = suggestions.find(s => s.id === id);
        if (!suggestion || !editor) return;

        // In a real implementation: find the exact position of "original" in the editor
        // and replace it with "replacement". This is complex with Tiptap without specific extensions.
        // For simple demo, we just replace all occurrences or use string replacement on text.
        // A robust way is to use NodeViews or custom marks.
        // Here we just remove it from the list for UI interaction.
        setSuggestions(prev => prev.filter(s => s.id !== id));
    };

    const handleDismissSuggestion = (id: string) => {
        setSuggestions(prev => prev.filter(s => s.id !== id));
    };

    const handleRunRealtimeAnalysis = useCallback(async () => {
        if (!editor) return;
        const text = editor.getText();
        if (!text.trim()) return;

        setIsAnalyzing(true);
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

    // Automated Real-time Analysis logic
    const analysisTimeoutRef = useRef<NodeJS.Timeout | null>(null);

    useEffect(() => {
        if (!editor || mode !== 'realtime') return;

        const handleUpdate = () => {
            if (analysisTimeoutRef.current) {
                clearTimeout(analysisTimeoutRef.current);
            }

            analysisTimeoutRef.current = setTimeout(() => {
                handleRunRealtimeAnalysis();
            }, 5000); // 5 seconds debounce
        };

        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            if (analysisTimeoutRef.current) {
                clearTimeout(analysisTimeoutRef.current);
            }
        };
    }, [editor, mode, handleRunRealtimeAnalysis]);

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

    const handleRunAudit = async () => {
        if (!editor) return;
        const text = editor.getText();
        if (!text.trim()) return;

        setIsAuditing(true);
        setAuditError(null);
        try {
            const result = await deepAuditDocument(text, aiProvider, { 
                apiKey: apiKeys[aiProvider],
                endpoint: endpoints[aiProvider],
                model: models[aiProvider] 
            });
            if (result) {
                setAuditResult(result);
            } else {
                setAuditError('审计失败，请重试。');
            }
        } catch (e) {
            setAuditError('审计过程中发生错误。');
        } finally {
            setIsAuditing(false);
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
                    <Sparkles className="w-3.5 h-3.5" /> 实时审查
                </button>
                <button 
                    onClick={() => setMode('audit')}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${mode === 'audit' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <FileText className="w-3.5 h-3.5" /> 深度诊断
                </button>
                <button 
                    onClick={() => setMode('chat')}
                    className={`flex-1 py-1.5 px-2 rounded text-xs font-medium flex items-center justify-center gap-1.5 transition-colors ${mode === 'chat' ? 'bg-blue-100 text-blue-700' : 'text-slate-600 hover:bg-slate-100'}`}
                >
                    <Bot className="w-3.5 h-3.5" /> 写作问答
                </button>
            </div>

            {/* Sidebar Content */}
            <div className="flex-1 overflow-y-auto p-4 flex flex-col gap-4">
                {mode === 'realtime' && (
                    <div className="space-y-4">
                        <div className="text-xs text-slate-500 font-medium">发现的问题 ({suggestions.length})</div>
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
                        {!isAnalyzing && suggestions.length === 0 && (
                            <div className="text-center text-sm p-4 text-slate-500">
                                <div className="mb-4 text-xs font-medium text-blue-500 bg-blue-50 py-1 px-2 rounded-full inline-block animate-pulse">
                                    实时审核已开启
                                </div>
                                <p className="mb-4 text-xs text-slate-400">系统将在您停止输入后自动分析全文</p>
                                <button 
                                    onClick={handleRunRealtimeAnalysis}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium w-full"
                                >
                                    立即手动发起分析
                                </button>
                            </div>
                        )}
                        {suggestions.map(s => (
                            <div key={s.id} className="bg-white p-3 rounded-lg border border-red-100 shadow-sm space-y-2">
                                <div className="text-sm font-medium text-slate-700 flex flex-wrap items-center gap-2">
                                    <span className="line-through text-red-500 bg-red-50 px-1 rounded">{s.original}</span>
                                    <span className="text-slate-400">→</span>
                                    <span className="text-green-600 bg-green-50 px-1 rounded">{s.replacement}</span>
                                </div>
                                <div className="text-xs text-slate-600">{s.rationale}</div>
                                <div className="flex justify-end gap-2 pt-1 border-t border-slate-50">
                                    <button onClick={() => handleDismissSuggestion(s.id)} className="p-1.5 text-slate-400 hover:bg-slate-100 hover:text-slate-600 rounded">
                                        <X className="w-3.5 h-3.5" />
                                    </button>
                                    <button onClick={() => handleApplySuggestion(s.id)} className="p-1.5 text-green-600 hover:bg-green-50 rounded bg-green-50/50">
                                        <Check className="w-3.5 h-3.5" />
                                    </button>
                                </div>
                            </div>
                        ))}
                        {suggestions.length === 0 && !isAnalyzing && (
                            <div className="text-center text-sm text-slate-400 py-8">
                                <Sparkles className="w-8 h-8 mx-auto mb-2 opacity-20" />
                                未发现明显问题
                            </div>
                        )}
                    </div>
                )}

                {mode === 'audit' && (
                    <div className="space-y-6">
                        {!auditResult && !isAuditing ? (
                            <div className="flex flex-col items-center justify-center py-10 text-center space-y-4">
                                <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                                    <FileText className="w-8 h-8" />
                                </div>
                                <h3 className="font-bold text-slate-800">全篇深度诊断</h3>
                                <p className="text-sm text-slate-500 max-w-[200px] mx-auto">
                                    将从逻辑、格式、用词、简洁度四个维度进行全面审查并打分。
                                </p>
                                <button 
                                    onClick={handleRunAudit}
                                    className="px-6 py-2.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-bold text-sm shadow-md"
                                >
                                    开始诊断
                                </button>
                            </div>
                        ) : isAuditing ? (
                            <div className="flex flex-col items-center justify-center py-12 space-y-4">
                                <Loader2 className="w-10 h-10 animate-spin text-blue-600" />
                                <div className="text-sm font-medium text-slate-600">专家评审团正在会诊...</div>
                                <div className="w-48 h-1.5 bg-slate-100 rounded-full overflow-hidden">
                                    <div className="h-full bg-blue-500 animate-[loading_2s_infinite]"></div>
                                </div>
                            </div>
                        ) : auditError ? (
                            <div className="text-xs text-red-500 p-3 bg-red-50 rounded-lg border border-red-100 flex items-center gap-2">
                                <X className="w-3.5 h-3.5 shrink-0" />
                                <span>{auditError}</span>
                                <button onClick={handleRunAudit} className="ml-auto underline font-bold">重试</button>
                            </div>
                        ) : auditResult ? (
                            <div className="animate-in fade-in slide-in-from-bottom-4 space-y-4">
                                {/* Overall Score Card */}
                                <div className="bg-white rounded-xl border border-slate-200 p-4 shadow-sm relative overflow-hidden">
                                    <div className="absolute top-0 right-0 p-2 opacity-10">
                                        <Award className="w-16 h-16" />
                                    </div>
                                    <div className="text-xs text-slate-500 font-bold uppercase mb-1">综合评分</div>
                                    <div className="flex items-end gap-2">
                                        <div className="text-4xl font-black text-blue-600">{auditResult.score}</div>
                                        <div className="text-sm text-slate-400 mb-1">/ 100</div>
                                    </div>
                                    <p className="mt-3 text-sm text-slate-700 leading-relaxed border-t pt-2 border-slate-50 italic">
                                        "{auditResult.overall_comment}"
                                    </p>
                                </div>

                                {/* Dimensions Grid */}
                                <div className="grid grid-cols-2 gap-3">
                                    <DimensionCard label="逻辑" score={auditResult.dimensions.logic.score} icon={<Zap className="w-3.5 h-3.5" />} />
                                    <DimensionCard label="格式" score={auditResult.dimensions.format.score} icon={<Target className="w-3.5 h-3.5" />} />
                                    <DimensionCard label="用词" score={auditResult.dimensions.wording.score} icon={<Award className="w-3.5 h-3.5" />} />
                                    <DimensionCard label="简洁" score={auditResult.dimensions.brevity.score} icon={<Zap className="w-3.5 h-3.5" />} />
                                    <DimensionCard label="严谨" score={auditResult.dimensions.accuracy.score} icon={<Shield className="w-3.5 h-3.5" />} />
                                </div>

                                {/* Suggestions */}
                                <div className="space-y-2">
                                    <div className="text-xs font-bold text-slate-500 px-1">核心修改建议</div>
                                    {auditResult.suggestions.map((s, i) => (
                                        <div key={i} className="bg-amber-50 border border-amber-100 p-3 rounded-lg text-sm text-amber-900 flex gap-2">
                                            <div className="w-5 h-5 rounded-full bg-amber-200 text-amber-800 flex items-center justify-center text-[10px] font-bold shrink-0 mt-0.5">{i+1}</div>
                                            {s}
                                        </div>
                                    ))}
                                </div>

                                <button 
                                    onClick={() => setAuditResult(null)}
                                    className="w-full py-2 text-xs font-medium text-slate-500 hover:text-blue-600 transition-colors"
                                >
                                    重新诊断
                                </button>
                            </div>
                        ) : null}
                    </div>
                )}

                {mode === 'chat' && (
                    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="flex-1 p-3 overflow-y-auto space-y-3">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[90%] rounded-lg p-2.5 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none shadow-sm' : 'bg-slate-100 text-slate-800 rounded-tl-none border border-slate-200 shadow-sm'}`}>
                                        <div className="whitespace-pre-wrap">{msg.content}</div>
                                    </div>
                                </div>
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

function DimensionCard({ label, score, icon }: { label: string, score: number, icon: React.ReactNode }) {
    return (
        <div className="bg-white p-3 rounded-lg border border-slate-100 shadow-sm">
            <div className="flex items-center gap-1.5 text-slate-500 mb-1">
                {icon}
                <span className="text-[10px] font-bold uppercase tracking-wider">{label}</span>
            </div>
            <div className="flex items-baseline gap-1">
                <span className={`text-lg font-bold ${score >= 90 ? 'text-green-600' : score >= 80 ? 'text-blue-600' : 'text-amber-500'}`}>{score}</span>
                <span className="text-[10px] text-slate-300">/ 100</span>
            </div>
        </div>
    );
}
