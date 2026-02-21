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

async function testProviderHeader(modelId, provider) {
    const URL = `https://router.huggingface.co/hf-inference/models/${modelId}`;
    console.log(`[Header Test] ${modelId} via ${provider}`);

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json",
        "x-use-cache": "false"
    };

    if (provider !== "auto") {
        headers["X-Inference-Provider"] = provider;
    }

    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                inputs: "A futuristic city with neon lights",
                parameters: { num_inference_steps: 4, width: 512, height: 512 }
            }),
        });

        console.log(`  -> Status: ${response.status} ${response.statusText}`);
        const body = await response.text();
        if (response.ok) {
            console.log(`  -> SUCCESS! Received binary buffer.`);
        } else {
            console.log(`  -> Error: ${body.substring(0, 150)}`);
        }
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
    console.log("---");
}

async function run() {
    const providers = ["fal-ai", "replicate", "wavespeed", "together", "auto"];
    const models = ["black-forest-labs/FLUX.2-dev", "black-forest-labs/FLUX.2-dev:fastest"];

    for (const model of models) {
        for (const provider of providers) {
            await testProviderHeader(model, provider);
        }
    }
}

run();
