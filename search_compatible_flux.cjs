const fs = require('fs');

async function searchCompatibleFlux() {
    console.log("[Search] Looking for ALL models with tags 'flux' AND 'endpoints_compatible'...");
    const URL = `https://huggingface.co/api/models?tags=flux,endpoints_compatible&limit=50&sort=downloads&direction=-1`;
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
            console.log(`  Pipeline: ${m.pipeline_tag}`);
        });
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
}

searchCompatibleFlux();
