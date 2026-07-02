import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getSentenceTrainingFeedback, chatAboutSentence, chatForSentenceGeneration, type SentenceFeedback, type ChatMessage, type SentenceTemplate, type Segment } from '../lib/ai';
import { appendToGitHubFile } from '../lib/github-sync';
import { cn } from '../lib/utils';

// 轻量 Markdown 渲染：支持 **bold**、> blockquote、换行
function renderMarkdown(text: string): string {
    return text
        .split('\n')
        .map(line => {
            // blockquote
            if (line.startsWith('> ')) {
                const inner = line.slice(2).replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
                return `<blockquote>${inner}</blockquote>`;
            }
            // bold
            const processed = line.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
            return processed === '' ? '<br/>' : `<span>${processed}</span>`;
        })
        .join('\n');
}
import {
    Brain,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    MessageSquare,
    Send,
    Loader2,
    Award
} from 'lucide-react';

export default function SentenceTraining() {
    const { aiProvider, apiKeys, endpoints, models, githubToken, githubOwner, githubRepo } = useSettings();
    
    // Core state
    const [activeTemplate, setActiveTemplate] = useState<SentenceTemplate | null>(null);
    const [step, setStep] = useState<'chat' | 'observe' | 'reconstruct' | 'feedback'>('chat');

    // Chat Generation states
    const [genChatHistory, setGenChatHistory] = useState<ChatMessage[]>([]);
    const [genChatInput, setGenChatInput] = useState('');
    const [genChatLoading, setGenChatLoading] = useState(false);
    const genChatEndRef = useRef<HTMLDivElement>(null);

    // Step 1: Observe & Deconstruct states
    const [clickedKeywordIds, setClickedKeywordIds] = useState<number[]>([]);
    const [clickedWrongIds, setClickedWrongIds] = useState<number[]>([]);
    const [feynmanExplanation, setFeynmanExplanation] = useState('');
    const totalKeywordsCount = activeTemplate?.segments.filter(s => s.isKeyword).length || 0;
    const isStep1Unlocked = clickedKeywordIds.length === totalKeywordsCount && feynmanExplanation.trim().length >= 5;

    // Step 2: Reconstruct states
    const [selectedTopic, setSelectedTopic] = useState('');
    const [isCustomTopic, setIsCustomTopic] = useState(false);
    const [customTopicText, setCustomTopicText] = useState('');
    const [userDraft, setUserDraft] = useState('');

    // Step 3: AI Evaluation & Chat states
    const [aiLoading, setAiLoading] = useState(false);
    const [feedback, setFeedback] = useState<SentenceFeedback | null>(null);
    const [chatHistory, setChatHistory] = useState<ChatMessage[]>([]);
    const [chatInput, setChatInput] = useState('');
    const [chatLoading, setChatLoading] = useState(false);
    const chatEndRef = useRef<HTMLDivElement>(null);

    // Reset everything when template changes
    useEffect(() => {
        if (activeTemplate) {
            setStep('observe');
            setClickedKeywordIds([]);
            setClickedWrongIds([]);
            setFeynmanExplanation('');
            const presets = activeTemplate.presetTopics || ["乡村振兴", "数字转型", "生态治理", "体制改革"];
            setSelectedTopic(presets[0]);
            setIsCustomTopic(false);
            setCustomTopicText('');
            setUserDraft('');
            setFeedback(null);
            setChatHistory([]);
            setChatInput('');
        }
    }, [activeTemplate]);

    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    useEffect(() => {
        genChatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [genChatHistory]);

    // Gen Chat Logic
    const handleSendGenChat = async () => {
        if (!genChatInput.trim() || genChatLoading) return;
        
        const userMsg = genChatInput.trim();
        setGenChatInput('');
        const newHistory = [...genChatHistory, { role: 'user' as const, content: userMsg }];
        setGenChatHistory(newHistory);
        setGenChatLoading(true);

        try {
            const aiResponse = await chatForSentenceGeneration(
                newHistory,
                aiProvider,
                { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] }
            );

            if (aiResponse.success && aiResponse.data) {
                // Check if JSON block was returned
                try {
                    let textToParse = aiResponse.data;
                    const jsonMatch = textToParse.match(/```json\n([\s\S]*?)\n```/) || textToParse.match(/\{[\s\S]*\}/);
                    if (jsonMatch) {
                        textToParse = jsonMatch[0].replace(/```json/g, '').replace(/```/g, '').trim();
                    }
                    const parsed = JSON.parse(textToParse);
                    if (parsed.is_template_ready && parsed.template) {
                        // Found a template!
                        if (!parsed.template.presetTopics) {
                            parsed.template.presetTopics = ["高质量发展", "数字经济", "乡村振兴", "科技创新"];
                        }
                        // Assign segments ID if missing
                        parsed.template.segments = parsed.template.segments.map((s: any, idx: number) => ({...s, id: s.id || (idx+1)}));
                        
                        setActiveTemplate(parsed.template);
                    } else {
                        setGenChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse.data! }]);
                    }
                } catch (err) {
                    setGenChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse.data! }]);
                }
            } else {
                setGenChatHistory(prev => [...prev, { role: 'assistant', content: `【错误】AI 回复出错: ${aiResponse.error}` }]);
            }
        } catch (e) {
            console.error(e);
            setGenChatHistory(prev => [...prev, { role: 'assistant', content: '【错误】发送失败，请重试。' }]);
        } finally {
            setGenChatLoading(false);
        }
    };

    // Step 1 helper: handle segment click
    const handleSegmentClick = (segment: Segment) => {
        if (step !== 'observe') return;

        if (segment.isKeyword) {
            if (clickedKeywordIds.includes(segment.id!)) {
                setClickedKeywordIds(prev => prev.filter(id => id !== segment.id));
            } else {
                setClickedKeywordIds(prev => [...prev, segment.id!]);
            }
        } else {
            if (!clickedWrongIds.includes(segment.id!)) {
                setClickedWrongIds(prev => [...prev, segment.id!]);
                setTimeout(() => {
                    setClickedWrongIds(prev => prev.filter(id => id !== segment.id));
                }, 800);
            }
        }
    };

    // Step 2 helper: go to Step 2
    const handleProceedToStep2 = () => {
        if (!isStep1Unlocked) return;
        setStep('reconstruct');
    };

    // Auto Git Sync helper
    const saveToGitHub = async () => {
        if (!activeTemplate || !githubToken) return;
        try {
            const timestamp = new Date().toLocaleString('zh-CN');
            const content = `\n---\n【时间】: ${timestamp}\n【句式类型】: ${activeTemplate.name}\n【训练原文】: ${activeTemplate.original}\n【仿写记录】: ${userDraft}\n`;
            
            await appendToGitHubFile(
                { token: githubToken, owner: githubOwner, repo: githubRepo },
                'trained_sentences.txt',
                content,
                `Add trained sentence: ${activeTemplate.name}`
            );
            console.log("Successfully synced to GitHub trained_sentences.txt");
        } catch (e) {
            console.error("Failed to sync to GitHub:", e);
        }
    };

    // Step 2 helper: Submit draft to AI
    const handleSubmitDraft = async () => {
        const topic = isCustomTopic ? customTopicText.trim() : selectedTopic;
        if (!topic) {
            alert('请确定仿写主题！');
            return;
        }
        if (!userDraft.trim()) {
            alert('请输入您的仿写内容！');
            return;
        }

        setAiLoading(true);
        setStep('feedback');
        setFeedback(null);

        try {
            const res = await getSentenceTrainingFeedback(
                topic,
                activeTemplate!.template,
                activeTemplate!.original,
                userDraft,
                activeTemplate!.methodName,
                aiProvider,
                { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] }
            );

            if (res) {
                setFeedback(res);
                setChatHistory([
                    {
                        role: 'assistant',
                        content: `我已经对你的仿写进行了智能诊断，评分为 **${res.score}分**。\n\n针对我们练习的主题【${topic}】，我的修改方案是：\n> **${res.standard_version}**\n\n你可以围绕句子的修辞、逻辑或者如何减轻读者认知负荷来向我提问。`
                    }
                ]);
                // Fire and forget Git sync
                saveToGitHub();
            } else {
                alert('AI 评估失败，请检查系统 API 配置并重试。');
                setStep('reconstruct');
            }
        } catch (e) {
            console.error(e);
            alert('调用 AI 出错，请检查网络或设置。');
            setStep('reconstruct');
        } finally {
            setAiLoading(false);
        }
    };

    // Step 3 helper: Send chat message
    const handleSendChatMessage = async (customMessage?: string) => {
        const messageToSend = customMessage || chatInput.trim();
        if (!messageToSend || chatLoading || !feedback || !activeTemplate) return;

        const newHistory = [...chatHistory, { role: 'user' as const, content: messageToSend }];
        setChatHistory(newHistory);
        if (!customMessage) setChatInput('');
        setChatLoading(true);

        const currentTopic = isCustomTopic ? customTopicText.trim() : selectedTopic;

        try {
            const aiResponse = await chatAboutSentence(
                newHistory,
                currentTopic,
                activeTemplate.template,
                activeTemplate.original,
                userDraft,
                JSON.stringify(feedback),
                aiProvider,
                { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] }
            );

            if (aiResponse.success && aiResponse.data) {
                setChatHistory(prev => [...prev, { role: 'assistant', content: aiResponse.data! }]);
            } else {
                setChatHistory(prev => [...prev, { role: 'assistant', content: `【错误】AI 回复超时或出错: ${aiResponse.error || '未知网络问题'}` }]);
            }
        } catch (e) {
            console.error(e);
            setChatHistory(prev => [...prev, { role: 'assistant', content: '【错误】发送失败，请重试。' }]);
        } finally {
            setChatLoading(false);
        }
    };

    const presets = activeTemplate?.presetTopics || ["乡村振兴", "数字转型", "生态治理", "体制改革"];

    return (
        <div className="space-y-6 max-w-6xl mx-auto pb-10">
            {/* Theory Banner */}
            <div className="bg-gradient-to-r from-blue-900 via-indigo-950 to-slate-900 rounded-2xl p-6 text-white shadow-xl relative overflow-hidden">
                <div className="absolute right-0 top-0 w-80 h-80 bg-blue-500/10 rounded-full blur-3xl -mr-16 -mt-16"></div>
                <div className="relative z-10 space-y-4">
                    <div className="flex items-center gap-3">
                        <div className="p-2.5 bg-white/10 rounded-xl">
                            <Brain className="w-6 h-6 text-teal-300" />
                        </div>
                        <div>
                            <h2 className="text-xl font-bold tracking-wide official-font">动态句子特训：《求是》句式库</h2>
                            <p className="text-xs text-blue-200 opacity-80">通过对话 AI 自动生成高质量公文句式，采用“输入-加工-升华”三步法进行刻意练习。</p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Area layout */}
            <div className="grid lg:grid-cols-4 gap-6">
                
                {/* Left Sidebar: Dynamic Generation / Selection */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm flex flex-col h-[500px]">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3 flex items-center justify-between">
                            <span>寻找训练句式</span>
                            <button onClick={() => { setActiveTemplate(null); setStep('chat'); }} className="text-[11px] text-blue-500 hover:underline">返回对话</button>
                        </h3>
                        
                        {/* If in chat mode for generation */}
                        <div className="flex-1 overflow-y-auto space-y-3 mb-3 pb-2 flex flex-col">
                            {genChatHistory.length === 0 && (
                                <div className="text-xs text-slate-500 text-center mt-10 space-y-2">
                                    <Sparkles className="w-6 h-6 mx-auto mb-2 text-teal-400 opacity-50" />
                                    <p>向我描述您想练什么样的公文句式？</p>
                                    <p className="text-slate-400">例如：“排比句”、“对策部署”...</p>
                                    <p className="text-teal-500 font-medium mt-1">💡 也可以直接粘贴句子转为训练！</p>
                                </div>
                            )}
                            {genChatHistory.map((msg, index) => (
                                <div
                                    key={index}
                                    className={cn(
                                        "flex flex-col max-w-[90%] rounded-xl p-2.5 text-xs leading-relaxed",
                                        msg.role === 'user'
                                            ? "bg-blue-600 text-white self-end ml-auto rounded-tr-none"
                                            : "bg-slate-100 text-slate-800 self-start mr-auto rounded-tl-none border border-slate-200"
                                    )}
                                >
                                    <div
                                        className="markdown-body"
                                        dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }}
                                    />
                                </div>
                            ))}
                            {genChatLoading && (
                                <div className="bg-slate-100 text-slate-500 self-start mr-auto rounded-xl rounded-tl-none p-2.5 text-xs animate-pulse">
                                    <Loader2 className="w-3 h-3 inline-block animate-spin mr-1" /> 生成中...
                                </div>
                            )}
                            <div ref={genChatEndRef} />
                        </div>

                        <div className="flex gap-2 shrink-0">
                            <textarea
                                value={genChatInput}
                                onChange={(e) => setGenChatInput(e.target.value)}
                                onKeyDown={(e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); handleSendGenChat(); } }}
                                placeholder="描述句式 或 直接粘贴句子..."
                                rows={1}
                                className="flex-1 px-3 py-2 border border-slate-200 rounded-lg outline-none focus:ring-1 focus:ring-teal-500 text-xs resize-none max-h-24 overflow-y-auto"
                            />
                            <button
                                onClick={handleSendGenChat}
                                disabled={genChatLoading || !genChatInput.trim()}
                                className="px-3 py-2 bg-slate-800 hover:bg-slate-700 text-white rounded-lg flex items-center justify-center disabled:opacity-50"
                            >
                                <Send className="w-3 h-3" />
                            </button>
                        </div>
                    </div>
                </div>

                {/* Right Workspace Area */}
                <div className="lg:col-span-3 space-y-4">
                    {step === 'chat' && !activeTemplate && (
                        <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-12 text-center flex flex-col items-center justify-center min-h-[500px]">
                            <div className="w-20 h-20 bg-blue-50 rounded-full flex items-center justify-center mb-6">
                                <Brain className="w-10 h-10 text-blue-400" />
                            </div>
                            <h2 className="text-xl font-bold text-slate-700 mb-2">等待生成特训目标</h2>
                            <p className="text-slate-500 text-sm max-w-md mx-auto mb-8">
                                请在左侧对话框中描述您想要练习的公文段落或特定句式。AI 会自动从《求是》网风格库中为您生成原汁原味的公文长句，并将其抽象为填空模板供您练习。
                            </p>
                        </div>
                    )}

                    {step !== 'chat' && activeTemplate && (
                        <>
                            {/* Current Target Overview */}
                            <div className="bg-white rounded-xl shadow-sm border border-slate-200 overflow-hidden">
                                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                    <div className="flex items-center gap-2">
                                        <div className="w-2 h-2 rounded-full bg-blue-500"></div>
                                        <h2 className="font-bold text-slate-800 tracking-wide text-sm">当前特训目标</h2>
                                    </div>
                                    <div className="flex gap-2">
                                        {/* Status Indicators */}
                                        <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors", step === 'observe' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-400')}>
                                            Step 1: 拆解
                                        </div>
                                        <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors", step === 'reconstruct' ? 'bg-blue-100 border-blue-200 text-blue-700' : 'bg-slate-100 border-slate-200 text-slate-400')}>
                                            Step 2: 重构
                                        </div>
                                        <div className={cn("px-2.5 py-1 rounded-full text-[10px] font-bold border transition-colors", step === 'feedback' ? 'bg-emerald-100 border-emerald-200 text-emerald-700' : 'bg-slate-100 border-slate-200 text-slate-400')}>
                                            Step 3: 升华
                                        </div>
                                    </div>
                                </div>
                            </div>

                            {/* Step 1: Observe */}
                            <div className={cn("transition-all duration-500", step === 'observe' ? 'block' : 'hidden')}>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <span className="bg-blue-600 text-white w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
                                            输入加工：骨架拆解与大白话翻译
                                        </h3>
                                        <div className="text-xs text-slate-400 font-medium bg-slate-100 px-3 py-1 rounded-full">
                                            已找到 {clickedKeywordIds.length} / {totalKeywordsCount} 个骨架词
                                        </div>
                                    </div>

                                    <div className="bg-slate-50 p-6 rounded-xl border border-slate-200 leading-loose text-lg official-font text-slate-700 select-none">
                                        {activeTemplate.segments.map((segment) => {
                                            const isClicked = clickedKeywordIds.includes(segment.id!);
                                            const isWrongClicked = clickedWrongIds.includes(segment.id!);
                                            return (
                                                <span
                                                    key={segment.id}
                                                    onClick={() => handleSegmentClick(segment)}
                                                    className={cn(
                                                        "transition-all duration-300 mx-0.5 px-1 rounded cursor-pointer",
                                                        (!isClicked && !isWrongClicked) ? "hover:bg-slate-200/60" : "",
                                                        segment.isKeyword && isClicked ? "border-b-2 border-emerald-500 bg-emerald-100 text-emerald-800 font-bold" : "",
                                                        !segment.isKeyword && isWrongClicked ? "bg-red-100 text-red-800 transition-colors" : ""
                                                    )}
                                                    title={!isClicked ? "点击标记结构词" : ""}
                                                >
                                                    {segment.text}
                                                </span>
                                            );
                                        })}
                                    </div>

                                    <div className="space-y-3">
                                        <h4 className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                            用大白话解释逻辑（费曼输出）
                                        </h4>
                                        <textarea
                                            value={feynmanExplanation}
                                            onChange={(e) => setFeynmanExplanation(e.target.value)}
                                            placeholder="比如：先说面对什么困难，然后说必须用什么狠劲，最后说能达到什么目的..."
                                            className="w-full h-24 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-slate-50 resize-none"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-slate-100">
                                        <button
                                            onClick={handleProceedToStep2}
                                            disabled={!isStep1Unlocked}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-md shadow-blue-200 transition-all flex items-center gap-2"
                                        >
                                            进入重构训练 <ArrowRight className="w-4 h-4" />
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Step 2: Reconstruct */}
                            <div className={cn("transition-all duration-500", step === 'reconstruct' ? 'block' : 'hidden')}>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-6">
                                    <div className="flex items-center justify-between">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <span className="bg-blue-600 text-white w-6 h-6 rounded flex items-center justify-center text-xs">2</span>
                                            加工建构：闭卷重构与仿写
                                        </h3>
                                        <span className="text-xs text-rose-500 font-bold px-2 py-1 bg-rose-50 rounded animate-pulse">
                                            提示：原句已隐藏，请回忆骨架
                                        </span>
                                    </div>

                                    <div className="space-y-4">
                                        <h4 className="text-sm font-bold text-slate-700">1. 选择新主题进行迁移</h4>
                                        <div className="flex flex-wrap gap-2">
                                            {presets.map((topic: string) => (
                                                <button
                                                    key={topic}
                                                    onClick={() => { setIsCustomTopic(false); setSelectedTopic(topic); }}
                                                    className={cn(
                                                        "px-4 py-2 rounded-full text-xs font-medium border transition-colors",
                                                        !isCustomTopic && selectedTopic === topic ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                                    )}
                                                >
                                                    {topic}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setIsCustomTopic(true)}
                                                className={cn(
                                                    "px-4 py-2 rounded-full text-xs font-medium border transition-colors",
                                                    isCustomTopic ? "bg-blue-600 text-white border-blue-600" : "bg-white text-slate-600 border-slate-200 hover:border-blue-300"
                                                )}
                                            >
                                                自定义主题...
                                            </button>
                                        </div>
                                        {isCustomTopic && (
                                            <input
                                                type="text"
                                                value={customTopicText}
                                                onChange={(e) => setCustomTopicText(e.target.value)}
                                                placeholder="输入您的工作痛点或总结主题"
                                                className="w-full px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-blue-100 text-sm"
                                            />
                                        )}
                                    </div>

                                    <div className="space-y-4 pt-4">
                                        <div className="flex items-center justify-between">
                                            <h4 className="text-sm font-bold text-slate-700">2. 开始仿写</h4>
                                            <span className="text-[10px] text-slate-400 font-mono tracking-wider">
                                                模板提示：{activeTemplate.template}
                                            </span>
                                        </div>
                                        <textarea
                                            value={userDraft}
                                            onChange={(e) => setUserDraft(e.target.value)}
                                            placeholder="请根据选择的主题，尝试默写运用刚才掌握的句式骨架..."
                                            className="w-full h-32 p-4 border border-slate-200 rounded-xl focus:ring-2 focus:ring-blue-100 outline-none text-sm bg-slate-50 resize-none leading-loose official-font"
                                        />
                                    </div>

                                    <div className="flex justify-end pt-4 border-t border-slate-100">
                                        <button
                                            onClick={handleSubmitDraft}
                                            disabled={!userDraft.trim() || aiLoading}
                                            className="px-6 py-2.5 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-300 text-white rounded-lg font-bold shadow-md shadow-blue-200 transition-all flex items-center gap-2"
                                        >
                                            {aiLoading ? <><Loader2 className="w-4 h-4 animate-spin" /> AI 诊断中...</> : <><Sparkles className="w-4 h-4" /> 提交诊断</>}
                                        </button>
                                    </div>
                                </div>
                            </div>

                            {/* Step 3: Feedback (Only shown when available) */}
                            <div className={cn("transition-all duration-500", step === 'feedback' ? 'block' : 'hidden')}>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 flex flex-col min-h-[600px] overflow-hidden">
                                    <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50/50">
                                        <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                            <span className="bg-emerald-500 text-white w-6 h-6 rounded flex items-center justify-center text-xs">3</span>
                                            互动升华：AI 深度诊断与思辨
                                        </h3>
                                    </div>

                                    {aiLoading && !feedback && (
                                        <div className="flex-1 flex flex-col items-center justify-center space-y-4 text-slate-400 py-20">
                                            <Loader2 className="w-8 h-8 animate-spin text-teal-500" />
                                            <p className="text-sm font-medium animate-pulse">教练正在逐字评估您的公文段落...</p>
                                        </div>
                                    )}

                                    {!aiLoading && feedback && (
                                        <div className="flex-1 flex flex-col overflow-y-auto">
                                            <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                                                <div className="grid md:grid-cols-3 gap-6">
                                                    <div className="md:col-span-1 bg-white p-5 rounded-xl border border-slate-200 shadow-sm flex flex-col items-center justify-center text-center space-y-3">
                                                        <div className="relative flex items-center justify-center w-24 h-24">
                                                            <svg className="w-full h-full transform -rotate-90">
                                                                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" className="text-slate-100" />
                                                                <circle cx="48" cy="48" r="42" stroke="currentColor" strokeWidth="8" fill="transparent" strokeDasharray={264} strokeDashoffset={264 - (264 * feedback.score) / 100} className={cn("transition-all duration-1000 ease-out", feedback.score >= 85 ? 'text-emerald-500' : feedback.score >= 60 ? 'text-amber-500' : 'text-rose-500')} />
                                                            </svg>
                                                            <span className="absolute text-3xl font-extrabold text-slate-800">{feedback.score}</span>
                                                        </div>
                                                        <div>
                                                            <h4 className="font-bold text-slate-800 text-sm">
                                                                {feedback.score >= 90 ? "极具工信风范" : feedback.score >= 75 ? "结构匹配良好" : "骨架仍需打磨"}
                                                            </h4>
                                                        </div>
                                                    </div>

                                                    <div className="md:col-span-2 space-y-4">
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                                <Award className="w-3.5 h-3.5 text-blue-500" /> 您的初稿
                                                            </h4>
                                                            <p className="text-sm text-slate-700 leading-relaxed font-sans">{userDraft}</p>
                                                        </div>

                                                        <div className="bg-white p-4 rounded-xl border border-teal-200 shadow-sm ring-1 ring-teal-100">
                                                            <h4 className="text-xs font-bold text-teal-600 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                                <Sparkles className="w-3.5 h-3.5" /> AI 标杆范文
                                                            </h4>
                                                            <p className="text-sm text-slate-800 font-medium leading-relaxed font-sans">{feedback.standard_version}</p>
                                                        </div>
                                                    </div>
                                                </div>

                                                <div className="grid md:grid-cols-2 gap-6 mt-6">
                                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-2">
                                                        <h4 className="text-xs font-bold text-purple-600 uppercase tracking-widest flex items-center gap-1.5">
                                                            <Brain className="w-4 h-4" /> 句式对比诊断 (Gap Analysis)
                                                        </h4>
                                                        <p className="text-xs text-slate-600 leading-relaxed whitespace-pre-wrap">
                                                            {feedback.analysis}
                                                        </p>
                                                    </div>

                                                    <div className="bg-white p-5 rounded-xl border border-slate-200 shadow-sm space-y-3">
                                                        <h4 className="text-xs font-bold text-emerald-600 uppercase tracking-widest flex items-center gap-1.5">
                                                            <CheckCircle2 className="w-4 h-4" /> 关键改进点
                                                        </h4>
                                                        <ul className="space-y-2.5">
                                                            {feedback.improvements.map((tip, i) => (
                                                                <li key={i} className="flex gap-2.5 text-xs text-slate-600 leading-relaxed">
                                                                    <span className="flex-none bg-teal-100 text-teal-800 w-5 h-5 rounded-full flex items-center justify-center font-bold mt-0.5">
                                                                        {i + 1}
                                                                    </span>
                                                                    <span>{tip}</span>
                                                                </li>
                                                            ))}
                                                        </ul>
                                                    </div>
                                                </div>
                                            </div>

                                            <div className="p-6 space-y-4 bg-slate-100/50 flex-1 flex flex-col min-h-[350px]">
                                                <div className="flex items-center justify-between text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">
                                                    <div className="flex items-center gap-1.5">
                                                        <MessageSquare className="w-4.5 h-4.5 text-teal-600" />
                                                        <span>双向互动思辨（ICAP最高层-Interactive）</span>
                                                    </div>
                                                </div>
                                                
                                                <div className="flex-1 overflow-y-auto space-y-3 min-h-[200px] max-h-[350px] p-3 bg-white border border-slate-200 rounded-xl shadow-inner">
                                                    {chatHistory.map((msg, index) => (
                                                        <div
                                                            key={index}
                                                            className={cn(
                                                                "flex flex-col max-w-[85%] rounded-2xl p-3.5 text-sm leading-relaxed",
                                                                msg.role === 'user'
                                                                    ? "bg-blue-600 text-white self-end ml-auto rounded-tr-none"
                                                                    : "bg-slate-100 text-slate-800 self-start mr-auto rounded-tl-none border border-slate-200"
                                                            )}
                                                        >
                                                            <div className="text-[10px] opacity-60 mb-1 font-bold">
                                                                {msg.role === 'user' ? '用户 (我)' : 'AI 公文特训教练'}
                                                            </div>
                                                             <div className="markdown-body" dangerouslySetInnerHTML={{ __html: renderMarkdown(msg.content) }} />
                                                        </div>
                                                    ))}
                                                    {chatLoading && (
                                                        <div className="bg-slate-100 text-slate-800 self-start mr-auto rounded-2xl rounded-tl-none border border-slate-200 p-3.5 text-sm flex items-center gap-2 max-w-[85%] animate-pulse">
                                                            <Loader2 className="w-4 h-4 animate-spin text-teal-600" />
                                                            <span>教练正在深思熟虑...</span>
                                                        </div>
                                                    )}
                                                    <div ref={chatEndRef} />
                                                </div>

                                                <div className="flex gap-2">
                                                    <input
                                                        type="text"
                                                        value={chatInput}
                                                        onChange={(e) => setChatInput(e.target.value)}
                                                        onKeyDown={(e) => e.key === 'Enter' && handleSendChatMessage()}
                                                        placeholder="输入您要向公文教练追问的问题..."
                                                        className="flex-1 px-4 py-2.5 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-teal-500/20 focus:border-teal-500 text-sm bg-white"
                                                    />
                                                    <button
                                                        onClick={() => handleSendChatMessage()}
                                                        disabled={chatLoading || !chatInput.trim()}
                                                        className="px-5 py-2.5 bg-teal-600 hover:bg-teal-700 text-white rounded-lg font-bold text-sm flex items-center gap-1.5 shadow-md shadow-teal-200 transition-colors disabled:opacity-50"
                                                    >
                                                        <Send className="w-3.5 h-3.5" />
                                                        发送
                                                    </button>
                                                </div>
                                            </div>
                                        </div>
                                    )}
                                </div>
                            </div>
                        </>
                    )}
                </div>
            </div>
        </div>
    );
}
