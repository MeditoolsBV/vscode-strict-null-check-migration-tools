
// @ts-check
const path = require('path');
const fs = require('fs');
const child_process = require('child_process');
const config = require('./src/config');
const { forStrictNullCheckEligibleFiles } = require('./src/getStrictNullCheckEligibleFiles');

const vscodeRoot = path.join(process.cwd(), process.argv[2]);
const srcRoot = path.join(vscodeRoot);

const buildCompletePattern = /Found (\d+) errors?\. Watching for file changes\./gi;

forStrictNullCheckEligibleFiles(vscodeRoot, () => { }).then(async (files) => {
    const tsconfigPath = path.join(vscodeRoot, config.targetTsconfig);
    console.log('spawning child process...')
    const child = child_process.spawn('yarn', [ '--cwd', vscodeRoot, 'run', 'tsc','-p', tsconfigPath, '--watch']);
    console.log('spawned child process...')
    const errorListener = (error) => {
        console.log(error)
        return false
    }
    child.on('error', errorListener);
    for (const file of files) {
        await tryAutoAddStrictNulls(child, tsconfigPath, file);
    }
    console.log('killing child process...')
    child.kill();
});

function tryAutoAddStrictNulls(child, tsconfigPath, file) {
    return new Promise(resolve => {
        const relativeFilePath = path.relative(srcRoot, file);
        console.log(`Trying to auto add '${relativeFilePath}'`);

        const originalConfig = JSON.parse(fs.readFileSync(tsconfigPath).toString());
        originalConfig.files = Array.from(new Set(originalConfig.files.sort()));

        // Config on accept
        const newConfig = Object.assign({}, originalConfig);
        newConfig.files = Array.from(new Set(originalConfig.files.concat('./' + relativeFilePath).sort()));

        fs.writeFileSync(tsconfigPath, JSON.stringify(newConfig, null, '\t'));

        const listener = (data) => {
            const textOut = data.toString();
            const match = buildCompletePattern.exec(textOut);
            if (match) {
                const errorCount = +match[1];
                if (errorCount === 0) {
                    console.log(`👍`);
                    fs.writeFileSync(tsconfigPath, JSON.stringify(newConfig, null, '\t'));
                }
                else {
                    console.log(`💥 - ${errorCount}`);
                    fs.writeFileSync(tsconfigPath, JSON.stringify(originalConfig, null, '\t'));
                }
                resolve();
                child.stdout.removeListener('data', listener);
            }
        };

        child.stdout.on('data', listener);
    });
}