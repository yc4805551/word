import { useState } from 'react';
import { cn } from '../lib/utils';
import { AlertCircle, CheckCircle2 } from 'lucide-react';

export default function Week5() {
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
        <div className="max-w-4xl mx-auto space-y-8">
            <div className="glass-panel p-6 rounded-lg border-l-4 border-blue-600">
                <h2 className="text-xl font-bold text-blue-900 mb-2">“冒段”特训（Lead Paragraph）</h2>
                <p className="text-slate-600">
                    冒段是信息的“门面”。请按照“缘起+分析+建议”的结构，撰写一段高密度的专报导语。
                    <br />
                    <span className="text-xs text-slate-400">目标：200-250字，涵盖核心要素。</span>
                </p>
            </div>

            <div className="grid md:grid-cols-2 gap-8">
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

                <div className="space-y-4">
                    <div className="glass-panel p-6 rounded-lg bg-slate-50 min-h-[300px] flex flex-col">
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
        </div>
    );
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
