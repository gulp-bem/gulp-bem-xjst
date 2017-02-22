'use strict';

var assert = require('assert');
var path = require('path');

var _eval = require('node-eval');
var bemxjst = require('bem-xjst');
var through = require('through2');
var PluginError = require('plugin-error');
var File = require('vinyl');
var isStream = require('is-stream');
var toArray = require('stream-to-array');

var formatError = require('./error');
var bundle = require('./lib/templates/bundle');

var pluginName = path.basename(__dirname);

/**
 * bem-xjst templates compiler.
 *
 * @param {Object} [options] - Options for generator.
 * @param {String} [options.extension] - File extension. Default: engine name.
 * @param {String} [options.exportName] - Name for export. Please notice if you set this option generated code will
 * @param {Object} [options.engine] - Engine compiler options. @see
 *   https://github.com/bem/bem-xjst/blob/master/docs/en/3-api.md#settings wrapped with CommonJS, YModules or Global
 * @param {String|Function} engine - 'bemhtml' either 'bemtree' or any xjst-like engine function.
 * @returns {Stream}
 */
module.exports = function(options, engine) {
    options = options || {};

    assert(typeof engine === 'string' || typeof (engine && engine.generate) === 'function', 'Invalid engine');

    var engineName;
    if (typeof engine === 'string') {
        engineName = engine;
        engine = bemxjst[engine];
    } else {
        engineName = (engine.engineName || (engine.runtime && engine.runtime.name)).toLowerCase() || 'xjst';
    }

    return through.obj(function(file, encoding, callback) {
        if (file.isNull()) {
            return callback(null, file);
        }

        if (file.isStream()) {
            return callback(new PluginError(pluginName, 'Streaming not supported'));
        }

        var code = file.contents.toString();
        var res = tryCatch(function() {
            var compiledCode = engine.generate(code, options);

            return options.exportName ? bundle(compiledCode, options) : compiledCode;
        }, function(e) {
            return new PluginError(pluginName, formatError(e, code, file.path), {
                fileName: file.path
            });
        });

        if (res instanceof PluginError) {
            return callback(res);
        }

        file.contents = new Buffer(res);
        file.path = path.basename(file.path).split('.')[0] +
            '.' + (options.extension || (engineName + '.js')).replace(/^\./, '');

        callback(null, file);
    });
};

module.exports.bemhtml = function(options) {
    return module.exports(options, 'bemhtml');
};

module.exports.bemtree = function(options) {
    return module.exports(options, 'bemtree');
};

/**
 * Wrapper for anything.apply with bemjson.
 *
 * @param {Stream<File>} templatesStream - Stream with bemhtmls
 * @returns {stream.Transform<File>} - transform stream that applies templates to each incoming bemjson vinyl
 */
module.exports.toHtml = function(templatesStream) {
    if (!isStream(templatesStream)) {
        throw new PluginError(pluginName, 'Parameter should be a Stream');
    }

    var templatesPromise = toArray(templatesStream);

    return through.obj(function(bemjsonFile, _, callback) {
        if (bemjsonFile.isNull()) {
            return callback(null, bemjsonFile);
        }
        if (bemjsonFile.isStream()) {
            return callback(new PluginError(pluginName, 'Streaming not supported'));
        }

        tryCatch(function() {
            return bemjsonFile.data || (bemjsonFile.data = _eval(String(bemjsonFile.contents), bemjsonFile.path));
        }, function(err) {
            callback(new PluginError(pluginName, 'Error at evaluating bemjson: ' + err));
        });

        if (!bemjsonFile.data) {
            callback();
            return;
        }

        var _this = this;

        templatesPromise
            .then(function(templatesVinyls) {
                // Handle multiple templates case
                var n = 0;

                templatesVinyls.forEach(function(file) {
                    file.data || (file.data = _eval(String(file.contents)));

                    var html = tryCatch(function() {
                        return file.data.apply(bemjsonFile.data);
                    }, function(err) {
                        throw new Error('BEMHTML error: ' + err);
                    });

                    if (typeof html !== 'string') {
                        throw new Error('Incorrect html result.');
                    }

                    var name = path.basename(bemjsonFile.path).split('.')[0];
                    var newFile = new File({
                        path: name + (n-- || '') + '.html',
                        contents: new Buffer(html)
                    });

                    _this.push(newFile);
                });

                callback();
            })
            .catch(function(err) {
                callback(new PluginError(pluginName, err));
            });
    });
};

/**
 * Try to run function and call handler if it throws.
 *
 * @param {Function} fn - Unsafe function body
 * @param {Function} cb - Error handler
 * @returns {*}
 */
function tryCatch(fn, cb) {
    try {
        return fn();
    } catch (e) {
        return cb(e);
    }
}
