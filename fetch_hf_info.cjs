const fs = require('fs');

async function getModelInfo(modelId) {
    console.log(`[Info] Fetching metadata for ${modelId}...`);
    const URL = `https://huggingface.co/api/models/${modelId}`;
    try {
        const response = await fetch(URL);
        if (!response.ok) {
            console.log(`  -> Failed: ${response.status} ${response.statusText}`);
            return;
        }
        const data = await response.json();
        console.log(`  -> Tags: ${JSON.stringify(data.tags || [])}`);
        console.log(`  -> Pipeline: ${data.pipeline_tag}`);
        console.log(`  -> Gated: ${data.gated}`);

        // Check for inference widget info or library info
        if (data.inference) {
            console.log(`  -> Inference Config: ${JSON.stringify(data.inference)}`);
        }

        const hasInferenceTag = data.tags && data.tags.includes('inference');
        const hasWidgetTag = data.tags && data.tags.includes('inference-widget');

        console.log(`  -> Inference Supported (Shared): ${hasInferenceTag}`);
        console.log(`  -> Inference Widget Enabled: ${hasWidgetTag}`);
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
}

const modelsToInfo = [
    "black-forest-labs/FLUX.1-schnell",
    "black-forest-labs/FLUX.1-dev",
    "black-forest-labs/FLUX.2-dev",
    "black-forest-labs/FLUX.2-klein-9B",
    "black-forest-labs/FLUX.2-klein-base-9B",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "recraft-ai/recraft-v3-text-to-image",
    "ideogram-ai/ideogram-3.0"
];

async function run() {
    for (const m of modelsToInfo) {
        await getModelInfo(m);
        console.log("-".repeat(40));
    }
}

run();
