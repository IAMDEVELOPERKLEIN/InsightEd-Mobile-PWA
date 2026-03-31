# Skill: Antigravity Execution Debugger

**Author:** Antigravity Skills Community  
**Version:** 1.1.0  
**Tags:** `debugging`, `optimization`, `console`, `error-handling`, `diagnostics`  

## 📖 Description
The `Antigravity Execution Debugger` is a lightweight, optimized wrapper script designed to monitor your custom antigravity functions. It utilizes `console.group` for clean output formatting, logs execution time to ensure your physics calculations remain performant, and catches thrown exceptions to provide actionable troubleshooting recommendations.

**New in v1.1.0:** Upon failure, the debugger now generates a custom, copy-pasteable diagnostic script directly in your console. Running this generated script will visually highlight DOM elements causing physics conflicts.

## 🛠️ Implementation

Copy and paste the following script into your core utilities or directly wrap your skill functions with it.

```javascript
/**
 * Wraps an antigravity skill function with an optimized debugging layer
 * and auto-generates diagnostic scripts on failure.
 * * @param {string} skillName - The human-readable name of the skill being executed.
 * @param {Function} skillFunction - The core function/callback to execute and monitor.
 * @returns {Function} A wrapped async function ready for execution.
 */
function withAntigravityDebugger(skillName, skillFunction) {
    return async function(...args) {
        // Initialize console grouping for clean, readable logs
        console.group(\`🚀 Executing Antigravity Skill: [\${skillName}]\`);
        const startTime = performance.now();

        try {
            // Attempt to execute the core skill logic
            const result = await skillFunction(...args);
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);

            // Log Success Metrics
            console.log(\`✅ SUCCESS: Skill executed flawlessly in \${executionTime}ms.\`);
            if (result !== undefined) {
                console.log('📦 Return Payload:', result);
            }
            
            console.groupEnd();
            return result;

        } catch (error) {
            const endTime = performance.now();
            const executionTime = (endTime - startTime).toFixed(2);

            // Log Failure Metrics
            console.error(\`❌ FAILURE: Skill crashed after \${executionTime}ms.\`);
            console.error(\`🛑 Error Message: \${error.message}\`);
            
            // Expandable stack trace for deep diving
            console.groupCollapsed('🪲 View Full Stack Trace');
            console.error(error.stack);
            console.groupEnd();

            // Intelligent Recommendations Engine
            console.group('🛠️ Recommended Troubleshooting Steps:');
            
            if (error instanceof TypeError) {
                console.warn('1. Check DOM Element References: You might be trying to levitate an element that is null or hasn\\'t rendered yet.');
                console.warn('2. Validate Physics Engine Context: Ensure your \`window.gravity\` or engine instance is fully initialized before firing this skill.');
            } else if (error instanceof ReferenceError) {
                console.warn('1. Missing Dependencies: Verify that all variables and external physics libraries (e.g., Matter.js, Box2D) are properly imported.');
            } else if (error instanceof RangeError) {
                console.warn('1. Infinite Loop/Recursion: Your gravity vector calculations might be trapped in a feedback loop. Check your recursive functions.');
            } else {
                console.warn('1. Review the stack trace to pinpoint the exact line of failure.');
                console.warn('2. Verify that the DOM elements targeted by this skill don\\'t have conflicting \`position: static\` CSS properties preventing movement.');
            }
            
            console.warn('3. Fallback: Try resetting the global gravity vector (e.g., \`engine.world.gravity.y = 1\`) to stabilize the environment before re-running.');
            console.groupEnd(); 

            // --- Auto-Generated Diagnostic Script Formatter ---
            console.groupCollapsed('%c📝 Auto-Generated Diagnostic Script (Click to Expand)', 'background: #222; color: #bada55; padding: 4px; border-radius: 4px; font-weight: bold;');
            console.log('%cCopy and run the script below in this console to visually identify conflicting elements in your DOM:', 'color: #4CAF50; font-style: italic;');
            
            // The diagnostic string that gets printed to the console
            const diagnosticScript = \`
// --- Antigravity Diagnostic Mode ---
(function diagnoseEnvironment() {
    console.log("🔍 Scanning DOM for gravity-resistant elements...");
    let issuesFound = 0;
    const targets = document.querySelectorAll('*'); 
    
    targets.forEach(el => {
        const style = window.getComputedStyle(el);
        // Check for common CSS blockers to matrix transforms / gravity physics
        if(style.position === 'static' && style.transform !== 'none') {
            console.warn('⚠️ Physics Conflict: Static positioning prevents movement on', el);
            el.style.border = '3px dashed red';
            el.style.boxShadow = '0 0 10px red';
            
            // Injecting a tooltip directly into the DOM for quick reference
            el.setAttribute('title', 'Change CSS position to relative, absolute, or fixed');
            issuesFound++;
        }
    });
    
    if(issuesFound === 0) {
        console.log("✅ No CSS structural conflicts found. Check your physics engine coordinates instead.");
    } else {
        console.log(\\\`🛑 Found \\\${issuesFound} conflicting elements. They have been highlighted in RED on your screen.\\\`);
    }
})();
// -----------------------------------
            \`;
            
            console.log(\`%c\${diagnosticScript}\`, 'color: #5ce6cd; font-family: monospace; font-size: 1.1em;');
            console.groupEnd(); // Close Diagnostic Script group
            console.groupEnd(); // Close Main Skill group

            // Re-throw the error so upstream try/catch blocks (if any) can still handle it
            throw error; 
        }
    };
}