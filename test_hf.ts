const token = Deno.env.get("HF_TOKEN");

async function testModel(modelId: string, urlStr: string) {
    const URL = urlStr.replace("{model_id}", modelId);
    console.log(`Testing ${modelId} at ${URL}...`);
    try {
        const response = await fetch(URL, {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`,
                "Content-Type": "application/json",
            },
            body: JSON.stringify({
                inputs: "A cute cat",
            }),
        });
        const status = response.status;
        let bodySnippet = "";
        try {
            const body = await response.text();
            bodySnippet = body.substring(0, 100);
        } catch(e) {}
        console.log(`  -> Status: ${status}, Body: ${bodySnippet}`);
    } catch (e: any) {
        console.log(`  -> Error: ${e.message}`);
    }
}

const models = [
    "black-forest-labs/FLUX.1-dev",
    "black-forest-labs/FLUX.1-schnell",
    "stabilityai/stable-diffusion-xl-base-1.0",
    "runwayml/stable-diffusion-v1-5",
    "ideogram-ai/ideogram-3.0",
    "recraft-ai/recraft-v4-pro",
    "black-forest-labs/FLUX.2-pro"
];

const endpoints = [
    "https://api-inference.huggingface.co/models/{model_id}",
    "https://router.huggingface.co/hf-inference/models/{model_id}"
];

async function run() {
    for (const model of models) {
        for (const ep of endpoints) {
            await testModel(model, ep);
        }
    }
}

run();
