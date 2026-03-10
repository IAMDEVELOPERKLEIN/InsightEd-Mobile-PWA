async function check() {
    console.log("Checking @langchain/classic/vectorstores/memory...");
    try {
        const mod = await import("@langchain/classic/vectorstores/memory");
        console.log("OK", Object.keys(mod));
    } catch (e) {
        console.error("FAILED", e.code, e.message);
    }
}
check();
