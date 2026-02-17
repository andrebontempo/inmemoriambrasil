/**
 * Escapes special characters for use in a MongoDB regex query.
 * @param {string} string - The string to escape.
 * @returns {string} - The escaped string.
 */
function escapeRegex(string) {
    return string.replace(/[-[\]{}()*+?.,\\^$|#\s]/g, "\\$&");
}

module.exports = {
    escapeRegex
};
