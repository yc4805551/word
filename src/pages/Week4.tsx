import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Loader2, Sparkles, FileText, List, ChevronRight, ShieldCheck, AlertTriangle, Lightbulb } from 'lucide-react';
import { generateOutline, analyzeEvidence, type OutlineResult, type EvidenceCheckResult } from '../lib/ai';
import { useSettings } from '../context/SettingsContext';

const docTypes = [
    { id: 'plan', name: '工作方案', desc: '明确目标、步骤、保障措施' },
    { id: 'report', name: '调研报告', desc: '现状、问题、对策' },
    { id: 'summary', name: '年度总结', desc: '成绩、不足、展望' },
    { id: 'speech', name: '领导讲话', desc: '站位高、部署实、号召力强' },
];

export default function Week4() {
    const [activeTab, setActiveTab] = useState<'outline' | 'evidence'>('outline');

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex space-x-4 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('outline')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'outline' ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <List className="w-4 h-4" />
                    公文提纲搭建
                </button>
                <button
                    onClick={() => setActiveTab('evidence')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'evidence' ? "bg-emerald-100 text-emerald-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <ShieldCheck className="w-4 h-4" />
                    严谨论证校验 (Evidence Verifier)
                </button>
            </div>

            {activeTab === 'outline' && <OutlineBuilder />}
            {activeTab === 'evidence' && <EvidenceVerifier />}
        </div>
    );
}

