import { statSync, readdirSync } from 'fs'
import { styles, scripts } from './home'

export function init(fn: () => void) {
    walkSync('./', 'third', /\.js$/g, scripts)
    walkSync('./bin/', 'js/app', /\.js$/g, scripts)
    fn()
}

function walkSync(root: string, subdir: string, regexp: RegExp, result: string[]) {
    var files = readdirSync(root + subdir);
    subdir = subdir + '/'
    files.forEach(function (file) {
        if (statSync(root + subdir + file).isDirectory()) {
            walkSync(root, subdir + file, regexp, result);
        }
        else {
            if (regexp.test(file))
                result.push(subdir + file);
        }
    });
};