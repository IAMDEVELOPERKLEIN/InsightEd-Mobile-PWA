async function check() {
    console.log("Checking langchain/vectorstores/memory...");
    try {
        await import("langchain/vectorstores/memory");
        console.log("OK");
    } catch (e) { console.error("FAILED", e.code); }

    console.log("Checking @langchain/google-genai...");
    try {
        await import("@langchain/google-genai");
        console.log("OK");
    } catch (e) { console.error("FAILED", e.code); }

    console.log("Checking @langchain/core/prompts...");
    try {
        await import("@langchain/core/prompts");
        console.log("OK");
    } catch (e) { console.error("FAILED", e.code); }

    console.log("Checking @langchain/core/output_parsers...");
    try {
        await import("@langchain/core/output_parsers");
        console.log("OK");
    } catch (e) { console.error("FAILED", e.code); }

    console.log("Checking @langchain/core/runnables...");
    try {
        await import("@langchain/core/runnables");
        console.log("OK");
    } catch (e) { console.error("FAILED", e.code); }
}
check();
