const fs = require('fs');

async function searchKeywords(keyword) {
    console.log(`[Search] Keyword: ${keyword}...`);
    const URL = `https://huggingface.co/api/models?search=${keyword}&limit=10&sort=downloads&direction=-1`;
    try {
        const response = await fetch(URL);
        if (!response.ok) {
            console.log(`  -> Failed: ${response.status} ${response.statusText}`);
            return;
        }
        const data = await response.json();
        console.log(`[Results] Found ${data.length} models for ${keyword}:`);
        data.forEach(m => {
            console.log(`- ${m.modelId} (Downloads: ${m.downloads}, Pipeline: ${m.pipeline_tag})`);
        });
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
}

async function run() {
    const keywords = ["ideogram", "recraft", "flux.2", "flux-2", "flux-pro"];
    for (const k of keywords) {
        await searchKeywords(k);
        console.log("-".repeat(40));
    }
}

run();
