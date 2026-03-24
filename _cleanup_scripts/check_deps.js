async function check() {
    console.log("Checking pdf-parse...");
    await import("pdf-parse"); // Note: pdf-parse is CJS, might need default import if using ESM
    console.log("OK");

    console.log("Checking @langchain/textsplitters...");
    await import("@langchain/textsplitters");
    console.log("OK");

    console.log("Checking langchain/vectorstores/memory...");
    await import("langchain/vectorstores/memory");
    console.log("OK");

    console.log("Checking @langchain/google-genai...");
    await import("@langchain/google-genai");
    console.log("OK");

    console.log("Checking @langchain/core/prompts...");
    await import("@langchain/core/prompts");
    console.log("OK");
}
check();
