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

async function testSuffix(modelBase, suffix, path) {
    const modelId = `${modelBase}:${suffix}`;
    // Standard inference path: /hf-inference/models/{modelId}
    // Router V1 path: /v1/models/{modelId}/text-to-image
    const URL = path.replace("{modelId}", modelId);

    console.log(`[Suffix Test] URL: ${URL}`);
    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json"
            },
            body: JSON.stringify({ inputs: "A cyberpunk city" }),
        });

        console.log(`  -> Status: ${response.status} ${response.statusText}`);
        if (response.ok) {
            console.log(`  -> SUCCESS!`);
        } else {
            const err = await response.text();
            console.log(`  -> Error: ${err.substring(0, 100)}`);
        }
    } catch (e) { console.log(`  -> Error: ${e.message}`); }
    console.log("---");
}

async function run() {
    const model = "black-forest-labs/FLUX.2-dev";
    const suffixes = ["fal-ai", "replicate", "together", "wavespeed", "fastest"];
    const paths = [
        "https://router.huggingface.co/hf-inference/models/{modelId}",
        "https://router.huggingface.co/v1/models/{modelId}/text-to-image"
    ];

    for (const p of paths) {
        for (const s of suffixes) {
            await testSuffix(model, s, p);
        }
    }
}

run();
