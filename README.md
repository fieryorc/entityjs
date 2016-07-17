EntityJs
========

A library that provides .net style entity framework for Node.js.

Currently supports Google Cloud store.

Usage
-----

  samples can be found under samples directory.

Dev Documentation
-----------------
```
# Make sure you have git,vscode and npm installed in your machine.
git clone https://github.com/fieryorc/entityjs
cd entityjs 
npm install -g gulp typings tsc
npm install
typings install
```

### Building from command line
```
From the src directory, run 'gulp'
```

### Using VS Code (preferred method)
```
Visual Studio Code provides auto completion which makes it easy to discover and write code.
- Install visual studio code
- Open the root of the repository in VS Code (Not src.. YOU SHOULD ALWAYS OPEN THE ROOT DIRECTORY).
- Edit the code as necessary
- Press 'Ctrl + Shift + B' to build.
  * Once build starts, it will keep running. As soon as the update to a file is made it will rebuild.
  * In other words, as soon as you save a file, it will generate new build. 
```

### To add new typescript definition
Typescript definition files provide the necessary information for Typescript compiler
to validate type information. This also is the source of intellisense. All typescript
definitions are maintained and managed by the command typings.
```
typings install <name-of-tsd> --save --global
```

### To add new dev dependency (mostly not required)
Dev dependencies are node modules that are added to help in build tooling.
When you add them, you need to run the following command so it saves the dependency
in the package.json.
```
npm install <module-name> --save-dev  
```
