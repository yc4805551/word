import { useState } from 'react';
import { useEditorContext } from './EditorProvider';
import { Sparkles, Check, X, Loader2, Bot, FileText, Send } from 'lucide-react';
import { polishText } from '../../lib/ai';
import { useSettings } from '../../context/SettingsContext';

interface Suggestion {
    id: string;
    original: string;
    replacement: string;
    rationale: string;
}

export default function AIAssistantSidebar() {
    const { editor } = useEditorContext();
    const { aiProvider, apiKeys } = useSettings();
    const [mode, setMode] = useState<'realtime' | 'audit' | 'chat'>('realtime');
    const [suggestions, setSuggestions] = useState<Suggestion[]>([]);
    const [isAnalyzing, setIsAnalyzing] = useState(false);
    const [chatInput, setChatInput] = useState('');
    const [chatHistory, setChatHistory] = useState<{role: 'user' | 'ai', content: string}[]>([
        { role: 'ai', content: '您好！我是您的公文助手。我可以帮您润色文章、审查格式或回答相关问题。' }
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

    const handleRunRealtimeAnalysis = async () => {
        if (!editor) return;
        const text = editor.getText();
        if (!text.trim()) return;

        setIsAnalyzing(true);
        try {
            // Reusing the polishText function which returns { original, polished, changes... }
            const result = await polishText(text, aiProvider, { apiKey: apiKeys[aiProvider] });
            if (result && result.changes && result.changes.length > 0) {
                const newSuggestions = result.changes.map((c: Record<string, unknown>, i: number) => ({
                    id: Date.now().toString() + i,
                    original: (c.original_word as string) || '',
                    replacement: (c.polished_word as string) || '',
                    rationale: (c.rationale as string) || 'AI 建议修改'
                })).filter((s: Suggestion) => s.original && s.replacement);

                setSuggestions(newSuggestions);
            } else if (result && result.changes?.length === 0) {
                 setSuggestions([]);
            }
        } catch (e) {
            console.error("AI Analysis failed", e);
        } finally {
            setIsAnalyzing(false);
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
                        {!isAnalyzing && suggestions.length === 0 && (
                            <div className="text-center text-sm p-4 text-slate-500">
                                <button 
                                    onClick={handleRunRealtimeAnalysis}
                                    className="px-4 py-2 bg-blue-50 text-blue-600 rounded-lg hover:bg-blue-100 transition font-medium w-full"
                                >
                                    主动发起分析
                                </button>
                                <p className="mt-4 text-xs">（目前采用手动触发，实际可调整为定时防抖触发）</p>
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
                    <div className="flex flex-col items-center justify-center h-full text-center space-y-4 p-4">
                        <div className="w-16 h-16 rounded-full bg-blue-100 flex items-center justify-center text-blue-600 mb-2">
                            <FileText className="w-8 h-8" />
                        </div>
                        <h3 className="font-bold text-slate-800">全篇深度诊断</h3>
                        <p className="text-sm text-slate-500">将调用多个智能体对排版、逻辑结构、错字、公文格式进行全面审查并打分。</p>
                        <button 
                            onClick={() => alert("深度诊断功能开发中，将集成多维打分面板。")}
                            className="px-4 py-2 bg-blue-600 text-white rounded-lg hover:bg-blue-700 transition font-medium text-sm w-full"
                        >
                            开始诊断
                        </button>
                    </div>
                )}

                {mode === 'chat' && (
                    <div className="flex flex-col h-full bg-white rounded-lg border border-slate-200 overflow-hidden">
                        <div className="flex-1 p-3 overflow-y-auto space-y-3">
                            {chatHistory.map((msg, i) => (
                                <div key={i} className={`flex ${msg.role === 'user' ? 'justify-end' : 'justify-start'}`}>
                                    <div className={`max-w-[85%] rounded-lg p-2.5 text-sm ${msg.role === 'user' ? 'bg-blue-600 text-white rounded-tr-none' : 'bg-slate-100 text-slate-800 rounded-tl-none'}`}>
                                        {msg.content}
                                    </div>
                                </div>
                            ))}
                        </div>
                        <div className="p-2 border-t border-slate-200 bg-slate-50 flex gap-2">
                            <input 
                                type="text"
                                value={chatInput}
                                onChange={e => setChatInput(e.target.value)}
                                placeholder="输入要求，例如：续写..."
                                className="flex-1 text-sm border border-slate-300 rounded-lg px-3 py-1.5 focus:outline-none focus:border-blue-500 focus:ring-1 focus:ring-blue-500"
                                onKeyDown={e => {
                                    if (e.key === 'Enter' && chatInput.trim()) {
                                        setChatHistory([...chatHistory, {role: 'user', content: chatInput}]);
                                        setChatInput('');
                                        // Mock AI response
                                        setTimeout(() => {
                                            setChatHistory(prev => [...prev, {role: 'ai', content: '我已理解您的要求。请问还需要直接插入到正文中吗？'}]);
                                        }, 1000);
                                    }
                                }}
                            />
                            <button className="p-1.5 bg-blue-600 text-white rounded-lg hover:bg-blue-700 shrink-0">
                                <Send className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
