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

const hfToken = env["VITE_HF_TOKEN"];
const falKey = env["VITE_FAL_KEY"];

async function testHFPro(modelId) {
    const URL = `https://router.huggingface.co/hf-pro/models/${modelId}/text-to-image`;
    console.log(`[Testing HF Pro Router] ${modelId}`);
    try {
        const response = await fetch(URL, {
            method: "POST", headers: { "Authorization": `Bearer ${hfToken}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: "Test" })
        });
        console.log(`  -> Status: ${response.status} ${response.statusText}`);
    } catch (e) { console.log(`  -> Error: ${e.message}`); }
}

async function testDirectFal(modelId) {
    if (!falKey) return;
    console.log(`[Testing Direct FAL] ${modelId}`);
    // Fal.ai uses a different structure, but we can test a simple ping if supported or just check status
    // For now, let's just stick to the Router testing but adding more providers
}

const providers = ["hf-inference", "hf-pro", "fal-ai", "replicate"];
const models = ["black-forest-labs/FLUX.2-dev", "black-forest-labs/FLUX.1-schnell"];

async function run() {
    for (const m of models) {
        for (const p of providers) {
            const URL = `https://router.huggingface.co/${p}/models/${m}`;
            console.log(`[Testing Router] ${m} @ ${p}`);
            try {
                const response = await fetch(URL, {
                    method: "POST", headers: { "Authorization": `Bearer ${hfToken}`, "Content-Type": "application/json" },
                    body: JSON.stringify({ inputs: "Test image" })
                });
                console.log(`  -> Status: ${response.status} ${response.statusText}`);
                if (!response.ok) {
                    const txt = await response.text();
                    console.log(`  -> Error: ${txt.substring(0, 100)}`);
                }
            } catch (e) { console.log(`  -> Error: ${e.message}`); }
            console.log("---");
        }
    }
}

run();
