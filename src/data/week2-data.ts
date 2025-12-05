export interface WordPair {
    id: number;
    colloquial: string;
    official: string;
    context: string;
}

export interface ErrorCase {
    id: number;
    text: string;
    errorType: 'political' | 'factual' | 'style';
    correction: string;
    explanation: string;
}

export const wordPairs: WordPair[] = [
    { id: 1, colloquial: "让产业发展得更好", official: "推动产业高质量发展", context: "我们要___。" },
    { id: 2, colloquial: "我们要看清楚问题", official: "深入研判面临的严峻形势", context: "会议强调，___。" },
    { id: 3, colloquial: "大家一起做", official: "强化政产学研协同联动", context: "为了攻克技术难关，必须___。" },
    { id: 4, colloquial: "想办法解决", official: "多措并举破解难题", context: "针对中小企业融资难，要___。" },
    { id: 5, colloquial: "做得很快", official: "跑出加速度", context: "数字经济发展___。" },
    { id: 6, colloquial: "很重要的作用", official: "发挥关键支撑作用", context: "工业互联网在转型中___。" },
];

export const errorCases: ErrorCase[] = [
    {
        id: 1,
        text: "我们要加强与台湾国家的经贸往来。",
        errorType: "political",
        correction: "台湾地区",
        explanation: "台湾是中国的一部分，决不能称为'国家'。"
    },
    {
        id: 2,
        text: "根据大陆法律规定，企业应合规经营。",
        errorType: "political",
        correction: "国家法律 / 我国法律",
        explanation: "在正式公文中，一般称'我国'或'国家'，避免使用'大陆'对应'台湾'的语境，除非是特定涉台文件。"
    },
    {
        id: 3,
        text: "欧盟理事会近日发布了关于人工智能的白皮书。",
        errorType: "factual",
        correction: "欧盟委员会",
        explanation: "发布白皮书等行政职能通常由'欧盟委员会'（European Commission）负责，'理事会'（Council）主要负责决策。"
    },
    {
        id: 4,
        text: "各部门要猛抓落实，死磕硬骨头。",
        errorType: "style",
        correction: "狠抓落实，攻坚克难",
        explanation: "‘猛抓’、‘死磕’过于口语化，不符合公文庄重风格。"
    }
];
