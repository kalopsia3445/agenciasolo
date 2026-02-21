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

async function testModernRouter(modelId, provider, pathType) {
    // There are two common paths for providers in V1:
    // 1. /v1/models/{modelId}/text-to-image
    // 2. /v1/images/generations (OpenAI mode)

    let URL = "";
    let body = {};

    if (pathType === "text-to-image") {
        URL = `https://router.huggingface.co/v1/models/${modelId}/text-to-image`;
        body = { inputs: "A majestic tiger" };
    } else {
        URL = `https://router.huggingface.co/v1/images/generations`;
        body = { model: modelId, prompt: "A majestic tiger" };
    }

    console.log(`[Modern Router Test] ${pathType} | ${modelId} via ${provider}`);

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "X-Inference-Provider": provider
    };

    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify(body),
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
    const providers = ["fal-ai", "together", "replicate"];
    const models = ["black-forest-labs/FLUX.2-dev"];

    for (const model of models) {
        for (const provider of providers) {
            await testModernRouter(model, provider, "text-to-image");
            await testModernRouter(model, provider, "images-generations");
        }
    }
}

run();
