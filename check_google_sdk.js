async function check() {
    console.log("Checking @google/generative-ai...");
    try {
        const mod = await import("@google/generative-ai");
        console.log("OK", Object.keys(mod));
    } catch (e) {
        console.error("FAILED", e.code, e.message);
    }
}
check();
