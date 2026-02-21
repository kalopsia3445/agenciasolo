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

async function testV1Provider(modelId, provider) {
    // The user's snippet implies a specific structure for Inference Providers.
    // Let's test the most likely REST equivalent for specific providers.
    const URL = `https://router.huggingface.co/${provider}/v1/models/${modelId}/text-to-image`;

    console.log(`[V1 Provider Guess] ${modelId} @ ${provider}`);

    const headers = {
        "Authorization": `Bearer ${token}`,
        "Content-Type": "application/json"
    };

    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: headers,
            body: JSON.stringify({ inputs: "A beautiful cat" }),
        });

        console.log(`  -> Status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
            const err = await response.text();
            console.log(`  -> Error: ${err.substring(0, 100)}`);
        } else {
            console.log(`  -> SUCCESS!`);
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
            await testV1Provider(model, provider);
        }
    }
}

run();
