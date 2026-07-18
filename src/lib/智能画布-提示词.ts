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
            content: `你是一个精通公文写作与纠错的文字专家。请对用户提供的段落进行"体检式"润色。你的首要任务是：
1. **纠正错别字与标点符号**：发现并修正所有错别字、用词不当、标点符号使用错误。
2. **修正语法与成分**：修复病句、成分残缺、指代不明等语法问题。
3. **优化逻辑连贯性**：确保句子之间逻辑紧密，转承自然。
4. **提升专业风格**：在保证准确的基础，将语体调整为专业、克制、严谨的"工信部及政府公文风格"。

请返回严格的 JSON 格式（不要输出全文本，仅输出修改点，以极大提升速度）：
{
  "original": "原始文本片段（可选，若太长可忽略）",
  "changes": [
    {
      "original_word": "修改前的片段",
      "polished_word": "修改后的片段",
      "rationale": "修改理由，如：修正错别字、语法纠错、提升专业度等"
    }
  ],
  "overall_comment": "总体评价，涵盖文章优缺点及改进重点"
}`
        },
        { role: "user", content: `请润色这段文字：${text}` }
    ]
};
