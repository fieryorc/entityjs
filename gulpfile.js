var gulp = require("gulp");
var debug = require('gulp-debug');
var concat = require('gulp-concat');
var tsc = require("gulp-typescript");
var merge = require("merge-stream");
var sourcemaps = require('gulp-sourcemaps');
var dts = require("./tools/generatedts");

var bindir = "bin";
var distdir = bindir + "/dist";
var tmpDir = bindir + "/tmp";

var tsProject = tsc.createProject(__dirname + "/tsconfig.json");
// , { outFile: finalJsFile });


gulp.task("build", function () {
    process.chdir(__dirname);
    var tsResult = tsProject.src()
        .pipe(sourcemaps.init())
        .pipe(tsc(tsProject));
    var tsOutput = tsResult.js
//        .pipe(sourcemaps.write("."))
        .pipe(gulp.dest(distdir));

    var dtsOutput = tsResult.dts
        .pipe(concat("index.tmp.d.ts"))
        .pipe(gulp.dest(bindir));

    var copyFiles = gulp.src(["package.json", "README.md", "tools/gen/index.d.ts"])
        .pipe(gulp.dest(distdir));

    return merge(tsOutput, dtsOutput, copyFiles)
//        .pipe(debug({ title: "Output Files:" }))
    ;
});

gulp.task("default", ["build"]);

gulp.task("watch", ["build"], function() {
    process.chdir(__dirname);
    gulp.watch(["**/*.ts"], ["build"]);
});
