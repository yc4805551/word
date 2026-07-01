import { useState, useEffect, useRef } from 'react';
import { useSettings } from '../context/SettingsContext';
import { getSentenceTrainingFeedback, chatAboutSentence, type SentenceFeedback, type ChatMessage } from '../lib/ai';
import { cn } from '../lib/utils';
import {
    Brain,
    GraduationCap,
    Sparkles,
    ArrowRight,
    CheckCircle2,
    MessageSquare,
    Send,
    Loader2,
    Award,
    Info,
    ChevronRight,
    HelpCircle
} from 'lucide-react';

interface Segment {
    text: string;
    isKeyword: boolean;
    id: number;
}

interface SentenceTemplate {
    id: string;
    name: string;
    methodName: string;
    explanation: string;
    original: string;
    template: string;
    keywords: string[];
    segments: Segment[];
    presetTopics: string[];
}

const templates: SentenceTemplate[] = [
    {
        id: "simon-focus",
        name: "破局攻坚句：单点突破",
        methodName: "融入 西蒙集中攻坚法",
        explanation: "西蒙学习法强调连续集中投入。本句式采用‘面对...，唯有像...一样死死钉在...，以...持续发力，方能...’，通过强烈的行动比喻和因果关联，塑造实干作风，减轻处理抽象概念的工作记忆负担。",
        original: "面对关键核心技术受制于人的严峻挑战，我们唯有像锥子一样死死钉在自主创新这一突破口上，以咬定青山不放松的韧劲持续发力，方能在全球科技竞争中抢占制高点。",
        template: "面对...的严峻挑战，我们唯有像...一样死死钉在...这一突破口上，以...的韧劲持续发力，方能在...中...",
        keywords: ["面对", "严峻挑战", "唯有像", "一样死死钉在", "这一突破口上", "以", "持续发力", "方能在", "中"],
        segments: [
            { text: "面对", isKeyword: true, id: 1 },
            { text: "关键核心技术受制于人的", isKeyword: false, id: 2 },
            { text: "严峻挑战", isKeyword: true, id: 3 },
            { text: "，我们", isKeyword: false, id: 4 },
            { text: "唯有像", isKeyword: true, id: 5 },
            { text: "锥子", isKeyword: false, id: 6 },
            { text: "一样死死钉在", isKeyword: true, id: 7 },
            { text: "自主创新", isKeyword: false, id: 8 },
            { text: "这一突破口上", isKeyword: true, id: 9 },
            { text: "，以", isKeyword: true, id: 10 },
            { text: "咬定青山不放松", isKeyword: false, id: 11 },
            { text: "的韧劲", isKeyword: false, id: 12 },
            { text: "持续发力", isKeyword: true, id: 13 },
            { text: "，", isKeyword: false, id: 14 },
            { text: "方能在", isKeyword: true, id: 15 },
            { text: "全球科技竞争", isKeyword: false, id: 16 },
            { text: "中", isKeyword: true, id: 17 },
            { text: "抢占制高点。", isKeyword: false, id: 18 }
        ],
        presetTopics: ["乡村振兴特色产业", "地方中小企业防风险", "生态环境污染治理", "营商环境体制改革"]
    },
    {
        id: "feynman-teach",
        name: "概念界定句：正本清源",
        methodName: "融入 费曼本质拆解法",
        explanation: "所谓费曼法就是‘把复杂的科学概念用最简单的话讲透’。句式‘所谓...，本质上不是...，而是...，即以...为核心，消除...，让...向...顺畅流动’，适合对宏观重大政策概念进行精准的内涵剖析。",
        original: "所谓新质生产力，本质上不是传统生产要素的粗放叠加，而是创新起主导作用的绿色先进生产力，即以科技创新为核心，消除阻碍产业升级的体制壁垒，让优质生产要素向实体经济顺畅流动。",
        template: "所谓...，本质上不是...，而是...，即以...为核心，消除...，让...向...顺畅流动。",
        keywords: ["所谓", "本质上不是", "而是", "即以", "为核心", "消除", "让", "向", "顺畅流动"],
        segments: [
            { text: "所谓", isKeyword: true, id: 1 },
            { text: "新质生产力，", isKeyword: false, id: 2 },
            { text: "本质上不是", isKeyword: true, id: 3 },
            { text: "传统生产要素的粗放叠加，", isKeyword: false, id: 4 },
            { text: "而是", isKeyword: true, id: 5 },
            { text: "创新起主导作用的绿色先进生产力，", isKeyword: false, id: 6 },
            { text: "即以", isKeyword: true, id: 7 },
            { text: "科技创新", isKeyword: false, id: 8 },
            { text: "为核心", isKeyword: true, id: 9 },
            { text: "，", isKeyword: false, id: 10 },
            { text: "消除", isKeyword: true, id: 11 },
            { text: "阻碍产业升级的体制壁垒，", isKeyword: false, id: 12 },
            { text: "让", isKeyword: true, id: 13 },
            { text: "优质生产要素", isKeyword: false, id: 14 },
            { text: "向", isKeyword: true, id: 15 },
            { text: "实体经济", isKeyword: false, id: 16 },
            { text: "顺畅流动", isKeyword: true, id: 17 },
            { text: "。", isKeyword: false, id: 18 }
        ],
        presetTopics: ["数字政府建设", "高标准农田建设", "绿色低碳转型", "产学研深度融合"]
    },
    {
        id: "smart-target",
        name: "目标规划句：量化成效",
        methodName: "融入 SMART 目标法则",
        explanation: "量化目标是公文体现政策落地可执行力的关键。句式‘为实现...，我们计划在...期间，将...比重提升至...，并同步降低...，确保...稳步推进’，利用清晰的数字化表述降低理解屏障。",
        original: "为实现高质量发展目标，我们计划在‘十四五’期间，将高技术制造业增加值比重提升至25%以上，并同步降低万元GDP能耗13.5%，确保经济社会全面低碳转型稳步推进。",
        template: "为实现...，我们计划在...期间，将...比重提升至...，并同步降低...，确保...稳步推进。",
        keywords: ["为实现", "计划在", "期间", "将", "比重提升至", "并同步降低", "确保", "稳步推进"],
        segments: [
            { text: "为实现", isKeyword: true, id: 1 },
            { text: "高质量发展目标，", isKeyword: false, id: 2 },
            { text: "我们", isKeyword: false, id: 3 },
            { text: "计划在", isKeyword: true, id: 4 },
            { text: "‘十四五’", isKeyword: false, id: 5 },
            { text: "期间", isKeyword: true, id: 6 },
            { text: "，", isKeyword: false, id: 7 },
            { text: "将", isKeyword: true, id: 8 },
            { text: "高技术制造业增加值", isKeyword: false, id: 9 },
            { text: "比重提升至", isKeyword: true, id: 10 },
            { text: "25%以上，", isKeyword: false, id: 11 },
            { text: "并同步降低", isKeyword: true, id: 12 },
            { text: "万元GDP能耗13.5%，", isKeyword: false, id: 13 },
            { text: "确保", isKeyword: true, id: 14 },
            { text: "经济社会全面低碳转型", isKeyword: false, id: 15 },
            { text: "稳步推进", isKeyword: true, id: 16 },
            { text: "。", isKeyword: false, id: 17 }
        ],
        presetTopics: ["数字乡村宽带覆盖率", "专精特新企业培育", "清洁能源电力并网", "政务服务一次办结率"]
    },
    {
        id: "error-reflection",
        name: "问题剖析句：直击痛点",
        methodName: "融入 错题复盘法",
        explanation: "在错题和短板中寻找认知的提升路径。句式‘虽然我们在...上取得了丰硕成果，但在...和...上仍存在明显短板，这表明我们过去的...过于偏向...，而忽视了...’体现了直面问题并深入底层的思辨深度。",
        original: "虽然我们在关键领域核心技术攻关上取得了丰硕成果，但在基础理论研究和源头创新能力上仍存在明显短板，这表明我们过去的政策引导过于偏向应用侧，而忽视了底层基础地基的夯实。",
        template: "虽然我们在...上取得了丰硕成果，但在...和...上仍存在明显短板，这表明我们过去的...过于偏向...，而忽视了...。",
        keywords: ["虽然我们在", "上取得了丰硕成果", "但在", "和", "上仍存在明显短板", "这表明我们过去的", "过于偏向", "而忽视了"],
        segments: [
            { text: "虽然我们在", isKeyword: true, id: 1 },
            { text: "关键领域核心技术攻关", isKeyword: false, id: 2 },
            { text: "上取得了丰硕成果", isKeyword: true, id: 3 },
            { text: "，", isKeyword: false, id: 4 },
            { text: "但在", isKeyword: true, id: 5 },
            { text: "基础理论研究", isKeyword: false, id: 6 },
            { text: "和", isKeyword: true, id: 7 },
            { text: "源头创新能力", isKeyword: false, id: 8 },
            { text: "上仍存在明显短板", isKeyword: true, id: 9 },
            { text: "，", isKeyword: false, id: 10 },
            { text: "这表明我们过去的", isKeyword: true, id: 11 },
            { text: "政策引导", isKeyword: false, id: 12 },
            { text: "过于偏向", isKeyword: true, id: 13 },
            { text: "应用侧，", isKeyword: false, id: 14 },
            { text: "而忽视了", isKeyword: true, id: 15 },
            { text: "底层基础地基的夯实。", isKeyword: false, id: 16 }
        ],
        presetTopics: ["现代物流体系建设", "新能源汽车出海", "垃圾分类社区推广", "营商环境企业满意度"]
    },
    {
        id: "mvp-breakthrough",
        name: "路径探索句：试点先行",
        methodName: "融入 MVP 最小可行路径法",
        explanation: "中国改革开放的重要经验就是‘试点先行，逐步推广’，这与MVP方法论完全契合。句式‘在...全面推广之前，我们可以先通过...的方式跑通...路径，验证...，再逐步推行...的建设’体现了以小步快跑的方式降低整体负荷的稳健哲学。",
        original: "在新一轮改革方案全面推广之前，我们可以先通过设立自贸试验区的方式跑通体制创新路径，验证各项改革举措的实际成效，再逐步推行全国范围内的复制与推广。",
        template: "在...全面推广之前，我们可以先通过...的方式跑通...路径，验证...，再逐步推行...的建设。",
        keywords: ["在", "全面推广之前", "我们可以先通过", "的方式跑通", "路径", "验证", "再逐步推行"],
        segments: [
            { text: "在", isKeyword: true, id: 1 },
            { text: "新一轮改革方案", isKeyword: false, id: 2 },
            { text: "全面推广之前", isKeyword: true, id: 3 },
            { text: "，", isKeyword: false, id: 4 },
            { text: "我们可以先通过", isKeyword: true, id: 5 },
            { text: "设立自贸试验区", isKeyword: false, id: 6 },
            { text: "的方式跑通", isKeyword: true, id: 7 },
            { text: "体制创新", isKeyword: false, id: 8 },
            { text: "路径", isKeyword: true, id: 9 },
            { text: "，", isKeyword: false, id: 10 },
            { text: "验证", isKeyword: true, id: 11 },
            { text: "各项改革举措的实际成效，", isKeyword: false, id: 12 },
            { text: "再逐步推行", isKeyword: true, id: 13 },
            { text: "全国范围内的复制与推广", isKeyword: false, id: 14 },
            { text: "。", isKeyword: false, id: 15 }
        ],
        presetTopics: ["数字乡村建设", "跨省异地医保结算", "智慧停车网格化治理", "高新技术园区低碳改造"]
    }
];

