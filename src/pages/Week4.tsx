import { useState } from 'react';
import { cn } from '../lib/utils';
import { Loader2, Sparkles, FileText, List, ChevronRight } from 'lucide-react';
import { generateOutline, type OutlineResult } from '../lib/ai';
import { useSettings } from '../context/SettingsContext';

const docTypes = [
    { id: 'plan', name: '工作方案', desc: '明确目标、步骤、保障措施' },
    { id: 'report', name: '调研报告', desc: '现状、问题、对策' },
    { id: 'summary', name: '年度总结', desc: '成绩、不足、展望' },
    { id: 'speech', name: '领导讲话', desc: '站位高、部署实、号召力强' },
];

export default function Week4() {
    const { aiProvider, apiKeys } = useSettings();
    const [theme, setTheme] = useState('');
    const [type, setType] = useState('plan');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<OutlineResult | null>(null);

    const handleGenerate = async () => {
        if (!theme.trim()) return;
        setLoading(true);
        setResult(null);

        const typeName = docTypes.find(t => t.id === type)?.name || type;
        const res = await generateOutline(theme, typeName, aiProvider, { apiKey: apiKeys[aiProvider] });
        if (res) setResult(res);
        setLoading(false);
    };

    return (
        <div className="max-w-5xl mx-auto space-y-8 animate-in fade-in">
            <div className="flex items-center space-x-3 text-slate-800">
                <List className="w-8 h-8 text-blue-600" />
                <div>
                    <h2 className="text-2xl font-bold">公文提纲搭建 (Outline Builder)</h2>
                    <p className="text-slate-500 text-sm">好的提纲是成功的一半。AI 助你快速搭建逻辑严密的一二三级标题。</p>
                </div>
            </div>

            <div className="grid lg:grid-cols-3 gap-8">
                {/* Input Panel */}
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

                {/* Result Panel */}
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

                            <div className="bg-yellow-50 px-6 py-4 border-t border-yellow-100 text-sm text-yellow-800 italic">
                                💡 逻辑点评：{result.comment}
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
        </div>
    );
}
