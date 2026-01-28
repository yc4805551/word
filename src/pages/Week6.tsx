import { useState, useEffect } from 'react';
import { useLocation } from 'react-router-dom';
import { cn } from '../lib/utils';
import { Mountain, FileText, Loader2, Sparkles, UserCheck, RefreshCw, ThumbsUp } from 'lucide-react';
import { checkAuthenticity, type AuthenticityResult, type OutlineResult } from '../lib/ai';
import { useSettings } from '../context/SettingsContext';

export default function Week6() {
    const [activeTab, setActiveTab] = useState<'perspective' | 'authenticity' | 'report'>('perspective');
    const location = useLocation();

    useEffect(() => {
        if (location.state?.outline) {
            setActiveTab('report');
        }
    }, [location.state]);

    return (
        <div className="max-w-6xl mx-auto space-y-6">
            <div className="flex space-x-4 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('perspective')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'perspective' ? "bg-indigo-100 text-indigo-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Mountain className="w-4 h-4" />
                    宏观站位 (Perspective)
                </button>
                <button
                    onClick={() => setActiveTab('authenticity')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'authenticity' ? "bg-rose-100 text-rose-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <UserCheck className="w-4 h-4" />
                    去伪存真 (Authenticity)
                </button>
                <button
                    onClick={() => setActiveTab('report')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'report' ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <FileText className="w-4 h-4" />
                    全篇撰写 (Report Writing)
                </button>
            </div>

            {activeTab === 'perspective' && <PerspectiveTraining />}
            {activeTab === 'authenticity' && <AuthenticityCheck />}
            {activeTab === 'report' && <ReportWriting outline={location.state?.outline} />}
        </div>
    );
}

function PerspectiveTraining() {
    return (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
            <div className="space-y-6">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <Mountain className="w-5 h-5 text-indigo-600" />
                        升维思考训练
                    </h3>
                    <p className="text-slate-600 text-sm mb-4">
                        不要只看“点”，要看“面”；不要只看“现在”，要看“未来”。练习将具体问题上升到战略高度。
                    </p>
                    <div className="space-y-4">
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-700 text-sm mb-2">案例 1: 某小区垃圾分类执行难</h4>
                            <p className="text-sm text-slate-600 mb-2">
                                <strong>低维视角：</strong> 居民素质不高，甚至乱扔垃圾。
                            </p>
                            <div className="p-3 bg-indigo-50 text-indigo-800 text-sm rounded border border-indigo-100">
                                <strong>高维视角：</strong> 这不仅是生活习惯问题，通过精细化管理提升基层社会治理能力的体现。
                            </div>
                        </div>
                        <div className="p-4 bg-slate-50 rounded-lg border border-slate-200">
                            <h4 className="font-bold text-slate-700 text-sm mb-2">案例 2: 企业因为环保问题停产</h4>
                            <p className="text-sm text-slate-600 mb-2">
                                <strong>低维视角：</strong> 影响了企业利润和税收。
                            </p>
                            <div className="p-3 bg-indigo-50 text-indigo-800 text-sm rounded border border-indigo-100">
                                <strong>高维视角：</strong> 这是新发展理念倒逼产业转型升级的阵痛期，是实现高质量发展的必由之路。
                            </div>
                        </div>
                    </div>
                </div>
            </div>
            <div className="flex items-center justify-center p-8 bg-slate-50 rounded-xl border border-slate-200">
                <p className="text-slate-400 text-sm text-center">
                    更多交互式升维训练题目开发中...<br />
                    当前请结合具体工作案例进行思考。
                </p>
            </div>
        </div>
    )
}

function AuthenticityCheck() {
    const { aiProvider, apiKeys } = useSettings();
    const [text, setText] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<AuthenticityResult | null>(null);

    const handleCheck = async () => {
        if (!text.trim()) return;
        setLoading(true);
        setResult(null);

        const res = await checkAuthenticity(text, aiProvider, { apiKey: apiKeys[aiProvider] });
        if (res) setResult(res);
        setLoading(false);
    };

    return (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
            {/* Input */}
            <div className="space-y-4">
                <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm">
                    <h3 className="font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <UserCheck className="w-5 h-5 text-rose-600" />
                        去伪存真 (真实性检测)
                    </h3>
                    <div className="bg-rose-50 p-3 rounded-lg text-xs text-rose-800 mb-4 leading-relaxed border border-rose-100">
                        <strong>MIT 核心原则：</strong> True! True! True! <br />
                        拒绝“假大空”、拒绝“正确的废话”、拒绝“为了显得专业而堆砌行话”。
                        越是真诚、具体的表达，越有力量。
                    </div>
                    <textarea
                        value={text}
                        onChange={(e) => setText(e.target.value)}
                        className="w-full h-64 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-rose-100 outline-none resize-none mb-4 text-base leading-relaxed"
                        placeholder="请输入一段你觉得可能有点'虚'的文字..."
                    />
                    <button
                        onClick={handleCheck}
                        disabled={loading || !text.trim()}
                        className="w-full py-3 bg-rose-600 text-white rounded-lg hover:bg-rose-700 disabled:opacity-50 font-bold shadow-lg shadow-rose-200 transition-all flex items-center justify-center gap-2"
                    >
                        {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5" />}
                        {loading ? "正在启动 '废话探测器'..." : "检测真实性 (Check Authenticity)"}
                    </button>
                </div>
            </div>

            {/* Result */}
            <div className="space-y-4">
                {result ? (
                    <div className="bg-white rounded-xl border border-slate-200 shadow-md overflow-hidden h-full flex flex-col animate-in slide-in-from-right-4">
                        <div className="bg-slate-50 px-6 py-4 border-b border-slate-200 flex justify-between items-center">
                            <h3 className="font-bold text-slate-800">检测报告</h3>
                            <div className="flex items-center gap-2">
                                <span className="text-xs text-slate-500">含真率 (Realness)</span>
                                <span className={cn(
                                    "text-xl font-bold font-mono",
                                    result.score >= 80 ? "text-green-600" : result.score >= 50 ? "text-yellow-600" : "text-red-500"
                                )}>
                                    {result.score}%
                                </span>
                            </div>
                        </div>

                        <div className="p-6 flex-1 overflow-y-auto space-y-6">
                            <div className="italic text-slate-600 text-sm bg-slate-50 p-3 rounded">
                                " {result.comment} "
                            </div>

                            {result.issues.length === 0 ? (
                                <div className="text-center py-10 text-slate-500">
                                    <ThumbsUp className="w-12 h-12 mx-auto text-green-200 mb-2" />
                                    <p>语言平实真诚，未发现明显废话。</p>
                                </div>
                            ) : (
                                <div className="space-y-4">
                                    {result.issues.map((issue, idx) => (
                                        <div key={idx} className="bg-rose-50 p-4 rounded-lg border border-rose-100">
                                            <div className="flex items-center justify-between mb-2">
                                                <div className="text-sm font-medium text-slate-700 border-l-2 border-rose-400 pl-2">
                                                    "{issue.segment}"
                                                </div>
                                                <span className="text-[10px] uppercase font-bold text-rose-500 bg-rose-100 px-1.5 py-0.5 rounded">
                                                    {issue.type}
                                                </span>
                                            </div>

                                            <div className="flex items-start gap-2 text-xs text-emerald-700 bg-white p-2 rounded border border-emerald-100">
                                                <RefreshCw className="w-3 h-3 shrink-0 mt-0.5" />
                                                <span>建议：{issue.suggestion}</span>
                                            </div>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl min-h-[400px]">
                        <UserCheck className="w-16 h-16 mb-4 opacity-30" />
                        <p>等待检测结果</p>
                    </div>
                )}
            </div>
        </div>
    );
}

function ReportWriting({ outline }: { outline?: OutlineResult }) {
    const [content, setContent] = useState('');

    useEffect(() => {
        if (outline) {
            const formatted = outline.sections.map((sec, i) => {
                const title = ['一', '二', '三', '四', '五'][i] + '、' + sec.lvl1;
                const subs = sec.lvl2.map((sub, j) => `  （${['一', '二', '三', '四', '五'][j]}）${sub}\n    [在此处展开论述...]`).join('\n\n');
                return `${title}\n\n${subs}`;
            }).join('\n\n');
            setContent(formatted);
        }
    }, [outline]);

    return (
        <div className="animate-in fade-in">
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-[calc(100vh-200px)] flex flex-col">
                <div className="flex justify-between items-center mb-4">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <FileText className="w-5 h-5 text-blue-600" />
                        全篇撰写画布
                    </h3>
                    <div className="text-sm text-slate-500">
                        {content.length} 字
                    </div>
                </div>
                <div className="flex-1 relative">
                    <textarea
                        value={content}
                        onChange={(e) => setContent(e.target.value)}
                        className="w-full h-full p-6 rounded-lg bg-slate-50 border border-slate-200 focus:ring-2 focus:ring-blue-100 outline-none resize-none font-mono text-base leading-relaxed"
                        placeholder="从 Week 4 导入提纲，或者直接在此开始撰写..."
                    />
                </div>
            </div>
        </div>
    )
}
