export async function hasInappropriateLanguage(title: string): Promise<boolean> {
    if (!title || title.trim().length === 0) {
        return false; // No title provided, so no inappropriate language
    }
    const tisanePrimaryAPIKey = process.env.TISANE_PRIMARY_API_KEY;
    const response = await fetch("https://api.tisane.ai/parse", {
        method: "POST",
        headers: {
            "Content-Type": "application/json",
            "Cache-Control": "no-cache",
            "Ocp-Apim-Subscription-Key": tisanePrimaryAPIKey,
        },
        body: JSON.stringify({
        language: "en",
        content: title,
        settings: { explain: true },
        }),
    });

    if (!response.ok) {
        console.error("Failed to check for inappropriate language:", response.statusText);
        return false;
    }

    const data = await response.json();
    if (data.abuse && data.abuse.length > 0) {
        return true;
    };

    return false;
}