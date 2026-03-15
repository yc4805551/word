import { useState } from 'react';
import { cn } from '../lib/utils';
import { Loader2, Sparkles, AlertCircle, Target, Star, Lightbulb, PenTool, CheckCircle2 } from 'lucide-react';
import { analyzeWinstonStar, type WinstonStarResult } from '../lib/ai';
import { useSettings } from '../context/SettingsContext';

export default function Week5() {
    const [activeTab, setActiveTab] = useState<'lead' | 'winston'>('lead');

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex space-x-4 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('lead')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'lead' ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Target className="w-4 h-4" />
                    冒段特训 (Lead Paragraph)
                </button>
                <button
                    onClick={() => setActiveTab('winston')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'winston' ? "bg-purple-100 text-purple-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Star className="w-4 h-4" />
                    温斯顿之星 (Winston's Star)
                </button>
            </div>

            {activeTab === 'lead' && <LeadParagraphTraining />}
            {activeTab === 'winston' && <WinstonStarAnalyzer />}
        </div>
    );
}

function LeadParagraphTraining() {
    const [origin, setOrigin] = useState('');
    const [analysis, setAnalysis] = useState('');
    const [suggestion, setSuggestion] = useState('');

    const fullText = `${origin} ${analysis} ${suggestion}`.trim();
    const charCount = fullText.length;

    // Simple checks
    const hasOrigin = origin.length > 10;
    const hasAnalysis = analysis.length > 20;
    const hasSuggestion = suggestion.length > 10;
    const isLengthOk = charCount >= 150 && charCount <= 300;

    return (
        <div className="grid md:grid-cols-2 gap-8 animate-in fade-in">
            <div className="space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <PenTool className="w-5 h-5 text-blue-600" />
                        结构化撰写
                    </h3>
                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">1. 缘起（一句话概括事件）</label>
                            <textarea
                                value={origin}
                                onChange={e => setOrigin(e.target.value)}
                                className="w-full p-3 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20"
                                placeholder="例如：近日，工信部印发了《...》，旨在..."
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">2. 分析（两句话提炼核心风险/趋势）</label>
                            <textarea
                                value={analysis}
                                onChange={e => setAnalysis(e.target.value)}
                                className="w-full p-3 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm h-24"
                                placeholder="例如：当前，我国XX产业面临...挑战，特别是...问题突出。"
                            />
                        </div>
                        <div>
                            <label className="block text-sm font-bold text-slate-700 mb-1">3. 建议（一句话提出关键对策）</label>
                            <textarea
                                value={suggestion}
                                onChange={e => setSuggestion(e.target.value)}
                                className="w-full p-3 rounded border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-sm h-20"
                                placeholder="例如：建议进一步强化...，加快构建...体系。"
                            />
                        </div>
                    </div>
                </div>
            </div>

            <div className="space-y-4">
                <div className="bg-slate-50 p-6 rounded-lg min-h-[300px] flex flex-col border border-slate-200 shadow-inner">
                    <div className="text-xs text-slate-400 uppercase tracking-wider mb-2">预览</div>
                    <div className="flex-1 text-slate-800 leading-relaxed indent-8 official-font text-lg">
                        {fullText || <span className="text-slate-300 italic">此处将显示您的冒段预览...</span>}
                    </div>
                    <div className="mt-4 pt-4 border-t border-slate-200 flex justify-between items-center">
                        <div className={cn("font-mono font-bold", isLengthOk ? "text-green-600" : "text-orange-500")}>
                            {charCount} 字
                        </div>
                        <div className="flex space-x-2 text-xs">
                            <StatusBadge label="缘起" active={hasOrigin} />
                            <StatusBadge label="分析" active={hasAnalysis} />
                            <StatusBadge label="建议" active={hasSuggestion} />
                        </div>
                    </div>
                </div>

                <div className="bg-yellow-50 p-4 rounded border border-yellow-200 text-sm text-yellow-800">
                    <div className="font-bold flex items-center mb-1"><AlertCircle className="w-4 h-4 mr-1" /> “三化”自查</div>
                    <ul className="list-disc list-inside space-y-1 ml-1 text-xs">
                        <li>是否犯了“学术化”（讲原理）？</li>
                        <li>是否犯了“技术化”（堆参数）？</li>
                        <li>是否犯了“新闻化”（讲故事）？</li>
                    </ul>
                </div>
            </div>
        </div>
    );
}

function WinstonStarAnalyzer() {
    const { aiProvider, apiKeys } = useSettings();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<WinstonStarResult | null>(null);

    const handleAnalyze = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);

        const res = await analyzeWinstonStar(text, aiProvider, { apiKey: apiKeys[aiProvider] });
        if (res) {
            setResult(res);
        } else {
            setError('分析请求失败，请检查 API Key 配置或网络连接。');
        }
        setLoading(false);
    };

    return (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
            {/* Input */}
            <div className="space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Star className="w-5 h-5 text-purple-600" />
                        输入待分析文本
                    </h3>
                    <div className="bg-purple-50 p-3 rounded-lg text-xs text-purple-800 mb-4 leading-relaxed border border-purple-100">
                        <strong>MIT 沟通心法：</strong> 优秀的沟通需要集齐五颗龙珠 —— Slogan (金句), Symbol (象征), Salient (重点), Surprise (惊奇), Story (故事)。
                    </div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-64 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-100 outline-none resize-none mb-4 text-base leading-relaxed"
                        placeholder="请输入一段你需要分析吸引力的文字..."
                    />
                    <button
                        onClick={handleAnalyze}
                        disabled={loading || !text.trim()}
                        className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {loading ? "正在分析五要素..." : "进行温斯顿之星分析 (Analyze)"}
                    </button>
                    {error && (
                        <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2">
                            <AlertCircle className="w-4 h-4" />
                            {error}
                        </div>
                    )}
                </div>
            </div>

            {/* Result */}
            <div className="space-y-4">
                {result ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden h-full flex flex-col animate-in slide-in-from-right-4">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">温斯顿五要素分析</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">吸引力评分</span>
                                <span className={cn(
                                    "text-xl font-bold font-mono",
                                    result.overall_score >= 80 ? "text-purple-600" : result.overall_score >= 60 ? "text-blue-600" : "text-slate-500"
                                )}>
                                    {result.overall_score}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-4">
                            <StarElementCard
                                label="Slogan (金句)"
                                icon="🗣️"
                                data={result.elements.slogan}
                            />
                            <StarElementCard
                                label="Symbol (象征)"
                                icon="⚓️"
                                data={result.elements.symbol}
                            />
                            <StarElementCard
                                label="Salient (重点)"
                                icon="📌"
                                data={result.elements.salient}
                            />
                            <StarElementCard
                                label="Surprise (惊奇)"
                                icon="🎁"
                                data={result.elements.surprise}
                            />
                            <StarElementCard
                                label="Story (故事)"
                                icon="📖"
                                data={result.elements.story}
                            />
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl min-h-[400px]">
                        <Star className="w-16 h-16 mb-4 opacity-30" />
                        <p>等待分析结果</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function StarElementCard({ label, icon, data }: { label: string, icon: string, data: { present: boolean, content: string, suggestion: string } }) {
    return (
        <div className={cn(
            "p-4 rounded-lg border flex gap-3 transition-all",
            data.present ? "bg-purple-50 border-purple-100" : "bg-slate-50 border-slate-100 opacity-80"
        )}>
            <div className="text-2xl pt-1">{icon}</div>
            <div className="flex-1">
                <div className="flex justify-between items-center mb-1">
                    <h4 className="font-bold text-slate-800 text-sm">{label}</h4>
                    {data.present ? (
                        <span className="text-[10px] bg-purple-200 text-purple-800 px-1.5 py-0.5 rounded-full font-bold">DETECTED</span>
                    ) : (
                        <span className="text-[10px] bg-slate-200 text-slate-500 px-1.5 py-0.5 rounded-full">MISSING</span>
                    )}
                </div>

                {data.present ? (
                    <p className="text-sm text-purple-900 mb-2 italic">"{data.content}"</p>
                ) : (
                    <p className="text-xs text-slate-500 mb-2">未检测到明显内容。</p>
                )}

                {data.suggestion && (
                    <div className="flex items-start gap-1 text-xs text-slate-600 bg-white/50 p-2 rounded">
                        <Lightbulb className="w-3 h-3 mt-0.5 shrink-0 text-amber-500" />
                        <span>{data.suggestion}</span>
                    </div>
                )}
            </div>
        </div>
    )
}

function StatusBadge({ label, active }: { label: string; active: boolean }) {
    return (
        <span className={cn(
            "px-2 py-1 rounded flex items-center",
            active ? "bg-green-100 text-green-700" : "bg-slate-100 text-slate-400"
        )}>
            {active && <CheckCircle2 className="w-3 h-3 mr-1" />}
            {label}
        </span>
    );
}
