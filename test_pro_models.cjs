const fetch = require('node-fetch');
const fs = require('fs');

const HF_TOKEN = process.env.HF_TOKEN;

const models = [
    { id: "black-forest-labs/FLUX.1-dev", provider: "fal-ai" },
    { id: "black-forest-labs/FLUX.1-dev", provider: "together" },
    { id: "black-forest-labs/FLUX.1-schnell", provider: "hf-inference" },
    { id: "black-forest-labs/FLUX.1-schnell", provider: "fal-ai" },
    { id: "stabilityai/stable-diffusion-3.5-large", provider: "hf-inference" },
    { id: "Kwai-Kolors/Kolors", provider: "hf-inference" }
];

async function testModel(modelId, provider) {
    console.log(`\n--- Testing ${modelId} via ${provider} ---`);

    // Test Router V1
    const v1Url = `https://router.huggingface.co/v1/models/${modelId}/text-to-image`;
    try {
        const res = await fetch(v1Url, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
                'X-Inference-Provider': provider
            },
            body: JSON.stringify({ inputs: "a beautiful abstract sunset" })
        });
        console.log(`[Router V1] Status: ${res.status} ${res.statusText}`);
        if (!res.ok) console.log(`[Router V1] Error: ${await res.text()}`);
    } catch (e) {
        console.log(`[Router V1] Failed: ${e.message}`);
    }

    // Test Router HF-Inference Path
    const hfUrl = `https://router.huggingface.co/hf-inference/models/${modelId}`;
    try {
        const res = await fetch(hfUrl, {
            method: 'POST',
            headers: {
                'Authorization': `Bearer ${HF_TOKEN}`,
                'Content-Type': 'application/json',
                'X-HF-Provider': provider // Test the other header too
            },
            body: JSON.stringify({ inputs: "a beautiful abstract sunset" })
        });
        console.log(`[Router HF] Status: ${res.status} ${res.statusText}`);
        if (!res.ok) console.log(`[Router HF] Error: ${await res.text()}`);
    } catch (e) {
        console.log(`[Router HF] Failed: ${e.message}`);
    }
}

async function run() {
    if (!HF_TOKEN) {
        console.error("HF_TOKEN not found in env");
        return;
    }
    for (const m of models) {
        await testModel(m.id, m.provider);
    }
}

run();
