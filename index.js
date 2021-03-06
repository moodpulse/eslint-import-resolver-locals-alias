'use strict';
/**
 * this resolver is used as a plugin of eslint-plugin-import
 * to solve Node.js package mapping problem
 *
 */
const path = require('path');
const coreModules = Object.create(null);

require('./core').forEach(function (m) {
  this[m] = true
}, coreModules);

exports.interfaceVersion = 2;

const Module = module.constructor;
// Node.js native extensions
const originExtensions = Module._extensions;

function mockModuleLoader () {}

exports.resolve = (modulePath, sourceFile, config) => {
  if (coreModules[modulePath]) {
    return { found: true, path: null };
  }

  // compatible with the old array type configuration
  if (Array.isArray(config)) {
    config = {
      map: config,
      debug: false
    }
  } else if (typeof config !== 'object') {
    config = {};
  }

  // in order to be compatible with Node.js v4,
  // give up destructure syntax
  const {map, extensions, debug} = config;
  const sourceDir = path.dirname(sourceFile);
  let resolvePath = modulePath;

  // if modulePath starts with '.' (e.g. '.', '..', './a', '../a', '.ab.js')
  // it is a relative path because the path like '.ab.js' is not a valid node package name
  // see https://github.com/npm/validate-npm-package-name/blob/master/index.js
  if (modulePath[0] === '.') {
    // make resolvePath an absolute path
    resolvePath = path.resolve(sourceDir, modulePath);

    // actually, it doesn't matter what the second parameter is
    // when resolvePath is an absolute path, see detail in
    // Module._findPath source code
    return findModulePath(resolvePath, null, extensions);
  }

  debug && console.log('resolve:', resolvePath, map, sourceDir);

  if (Array.isArray(map)) {
    for (let i = 0; i < map.length; i++) {
      const re = new RegExp(`(^|\/)${map[i][0]}($|\/)`);
      const match = modulePath.match(re);
      if (match) {
        resolvePath = modulePath.replace(match[0], `${match[1]}${map[i][1]}${match[2]}`);
        break;
      }
    }
  }

  const paths = resolveLookupPaths(sourceDir);
  return findModulePath(resolvePath, paths, extensions, debug);
};

function getExtensions(extArray) {
  if (Array.isArray(extArray) && extArray.length > 0) {
    return extArray.reduce((a, b) => {
      a[b] = originExtensions[b] || mockModuleLoader
      return a;
    }, {});
  }

  return null;
}

function findModulePath(request, paths, extArray, debug = false) {
  if (extArray) {
    // little trick to make Node.js native `Module._findPath` method
    // to find the file with custom file extensions
    Module._extensions = getExtensions(extArray) || originExtensions;
  }

  // `Module._findPath` use `Module._extensions` to find a module
  const filename = Module._findPath(request, paths);

  debug && console.log('findModulePath request:', request, paths);

  if (extArray) {
    Module._extensions = originExtensions;
  }

  const d = {
    found: !!filename,
    path: filename || null
  };

  debug && console.log('findModulePath return:', d);

  return d;
}

function resolveLookupPaths(absoluteSourceDir) {
  let paths;

  // use Node.js native node_modules lookup paths resolution
  if (Module._nodeModulePaths) {
    paths = Module._nodeModulePaths(absoluteSourceDir);
  } else {
    const moduleDir = 'node_modules';
    let curDir;
    let nextDir = absoluteSourceDir;

    paths = [];

    do {
      // not append node_modules to a path already ending with node_modules
      while (nextDir.slice(-12) === moduleDir) {
        nextDir = path.resolve(nextDir, '..');
      }
      curDir = nextDir;
      paths.push(path.resolve(curDir, moduleDir));
      nextDir = path.resolve(curDir, '..');
    } while(nextDir !== curDir);
  }

  return paths.concat([path.resolve(__dirname, '..', '..'), path.resolve(__dirname, '..'), __dirname], Module.globalPaths);
}
