const resolver = require('..');
const assert = require('assert');

describe('resolver-alias/index.js', () => {
  const sourceFile = module.filename;
  const alias = [
    ['polyfill', 'polyfill2/polyfill.min.js'],
    ['module3/heihei', 'module2/smile'],
    ['module3', 'module2']
  ];
  const normalModulePathArr = [
    'module1/abc',
    '../package.json',
    './test',
    'mocha',
    'fs'
  ];
  const aliasModulePathArr = [
    'module3/heihei',
    'module3/styles/red',
    'polyfill'
  ];

  const noneExistModulePathArr = [
    'abc/ggg',
    'module2/bye',
    'module33',
    './test.json'
  ];

  it('resolve normal node modules', () => {
    normalModulePathArr.forEach((p) => {
      const resolveModule = resolver.resolve(p, sourceFile, alias);
      assert(resolveModule.found, `normal modulePath ${p} isn't resolved`);
    });
  });

  it('resolve alias modules', () => {
    aliasModulePathArr.forEach((p) => {
      const resolveModule = resolver.resolve(p, sourceFile, alias);
      assert(resolveModule.found, `alias modulePath ${p} isn't resolved`);
    });
  });

  it('unresolve the modules that do not exist', () => {
    noneExistModulePathArr.forEach((p) => {
      const resolveModule = resolver.resolve(p, sourceFile, alias);
      assert(!resolveModule.found, `none exist modulePath ${p} is resolved`);
    });
  });

  it('change current working directory into sub directory of project and resolve exists modules', () => {

    process.chdir('test');
    delete require.cache[require.resolve('..')];
    const newResolver = require('..');

    normalModulePathArr.forEach((p) => {
      const resolveModule = newResolver.resolve(p, sourceFile, alias);
      assert(resolveModule.found, `normal modulePath ${p} isn't resolved`);
    });
  });

});
