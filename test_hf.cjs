const fs = require('fs');

function parseDotenv(content) {
    const env = {};
    content.split('\n').forEach(line => {
        const match = line.match(/^\s*([\w.-]+)\s*=\s*(.*)?\s*$/);
        if (match) {
            let value = match[2] || "";
            if (value.startsWith('"') && value.endsWith('"')) value = value.slice(1, -1);
            if (value.startsWith("'") && value.endsWith("'")) value = value.slice(1, -1);
            env[match[1]] = value;
        }
    });
    return env;
}

// Load environment
let env = {};
if (fs.existsSync('.env.local')) env = { ...env, ...parseDotenv(fs.readFileSync('.env.local', 'utf8')) };

const token = env["VITE_HF_TOKEN"];

if (!token) {
    console.log("No VITE_HF_TOKEN found in .env.local!");
    process.exit(1);
}

const modelsToTest = [
    // FLUX Lineage
    "black-forest-labs/FLUX.1-schnell",
    "black-forest-labs/FLUX.1-dev",
    "black-forest-labs/FLUX.2-pro",
    "black-forest-labs/FLUX.2-dev",
    "black-forest-labs/FLUX.2-klein-9B",
    "black-forest-labs/FLUX.2-klein-4B",
    "black-forest-labs/FLUX.2-klein-base-9B",
    "black-forest-labs/FLUX.2-klein-base-4B",

    // Recraft Lineage
    "recraft-ai/recraft-v4",
    "recraft-ai/recraft-v4-pro",
    "recraft-ai/recraft-v3-text-to-image",
    "recraft-ai/recraft-v3",

    // Ideogram Lineage
    "ideogram-ai/ideogram-3.0",
    "ideogram-ai/ideogram-2.0",

    // Stability Lineage
    "stabilityai/stable-diffusion-3.5-large",
    "stabilityai/stable-diffusion-3.5-large-turbo",
    "stabilityai/stable-diffusion-xl-base-1.0",

    // Potential Hidden/Internal Paths or Providers
    "fal-ai/flux-pro-v1.1",
    "fal-ai/flux-dev",
    "togethercomputer/flux-pro",
    "black-forest-labs/FLUX.1-schnell-diffusers"
];

const endpointConfigs = [
    { name: "Router HF-Inference", url: "https://router.huggingface.co/hf-inference/models/" },
    { name: "Router V1", url: "https://router.huggingface.co/v1/models/", suffix: "/text-to-image" },
    { name: "Direct API (Internal)", url: "https://api-inference.huggingface.co/models/" }
];

async function testCombination(modelId, config) {
    let finalUrl = config.url + modelId + (config.suffix || "");

    console.log(`[Testing] Model: ${modelId.padEnd(40)} | Endpoint: ${config.name}`);

    try {
        const payload = {
            inputs: "A professional marketing banner with text 'Solo Spark'",
            parameters: { num_inference_steps: 1, width: 512, height: 512 }
        };

        const response = await fetch(finalUrl, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
                "x-use-cache": "false"
            },
            body: JSON.stringify(payload),
        });

        console.log(`  -> Status: ${response.status} ${response.statusText}`);

        if (response.ok) {
            const buf = await response.arrayBuffer();
            console.log(`  -> SUCCESS! Received ${buf.byteLength} bytes`);
            return true;
        } else {
            const errorText = await response.text();
            let parsedError = errorText;
            try {
                const json = JSON.parse(errorText);
                parsedError = json.error || errorText;
            } catch (e) { }
            console.log(`  -> Error: ${parsedError.substring(0, 150)}`);
            return false;
        }
    } catch (e) {
        console.log(`  -> Fetch failed: ${e.message}`);
        return false;
    }
}

async function runScan() {
    console.log("=== STARTING COMPREHENSIVE HF MODEL SCAN ===\n");
    const startTime = Date.now();
    let successCount = 0;

    for (const modelId of modelsToTest) {
        for (const config of endpointConfigs) {
            const success = await testCombination(modelId, config);
            if (success) successCount++;
            console.log("-".repeat(80));
        }
    }

    console.log(`\n=== SCAN COMPLETE ===`);
    console.log(`Total Successes: ${successCount}`);
    console.log(`Time taken: ${((Date.now() - startTime) / 1000).toFixed(2)}s`);
}

runScan();
