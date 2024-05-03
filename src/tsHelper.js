// @ts-check
const path = require('path');
const ts = require('typescript');
const fs = require('fs');

module.exports.getImportsForFile = function getImportsForFile(file, srcRoot) {
    const fileInfo = ts.preProcessFile(fs.readFileSync(file).toString());    
    return fileInfo.importedFiles
        .map(importedFile => importedFile.fileName)
        .filter(fileName => !/^src/.test(fileName)) // remove css imports        
        .map(fileName => {            
            if (/(^\.\/)|(^\.\.\/)/.test(fileName)) {
                return path.join(path.dirname(file), fileName);
            }
            if (/^vs/.test(fileName)) {
                return path.join(srcRoot, fileName);
            }
            return fileName;
        }).filter(pathPlusFile => {
            return fs.existsSync(`${pathPlusFile}.ts`) || fs.existsSync(`${pathPlusFile}.js`) || fs.existsSync(`${pathPlusFile}.d.ts`);
        }).map(fileName => {
            if (fs.existsSync(`${fileName}.ts`)) {
                return `${fileName}.ts`;
            }
            if (fs.existsSync(`${fileName}.js`)) {
                return `${fileName}.js`;
            }
            if (fs.existsSync(`${fileName}.d.ts`)) {
                return `${fileName}.d.ts`;
            }
            throw new Error(`Unresolved import ${fileName} in ${file}`);
        });
};
