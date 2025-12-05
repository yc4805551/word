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
        return data.choices?.[0]?.message?.content || "生成失败，未返回有效内容。";
    } catch (error) {
        console.error("AI Generation Error:", error);
        throw error;
    }
}
