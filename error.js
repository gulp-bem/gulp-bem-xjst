'use strict';

var path = require('path');
var util = require('util');

var format = util.format;

/**
 * @param {{description: string, column: number, lineNumber: number}} err - Error data
 * @param {String} code - Code sample
 * @param {String} filePath - Path to the file
 * @return {String|Object}
 */
module.exports = function (err, code, filePath) {
    // Assume that esprima parser failed
    if (err.description && err.column && err.lineNumber) {
        var source = code.split('\n');

        var additionalLines = 3;
        var errorLine = err.lineNumber; // extra line from length prop
        var startLine = Math.max(errorLine - additionalLines, 0);
        var endLine = Math.min(errorLine + additionalLines, source.length);

        var fragment = source.slice(startLine, endLine);
        // Adding marker
        fragment.splice(errorLine - startLine + 1, 0, new Array(err.column).join(' ') + '^');

        return format('%s at %s:\n%s',
            err.description,
            path.basename(filePath),
            fragment.join('\n'));
    }

    return err;
};
