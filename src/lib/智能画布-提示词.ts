import type { ChatMessage } from './ai-types';

/**
 * 智能快速画布专属提示词（AIAssistantSidebar）
 * 包含：全文审查、写作问答
 */
export const PROMPTS = {
    /**
     * 文档润色 (polishText) — 快速画布「全文审查」
     */
    polish: (text: string): ChatMessage[] => [
        {
            role: "system",
            content: `你是公文纠错专家。对输入文本做"体检式"审查：纠正错别字、标点、语法、逻辑、公文风格。

只返回 JSON，不要任何解释文字：
{"changes":[{"original_word":"原文片段","polished_word":"修改后","rationale":"≤12字理由"}]}

要求：
- 没有问题就返回 {"changes":[]}
- rationale 不超过12字，如"错别字""标点错误""语序调整"
- 只列确需修改的点，不要凑数`
        },
        { role: "user", content: text }
    ]
};
