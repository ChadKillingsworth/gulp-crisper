'use strict';
var path = require('path');
var gutil = require('gulp-util');
var through = require('through2');
var crisper = require('crisper');
var oassign = require('object-assign');
var applySourceMap = require('vinyl-sourcemaps-apply');

var sourceMapCommentExpr = /\n\/\/# sourceMappingURL\=data:application\/json;charset=utf8;base64,([a-zA-Z0-9\+\/=]+)\n$/;
function splitFile(file, filename, contents) {
  var sourceMapContentParts = sourceMapCommentExpr.exec(contents);
  var vinylFile = new gutil.File({
    cwd: file.cwd,
    base: file.base,
    path: path.join(path.dirname(file.path), filename)
  });

  if (sourceMapContentParts !== null) {
    vinylFile.contents = new Buffer(contents.replace(sourceMapCommentExpr, '').replace(/\s+$/, '').trim());
    var sourceMapContent = JSON.parse(Buffer.from(sourceMapContentParts[1], 'base64').toString());
    sourceMapContent.file = vinylFile.relative;
    vinylFile.sourceMap = sourceMapContent;
    applySourceMap(vinylFile, sourceMapContent);
  } else {
    vinylFile.contents = new Buffer(contents);
  }

  return vinylFile;
}

function getFilename(filepath) {
  var basename = path.basename(filepath, path.extname(filepath));
  return {
    html: basename + '.html',
    js: basename + '.js'
  };
}

module.exports = function (opts) {
  return through.obj(function (file, enc, cb) {
    if (file.isNull()) {
      cb(null, file);
      return;
    }

    if (file.isStream()) {
      cb(new gutil.PluginError('gulp-crisper', 'Streaming not supported'));
      return;
    }

    var splitfile = getFilename(file.path);
    var split = crisper(oassign({}, opts, {
      source: file.contents.toString(),
      jsFileName: splitfile.js,
      sourcePath: file.relative
    }));
    var stream = this;

    Object.keys(split).forEach(function(type) {
      if (split[type]) {
        stream.push(splitFile(file, splitfile[type], split[type]));
      }
    });

    cb();
  });
};
