import { useEffect } from 'react';
import { useEditor, EditorContent } from '@tiptap/react';
import StarterKit from '@tiptap/starter-kit';
import Highlight from '@tiptap/extension-highlight';
import Placeholder from '@tiptap/extension-placeholder';
import CharacterCount from '@tiptap/extension-character-count';
import { useEditorContext } from './EditorProvider';
import { exportToOfficialDocx } from '../../lib/docxExport';

export default function EditorArea() {
    const { setEditor } = useEditorContext();

    const editor = useEditor({
        extensions: [
            StarterKit,
            Highlight.configure({
                multicolor: true,
            }),
            Placeholder.configure({
                placeholder: '在此输入内容，或在此处导入 Word 文档...',
            }),
            CharacterCount.configure({
                limit: null,
            }),
        ],
        content: '<p></p>',
        editorProps: {
            attributes: {
                class: 'prose prose-slate max-w-none focus:outline-none min-h-[500px] p-8',
            },
        },
    });

    useEffect(() => {
        if (editor) {
            setEditor(editor);
        }
    }, [editor, setEditor]);



    // Load initial content from local storage if exists
    useEffect(() => {
        if (editor) {
            const savedDraft = localStorage.getItem('fast_canvas_draft');
            if (savedDraft && editor.isEmpty) {
                editor.commands.setContent(savedDraft);
            }
        }
    }, [editor]);

    // Handle custom events from toolbar
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

    return (
        <div className="w-full h-full bg-white md:rounded-lg shadow-sm border border-slate-200 overflow-y-auto">
            <EditorContent editor={editor} />
        </div>
    );
}
