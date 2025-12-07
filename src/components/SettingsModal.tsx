import { useState } from 'react';
import { X, Save, Settings, Key } from 'lucide-react';
import { useSettings } from '../context/SettingsContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { aiProvider, setAiProvider, apiKeys, setApiKey } = useSettings();
    const [localKeys, setLocalKeys] = useState(apiKeys);

    if (!isOpen) return null;

    const handleSave = () => {
        setApiKey('openai', localKeys.openai);
        setApiKey('deepseek', localKeys.deepseek);
        setApiKey('gemini', localKeys.gemini);
        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl w-full max-w-md overflow-hidden animate-in fade-in zoom-in-95 duration-200">
                <div className="px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        系统设置
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="p-6 space-y-6">
                    {/* Provider Selection */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">默认 AI 模型</label>
                        <div className="grid grid-cols-3 gap-2">
                            {(['openai', 'deepseek', 'gemini'] as const).map(p => (
                                <button
                                    key={p}
                                    onClick={() => setAiProvider(p)}
                                    className={`px-3 py-2 rounded border text-sm font-medium transition-all ${aiProvider === p
                                        ? 'bg-blue-600 text-white border-blue-600 shadow-md transform scale-105'
                                        : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                        }`}
                                >
                                    {p.charAt(0).toUpperCase() + p.slice(1)}
                                </button>
                            ))}
                        </div>
                    </div>

                    {/* API Keys */}
                    <div className="space-y-3">
                        <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            API Keys配置 (可选)
                        </label>

                        <div className="space-y-2">
                            <div className="text-xs text-slate-500 mb-1">OpenAI Key</div>
                            <input
                                type="password"
                                value={localKeys.openai}
                                onChange={(e) => setLocalKeys(prev => ({ ...prev, openai: e.target.value }))}
                                placeholder={import.meta.env.VITE_OPENAI_API_KEY ? "已检测到 .env 配置 (默认使用)" : "sk-..."}
                                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-400 placeholder:italic"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs text-slate-500 mb-1">DeepSeek Key</div>
                            <input
                                type="password"
                                value={localKeys.deepseek}
                                onChange={(e) => setLocalKeys(prev => ({ ...prev, deepseek: e.target.value }))}
                                placeholder={import.meta.env.VITE_DEEPSEEK_API_KEY ? "已检测到 .env 配置 (默认使用)" : "sk-..."}
                                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-400 placeholder:italic"
                            />
                        </div>
                        <div className="space-y-2">
                            <div className="text-xs text-slate-500 mb-1">Gemini Key</div>
                            <input
                                type="password"
                                value={localKeys.gemini}
                                onChange={(e) => setLocalKeys(prev => ({ ...prev, gemini: e.target.value }))}
                                placeholder={import.meta.env.VITE_GEMINI_API_KEY ? "已检测到 .env 配置 (默认使用)" : "AIza..."}
                                className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none placeholder:text-slate-400 placeholder:italic"
                            />
                        </div>
                    </div>
                </div>

                <div className="px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
                    <button
                        onClick={handleSave}
                        className="px-4 py-2 bg-blue-600 text-white rounded-lg font-medium hover:bg-blue-700 shadow-lg shadow-blue-200 flex items-center gap-2"
                    >
                        <Save className="w-4 h-4" />
                        保存配置
                    </button>
                </div>
            </div>
        </div>
    );
}
