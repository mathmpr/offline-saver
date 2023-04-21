const URL = require("url").URL;
const fs = require("fs");

const isURL = (s) => {
    if (s.startsWith('//')) {
        s = 'http:' + s;
    }
    try {
        new URL(s);
        return true;
    } catch (err) {
        return false;
    }
};

const promiseFetch = async (url, passToResolve = {}) => {
    return new Promise(async (resolve, reject) => {
        if (url.startsWith('//')) {
            url = 'http:' + url;
        }
        const _try = async (attempts, time = 1500) => {
            if (attempts === 0) {
                console.log('Internet error on fetch: ' + url);
                resolve({
                    skip: true
                });
            }
            try {
                let response = await fetch(url);
                let responseRaw = await response.clone();
                let responseArrayBuffer = await response.clone().arrayBuffer();
                let responseText = await response.text();
                resolve({
                    responseRaw,
                    responseArrayBuffer,
                    responseText,
                    contentType: response.headers.get('content-type'),
                    isHtml: response.headers.get('content-type').indexOf('text/html') > -1,
                    url,
                    ...passToResolve
                });
            } catch (e) {
                setTimeout(async () => {
                    await _try(attempts - 1, time * 2);
                }, time);
            }
        }
        await _try(5);
    });
}

const parsePaths = (into, url) => {
    if (url === '') {
        return false;
    }
    if (url.endsWith('/')) {
        url = url.substring(0, url.length - 1);
    }
    let dir = url.split('/');
    dir.pop();
    dir = dir.join('/');
    let fileName = url.split('/')
        .pop()
        .split('?')
        .shift()
        .trim();
    let fullPath = into + dir + '/' + fileName;
    let ret = ('./' + dir + '/' + fileName).split('//').join('/');
    dir = into + dir;
    if (dir.length === 1) {
        dir = into;
    }
    dir = dir.split('//').join('/');
    fullPath = fullPath.split('//').join('/');
    return {
        dir,
        fullPath,
        ret
    }
}

const saveFile = async (into, dirPath, fullPath, content, passToResolve = {}) => {
    try {
        fs.mkdirSync(into + dirPath, {recursive: true});
        if (typeof content === 'object') {
            return new Promise(async (resolve, reject) => {
                await fs.writeFileSync(into + fullPath, await Buffer.from(content));
                resolve({
                    result: fullPath,
                    ...passToResolve
                });
            });
        } else {
            fs.writeFileSync(into + fullPath, content);
        }
    } catch (error) {
        return false;
    }
    return {
        result: fullPath,
        ...passToResolve
    };
}

const getUrlExtension = (url) => {
    return url.split(/[#?]/)[0].split('.').pop().trim();
}

const urlInfo = (url) => {

    if (url.trim() === '' || url.trim() === '#') {
        return false;
    }

    if (url.startsWith('//')) {
        url = 'http:' + url;
    }

    let baseUrl;

    baseUrl = url.split('://');
    baseUrl = baseUrl.shift() + '://' + baseUrl.shift().split('/').shift() + '/';

    let fileExt = getUrlExtension(url);
    if (fileExt === '') {
        fileExt = null;
    }

    let minusLevel = false;
    let suggestedLocation = '';

    let test = url.split('/');
    let last = test.pop().split('?').shift();
    let clear = test.join('/') + '/' + last;

    if (!fileExt || (fileExt && fileExt.trim().endsWith('/'))) {
        suggestedLocation = clear.substring(0, clear.length - 1) + '.html';
    } else {
        suggestedLocation = clear;
    }

    if (url.endsWith('/') && !clear.endsWith('/')) {
        clear = clear + '/';
        minusLevel = true;
    }

    test = url
        .replace('http://', '')
        .replace('https://', '')
        .replace('//', '')
        .split('/');
    let clearBaseUrl = test.shift();
    test.pop();

    suggestedLocation = suggestedLocation.split(clearBaseUrl).pop();

    if (suggestedLocation === '.html') {
        suggestedLocation = '/index.html';
    }

    if (suggestedLocation === '/.html') {
        suggestedLocation = '/index.html';
    }

    if (suggestedLocation.startsWith('/')) {
        suggestedLocation = '.' + suggestedLocation;
    }

    let suggestedPath = suggestedLocation.split('/');
    suggestedPath.pop();
    suggestedPath = suggestedPath.join('/');
    if (suggestedPath === '.') {
        suggestedPath = './';
    }

    return {
        isHttps: url.indexOf('https://') > -1,
        urlBar: url.replace('https:', '').replace('http:', ''),
        rawUrl: url,
        clear,
        level: (minusLevel && test.length > 0)
            ? (test.length - 1)
            : test.length,
        fileExt,
        suggestedLocation,
        suggestedPath,
        clearBaseUrl,
        baseUrl
    }

}

const getMethods = (obj) => Object.getOwnPropertyNames(obj).filter(item => typeof obj[item] === 'function')

module.exports = {
    isURL,
    saveFile,
    getMethods,
    promiseFetch,
    parsePaths,
    urlInfo
}