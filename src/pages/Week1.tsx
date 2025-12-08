import React, { useState, useEffect, useRef } from 'react';
import { levels } from '../data/typing-levels';
import { cn } from '../lib/utils';
import { Timer, Trophy, AlertCircle, RefreshCw, CheckCircle } from 'lucide-react';
import { generateText, generateQuiz, type Quiz } from '../lib/ai';
import { useSettings } from '../context/SettingsContext';

export default function Week1() {
    const [currentLevelId, setCurrentLevelId] = useState(0);
    const [customText, setCustomText] = useState<string | null>(null); // Support for custom text
    const [customQuizzes, setCustomQuizzes] = useState<Quiz[]>([]); // Support for dynamic quizzes
    const [inputVal, setInputVal] = useState('');
    const [isRunning, setIsRunning] = useState(false);
    const [startTime, setStartTime] = useState<number | null>(null);
    const [elapsed, setElapsed] = useState(0);
    const [isFinished, setIsFinished] = useState(false);
    const [showQuiz, setShowQuiz] = useState(false);
    const [quizResults, setQuizResults] = useState<Record<number, boolean>>({});

    // AI Modal State
    const [showAiModal, setShowAiModal] = useState(false);
    const [aiTopic, setAiTopic] = useState('');
    const [isGenerating, setIsGenerating] = useState(false);

    // Global Settings
    const { aiProvider, apiKeys } = useSettings();

    const inputRef = useRef<HTMLTextAreaElement>(null);
    const fileInputRef = useRef<HTMLInputElement>(null);
    const timerRef = useRef<number | null>(null);

    const currentLevel = levels.find(l => l.id === currentLevelId) || levels[0];
    const targetText = customText || currentLevel.content; // Use custom text if available
    const activeQuizzes = customText ? customQuizzes : currentLevel.quizzes;

    // Timer Logic
    useEffect(() => {
        if (isRunning) {
            timerRef.current = window.setInterval(() => {
                if (startTime) {
                    setElapsed(Date.now() - startTime);
                }
            }, 1000);
        } else {
            if (timerRef.current) clearInterval(timerRef.current);
        }
        return () => {
            if (timerRef.current) clearInterval(timerRef.current);
        };
    }, [isRunning, startTime]);

    const handleInput = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
        const val = e.target.value;
        setInputVal(val);

        if (!isRunning && val.length > 0 && !isFinished) {
            setIsRunning(true);
            setStartTime(Date.now());
        }

        // Smarter completion check:
        // 1. Length must be at least target length.
        // 2. Hanzi count must be at least target Hanzi count (to prevent early finish on Pinyin/English).
        // 3. OR if target has no Hanzi (English text), fallback to length check.
        const inputHanziCount = (val.match(/[\u4e00-\u9fa5]/g) || []).length;
        const targetHanziCount = (targetText.match(/[\u4e00-\u9fa5]/g) || []).length;

        const isLengthReached = val.length >= targetText.length;
        const isHanziReached = targetHanziCount > 0 ? inputHanziCount >= targetHanziCount : true;

        if (isLengthReached && isHanziReached) {
            finishTest();
        }
    };

    const finishTest = () => {
        setIsRunning(false);
        setIsFinished(true);
        setShowQuiz(true);
    };

    const resetTest = () => {
        setIsRunning(false);
        setIsFinished(false);
        setShowQuiz(false);
        setStartTime(null);
        setElapsed(0);
        setInputVal('');
        setQuizResults({});
        if (inputRef.current) inputRef.current.focus();
    };

    const switchLevel = (id: number) => {
        setCurrentLevelId(id);
        setCustomText(null); // Clear custom text when switching levels
        setCustomQuizzes([]);
        resetTest();
    };

    // File Import Logic
    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const text = event.target?.result as string;
            if (text) {
                setCustomText(text);
                resetTest();
                // Generate quiz for imported text
                try {
                    const quizzes = await generateQuiz(text, aiProvider, { apiKey: apiKeys[aiProvider] });
                    setCustomQuizzes(quizzes);
                } catch (error) {
                    alert("生成失败，请检查网络或 API 配置。\n" + (error instanceof Error ? error.message : String(error)));
                }
            }
        };
        reader.readAsText(file);
    };

    const handleAiGenerate = async () => {
        if (!aiTopic.trim()) return;
        setIsGenerating(true);
        try {
            const text = await generateText(aiTopic, aiProvider, { apiKey: apiKeys[aiProvider] });
            setCustomText(text);

            // Generate quiz for the generated text
            const quizzes = await generateQuiz(text, aiProvider, { apiKey: apiKeys[aiProvider] });
            setCustomQuizzes(quizzes);

            setShowAiModal(false);
            resetTest();
        } catch (error) {
            alert("生成失败: " + (error instanceof Error ? error.message : String(error)));
        } finally {
            setIsGenerating(false);
        }
    };

    // Stats
    // Count Hanzi (Chinese characters) specifically for "Hanzi Count"
    const hanziCount = (inputVal.match(/[\u4e00-\u9fa5]/g) || []).length;

    // For WPM, we usually count all characters in the input, but user requested "Hanzi based".
    // If we strictly count Hanzi for speed, it might be lower than expected if they type punctuation.
    // Let's stick to total length for "Speed" but label it clearly, or maybe use hanziCount if strict.
    // "1打字统计是以汉字为主的" -> Let's use total length but display "字数" (Hanzi Count) dynamically.
    const wpm = startTime && elapsed > 0 ? Math.round((inputVal.length / (elapsed / 60000))) : 0;

    let errorCount = 0;
    // Calculate accuracy
    for (let i = 0; i < inputVal.length; i++) {
        if (i < targetText.length && inputVal[i] !== targetText[i]) {
            errorCount++;
        }
    }

    const accuracy = inputVal.length > 0 ? Math.round(((inputVal.length - errorCount) / inputVal.length) * 100) : 100;

    const formatTime = (ms: number) => {
        const sec = Math.floor(ms / 1000);
        const m = Math.floor(sec / 60);
        const s = sec % 60;
        return `${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
    };

    return (
        <div className="flex flex-col md:flex-row gap-6 h-[calc(100vh-140px)]">
            {/* Sidebar: Level Selection & Tools */}
            <aside className="w-full md:w-1/4 space-y-4 overflow-y-auto pr-2 flex flex-col">
                <div className="glass-panel p-4 rounded-lg flex-1 overflow-y-auto min-h-[200px]">
                    <h3 className="font-bold text-blue-900 mb-3 border-b border-slate-200 pb-2">训练科目选择</h3>
                    <div className="space-y-2">
                        {levels.map((l) => (
                            <button
                                key={l.id}
                                onClick={() => switchLevel(l.id)}
                                className={cn(
                                    "w-full text-left px-4 py-3 rounded border transition-all text-sm",
                                    currentLevelId === l.id && !customText
                                        ? "bg-blue-50 border-blue-200 text-blue-800 font-medium ring-1 ring-blue-200"
                                        : "bg-white border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <div className="flex justify-between items-center">
                                    <span>{l.title.split('：')[0]}</span>
                                    {currentLevelId === l.id && !customText && <span className="text-xs bg-blue-200 text-blue-800 px-1 rounded">当前</span>}
                                </div>
                                <span className="block text-xs text-slate-500 font-normal mt-1 truncate">{l.title.split('：')[1]}</span>
                            </button>
                        ))}
                    </div>

                    {/* Custom Tools */}
                    <div className="mt-6 pt-4 border-t border-slate-200 space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-wider">自定义训练</h4>

                        <button
                            onClick={() => fileInputRef.current?.click()}
                            className={cn(
                                "w-full flex items-center justify-center space-x-2 px-4 py-2 rounded border border-dashed border-slate-300 text-slate-600 hover:bg-slate-50 hover:border-blue-300 transition-all text-sm",
                                customText && "bg-blue-50 border-blue-300 text-blue-800"
                            )}
                        >
                            <span>📂 导入文章 (TXT)</span>
                        </button>
                        <input
                            type="file"
                            ref={fileInputRef}
                            className="hidden"
                            accept=".txt"
                            onChange={handleFileUpload}
                        />

                        <button
                            onClick={() => setShowAiModal(true)}
                            className="w-full flex items-center justify-center space-x-2 px-4 py-2 rounded bg-gradient-to-r from-purple-500 to-indigo-600 text-white hover:shadow-md transition-all text-sm"
                        >
                            <span>✨ AI 生成范文</span>
                        </button>
                    </div>
                </div>

                {/* Stats Panel */}
                <div className="glass-panel p-4 rounded-lg shrink-0">
                    <div className="grid grid-cols-2 gap-3 mb-4">
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 flex items-center gap-1"><Timer className="w-3 h-3" /> 用时</div>
                            <div className="text-xl font-mono font-bold text-blue-700">{formatTime(elapsed)}</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 flex items-center gap-1"><RefreshCw className="w-3 h-3" /> 速度 (字/分)</div>
                            <div className="text-xl font-mono font-bold text-blue-700">{wpm}</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 flex items-center gap-1">汉字统计</div>
                            <div className="text-xl font-mono font-bold text-slate-700">{hanziCount}</div>
                        </div>
                        <div className="bg-slate-50 p-2 rounded border border-slate-100">
                            <div className="text-xs text-slate-500 flex items-center gap-1"><Trophy className="w-3 h-3" /> 准确率</div>
                            <div className={cn("text-xl font-mono font-bold", accuracy >= 95 ? "text-green-600" : "text-orange-500")}>
                                {accuracy}%
                            </div>
                        </div>
                    </div>
                    <button onClick={resetTest} className="w-full py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-sm font-medium transition-colors">
                        重置考场
                    </button>
                </div>
            </aside>

            {/* Main Typing Area */}
            <section className="w-full md:w-3/4 flex flex-col space-y-4 relative">
                {/* Target Text Display */}
                <div className="glass-panel p-6 rounded-lg min-h-[160px] relative overflow-y-auto max-h-[300px]">
                    <div className="absolute top-2 right-4 text-xs text-slate-400 select-none">
                        {customText ? "自定义范文" : "参考范文"}
                    </div>
                    <div className="text-lg leading-9 tracking-wide text-slate-400 select-none official-font whitespace-pre-wrap">
                        {targetText.split('').map((char, idx) => {
                            let className = "";
                            if (idx < inputVal.length) {
                                className = inputVal[idx] === char
                                    ? "text-green-700 bg-green-50"
                                    : "text-red-700 bg-red-50 underline decoration-red-400";
                            } else if (idx === inputVal.length) {
                                className = "border-b-2 border-blue-500 bg-blue-50 text-slate-800";
                            }
                            return <span key={idx} className={className}>{char}</span>;
                        })}
                    </div>
                </div>

                {/* Input Area */}
                <textarea
                    ref={inputRef}
                    value={inputVal}
                    onChange={handleInput}
                    disabled={isFinished}
                    className="w-full h-48 p-6 rounded-lg border border-slate-300 shadow-inner focus:ring-2 focus:ring-blue-500 focus:border-blue-500 outline-none text-lg leading-9 tracking-wide resize-none official-font bg-white text-slate-800 disabled:bg-slate-50 disabled:text-slate-500"
                    placeholder="点击此处开始录入，计时将自动开始..."
                    spellCheck={false}
                />

                {/* Result Overlay */}
                {showQuiz && (
                    <div className="absolute inset-0 bg-white/95 backdrop-blur-md z-20 rounded-lg flex flex-col p-6 overflow-y-auto animate-in fade-in zoom-in-95 duration-300">
                        <div className="flex items-center space-x-3 mb-6 border-b border-slate-100 pb-4">
                            <div className="w-10 h-10 bg-green-100 text-green-600 rounded-full flex items-center justify-center">
                                <CheckCircle className="w-6 h-6" />
                            </div>
                            <div>
                                <h2 className="text-2xl font-bold text-slate-800">录入完成</h2>
                                <p className="text-slate-500">最终速度: <span className="font-bold text-blue-600">{wpm}</span> 字/分 | 准确率: <span className="font-bold text-green-600">{accuracy}%</span></p>
                            </div>
                        </div>

                        {activeQuizzes.length > 0 ? (
                            <>
                                <h3 className="font-bold text-slate-700 mb-4 flex items-center"><AlertCircle className="w-4 h-4 mr-2" /> 易混词拼音辨析</h3>
                                <div className="space-y-4 mb-8">
                                    {activeQuizzes.map((q, idx) => (
                                        <div key={idx} className="bg-slate-50 p-4 rounded-lg border border-slate-200">
                                            <div className="mb-3 text-lg">
                                                请选择 <span className="font-bold text-blue-700 mx-1 px-2 py-0.5 bg-blue-100 rounded">{q.word.replace(q.focus, `[${q.focus}]`)}</span> 的正确拼音：
                                            </div>
                                            <div className="grid grid-cols-2 gap-4">
                                                {(['A', 'B'] as const).map((opt) => (
                                                    <button
                                                        key={opt}
                                                        disabled={quizResults[idx] !== undefined}
                                                        onClick={() => setQuizResults(prev => ({ ...prev, [idx]: opt === q.correct }))}
                                                        className={cn(
                                                            "py-2 px-4 rounded border text-left transition-all font-mono text-sm",
                                                            quizResults[idx] !== undefined
                                                                ? opt === q.correct
                                                                    ? "bg-green-100 border-green-300 text-green-800"
                                                                    : quizResults[idx] === false && opt !== q.correct
                                                                        ? "bg-red-50 border-red-200 text-red-400 opacity-50"
                                                                        : "bg-slate-50 border-slate-200 text-slate-400 opacity-50"
                                                                : "bg-white border-slate-300 hover:bg-blue-50 hover:border-blue-300"
                                                        )}
                                                    >
                                                        {opt}. {q.options[opt]}
                                                    </button>
                                                ))}
                                            </div>
                                            {quizResults[idx] !== undefined && (
                                                <div className={cn("mt-2 text-sm font-medium", quizResults[idx] ? "text-green-600" : "text-red-600")}>
                                                    {quizResults[idx] ? "✅ 回答正确" : "❌ 回答错误"}
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            </>
                        ) : (
                            <div className="mb-8 text-slate-500 text-center py-8 bg-slate-50 rounded-lg border border-dashed border-slate-200">
                                本文暂无拼音辨析题目
                            </div>
                        )}

                        <div className="flex space-x-4 mt-auto">
                            <button onClick={resetTest} className="px-6 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded font-medium transition-colors shadow-lg shadow-blue-200">
                                再练一次
                            </button>
                            <button onClick={() => switchLevel((currentLevelId + 1) % levels.length)} className="px-6 py-2 border border-slate-300 text-slate-600 hover:bg-slate-50 rounded font-medium transition-colors">
                                下一关
                            </button>
                        </div>
                    </div>
                )}
            </section>

            {/* AI Modal */}
            {showAiModal && (
                <div className="fixed inset-0 bg-black/50 backdrop-blur-sm z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-md w-full p-6 animate-in zoom-in-95 duration-200">
                        <h3 className="text-xl font-bold text-slate-800 mb-4">AI 智能生成公文</h3>
                        <p className="text-slate-600 text-sm mb-4">请输入公文主题，AI 将为您生成一篇标准的练习范文。</p>

                        <input
                            type="text"
                            value={aiTopic}
                            onChange={(e) => setAiTopic(e.target.value)}
                            placeholder="例如：乡村振兴、数字经济、安全生产..."
                            className="w-full p-3 border border-slate-300 rounded-lg mb-8 focus:ring-2 focus:ring-blue-500 outline-none"
                            autoFocus
                        />

                        {/* Model selector removed as per user request for centralized configuration */}

                        <div className="flex justify-end space-x-3">
                            <button
                                onClick={() => setShowAiModal(false)}
                                className="px-4 py-2 text-slate-600 hover:bg-slate-100 rounded transition-colors"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleAiGenerate}
                                disabled={isGenerating || !aiTopic.trim()}
                                className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 text-white rounded hover:shadow-lg transition-all disabled:opacity-50 flex items-center"
                            >
                                {isGenerating ? (
                                    <>
                                        <RefreshCw className="w-4 h-4 mr-2 animate-spin" /> 生成中...
                                    </>
                                ) : (
                                    "开始生成"
                                )}
                            </button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

