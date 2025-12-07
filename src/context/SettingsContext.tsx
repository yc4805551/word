import React, { createContext, useContext, useState, useEffect } from 'react';

type AIProvider = 'openai' | 'deepseek' | 'gemini';

interface SettingsContextType {
    aiProvider: AIProvider;
    setAiProvider: (provider: AIProvider) => void;
    apiKeys: Record<AIProvider, string>;
    setApiKey: (provider: AIProvider, key: string) => void;
    vocabList: string[];
    setVocabList: (list: string[]) => void;
    addToVocab: (words: string[]) => void;
}

const SettingsContext = createContext<SettingsContextType | undefined>(undefined);

export function SettingsProvider({ children }: { children: React.ReactNode }) {
    // OpenAI as default
    const [aiProvider, setAiProvider] = useState<AIProvider>(() => {
        return (localStorage.getItem('ai_provider') as AIProvider) || 'openai';
    });

    const [apiKeys, setApiKeys] = useState<Record<AIProvider, string>>({
        openai: localStorage.getItem('key_openai') || '',
        deepseek: localStorage.getItem('key_deepseek') || '',
        gemini: localStorage.getItem('key_gemini') || '',
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
            vocabList,
            setVocabList,
            addToVocab
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
