export interface TitleCase {
    id: number;
    original: string;
    options: { text: string; isCorrect: boolean; explanation: string }[];
}

export interface LogicCase {
    id: number;
    title: string;
    segments: { id: string; content: string; type: 'status' | 'problem' | 'suggestion' }[];
}

export const titleCases: TitleCase[] = [
    {
        id: 1,
        original: "最近这半年很多企业因为不想管或者不会管，导致安全问题很严重。",
        options: [
            { text: "关于近期企业安全问题严重的报告", isCorrect: false, explanation: "过于平淡，未体现核心问题。" },
            { text: "调研显示部分企业“不想管”“不会管”“管不了”问题突出", isCorrect: true, explanation: "使用了设问式/引用式风格，直击痛点，高度概括。" },
            { text: "企业安全管理存在的问题及对策", isCorrect: false, explanation: "标准公文标题，但不够“一眼入魂”，缺乏针对性。" }
        ]
    },
    {
        id: 2,
        original: "我们去调研了某市的工厂，发现他们数据化改造做得很好。",
        options: [
            { text: "某市某工厂的数据化改造情况汇报", isCorrect: false, explanation: "切口太小，像流水账。" },
            { text: "关于数字化转型的调研报告", isCorrect: false, explanation: "题目太大，内容支撑不足。" },
            { text: "从某地实践看制造业高质量发展的经验与启示", isCorrect: true, explanation: "以小见大，站在宏观高度总结经验，符合专报要求。" }
        ]
    }
];

export const logicCases: LogicCase[] = [
    {
        id: 1,
        title: "关于XX产业发展的分析",
        segments: [
            { id: "A", content: "我国XX产业具备一定优势，产业规模稳居世界前列，技术创新能力显著增强...", type: "status" },
            { id: "B", content: "但也要看到，关键核心技术仍受制于人，产业链供应链存在断链风险...", type: "problem" },
            { id: "C", content: "建议加大研发投入，强化企业主体地位，完善人才培养机制...", type: "suggestion" }
        ]
    },
    {
        id: 2,
        title: "关于中小企业数字化转型的建议",
        segments: [
            { id: "A", content: "近年来，中小企业数字化转型步伐加快，上云用数赋智成效明显...", type: "status" },
            { id: "B", content: "当前面临“不敢转”“不会转”“转不起”的共性难题，资金人才缺口大...", type: "problem" },
            { id: "C", content: "应设立专项引导基金，搭建公共服务平台，开展数字化人才培训...", type: "suggestion" }
        ]
    }
];
