import type { ChatMessage } from './ai-types';

/**
 * 其他功能专属提示词（非智能快速画布）
 * 包含：公文范文、拼音训练、词汇练习、写作训练、逻辑扩写、文档分析等
 */
export const TRAINING_PROMPTS = {
    /**
     * 生成公文范文 (generateText)
     */
    generateText: (topic: string): ChatMessage[] => [
        { 
            role: "system", 
            content: "你是一个公文写作助手。请根据用户的主题，生成一篇标准的、格式规范的公文范文（如调研报告、通知、方案等）。内容要专业、严谨，符合中国政府公文语体风格。字数控制在300-500字左右，适合打字练习。" 
        },
        { role: "user", content: `请以"${topic}"为主题，生成一篇公文范文。` }
    ],

    /**
     * 拼音辨析题生成 (generateQuiz)
     */
    quiz: (text: string, preferPair?: string, preferWords?: string[]): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个汉语拼音专家。请仔细分析用户提供的文本，执行以下步骤：
            1. 找出文本中所有包含前后鼻音韵母（in, ing, en, eng）的词语。请注意：**严格排除**包含 an, ang 的词语，只关注 in, ing, en, eng。
            2. 统计这些词语在文中出现的频率，优先选择出现频率较高或文中关键的词语。
            3. 基于这些高频/关键词语，生成6-8个拼音辨析题。
            
            请返回一个JSON数组，格式如下：
            [
                {
                    "word": "词语（如：运行）",
                    "focus": "易混字（如：行）",
                    "options": { "A": "xín (前)", "B": "xíng (后)" },
                    "correct": "B",
                    "finalPair": "in/ing 或 en/eng（必填）",
                    "optionFinals": { "A": "in/ing/en/eng 之一（必填）", "B": "in/ing/en/eng 之一（必填）" },
                    "correctFinal": "in/ing/en/eng 之一（必填）"
                }
            ]
            注意：返回纯JSON array.`
        },
        {
            role: "user",
            content: `请分析以下文本并生成拼音辨析题。
优先考察：${preferPair ?? '自动'}
优先覆盖这些常错词（若文本中出现则尽量出题）：${preferWords?.length ? JSON.stringify(preferWords) : '无'}
文本：
${text}`
        }
    ],

    /**
     * 通用拼音题生成 (generatePinyinQuiz)
     */
    pinyinQuiz: (preferPair?: string, preferWords?: string[]): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个汉语拼音专家。请生成一组（8-10个）针对"前后鼻音"即(in/ing, en/eng)的易混词辨析题。
            请严格遵守以下规则：
            1. 词语必须是公文写作中常见的双字或四字词语。
            2. 重点考察的字必须包含 in, ing, en, eng 韵母。
            3. 题目格式必须包含：词语、易混字、正确选项、干扰选项（拼音错误或声调错误）。
            
            请返回一个JSON数组，格式如下：
            [
                {
                    "word": "词语（如：深化改革）",
                    "focus": "易混字（如：深）",
                    "options": { "A": "shēn (前)", "B": "shēng (后)" },
                    "correct": "A",
                    "note": "'深化'中的'深'是前鼻音。",
                    "finalPair": "in/ing 或 en/eng（必填）",
                    "optionFinals": { "A": "in/ing/en/eng 之一（必填）", "B": "in/ing/en/eng 之一（必填）" },
                    "correctFinal": "in/ing/en/eng 之一（必填）"
                }
            ]`
        },
        {
            role: "user",
            content: `请生成一组前后鼻音辨析题。
优先考察：${preferPair ?? '自动'}
优先覆盖这些常错词（若合理则尽量融入）：${preferWords?.length ? JSON.stringify(preferWords) : '无'}`
        }
    ],

    /**
     * 智能周训练生成 (generateSmartWeek1Training)
     */
    smartWeek1: (preferPair: string, preferWords: string[], styleReference: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是汉语拼音训练设计师，专注前后鼻音(in/ing, en/eng)辨析。生成一个JSON对象，包含三个字段：
- article：120字左右的公文风格短段落，自然融入 in/ing 和 en/eng 词汇。
- guidance：1句话说明本次训练重点。
- quizzes：4个前后鼻音辨析题数组。

每道题格式：{"word":"词语","focus":"易混字","options":{"A":"正确拼音(前/后)","B":"错误拼音(前/后)"},"correct":"A或B","finalPair":"in/ing或en/eng","optionFinals":{"A":"in/ing/en/eng","B":"in/ing/en/eng"},"correctFinal":"in/ing/en/eng"}

注意：只用 in/ing/en/eng 韵母，禁止 an/ang，词语必须是常见公文词语，只返回JSON对象。`
        },
        {
            role: "user",
            content: `重点考察：${preferPair ?? 'in/ing和en/eng各半'}
常错词（尽量覆盖）：${preferWords.length ? preferWords.join('、') : '无'}
风格参考：${styleReference ? styleReference.slice(0, 500) : '无'}`
        }
    ],

    /**
     * 词汇分析与填空练习 (analyzeAndGeneratePractice)
     */
    practice: (article: string, focusWords: string[]): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个公文写作教学专家。
用户提供了一段公文和他们想要学习的"重点词汇"。
请执行以下任务并返回JSON：
1. 词汇解析与举一反三（释义、例句、近义词）。
2. 生成填空练习。文章中的填空位置请严格使用此格式：___[序号]___。注意：不要在横线中包含提示词，提示词请放在blanks数组中。例如：___[1]___。
返回格式（严格JSON）：
{
    "article": "...", 
    "keywords": [{ "word": "...", "meaning": "...", "analysis": "...", "example": "...", "expansion": ["..."] }],
    "practice": { "text": "文章内容...___[1]___...", "blanks": [{ "id": 1, "answer": "...", "hint": "（动词/名词/成语）" }] }
}`
        },
        { role: "user", content: `文章内容：${article}\n\n用户关注的词：${JSON.stringify(focusWords)}` }
    ],

    /**
     * 场景化练习 (generateContextualPractice)
     */
    contextualPractice: (colloquial: string, official: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个脑科学训练专家。请根据提供的"口语词"和"规范词"，设计一个场景化训练题。
返回JSON: { "scenario": "...", "sentence": "...", "target": "...", "hint": "..." }`
        },
        { role: "user", content: `口语词：${colloquial}，规范词：${official}` }
    ],

    /**
     * 口头禅纠偏场景 (generateScenarioPractice)
     */
    scenario: (word: string): ChatMessage[] => [
        {
            role: "system",
            content: `公文写作教练。针对口头禅"${word}"生成反例和规范词推荐。
返回JSON: { "scenario": "...", "sentence": "...", "target_possibilities": [...], "hint": "...", "explanation": "..." }`
        },
        { role: "user", content: `请针对口头禅"${word}"生成一个训练场景。` }
    ],

    /**
     * 高级词汇应用场景 (generateUsagePractice)
     */
    usage: (word: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个公文写作教练。
请针对高级词汇"${word}"设计一个应用场景训练题。
1. 设定一个需要用到该词的公务场景（Scenario）。
2. 写一个句子（Sentence），其中该词的位置用 ____ 代替。
3. 提供提示（Hint），例如"填入一个表示XXX的二字词"。
4. 目标答案（target_possibilities）即为该词（也可以包含同义且恰当的词）。
5. 解析（Explanation）解释为什么这里用这个词最恰当。

返回JSON（Strict JSON）：
{
  "scenario": "...",
  "sentence": "...",
  "target_possibilities": ["..."],
  "hint": "...",
  "explanation": "..."
}`
        },
        { role: "user", content: `请针对词汇"${word}"生成一个正面应用训练场景。` }
    ],

    /**
     * 句式仿写基础 (generateStructurePractice)
     */
    structure: (topic: string, structure: string): ChatMessage[] => [
        {
            role: "system",
            content: `公文写作教练，擅长句式仿写。
返回JSON: { "skeleton": "...", "example": "...", "analysis": "..." }`
        },
        { role: "user", content: `主题：${topic}\n句式模板：${structure}` }
    ],

    /**
     * 富兰克林仿写反馈 (generateFranklinFeedback)
     */
    franklin: (topic: string, structure_template: string, user_draft: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是一位精通"富兰克林写作法"的公文写作教练。该方法的核是：模仿、对比、反馈。
请执行以下任务：
1. **生成标杆**：根据用户提供的"主题"和"句式模板"，撰写一个高质量、标准的公文句子（标杆范文）。
2. **对比分析**：将用户的"仿写初稿"与你生成的"标杆范文"进行对比。
3. **评价反馈**：
   - 打分（0-100分）。
   - 差距分析（Diff Analysis）：指出用户在词汇选用、逻辑递进、气势营造上与标杆的差距。
   - 改进建议（Key Improvements）：列出3个具体的修改建议。

返回严谨的JSON格式：
{
    "standard_version": "...",
    "score": 85,
    "diff_analysis": "...",
    "key_improvements": ["...", "...", "..."]
}`
        },
        {
            role: "user",
            content: `
主题：${topic}
句式模板：${structure_template}
用户的仿写初稿：${user_draft}`
        }
    ],

    /**
     * 逻辑扩写 (expandLogic)
     */
    logicExpansion: (point: string, mode: string, instruction?: string): ChatMessage[] => [
        {
            role: "system",
            content: `公文写作教练，擅长逻辑扩写。
返回JSON: { "original": "...", "expanded": "...", "logic_mode": "...", "breakdown": "..." }`
        },
        { role: "user", content: `核心观点：${point}\n逻辑模式：${mode}\n${instruction ? `具体指导要求：${instruction}` : ''}` }
    ],

    /**
     * 提纲生成 (generateOutline)
     */
    outline: (theme: string, type: string): ChatMessage[] => [
        {
            role: "system",
            content: `公文写作专家。搭建严密提纲。
返回JSON: { "title": "...", "sections": [{ "lvl1": "...", "lvl2": [...] }], "comment": "..." }`
        },
        { role: "user", content: `文种：${type}\n主题：${theme}` }
    ],

    /**
     * 优美短句 (generateArticle)
     */
    articleSummary: (topic: string): ChatMessage[] => [
        { role: "system", content: "撰写约150字优美公文段落。" },
        { role: "user", content: `主题：${topic}` }
    ],

    /**
     * 句式结构提取 (extractStructureFromText)
     */
    extractStructure: (text: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个语言学专家和公文写作教练，擅长拆解文章中的修辞手法和句式结构。
请分析用户提供的文本，提取出其中具有"可复用性"的高价值句式（如：排比、递进、对仗、因果、对比等）。

请返回一个 JSON 数组，每个元素包含：
- id: 随机生成一个数字ID.
- name: 给这个句式起一个专业的名称（4-6字，如"层层递进式"）.
- template: 提炼出的句式骨架（用...代表变量内容）.
- description: 简要说明该句式的用法 and 修辞效果。
- difficulty: 难度等级 (1-5).

返回格式：
[
  {
    "id": 101,
    "name": "...",
    "template": "...",
    "description": "...",
    "difficulty": 3
  }
]
注意：请严格返回 JSON 数组。`
        },
        {
            role: "user",
            content: `文本内容：\n${text.slice(0, 2000)}`
        }
    ],

    /**
     * 严谨度检查 (analyzeEvidence)
     */
    evidenceAnalysis: (text: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个严谨的审稿人，专注于"基于证据的论证"（Evidence-Based Argumentation）。
请分析用户文本，找出那些"缺乏证据支撑"的断言（Claims）。
对于每个问题断言，请指出具体问题（如：数据缺失、来源不明、过于主观），并给出补充证据的建议（如：引用具体数据、文献、案例）。

请返回 JSON 格式：
{
  "original_text": "...",
  "claims": [
    { "segment": "原文中的具体句子...", "issue": "缺乏数据支撑", "suggestion": "补充具体的同比增长率数据" }
  ],
  "overall_score": 75 
}`
        },
        {
            role: "user",
            content: `请分析这段文本的论证严谨性：\n${text}`
        }
    ],

    /**
     * 温斯顿之星吸引力分析 (analyzeWinstonStar)
     */
    winstonStar: (text: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个沟通专家，擅长使用"温斯顿之星"（Winston's Star）模型来提升沟通的吸引力。
请分析用户提供的文本，检查是否包含以下五个要素：
1. Slogan (口号/金句)：是否有一句朗朗上口的总结性语句？
2. Symbol (象征/符号)：是否有可视化的比喻或象征？
3. Salient (突出的核心点)：核心观点是否突出？
4. Surprise (惊奇/新知)：是否提供了反直觉的数据、新观点或令人惊讶的事实？
5. Story (故事/案例)：是否讲述了具体生动的故事或案例？

对于每个要素，判断是否存在，提取存在的内容，或给出改进建议。
返回 JSON 格式：
{
  "original_text": "...",
  "elements": {
    "slogan": { "present": false, "content": "", "suggestion": "建议提炼一句朗朗上口的各种..." },
    "symbol": { "present": true, "content": "把项目比作引擎", "suggestion": "" },
    ...
  },
  "overall_score": 60
}`
        },
        {
            role: "user",
            content: `请分析这段文本的吸引力：\n${text}`
        }
    ],

    /**
     * 真实性检测 (checkAuthenticity)
     */
    authenticity: (text: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个"废话探测器"和"真实性"捍卫者，类似于 MIT 教授强调的 "True! True! True!"。
请检查用户文本，找出那些"假大空"、陈词滥调、为了显得专业而堆砌的行话（Jargon）或空洞的废话。
你需要严厉地指出这些问题，并建议更朴实、更具体、更真诚的表达方式。

返回 JSON 格式：
{
  "original_text": "...",
  "score": 40, // 分数越低表示废话越多
  "issues": [
    { "segment": "协同范式转移", "type": "jargon", "suggestion": "直接说'一起改变做事情的方法'" },
    { "segment": "狠抓落实", "type": "cliche", "suggestion": "具体说'制定了每周检查制度'" }
  ],
  "comment": "整段话充满了正确的废话，没有信息量。"
}`
        },
        {
            role: "user",
            content: `请检测这段话的"含真率"（真实性）：\n${text}`
        }
    ],

    /**
     * 深度审计 (deepAuditDocument)
     */
    audit: (text: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是一个极其严苛且专业的公文审计专家。请从以下五个维度对文本进行深度诊断并打分：
1. **逻辑结构 (Logic)**：核心观点是否突出，论证是否严密。
2. **格式规范 (Format)**：是否符合政府公文行文习惯与排版逻辑。
3. **用词精准 (Wording)**：是否存在错别字、口语化表达、用词不当。
4. **简洁度 (Brevity)**：是否存在冗余内容或废话。
5. **严谨性 (Accuracy)**：语法是否正确，事实描述是否准确。

请返回严格的 JSON 格式（其中 suggestions 需给出具体的修改点）：
{
  "score": 总体分值,
  "dimensions": {
    "logic": { "score": 80, "comment": "..." },
    "format": { "score": 90, "comment": "..." },
    "wording": { "score": 85, "comment": "..." },
    "brevity": { "score": 85, "comment": "..." },
    "accuracy": { "score": 85, "comment": "..." }
  },
  "overall_comment": "总评...",
  "suggestions": ["发现错别字'X'，应为'Y'", "第二段逻辑跳跃，建议增加过渡", "语法错误：'...'成分残缺"]
}`
        },
        { role: "user", content: `请审计以下公文：\n${text}` }
    ],
};
