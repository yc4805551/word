import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getSentenceTrainingFeedback, chatAboutSentence, chatForSentenceGeneration, type SentenceFeedback, type ChatMessage, type SentenceTemplate } from '../lib/ai';
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

// 语法成分颜色映射
const GRAMMAR_COLORS: Record<string, { badge: string; text: string; underline: string }> = {
    '主语': { badge: 'bg-blue-600 text-white', text: 'text-blue-700 font-semibold', underline: 'border-b-2 border-blue-500' },
    '谓语': { badge: 'bg-rose-600 text-white', text: 'text-rose-700 font-semibold', underline: 'border-b-2 border-rose-500' },
    '宾语': { badge: 'bg-emerald-600 text-white', text: 'text-emerald-700 font-semibold', underline: 'border-b-2 border-emerald-500' },
    '定语': { badge: 'bg-amber-500 text-white', text: 'text-amber-700 font-semibold', underline: 'border-b-2 border-amber-400' },
    '状语': { badge: 'bg-purple-500 text-white', text: 'text-purple-700 font-semibold', underline: 'border-b-2 border-purple-400' },
    '补语': { badge: 'bg-teal-500 text-white', text: 'text-teal-700 font-semibold', underline: 'border-b-2 border-teal-400' },
};

// 渲染「句子插接」格式：将【成分】标签转为彩色小徽章，前方的词语加对应下划线
function renderSkeletonText(text: string): string {
    let html = text
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 匹配"词语【成分】"模式，将词语加下划线，【成分】转为彩色徽章
    html = html.replace(/([^【]+?)【(主语|谓语|宾语|定语|状语|补语)】/g, (_match, word, label) => {
        const colors = GRAMMAR_COLORS[label] || { badge: 'bg-slate-500 text-white', underline: 'border-b-2 border-slate-400' };
        return `<span class="${colors.underline}">${word}</span><sup class="inline-flex items-center px-1 py-0.5 rounded text-[10px] leading-none ${colors.badge} ml-0.5">${label}</sup>`;
    });

    // 换行处理
    html = html.split('\n').map(line =>
        line.trim() === '' ? '<br/>' : line
    ).join('\n');

    return html;
}

