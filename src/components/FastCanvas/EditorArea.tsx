import { useEffect, useRef } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEditorContext } from './EditorProvider';
import { exportToOfficialDocx } from '../../lib/docxExport';
import { GhostTextExtension, setGhostText } from './GhostTextExtension';
import { generateCompletion } from '../../lib/ai';
import { useSettings } from '../../context/SettingsContext';

export default function EditorArea() {
    const { setEditor, completionEnabled } = useEditorContext();
    const { apiKeys, endpoints, models } = useSettings();

    // 用于取消上一次补全请求的标志
    const completionAbortRef = useRef<{ cancelled: boolean }>({ cancelled: false });
    const debounceTimerRef = useRef<ReturnType<typeof setTimeout> | null>(null);
    // 标记是否正在等待 AI 响应（避免重复请求）
    const isFetchingRef = useRef(false);

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({ multicolor: true }),
            Placeholder.configure({
                placeholder: '在此输入内容，或在此处导入 Word 文档...',
            }),
            CharacterCount.configure({ limit: null }),
            GhostTextExtension, // ← 幽灵文字扩展
        ],
        content: '<p></p>',
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] p-8',
            },
        },
    });

    // 同步 editor 到 context
    useEffect(() => {
        if (editor) setEditor(editor);
    }, [editor, setEditor]);

    // 从 localStorage 恢复草稿
    useEffect(() => {
        if (editor) {
            const savedDraft = localStorage.getItem('fast_canvas_draft');
            if (savedDraft && editor.isEmpty) {
                editor.commands.setContent(savedDraft);
            }
        }
    }, [editor]);

    // 处理 toolbar 派发的导入/导出事件
    useEffect(() => {
        if (!editor) return;

        const handleExport = async (e: Event) => {
            const customEvent = e as CustomEvent<{ title: string }>;
            await exportToOfficialDocx(editor, customEvent.detail.title);
        };

        const handleImport = (e: Event) => {
            const customEvent = e as CustomEvent<{ html: string }>;
            editor.commands.setContent(customEvent.detail.html);
        };

        document.addEventListener('fastcanvas:export', handleExport);
        document.addEventListener('fastcanvas:import', handleImport);

        return () => {
            document.removeEventListener('fastcanvas:export', handleExport);
            document.removeEventListener('fastcanvas:import', handleImport);
        };
    }, [editor]);

    // ─── 智能写作补全：防抖触发逻辑 ──────────────────────────────────────
    useEffect(() => {
        if (!editor) return;

        const handleUpdate = () => {
            // 关闭状态 → 清除任何残留的幽灵文字并跳过
            if (!completionEnabled) {
                if (editor.view) setGhostText(editor.view, null);
                return;
            }

            // 重置上一次的请求标志
            completionAbortRef.current.cancelled = true;

            // 清除上一次防抖计时器
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);

            debounceTimerRef.current = setTimeout(async () => {
                if (!editor.view || isFetchingRef.current) return;

                // 获取光标前最多 300 字的文本作为上下文
                const { from } = editor.state.selection;
                const precedingText = editor.state.doc
                    .textBetween(Math.max(0, from - 300), from, '\n')
                    .trim();

                // 文本太短（< 6 字）不触发
                if (precedingText.length < 6) return;

                const abortToken = { cancelled: false };
                completionAbortRef.current = abortToken;
                isFetchingRef.current = true;

                try {
                    const suggestion = await generateCompletion(precedingText, {
                        apiKey: apiKeys['anythingllm'],
                        endpoint: endpoints['anythingllm'],
                        model: models['anythingllm'],
                    });

                    // 请求期间用户已经继续输入 → 丢弃结果
                    if (abortToken.cancelled || !editor.view) return;

                    if (suggestion) {
                        setGhostText(editor.view, suggestion, editor.state.selection.from);
                    }
                } finally {
                    isFetchingRef.current = false;
                }
            }, 900); // 停顿 900ms 后触发
        };

        editor.on('update', handleUpdate);

        return () => {
            editor.off('update', handleUpdate);
            if (debounceTimerRef.current) clearTimeout(debounceTimerRef.current);
            // 卸载时清除幽灵文字
            if (editor.view) setGhostText(editor.view, null);
        };
    }, [editor, completionEnabled, apiKeys, endpoints, models]);

    // 功能关闭时立即清除幽灵文字
    useEffect(() => {
        if (!completionEnabled && editor?.view) {
            setGhostText(editor.view, null);
        }
    }, [completionEnabled, editor]);

    return (
        <div className="w-full h-full bg-white md:rounded-lg shadow-sm border border-slate-200 overflow-y-auto">
            <EditorContent editor={editor} />
        </div>
    );
}
