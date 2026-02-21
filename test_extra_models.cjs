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

const extraModels = [
    "Comfy-Org/flux2-dev",
    "Comfy-Org/flux1-schnell",
    "black-forest-labs/FLUX.1-schnell",
    "black-forest-labs/FLUX.1-dev"
];

async function testInference(modelId) {
    const URL = `https://router.huggingface.co/hf-inference/models/${modelId}`;
    console.log(`[Test] ${modelId}`);
    try {
        const response = await fetch(URL, {
            method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: "A cat" })
        });
        console.log(`  -> Status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
            const txt = await response.text();
            console.log(`  -> Error: ${txt.substring(0, 100)}`);
        }
    } catch (e) { console.log(`  -> Error: ${e.message}`); }
    console.log("---");
}

async function run() {
    for (const m of extraModels) {
        await testInference(m);
    }
}

run();
