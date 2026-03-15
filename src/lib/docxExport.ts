import { Document, Packer, Paragraph, TextRun } from 'docx';
import { Editor } from '@tiptap/react';

export async function exportToOfficialDocx(editor: Editor, title: string) {
    if (!editor) return;

    // A simple parsing of Tiptap JSON to DOCX paragraphs.
    // Real-world scenarios might require walking the JSON node tree.
    // Here we'll take a simplified approach reading text block by block.
    
    // Tiptap exposes getJSON() which has a 'type': 'doc' and 'content' array.
    const json = editor.getJSON();
    const children: Paragraph[] = [];

    // Official Document Standard: Main Title
    children.push(
        new Paragraph({
            text: title || "无标题公文",
            heading: "Heading1",
            alignment: "center",
            spacing: {
                after: 400,
            },
            // Note: True official docs use Fangsong for body, XiaobiaoSong for title etc.
            // docx library supports declaring fonts but depends on system having them.
            run: {
                font: "方正小标宋简体", // Common official title font
                size: 44, // 22pt = 44 half-points
                bold: true,
            }
        })
    );

    // Process nodes (simplified)
    if (json.content) {
        json.content.forEach((node: Record<string, unknown>) => {
            if (node.type === 'paragraph') {
                const textRuns = Array.isArray(node.content) 
                    ? node.content.map((child: Record<string, unknown>) => new TextRun({
                        text: (child.text as string) || "",
                        font: "仿宋_GB2312", // Standard official body font
                        size: 32, // 16pt (三号字) = 32 half-points
                        bold: Array.isArray(child.marks) && child.marks.some((m: Record<string, unknown>) => m.type === 'bold'),
                    }))
                    : [new TextRun({ text: "" })];
                
                children.push(
                    new Paragraph({
                        children: textRuns,
                        spacing: {
                            line: 480, // roughly 1.5 line spacing (240 is single)
                            before: 100,
                            after: 100
                        },
                        indent: {
                            firstLine: 640, // 2 characters indent for size 16pt (32 * 20 twips approx)
                        }
                    })
                );
            }
            if (node.type === 'heading') {
                // E.g., level 1 -> Heiti (黑体), level 2 -> Kaiti (楷体)
                const isLvl1 = (node.attrs as Record<string, unknown>)?.level === 1;
                const fontName = isLvl1 ? "黑体" : "楷体_GB2312";
                
                const textRuns = Array.isArray(node.content) 
                    ? node.content.map((child: Record<string, unknown>) => new TextRun({
                        text: (child.text as string) || "",
                        font: fontName,
                        size: 32,
                        bold: true,
                    }))
                    : [new TextRun({ text: "" })];
                    
                children.push(
                    new Paragraph({
                        children: textRuns,
                        spacing: {
                            line: 480,
                            before: 200,
                            after: 200
                        }
                    })
                );
            }
        });
    }

    const doc = new Document({
        sections: [
            {
                properties: {
                    page: {
                        margin: {
                            top: 1440 * 1.5, // Approx 3.7cm (standard)
                            bottom: 1440 * 1.4, // Approx 3.5cm
                            left: 1440 * 1.1, // Approx 2.8cm
                            right: 1440 * 1.0, // Approx 2.6cm
                        }
                    }
                },
                children: children
            }
        ]
    });

    const blob = await Packer.toBlob(doc);
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `${title || '公文'}.docx`;
    a.click();
    URL.revokeObjectURL(url);
}
