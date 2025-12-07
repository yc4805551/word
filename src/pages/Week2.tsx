import { useState } from 'react';
import { wordPairs } from '../data/week2-data';
import { cn } from '../lib/utils';
import { ArrowRight, AlertTriangle, BookOpen, Brain, Loader2, RefreshCw, GraduationCap, Sparkles, Upload } from 'lucide-react';
import { generateArticle, analyzeAndGeneratePractice, polishText, type SmartLesson, type PolishedText } from '../lib/ai';
import { useSettings } from '../context/SettingsContext';

export default function Week2() {
    const [activeTab, setActiveTab] = useState<'words' | 'errors' | 'smart'>('words');

    return (
        <div className="space-y-6">
            <div className="flex space-x-4 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('words')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap",
                        activeTab === 'words' ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    基础词汇升级
                </button>
                <button
                    onClick={() => setActiveTab('errors')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap",
                        activeTab === 'errors' ? "bg-red-100 text-red-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    规范表述纠错
                </button>
                <button
                    onClick={() => setActiveTab('smart')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'smart' ? "bg-purple-100 text-purple-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Brain className="w-4 h-4" />
                    AI 智能训练
                </button>
            </div>

            {activeTab === 'words' && <WordUpgrade />}
            {activeTab === 'errors' && <ErrorCorrection />}
            {activeTab === 'smart' && <SmartTraining />}
        </div>
    );
}

function SmartTraining() {
    const { aiProvider, apiKeys } = useSettings();
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [article, setArticle] = useState<string>('');
    const [manualInput, setManualInput] = useState(''); // Text area input
    const [lesson, setLesson] = useState<SmartLesson | null>(null);
    const [step, setStep] = useState<'input' | 'selection' | 'study' | 'practice'>('input');
    const [answers, setAnswers] = useState<Record<number, string>>({});
    const [showResults, setShowResults] = useState(false);

    // Step 1: Generate Article
    const handleGenerateArticle = async () => {
        if (!topic.trim()) return;
        setLoading(true);
        setStep('input');
        setArticle('');
        setManualInput('');

        const result = await generateArticle(topic, aiProvider, { apiKey: apiKeys[aiProvider] });
        if (result) {
            setArticle(result);
            setStep('selection');
        }
        setLoading(false);
    };

    // Step 3: Analyze (using manual input)
    const handleAnalyze = async () => {
        const words = manualInput.split(/[,，\s\n]+/).filter(w => w.trim().length > 0);

        // Allow analyzing even if no words are selected (AI will pick)
        // if (words.length === 0) return; 

        setLoading(true);

        const result = await analyzeAndGeneratePractice(article, words, aiProvider, { apiKey: apiKeys[aiProvider] });
        if (result) {
            setLesson(result);
            setStep('study');
        }
        setLoading(false);
    };

    const startPractice = () => {
        setStep('practice');
        setAnswers({});
        setShowResults(false);
    };

    const handleCheck = () => {
        setShowResults(true);
    };

    // Helper to render article with selectable tokens - REMOVED as per instructions

    const renderPracticeText = () => {
        if (!lesson) return null;

        const parts = lesson.practice.text.split(/(______（[^）]+）)/);

        return (
            <div className="leading-loose text-lg text-slate-700">
                {parts.map((part, index) => {
                    const match = part.match(/______（([^）]+)）/);
                    if (match) {
                        const hint = match[1];
                        const blank = lesson.practice.blanks.find(b => b.hint === hint);

                        if (!blank) return <span key={index}>{part}</span>;

                        const isCorrect = answers[blank.id]?.trim() === blank.answer;

                        return (
                            <span key={index} className="inline-flex flex-col mx-1 align-bottom relative group">
                                {showResults ? (
                                    <span className={cn(
                                        "px-2 py-0.5 rounded border-b-2 font-bold transition-colors",
                                        isCorrect ? "border-green-500 text-green-700 bg-green-50" : "border-red-500 text-red-700 bg-red-50"
                                    )}>{blank.answer}</span>
                                ) : (
                                    <input
                                        type="text"
                                        className="w-24 px-2 py-0.5 text-center border-b-2 border-slate-300 focus:border-purple-500 outline-none bg-slate-50 focus:bg-white text-slate-800 rounded-t transition-colors select-text"
                                        placeholder={hint}
                                        value={answers[blank.id] || ''}
                                        onChange={(e) => setAnswers(prev => ({ ...prev, [blank.id]: e.target.value }))}
                                        autoComplete="off"
                                    />
                                )}
                            </span>
                        );
                    }
                    return <span key={index}>{part}</span>;
                })}
            </div>
        );
    };

    return (
        <div className="space-y-6">
            {/* Input Section */}
            {step === 'input' && (
                <div className="bg-gradient-to-r from-purple-50 to-indigo-50 p-6 rounded-xl border border-purple-100 animate-in fade-in">
                    <div className="max-w-xl mx-auto space-y-4">
                        <h3 className="text-lg font-semibold text-purple-900 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            第一步：输入主题生成范文
                        </h3>
                        <div className="flex gap-2">
                            <input
                                type="text"
                                value={topic}
                                onChange={(e) => setTopic(e.target.value)}
                                placeholder="输入公文主题，例如：乡村振兴、科技创新"
                                className="flex-1 px-4 py-2 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-200 outline-none shadow-sm"
                                onKeyDown={(e) => e.key === 'Enter' && handleGenerateArticle()}
                            />
                            <button
                                onClick={handleGenerateArticle}
                                disabled={loading || !topic.trim()}
                                className="px-6 py-2 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-sm flex items-center gap-2 font-medium"
                            >
                                {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <RefreshCw className="w-4 h-4" />}
                                生成
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Selection Phase (Manual Input) */}
            {step === 'selection' && article && (
                <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm animate-in fade-in space-y-6">
                    <div className="flex justify-between items-center border-b border-slate-100 pb-4">
                        <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                            <BookOpen className="w-5 h-5 text-blue-500" />
                            第二步：输入你想学的词
                        </h4>
                        <button
                            onClick={() => { setStep('input'); setTopic(''); }}
                            className="text-slate-400 hover:text-slate-600 text-sm"
                        >
                            重置
                        </button>
                    </div>

                    <div className="bg-slate-50 p-6 rounded-lg border border-slate-100 text-slate-700 leading-relaxed mb-4">
                        {article}
                    </div>

                    <div className="space-y-4">
                        <div>
                            <label className="block text-sm font-medium text-slate-700 mb-1">
                                请输入文中或相关的关键词（用逗号或空格分隔）：
                            </label>
                            <textarea
                                value={manualInput}
                                onChange={(e) => setManualInput(e.target.value)}
                                placeholder="例如：强链补链，赋能，抓手..."
                                className="w-full px-4 py-3 rounded-lg border border-purple-200 focus:ring-2 focus:ring-purple-200 outline-none h-20 resize-none"
                            />
                        </div>

                        <div className="flex justify-center">
                            <button
                                onClick={handleAnalyze}
                                disabled={loading}
                                className="px-8 py-3 bg-purple-600 text-white rounded-full hover:bg-purple-700 disabled:opacity-50 transition-all font-bold shadow-md hover:shadow-lg flex items-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Brain className="w-5 h-5" />}
                                {loading ? "AI 正在分析..." : "分析并举一反三"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Study Phase (Analysis) */}
            {step === 'study' && lesson && (
                <div className="space-y-6 animate-in fade-in slide-in-from-bottom-4">
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-sm">
                        <div className="flex justify-between items-center mb-4">
                            <h4 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-yellow-500" />
                                第三步：词汇深度解析与举一反三
                            </h4>
                            <button
                                onClick={() => setStep('selection')}
                                className="text-sm text-purple-600 hover:underline"
                            >
                                返回选词
                            </button>
                        </div>

                        <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3 mb-8">
                            {lesson.keywords.map((kw, idx) => (
                                <div key={idx} className="p-4 rounded-lg border border-purple-100 bg-purple-50/50 hover:bg-purple-50 transition-colors">
                                    <div className="flex justify-between items-start mb-2">
                                        <span className="text-lg font-bold text-purple-800">{kw.word}</span>
                                        <span className="text-xs bg-purple-200 text-purple-800 px-2 py-0.5 rounded-full">{kw.meaning}</span>
                                    </div>
                                    <p className="text-xs text-slate-500 mb-2">{kw.analysis}</p>
                                    <p className="text-xs text-slate-600 italic border-l-2 border-purple-300 pl-2 mb-3">
                                        "{kw.example}"
                                    </p>

                                    {/* Expansion Section */}
                                    {kw.expansion && kw.expansion.length > 0 && (
                                        <div className="pt-3 border-t border-purple-200 mt-2">
                                            <p className="text-xs font-bold text-purple-700 mb-1 flex items-center gap-1">
                                                <Sparkles className="w-3 h-3" /> 举一反三：
                                            </p>
                                            <div className="flex flex-wrap gap-1">
                                                {kw.expansion.map((ex, i) => (
                                                    <span key={i} className="text-xs bg-white text-purple-600 px-1.5 py-0.5 rounded border border-purple-100">
                                                        {ex}
                                                    </span>
                                                ))}
                                            </div>
                                        </div>
                                    )}
                                </div>
                            ))}
                        </div>

                        <div className="text-center">
                            <button
                                onClick={startPractice}
                                className="px-8 py-3 bg-green-600 text-white rounded-full hover:bg-green-700 transition-all font-bold shadow-md hover:shadow-lg flex items-center gap-2 mx-auto"
                            >
                                <GraduationCap className="w-5 h-5" />
                                掌握了，开始实战测试
                                <ArrowRight className="w-4 h-4" />
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* Practice Phase */}
            {step === 'practice' && lesson && (
                <div className="glass-panel p-8 rounded-xl space-y-8 animate-in slide-in-from-right-4">
                    <h4 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                        <GraduationCap className="w-5 h-5 text-green-600" />
                        第四步：实战演练（填空）
                    </h4>
                    <div className="prose prose-slate max-w-none">
                        {renderPracticeText()}
                    </div>

                    <div className="flex justify-center pt-4 border-t border-slate-100 gap-4">
                        {!showResults ? (
                            <>
                                <button
                                    onClick={() => setStep('study')}
                                    className="px-6 py-2.5 text-slate-600 hover:bg-slate-100 rounded-full transition-all font-medium"
                                >
                                    返回复习
                                </button>
                                <button
                                    onClick={handleCheck}
                                    className="px-8 py-2.5 bg-slate-800 text-white rounded-full hover:bg-slate-700 transition-all font-medium shadow-sm active:scale-95"
                                >
                                    检查答案
                                </button>
                            </>
                        ) : (
                            <div className="text-center w-full">
                                <p className="text-green-600 font-bold mb-4">完成训练！</p>
                                <button
                                    onClick={() => { setStep('input'); setTopic(''); }}
                                    className="text-purple-600 hover:text-purple-700 font-medium text-sm hover:underline"
                                >
                                    换个主题再练一次
                                </button>
                            </div>
                        )}
                    </div>
                </div>
            )}
        </div>
    );
}

import myVocabularyRaw from '../data/my-vocabulary.txt?raw';
import { generateScenarioPractice, type ScenarioPractice } from '../lib/ai';

// ... (inside Week2.tsx)

function WordUpgrade() {
    const [subTab, setSubTab] = useState<'core' | 'mine'>('core');
    const [myWords, setMyWords] = useState<string[]>([]);
    const [scenarioWord, setScenarioWord] = useState<string | null>(null);
    const { vocabList, addToVocab } = useSettings();

    // Load custom vocabulary
    useState(() => {
        if (myVocabularyRaw) {
            const lines = myVocabularyRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            setMyWords(lines);
        }
    });

    return (
        <div className="space-y-6">
            {/* Sub-tabs */}
            <div className="flex justify-center space-x-1 bg-slate-100 p-1 rounded-lg w-fit mx-auto">
                <button
                    onClick={() => setSubTab('core')}
                    className={cn(
                        "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                        subTab === 'core' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    核心高频词 ({wordPairs.length})
                </button>
                <button
                    onClick={() => setSubTab('mine')}
                    className={cn(
                        "px-4 py-1.5 rounded-md text-sm font-medium transition-all",
                        subTab === 'mine' ? "bg-white text-purple-700 shadow-sm" : "text-slate-500 hover:text-slate-700"
                    )}
                >
                    专属词库 ({myWords.length})
                </button>
            </div>

            {/* Content Area */}
            {subTab === 'core' ? (
                <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                    {wordPairs.map((pair) => (
                        <div key={pair.id} className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                            <h3 className="text-xl font-bold text-slate-800 mb-2">{pair.colloquial}</h3>
                            <p className="text-sm text-slate-500 mb-4 h-10">{pair.context}</p>
                            <button
                                onClick={() => setScenarioWord(pair.colloquial)}
                                className="w-full py-2 bg-slate-50 text-purple-600 rounded-lg hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors flex items-center justify-center gap-2 border border-slate-100 hover:border-purple-200"
                            >
                                <Sparkles className="w-4 h-4" />
                                场景模拟训练
                            </button>
                        </div>
                    ))}
                </div>
            ) : (
                <div className="space-y-6">
                    <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex items-start gap-3">
                        <AlertTriangle className="w-5 h-5 shrink-0" />
                        <div className="flex-1">
                            <p className="font-bold mb-1">如何添加我的词汇？</p>
                            <p className="mb-2">
                                方法一：修改本地文件 <code>src/data/my-vocabulary.txt</code>。
                            </p>
                            <p className="mb-2">
                                方法二：直接上传 txt 文件 (每行一个词)。
                            </p>
                            <label className="inline-flex items-center px-4 py-2 bg-white border border-yellow-300 rounded-lg cursor-pointer hover:bg-yellow-100 transition-colors text-yellow-900 font-bold shadow-sm">
                                <Upload className="w-4 h-4 mr-2" />
                                上传本地词汇 .txt
                                <input
                                    type="file"
                                    accept=".txt"
                                    className="hidden"
                                    onChange={(e) => {
                                        const file = e.target.files?.[0];
                                        if (file) {
                                            const reader = new FileReader();
                                            reader.onload = (ev) => {
                                                const text = ev.target?.result as string;
                                                const words = text.split('\n').map(l => l.trim()).filter(l => l.length > 0);
                                                addToVocab(words);
                                                alert(`成功导入 ${words.length} 个词汇！`);
                                            };
                                            reader.readAsText(file);
                                        }
                                    }}
                                />
                            </label>
                        </div>
                    </div>

                    <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                        {/* Merge local file words with context words */}
                        {Array.from(new Set([...myWords, ...vocabList])).map((word, idx) => (
                            <div key={idx} className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                                <div className="flex items-start justify-between">
                                    <h3 className="text-xl font-bold text-slate-800 mb-2">{word}</h3>
                                    <span className="text-[10px] uppercase bg-slate-100 text-slate-500 px-2 py-0.5 rounded-full">Custom</span>
                                </div>
                                <button
                                    onClick={() => setScenarioWord(word)}
                                    className="w-full mt-4 py-2 bg-slate-50 text-purple-600 rounded-lg hover:bg-purple-50 hover:text-purple-700 font-medium transition-colors flex items-center justify-center gap-2 border border-slate-100 hover:border-purple-200"
                                >
                                    <Sparkles className="w-4 h-4" />
                                    消灭口头禅
                                </button>
                            </div>
                        ))}
                        {Array.from(new Set([...myWords, ...vocabList])).length === 0 && (
                            <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                                暂无专属词汇，请上传 txt 或编辑文件
                            </div>
                        )}
                    </div>
                </div>
            )}

            {/* AI Scenario Modal */}
            {scenarioWord && (
                <ScenarioPracticeModal
                    word={scenarioWord}
                    onClose={() => setScenarioWord(null)}
                />
            )}
        </div>
    );
}

function ScenarioPracticeModal({ word, onClose }: { word: string, onClose: () => void }) {
    const { aiProvider, apiKeys } = useSettings();
    const [loading, setLoading] = useState(true);
    const [data, setData] = useState<ScenarioPractice | null>(null);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<'testing' | 'success' | 'fail'>('testing');

    // Initial load
    useState(() => {
        generateScenarioPractice(word, aiProvider, { apiKey: apiKeys[aiProvider] }).then(res => {
            setData(res);
            setLoading(false);
        });
    });

    const check = () => {
        if (!data) return;
        // Simple fuzzy match check
        const isMatch = data.target_possibilities.some(t => input.includes(t) || t.includes(input));
        if (isMatch) {
            setStatus('success');
        } else {
            setStatus('fail');
        }
    };

    return (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4 animate-in fade-in backdrop-blur-sm">
            <div className="bg-white rounded-2xl max-w-lg w-full p-8 shadow-2xl space-y-6 relative overflow-hidden">
                <button
                    onClick={onClose}
                    className="absolute top-4 right-4 text-slate-400 hover:text-slate-600 w-8 h-8 flex items-center justify-center rounded-full hover:bg-slate-100 transition-colors"
                >✕</button>

                <h4 className="font-bold text-xl flex items-center gap-2 text-purple-900 border-b border-purple-50 pb-4">
                    <Sparkles className="w-6 h-6 text-purple-600" />
                    场景模拟模拟器
                </h4>

                {loading ? (
                    <div className="py-12 flex flex-col items-center gap-4 text-slate-500">
                        <Loader2 className="w-10 h-10 animate-spin text-purple-600" />
                        <p>AI 正在构建“{word}”的专属训练场...</p>
                    </div>
                ) : data ? (
                    <div className="space-y-6">
                        {/* Scenario Context */}
                        <div className="bg-blue-50 p-4 rounded-xl border border-blue-100 text-blue-900">
                            <span className="text-xs font-bold uppercase tracking-wider text-blue-500 mb-1 block">Context / 当前场景</span>
                            <p className="font-medium text-lg">{data.scenario}</p>
                        </div>

                        {/* Problem Sentence */}
                        <div className="space-y-2">
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Problem / 问题表述</span>
                            <div className="text-lg text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {data.sentence.split(data.hint).map((part, i, arr) => (
                                    <span key={i}>
                                        {part}
                                        {i < arr.length - 1 && (
                                            <span className="inline-block mx-1 font-bold text-red-500 border-b-2 border-red-300 px-1 bg-red-50 rounded">
                                                {data.hint}
                                            </span>
                                        )}
                                    </span>
                                ))}
                            </div>
                        </div>

                        {/* User Action */}
                        <div className="pt-2">
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                请在该语境下，输入一个更专业的词来替换它：
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={e => e.key === 'Enter' && check()}
                                    className={cn(
                                        "flex-1 px-4 py-3 rounded-xl border outline-none focus:ring-4 transition-all text-lg",
                                        status === 'fail'
                                            ? "border-red-300 focus:ring-red-100 bg-red-50"
                                            : status === 'success'
                                                ? "border-green-300 focus:ring-green-100 bg-green-50"
                                                : "border-purple-200 focus:ring-purple-100"
                                    )}
                                    placeholder="输入你的答案..."
                                    disabled={status === 'success'}
                                />
                                <button
                                    onClick={check}
                                    disabled={!input.trim() || status === 'success'}
                                    className="px-6 py-3 bg-purple-600 text-white rounded-xl hover:bg-purple-700 disabled:opacity-50 font-bold shadow-lg shadow-purple-200 transition-all active:scale-95"
                                >
                                    提交
                                </button>
                            </div>
                        </div>

                        {/* Feedback */}
                        {status === 'success' && (
                            <div className="animate-in zoom-in slide-in-from-bottom-4 p-4 bg-green-100 text-green-800 rounded-xl border border-green-200">
                                <div className="flex items-center gap-2 font-bold text-lg mb-1">
                                    <GraduationCap className="w-6 h-6" />
                                    回答正确！
                                </div>
                                <p className="text-sm opacity-90">{data.explanation}</p>
                            </div>
                        )}

                        {status === 'fail' && (
                            <div className="animate-in shake p-4 bg-red-50 text-red-800 rounded-xl border border-red-100">
                                <p className="font-bold flex items-center gap-2">
                                    <AlertTriangle className="w-4 h-4" />
                                    思路不错，但还有更精准的词
                                </p>
                                <div className="mt-2 text-sm">
                                    高手通常用：
                                    <div className="flex gap-2 mt-1 flex-wrap">
                                        {data.target_possibilities.map(t => (
                                            <span key={t} className="px-2 py-1 bg-white border border-red-200 rounded shadow-sm text-xs font-bold">
                                                {t}
                                            </span>
                                        ))}
                                    </div>
                                </div>
                            </div>
                        )}
                    </div>
                ) : (
                    <div className="text-center py-8 text-red-500">连接超时，请重试</div>
                )}
            </div>
        </div>
    );
}


// Refactored ErrorCorrection Component for AI Polishing
function ErrorCorrection() {
    const { aiProvider, apiKeys } = useSettings();
    const [draft, setDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<PolishedText | null>(null);

    const handlePolish = async () => {
        if (!draft.trim()) return;
        setLoading(true);
        const polished = await polishText(draft, aiProvider, { apiKey: apiKeys[aiProvider] });
        if (polished) {
            setResult(polished);
        }
        setLoading(false);
    };

    return (
        <div className="space-y-6">
            <div className="bg-gradient-to-r from-red-50 to-orange-50 p-6 rounded-xl border border-red-100">
                <div className="max-w-3xl mx-auto space-y-4">
                    <h3 className="text-lg font-semibold text-red-900 flex items-center gap-2">
                        <AlertTriangle className="w-5 h-5 text-red-600" />
                        AI 规范表述润色（工信部风格大师）
                    </h3>

                    <textarea
                        value={draft}
                        onChange={(e) => setDraft(e.target.value)}
                        placeholder="在此粘贴您的公文草稿（例如：我们要做大做强数字经济...）"
                        className="w-full px-4 py-3 rounded-lg border border-red-200 focus:ring-2 focus:ring-red-200 outline-none h-32 resize-none"
                    />

                    <div className="flex justify-end">
                        <button
                            onClick={handlePolish}
                            disabled={loading || !draft.trim()}
                            className="px-6 py-2 bg-red-600 text-white rounded-lg hover:bg-red-700 disabled:opacity-50 transition-all shadow-sm flex items-center gap-2 font-medium"
                        >
                            {loading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                            {loading ? "正在升维润色..." : "立即润色"}
                        </button>
                    </div>
                </div>
            </div>

            {/* Results Display */}
            {result && (
                <div className="space-y-6 animate-in slide-in-from-bottom-4">
                    {/* Comparison Card */}
                    <div className="bg-white p-6 rounded-lg border border-slate-200 shadow-xl">
                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="p-4 bg-slate-50 rounded-lg border border-slate-100">
                                <h4 className="text-sm font-bold text-slate-500 mb-2 uppercase tracking-wider">Original / 原文</h4>
                                <p className="text-slate-600 leading-relaxed text-sm">{result.original}</p>
                            </div>
                            <div className="p-4 bg-green-50 rounded-lg border border-green-100 relative overflow-hidden">
                                <div className="absolute top-0 right-0 p-1 bg-green-200 rounded-bl-lg text-[10px] font-bold text-green-800">MIIT STYLE</div>
                                <h4 className="text-sm font-bold text-green-700 mb-2 uppercase tracking-wider">Polished / 润色后</h4>
                                <p className="text-slate-800 font-medium leading-relaxed">{result.polished}</p>
                            </div>
                        </div>
                    </div>

                    {/* Style Analysis */}
                    <div className="bg-white p-6 rounded-lg border border-purple-100 shadow-md">
                        <h4 className="text-lg font-bold text-purple-900 mb-4 flex items-center gap-2">
                            <Brain className="w-5 h-5 text-purple-600" />
                            工信部语言风格解析
                        </h4>

                        <div className="space-y-4">
                            {result.changes.map((change, idx) => (
                                <div key={idx} className="flex gap-4 items-start p-3 hover:bg-slate-50 rounded transition-colors border-b border-slate-50 last:border-0">
                                    <div className="flex-1">
                                        <div className="flex items-center gap-2 mb-1">
                                            <span className="line-through text-slate-400 text-xs">{change.original_word}</span>
                                            <ArrowRight className="w-3 h-3 text-slate-300" />
                                            <span className="font-bold text-green-700 text-sm">{change.polished_word}</span>
                                        </div>
                                        <p className="text-xs text-slate-600 leading-normal">
                                            <span className="font-semibold text-purple-700">解析：</span>
                                            {change.rationale}
                                        </p>
                                    </div>
                                </div>
                            ))}
                        </div>

                        <div className="mt-4 pt-4 border-t border-purple-50 text-sm text-slate-500 italic">
                            <span className="font-bold text-purple-700 not-italic">总评：</span> {result.overall_comment}
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}

