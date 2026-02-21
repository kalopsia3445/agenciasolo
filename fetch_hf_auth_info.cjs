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

async function getAuthenticatedInfo(modelId) {
    console.log(`[Info] Fetching AUTHENTICATED metadata for ${modelId}...`);
    const URL = `https://huggingface.co/api/models/${modelId}`;
    try {
        const response = await fetch(URL, {
            headers: { "Authorization": `Bearer ${token}` }
        });
        if (!response.ok) {
            console.log(`  -> Failed: ${response.status} ${response.statusText}`);
            const text = await response.text();
            console.log(`  -> Response: ${text.substring(0, 100)}`);
            return;
        }
        const data = await response.json();
        console.log(`  -> Success! Tags: ${JSON.stringify(data.tags || [])}`);
        console.log(`  -> Gated: ${data.gated}`);
        if (data.inference) {
            console.log(`  -> Inference: ${JSON.stringify(data.inference)}`);
        }
    } catch (e) {
        console.log(`  -> Error: ${e.message}`);
    }
}

const models = [
    "ideogram-ai/ideogram-3.0",
    "recraft-ai/recraft-v3",
    "black-forest-labs/FLUX.2-pro",
    "black-forest-labs/FLUX.2-max"
];

async function run() {
    for (const m of models) {
        await getAuthenticatedInfo(m);
        console.log("-".repeat(40));
    }
}

run();