function OutlineBuilder() {
    const { aiProvider, apiKeys, endpoints, models } = useSettings();
    const navigate = useNavigate();
    const [theme, setTheme] = useState('');
    const [type, setType] = useState('plan');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OutlineResult | null>(null);

    const handleGenerate = async () => {
        if (!theme.trim()) return;
        setLoading(true);
        setResult(null);

        const typeName = docTypes.find(t => t.id === type)?.name || type;
        const res = await generateOutline(theme, typeName, aiProvider, { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] });
        if (res) setResult(res);
        setLoading(false);
    };

    return (
        <div className="animate-in fade-in grid lg:grid-cols-3 gap-8">
            <div className="lg:col-span-1 space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <label className="block text-sm font-bold text-slate-700 mb-2">1. 选择文种</label>
                    <div className="grid grid-cols-2 gap-2 mb-6">
                        {docTypes.map((t) => (
                            <button
                                key={t.id}
                                onClick={() => setType(t.id)}
                                className={cn(
                                    "px-3 py-2 text-sm rounded border text-left transition-all",
                                    type === t.id
                                        ? "border-blue-500 bg-blue-50 text-blue-900 ring-1 ring-blue-500"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <div className="font-bold">{t.name}</div>
                                <div className="text-[10px] opacity-70 truncate">{t.desc}</div>
                            </button>
                        ))}
                    </div>

                    <label className="block text-sm font-bold text-slate-700 mb-2">2. 输入核心主题</label>
                    <textarea
                        value={theme}
                        onChange={(e) => setTheme(e.target.value)}
                        className="w-full h-32 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none resize-none mb-4 text-sm"
                        placeholder="例如：关于推进数字经济高质量发展的工作方案..."
                    />

                    <button
                        onClick={handleGenerate}
                        disabled={loading || !theme.trim()}
                        className="w-full py-3 bg-blue-600 text-white rounded-lg hover:bg-blue-700 disabled:opacity-50 font-bold shadow-lg shadow-blue-200 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {loading ? "AI 正在构建提纲..." : "立即生成提纲"}
                    </button>
                </div>
            </div>

            <div className="lg:col-span-2">
                {result ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden animate-in slide-in-from-right-4">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                <FileText className="w-5 h-5 text-blue-600" />
                                {result.title}
                            </h3>
                            <span className="text-xs bg-blue-100 text-blue-800 px-2 py-1 rounded font-mono">AI Generated</span>
                        </div>

                        <div className="p-8 space-y-6">
                            {result.sections.map((section, idx) => (
                                <div key={idx} className="space-y-3">
                                    <div className="flex items-start gap-2">
                                        <span className="font-bold text-lg text-blue-800 official-font flex-shrink-0">{['一', '二', '三', '四', '五'][idx]}、</span>
                                        <h4 className="font-bold text-lg text-slate-900 official-font">{section.lvl1}</h4>
                                    </div>
                                    <div className="pl-8 space-y-2">
                                        {section.lvl2.map((sub, sIdx) => (
                                            <div key={sIdx} className="flex items-start gap-2 group">
                                                <ChevronRight className="w-4 h-4 text-slate-400 mt-1 flex-shrink-0 group-hover:text-blue-500 transition-colors" />
                                                <p className="text-slate-700 text-base">{sub}</p>
                                            </div>
                                        ))}
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="bg-yellow-50 px-6 py-4 border-t border-yellow-100 text-sm text-yellow-800 italic flex justify-between items-center">
                            <span>💡 逻辑点评：{result.comment}</span>
                            <div className="flex gap-2">
                                <button
                                    onClick={() => navigator.clipboard.writeText(JSON.stringify(result, null, 2))}
                                    className="text-xs text-yellow-700 hover:text-yellow-900 underline"
                                >
                                    复制JSON
                                </button>
                                <button
                                    onClick={() => navigate('/week6', { state: { outline: result } })}
                                    className="text-white bg-blue-600 hover:bg-blue-700 px-3 py-1.5 rounded text-xs font-bold transition-colors flex items-center gap-1"
                                >
                                    <FileText className="w-3 h-3" />
                                    导出至写作画布
                                </button>
                            </div>
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl min-h-[400px]">
                        <List className="w-16 h-16 mb-4 opacity-30" />
                        <p className="text-lg">请在左侧设定主题</p>
                        <p className="text-sm">AI 将为你构建一级标题、二级标题的完整骨架</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function EvidenceVerifier() {
    const { aiProvider, apiKeys, endpoints, models } = useSettings();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [error, setError] = useState('');
    const [result, setResult] = useState<EvidenceCheckResult | null>(null);

    const handleVerify = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setError('');
        setResult(null);

        const res = await analyzeEvidence(text, aiProvider, { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] });
        if (res) {
            setResult(res);
        } else {
            setError('校验请求失败，请检查 API Key 配置或网络连接。');
        }
        setLoading(false);
    };

    return (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
            {/* Input */}
            <div className="space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-emerald-600" />
                        输入论证段落
                    </h3>
                    <div className="bg-emerald-50 p-3 rounded-lg text-xs text-emerald-800 mb-4 leading-relaxed border border-emerald-100">
                        <strong>MIT 严谨论证原则：</strong> 每一个结论都必须有充分的证据（Evidence）支撑。
                        拒绝“空泛的形容词”（如：大幅提升、显著增强），要求“具体的数据与事实”。
                    </div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-64 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-emerald-100 outline-none resize-none mb-4 text-base leading-relaxed"
                        placeholder="请输入一段你需要校验的文字，例如：
‘今年以来，我市经济发展势头良好，产业结构持续优化，企业效益大幅提升...’"
                    />
                    <button
                        onClick={handleVerify}
                        disabled={loading || !text.trim()}
                        className="w-full py-3 bg-emerald-600 text-white rounded-lg hover:bg-emerald-700 disabled:opacity-50 font-bold shadow-lg shadow-emerald-200 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <ShieldCheck className="w-5 h-5" />}
                        {loading ? "正在进行严谨性校验..." : "开始校验 (Verify Evidence)"}
                    </button>
                    {error && (
                        <div className="mt-3 text-sm text-red-600 bg-red-50 p-2 rounded border border-red-100 flex items-center gap-2">
                            <AlertTriangle className="w-4 h-4" />
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
                            <h3 className="font-bold text-slate-800">校验报告</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">严谨度评分</span>
                                <span className={cn(
                                    "text-xl font-bold font-mono",
                                    result.overall_score >= 80 ? "text-green-600" : result.overall_score >= 60 ? "text-yellow-600" : "text-red-500"
                                )}>
                                    {result.overall_score}
                                </span>
                            </div>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            {result.claims.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">
                                    <ShieldCheck className="w-12 h-12 mx-auto text-green-200 mb-2" />
                                    <p>未发现明显的证据缺失问题，论证较为严谨。</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {result.claims.map((claim, idx) => (
                                        <div key={idx} className="bg-red-50 p-4 rounded-lg border border-red-100">
                                            <div className="text-sm font-medium text-slate-700 mb-2 border-l-2 border-red-400 pl-2">
                                                "{claim.segment}"
                                            </div>
                                            <div className="flex items-start gap-2 text-xs text-red-700 mb-2">
                                                <AlertTriangle className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span className="font-bold">问题：{claim.issue}</span>
                                            </div>
                                            <div className="flex items-start gap-2 text-xs text-emerald-700 bg-white p-2 rounded border border-emerald-100">
                                                <Lightbulb className="w-4 h-4 shrink-0 mt-0.5" />
                                                <span>建议：{claim.suggestion}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl min-h-[400px]">
                        <ShieldCheck className="w-16 h-16 mb-4 opacity-30" />
                        <p>等待校验结果</p>
                    </div>
                )}
            </div>
        </div>
    );
}
