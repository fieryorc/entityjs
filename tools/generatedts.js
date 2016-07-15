var through = require('through2');
var dtsBuilder = require('dts-builder');
var PluginError = require('gulp-util').PluginError;
var PLUGIN_NAME = 'gulp-dts';
var fs = require('fs');

// file is a vinyl file object
module.exports = function (destFile, moduleName) {
    if (!destFile) {
        throw new PluginError('gulp-dts', 'Missing destFile option');
    }
    if (!moduleName) {
        throw new PluginError('gulp-dts', 'Missing moduleName option');
    }

    return through.obj(function (file, encoding, callback) {
        // Hack..
        var fileName = sourceDir + "/" + moduleName + ".tmp.d.ts";
        
        callback(null, file);
    });
}