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

const guessedModels = [
    "black-forest-labs/FLUX.2-max",
    "black-forest-labs/FLUX.2-pro",
    "ideogram-ai/ideogram-3.0",
    "fal-ai/ideogram-3.0",
    "togethercomputer/ideogram-3.0",
    "recraft-ai/recraft-v3",
    "fal-ai/recraft-v3",
    "recraft-ai/recraft-v4",
    "fal-ai/recraft-v4"
];

const providers = ["hf-inference", "fal-ai", "together", "replicate"];

async function testGuess(modelId, provider) {
    const URL = `https://router.huggingface.co/${provider}/models/${modelId}`;
    console.log(`[Guess] ${modelId} @ ${provider}`);
    try {
        const response = await fetch(URL, {
            method: "POST", headers: { "Authorization": `Bearer ${token}`, "Content-Type": "application/json" },
            body: JSON.stringify({ inputs: "Test" })
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
    for (const m of guessedModels) {
        for (const p of providers) {
            await testGuess(m, p);
        }
    }
}

run();
