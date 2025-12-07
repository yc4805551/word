import { useState } from 'react';
import { cn } from '../lib/utils';
import { Layout, GitPullRequest, Zap, Loader2, Sparkles, BookOpen } from 'lucide-react';
import { structurePatterns, logicModes } from '../data/week3-data';
import { useSettings } from '../context/SettingsContext';
import { generateStructurePractice, expandLogic } from '../lib/ai';
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
    const { aiProvider, apiKeys } = useSettings();
    const [selectedPattern, setSelectedPattern] = useState(structurePatterns[0].id);
    const [topic, setTopic] = useState('');
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ skeleton: string, example: string, analysis: string } | null>(null);

    const handleClone = async (_patternId: number, template: string) => {
        if (!topic.trim()) return;
        setLoading(true);
        setResult(null);

        const res = await generateStructurePractice(topic, template, aiProvider, { apiKey: apiKeys[aiProvider] });
        if (res) setResult(res);
        setLoading(false);
    };

    return (
        <div className="space-y-6 animate-in fade-in">
            <div className="grid gap-6 md:grid-cols-2 lg:grid-cols-3">
                {structurePatterns.map((pattern) => (
                    <div key={pattern.id} className="bg-white p-6 rounded-xl border border-slate-200 shadow-sm hover:shadow-md transition-all">
                        <div className="flex justify-between items-start mb-3">
                            <h3 className="text-lg font-bold text-slate-800">{pattern.name}</h3>
                            <span className="text-xs font-bold bg-blue-50 text-blue-600 px-2 py-0.5 rounded">Lv.{pattern.difficulty}</span>
                        </div>
                        <p className="text-sm font-mono bg-slate-50 p-2 rounded text-slate-600 mb-3 border border-slate-100">
                            {pattern.template}
                        </p>
                        <p className="text-sm text-slate-500 mb-4 h-10 overflow-hidden text-ellipsis line-clamp-2">
                            {pattern.description}
                        </p>

                        <div className="space-y-3 pt-4 border-t border-slate-50">
                            <input
                                type="text"
                                value={selectedPattern === pattern.id ? topic : ''}
                                onChange={(e) => {
                                    if (selectedPattern !== pattern.id) setTopic(e.target.value);
                                    else setTopic(e.target.value);
                                    setSelectedPattern(pattern.id); // Focus this card
                                }}
                                placeholder="输入主题，如：安全生产"
                                className="w-full px-3 py-2 text-sm border border-slate-200 rounded outline-none focus:ring-2 focus:ring-blue-100 transition-all"
                                onClick={(e) => {
                                    e.stopPropagation();
                                    setSelectedPattern(pattern.id);
                                }}
                            />
                            <button
                                onClick={() => handleClone(pattern.id, pattern.template)}
                                disabled={loading && selectedPattern === pattern.id}
                                className="w-full py-2 bg-blue-600 text-white rounded hover:bg-blue-700 disabled:opacity-50 text-sm font-medium flex items-center justify-center gap-2"
                            >
                                {loading && selectedPattern === pattern.id ? <Loader2 className="w-3 h-3 animate-spin" /> : <Sparkles className="w-3 h-3" />}
                                {loading && selectedPattern === pattern.id ? "正在克隆..." : "立即仿写"}
                            </button>
                        </div>

                        {/* Result Display inside card */}
                        {result && selectedPattern === pattern.id && (
                            <div className="mt-4 p-4 bg-green-50 rounded-lg border border-green-100 animate-in zoom-in">
                                <p className="text-sm font-bold text-green-800 mb-1">仿写结果：</p>
                                <p className="text-slate-800 font-medium leading-relaxed mb-2">{result.example}</p>
                                <div className="text-xs text-slate-500 pt-2 border-t border-green-100 italic">
                                    解析: {result.analysis}
                                </div>
                            </div>
                        )}
                    </div>
                ))}
            </div>
        </div>
    );
}

function LogicAmplifier() {
    const { aiProvider, apiKeys } = useSettings();
    const [point, setPoint] = useState('');
    const [mode, setMode] = useState(logicModes[0].id);
    const [loading, setLoading] = useState(false);
    const [result, setResult] = useState<{ original: string, expanded: string, logic_mode: string, breakdown: string } | null>(null);

    const handleExpand = async () => {
        if (!point.trim()) return;
        setLoading(true);
        setResult(null);

        const selectedModeName = logicModes.find(m => m.id === mode)?.name || 'Dialectical';
        const res = await expandLogic(point, selectedModeName, aiProvider, { apiKey: apiKeys[aiProvider] });
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
