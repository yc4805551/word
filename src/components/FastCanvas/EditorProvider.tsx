/* eslint-disable react-refresh/only-export-components */
import { createContext, useContext, useState } from 'react';
import { Editor } from '@tiptap/react';

interface EditorContextType {
    editor: Editor | null;
    setEditor: (editor: Editor | null) => void;
    documentId: string;
    setDocumentId: (id: string) => void;
    saveStatus: 'saved' | 'saving' | 'unsaved';
    setSaveStatus: (status: 'saved' | 'saving' | 'unsaved') => void;
    title: string;
    setTitle: (title: string) => void;
}

const EditorContext = createContext<EditorContextType | undefined>(undefined);

export function EditorProvider({ children }: { children: React.ReactNode }) {
    const [editor, setEditor] = useState<Editor | null>(null);
    const [documentId, setDocumentId] = useState<string>('default-doc');
    const [saveStatus, setSaveStatus] = useState<'saved' | 'saving' | 'unsaved'>('saved');
    const [title, setTitle] = useState('未命名公文');

    return (
        <EditorContext.Provider value={{
            editor,
            setEditor,
            documentId,
            setDocumentId,
            saveStatus,
            setSaveStatus,
            title,
            setTitle
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
