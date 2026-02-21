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

let env = {};
if (fs.existsSync('.env.local')) env = { ...env, ...parseDotenv(fs.readFileSync('.env.local', 'utf8')) };
const token = env["VITE_HF_TOKEN"];

async function testV1TextToImage(modelId, provider) {
    // The user's snippet uses InferenceClient, which likely targets /v1/models/{model}/text-to-image
    const URL = `https://router.huggingface.co/v1/models/${modelId}/text-to-image`;
    console.log(`[V1 T2I Test] ${modelId} @ ${provider}`);

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Inference-Provider": provider
    };

    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ inputs: "A colorful landscape" }),
        });

        console.log(`  -> Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            console.log(`  -> SUCCESS!`);
        } else {
            const err = await response.text();
            console.log(`  -> Error: ${err.substring(0, 100)}`);
        }
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
    console.log("---");
}

async function run() {
    const providers = ["hf-inference", "fal-ai", "together", "auto"];
    const models = ["black-forest-labs/FLUX.1-schnell", "black-forest-labs/FLUX.2-dev"];

    for (const m of models) {
        for (const p of providers) {
            await testV1TextToImage(m, p);
        }
    }
}

run();
