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

async function testFastest(modelBase) {
    const targets = [":fastest", ":cheapest", ""];
    for (const target of targets) {
        const modelId = modelBase + target;
        const URL = `https://router.huggingface.co/hf-inference/models/${modelId}`;
        console.log(`[Fastest Test] ${modelId}`);

        const headers = {
            "Authorization": `Bearer ${token}`,
            "Content-Type": "application/json",
            "X-Inference-Provider": "auto"
        };

        try {
            const response = await fetch(URL, {
                method: "POST",
                headers: headers,
                body: JSON.stringify({ inputs: "A golden statue" }),
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
}

async function run() {
    await testFastest("black-forest-labs/FLUX.2-dev");
}

run();
