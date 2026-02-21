const fs = require('fs');

async function listProviderModels(provider) {
    console.log(`[Search] Models for provider: ${provider}...`);
    const URL = `https://huggingface.co/api/models?inference_provider=${provider}&limit=100`;
    try {
        const response = await fetch(URL);
        if (!response.ok) {
            console.log(`  -> Failed: ${response.status} ${response.statusText}`);
            return;
        }
        const data = await response.json();
        console.log(`[Results] Found ${data.length} models for ${provider}:`);
        data.slice(0, 20).forEach(m => {
            console.log(`- ${m.modelId} (Downloads: ${m.downloads})`);
        });
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
}

async function run() {
    const providers = ["fal-ai", "together", "replicate", "fireworks", "novita"];
    for (const p of providers) {
        await listProviderModels(p);
        console.log("-".repeat(40));
    }
}

run();
