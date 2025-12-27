import { useState } from 'react';
import { cn } from '../lib/utils';
import { ArrowRight } from 'lucide-react';
import { useLocation } from 'react-router-dom';
import type { OutlineResult } from '../lib/ai';

export default function Week6() {
    const location = useLocation();
    const outline = (location.state as { outline?: OutlineResult } | null)?.outline;
    const [activeTab, setActiveTab] = useState<'perspective' | 'report'>(() => (outline ? 'report' : 'perspective'));

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="flex space-x-4 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('perspective')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeTab === 'perspective' ? "bg-purple-100 text-purple-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    宏观站位提升
                </button>
                <button
                    onClick={() => setActiveTab('report')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeTab === 'report' ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    全篇模拟撰写
                </button>
            </div>

            {activeTab === 'perspective' ? <PerspectiveTraining /> : <ReportWriting />}
        </div>
    );
}

function PerspectiveTraining() {
    const cases = [
        {
            id: 1,
            small: "某市某工厂的数据化改造",
            big: "从某地实践看制造业高质量发展的经验与启示",
            desc: "从单纯的个案描述，上升到行业发展的普遍规律和政策启示。"
        },
        {
            id: 2,
            small: "我省今年上半年出口额下降",
            big: "当前外贸形势严峻复杂，需警惕产业链外迁风险",
            desc: "透过数据表象，分析背后的深层次风险和国家安全维度的考量。"
        }
    ];

    return (
        <div className="space-y-6">
            <div className="bg-purple-50 p-4 rounded-lg border border-purple-200 text-purple-900 text-sm mb-6">
                <strong>Stand Tall:</strong> 不要只盯着“一亩三分地”，要站在国家战略高度。
            </div>

            {cases.map((c) => (
                <div key={c.id} className="glass-panel p-6 rounded-lg">
                    <div className="flex flex-col md:flex-row items-center gap-4">
                        <div className="flex-1 p-4 bg-slate-50 rounded border border-slate-200 text-center">
                            <div className="text-xs text-slate-400 mb-1">小切口 / 就事论事</div>
                            <div className="text-slate-600 font-medium">{c.small}</div>
                        </div>
                        <ArrowRight className="text-purple-400 w-6 h-6 rotate-90 md:rotate-0" />
                        <div className="flex-1 p-4 bg-purple-50 rounded border border-purple-200 text-center shadow-sm">
                            <div className="text-xs text-purple-400 mb-1">大局观 / 政治站位</div>
                            <div className="text-purple-900 font-bold text-lg official-font">{c.big}</div>
                        </div>
                    </div>
                    <div className="mt-4 text-sm text-slate-500 text-center">
                        💡 {c.desc}
                    </div>
                </div>
            ))}
        </div>
    );
}

function ReportWriting() {
    const location = useLocation();
    const outline = (location.state as { outline?: OutlineResult } | null)?.outline;
    const [text, setText] = useState(() => {
        if (!outline) return '';
        let initialDraft = `${outline.title}\n\n`;
        outline.sections.forEach((sec, idx) => {
            const num = ['一', '二', '三', '四', '五'][idx] || String(idx + 1);
            initialDraft += `${num}、${sec.lvl1}\n`;
            sec.lvl2.forEach((sub, sIdx) => {
                const subNum = ['一', '二', '三'][sIdx] || String(sIdx + 1);
                initialDraft += `  （${subNum}）${sub}\n\n`;
            });
        });
        return initialDraft;
    });

    const wordCount = text.length;

    return (
        <div className="space-y-4 h-[calc(100vh-200px)] flex flex-col">
            <div className="flex justify-between items-center">
                <h3 className="font-bold text-slate-800">专报模拟撰写</h3>
                <div className="text-sm text-slate-500">
                    字数：<span className="font-mono font-bold text-blue-600">{wordCount}</span> / 1500
                </div>
            </div>

            <textarea
                value={text}
                onChange={e => setText(e.target.value)}
                className="flex-1 w-full p-6 rounded-lg border border-slate-300 focus:ring-2 focus:ring-blue-500 outline-none text-lg leading-9 tracking-wide resize-none official-font bg-white text-slate-800 shadow-inner"
                placeholder="请在此撰写关于“人工智能”或“工业互联网”的专报...
    
建议结构：
1. 标题（有力）
2. 冒段（缘起+分析+建议，200字）
3. 正文（现状-问题-建议）"
                spellCheck={false}
            />
        </div>
    );
}
