import { useEffect, useMemo, useState } from 'react';
import { wordPairs } from '../data/week2-data';
import { cn } from '../lib/utils';
import { ArrowRight, AlertTriangle, BookOpen, Brain, Loader2, RefreshCw, GraduationCap, Sparkles, Upload, Zap, Trash2 } from 'lucide-react';
import { generateArticle, analyzeAndGeneratePractice, polishText, type SmartLesson, type PolishedText, generateScenarioPractice, type ScenarioPractice, generateUsagePractice } from '../lib/ai';
import { useSettings } from '../context/SettingsContext';
import myVocabularyRaw from '../data/my-vocabulary.txt?raw';

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
                    词汇升级训练营
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

    const renderPracticeText = () => {
        if (!lesson) return null;

        // Clean ID format: ___[1]___ or ____【1】__
        // Legacy formats: ______（hint） or ( 1 )
        const parts = lesson.practice.text.split(/((?:_+[[【]\d+[\]】]_+)|(?:_+[[【].*?[\]】]_+[（(].*?[)）])|(?:_+（[^）]+）)|(?:[（(][^)）]+[)）]))/);

        let blankIndexCounter = 0; // Counter for fallback matching

        return (
            <div className="leading-loose text-lg text-slate-700">
                {parts.map((part, index) => {
                    let hint: string | null = null;
                    let idStr: string | null = null;
                    const cleanPart = part.trim();
                    let isBlankLike = false;

                    // 1. Try match clean ID format: ___[1]___
                    const matchCleanID = cleanPart.match(/^_+[[【](\d+)[\]】]_+$/);
                    if (matchCleanID) {
                        idStr = matchCleanID[1];
                        isBlankLike = true;
                    }

                    // 2. Try match new format with hint (Legacy transition): ___[1]___（hint）
                    if (!isBlankLike) {
                        const matchNew = cleanPart.match(/^_+[[【](.*?)[\]】]_+[（(](.*)[)）]$/);
                        if (matchNew) {
                            idStr = matchNew[1].trim();
                            hint = matchNew[2].trim();
                            isBlankLike = true;
                        }
                    }

                    // 3. Try match standard underscore (Legacy)
                    if (!isBlankLike && !hint) {
                        const matchStandard = cleanPart.match(/^_+（([^）]+)）$/);
                        if (matchStandard) {
                            hint = matchStandard[1];
                            isBlankLike = true;
                        }
                    }

                    // 4. Try match brackets (Legacy)
                    if (!isBlankLike && !hint) {
                        const matchBracket = cleanPart.match(/^[（(](.*)[)）]$/);
                        if (matchBracket) {
                            hint = matchBracket[1].trim();
                            isBlankLike = true;
                        }
                    }

                    if (isBlankLike) {
                        let blank;

                        // A. Try identifying by explicit ID found in []
                        if (idStr && /^\d+$/.test(idStr)) {
                            const id = parseInt(idStr, 10);
                            blank = lesson.practice.blanks.find(b => b.id === id);
                        }

                        const normalizedHint = hint ? hint.replace(/[\uFF10-\uFF19]/g, m => String.fromCharCode(m.charCodeAt(0) - 0xFEE0)) : "";

                        // B. Try identifying by hint content (if it looks like an ID)
                        if (!blank && normalizedHint && /^\d+$/.test(normalizedHint)) {
                            const id = parseInt(normalizedHint, 10);
                            blank = lesson.practice.blanks.find(b => b.id === id);
                        }

                        // C. Try identifying by textual hint matching
                        if (!blank && hint) {
                            blank = lesson.practice.blanks.find(b => b.hint === hint || b.hint === normalizedHint);
                            if (!blank) {
                                blank = lesson.practice.blanks.find(b => b.hint && (b.hint.includes(hint!) || hint!.includes(b.hint)));
                            }
                        }

                        // D. Fallback to usage index
                        if (!blank) {
                            if (blankIndexCounter < lesson.practice.blanks.length) {
                                blank = lesson.practice.blanks[blankIndexCounter];
                            }
                        }

                        blankIndexCounter++; // Increment whenever we encounter a blank-like pattern

                        if (!blank) return <span key={index}>{part}</span>;

                        const isCorrect = answers[blank.id]?.trim() === blank.answer;

                        return (
                            <span key={index} className="inline-flex flex-col mx-1 align-bottom relative group align-middle">
                                {showResults ? (
                                    <span className={cn(
                                        "px-2 py-0.5 rounded border-b-2 font-bold transition-colors",
                                        isCorrect ? "border-green-500 text-green-700 bg-green-50" : "border-red-500 text-red-700 bg-red-50"
                                    )}>{blank.answer}</span>
                                ) : (
                                    (() => {
                                        // Clean hint logic:
                                        // 1. Remove "提示词" or "提示" prefix with optional colon
                                        // 2. Remove surrounding parentheses
                                        let rawHint = blank.hint || hint || "";
                                        if (rawHint) {
                                            // Handle "（提示词：名词）" -> "名词"
                                            // Handle "提示：动词" -> "动词"
                                            rawHint = rawHint
                                                .replace(/^[（(]?(?:提示词|提示)[:：]?\s*/, '') // Remove prefix at start
                                                .replace(/[)）]$/, '') // Remove suffix paren at end
                                                .replace(/[（()）]/g, '') // Cleanup any remaining parens just in case
                                                .trim();
                                        }
                                        const displayHint = rawHint;

                                        // NEW: Check length for dynamic sizing
                                        const isLong = displayHint.length > 8;
                                        const isVeryLong = displayHint.length > 16;

                                        // Calculate dynamic width
                                        // Allow wider max width (24em) for long hints
                                        const widthLimit = isVeryLong ? 24 : 16;
                                        const widthEm = Math.min(Math.max(displayHint.length * 1.4, 5), widthLimit);

                                        // Small font for long hints
                                        const fontSizeCls = isLong ? "text-xs" : "text-sm";

                                        // Height: if very long, default to ~2 lines height (approx 3.2em)
                                        const minHeight = isVeryLong ? '3.2em' : '1.8em';

                                        return (
                                            <textarea
                                                rows={1}
                                                style={{ width: `${widthEm}em`, minHeight: minHeight }}
                                                className={cn(
                                                    "inline-block px-1 py-0.5 text-center border-b-2 border-slate-300 focus:border-purple-500 outline-none bg-slate-50 focus:bg-white text-slate-800 rounded-t transition-colors select-text placeholder:text-slate-400 overflow-hidden resize-none align-middle leading-normal mx-0.5 align-baseline",
                                                    fontSizeCls
                                                )}
                                                placeholder={displayHint}
                                                value={answers[blank.id] || ''}
                                                onChange={(e) => {
                                                    setAnswers(prev => ({ ...prev, [blank.id]: e.target.value }));
                                                    // Auto-height
                                                    e.target.style.height = 'auto';
                                                    e.target.style.height = (e.target.scrollHeight) + 'px';
                                                }}
                                                autoComplete="off"
                                            />
                                        );
                                    })()
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

// Unified Word Interface
interface WordItem {
    id: string;
    text: string;
    type: 'core' | 'custom';
}

function WordUpgrade() {
    const [myWords, setMyWords] = useState<string[]>([]);
    const [selectedWord, setSelectedWord] = useState<{ word: string, mode: 'usage' | 'elimination' } | null>(null);
    const { vocabList, addToVocab, aiProvider } = useSettings();

    // Load custom vocabulary
    useState(() => {
        if (myVocabularyRaw) {
            const lines = myVocabularyRaw.split('\n').map(l => l.trim()).filter(l => l.length > 0);
            setMyWords(lines);
        }
    });

    // Combine all words
    const allWords = useMemo(() => {
        const core: WordItem[] = wordPairs.map(p => ({
            id: `core-${p.id}`,
            text: p.colloquial, // Using colloquial as the main text to start with? Or should we show professional?
            // Wait, colloquial words are "Catchphrases" to be eliminated.
            // Core words in wordPairs are: colloquial -> professional.
            // If user wants "Scenario Training", they usually want to train the PROFESSIONAL word.
            // But if they want "Eliminate", they want to target the COLLOQUIAL word.

            // NOTE: The current data structure has pairs. 
            // If I click "Scenario Training", I probably want to train the Professional version?
            // If I click "Eliminate", I want to eliminate the Colloquial version.
            // But the card title should probably be the Colloquial one if the goal is "Upgrade".
            // OR, the user just supplies a LIST of words. Ideally "Keywords".
            // Let's assume the user input (custom) are words they want to MASTER (Professional ones) OR Avoid (Catchphrases).
            // It's ambiguous. But given the buttons:
            // "Scenario Training" -> IMPLIES "I want to learn to USE this word".
            // "Eliminate Catchphrases" -> IMPLIES "I want to STOP using this word".

            // For Core Words (wordPairs), 'colloquial' is the "bad" word, 'professional' is the "good" word.
            // So for Core Words:
            // - Title: colloquial (e.g. "Create")
            // - Button "Eliminate": Target 'Create', suggest 'Build/Establish'.
            // - Button "Scenario": ??? Train 'Create'? No. Train 'Build'?

            // Creating a unified list is tricky if we mix pairs vs single strings.
            // Let's simplify: Display the text as is.
            // For Core words, let's display the COLLOQUIAL word as the main title (since it's an "Upgrade" list).
            type: 'core'
        }));

        const custom: WordItem[] = Array.from(new Set([...myWords, ...vocabList])).map((w, i) => ({
            id: `custom-${i}`,
            text: w,
            type: 'custom'
        }));

        return [...core, ...custom];
    }, [myWords, vocabList]);

    return (
        <div className="space-y-6">

            {/* Upload Guide */}
            <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 text-sm text-yellow-800 flex items-start gap-3">
                <AlertTriangle className="w-5 h-5 shrink-0" />
                <div className="flex-1">
                    <p className="font-bold mb-1">如何添加我的专属词汇？</p>
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

            {/* Word Grid */}
            <div className="grid gap-4 md:grid-cols-2 lg:grid-cols-3">
                {allWords.map((item) => (
                    <div key={item.id} className="group relative bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all flex flex-col justify-between">
                        <div className="flex items-start justify-between mb-4">
                            <h3 className="text-xl font-bold text-slate-800">{item.text}</h3>
                            <span className={cn(
                                "text-[10px] uppercase px-2 py-0.5 rounded-full font-bold",
                                item.type === 'core' ? "bg-blue-100 text-blue-600" : "bg-purple-100 text-purple-600"
                            )}>
                                {item.type === 'core' ? 'Core' : 'Custom'}
                            </span>
                        </div>

                        <div className="grid grid-cols-2 gap-3">
                            {/* Button 1: Scenario Training (Usage) */}
                            <button
                                onClick={() => setSelectedWord({ word: item.text, mode: 'usage' })}
                                className="w-full py-2 bg-slate-50 text-indigo-600 rounded-lg hover:bg-indigo-50 hover:text-indigo-700 font-medium transition-colors flex items-center justify-center gap-1 border border-slate-100 hover:border-indigo-200 text-sm"
                            >
                                <Zap className="w-3 h-3" />
                                场景训练
                            </button>

                            {/* Button 2: Eliminate Catchphrases */}
                            <button
                                onClick={() => setSelectedWord({ word: item.text, mode: 'elimination' })}
                                className="w-full py-2 bg-slate-50 text-pink-600 rounded-lg hover:bg-pink-50 hover:text-pink-700 font-medium transition-colors flex items-center justify-center gap-1 border border-slate-100 hover:border-pink-200 text-sm"
                            >
                                <Trash2 className="w-3 h-3" />
                                消灭口头语
                            </button>
                        </div>
                    </div>
                ))}

                {allWords.length === 0 && (
                    <div className="col-span-full py-12 text-center text-slate-400 border-2 border-dashed border-slate-200 rounded-xl">
                        暂无词汇，请上传 txt 或编辑文件
                    </div>
                )}
            </div>

            {/* AI Scenario Modal */}
            {selectedWord && (
                <ScenarioPracticeModal
                    key={`${selectedWord.word}:${selectedWord.mode}:${aiProvider}`}
                    word={selectedWord.word}
                    mode={selectedWord.mode}
                    onClose={() => setSelectedWord(null)}
                />
            )}
        </div>
    );
}

function ScenarioPracticeModal({ word, mode, onClose }: { word: string, mode: 'usage' | 'elimination', onClose: () => void }) {
    const { aiProvider, apiKeys } = useSettings();
    const [data, setData] = useState<ScenarioPractice | null>(null);
    const [input, setInput] = useState('');
    const [status, setStatus] = useState<'testing' | 'success' | 'fail'>('testing');
    const [loadError, setLoadError] = useState<string | null>(null);

    useEffect(() => {
        const apiKey = apiKeys[aiProvider]?.trim();
        if (!apiKey) return;

        let cancelled = false;
        const fetchFunc = mode === 'usage' ? generateUsagePractice : generateScenarioPractice;

        fetchFunc(word, aiProvider, { apiKey: apiKeys[aiProvider] }).then(res => {
            if (cancelled) return;
            setData(res);
            if (!res) setLoadError('生成失败，请检查网络或稍后重试。');
        });

        return () => { cancelled = true; };
    }, [word, mode, aiProvider, apiKeys]);

    const check = () => {
        if (!data) return;
        const normalized = input.trim();
        if (!normalized) return;
        // Simple fuzzy match check
        const isMatch = data.target_possibilities.some(t => normalized.includes(t) || t.includes(normalized));
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

                <h4 className={cn(
                    "font-bold text-xl flex items-center gap-2 border-b pb-4",
                    mode === 'usage' ? "text-indigo-900 border-indigo-50" : "text-pink-900 border-pink-50"
                )}>
                    {mode === 'usage' ? <Zap className="w-6 h-6 text-indigo-600" /> : <Trash2 className="w-6 h-6 text-pink-600" />}
                    {mode === 'usage' ? "词汇应用训练营" : "口头语消灭模拟器"}
                </h4>

                {!apiKeys[aiProvider]?.trim() ? (
                    <div className="text-center py-8 text-red-500">
                        未配置 API Key，请到“系统设置”填写后再试。
                    </div>
                ) : !data && !loadError ? (
                    <div className="py-12 flex flex-col items-center gap-4 text-slate-500">
                        <Loader2 className={cn("w-10 h-10 animate-spin", mode === 'usage' ? "text-indigo-600" : "text-pink-600")} />
                        <p>AI 正在构建“{word}”的{mode === 'usage' ? "应用" : "专项"}场景...</p>
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
                            <span className="text-xs font-bold uppercase tracking-wider text-slate-400">Task / 任务</span>
                            <div className="text-lg text-slate-700 leading-relaxed bg-slate-50 p-4 rounded-xl border border-slate-100">
                                {data.sentence.split(mode === 'usage' ? '____' : data.hint).map((part, i, arr) => (
                                    <span key={i}>
                                        {part}
                                        {i < arr.length - 1 && (
                                            mode === 'usage' ? (
                                                <span className="inline-block mx-1 font-bold text-indigo-500 border-b-2 border-indigo-300 px-3 bg-indigo-50 rounded min-w-[3em] text-center">
                                                    ____
                                                </span>
                                            ) : (
                                                <span className="inline-block mx-1 font-bold text-red-500 border-b-2 border-red-300 px-1 bg-red-50 rounded">
                                                    {data.hint}
                                                </span>
                                            )
                                        )}
                                    </span>
                                ))}
                            </div>
                            {mode === 'usage' && <p className="text-xs text-slate-500 mt-1 italic">提示：{data.hint}</p>}
                        </div>

                        {/* User Action */}
                        <div className="pt-2">
                            <label className="text-sm font-medium text-slate-700 mb-2 block">
                                {mode === 'usage' ? "请填入最恰当的词：" : "请用更专业的词替换它："}
                            </label>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={input}
                                    onChange={e => setInput(e.target.value)}
                                    onKeyDown={(e) => {
                                        if (e.key !== 'Enter') return;
                                        e.preventDefault();
                                        if (!input.trim() || status === 'success') return;
                                        check();
                                    }}
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
                                    {mode === 'usage' ? "不对哦，再想想..." : "思路不错，但还有更精准的词"}
                                </p>
                                <div className="mt-2 text-sm">
                                    参考答案：
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
                    <div className="text-center py-8 text-red-500">
                        {loadError || '连接失败，请重试'}
                    </div>
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
    const [error, setError] = useState<string | null>(null);

    const handlePolish = async () => {
        if (!draft.trim()) return;
        setError(null);
        setLoading(true);
        const polished = await polishText(draft, aiProvider, { apiKey: apiKeys[aiProvider] });
        if (polished) {
            setResult(polished);
        } else {
            const apiKey = apiKeys[aiProvider]?.trim();
            setResult(null);
            setError(apiKey ? '生成失败，请检查网络或稍后重试。' : '未配置 API Key，请到“系统设置”填写后再试。');
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
            {error && (
                <div className="bg-red-50 border border-red-100 text-red-800 px-4 py-3 rounded-lg">
                    {error}
                </div>
            )}
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

