import type { ChatMessage } from './ai-types';

/**
 * 智能写作补全专属提示词
 * 功能：快速画布「AI 补全」— 基于 AnythingLLM 知识库续写
 */
export const COMPLETION_PROMPTS = {
    /**
     * 写作补全 (generateCompletion)
     * 用户停顿输入后，AI 基于知识库给出内联续写建议
     * Tab 接受 / Esc 放弃
     */
    complete: (precedingText: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是专业的公文写作智能补全引擎，深度结合知识库文档内容进行续写。

【核心规则】：
1. 只返回续写内容本身，不加任何解释、前缀、标注或引号。
2. 续写内容必须与上文的语气、风格、主题保持高度一致。
3. 长度控制在 15-35 字，以一个完整的短句或半句为宜，不要过长。
4. 优先使用知识库中出现的表达方式和专业词汇。
5. 禁止使用"示范"、"标杆"等词语。
6. 如果知识库中完全找不到相关内容，则基于通用公文写作规范生成续写。
7. 只输出续写文字，不要其他任何内容。`,
        },
        {
            role: "user",
            content: `请基于以下正在撰写的文本，提供自然流畅的续写建议（15-35字）：\n${precedingText}`,
        },
    ],
};
