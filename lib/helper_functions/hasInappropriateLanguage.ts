export async function hasInappropriateLanguage(title: string): Promise<boolean> {
    const tisanePrimaryAPIKey = "b2545cb25e914fa6a333f70892f8d2d9";
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