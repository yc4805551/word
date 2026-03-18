import { useState } from 'react';
import { EditorProvider } from '../components/FastCanvas/EditorProvider';
import EditorArea from '../components/FastCanvas/EditorArea';
import AIAssistantSidebar from '../components/FastCanvas/AIAssistantSidebar';
import { Upload, Download, Save } from 'lucide-react';
import mammoth from 'mammoth';

export default function FastCanvas() {
    const [title, setTitle] = useState('未命名公文');
    const [sidebarWidth, setSidebarWidth] = useState(320); // Initial width in px

    const handleMouseDown = (e: React.MouseEvent) => {
        e.preventDefault();
        const startX = e.clientX;
        const startWidth = sidebarWidth;

        const handleMouseMove = (mouseMoveEvent: MouseEvent) => {
            const newWidth = Math.max(250, startWidth - (mouseMoveEvent.clientX - startX));
            setSidebarWidth(Math.min(newWidth, 600)); // Min 250px, Max 600px
        };

        const handleMouseUp = () => {
            document.removeEventListener('mousemove', handleMouseMove);
            document.removeEventListener('mouseup', handleMouseUp);
        };

        document.addEventListener('mousemove', handleMouseMove);
        document.addEventListener('mouseup', handleMouseUp);
    };

    const handleExport = async () => {
        // Need to get editor instance from inside Provider using a specific callback approach
        // Or we expose a function via event listener.
        // A cleaner way is doing this inside a child component, but for simplicity we can dispatch a custom event.
        document.dispatchEvent(new CustomEvent('fastcanvas:export', { detail: { title } }));
    };

    const handleImportClick = () => {
        document.getElementById('import-file-input')?.click();
    };

    const handleImport = async (e: React.ChangeEvent<HTMLInputElement>) => {
        const file = e.target.files?.[0];
        if (!file) return;

        const reader = new FileReader();
        reader.onload = async (event) => {
            const arrayBuffer = event.target?.result as ArrayBuffer;
            try {
                const result = await mammoth.convertToHtml({ arrayBuffer });
                document.dispatchEvent(new CustomEvent('fastcanvas:import', { detail: { html: result.value } }));
            } catch (err) {
                console.error("Import failed", err);
                alert("导入失败，仅支持 .docx 格式");
            }
        };
        reader.readAsArrayBuffer(file);
        // Reset input
        e.target.value = '';
    };

    return (
        <EditorProvider>
            <div className="flex flex-col h-[calc(100vh-8rem)] -mt-2 -mx-2 md:h-full md:m-0 overflow-hidden bg-white md:bg-transparent">
                
                {/* Top Toolbar */}
                <div className="flex items-center justify-between px-4 py-3 bg-white border-b border-slate-200 md:rounded-t-lg shadow-sm z-10 shrink-0">
                    <div className="flex items-center gap-4 flex-1">
                        <input 
                            type="text" 
                            value={title}
                            onChange={(e) => setTitle(e.target.value)}
                            className="text-lg font-bold text-slate-800 bg-transparent border-none focus:ring-0 p-0 m-0 w-64 placeholder-slate-400 hover:bg-slate-50 transition-colors focus:bg-white rounded px-1"
                            placeholder="输入文档标题..."
                        />
                        <StatusBar />
                    </div>
                    
                    <div className="flex items-center gap-2">
                        <input 
                            type="file" 
                            id="import-file-input"
                            accept=".docx"
                            className="hidden"
                            onChange={handleImport}
                        />
                        <button 
                            onClick={() => document.dispatchEvent(new CustomEvent('fastcanvas:save'))}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-green-600 hover:bg-green-50 rounded-lg transition-colors border border-slate-200"
                        >
                            <Save className="w-4 h-4" />
                            <span className="hidden sm:inline">同步保存</span>
                        </button>
                        <button 
                            onClick={handleImportClick}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-slate-600 hover:text-blue-600 hover:bg-blue-50 rounded-lg transition-colors border border-slate-200"
                        >
                            <Upload className="w-4 h-4" />
                            <span className="hidden sm:inline">导入 Word</span>
                        </button>
                        <button 
                            onClick={handleExport}
                            className="flex items-center gap-1.5 px-3 py-1.5 text-sm font-medium text-white bg-blue-600 hover:bg-blue-700 rounded-lg transition-colors shadow-sm"
                        >
                            <Download className="w-4 h-4" />
                            <span className="hidden sm:inline">导出标准公文</span>
                        </button>
                    </div>
                </div>

                {/* Main Workspace */}
                <div className="flex flex-1 overflow-hidden relative">
                    {/* Editor Left Side */}
                    <div className="flex-1 h-full min-w-0 flex flex-col relative z-0">
                        <EditorArea />
                        <CharacterCountBar />
                    </div>

                    {/* Draggable Handle */}
                    <div 
                        onMouseDown={handleMouseDown}
                        className="w-1.5 hover:w-2 bg-transparent hover:bg-blue-400 cursor-col-resize z-10 absolute right-0 top-0 bottom-0 flex items-center justify-center group transition-all"
                        style={{ right: `${sidebarWidth}px`, transform: 'translateX(50%)' }}
                    >
                        <div className="h-8 w-1 bg-slate-200 group-hover:bg-white rounded-full"></div>
                    </div>

                    {/* AI Sidebar Right Side */}
                    <div 
                        className="h-full shrink-0 hidden md:block" 
                        style={{ width: `${sidebarWidth}px` }}
                    >
                        <AIAssistantSidebar />
                    </div>
                </div>
            </div>
        </EditorProvider>
    );
}

// Inner components to access context
import { useEditorContext } from '../components/FastCanvas/EditorProvider';

function StatusBar() {
    const { saveStatus } = useEditorContext();
    
    return (
        <span className={`text-xs flex items-center gap-1 px-2 py-0.5 rounded-full ${
            saveStatus === 'saved' ? 'bg-green-100 text-green-700' : 
            saveStatus === 'saving' ? 'bg-yellow-100 text-yellow-700' : 
            'bg-slate-100 text-slate-500'
        }`}>
            {saveStatus === 'saved' && <span className="w-1.5 h-1.5 rounded-full bg-green-500"></span>}
            {saveStatus === 'saving' && <span className="w-1.5 h-1.5 rounded-full bg-yellow-500 animate-pulse"></span>}
            {saveStatus === 'unsaved' && <span className="w-1.5 h-1.5 rounded-full bg-slate-400"></span>}
            {saveStatus === 'saved' ? '已同步' : saveStatus === 'saving' ? '同步中...' : '未同步'}
        </span>
    );
}

function CharacterCountBar() {
    const { editor } = useEditorContext();

    if (!editor) return null;

    const words = editor.storage.characterCount.words();
    const characters = editor.storage.characterCount.characters();

    return (
        <div className="absolute bottom-4 right-4 bg-white/80 backdrop-blur-sm border border-slate-200 text-slate-500 text-xs px-3 py-1.5 rounded-full shadow-sm flex gap-3 pointer-events-none">
            <span>{words} 词</span>
            <span>{characters} 字符</span>
        </div>
    );
}
