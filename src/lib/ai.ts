export interface AIConfig {
    apiKey: string;
    endpoint: string;
    model: string;
}

export const getAIConfig = (provider: 'openai' | 'deepseek' | 'gemini' = 'openai'): AIConfig => {
    if (provider === 'deepseek') {
        return {
            apiKey: import.meta.env.VITE_DEEPSEEK_API_KEY,
            endpoint: import.meta.env.VITE_DEEPSEEK_ENDPOINT,
            model: import.meta.env.VITE_DEEPSEEK_MODEL,
        };
    }
    if (provider === 'gemini') {
        return {
            apiKey: import.meta.env.VITE_GEMINI_API_KEY,
            endpoint: import.meta.env.VITE_GEMINI_ENDPOINT,
            model: import.meta.env.VITE_GEMINI_MODEL,
        };
    }
    return {
        apiKey: import.meta.env.VITE_OPENAI_API_KEY,
        endpoint: import.meta.env.VITE_OPENAI_ENDPOINT,
        model: import.meta.env.VITE_OPENAI_MODEL,
    };
};

export async function generateText(prompt: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai'): Promise<string> {
    const config = getAIConfig(provider);

    if (!config.apiKey || !config.endpoint) {
        throw new Error(`AI Configuration missing for ${provider}`);
    }

    try {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
                    {
                        role: "system",
                        content: "你是一个公文写作助手。请根据用户的主题，生成一篇标准的、格式规范的公文范文（如调研报告、通知、方案等）。内容要专业、严谨，符合中国政府公文语体风格。字数控制在300-500字左右，适合打字练习。"
                    },
                    {
                        role: "user",
                        content: `请以“${prompt}”为主题，生成一篇公文范文。`
                    }
                ],
                temperature: 0.7,
            }),
        });

        if (!response.ok) {
            const errorData = await response.json().catch(() => ({}));
            throw new Error(`API Error: ${response.status} ${JSON.stringify(errorData)}`);
        }

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || "生成失败，未返回有效内容。";

        // Post-processing to clean up the text for typing practice
        // 1. Remove Markdown bold/italic markers (** or *)
        content = content.replace(/\*\*/g, '').replace(/\*/g, '');

        // 2. Split into lines, trim whitespace (remove indentation), and filter empty lines
        const lines = content.split('\n')
            .map((line: string) => line.trim())
            .filter((line: string) => line.length > 0);

        // 3. Join with single newlines
        return lines.join('\n');
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
}

export interface Quiz {
    word: string;
    focus: string;
    options: { A: string; B: string };
    correct: 'A' | 'B';
    note?: string;
}

export async function generateQuiz(text: string, provider: 'openai' | 'deepseek' | 'gemini' = 'openai'): Promise<Quiz[]> {
    const config = getAIConfig(provider);
    if (!config.apiKey || !config.endpoint) return [];

    try {
        const response = await fetch(config.endpoint, {
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Authorization': `Bearer ${config.apiKey}`,
            },
            body: JSON.stringify({
                model: config.model,
                messages: [
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
                                "correct": "B"
                            }
                        ]
                        注意：
                        1. 必须返回纯JSON格式，不要包含Markdown代码块标记。
                        2. 选项A和B必须一个是前鼻音，一个是后鼻音。
                        3. 确保拼音正确。`
                    },
                    {
                        role: "user",
                        content: `请分析以下文本并生成拼音辨析题：\n${text}`
                    }
                ],
                temperature: 0.3,
                response_format: { type: "json_object" } // Try to enforce JSON if model supports it, otherwise prompt handles it
            }),
        });

        if (!response.ok) return [];

        const data = await response.json();
        let content = data.choices?.[0]?.message?.content || "[]";

        // Clean up potential markdown code blocks if AI ignores instruction
        content = content.replace(/```json/g, '').replace(/```/g, '').trim();

        // Handle case where AI wraps array in an object key like { "quizzes": [...] }
        try {
            const parsed = JSON.parse(content);
            if (Array.isArray(parsed)) return parsed;
            if (parsed.quizzes && Array.isArray(parsed.quizzes)) return parsed.quizzes;
            return [];
        } catch (e) {
            console.error("Failed to parse quiz JSON:", e);
            return [];
        }
    } catch (error) {
        console.error("Quiz Generation Error:", error);
        return [];
    }
}
