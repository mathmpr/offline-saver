let {argv} = require('./classes/argv')
const {isURL, saveFile, promiseFetch, parsePaths, urlInfo} = require("./classes/utils");
const cheerio = require('cheerio');
const fs = require("fs");

(async () => {

    let m_url = argv.get('u');

    let relative = argv.get('no-relative');
    relative = !(relative && relative.present);

    if (!m_url || !m_url.value) {
        console.error('Param -u or --u with an URL is required');
        process.exit();
    }

    if (!isURL(m_url.value)) {
        console.error('Param -u not have a valid URL string');
        process.exit();
    }

    let alreadyReadUrls = {};
    let alreadyFetchedUrls = [];

    m_url = urlInfo(m_url.value);

    const isInternalUrl = (_url) => {
        return _url.indexOf('//' + m_url.clearBaseUrl) > -1;
    }

    let intoDir = (__dirname + '/results/') +
        (m_url.baseUrl
            .split('//')
            .pop()
            .split('/')
            .shift() + '/');

    const parse = async ($, selector, attr, mainLevel) => {
        return new Promise((resolve, reject) => {

            let promises = [];

            $(selector).each(async (index, el) => {
                if (el.attribs[attr] != null && isURL(el.attribs[attr])) {

                    let fileUrl = urlInfo(el.attribs[attr]);

                    if (!fileUrl) return false;
                    if (isInternalUrl(fileUrl.clear)) {
                        if (fs.existsSync(intoDir + fileUrl.suggestedLocation)) {
                            promises.push({
                                el,
                                attr,
                                exists: true,
                                ...fileUrl
                            });
                        } else {
                            promises.push(promiseFetch(el.attribs[attr], {
                                el,
                                attr,
                                exists: false,
                                ...fileUrl
                            }));
                        }
                    }
                }
            });

            Promise.all(promises).then((values) => {

                let _promises = [];

                values.forEach(async (response) => {
                    if (response.skip) {
                        return;
                    }
                    if (response.isHtml) {
                        return;
                    }
                    let content = selector === 'img'
                        ? response.responseArrayBuffer
                        : response.responseText
                    if (alreadyReadUrls[response.el.attribs[response.attr]] != null || response.exists) {
                        _promises.push({
                            result: response.suggestedLocation,
                            el: response.el,
                            attr: response.attr,
                            level: response.level
                        });
                    } else {
                        alreadyReadUrls[response.el.attribs[response.attr]] = response.suggestedLocation;
                        _promises.push(saveFile(
                            intoDir,
                            response.suggestedPath,
                            response.suggestedLocation,
                            content,
                            {
                                el: response.el,
                                attr: response.attr,
                                level: response.level
                            }
                        ));
                    }
                });

                Promise.all(_promises).then((_values) => {
                    _values.forEach((result) => {
                        if (result.result) {
                            let _result = ((relative
                                ? '../'.repeat(mainLevel > 1
                                    ? mainLevel - 1
                                    : 0)
                                : '/') + result.result).replace('/./', '/');
                            $(result.el).attr(result.attr, _result);
                        }
                    });
                    resolve($);
                });
            });
        });
    }

    async function fetch(url, maxDepth = 2, depth = 0) {

        return new Promise(async (resolve, reject) => {

            url = urlInfo(url);
            if (!url) resolve();

            let promises = [];

            if (alreadyFetchedUrls.indexOf(url.clear) > -1) {
                resolve();
                return;
            }

            if (depth > maxDepth) {
                resolve();
                return;
            }

            alreadyFetchedUrls.push(url.clear);

            let response = await promiseFetch(url.clear);

            console.log('fetching with depth > ' + depth + ' url: ' + url.clear);

            if (response.isHtml) {

                let $ = cheerio.load(response.responseText);

                $ = await parse($, 'script', 'src', url.level);
                $ = await parse($, 'link', 'href', url.level);
                $ = await parse($, 'img', 'src', url.level);

                $('a').each(async (index, el) => {
                    let href = el.attribs.href;

                    if (href && isInternalUrl(href)) {
                        let fileUrl = urlInfo(href);
                        let phref = fileUrl.suggestedLocation;
                        if (fileUrl
                            && !href.endsWith('#')
                            && fileUrl.rawUrl !== ''
                            && fileUrl.rawUrl.indexOf('/#') === -1
                            && fileUrl.rawUrl.indexOf('#') === -1) {
                            promises.push(fetch(fileUrl.rawUrl, maxDepth, (depth + 1)));
                        }
                        let result = ((relative
                            ? '../'.repeat(url.level > 1
                            ? url.level - 1
                            : 0) + './'
                            : '/') + phref).replace('/./', '/')
                        $(el).attr('href', result);
                    }
                });

                await saveFile(intoDir, url.suggestedPath, url.suggestedLocation, $.html());
            } else {
                if (response.responseRaw.headers.get('content-type').indexOf('image')) {
                    await saveFile(intoDir, url.suggestedPath, url.suggestedLocation, response.responseArrayBuffer);
                } else {
                    await saveFile(intoDir, url.suggestedPath, url.suggestedLocation, response.responseText);
                }
            }
            if (promises.length > 0) {
                Promise.all(promises).then(() => {
                    resolve();
                });
            } else {
                resolve();
            }
        });
    }

    let depth = argv.get('d');
    if (depth && depth.value) {
        depth = parseInt(depth.value);
    } else {
        depth = 3;
    }
    if (!depth) {
        depth = 3;
    }

    await fetch(m_url.baseUrl, depth);

    process.exit();

})();