export default function SentenceTraining() {
    const { aiProvider, apiKeys, endpoints, models } = useSettings();
    const [selectedId, setSelectedId] = useState(templates[0].id);
    const activeTemplate = templates.find(t => t.id === selectedId) || templates[0];

    // Progression workflow state
    const [step, setStep] = useState<'observe' | 'reconstruct' | 'feedback'>('observe');

    // Step 1: Observe & Deconstruct states
    const [clickedKeywordIds, setClickedKeywordIds] = useState<number[]>([]);
    const [feynmanExplanation, setFeynmanExplanation] = useState('');
    const totalKeywordsCount = activeTemplate.segments.filter(s => s.isKeyword).length;
    const isStep1Unlocked = clickedKeywordIds.length === totalKeywordsCount && feynmanExplanation.trim().length >= 5;

    // Step 2: Reconstruct states
    const [selectedTopic, setSelectedTopic] = useState(activeTemplate.presetTopics[0]);
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

    // Reset everything when sentence template changes
    useEffect(() => {
        setStep('observe');
        setClickedKeywordIds([]);
        setFeynmanExplanation('');
        setSelectedTopic(activeTemplate.presetTopics[0]);
        setIsCustomTopic(false);
        setCustomTopicText('');
        setUserDraft('');
        setFeedback(null);
        setChatHistory([]);
        setChatInput('');
    }, [selectedId, activeTemplate]);

    // Scroll to bottom of chat on history update
    useEffect(() => {
        chatEndRef.current?.scrollIntoView({ behavior: 'smooth' });
    }, [chatHistory]);

    // Step 1 helper: handle segment click
    const handleSegmentClick = (segment: Segment) => {
        if (!segment.isKeyword || step !== 'observe') return;

        if (clickedKeywordIds.includes(segment.id)) {
            setClickedKeywordIds(prev => prev.filter(id => id !== segment.id));
        } else {
            setClickedKeywordIds(prev => [...prev, segment.id]);
        }
    };

    // Step 2 helper: go to Step 2
    const handleProceedToStep2 = () => {
        if (!isStep1Unlocked) return;
        setStep('reconstruct');
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
                activeTemplate.template,
                activeTemplate.original,
                userDraft,
                activeTemplate.methodName,
                aiProvider,
                { apiKey: apiKeys[aiProvider], endpoint: endpoints[aiProvider], model: models[aiProvider] }
            );

            if (res) {
                setFeedback(res);
                // Pre-populate chat history with standard greeting from AI containing context
                setChatHistory([
                    {
                        role: 'assistant',
                        content: `我已经对你的仿写进行了智能诊断，评分为 **${res.score}分**。\n\n针对我们练习的主题【${topic}】，我的修改方案是：\n> **${res.standard_version}**\n\n你可以围绕句子的修辞、逻辑或者如何减轻读者认知负荷来向我提问。点击下方的快捷追问，或在输入框中直接输入吧！`
                    }
                ]);
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
        if (!messageToSend || chatLoading || !feedback) return;

        const newHistory = [...chatHistory, { role: 'user' as const, content: messageToSend }];
        setChatHistory(newHistory);
        if (!customMessage) setChatInput('');
        setChatLoading(true);

        const currentTopic = isCustomTopic ? customTopicText.trim() : selectedTopic;

        try {
            // Pass the formatted history (excluding the first prompt instruction handled in ai.ts)
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
                            <h2 className="text-xl font-bold tracking-wide official-font">句子训练：基于认知负荷与 ICAP 框架</h2>
                            <p className="text-xs text-blue-200 opacity-80">突破工作记忆内存瓶颈，通过“输入-加工-升华”三步走，打造高效公文写作肌肉记忆。</p>
                        </div>
                    </div>

                    <div className="grid md:grid-cols-2 gap-4 pt-2">
                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5 text-slate-200">
                            <h4 className="text-xs font-bold text-teal-300 uppercase tracking-widest flex items-center gap-1.5">
                                <Info className="w-3.5 h-3.5" /> 认知负荷理论 (Cognitive Load Theory)
                            </h4>
                            <p className="text-xs leading-relaxed text-slate-300">
                                大脑的“工作记忆（内存）”极度有限（4±1个信息块）。本训练在**输入阶段**引入“范例标记”，用骨架拆解降低内在负荷；在**加工阶段**通过“闭卷重构”屏蔽原文，强迫生成，构建长期记忆硬盘的“图式”。
                            </p>
                        </div>

                        <div className="bg-white/5 border border-white/10 rounded-xl p-3.5 space-y-1.5 text-slate-200">
                            <h4 className="text-xs font-bold text-purple-300 uppercase tracking-widest flex items-center gap-1.5">
                                <GraduationCap className="w-3.5 h-3.5" /> ICAP 交互认知参与模型
                            </h4>
                            <p className="text-xs leading-relaxed text-slate-300">
                                学习成效随外部动作深度跃升：从**P被动**（读范例）到**A主动**（点击圈画骨架、大白话翻译）、再到**C建构**（自我重构仿写）、最终以**I互动**（与 AI 教练深度追问思辨）完成新知识固化。
                            </p>
                        </div>
                    </div>
                </div>
            </div>

            {/* Main Area layout: Sidebar + Workspace */}
            <div className="grid lg:grid-cols-4 gap-6">
                {/* Left Sidebar: Sentence Selector */}
                <div className="lg:col-span-1 space-y-4">
                    <div className="bg-white p-4 rounded-xl border border-slate-200 shadow-sm">
                        <h3 className="text-sm font-bold text-slate-400 uppercase tracking-wider mb-3">经典学习模板库</h3>
                        <div className="space-y-2">
                            {templates.map((tpl) => (
                                <button
                                    key={tpl.id}
                                    onClick={() => setSelectedId(tpl.id)}
                                    className={cn(
                                        "w-full text-left p-3.5 rounded-lg border transition-all relative overflow-hidden group",
                                        selectedId === tpl.id
                                            ? "border-blue-600 bg-blue-50/50 shadow-sm ring-1 ring-blue-100"
                                            : "border-slate-200 hover:bg-slate-50"
                                    )}
                                >
                                    <div className={cn(
                                        "font-bold text-sm mb-1 group-hover:text-blue-600 transition-colors",
                                        selectedId === tpl.id ? "text-blue-700" : "text-slate-700"
                                    )}>
                                        {tpl.name}
                                    </div>
                                    <div className="text-[10px] text-slate-400 line-clamp-1">
                                        {tpl.methodName}
                                    </div>
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* Method card details */}
                    <div className="bg-slate-50 rounded-xl p-4 border border-slate-200 space-y-3">
                        <h4 className="text-xs font-bold text-slate-500 uppercase tracking-widest flex items-center gap-1.5">
                            <Sparkles className="w-3.5 h-3.5 text-amber-500" />
                            学习机制解析
                        </h4>
                        <div>
                            <div className="text-xs font-bold text-slate-700 mb-1">{activeTemplate.methodName}</div>
                            <p className="text-xs text-slate-500 leading-relaxed">
                                {activeTemplate.explanation}
                            </p>
                        </div>
                    </div>
                </div>

                {/* Right Workspace: Core Training Pipeline */}
                <div className="lg:col-span-3 space-y-6">
                    {/* Pipeline Navigation / Status */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm p-4 flex justify-between items-center overflow-x-auto whitespace-nowrap gap-4">
                        <div className="flex items-center gap-8 w-full justify-around">
                            <div className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors",
                                step === 'observe' ? "text-blue-600 font-bold" : "text-slate-400"
                            )}>
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                                    step === 'observe' ? "bg-blue-600 text-white" : "bg-slate-100 text-slate-400"
                                )}>1</span>
                                输入阶段：观察拆解 (P/A)
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 hidden md:block" />
                            <div className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors",
                                step === 'reconstruct' ? "text-purple-600 font-bold" : "text-slate-400"
                            )}>
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                                    step === 'reconstruct' ? "bg-purple-600 text-white" : "bg-slate-100 text-slate-400"
                                )}>2</span>
                                加工阶段：闭卷重构 (C)
                            </div>
                            <ChevronRight className="w-4 h-4 text-slate-300 hidden md:block" />
                            <div className={cn(
                                "flex items-center gap-2 text-sm font-medium transition-colors",
                                step === 'feedback' ? "text-teal-600 font-bold" : "text-slate-400"
                            )}>
                                <span className={cn(
                                    "w-6 h-6 rounded-full flex items-center justify-center text-xs font-bold transition-colors",
                                    step === 'feedback' ? "bg-teal-600 text-white" : "bg-slate-100 text-slate-400"
                                )}>3</span>
                                升华阶段：互动思辨 (I)
                            </div>
                        </div>
                    </div>

                    {/* Step Panels */}
                    <div className="bg-white rounded-xl border border-slate-200 shadow-sm min-h-[460px] flex flex-col overflow-hidden relative">

                        {/* STEP 1: OBSERVE & DECONSTRUCT */}
                        {step === 'observe' && (
                            <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col justify-between animate-in fade-in">
                                <div className="space-y-6">
                                    <div className="space-y-2">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-blue-100 text-blue-800 rounded-full text-xs font-bold">
                                            <Info className="w-3.5 h-3.5" />
                                            第一阶段：内在负荷调控 (P/A)
                                        </div>
                                        <h3 className="text-xl font-bold text-slate-800">圈画核心骨架，拆解知识组块</h3>
                                        <p className="text-sm text-slate-500">
                                            阅读下面的范例句子。请**依次点击并高亮所有的公文结构词（粗体所标指引词）**，通过主动标记将核心语法轨道的内在处理负荷剥离。全部圈中后将解锁下一步。
                                        </p>
                                    </div>

                                    {/* Segment Clicking Area */}
                                    <div className="bg-slate-50/50 p-6 rounded-xl border border-slate-100 space-y-4">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            范例句子（点击核心结构词）：
                                        </div>
                                        <div className="text-lg leading-loose text-slate-700 font-serif select-none flex flex-wrap gap-1.5 items-center">
                                            {activeTemplate.segments.map((seg) => (
                                                <span
                                                    key={seg.id}
                                                    onClick={() => handleSegmentClick(seg)}
                                                    className={cn(
                                                        "px-1.5 py-0.5 rounded cursor-pointer transition-all duration-200",
                                                        seg.isKeyword
                                                            ? clickedKeywordIds.includes(seg.id)
                                                                ? "bg-blue-600 text-white font-bold scale-105 shadow-sm shadow-blue-200"
                                                                : "border-b-2 border-dashed border-blue-400 font-semibold text-blue-900 bg-blue-50/30 hover:bg-blue-100/50"
                                                            : "text-slate-600 cursor-default hover:bg-slate-100/30"
                                                    )}
                                                >
                                                    {seg.text}
                                                </span>
                                            ))}
                                        </div>

                                        {/* Click progress */}
                                        <div className="flex items-center gap-3 pt-2 border-t border-slate-200/60 text-xs">
                                            <span className="text-slate-400">标记进度：</span>
                                            <span className="font-bold text-slate-700">
                                                {clickedKeywordIds.length} / {totalKeywordsCount} 个结构词
                                            </span>
                                            {clickedKeywordIds.length === totalKeywordsCount && (
                                                <span className="text-green-600 font-bold flex items-center gap-1">
                                                    <CheckCircle2 className="w-3.5 h-3.5" /> 骨架拆拆完成！
                                                </span>
                                            )}
                                        </div>
                                    </div>

                                    {/* Feynman Explanation Input */}
                                    <div className="space-y-2">
                                        <label className="text-sm font-bold text-slate-700 flex items-center gap-1.5">
                                            <MessageSquare className="w-4 h-4 text-purple-500" />
                                            费曼输出（以教促学）：尝试用“大白话/极其直白的话”简述该句式的底层逻辑
                                        </label>
                                        <p className="text-xs text-slate-400">
                                            不要死记硬背。试想怎么把这句话的底层道理说给毫无公文背景的小孩听（不少于5个字）：
                                        </p>
                                        <input
                                            type="text"
                                            value={feynmanExplanation}
                                            onChange={(e) => setFeynmanExplanation(e.target.value)}
                                            placeholder="例如：遇到困难（受制于人）时要集中全部力量（锥子一样）在关键处攻坚直到成功。"
                                            className="w-full px-4 py-3 rounded-lg border border-slate-200 outline-none focus:ring-2 focus:ring-blue-500/20 text-sm placeholder:text-slate-300"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex justify-end">
                                    <button
                                        onClick={handleProceedToStep2}
                                        disabled={!isStep1Unlocked}
                                        className={cn(
                                            "px-6 py-3 rounded-xl font-bold flex items-center gap-2 shadow-lg transition-all",
                                            isStep1Unlocked
                                                ? "bg-blue-600 text-white hover:bg-blue-700 shadow-blue-200"
                                                : "bg-slate-100 text-slate-400 shadow-none cursor-not-allowed"
                                        )}
                                    >
                                        进入闭卷仿写
                                        <ArrowRight className="w-4 h-4" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 2: RECONSTRUCT */}
                        {step === 'reconstruct' && (
                            <div className="p-6 md:p-8 space-y-6 flex-1 flex flex-col justify-between animate-in slide-in-from-right-6">
                                <div className="space-y-6">
                                    <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                                        <div className="space-y-1">
                                            <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-purple-100 text-purple-800 rounded-full text-xs font-bold">
                                                <GraduationCap className="w-3.5 h-3.5" />
                                                第二阶段：加工与主动建构 (C)
                                            </div>
                                            <h3 className="text-xl font-bold text-slate-800">闭卷重构 · 动态换挡</h3>
                                        </div>
                                        <button
                                            onClick={() => setStep('observe')}
                                            className="text-xs text-slate-400 hover:text-slate-600 flex items-center gap-1"
                                        >
                                            ← 返回看范句
                                        </button>
                                    </div>

                                    <div className="bg-slate-50 p-4 rounded-xl border border-slate-200/60 space-y-2">
                                        <div className="text-xs font-bold text-slate-400 uppercase tracking-widest">
                                            目标句式模板：
                                        </div>
                                        <div className="font-mono text-sm text-blue-700 bg-white p-3 rounded-lg border border-blue-100 shadow-sm leading-relaxed">
                                            {activeTemplate.template}
                                        </div>
                                    </div>

                                    {/* Topic Selector */}
                                    <div className="space-y-3">
                                        <label className="block text-sm font-bold text-slate-700">
                                            1. 选择或定义仿写主题：
                                        </label>
                                        <div className="flex flex-wrap gap-2">
                                            {activeTemplate.presetTopics.map((topic) => (
                                                <button
                                                    key={topic}
                                                    onClick={() => {
                                                        setSelectedTopic(topic);
                                                        setIsCustomTopic(false);
                                                    }}
                                                    className={cn(
                                                        "px-3 py-1.5 text-xs rounded-lg border font-medium transition-all",
                                                        !isCustomTopic && selectedTopic === topic
                                                            ? "bg-purple-600 text-white border-purple-600"
                                                            : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
                                                    )}
                                                >
                                                    {topic}
                                                </button>
                                            ))}
                                            <button
                                                onClick={() => setIsCustomTopic(true)}
                                                className={cn(
                                                    "px-3 py-1.5 text-xs rounded-lg border font-medium transition-all",
                                                    isCustomTopic
                                                        ? "bg-purple-600 text-white border-purple-600"
                                                        : "bg-white text-slate-600 border-slate-200 hover:bg-slate-50"
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
                                                placeholder="在此输入您想要仿写的自定义主题..."
                                                className="w-full px-4 py-2 border border-slate-200 rounded-lg outline-none focus:ring-2 focus:ring-purple-500/20 text-sm animate-in slide-in-from-top-2"
                                            />
                                        )}
                                    </div>

                                    {/* User Input Draft */}
                                    <div className="space-y-2">
                                        <div className="flex justify-between items-center">
                                            <label className="text-sm font-bold text-slate-700">
                                                2. 凭记忆重构句子（切忌看范例）：
                                            </label>
                                            <span className="text-xs text-slate-400">{userDraft.length} 字</span>
                                        </div>
                                        <textarea
                                            value={userDraft}
                                            onChange={(e) => setUserDraft(e.target.value)}
                                            placeholder={`例如根据"${isCustomTopic ? (customTopicText || '自定义') : selectedTopic}"主题，套用模板重构句子...`}
                                            className="w-full h-36 px-5 py-4 border border-slate-200 rounded-xl outline-none focus:ring-4 focus:ring-purple-500/10 focus:border-purple-500 text-base leading-relaxed resize-none"
                                        />
                                    </div>
                                </div>

                                <div className="pt-6 border-t border-slate-100 flex justify-between gap-4">
                                    <div className="flex items-center gap-1.5 text-xs text-slate-400">
                                        <HelpCircle className="w-4 h-4" />
                                        提示：尽量完全套用句式骨架，换词一定要精确庄重。
                                    </div>
                                    <button
                                        onClick={handleSubmitDraft}
                                        disabled={!userDraft.trim()}
                                        className="px-8 py-3 bg-black text-white font-bold rounded-xl hover:bg-slate-800 disabled:opacity-50 transition-all flex items-center gap-2 shadow-lg shadow-slate-200"
                                    >
                                        提交评估，开启 AI 深度对比
                                        <Sparkles className="w-4 h-4 text-amber-300" />
                                    </button>
                                </div>
                            </div>
                        )}

                        {/* STEP 3: FEEDBACK & DIALOGUE */}
                        {step === 'feedback' && (
                            <div className="flex-1 flex flex-col justify-between animate-in zoom-in-95 duration-300 h-full">
                                {/* Header buttons */}
                                <div className="flex-none p-4 border-b border-slate-100 flex justify-between items-center bg-white/90 backdrop-blur z-10">
                                    <div className="flex items-center gap-2">
                                        <div className="inline-flex items-center gap-1.5 px-3 py-1 bg-teal-100 text-teal-800 rounded-full text-xs font-bold">
                                            <Sparkles className="w-3.5 h-3.5" />
                                            第三阶段：升华与互动思辨 (I)
                                        </div>
                                        <span className="text-xs text-slate-400 font-medium">主题：{isCustomTopic ? customTopicText : selectedTopic}</span>
                                    </div>
                                    <div className="flex gap-2">
                                        <button
                                            onClick={() => setStep('reconstruct')}
                                            className="px-4 py-2 text-xs font-bold text-slate-600 hover:bg-slate-50 border border-slate-200 rounded-lg transition-colors"
                                        >
                                            返回重写
                                        </button>
                                        <button
                                            onClick={() => setStep('observe')}
                                            className="px-4 py-2 text-xs font-bold text-white bg-blue-600 hover:bg-blue-700 rounded-lg shadow-sm shadow-blue-200 transition-colors"
                                        >
                                            新练习
                                        </button>
                                    </div>
                                </div>

                                {/* Loading state */}
                                {aiLoading && (
                                    <div className="flex-1 flex flex-col items-center justify-center text-slate-400 min-h-[400px] space-y-3">
                                        <Loader2 className="w-10 h-10 animate-spin text-teal-500" />
                                        <div className="text-sm font-bold text-slate-600">AI 正在对比分析评估中...</div>
                                        <div className="text-xs text-slate-400">正在应用认知科学理论计算写作图式 Gap</div>
                                    </div>
                                )}

                                {/* Feedback Loaded */}
                                {!aiLoading && feedback && (
                                    <div className="flex-1 flex flex-col overflow-y-auto">
                                        {/* Results Section */}
                                        <div className="p-6 bg-slate-50/50 border-b border-slate-100">
                                            <div className="grid md:grid-cols-3 gap-6">
                                                {/* Left: Score Card */}
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
                                                        <p className="text-[11px] text-slate-400">基于句式拟合度、措辞严谨性评估</p>
                                                    </div>
                                                </div>

                                                {/* Middle: Gap Analysis */}
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

                                            {/* Diagnostic comments */}
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

                                        {/* Interactive Chat Arena */}
                                        <div className="p-6 space-y-4 bg-slate-100/50 flex-1 flex flex-col min-h-[350px]">
                                            <div className="flex items-center gap-1.5 text-sm font-bold text-slate-700 border-b border-slate-200 pb-2">
                                                <MessageSquare className="w-4.5 h-4.5 text-teal-600" />
                                                <span>双向互动思辨（ICAP最高层-Interactive）</span>
                                            </div>
                                            <p className="text-xs text-slate-400">
                                                您可以针对这次评估，同 AI 展开学术级别的写作辩论。点击下方快捷提问或直接向 AI 发问：
                                            </p>

                                            {/* Chat Messages */}
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
                                                        <p className="whitespace-pre-wrap">{msg.content}</p>
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

                                            {/* Suggestions Panel */}
                                            <div className="flex flex-wrap gap-2">
                                                <button
                                                    onClick={() => handleSendChatMessage("这个句子的‘内在负荷’怎么能再减轻一点？你可以给我演示一下把它的分句结构拆得更开的写法吗？")}
                                                    className="px-3 py-1.5 text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full font-medium transition-colors"
                                                >
                                                    💡 如何减轻认知负荷？
                                                </button>
                                                <button
                                                    onClick={() => handleSendChatMessage("帮我把标杆句再修改成更气势磅礴的排比结构。")}
                                                    className="px-3 py-1.5 text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full font-medium transition-colors"
                                                >
                                                    🔥 改为气势排比结构
                                                </button>
                                                <button
                                                    onClick={() => handleSendChatMessage("我刚刚写的句子如果要在工信部公文中发布，是否符合工信部‘庄重朴实’的核心要求？哪里有口语化痕迹？")}
                                                    className="px-3 py-1.5 text-[11px] bg-slate-200 hover:bg-slate-300 text-slate-700 rounded-full font-medium transition-colors"
                                                >
                                                    🔍 诊断词语的公文风格
                                                </button>
                                            </div>

                                            {/* Chat Send Form */}
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
                        )}

                    </div>
                </div>
            </div>
        </div>
    );
}
