describe('gulp-bemhtml', function () {
    'use strict';

    var lib = require('..');
    var expect = require('expect.js');
    var bemxjst = require('bem-xjst');
    var File = require('vinyl');
    var _eval = require('node-eval');
    var intoStream = require('into-stream');

    describe('stream', function () {
        var stream;
        var vinylFile;

        before(function (next) {
            stream = lib.bemhtml()
                .on('data', function (file) {
                    vinylFile = file;
                })
                .on('error', next)
                .on('end', next);

            intoStream.obj([new File({
                path: 'page.bemhtml',
                contents: new Buffer('block(\'page\')(tag()(\'h1\'), content()(\'Hello, world!\'));')
            })])
                .pipe(stream);
        });

        it('changes file extension to *.bemhtml.js', function () {
            expect(vinylFile.relative).to.be.equal('page.bemhtml.js');
        });

        it('outputs bemhtml templates compiler', function () {
            var bemhtml = _eval(vinylFile.contents.toString());
            expect(bemhtml.apply({block: 'page'})).to.be.equal('<h1 class="page">Hello, world!</h1>');
        });
    });

    describe('stream with custom engine', function () {
        var vinylFile;

        before(function (next) {
            var stream = lib({}, bemxjst.bemhtml)
                .on('data', function (file) {
                    vinylFile = file;
                })
                .on('error', next)
                .on('end', next);

            intoStream.obj([new File({
                path: 'page.bemhtml',
                contents: new Buffer('block(\'page\')(tag()(\'h1\'), content()(\'Hello, world!\'));')
            })])
                .pipe(stream);
        });

        it('changes file extension to *.bemhtml.js', function () {
            expect(vinylFile.relative).to.be.equal('page.bemhtml.js');
        });
    });

    describe('stream with exportName', function() {
        var vinylFile;

        before(function(next) {
            var stream = lib.bemhtml({ exportName: 'BEMHTML' })
                .on('data', function (file) {
                    vinylFile = file;
                })
                .on('error', next)
                .on('end', next);

            intoStream.obj([new File({
                path: 'page.bemhtml',
                contents: new Buffer('block(\'page\')(tag()(\'h1\'), content()(\'Hello, world!\'));')
            })])
                .pipe(stream);
        });

        it('should export compiler to global', function() {
            var engine = _eval(vinylFile.contents.toString());

            expect(engine).to.have.property('BEMHTML');
            expect(engine.BEMHTML.apply).to.be.a('function');
        });

        it('should export compiler to custom name', function(next) {
            var testFile = '';
            var stream = lib.bemhtml({ exportName: 'customProperty' })
                .on('data', function (file) {
                    testFile = file;
                })
                .on('error', compileDone)
                .on('end', compileDone);

            intoStream.obj([new File({
                path: 'page.bemhtml',
                contents: new Buffer('block(\'page\')(tag()(\'h1\'), content()(\'Hello, world!\'));')
            })])
                .pipe(stream);

            function compileDone() {
                var engine = _eval(testFile.contents.toString());

                expect(engine).to.have.property('customProperty');
                next();
            }
        });

        it('should export compiler to YModules', function() {
            var vm = require('vm');
            var name = '';

            vm.runInNewContext(vinylFile.contents.toString(), {
                require: require,
                console: console,
                modules: { define: function(exportName) { name = exportName; } }
            });

            expect(name).to.be('BEMHTML');
        });
    });
});
