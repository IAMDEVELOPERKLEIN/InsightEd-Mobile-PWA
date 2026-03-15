/**
 * Safely parses a JSON string.
 * @param {string|null} str The string to parse.
 * @param {any} defaultValue The value to return if parsing fails.
 * @returns {any} The parsed object or the defaultValue.
 */
export const safeJsonParse = (str, defaultValue = null) => {
    if (!str || str === 'undefined' || str === 'null') {
        return defaultValue;
    }
    try {
        return JSON.parse(str);
    } catch (e) {
        console.error("JSON Parse Error:", e, "Input:", str);
        return defaultValue;
    }
};

/**
 * Safely stringifies an object.
 * @param {any} val The value to stringify.
 * @returns {string} The JSON string or "null" if serialization fails.
 */
export const safeJsonStringify = (val) => {
    if (val === undefined) return "null";
    try {
        return JSON.stringify(val);
    } catch (e) {
        console.error("JSON Stringify Error:", e, "Input:", val);
        return "null";
    }
};
