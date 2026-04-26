/**
 * GhostTextExtension — TipTap/ProseMirror 内联幽灵文字扩展
 *
 * 功能：
 * - 在光标位置渲染灰色斜体的"补全建议"文字（ghost text）
 * - Tab 键：接受建议，将文字插入文档
 * - Esc 键：放弃建议，清除幽灵文字
 * - 用户继续输入（文档变化）：自动清除幽灵文字
 */
import { Extension } from '@tiptap/core';
import { Plugin, PluginKey } from '@tiptap/pm/state';
import { Decoration, DecorationSet } from '@tiptap/pm/view';
import type { Node } from '@tiptap/pm/model';
import type { EditorView } from '@tiptap/pm/view';

interface GhostTextState {
    text: string;
    pos: number;
    decorations: DecorationSet;
}

export const ghostTextPluginKey = new PluginKey<GhostTextState>('ghostText');

function buildDecoration(pos: number, text: string, doc: Node): DecorationSet {
    const widget = Decoration.widget(
        pos,
        () => {
            const span = document.createElement('span');
            span.textContent = text;
            span.setAttribute('data-ghost-text', 'true');
            // 视觉样式：灰色 + 斜体，模拟 GitHub Copilot 风格
            span.style.cssText = [
                'color:#94a3b8',
                'font-style:italic',
                'pointer-events:none',
                'user-select:none',
                'opacity:0.85',
            ].join(';');
            return span;
        },
        { side: 1, key: 'ghost-text-widget' }
    );
    return DecorationSet.create(doc, [widget]);
}

export const GhostTextExtension = Extension.create({
    name: 'ghostText',

    addProseMirrorPlugins() {
        return [
            new Plugin<GhostTextState>({
                key: ghostTextPluginKey,

                state: {
                    init(): GhostTextState {
                        return { text: '', pos: -1, decorations: DecorationSet.empty };
                    },

                    apply(tr, prev): GhostTextState {
                        const meta = tr.getMeta(ghostTextPluginKey) as
                            | { text: string; pos: number }
                            | null
                            | undefined;

                        // 显式设置 / 清除
                        if (meta !== undefined) {
                            if (!meta || !meta.text) {
                                return { text: '', pos: -1, decorations: DecorationSet.empty };
                            }
                            return {
                                text: meta.text,
                                pos: meta.pos,
                                decorations: buildDecoration(meta.pos, meta.text, tr.doc),
                            };
                        }

                        // 用户继续输入（文档变化）→ 自动清除
                        if (tr.docChanged) {
                            return { text: '', pos: -1, decorations: DecorationSet.empty };
                        }

                        // 光标移动等非文档变化 → 保持（重映射位置）
                        return {
                            ...prev,
                            decorations: prev.decorations.map(tr.mapping, tr.doc),
                        };
                    },
                },

                props: {
                    decorations(state) {
                        return ghostTextPluginKey.getState(state)?.decorations ?? DecorationSet.empty;
                    },

                    handleKeyDown(view: EditorView, event: KeyboardEvent): boolean {
                        const pluginState = ghostTextPluginKey.getState(view.state);
                        if (!pluginState?.text) return false;

                        // Tab → 接受补全
                        if (event.key === 'Tab') {
                            event.preventDefault();
                            const { from } = view.state.selection;
                            const tr = view.state.tr
                                .insertText(pluginState.text, from)
                                .setMeta(ghostTextPluginKey, null);
                            view.dispatch(tr);
                            return true;
                        }

                        // Esc → 放弃补全
                        if (event.key === 'Escape') {
                            event.preventDefault();
                            view.dispatch(view.state.tr.setMeta(ghostTextPluginKey, null));
                            return true;
                        }

                        return false;
                    },
                },
            }),
        ];
    },
});

/**
 * 外部调用入口：设置或清除幽灵文字
 * @param view  ProseMirror EditorView
 * @param text  要显示的补全建议，传 null 则清除
 * @param pos   插入位置（默认为当前光标位置）
 */
export function setGhostText(
    view: EditorView,
    text: string | null,
    pos?: number
): void {
    const curPos = pos ?? view.state.selection.from;
    view.dispatch(
        view.state.tr.setMeta(
            ghostTextPluginKey,
            text ? { text, pos: curPos } : null
        )
    );
}
