import { load } from "https://deno.land/std@0.224.0/dotenv/mod.ts";
const env = await load({ envPath: ".env" });
const localEnv = await load({ envPath: ".env.local" });
const token = env["HF_TOKEN"] || localEnv["HF_TOKEN"] || Deno.env.get("HF_TOKEN");

if (!token) {
    console.log("No HF_TOKEN found!");
    Deno.exit(1);
}

const models = [
    "black-forest-labs/FLUX.1-dev",
    "black-forest-labs/FLUX.1-schnell",
    "black-forest-labs/FLUX.2-dev",
    "black-forest-labs/FLUX.2-klein-4B",
    "black-forest-labs/FLUX.2-klein-base-9B",
    "black-forest-labs/FLUX.2-pro",
    "recraft-ai/recraft-v3-text-to-image",
    "ideogram-ai/ideogram-3.0"
];

async function testModel(modelId: string) {
    const URL = `https://router.huggingface.co/hf-inference/models/${modelId}`;
    console.log(`[Testing] ${modelId}`);
    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: "A cute cat, high quality",
                parameters: { num_inference_steps: 4, width: 512, height: 512 }
            }),
        });

        console.log(`  -> Status: ${response.status} ${response.statusText}`);
        if (!response.ok) {
            const body = await response.text();
            console.log(`  -> Error Body: ${body.substring(0, 100)}`);
        } else {
            const buf = await response.arrayBuffer();
            console.log(`  -> SUCCESS! (Buffer received: ${buf.byteLength} bytes)`);
        }
    } catch (e: any) {
        console.log(`  -> Fetch Error: ${e.message}`);
    }
}

for (const model of models) {
    await testModel(model);
}
