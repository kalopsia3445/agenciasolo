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

async function testV1OpenAICompatible(modelId) {
    // The modern HF Router often favors the V1 OpenAI-compatible endpoint.
    const URL = `https://router.huggingface.co/hf-inference/v1/images/generations`;
    console.log(`[V1 OpenAI Test] Model: ${modelId}`);

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

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
        if (response.ok) {
            const data = await response.json();
            console.log(`  -> SUCCESS! URL: ${data.data?.[0]?.url?.substring(0, 50)}...`);
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
    const models = [
        "black-forest-labs/FLUX.1-schnell",
        "black-forest-labs/FLUX.2-dev",
        "stabilityai/stable-diffusion-xl-base-1.0",
        "ideogram-ai/ideogram-3.0",
        "recraft-ai/recraft-v3"
    ];

    for (const m of models) {
        await testV1OpenAICompatible(m);
    }
}

run();
