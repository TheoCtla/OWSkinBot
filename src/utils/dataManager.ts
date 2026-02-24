import type { SkinDatabase } from '../types/index.js';

const getGistUrl = () => `https://api.github.com/gists/${process.env.GIST_ID}`;

const getHeaders = () => ({
    'Authorization': `Bearer ${process.env.GITHUB_TOKEN}`,
    'Accept': 'application/vnd.github.v3+json',
    'User-Agent': 'OWSkinBot',
});

/**
 * Reads the skins database from the GitHub Gist
 */
export async function getSkins(): Promise<SkinDatabase> {
    try {
        const response = await fetch(getGistUrl(), { headers: getHeaders() });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        const data = await response.json() as any;
        const content = data.files['skins.json'].content;
        return JSON.parse(content) as SkinDatabase;
    } catch (error) {
        console.error('Error reading skins data from Gist:', error);
        return {};
    }
}

/**
 * Saves the given object back to the GitHub Gist
 */
export async function saveSkins(db: SkinDatabase): Promise<void> {
    try {
        const response = await fetch(getGistUrl(), {
            method: 'PATCH',
            headers: {
                ...getHeaders(),
                'Content-Type': 'application/json',
            },
            body: JSON.stringify({
                files: {
                    'skins.json': {
                        content: JSON.stringify(db, null, 2),
                    },
                },
            }),
        });

        if (!response.ok) {
            throw new Error(`GitHub API error: ${response.status} ${response.statusText}`);
        }

        console.log(' Base de données sauvegardée avec succès sur GitHub Gist !');
    } catch (error) {
        console.error('Error saving skins data to Gist:', error);
    }
}
