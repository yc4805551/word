import { useState } from 'react';
import { titleCases, logicCases } from '../data/week3-data';
import type { LogicCase } from '../data/week3-data';
import { cn } from '../lib/utils';
import { CheckCircle, HelpCircle } from 'lucide-react';

export default function Week3() {
    const [activeTab, setActiveTab] = useState<'titles' | 'logic'>('titles');

    return (
        <div className="space-y-6">
            <div className="flex space-x-4 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('titles')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeTab === 'titles' ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    标题提炼训练
                </button>
                <button
                    onClick={() => setActiveTab('logic')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeTab === 'logic' ? "bg-indigo-100 text-indigo-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    三段论逻辑构建
                </button>
            </div>

            {activeTab === 'titles' ? <TitleTraining /> : <LogicTraining />}
        </div>
    );
}

function TitleTraining() {
    const [results, setResults] = useState<Record<number, number>>({}); // caseId -> optionIndex

    return (
        <div className="space-y-8">
            {titleCases.map((c) => (
                <div key={c.id} className="glass-panel p-6 rounded-lg">
                    <div className="mb-4">
                        <div className="text-xs text-slate-500 uppercase tracking-wider mb-1">原句 / 背景</div>
                        <div className="p-3 bg-slate-50 border border-slate-200 rounded text-slate-700 italic">
                            “{c.original}”
                        </div>
                    </div>

                    <div className="space-y-3">
                        <div className="text-sm font-bold text-blue-900">请选择最佳公文标题：</div>
                        {c.options.map((opt, idx) => {
                            const isSelected = results[c.id] === idx;
                            const showFeedback = isSelected;

                            return (
                                <div key={idx} className="relative">
                                    <button
                                        onClick={() => setResults(prev => ({ ...prev, [c.id]: idx }))}
                                        className={cn(
                                            "w-full text-left p-4 rounded border transition-all flex items-center justify-between",
                                            isSelected
                                                ? opt.isCorrect
                                                    ? "bg-green-50 border-green-300 ring-1 ring-green-200"
                                                    : "bg-red-50 border-red-300 ring-1 ring-red-200"
                                                : "bg-white border-slate-200 hover:bg-slate-50"
                                        )}
                                    >
                                        <span className={cn("font-medium", isSelected ? (opt.isCorrect ? "text-green-800" : "text-red-800") : "text-slate-700")}>
                                            {opt.text}
                                        </span>
                                        {isSelected && (
                                            opt.isCorrect ? <CheckCircle className="w-5 h-5 text-green-600" /> : <HelpCircle className="w-5 h-5 text-red-500" />
                                        )}
                                    </button>
                                    {showFeedback && (
                                        <div className={cn(
                                            "mt-2 text-sm p-2 rounded",
                                            opt.isCorrect ? "text-green-700 bg-green-50" : "text-red-700 bg-red-50"
                                        )}>
                                            <span className="font-bold">解析：</span>{opt.explanation}
                                        </div>
                                    )}
                                </div>
                            );
                        })}
                    </div>
                </div>
            ))}
        </div>
    );
}

function LogicTraining() {
    // Simple "Click to Order" game
    // State: caseId -> list of segment IDs in order
    const [orders, setOrders] = useState<Record<number, string[]>>({});

    const handleSelect = (caseId: number, segId: string) => {
        const currentOrder = orders[caseId] || [];
        if (currentOrder.includes(segId)) {
            // Deselect
            setOrders(prev => ({ ...prev, [caseId]: currentOrder.filter(id => id !== segId) }));
        } else {
            // Select
            setOrders(prev => ({ ...prev, [caseId]: [...currentOrder, segId] }));
        }
    };

    const checkOrder = (c: LogicCase) => {
        const userOrder = orders[c.id] || [];
        // Correct order is A, B, C (Status, Problem, Suggestion)
        // Actually in data I labeled them A, B, C for simplicity and they are in order.
        // Let's assume correct order is the order in the array (0, 1, 2) which corresponds to A, B, C ids.
        const correctIds = c.segments.map(s => s.id);
        return JSON.stringify(userOrder) === JSON.stringify(correctIds);
    };

    return (
        <div className="space-y-8">
            {logicCases.map((c) => {
                const userOrder = orders[c.id] || [];
                const isComplete = userOrder.length === c.segments.length;
                const isCorrect = isComplete && checkOrder(c);

                return (
                    <div key={c.id} className="glass-panel p-6 rounded-lg">
                        <h3 className="font-bold text-lg text-slate-800 mb-4">{c.title}</h3>
                        <p className="text-sm text-slate-500 mb-4">请按“现状-问题-建议”的逻辑顺序点击下列段落：</p>

                        <div className="grid gap-4 md:grid-cols-3 mb-6">
                            {/* Shuffle segments for display? Or just list them and let user pick order */}
                            {/* Let's just list them. Ideally should shuffle. */}
                            {[...c.segments].sort(() => Math.random() - 0.5).map((seg) => {
                                const selectedIdx = userOrder.indexOf(seg.id);
                                const isSelected = selectedIdx !== -1;

                                return (
                                    <button
                                        key={seg.id}
                                        onClick={() => handleSelect(c.id, seg.id)}
                                        className={cn(
                                            "p-4 rounded border text-left transition-all relative h-full flex flex-col",
                                            isSelected
                                                ? "bg-indigo-50 border-indigo-300 ring-2 ring-indigo-200"
                                                : "bg-white border-slate-200 hover:border-indigo-200 hover:shadow-sm"
                                        )}
                                    >
                                        {isSelected && (
                                            <div className="absolute -top-3 -right-3 w-8 h-8 bg-indigo-600 text-white rounded-full flex items-center justify-center font-bold shadow-sm z-10">
                                                {selectedIdx + 1}
                                            </div>
                                        )}
                                        <div className="text-xs font-bold text-slate-400 mb-2 uppercase tracking-wider">段落选项</div>
                                        <div className="text-slate-700 text-sm leading-relaxed">{seg.content}</div>
                                    </button>
                                );
                            })}
                        </div>

                        {isComplete && (
                            <div className={cn(
                                "p-4 rounded text-center font-bold animate-in zoom-in duration-300",
                                isCorrect ? "bg-green-100 text-green-800" : "bg-red-100 text-red-800"
                            )}>
                                {isCorrect ? "✅ 逻辑正确！符合“三段论”结构。" : "❌ 逻辑顺序有误，请重试。"}
                                {!isCorrect && (
                                    <button
                                        onClick={() => setOrders(prev => ({ ...prev, [c.id]: [] }))}
                                        className="ml-4 text-sm underline font-normal"
                                    >
                                        重置
                                    </button>
                                )}
                            </div>
                        )}
                    </div>
                );
            })}
        </div>
    );
}
