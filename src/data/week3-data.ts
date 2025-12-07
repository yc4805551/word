export interface StructurePattern {
    id: number;
    name: string;
    template: string;
    description: string;
    difficulty: number; // 1-5
}

export const structurePatterns: StructurePattern[] = [
    {
        id: 1,
        name: "辩证统一式",
        template: "既要...又要...",
        description: "用于处理看似矛盾但实际上需要兼顾的两个方面，体现全面性和平衡感。",
        difficulty: 2
    },
    {
        id: 2,
        name: "层层递进式",
        template: "...是...的基础，...是...的关键，...是...的保障",
        description: "用于阐述三个要素之间的逻辑关系，层层深入，逻辑闭环。",
        difficulty: 4
    },
    {
        id: 3,
        name: "排比强调式",
        template: "坚持...不动摇，坚持...不松劲，坚持...不懈怠",
        description: "通过重复的句式增强气势，表达坚定的决心和立场。",
        difficulty: 3
    },
    {
        id: 4,
        name: "目标导向式",
        template: "以...为中心，以...为抓手，以...为目标",
        description: "明确工作的出发点、着力点和落脚点，非常实用的工作部署句式。",
        difficulty: 3
    },
    {
        id: 5,
        name: "正反对比式",
        template: "不能...而要...；决不能...更不能...",
        description: "通过否定错误做法、肯定正确做法，划清底线，指明方向。",
        difficulty: 3
    }
];

export const logicModes = [
    { id: 'dialectical', name: '辩证思维 (Dialectical)', description: '既看A面也看B面，体现全面性' },
    { id: 'progressive', name: '递进思维 (Progressive)', description: '由表及里，层层深入' },
    { id: 'pragmatic', name: '务实思维 (Pragmatic)', description: '聚焦措施，强调落地' },
    { id: 'significance', name: '高度升维 (Elevation)', description: '拔高站位，从大局出发' }
];
