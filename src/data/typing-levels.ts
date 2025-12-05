export interface Quiz {
    word: string;
    focus: string;
    options: { A: string; B: string };
    correct: 'A' | 'B';
    note?: string;
}

export interface Level {
    id: number;
    title: string;
    desc: string;
    content: string;
    quizzes: Quiz[];
}

export const levels: Level[] = [
    {
        id: 0,
        title: "第1日：基础概念与运行监测",
        desc: "重点：ing/in (运行/进行)",
        content: "对于部属单位来说，信息是体现政治意识、落实党内法规、支撑部重点工作、检验自身研究能力的一个重要平台。政务信息是党中央科学决策的重要依据，也是落实请示报告制度的法定形式。在写作时，要侧重反映实际工作情况，特别是工作中存在的问题，要求喜忧兼报，不回避和隐瞒问题。",
        quizzes: [
            { word: "运行", focus: "运", options: { A: "yùn (in)", B: "yùn (vn/un)" }, correct: "B", note: "yun = y + un (vn)" },
            { word: "支撑", focus: "撑", options: { A: "chēn (前)", B: "chēng (后)" }, correct: "B" },
            { word: "隐瞒", focus: "隐", options: { A: "yǐn (前)", B: "yǐng (后)" }, correct: "A" },
            { word: "检验", focus: "验", options: { A: "yàn (前)", B: "yàng (后)" }, correct: "A" },
            { word: "平台", focus: "平", options: { A: "pín (前)", B: "píng (后)" }, correct: "B" }
        ]
    },
    {
        id: 1,
        title: "第2日：支撑体系与转型升级",
        desc: "重点：eng/en (支撑/深耕)",
        content: "我们要深入贯彻落实部重点工作，密切监测工业经济运行态势。针对当前产业链面临的紧迫问题，要加快数字化转型步伐，发挥龙头企业引领作用，增强供应链韧性。同时，要警惕外部风险，提升技术核心竞争力，确保相关工程取得实效，为政府科学决策提供有力支撑。",
        quizzes: [
            { word: "深入", focus: "深", options: { A: "shēn (前)", B: "shēng (后)" }, correct: "A" },
            { word: "运行", focus: "行", options: { A: "xín (前)", B: "xíng (后)" }, correct: "B" },
            { word: "紧迫", focus: "紧", options: { A: "jǐn (前)", B: "jǐng (后)" }, correct: "A" },
            { word: "转型", focus: "型", options: { A: "xín (前)", B: "xíng (后)" }, correct: "B" },
            { word: "引领", focus: "引", options: { A: "yǐn (前)", B: "yǐng (后)" }, correct: "A" },
            { word: "工程", focus: "程", options: { A: "chén (前)", B: "chéng (后)" }, correct: "B" }
        ]
    },
    {
        id: 2,
        title: "第3日：产业链安全与风险警惕",
        desc: "重点：综合长句混输",
        content: "调研显示，部分企业面临技术创新难熬商业“寒冬”的困境。上半年全行业数据显示，我国制造业面临日益严峻的安全风险。建议常态化编制产业图谱及开展产业链韧性评估，持续推演供应链风险场景及应对，进一步强化供应链体系国际合作，保障我供应链安全。",
        quizzes: [
            { word: "困境", focus: "困", options: { A: "kùn (前)", B: "kùng (后)" }, correct: "A" },
            { word: "严峻", focus: "峻", options: { A: "jùn (前)", B: "jùng (后)" }, correct: "A" },
            { word: "韧性", focus: "韧", options: { A: "rèn (前)", B: "rèng (后)" }, correct: "A" },
            { word: "场景", focus: "景", options: { A: "jǐn (前)", B: "jǐng (后)" }, correct: "B" }
        ]
    },
    {
        id: 3,
        title: "第4日：政务信息高阶难点",
        desc: "来源：《专报信息分享》",
        content: "政务信息提倡开门见山，一般不要导语和结尾，讲究简洁明快，一语道破。把好政治关、政策关、文字关、内容关。政治关包括政治表述是否正确、观点建议是否符合党中央大政方针；文字关就是文字、数据是否准确；内容关包括行文逻辑是否严密，例子是否恰当。",
        quizzes: [
            { word: "开门见山", focus: "山", options: { A: "shān (前)", B: "shāng (后)" }, correct: "A" },
            { word: "政治", focus: "政", options: { A: "zhèn (前)", B: "zhèng (后)" }, correct: "B" },
            { word: "方针", focus: "针", options: { A: "zhēn (前)", B: "zhēng (后)" }, correct: "A" },
            { word: "仅仅", focus: "仅", options: { A: "jǐn (前)", B: "jǐng (后)" }, correct: "A" }
        ]
    },
    {
        id: 4,
        title: "第5日：新型工业化与新质生产力",
        desc: "重点：宏观排比与政治表述",
        content: "工业是立国之本、强国之基。我们要深入实施制造强国战略，坚持工业立位，着力提升高端化、智能化、绿色化水平。要聚焦重点产业链，加快关键核心技术攻关，提升供应链韧性和安全水平。大力发展数字经济，推动数字技术与实体经济深度融合，赋能传统产业转型升级，培育壮大新兴产业，前瞻布局未来产业，加快构建以先进制造业为骨干的现代化产业体系。",
        quizzes: [
            { word: "强国", focus: "强", options: { A: "qián (前)", B: "qiáng (后)" }, correct: "B" },
            { word: "坚持", focus: "坚", options: { A: "jiān (前)", B: "jiāng (后)" }, correct: "A" },
            { word: "提升", focus: "升", options: { A: "shēn (前)", B: "shēng (后)" }, correct: "B" },
            { word: "核心", focus: "心", options: { A: "xīn (前)", B: "xīng (后)" }, correct: "A" },
            { word: "新兴", focus: "兴", options: { A: "xīn (前)", B: "xīng (后)" }, correct: "B" }
        ]
    },
    {
        id: 5,
        title: "第6日：专项阻击（前后鼻音特训）",
        desc: "密集轰炸：en/eng + in/ing",
        content: "工业运行平稳，工程进展顺利。坚持创新引领，深耕核心技术。针对隐患问题，进行精准施策。增强产业链韧性，提升真抓实干效能。更是要稳增长、促转型，摒弃因循守旧，紧盯关键环节，拼出一番新天地。真正做到心中有数、手中有策、肩上有责。深入分析当前形势，准确把握发展规律，以更大力度推动工业经济高质量发展。",
        quizzes: [
            { word: "运行", focus: "行", options: { A: "xín (前)", B: "xíng (后)" }, correct: "B" },
            { word: "工程", focus: "程", options: { A: "chén (前)", B: "chéng (后)" }, correct: "B" },
            { word: "深耕", focus: "耕", options: { A: "gēn (前)", B: "gēng (后)" }, correct: "B" },
            { word: "隐患", focus: "隐", options: { A: "yǐn (前)", B: "yǐng (后)" }, correct: "A" },
            { word: "真抓", focus: "真", options: { A: "zhēn (前)", B: "zhēng (后)" }, correct: "A" },
            { word: "增强", focus: "增", options: { A: "zēn (前)", B: "zēng (后)" }, correct: "B" },
            { word: "摒弃", focus: "摒", options: { A: "bìn (前)", B: "bìng (后)" }, correct: "B" },
            { word: "拼出", focus: "拼", options: { A: "pīn (前)", B: "pīng (后)" }, correct: "A" }
        ]
    }
];