// 渲染语法分析文本：将"主语：xxx"、"定语「xxx」"等语法标签高亮
function renderGrammarText(text: string): string {
    let html = text
        // 先转义 HTML 特殊字符
        .replace(/&/g, '&amp;')
        .replace(/</g, '&lt;')
        .replace(/>/g, '&gt;');

    // 高亮「xxx」内的原文片段（用对应颜色）
    html = html.replace(/「([^」]+)」/g, (match, content) => {
        // 尝试推断这个「」属于哪个语法成分：看前面的标签关键词
        const beforeText = html.slice(0, html.indexOf(match));
        let colorClass = 'text-slate-700 font-medium'; // 默认
        for (const [label, colors] of Object.entries(GRAMMAR_COLORS)) {
            if (beforeText.includes(label)) {
                colorClass = colors.text;
                break;
            }
        }
        return `<span class="${colorClass} bg-white/60 px-1 rounded">「${content}」</span>`;
    });

    // 高亮语法标签：主语/谓语/宾语/定语/状语/补语 + 冒号
    html = html.replace(/(主语|谓语|宾语|定语|状语|补语)([：:])/g, (_match, label, colon) => {
        const colors = GRAMMAR_COLORS[label] || { badge: 'bg-slate-500 text-white', text: 'text-slate-700' };
        return `<span class="inline-flex items-center px-1.5 py-0.5 rounded text-[11px] ${colors.badge} mr-0.5">${label}</span>${colon}`;
    });

    // 换行处理
    html = html.split('\n').map(line =>
        line.trim() === '' ? '<br/>' : `<span>${line}</span>`
    ).join('\n');

    return html;
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

    // Step 1: AI Auto-Analysis states
    const [analysisLoading, setAnalysisLoading] = useState(false);
    const [analysisResult, setAnalysisResult] = useState<{ skeleton: string; branches: string; markers: string; insight: string; goodWords: string[] } | null>(null);
    const [hasTriedAnalysis, setHasTriedAnalysis] = useState(false);
    const isStep1Unlocked = analysisResult !== null;

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
            setAnalysisResult(null);
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

    // Auto-trigger AI analysis when entering Step 1 (only on first load, not on retry)
    useEffect(() => {
        // 当切换到新的 template、进入 observe 状态、且没有分析结果时触发
        // 失败后 analysisResult 为 null，不会再次触发（避免无限重试）
        if (step === 'observe' && activeTemplate && analysisResult === null && !analysisLoading && !hasTriedAnalysis) {
            setHasTriedAnalysis(true);
            runStep1Analysis();
        }
        // 当切换 template 时重置标记
        if (activeTemplate) {
            setHasTriedAnalysis(false);
        }
    }, [step, activeTemplate]);

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
        setGenChatLoading(true);

        // 检测「训练 xxx」指令：直接将 xxx 作为训练句子
        const trainMatch = userMsg.match(/^训练\s+(.+)$/s);
        if (trainMatch) {
            const sentence = trainMatch[1].trim();
            // 简易模板：每个分句替换为……，保留标点和句式骨架
            const templateStr = sentence
                .split(/([，。；：！？])/)
                .reduce((acc: string[], seg, i) => {
                    if (i % 2 === 1) { acc.push(seg); } // 标点保留
                    else if (seg.trim()) { acc.push('……'); } // 内容替换为省略号
                    return acc;
                }, [])
                .join('');
            const template: SentenceTemplate = {
                name: '自定义句子特训',
                methodName: '结构透视三步法',
                explanation: '您直接提供的句子，用于拆解仿写训练',
                original: sentence,
                template: templateStr || '……',
                keywords: [],
                segments: sentence.split(/[，。；]/).filter(Boolean).map((s, i) => ({ text: s.trim(), isKeyword: false, id: i + 1 })),
                presetTopics: ["高质量发展", "数字经济", "乡村振兴", "科技创新"],
            };
            setActiveTemplate(template);
            setGenChatLoading(false);
            return;
        }

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
                        // 兜底：如果 AI 未返回 template 字符串，用原句分句生成
                        if (!parsed.template.template && parsed.template.original) {
                            parsed.template.template = parsed.template.original
                                .split(/([，。；：！？])/)
                                .reduce((acc: string[], seg: string, i: number) => {
                                    if (i % 2 === 1) { acc.push(seg); }
                                    else if (seg.trim()) { acc.push('……'); }
                                    return acc;
                                }, [])
                                .join('') || '……';
                        }
                        // Assign segments ID if missing
                        parsed.template.segments = parsed.template.segments?.map((s: any, idx: number) => ({...s, id: s.id || (idx+1)})) || parsed.template.original.split(/[，。；]/).filter(Boolean).map((s: string, i: number) => ({ text: s.trim(), isKeyword: false, id: i + 1 }));
                        
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

    // Step 1: AI auto-analysis
    const runStep1Analysis = async () => {
        if (!activeTemplate) return;
        setAnalysisLoading(true);
        try {
            const prompt = `请对以下公文长句进行「结构透视三步法」拆解分析，以JSON格式返回：
句子：「${activeTemplate.original}」

要求：
1. skeleton（字符串）：**句子插接拆解**——将语法成分标签直接嵌入原句中标注，格式为"词语【成分】词语【成分】"。每个充当主语、谓语、宾语的词语后面紧跟【主语】【谓语】【宾语】标签，定语、状语、补语同理用【定语】【状语】【补语】标注。保留原句标点。示例："加快发展【谓语】工业互联网【宾语】，推进【谓语】制造业数字化转型事关【谓语】现代化产业体系建设和经济高质量发展全局【宾语】"
2. branches（字符串）：**透视枝叶，检查关节**——把定语（修饰名词）、状语（修饰动词）和补语安回去，说明它们如何精准修饰主干。逐层标注，格式如："定语「……」修饰主语，状语「……」修饰谓语……"
3. markers（字符串）：**扫描暗门，排查微词**——留意句中的关联词、介词、并列词等，它们决定句子的内在逻辑走向。逐一列出并说明其逻辑功能，格式如："「不仅……更……」表递进；「在……下」表条件"
4. insight（字符串）：**句式关键点评**——用一两句话点出这个句式的核心写作技巧，说明为什么这样组织句子有力量，便于学习者迁移运用
5. goodWords（数组，恰好5个）：从句中挑选5个最值得学习的公文好词或短语，每个元素格式为 "词语：说明用法"

仅返回JSON，不要其他内容。示例：
{"skeleton":"加快发展【谓语】工业互联网【宾语】，推进【谓语】制造业数字化转型事关【谓语】现代化产业体系建设和经济高质量发展全局【宾语】","branches":"定语「制造业数字化转型」修饰宾语限定义范围，状语「加快」修饰谓语表紧迫性","markers":"「推进」与「加快发展」构成并列递进；「事关」表判断联结","insight":"该句采用「动宾并列+判断收束」结构，两个动宾短语先铺开举措，再用"事关"将分量提升到全局高度，形成由具体到抽象的升华。","goodWords":["久久为功：形容坚持不懈","提质增效：形容质量和效益双提升","深耕细作：精耕细作的工作态度","统筹推进：多任务协调并进","固本培元：巩固根基、培植元气"]`;

            const { generateJSON } = await import('../lib/ai');
            const parsed = await generateJSON<any>(
                prompt,
                aiProvider,
                { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] }
            );

            if (!parsed) {
                throw new Error('AI 未返回有效 JSON，请重试或换个模型');
            }
            if (parsed.error) {
                throw new Error(`AI 拒绝分析：${parsed.error}`);
            }
            if (parsed.skeleton && Array.isArray(parsed.goodWords)) {
                setAnalysisResult(parsed);
            } else {
                console.error('Step1 parsed but missing fields:', parsed);
                throw new Error('AI 返回的 JSON 缺少必要字段');
            }
        } catch (e) {
            console.error('Step1 analysis failed', e);
            // fallback: 设为 null 让 UI 显示失败提示和重试按钮
            setAnalysisResult(null);
            setStep('observe');
        } finally {
            setAnalysisLoading(false);
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
                            <button onClick={() => { setActiveTemplate(null); setStep('chat'); setGenChatHistory([]); }} className="text-[11px] text-blue-500 hover:underline">返回对话</button>
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

                            {/* Step 1: AI Analysis */}
                            <div className={cn("transition-all duration-500", step === 'observe' ? 'block' : 'hidden')}>
                                <div className="bg-white rounded-xl shadow-sm border border-slate-200 p-6 space-y-5">
                                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                                        <span className="bg-blue-600 text-white w-6 h-6 rounded flex items-center justify-center text-xs">1</span>
                                        拆解分析
                                    </h3>

                                    {/* Original sentence */}
                                    <div className="bg-slate-50 p-5 rounded-xl border border-slate-200 leading-loose text-base official-font text-slate-700">
                                        {activeTemplate.original}
                                    </div>

                                    {/* Loading state */}
                                    {analysisLoading && (
                                        <div className="flex flex-col items-center justify-center py-10 gap-3 text-slate-400">
                                            <Loader2 className="w-7 h-7 animate-spin text-blue-400" />
                                            <span className="text-sm">AI 正在分析句式结构与好词...</span>
                                        </div>
                                    )}

                                    {/* Failed state: show retry + skip */}
                                    {!analysisLoading && !analysisResult && step === 'observe' && (
                                        <div className="flex flex-col items-center justify-center py-10 gap-4 text-slate-400">
                                            <div className="w-12 h-12 rounded-full bg-rose-50 flex items-center justify-center">
                                                <Brain className="w-6 h-6 text-rose-400" />
                                            </div>
                                            <p className="text-sm text-rose-500 font-medium">分析失败，请重试或跳过</p>
                                            <div className="flex gap-3">
                                                <button
                                                    onClick={() => { setHasTriedAnalysis(false); runStep1Analysis(); }}
                                                    disabled={analysisLoading}
                                                    className="px-4 py-2 bg-blue-600 hover:bg-blue-700 disabled:bg-slate-400 text-white rounded-lg text-sm font-bold flex items-center gap-1.5"
                                                >
                                                    <Loader2 className={cn("w-3.5 h-3.5", analysisLoading && "animate-spin")} /> {analysisLoading ? '分析中...' : '重新分析'}
                                                </button>
                                                <button
                                                    onClick={() => { setAnalysisResult({ skeleton: '', branches: '', markers: '', insight: '', goodWords: [] }); setStep('reconstruct'); }}
                                                    className="px-4 py-2 bg-slate-100 hover:bg-slate-200 text-slate-600 rounded-lg text-sm font-medium"
                                                >
                                                    跳过，直接仿写
                                                </button>
                                            </div>
                                        </div>
                                    )}

                                    {/* Analysis results */}
                                    {!analysisLoading && analysisResult && (
                                        <div className="space-y-4">
                                            {/* 第一步：句子插接拆解 */}
                                            <div className="rounded-xl border border-blue-100 bg-blue-50/50 p-4 space-y-3">
                                                <div className="flex items-center gap-2 text-sm font-bold text-blue-700">
                                                    <span className="w-5 h-5 rounded bg-blue-600 text-white flex items-center justify-center text-[11px]">拆</span>
                                                    句子插接拆解
                                                </div>

                                                {/* 原句 */}
                                                <div className="bg-white/60 rounded-lg p-3 border border-slate-100">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">原句</p>
                                                    <p className="text-sm text-slate-800 leading-loose official-font">{activeTemplate.original}</p>
                                                </div>

                                                {/* 拆解句 */}
                                                <div className="bg-white/80 rounded-lg p-3 border border-blue-200/50">
                                                    <p className="text-[10px] text-slate-400 font-bold uppercase tracking-wider mb-1">拆解</p>
                                                    <p className="text-sm text-slate-800 leading-loose official-font" dangerouslySetInnerHTML={{ __html: renderSkeletonText(analysisResult.skeleton) }} />
                                                </div>
                                            </div>

                                            {/* 第二步：枝叶 */}
                                            {analysisResult.branches && (
                                                <div className="rounded-xl border border-amber-100 bg-amber-50/40 p-4 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-amber-700">
                                                        <span className="w-5 h-5 rounded bg-amber-600 text-white flex items-center justify-center text-[11px]">枝</span>
                                                        透视枝叶，检查关节
                                                    </div>
                                                    <p className="text-xs text-amber-500/70 mb-1 pl-1">定语、状语、补语如何精准修饰主干</p>
                                                    <p className="text-sm text-slate-700 leading-relaxed pl-1" dangerouslySetInnerHTML={{ __html: renderGrammarText(analysisResult.branches) }} />
                                                </div>
                                            )}

                                            {/* 第三步：暗门 */}
                                            {analysisResult.markers && (
                                                <div className="rounded-xl border border-violet-100 bg-violet-50/40 p-4 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-violet-700">
                                                        <span className="w-5 h-5 rounded bg-violet-600 text-white flex items-center justify-center text-[11px]">门</span>
                                                        扫描暗门，排查微词
                                                    </div>
                                                    <p className="text-xs text-violet-500/70 mb-1 pl-1">关联词、介词、并列词——决定逻辑走向</p>
                                                    <p className="text-sm text-slate-700 leading-relaxed pl-1" dangerouslySetInnerHTML={{ __html: renderGrammarText(analysisResult.markers) }} />
                                                </div>
                                            )}

                                            {/* 句式关键点评 */}
                                            {analysisResult.insight && (
                                                <div className="rounded-xl border border-cyan-100 bg-cyan-50/40 p-4 space-y-2">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-cyan-700">
                                                        <span className="w-5 h-5 rounded bg-cyan-600 text-white flex items-center justify-center text-[11px]">评</span>
                                                        句式关键点评
                                                    </div>
                                                    <p className="text-sm text-slate-700 leading-relaxed pl-1">{analysisResult.insight}</p>
                                                </div>
                                            )}

                                            {/* 5好词 */}
                                            {analysisResult.goodWords.length > 0 && (
                                                <div className="rounded-xl border border-emerald-100 bg-emerald-50/40 p-4 space-y-3">
                                                    <div className="flex items-center gap-2 text-sm font-bold text-emerald-700">
                                                        <span className="w-5 h-5 rounded bg-emerald-600 text-white flex items-center justify-center text-[11px]">词</span>
                                                        分析 5 个好词
                                                    </div>
                                                    <div className="grid grid-cols-1 gap-2">
                                                        {analysisResult.goodWords.map((word, i) => {
                                                            const [term, ...rest] = word.split('：');
                                                            return (
                                                                <div key={i} className="flex items-start gap-2 text-sm">
                                                                    <span className="shrink-0 w-5 h-5 rounded-full bg-emerald-100 text-emerald-700 font-bold flex items-center justify-center text-[11px]">{i + 1}</span>
                                                                    <span>
                                                                        <strong className="text-slate-800">{term}</strong>
                                                                        {rest.length > 0 && <span className="text-slate-500">：{rest.join('：')}</span>}
                                                                    </span>
                                                                </div>
                                                            );
                                                        })}
                                                    </div>
                                                </div>
                                            )}
                                        </div>
                                    )}

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
                                            {(() => {
                                                // 从 Step 1 拆解句提取主干：保留 主语/谓语/宾语/状语（含介词），去掉 定语/补语
                                                let hint = '';
                                                if (analysisResult?.skeleton) {
                                                    const KEEP = /^(主语|谓语|宾语|状语)$/;
                                                    // 按【】切分为 [词, 标签, 词, 标签, ...]
                                                    const tokens = analysisResult.skeleton.split(/【([^】]+)】/);
                                                    const kept: string[] = [];
                                                    for (let i = 0; i < tokens.length; i += 2) {
                                                        const word = tokens[i] || '';
                                                        const label = tokens[i + 1] || '';
                                                        if (!label) {
                                                            // 结尾无标签的部分（一般是标点或残留），保留标点
                                                            kept.push(word.replace(/[^，。；：！？]/g, '').trim());
                                                        } else if (KEEP.test(label)) {
                                                            kept.push(word.trim());
                                                        }
                                                        // 定语/补语：丢弃前面的词
                                                    }
                                                    const core = kept.filter(Boolean).join(' ').replace(/\s+([，。；：！？])/g, '$1').trim();
                                                    if (core.length > 3) hint = `主干：${core}`;
                                                }
                                                if (!hint && activeTemplate.template && !/^[…，。；：！？\s]+$/.test(activeTemplate.template)) {
                                                    hint = `模板：${activeTemplate.template}`;
                                                }
                                                return hint ? (
                                                    <span className="text-[11px] text-slate-500 font-medium max-w-[65%] truncate" title={hint}>
                                                        {hint}
                                                    </span>
                                                ) : null;
                                            })()}
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
                                                        {/* 三行对比：原句 → 仿写 → 标杆 */}
                                                        <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                                                            <h4 className="text-xs font-bold text-slate-400 uppercase tracking-widest mb-1.5 flex items-center gap-1">
                                                                <Brain className="w-3.5 h-3.5 text-blue-500" /> 原句（拆解参考）
                                                            </h4>
                                                            <p className="text-sm text-slate-700 leading-relaxed official-font">{activeTemplate.original}</p>
                                                        </div>

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
