const fs = require('fs');

async function searchModels() {
    console.log("[Search] Looking for endpoints_compatible models containing 'flux.2'...");
    const URL = `https://huggingface.co/api/models?search=flux.2&tags=endpoints_compatible&limit=20`;
    try {
        const response = await fetch(URL);
        if (!response.ok) {
            console.log(`  -> Failed: ${response.status} ${response.statusText}`);
            return;
        }
        const data = await response.json();
        console.log(`[Results] Found ${data.length} models:`);
        data.forEach(m => {
            console.log(`- ${m.modelId} (Downloads: ${m.downloads})`);
            console.log(`  Tags: ${JSON.stringify(m.tags)}`);
        });
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
}

searchModels();
