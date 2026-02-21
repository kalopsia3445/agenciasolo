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

async function testV1Images(modelId, provider) {
    const URL = `https://router.huggingface.co/hf-inference/v1/images/generations`;
    console.log(`[Testing V1 Images] Model: ${modelId} | Provider: ${provider || 'default'}`);

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };
    if (provider) {
        headers["X-Inference-Provider"] = provider;
    }

    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({
                model: modelId,
                prompt: "A high-end cinematic portrait",
                n: 1,
                size: "1024x1024"
            }),
        });

        console.log(`  -> Status: ${response.status} ${response.statusText}`);
        const body = await response.text();
        if (response.ok) {
            console.log(`  -> SUCCESS! Response: ${body.substring(0, 200)}...`);
        } else {
            console.log(`  -> Error: ${body.substring(0, 200)}`);
        }
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
}

async function run() {
    const tests = [
        { model: "black-forest-labs/FLUX.1-schnell", provider: null },
        { model: "black-forest-labs/FLUX.2-dev", provider: null },
        { model: "black-forest-labs/FLUX.2-dev", provider: "fal-ai" },
        { model: "recraft-ai/recraft-v3", provider: null },
        { model: "ideogram-ai/ideogram-3.0", provider: null }
    ];

    for (const test of tests) {
        await testV1Images(test.model, test.provider);
        console.log("-".repeat(50));
    }
}

run();
