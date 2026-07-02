import { useState } from 'react';
import { X, Settings, Key, Save } from 'lucide-react';
import { useSettings, type AIProvider } from '../context/SettingsContext';

interface SettingsModalProps {
    isOpen: boolean;
    onClose: () => void;
}

export default function SettingsModal({ isOpen, onClose }: SettingsModalProps) {
    const { aiProvider, setAiProvider, apiKeys, setApiKey, endpoints, setEndpoint, models, setModel, githubToken, setGithubToken, githubOwner, setGithubOwner, githubRepo, setGithubRepo } = useSettings();
    const [localKeys, setLocalKeys] = useState<Record<AIProvider, string>>(apiKeys);
    const [localEndpoints, setLocalEndpoints] = useState<Record<AIProvider, string>>(endpoints);
    const [localModels, setLocalModels] = useState<Record<AIProvider, string>>(models);
    const [localGitToken, setLocalGitToken] = useState(githubToken);
    const [localGitOwner, setLocalGitOwner] = useState(githubOwner);
    const [localGitRepo, setLocalGitRepo] = useState(githubRepo);

    if (!isOpen) return null;

    const handleSave = () => {
        setApiKey('openai', localKeys.openai);
        setApiKey('deepseek', localKeys.deepseek);
        setApiKey('gemini', localKeys.gemini);
        setApiKey('qwen', localKeys.qwen);
        setApiKey('bytedance', localKeys.bytedance);
        setApiKey('depocr', localKeys.depocr);
        setApiKey('anythingllm', localKeys.anythingllm);

        setEndpoint('openai', localEndpoints.openai);
        setEndpoint('deepseek', localEndpoints.deepseek);
        setEndpoint('gemini', localEndpoints.gemini);
        setEndpoint('qwen', localEndpoints.qwen);
        setEndpoint('bytedance', localEndpoints.bytedance);
        setEndpoint('depocr', localEndpoints.depocr);
        setEndpoint('anythingllm', localEndpoints.anythingllm);

        setModel('openai', localModels.openai);
        setModel('deepseek', localModels.deepseek);
        setModel('gemini', localModels.gemini);
        setModel('qwen', localModels.qwen);
        setModel('bytedance', localModels.bytedance);
        setModel('depocr', localModels.depocr);
        setModel('anythingllm', localModels.anythingllm);

        setGithubToken(localGitToken);
        setGithubOwner(localGitOwner);
        setGithubRepo(localGitRepo);

        onClose();
    };

    return (
        <div className="fixed inset-0 bg-black/50 z-50 flex items-center justify-center p-4">
            <div className="bg-white rounded-xl shadow-2xl resize overflow-auto flex flex-col w-[450px] min-w-[320px] max-w-[95vw] min-h-[400px] max-h-[95vh] animate-in fade-in zoom-in-95 duration-200">
                <div className="flex-shrink-0 px-6 py-4 border-b border-slate-100 flex justify-between items-center bg-slate-50">
                    <h3 className="font-bold text-slate-800 flex items-center gap-2">
                        <Settings className="w-5 h-5 text-blue-600" />
                        系统设置
                    </h3>
                    <button onClick={onClose} className="text-slate-400 hover:text-slate-600 hover:bg-slate-200 rounded-full p-1 transition-colors">
                        <X className="w-5 h-5" />
                    </button>
                </div>

                <div className="flex-1 p-6 space-y-6 overflow-y-auto">
                    {/* Provider Selection Grouped */}
                    <div>
                        <label className="block text-sm font-bold text-slate-700 mb-2">选择模型分类</label>
                        <div className="space-y-4">
                            {/* Ali Group */}
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">阿里</span>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => setAiProvider('qwen')}
                                        className={`px-3 py-2 rounded text-sm font-medium border transition-all ${
                                            aiProvider === 'qwen'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-50'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                            }`}
                                    >
                                        通义 Qwen
                                    </button>
                                </div>
                            </div>

                            {/* ByteDance Group */}
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">字节</span>
                                <div className="grid grid-cols-1 gap-2">
                                    <button
                                        onClick={() => setAiProvider('bytedance')}
                                        className={`px-3 py-2 rounded text-sm font-medium border transition-all ${
                                            aiProvider === 'bytedance'
                                            ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-50'
                                            : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                            }`}
                                    >
                                        字节 豆包 (Doubao)
                                    </button>
                                </div>
                            </div>

                            {/* Others Group */}
                            <div className="space-y-1">
                                <span className="text-[10px] text-slate-400 font-medium uppercase tracking-wider">其他</span>
                                <div className="grid grid-cols-2 sm:grid-cols-4 gap-2">
                                    {(['openai', 'deepseek', 'gemini', 'depocr'] as const).map(p => (
                                        <button
                                            key={p}
                                            onClick={() => setAiProvider(p)}
                                            className={`px-2 py-2 rounded text-xs font-medium border transition-all ${
                                                aiProvider === p
                                                ? 'bg-blue-50 text-blue-600 border-blue-200 ring-2 ring-blue-50'
                                                : 'bg-white text-slate-600 border-slate-200 hover:border-blue-400'
                                                }`}
                                        >
                                            {p === 'depocr' ? 'OCR' : p.charAt(0).toUpperCase() + p.slice(1)}
                                        </button>
                                    ))}
                                </div>
                            </div>
                        </div>
                    </div>

                    {/* Dynamic Settings Fields */}
                    <div className="space-y-4 pt-4 border-t border-slate-100">
                        <label className="block text-sm font-bold text-slate-700 flex items-center gap-2">
                            <Key className="w-4 h-4" />
                            {aiProvider === 'qwen' ? '阿里配置' : aiProvider === 'bytedance' ? '字节配置' : '配置详情'}
                        </label>

                        {aiProvider === 'qwen' && (
                            <div className="space-y-3 p-3 bg-blue-50/30 rounded-lg border border-blue-100/50">
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500">API Key</div>
                                    <input
                                        type="password"
                                        value={localKeys.qwen}
                                        onChange={(e) => setLocalKeys(prev => ({ ...prev, qwen: e.target.value }))}
                                        placeholder={import.meta.env.VITE_ALI_API_KEY || import.meta.env.VITE_QWEN_API_KEY ? "已检测到 .env 变量" : "sk-..."}
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500 flex justify-between">
                                        <span>模型 ID (Override)</span>
                                        <span className="text-[10px] text-blue-500 font-mono">{import.meta.env.VITE_ALI_MODEL || import.meta.env.VITE_QWEN_MODEL || 'qwen-plus'}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={localModels.qwen}
                                        onChange={(e) => setLocalModels(prev => ({ ...prev, qwen: e.target.value }))}
                                        placeholder="例如: qwen-max"
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {aiProvider === 'bytedance' && (
                            <div className="space-y-3 p-3 bg-blue-50/30 rounded-lg border border-blue-100/50">
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500">API Key</div>
                                    <input
                                        type="password"
                                        value={localKeys.bytedance}
                                        onChange={(e) => setLocalKeys(prev => ({ ...prev, bytedance: e.target.value }))}
                                        placeholder={import.meta.env.VITE_DOUBAO_API_KEY || import.meta.env.VITE_BYTEDANCE_API_KEY ? "已检测到 .env 变量" : "API Key..."}
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500">转发 Endpoint (可选)</div>
                                    <input
                                        type="text"
                                        value={localEndpoints.bytedance}
                                        onChange={(e) => setLocalEndpoints(prev => ({ ...prev, bytedance: e.target.value }))}
                                        placeholder={import.meta.env.VITE_DOUBAO_ENDPOINT || import.meta.env.VITE_BYTEDANCE_ENDPOINT || "默认: 火山引擎官方"}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded text-[11px] focus:ring-1 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500 flex justify-between">
                                        <span>模型 ID (Override)</span>
                                        <span className="text-[10px] text-blue-500 font-mono">{import.meta.env.VITE_DOUBAO_MODEL || import.meta.env.VITE_BYTEDANCE_MODEL || 'doubao-pro-4k'}</span>
                                    </div>
                                    <input
                                        type="text"
                                        value={localModels.bytedance}
                                        onChange={(e) => setLocalModels(prev => ({ ...prev, bytedance: e.target.value }))}
                                        placeholder="例如: doubao-pro-4k"
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {(aiProvider === 'openai' || aiProvider === 'deepseek' || aiProvider === 'gemini' || aiProvider === 'depocr') && (
                            <div className="space-y-3 p-3 bg-slate-50 rounded-lg border border-slate-100">
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500 capitalize">{`${aiProvider} API Key`}</div>
                                    <input
                                        type="password"
                                        value={localKeys[aiProvider]}
                                        onChange={(e) => setLocalKeys(prev => ({ ...prev, [aiProvider]: e.target.value }))}
                                        placeholder="API Key（非 sk- 格式也支持）"
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500">转发 Endpoint (可选)</div>
                                    <input
                                        type="text"
                                        value={localEndpoints[aiProvider]}
                                        onChange={(e) => setLocalEndpoints(prev => ({ ...prev, [aiProvider]: e.target.value }))}
                                        placeholder={import.meta.env.VITE_OPENAI_ENDPOINT || "https://zhenze-huhehaote.cmecloud.cn/v1/chat/completions"}
                                        className="w-full px-3 py-1.5 border border-slate-200 rounded text-[11px] focus:ring-1 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500 flex justify-between">
                                        <span>模型 ID (Override)</span>
                                        <span className="text-[10px] text-blue-500 font-mono italic">
                                            {aiProvider === 'openai' ? (import.meta.env.VITE_OPENAI_MODEL || 'gpt-4o') : 
                                             aiProvider === 'deepseek' ? (import.meta.env.VITE_DEEPSEEK_MODEL || 'deepseek-chat') :
                                             aiProvider === 'gemini' ? (import.meta.env.VITE_GEMINI_MODEL || 'gemini-1.5-flash') :
                                             (import.meta.env.VITE_DEPOCR_MODEL || 'DeepSeek-OCR-Free')}
                                        </span>
                                    </div>
                                    <input
                                        type="text"
                                        value={localModels[aiProvider]}
                                        onChange={(e) => setLocalModels(prev => ({ ...prev, [aiProvider]: e.target.value }))}
                                        placeholder="例如: gpt-4-turbo"
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-blue-100 outline-none"
                                    />
                                </div>
                            </div>
                        )}

                        {/* AnythingLLM Dedicated Section */}
                        <div className="space-y-3 p-3 bg-purple-50/30 rounded-lg border border-purple-100/50">
                            <label className="block text-sm font-bold text-purple-800">AnythingLLM 配置</label>
                            <div className="space-y-2">
                                <div className="text-xs text-slate-500">API Key</div>
                                <input
                                    type="password"
                                    value={localKeys.anythingllm}
                                    onChange={(e) => setLocalKeys(prev => ({ ...prev, anythingllm: e.target.value }))}
                                    placeholder="API Key..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-purple-100 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs text-slate-500">Endpoint</div>
                                <input
                                    type="text"
                                    value={localEndpoints.anythingllm}
                                    onChange={(e) => setLocalEndpoints(prev => ({ ...prev, anythingllm: e.target.value }))}
                                    placeholder="http://localhost:3001"
                                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-purple-100 outline-none"
                                />
                            </div>
                            <div className="space-y-2">
                                <div className="text-xs text-slate-500">模型选择</div>
                                <select
                                    value={localModels.anythingllm || 'inf_work'}
                                    onChange={(e) => setLocalModels(prev => ({ ...prev, anythingllm: e.target.value }))}
                                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm bg-white focus:ring-2 focus:ring-purple-100 outline-none appearance-none"
                                >
                                    <option value="inf_work">inf_work</option>
                                    <option value="inf_knowledge">inf_knowledge</option>
                                    <option value="inf_yc">inf_yc</option>
                                </select>
                            </div>
                        </div>

                        {/* GitHub Sync Section */}
                        <div className="space-y-3 p-3 bg-slate-50/50 rounded-lg border border-slate-200">
                            <label className="block text-sm font-bold text-slate-800 flex items-center gap-2">
                                <svg className="w-4 h-4 text-slate-700" viewBox="0 0 24 24" fill="currentColor">
                                    <path d="M12 0c-6.626 0-12 5.373-12 12 0 5.302 3.438 9.8 8.207 11.387.599.111.793-.261.793-.577v-2.234c-3.338.726-4.033-1.416-4.033-1.416-.546-1.387-1.333-1.756-1.333-1.756-1.089-.745.083-.729.083-.729 1.205.084 1.839 1.237 1.839 1.237 1.07 1.834 2.807 1.304 3.492.997.107-.775.418-1.305.762-1.604-2.665-.305-5.467-1.334-5.467-5.931 0-1.311.469-2.381 1.236-3.221-.124-.303-.535-1.524.117-3.176 0 0 1.008-.322 3.301 1.23.957-.266 1.983-.399 3.003-.404 1.02.005 2.047.138 3.006.404 2.291-1.552 3.297-1.23 3.297-1.23.653 1.653.242 2.874.118 3.176.77.84 1.235 1.911 1.235 3.221 0 4.609-2.807 5.624-5.479 5.921.43.372.823 1.102.823 2.222v3.293c0 .319.192.694.801.576 4.765-1.589 8.199-6.086 8.199-11.386 0-6.627-5.373-12-12-12z"/>
                                </svg>
                                GitHub 云端同步
                            </label>
                            <div className="space-y-2">
                                <div className="text-xs text-slate-500">Personal Access Token</div>
                                <input
                                    type="password"
                                    value={localGitToken}
                                    onChange={(e) => setLocalGitToken(e.target.value)}
                                    placeholder="ghp_..."
                                    className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-slate-100 outline-none"
                                />
                            </div>
                            <div className="grid grid-cols-2 gap-2">
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500">Owner</div>
                                    <input
                                        type="text"
                                        value={localGitOwner}
                                        onChange={(e) => setLocalGitOwner(e.target.value)}
                                        placeholder="yc4805551"
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-slate-100 outline-none"
                                    />
                                </div>
                                <div className="space-y-2">
                                    <div className="text-xs text-slate-500">Repo</div>
                                    <input
                                        type="text"
                                        value={localGitRepo}
                                        onChange={(e) => setLocalGitRepo(e.target.value)}
                                        placeholder="word"
                                        className="w-full px-3 py-2 border border-slate-200 rounded text-sm focus:ring-2 focus:ring-slate-100 outline-none"
                                    />
                                </div>
                            </div>
                        </div>
                    </div>
                </div>

                <div className="flex-shrink-0 px-6 py-4 bg-slate-50 border-t border-slate-100 flex justify-end">
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
