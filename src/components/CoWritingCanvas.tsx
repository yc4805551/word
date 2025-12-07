import { useState, useRef, useEffect } from 'react';
import { Send, Sparkles, User, Bot, ArrowLeft, PenLine, AlertCircle } from 'lucide-react';
import ReactMarkdown from 'react-markdown';
import { interactivePolish, type ChatMessage } from '../lib/ai';
import { useSettings } from '../context/SettingsContext';

interface CoWritingCanvasProps {
    initialText?: string;
    onBack?: () => void;
}

export default function CoWritingCanvas({ initialText = '', onBack }: CoWritingCanvasProps) {
    const { aiProvider, apiKeys } = useSettings();
    const [draft, setDraft] = useState(initialText);
    const [input, setInput] = useState('');
    const [messages, setMessages] = useState<ChatMessage[]>([]);
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState<string | null>(null);
    const messagesEndRef = useRef<HTMLDivElement>(null);

    // Initial greeting
    useEffect(() => {
        if (messages.length === 0) {
            setMessages([
                { role: 'assistant', content: '你好！我是你的公文写作搭档。请在左侧输入你的草稿，然后在右侧告诉我你想怎么修改（例如：“帮我润色这段话”、“使其更具政治站位”）。' }
            ]);
        }
    }, [messages.length]);

    // Auto-scroll to bottom of chat
    useEffect(() => {
        messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [messages, error]);

    const handleSend = async () => {
        if (!input.trim() && !draft.trim()) return;
        setError(null);

        const userMsg = input.trim() || "请帮我分析左侧的文本。";
        const newHistory: ChatMessage[] = [
            ...messages,
            { role: 'user', content: `【当前草稿内容】：\n${draft}\n\n【用户指令】：${userMsg}` }
        ];

        setMessages(prev => [...prev, { role: 'user', content: userMsg }]); // Show only instruction in chat UI for cleanness
        setInput('');
        setLoading(true);

        const result = await interactivePolish(newHistory, aiProvider, { apiKey: apiKeys[aiProvider] });

        if (result.success && result.data) {
            let aiContent = result.data!;
            const draftMatch = aiContent.match(/<FINAL_DRAFT>([\s\S]*?)<\/FINAL_DRAFT>/);

            if (draftMatch) {
                const newDraft = draftMatch[1].trim();
                setDraft(newDraft);
                // Optional: Remove tags from chat display if desired, or keep them to show what happened
                // For now, let's keep the raw message but maybe stripped of tags for cleaner chat, 
                // OR just notify the user.
                aiContent = aiContent.replace(/<FINAL_DRAFT>[\s\S]*?<\/FINAL_DRAFT>/, "（已自动同步到右侧画布）\n\n" + newDraft);
            }

            setMessages(prev => [...prev, { role: 'assistant', content: aiContent }]);
        } else {
            setError(result.error || "未知错误，请检查网络或API Key配置。");
        }
        setLoading(false);
    };

    return (
        <div className="h-[calc(100vh-140px)] flex flex-col md:flex-row gap-4 animate-in fade-in">
            {/* Left: AI Chat (Swapped Position) */}
            <div className="w-full md:w-1/3 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden order-2 md:order-1">
                <div className="p-3 border-b border-slate-100 bg-slate-50 font-bold text-slate-700 flex items-center gap-2">
                    <Sparkles className="w-4 h-4 text-purple-600" />
                    AI 交互助手
                </div>

                {/* Messages Area */}
                <div className="flex-1 overflow-y-auto p-4 space-y-4 bg-slate-50/50">
                    {messages.map((msg, idx) => (
                        <div key={idx} className={`flex gap-3 ${msg.role === 'user' ? 'flex-row-reverse' : ''}`}>
                            <div className={`w-8 h-8 rounded-full flex items-center justify-center flex-shrink-0 ${msg.role === 'user' ? 'bg-blue-100 text-blue-600' : 'bg-purple-100 text-purple-600'}`}>
                                {msg.role === 'user' ? <User className="w-4 h-4" /> : <Bot className="w-4 h-4" />}
                            </div>
                            <div className={`max-w-[85%] rounded-lg p-3 text-sm leading-relaxed shadow-sm overflow-x-auto ${msg.role === 'user'
                                ? 'bg-blue-600 text-white rounded-tr-none'
                                : 'bg-white text-slate-700 border border-slate-100 rounded-tl-none prose prose-sm max-w-none'
                                }`}>
                                {msg.role === 'user' ? (
                                    msg.content
                                ) : (
                                    <ReactMarkdown>{msg.content}</ReactMarkdown>
                                )}
                            </div>
                        </div>
                    ))}
                    {loading && (
                        <div className="flex gap-3">
                            <div className="w-8 h-8 bg-purple-100 text-purple-600 rounded-full flex items-center justify-center">
                                <Bot className="w-4 h-4 animate-bounce" />
                            </div>
                            <div className="bg-white px-4 py-2 rounded-lg border border-slate-100 text-xs text-slate-400 italic">
                                正在思考...
                            </div>
                        </div>
                    )}
                    {error && (
                        <div className="flex gap-3 animate-in fade-in slide-in-from-bottom-2">
                            <div className="w-8 h-8 bg-red-100 text-red-600 rounded-full flex items-center justify-center flex-shrink-0">
                                <AlertCircle className="w-4 h-4" />
                            </div>
                            <div className="bg-red-50 px-4 py-3 rounded-lg border border-red-100 text-sm text-red-800">
                                <p className="font-bold mb-1">连接失败</p>
                                <p className="text-xs opacity-90 break-all font-mono">{error}</p>
                            </div>
                        </div>
                    )}
                    <div ref={messagesEndRef} />
                </div>

                {/* Input Area */}
                <div className="p-3 bg-white border-t border-slate-100">
                    <div className="relative">
                        <textarea
                            value={input}
                            onChange={(e) => setInput(e.target.value)}
                            onKeyDown={(e) => {
                                if (e.key === 'Enter' && !e.shiftKey) {
                                    e.preventDefault();
                                    handleSend();
                                }
                            }}
                            placeholder="告诉AI如何修改...（确认后自动同步）"
                            className="w-full pl-4 pr-12 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-100 outline-none text-sm resize-none h-12 max-h-32"
                            rows={1}
                        />
                        <button
                            onClick={handleSend}
                            disabled={loading || (!input.trim() && !draft.trim())}
                            className="absolute right-2 top-2 p-1.5 bg-purple-600 text-white rounded-md hover:bg-purple-700 disabled:opacity-50 transition-colors"
                        >
                            <Send className="w-4 h-4" />
                        </button>
                    </div>
                </div>
            </div>

            {/* Right: Editor (Swapped Position) */}
            <div className="flex-1 flex flex-col bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden order-1 md:order-2">
                <div className="p-3 border-b border-slate-100 bg-slate-50 flex justify-between items-center">
                    <div className="flex items-center gap-2 text-slate-700 font-bold">
                        {onBack && (
                            <button onClick={onBack} className="hover:bg-slate-200 p-1 rounded transition-colors mr-1">
                                <ArrowLeft className="w-4 h-4" />
                            </button>
                        )}
                        <PenLine className="w-4 h-4 text-blue-600" />
                        写作画布
                    </div>
                    <div className="text-xs text-slate-400 font-mono">
                        {draft.length} chars
                    </div>
                </div>
                <textarea
                    value={draft}
                    onChange={(e) => setDraft(e.target.value)}
                    placeholder="在此输入您的公文草稿..."
                    className="flex-1 p-6 outline-none resize-none text-slate-800 leading-relaxed font-sans text-lg focus:bg-blue-50/10 transition-colors"
                />
            </div>
        </div>
    );
}

