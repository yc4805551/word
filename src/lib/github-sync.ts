export interface GitHubSyncConfig {
    token: string;
    owner: string;
    repo: string;
    branch?: string;
}

export async function appendToGitHubFile(
    config: GitHubSyncConfig,
    filePath: string,
    contentToAppend: string,
    commitMessage: string
): Promise<boolean> {
    const { token, owner, repo, branch = 'main' } = config;
    if (!token) throw new Error('GitHub token is required');

    const url = `https://api.github.com/repos/${owner}/${repo}/contents/${filePath}`;
    const headers = {
        'Authorization': `token ${token}`,
        'Accept': 'application/vnd.github.v3+json',
        'Content-Type': 'application/json'
    };

    try {
        // 1. Get current file content and sha
        let currentContent = '';
        let sha = '';
        
        const getRes = await fetch(`${url}?ref=${branch}`, { headers });
        if (getRes.ok) {
            const data = await getRes.json();
            sha = data.sha;
            // Content is base64 encoded, decode it (handles utf-8 properly via JS)
            const binaryString = atob(data.content);
            const bytes = new Uint8Array(binaryString.length);
            for (let i = 0; i < binaryString.length; i++) {
                bytes[i] = binaryString.charCodeAt(i);
            }
            currentContent = new TextDecoder('utf-8').decode(bytes);
        } else if (getRes.status !== 404) {
            throw new Error(`Failed to fetch file: ${getRes.statusText}`);
        }

        // 2. Append new content
        const newContent = currentContent + (currentContent.endsWith('\n') || currentContent === '' ? '' : '\n\n') + contentToAppend;
        
        // Encode back to base64 properly handling utf-8
        const encodedBytes = new TextEncoder().encode(newContent);
        let binaryStr = '';
        for (let i = 0; i < encodedBytes.byteLength; i++) {
            binaryStr += String.fromCharCode(encodedBytes[i]);
        }
        const base64NewContent = btoa(binaryStr);

        // 3. Update the file
        const body: any = {
            message: commitMessage,
            content: base64NewContent,
            branch
        };
        if (sha) body.sha = sha;

        const putRes = await fetch(url, {
            method: 'PUT',
            headers,
            body: JSON.stringify(body)
        });

        if (!putRes.ok) {
            const errBody = await putRes.text();
            throw new Error(`Failed to push to GitHub: ${putRes.statusText} - ${errBody}`);
        }

        return true;
    } catch (error) {
        console.error('GitHub Sync Error:', error);
        throw error;
    }
}
