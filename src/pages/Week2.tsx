import { useState } from 'react';
import { wordPairs, errorCases } from '../data/week2-data';
import { cn } from '../lib/utils';
import { ArrowRight, AlertTriangle, BookOpen } from 'lucide-react';

export default function Week2() {
    const [activeTab, setActiveTab] = useState<'words' | 'errors'>('words');

    return (
        <div className="space-y-6">
            <div className="flex space-x-4 border-b border-slate-200 pb-2">
                <button
                    onClick={() => setActiveTab('words')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeTab === 'words' ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    词汇升级训练
                </button>
                <button
                    onClick={() => setActiveTab('errors')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors",
                        activeTab === 'errors' ? "bg-red-100 text-red-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    规范表述纠错
                </button>
            </div>

            {activeTab === 'words' ? <WordUpgrade /> : <ErrorCorrection />}
        </div>
    );
}

function WordUpgrade() {
    const [showResult, setShowResult] = useState<Record<number, boolean>>({});

    const checkAnswer = (id: number) => {
        setShowResult(prev => ({ ...prev, [id]: true }));
    };

    return (
        <div className="grid gap-6 md:grid-cols-2">
            {wordPairs.map((pair) => (
                <div key={pair.id} className="glass-panel p-6 rounded-lg space-y-4">
                    <div className="text-sm text-slate-500 mb-2">语境：{pair.context}</div>
                    <div className="flex items-center justify-between gap-4">
                        <div className="flex-1 p-3 bg-slate-50 rounded border border-slate-200 text-center text-slate-500 line-through decoration-red-400">
                            {pair.colloquial}
                        </div>
                        <ArrowRight className="text-slate-300" />
                        <div className="flex-1">
                            {!showResult[pair.id] ? (
                                <div className="grid gap-2">
                                    <button
                                        onClick={() => checkAnswer(pair.id)}
                                        className="p-2 text-sm bg-white border border-blue-200 text-blue-800 rounded hover:bg-blue-50 transition-colors"
                                    >
                                        {pair.official}
                                    </button>
                                    <button
                                        onClick={() => checkAnswer(pair.id)} // Trap option (same as colloquial but user might click)
                                        className="p-2 text-sm bg-white border border-slate-200 text-slate-600 rounded hover:bg-slate-50 transition-colors"
                                    >
                                        (保持原样)
                                    </button>
                                </div>
                            ) : (
                                <div className="p-3 bg-green-50 border border-green-200 text-green-800 rounded text-center font-bold animate-in fade-in">
                                    {pair.official}
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}

function ErrorCorrection() {
    const [revealed, setRevealed] = useState<Record<number, boolean>>({});

    return (
        <div className="space-y-4">
            {errorCases.map((c) => (
                <div key={c.id} className="glass-panel p-6 rounded-lg border-l-4 border-red-500">
                    <div className="flex items-start gap-4">
                        <div className="p-2 bg-red-100 text-red-600 rounded-full shrink-0">
                            <AlertTriangle className="w-5 h-5" />
                        </div>
                        <div className="flex-1 space-y-3">
                            <div className="text-lg font-medium text-slate-800">
                                {c.text}
                            </div>

                            {!revealed[c.id] ? (
                                <button
                                    onClick={() => setRevealed(prev => ({ ...prev, [c.id]: true }))}
                                    className="text-sm text-blue-600 hover:underline flex items-center"
                                >
                                    <BookOpen className="w-4 h-4 mr-1" /> 查看纠错解析
                                </button>
                            ) : (
                                <div className="bg-slate-50 p-4 rounded border border-slate-200 animate-in slide-in-from-top-2">
                                    <div className="flex items-center gap-2 mb-2">
                                        <span className="text-xs font-bold uppercase px-2 py-0.5 rounded bg-slate-200 text-slate-600">{c.errorType}</span>
                                        <span className="font-bold text-green-700">修正：{c.correction}</span>
                                    </div>
                                    <p className="text-sm text-slate-600">{c.explanation}</p>
                                </div>
                            )}
                        </div>
                    </div>
                </div>
            ))}
        </div>
    );
}
