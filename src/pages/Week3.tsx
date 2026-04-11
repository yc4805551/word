import { useState } from 'react';
import { cn } from '../lib/utils';
import { Layout, GitPullRequest, Zap, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { structurePatterns, logicModes, type StructurePattern } from '../data/week3-data';
import { useSettings } from '../context/SettingsContext';
import { expandLogic, generateFranklinFeedback, type FranklinFeedback } from '../lib/ai';
import CoWritingCanvas from '../components/CoWritingCanvas';

export default function Week3() {
    const [activeTab, setActiveTab] = useState<'clone' | 'logic' | 'interactive'>('clone');

    return (
        <div className="space-y-6">
            {/* Top Navigation */}
            <div className="flex space-x-4 border-b border-slate-200 pb-2 overflow-x-auto">
                <button
                    onClick={() => setActiveTab('clone')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'clone' ? "bg-blue-100 text-blue-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <GitPullRequest className="w-4 h-4" />
                    句式克隆 (Structure Cloning)
                </button>
                <button
                    onClick={() => setActiveTab('logic')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'logic' ? "bg-purple-100 text-purple-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Zap className="w-4 h-4" />
                    逻辑扩写 (Logic Amplifier)
                </button>
                <button
                    onClick={() => setActiveTab('interactive')}
                    className={cn(
                        "px-4 py-2 rounded-t-lg font-medium transition-colors whitespace-nowrap flex items-center gap-2",
                        activeTab === 'interactive' ? "bg-green-100 text-green-800" : "text-slate-600 hover:bg-slate-50"
                    )}
                >
                    <Sparkles className="w-4 h-4" />
                    交互式改写 (Interactive Polish)
                </button>
            </div>

            {activeTab === 'clone' && <StructureCloning />}
            {activeTab === 'logic' && <LogicAmplifier />}
            {activeTab === 'interactive' && <CoWritingCanvas />}
        </div>
    );
}

function StructureCloning() {
    const { aiProvider, apiKeys, endpoints, models } = useSettings();
    const [customPatterns, setCustomPatterns] = useState<StructurePattern[]>([]); // Store imported patterns
    const [selectedPatternId, setSelectedPatternId] = useState(structurePatterns[0].id);

    // Import Modal State
    const [showImport, setShowImport] = useState(false);
    const [importText, setImportText] = useState('');
    const [importLoading, setImportLoading] = useState(false);

    // Workflow State
    const [step, setStep] = useState<'input' | 'draft' | 'result'>('input');
    const [topic, setTopic] = useState('');
    const [userDraft, setUserDraft] = useState('');
    const [loading, setLoading] = useState(false);
    const [feedback, setFeedback] = useState<FranklinFeedback | null>(null);

    // Merge default and custom patterns
    const allPatterns = [...structurePatterns, ...customPatterns];
    const selectedPattern = allPatterns.find(p => p.id === selectedPatternId) || allPatterns[0];

    const handleStartDrafting = () => {
        if (!topic.trim()) return;
        setStep('draft');
    };

    const handleSubmitDraft = async () => {
        if (!userDraft.trim()) return;
        setLoading(true);
        setFeedback(null);

        try {
            const res = await generateFranklinFeedback(
                topic,
                selectedPattern.template,
                userDraft,
                aiProvider,
                { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] }
            );
            if (res) {
                setFeedback(res);
                setStep('result');
            }
        } finally {
            setLoading(false);
        }
    };

    const handleImportExtract = async () => {
        if (!importText.trim()) return;
        setImportLoading(true);
        try {
            // Import dynamically to avoid circular dependency issues if any
            const { extractStructureFromText } = await import('../lib/ai');
            const newPatterns = await extractStructureFromText(importText, aiProvider, { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] });

            if (newPatterns.length > 0) {
                // Ensure IDs don't conflict
                const safePatterns = newPatterns.map(p => ({
                    ...p,
                    id: Date.now() + Math.random() // Simple random ID
                }));
                setCustomPatterns(prev => [...safePatterns, ...prev]);
                setSelectedPatternId(safePatterns[0].id); // Select the first new one
                setShowImport(false);
                setImportText('');
                setStep('input'); // Reset to start
            } else {
                alert("未能提取到有效句式，请尝试更长的文本。");
            }
        } catch (e) {
            console.error(e);
            alert("提取失败，请重试。");
        } finally {
            setImportLoading(false);
        }
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = (event) => {
            const text = event.target?.result as string;
            setImportText(text);
        };
        reader.readAsText(file);
    };

    const handleReset = () => {
        setStep('input');
        setTopic('');
        setUserDraft('');
        setFeedback(null);
    };

    const handleRetry = () => {
        setStep('draft');
        setFeedback(null);
    };

    return (
        <div className="space-y-6 animate-in fade-in relative">
            {/* Import Modal */}
            {showImport && (
                <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
                    <div className="bg-white rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] flex flex-col animate-in zoom-in-95">
                        <div className="flex justify-between items-center p-4 border-b border-slate-100">
                            <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                                <Sparkles className="w-5 h-5 text-purple-500" />
                                智能拆解导入 (Smart Extract)
                            </h3>
                            <button onClick={() => setShowImport(false)} className="text-slate-400 hover:text-slate-600">
                                <Layout className="w-5 h-5 rotate-45" /> {/* Close icon substitution */}
                            </button>
                        </div>

                        <div className="p-6 space-y-4 flex-1 overflow-y-auto">
                            <div className="bg-blue-50 p-4 rounded-lg text-sm text-blue-800 border border-blue-100 mb-4">
                                <p className="font-bold mb-1">💡 如何使用：</p>
                                <p>粘贴您觉得写得好的文章段落，或上传 TXT 文件。AI 将自动分析其中的修辞手法（如排比、递进、对仗），并提取为可练习的句式卡片。</p>
                            </div>

                            <div>
                                <label className="block text-sm font-medium text-slate-700 mb-2">输入文本或上传文件</label>
                                <textarea
                                    value={importText}
                                    onChange={(e) => setImportText(e.target.value)}
                                    className="w-full h-40 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-100 outline-none resize-none text-sm leading-relaxed"
                                    placeholder="在此粘贴文本..."
                                />
                                <div className="mt-2 flex items-center gap-2">
                                    <label className="cursor-pointer inline-flex items-center gap-2 px-3 py-1.5 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded text-xs font-medium transition-colors">
                                        <BookOpen className="w-3 h-3" />
                                        上传 .txt 文件
                                        <input type="file" accept=".txt" className="hidden" onChange={handleFileUpload} />
                                    </label>
                                    <span className="text-xs text-slate-400">支持 UTF-8 编码文本文件</span>
                                </div>
                            </div>
                        </div>

                        <div className="p-4 border-t border-slate-100 flex justify-end gap-3 bg-slate-50 rounded-b-xl">
                            <button
                                onClick={() => setShowImport(false)}
                                className="px-4 py-2 text-sm text-slate-600 hover:bg-slate-100 rounded-lg"
                            >
                                取消
                            </button>
                            <button
                                onClick={handleImportExtract}
                                disabled={importLoading || !importText.trim()}
                                className="px-6 py-2 bg-purple-600 text-white font-bold rounded-lg hover:bg-purple-700 disabled:opacity-50 flex items-center gap-2 shadow-lg shadow-purple-200"
                            >
                                {importLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Sparkles className="w-4 h-4" />}
                                {importLoading ? "正在拆解分析..." : "开始拆解提取"}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {/* 1. Pattern Selection */}
            <div className="flex flex-wrap gap-4 mb-8">
                {allPatterns.map((pattern) => (
                    <button
                        key={pattern.id}
                        onClick={() => {
                            if (step === 'input') setSelectedPatternId(pattern.id);
                        }}
                        className={cn(
                            "p-3 rounded-lg border text-left transition-all relative overflow-hidden min-w-[200px] max-w-[240px]",
                            selectedPatternId === pattern.id
                                ? "border-blue-500 bg-blue-50 ring-2 ring-blue-200"
                                : "border-slate-200 hover:bg-slate-50 opacity-70 hover:opacity-100"
                        )}
                        disabled={step !== 'input'}
                    >
                        <div className="font-bold text-sm text-slate-800 mb-1 truncate">{pattern.name}</div>
                        <div className="text-xs text-slate-500 truncate">{pattern.template}</div>
                        {selectedPatternId === pattern.id && (
                            <div className="absolute top-0 right-0 p-1 bg-blue-500 rounded-bl-lg">
                                <GitPullRequest className="w-3 h-3 text-white" />
                            </div>
                        )}
                    </button>
                ))}

                {/* Import Button */}
                <button
                    onClick={() => setShowImport(true)}
                    disabled={step !== 'input'}
                    className="p-3 rounded-lg border border-dashed border-slate-300 hover:border-purple-400 hover:bg-purple-50 text-slate-400 hover:text-purple-600 transition-all flex flex-col items-center justify-center min-w-[100px] gap-1 group"
                >
                    <div className="w-8 h-8 rounded-full bg-slate-100 group-hover:bg-purple-100 flex items-center justify-center transition-colors">
                        <Sparkles className="w-4 h-4" />
                    </div>
                    <span className="text-xs font-bold">导入/拆解</span>
                </button>
            </div>

            {/* Main Workspace */}
            <div className="bg-white rounded-xl border border-slate-200 shadow-sm overflow-hidden min-h-[400px] relative">

                {/* Step 1: Deconstruction & Observation */}
                {step === 'input' && (
                    <div className="p-8 max-w-2xl mx-auto space-y-8 animate-in slide-in-from-bottom-4">
                        <div className="text-center space-y-2">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-blue-100 text-blue-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                Step 1 : 观察拆解
                            </div>
                            <h2 className="text-2xl font-bold text-slate-800">{selectedPattern.name}</h2>
                            <p className="text-slate-600">{selectedPattern.description}</p>
                        </div>

                        <div className="bg-slate-50 p-6 rounded-lg border border-slate-100">
                            <h3 className="text-sm font-bold text-slate-400 uppercase mb-3">Core Structure / 核心骨架</h3>
                            <p className="text-lg font-mono text-blue-700 bg-white p-3 rounded border border-blue-100 shadow-sm">
                                {selectedPattern.template}
                            </p>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-center gap-2 text-sm font-medium text-slate-700">
                                <span className="w-8 h-8 rounded-full bg-slate-100 flex items-center justify-center text-slate-500">1</span>
                                设定一个练习主题
                            </div>
                            <div className="flex gap-3">
                                <input
                                    type="text"
                                    value={topic}
                                    onChange={(e) => setTopic(e.target.value)}
                                    placeholder="例如：乡村振兴、科技创新、人才培养..."
                                    className="flex-1 px-4 py-3 text-lg border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-500/20 transition-all"
                                    onKeyDown={(e) => e.key === 'Enter' && handleStartDrafting()}
                                />
                                <button
                                    onClick={handleStartDrafting}
                                    disabled={!topic.trim()}
                                    className="px-6 py-3 bg-blue-600 text-white font-bold rounded-lg hover:bg-blue-700 disabled:opacity-50 disabled:cursor-not-allowed transition-all shadow-lg shadow-blue-200"
                                >
                                    开始仿写
                                </button>
                            </div>
                        </div>
                    </div>
                )}

                {/* Step 2: Reconstruction (Drafting) */}
                {step === 'draft' && (
                    <div className="p-8 max-w-3xl mx-auto space-y-6 animate-in slide-in-from-right-8">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
                            <div className="inline-flex items-center gap-2 px-3 py-1 bg-purple-100 text-purple-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                Step 2 : 记忆重构
                            </div>
                            <button onClick={() => setStep('input')} className="text-sm text-slate-400 hover:text-slate-600">
                                ← 更换主题
                            </button>
                        </div>

                        <div className="space-y-4">
                            <div className="flex items-start gap-4 p-4 bg-blue-50/50 rounded-lg border border-blue-50">
                                <div>
                                    <div className="text-xs text-blue-400 font-bold mb-1">CURRENT TOPIC</div>
                                    <div className="font-medium text-slate-800">{topic}</div>
                                </div>
                                <div className="hidden md:block w-px h-10 bg-blue-100 mx-4"></div>
                                <div className="flex-1">
                                    <div className="text-xs text-blue-400 font-bold mb-1">TARGET STRUCTURE</div>
                                    <div className="font-mono text-blue-700 text-sm">{selectedPattern.template}</div>
                                </div>
                            </div>

                            <div className="relative">
                                <textarea
                                    value={userDraft}
                                    onChange={(e) => setUserDraft(e.target.value)}
                                    placeholder="请在此处凭记忆重构句子..."
                                    className="w-full h-48 px-6 py-5 text-lg leading-relaxed rounded-xl border-2 border-slate-200 focus:border-blue-500 focus:ring-4 focus:ring-blue-500/10 outline-none resize-none transition-all placeholder:text-slate-300"
                                    autoFocus
                                />
                                <div className="absolute bottom-4 right-4 text-xs text-slate-300">
                                    {userDraft.length} chars
                                </div>
                            </div>

                            <button
                                onClick={handleSubmitDraft}
                                disabled={loading || !userDraft.trim()}
                                className="w-full py-4 bg-black text-white rounded-xl font-bold text-lg hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center justify-center gap-2"
                            >
                                {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Sparkles className="w-5 h-5 text-yellow-400" />}
                                {loading ? "正在AI对比分析..." : "提交并对比 (Submit & Compare)"}
                            </button>
                        </div>
                    </div>
                )}

                {/* Step 3: Comparison & Feedback */}
                {step === 'result' && feedback && (
                    <div className="absolute inset-0 flex flex-col animate-in zoom-in-95 duration-300">
                        <div className="flex-none p-4 border-b border-slate-100 flex justify-between items-center bg-white/80 backdrop-blur z-10">
                            <div className="flex items-center gap-3">
                                <div className="inline-flex items-center gap-2 px-3 py-1 bg-green-100 text-green-700 rounded-full text-xs font-bold uppercase tracking-wider">
                                    Step 3 : 对比反馈
                                </div>
                                <h3 className="font-bold text-slate-700">{topic}</h3>
                            </div>
                            <div className="flex gap-2">
                                <button onClick={handleRetry} className="px-4 py-2 text-sm font-medium text-slate-600 hover:bg-slate-50 rounded-lg">
                                    重写 (Revise)
                                </button>
                                <button onClick={handleReset} className="px-4 py-2 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm">
                                    新练习 (New)
                                </button>
                            </div>
                        </div>

                        <div className="flex-1 overflow-y-auto p-6 bg-slate-50/50">
                            <div className="grid lg:grid-cols-2 gap-6 max-w-6xl mx-auto h-full">
                                {/* Left: Comparison */}
                                <div className="space-y-6">
                                    {/* User Card */}
                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm relative overflow-hidden group">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-slate-300 group-hover:bg-slate-400 transition-colors"></div>
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-3 pl-3">Your Draft</div>
                                        <div className="text-lg text-slate-700 leading-loose pl-3 min-h-[80px]">
                                            {userDraft}
                                        </div>
                                    </div>

                                    {/* AI Standard Card */}
                                    <div className="bg-white p-5 rounded-xl border border-blue-200 shadow-md relative overflow-hidden ring-1 ring-blue-100">
                                        <div className="absolute top-0 left-0 w-1 h-full bg-blue-500"></div>
                                        <div className="flex justify-between items-start mb-3 pl-3">
                                            <div className="text-xs font-bold text-blue-600 uppercase tracking-widest flex items-center gap-2">
                                                <Sparkles className="w-3 h-3" />
                                                Franklin Standard
                                            </div>
                                            <div className="bg-blue-100 text-blue-800 text-xs font-bold px-2 py-0.5 rounded">AI Generated</div>
                                        </div>
                                        <div className="text-lg text-slate-800 font-medium leading-loose pl-3">
                                            {feedback.standard_version}
                                        </div>
                                    </div>
                                </div>

                                {/* Right: Analysis */}
                                <div className="space-y-6">
                                    {/* Score Card */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm flex items-center gap-6">
                                        <div className="relative grid place-items-center w-20 h-20">
                                            <svg className="w-full h-full transform -rotate-90">
                                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                                <circle cx="40" cy="40" r="36" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={226} strokeDashoffset={226 - (226 * feedback.score) / 100} className={cn("transition-all duration-1000 ease-out", feedback.score >= 80 ? 'text-green-500' : feedback.score >= 60 ? 'text-yellow-500' : 'text-red-500')} />
                                            </svg>
                                            <span className="absolute text-2xl font-bold text-slate-700">{feedback.score}</span>
                                        </div>
                                        <div>
                                            <h4 className="font-bold text-slate-800 text-lg">
                                                {feedback.score >= 90 ? "Excellent!" : feedback.score >= 70 ? "Good Start!" : "Keep Practicing"}
                                            </h4>
                                            <p className="text-sm text-slate-500">Based on structure compliance & vocabulary.</p>
                                        </div>
                                    </div>

                                    {/* Analysis Details */}
                                    <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm space-y-4">
                                        <div>
                                            <h4 className="font-bold text-slate-800 mb-2 flex items-center gap-2">
                                                <GitPullRequest className="w-4 h-4 text-purple-500" />
                                                Gap Analysis
                                            </h4>
                                            <p className="text-slate-600 text-sm leading-relaxed bg-purple-50/50 p-3 rounded-lg border border-purple-50">
                                                {feedback.diff_analysis}
                                            </p>
                                        </div>

                                        <div>
                                            <h4 className="font-bold text-slate-800 mb-2">Key Improvements</h4>
                                            <ul className="space-y-2">
                                                {feedback.key_improvements.map((tip: string, i: number) => (
                                                    <li key={i} className="flex gap-3 text-sm text-slate-600">
                                                        <span className="flex-none bg-yellow-100 text-yellow-700 w-5 h-5 rounded-full flex items-center justify-center text-xs font-bold mt-0.5">{i + 1}</span>
                                                        <span>{tip}</span>
                                                    </li>
                                                ))}
                                            </ul>
                                        </div>
                                    </div>
                                </div>
                            </div>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}

function LogicAmplifier() {
    const { aiProvider, apiKeys, endpoints, models } = useSettings();
    const [point, setPoint] = useState('');
    const [mode, setMode] = useState(logicModes[0].id);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ original: string, expanded: string, logic_mode: string, breakdown: string } | null>(null);

    const handleExpand = async () => {
        if (!point.trim()) return;
        setLoading(true);
        setResult(null);

        const selectedMode = logicModes.find(m => m.id === mode);
        const selectedModeName = selectedMode?.name || 'Dialectical';
        // @ts-ignore
        const instruction = selectedMode?.instruction;

        const res = await expandLogic(point, selectedModeName, instruction, aiProvider, { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] });
        if (res) setResult(res);
        setLoading(false);
    };

    return (
        <div className="grid lg:grid-cols-2 gap-8 animate-in fade-in">
            {/* Input Panel */}
            <div className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm h-fit">
                <h3 className="text-lg font-bold text-slate-800 mb-4 flex items-center gap-2">
                    <BookOpen className="w-5 h-5 text-purple-600" />
                    输入核心观点
                </h3>

                <textarea
                    value={point}
                    onChange={(e) => setPoint(e.target.value)}
                    placeholder="输入一个简单的大白话观点，例如：我们要保护环境，不能乱排乱放..."
                    className="w-full h-32 px-4 py-3 rounded-lg border border-slate-200 focus:ring-2 focus:ring-purple-100 outline-none resize-none mb-4"
                />

                <div className="space-y-3 mb-6">
                    <label className="text-sm font-medium text-slate-700">选择逻辑模式：</label>
                    <div className="grid grid-cols-2 gap-2">
                        {logicModes.map((m) => (
                            <button
                                key={m.id}
                                onClick={() => setMode(m.id)}
                                className={cn(
                                    "px-3 py-2 text-sm rounded border text-left transition-all",
                                    mode === m.id
                                        ? "border-purple-500 bg-purple-50 text-purple-900"
                                        : "border-slate-200 text-slate-600 hover:bg-slate-50"
                                )}
                            >
                                <div className="font-bold">{m.name.split(' ')[0]}</div>
                                <div className="text-[10px] opacity-70 truncate">{m.description}</div>
                            </button>
                        ))}
                    </div>
                </div>

                <button
                    onClick={handleExpand}
                    disabled={loading || !point.trim()}
                    className="w-full py-3 bg-purple-600 text-white rounded-lg hover:bg-purple-700 disabled:opacity-50 font-bold shadow-lg shadow-purple-200 transition-all flex items-center justify-center gap-2"
                >
                    {loading ? <Loader2 className="w-5 h-5 animate-spin" /> : <Zap className="w-5 h-5" />}
                    {loading ? "AI 正在逻辑升维..." : "立即逻辑扩写"}
                </button>
            </div>

            {/* Result Panel */}
            <div className="relative">
                {result ? (
                    <div className="bg-gradient-to-br from-white to-purple-50 p-8 rounded-xl border border-purple-100 shadow-lg animate-in slide-in-from-right-4">
                        <div className="absolute -top-3 -right-3 bg-purple-600 text-white px-3 py-1 rounded-full text-xs font-bold shadow-md">
                            AI AMPLIFIED
                        </div>

                        <div className="mb-6 pb-6 border-b border-purple-100">
                            <div className="text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">Original / 原观点</div>
                            <p className="text-slate-600 italic">"{result.original}"</p>
                        </div>

                        <div className="mb-6">
                            <div className="text-xs font-bold uppercase tracking-wider text-purple-600 mb-3 flex items-center gap-2">
                                <Zap className="w-4 h-4" />
                                Expanded / 逻辑升维版
                            </div>
                            <div className="text-lg text-slate-800 font-medium leading-loose">
                                {result.expanded}
                            </div>
                        </div>

                        <div className="bg-white/50 p-4 rounded-lg border border-purple-100 text-sm text-purple-800">
                            <strong>逻辑拆解：</strong> {result.breakdown}
                        </div>
                    </div>
                ) : (
                    <div className="h-full flex flex-col items-center justify-center text-slate-300 border-2 border-dashed border-slate-200 rounded-xl min-h-[400px]">
                        <Layout className="w-12 h-12 mb-4 opacity-50" />
                        <p>请在左侧输入观点并点击扩写</p>
                        <p className="text-sm mt-2">AI 将为你构建逻辑严密的公文段落</p>
                    </div>
                )}
            </div>
        </div>
    );
}
