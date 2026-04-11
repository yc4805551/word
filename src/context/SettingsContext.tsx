import React, { createContext, useContext, useState, useEffect } from 'react';

export type AIProvider = 'openai' | 'deepseek' | 'gemini' | 'qwen' | 'bytedance' | 'depocr' | 'anythingllm';

interface SettingsContextType {
    aiProvider: AIProvider;
    setAiProvider: (provider: AIProvider) => void;
    apiKeys: Record<AIProvider, string>;
    setApiKey: (provider: AIProvider, key: string) => void;
    endpoints: Record<AIProvider, string>;
    setEndpoint: (provider: AIProvider, endpoint: string) => void;
    vocabList: string[];
    setVocabList: (list: string[]) => void;
    addToVocab: (words: string[]) => void;
    models: Record<AIProvider, string>;
    setModel: (provider: AIProvider, model: string) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    // OpenAI as default
    const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
        return (localStorage.getItem('ai_provider') as AIProvider) || 'anythingllm';
    });

    const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
        openai: localStorage.getItem('key_openai') || '',
        deepseek: localStorage.getItem('key_deepseek') || '',
        gemini: localStorage.getItem('key_gemini') || '',
        qwen: localStorage.getItem('key_qwen') || '',
        bytedance: localStorage.getItem('key_bytedance') || '',
        depocr: localStorage.getItem('key_depocr') || '',
        anythingllm: localStorage.getItem('key_anythingllm') || '',
    });

    const [endpoints, setEndpoints] = useState<Record<AIProvider, string>>({
        openai: localStorage.getItem('endpoint_openai') || '',
        deepseek: localStorage.getItem('endpoint_deepseek') || '',
        gemini: localStorage.getItem('endpoint_gemini') || '',
        qwen: localStorage.getItem('endpoint_qwen') || '',
        bytedance: localStorage.getItem('endpoint_bytedance') || '',
        depocr: localStorage.getItem('endpoint_depocr') || '',
        anythingllm: localStorage.getItem('endpoint_anythingllm') || 'https://ycoffice.tail36f59d.ts.net/api/v1/openai/chat/completions',
    });

    const [models, setModels] = useState<Record<AIProvider, string>>({
        openai: localStorage.getItem('model_openai') || '',
        deepseek: localStorage.getItem('model_deepseek') || '',
        gemini: localStorage.getItem('model_gemini') || '',
        qwen: localStorage.getItem('model_qwen') || '',
        bytedance: localStorage.getItem('model_bytedance') || localStorage.getItem('bytedance_model') || '',
        depocr: localStorage.getItem('model_depocr') || '',
        anythingllm: localStorage.getItem('model_anythingllm') || 'inf_work',
    });

    // Load initial vocab from a default list or local storage if we wanted specific persistence
    // For now, start empty or we could load the default file content if we had it as a string constant.
    // In this design, we'll let Week 2 load the default file, but if user uploads, it overrides/appends here.
    const [vocabList, setVocabList] = useState<string[]>([]);

    useEffect(() => {
        localStorage.setItem('ai_provider', aiProvider);
    }, [aiProvider]);

    const handleSetApiKey = (provider: AIProvider, key: string) => {
        setApiKeys(prev => ({ ...prev, [provider]: key }));
        localStorage.setItem(`key_${provider}`, key);
    };

    const handleSetEndpoint = (provider: AIProvider, endpoint: string) => {
        setEndpoints(prev => ({ ...prev, [provider]: endpoint }));
        localStorage.setItem(`endpoint_${provider}`, endpoint);
    };

    const handleSetModel = (provider: AIProvider, model: string) => {
        setModels(prev => ({ ...prev, [provider]: model }));
        localStorage.setItem(`model_${provider}`, model);
    };

    const addToVocab = (words: string[]) => {
        setVocabList(prev => {
            const newSet = new Set([...prev, ...words]);
            return Array.from(newSet);
        });
    };

    return (
        <SettingsContext.Provider value={{
            aiProvider,
            setAiProvider,
            apiKeys,
            setApiKey: handleSetApiKey,
            endpoints,
            setEndpoint: handleSetEndpoint,
            vocabList,
            setVocabList,
            addToVocab,
            models,
            setModel: handleSetModel
        }}>
            {children}
        </SettingsContext.Provider>
    );
}

export function useSettings() {
    const context = useContext(SettingsContext);
    if (context === undefined) {
        throw new Error('useSettings must be used within a SettingsProvider');
    }
    return context;
}

