# NPM To Latest

Update NPM packages from the package.json file in the current folder to their latest version and save these changes.

The command `npm update` update packages respecting [semver](https://docs.npmjs.com/getting-started/semantic-versioning), this means major updates will not be performed to avoid breaking changes in your project. So to update a package that had a major update to its latest version, you would need to manually uninstall (with --save or --save-dev) and then install the package again. This script is just a shortcut to all this manual work you would need to do with the benefit of making a backup of your most recent package.json file.

Each time the script is executed a backup of the current package.json file is created with the filename having the format: `package-json-${Date.now()}`

Use with caution. Update packages to their latest version can break your project.

## Requirements

This script requires node v4 or higher.

## Install

    npm install -g npm-to-latest

Prefer to install the package globally.

## Options

```
Options:

  --deps                         Update the dependencies

  --devdeps                      Update the devDependencies

  --nobackup                     Do not make a package.json backup

  --restore [file path]          Restore the package.json and reinstall the packages.
                                 The file path is optional, and if omitted the script will try
                                 to find the most recent package.json backup file.

  --packages [packages list]     Just update the packages in the list

  --exclude [packages list]      Update all packages except the ones in the list
```
 
## Usage examples:

```
to-latest
to-latest --deps
to-latest --devdeps
to-latest --nobackup
```

## LICENSE

BSD-3
