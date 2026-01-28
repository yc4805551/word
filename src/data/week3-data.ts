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
    {
        id: 'dialectical',
        name: '辩证思维 (Dialectical)',
        description: '既看A面也看B面，体现全面性',
        instruction: '运用辩证思维，既看到事物的A面也看到B面，体现分析的全面性和平衡感，避免片面化。'
    },
    {
        id: 'progressive',
        name: '递进思维 (Progressive)',
        description: '由表及里，层层深入',
        instruction: '运用递进思维，由表及里，层层深入，逻辑环环相扣，体现深刻的分析深度。'
    },
    {
        id: 'pragmatic',
        name: '务实思维 (Pragmatic)',
        description: '聚焦措施，强调落地',
        instruction: '运用务实思维，拒绝空谈，聚焦具体措施，强调落地执行、实际效果和可操作性。'
    },
    {
        id: 'significance',
        name: '高度升维 (Elevation)',
        description: '拔高站位，从大局出发',
        instruction: '运用高度升维思维，拔高站位，跳出局部限制，从大局、长远和宏观战略角度出发进行阐述。'
    },
    {
        id: 'audience',
        name: '读者思维 (Audience)',
        description: '关注读者需求，运用“温斯顿之星”',
        instruction: '采用以读者为中心的沟通思维。思考读者真正关心什么，如何带来价值。运用“温斯顿之星”要素（Slogan, Symbol, Salient, Surprise, Story），增强吸引力和记忆点。'
    },
    {
        id: 'structure',
        name: '结构思维 (Structure)',
        description: '逻辑框架清晰，碎纹导图组织',
        instruction: '采用结构化表达思维。确保清晰的逻辑框架（如引言-方法-结果-讨论），运用“碎纹导图”式发散思维组织观点，层次分明，条理清晰。'
    },
    {
        id: 'argumentation',
        name: '论证思维 (Argumentation)',
        description: '事实数据支撑，严谨逻辑论证',
        instruction: '采用严谨论证思维。注重基于证据的论证，用事实和数据支撑观点。清晰概括核心问题，围绕它展开，确保结论有充分支持。'
    },
    {
        id: 'iteration',
        name: '迭代思维 (Iteration)',
        description: '真实反馈，持续改进，精益求精',
        instruction: '采用迭代反馈思维。追求真实（Real），不伪造。体现经得起推敲的连贯思维，展示经过深思熟虑和多角度审视后的优化结果。'
    },
    {
        id: 'fractal',
        name: '分形拆解 (Fractal)',
        description: '核心-支撑-扩展，同心圆式展开',
        instruction: '运用分形拆解思维。以核心观点为圆心，向外圈层层扩展：第一层是直接支撑论据，第二层是具体案例或数据，第三层是扩展影响或意义。确保每一层都紧密围绕圆心，形成严密的同心圆逻辑结构。'
    }
];
