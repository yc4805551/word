/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { Editor } from '@tiptap/react';

interface EditorContextType {
    editor: Editor | null;
    setEditor: (editor: Editor | null) => void;
    documentId: string;
    setDocumentId: (id: string) => void;

    title: string;
    setTitle: (title: string) => void;

    /** 智能写作补全功能开关 */
    completionEnabled: boolean;
    setCompletionEnabled: (enabled: boolean) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [documentId, setDocumentId] = useState<string>('default-doc');
    const [title, setTitle] = useState('未命名公文');
    const [completionEnabled, setCompletionEnabled] = useState(false);

    return (
        <EditorContext.Provider value={{
            editor,
            setEditor,
            documentId,
            setDocumentId,
            title,
            setTitle,
            completionEnabled,
            setCompletionEnabled,
        }}>
            {children}
        </EditorContext.Provider>
    );
}

export function useEditorContext() {
    const context = useContext(EditorContext);
    if (context === undefined) {
        throw new Error('useEditorContext must be used within an EditorProvider');
    }
    return context;
}
