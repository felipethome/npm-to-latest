#! /usr/bin/env node

/**
 * Felipe Thomé, August 2016
 *
 * This script requires node v4 or higher.
 *
 * Update NPM packages from the package.json file in the current folder to their
 * latest version and save these changes. Each time the script is executed a
 * backup of the current package.json file is created with the filename having
 * the format: package-json-${Date.now()}
 *
 * Use with caution! Update packages to their latest version can break your
 * project.
 *
 * Options:
 * --deps                         Update the dependencies
 * --devdeps                      Update the devDependencies
 * --nobackup                     Do not make a package.json backup
 * --restore [file path]          Restore the package.json and reinstall the
 *                                packages. The file path is optional, and if
 *                                omitted the script will try to find the most
 *                                recent package.json backup file.
 * --packages [packages list]     Just update the packages in the list
 * --exclude [packages list]      Update all packages except the ones in the list
 *
 * Usage examples:
 * node npm-update
 * node npm-update --deps
 * node npm-update --devdeps
 * node npm-update --nobackup
 */

var fs = require('fs');
var path = require('path');
var childProcess = require('child_process');

var packageJSONPath = path.resolve(process.cwd(), 'package.json');

fs.readFile(packageJSONPath, (err, data) => {
  if (err) throw err;

  var packageJSON = JSON.parse(data);

  var args = {};
  if (process.argv.length > 2) {
    args = parseArguments(process.argv.slice(2, process.argv.length));
  }

  if (args.help) {
    printHelp();
  }
  else if (args.restore) {
    restore(args.restore);
  }
  else {
    if (!args.nobackup) {
      fs.writeFile(`package-backup-${Date.now()}.json`, data, (err) => {
        if (err) throw err;
        performUpdate(packageJSON, args);
      });
    }
    else {
      performUpdate(packageJSON, args);
    }
  }
});

function parseArguments(args) {
  var result = {};
  var index = 0;
  var key = null;
  var list = [];

  while (index < args.length) {
    if (args[index].includes('--')) {
      if (key) {
        result[key] = list.length ? list : true;
        key = null;
      }
      key = args[index].replace('--', '');
      list = [];
    }
    else {
      list.push(args[index]);
    }

    index++;
  }

  if (key) {
    result[key] = list.length ? list : true;
    key = null;
  }

  return result;
}

function filterDependencies(dependencies, props, exclude) {
  var filteredDependencies;

  if (!exclude) {
    filteredDependencies = pick(dependencies, props);
  }
  else {
    filteredDependencies = unpick(dependencies, props);
  }

  return filteredDependencies;
}

function printHelp() {
  console.log('--deps                        update dependencies');
  console.log('--devdeps                     update devDependencies');
  console.log('--nobackup                    do not make a package.json backup');
  console.log('--restore <file path>         restore the package.json and reinstall the packages');
  console.log('--packages <packages list>    just update the packages in the list');
  console.log('--exclude <packages list>     update all packages except the ones in the list');
}

function restore(restoreOptions) {
  var previousPackageJSONPath;

  if (Array.isArray(restoreOptions)) {
    previousPackageJSONPath = restoreOptions[0];
  }
  else {
    previousPackageJSONPath = getLastBackupPath();
  }

  fs.readFile(previousPackageJSONPath, (err, data) => {
    if (err) throw err;

    fs.writeFile('package.json', data, (err) => {
      if (err) throw err;

      exec('rm -rf node_modules')
      .then(() => exec('npm install'))
      .catch((err) => console.error('\x1b[31m', err, '\x1b[0m'));
    });
  });
}

function performUpdate(packageJSON, args) {
  var deps = packageJSON.dependencies;
  var devDeps = packageJSON.devDependencies;

  if (args.packages && Array.isArray(args.packages)) {
    deps = filterDependencies(deps, args.packages);
    devDeps = filterDependencies(devDeps, args.packages);
  }

  if (args.exclude && Array.isArray(args.exclude)) {
    deps = filterDependencies(deps, args.exclude, true);
    devDeps = filterDependencies(devDeps, args.exclude, true);
  }

  if (args.deps) {
    update(deps, '--save');
  }

  if (args.devdeps) {
    update(devDeps, '--save-dev');
  }

  if (!args.deps && !args.devdeps) {
    console.error('You must specify --deps or --devdeps or both');
  }
}

function update(dependencies, flags) {
  dependencies = dependencies || {};
  flags = flags || '';

  var packageList = Object.keys(dependencies).join(' ');

  if (packageList) {
    exec(`npm uninstall ${flags} ${packageList}`)
    .then(() => {
      return exec(`npm install ${flags} ${packageList}`);
    })
    .catch((err) => console.error('\x1b[31m', err, '\x1b[0m'));
  }
}

function getLastBackupPath() {
  var files = fs.readdirSync(process.cwd());

  var fileRE = /package-backup-.+\.json/;
  var timeStampRE = /package-backup-(.+)\.json/;

  var packageJSONFiles = files.filter((file) => fileRE.exec(file));

  var timeStamps = packageJSONFiles.map((file) => {
    var matchArray = timeStampRE.exec(file);
    if (matchArray && !Number.isNaN(Number(matchArray[1]))) {
      return Number(matchArray[1]);
    }
    else {
      throw new Error('Error reading the timestamp of the backup files');
    }
  });

  var biggestTimeStampIndex = indexOfMax(timeStamps);

  return path.resolve(process.cwd(), packageJSONFiles[biggestTimeStampIndex]);
}

function indexOfMax(arr) {
  if (arr.length === 0) {
    return -1;
  }

  var max = arr[0];
  var maxIndex = 0;

  for (var i = 1; i < arr.length; i++) {
    if (arr[i] > max) {
      maxIndex = i;
      max = arr[i];
    }
  }

  return maxIndex;
}

function unpick(object, props) {
  var result = Object.assign({}, object);

  props.forEach((key) => {
    if (object.hasOwnProperty(key)) {
      delete result[key];
    }
  });

  return result;
}

function pick(object, props) {
  var result = {};

  props.forEach((key) => {
    if (object.hasOwnProperty(key)) {
      result[key] = object[key];
    }
  });

  return result;
}

function exec(command) {
  console.log('\x1b[36m', 'Command:', command, '\x1b[0m');

  return new Promise((resolve, reject) => {
    childProcess.exec(command, (err, stdout, stderr) => {
      if (err) {
        reject(err);
      }
      else {
        console.log(stdout);
        console.error(stderr);
        resolve();
      }
    });
  });
}