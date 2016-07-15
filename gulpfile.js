var gulp = require("gulp");
var debug = require('gulp-debug');
var concat = require('gulp-concat');
var tsc = require("gulp-typescript");
var merge = require("merge-stream");
var sourcemaps = require('gulp-sourcemaps');
var dts = require("./tools/generatedts");

var bindir = "dist";
var tmpDir = bindir + "/tmp";

var tsProject = tsc.createProject(__dirname + "/tsconfig.json");
// , { outFile: finalJsFile });


gulp.task("build", function () {
    process.chdir(__dirname);
    var tsResult = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsc(tsProject));
    var tsOutput = tsResult.js
        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(bindir));

    var dtsOutput = tsResult.dts
        .pipe(gulp.dest(bindir))
        .pipe(concat("index.d.ts"))
        .pipe(gulp.dest(bindir));

    var copyFiles = gulp.src(["package.json"])
        .pipe(gulp.dest(bindir));

    return merge(tsOutput, dtsOutput, copyFiles)
        .pipe(debug({ title: "Output Files:" }));
    ;
});

gulp.task("default", ["build"]);

