var fs = require('fs');
var path = require('path');

var _ = require('lodash');

var assetDir = path.join(__dirname, '..', 'assets');
var templates = {
    bundle: {path: path.join(assetDir, 'bundle.jst')}
};

// load templates
_.mapKeys(templates, function (template, name) {
    templates[name] = _.template(fs.readFileSync(template.path, 'utf-8'));
});

/**
 * Template for compile BEMHTML or BEMTREE to bundle.
 *
 * @param {String} code - Code compiled with the `bem-xjst` (BEMHTML or BEMTREE).
 * @param {Object} options - Options.
 * @param {String} [options.exportName=BEMHTML] - Name for exports.
 * @returns {String}
 */
module.exports = function (code, options) {
    options || (options = {});

    return templates.bundle({
        exportName: options.exportName || 'BEMHTML',
        bemxjst: code
    });
};
