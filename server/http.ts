import express = require('express');
import http = require('http');
import url = require('url');
import fs = require('fs');
import { home, HtmlTag } from './home'

export const app = express();

app.use('/hello', function (req, res) {
    res.write({ msg: "hello" });
});

app.use("/js", express.static('./bin/js'));
app.use("/third", express.static('./third'));

app.use('/', function (req, res) {
    if (req.url !== '' && req.url !== '/') {
        if (/\.ts$/g.test(req.url)) {
            var fileStream = fs.createReadStream(__dirname + '/../..' + req.url);
            fileStream.on('open', function () {
                fileStream.pipe(res);
            });
        } else {
            res.writeHead(400, JSON.stringify(req.headers, null, 2))
        }
        return
    }
    res.setHeader('content-type', 'text/html; charset=utf-8')
    let ident = ''
    home(sendTags)
    res.end()

    function sendTags(tags: HtmlTag | string) {
        if (typeof tags === 'string') {
            res.write(ident);
            res.write(tags);
        }
        else Object.keys(tags).forEach((tagName) => {
            res.write(ident);
            ident = ident || '\n'
            res.write('<');
            res.write(tagName);
            let children = sendProps(tags[tagName])
            res.write('>');
            const bkp = ident
            ident += '  '
            children.forEach(sendTags)
            ident = bkp
            res.write(ident);
            res.write('</');
            res.write(tagName);
            res.write('>');
        })
    }

    function sendProps(props: any): Array<HtmlTag | string> {
        let children: Array<HtmlTag | string> = []
        Object.keys(props).forEach((propName) => {
            const prop = props[propName]
            if (propName === 'textContent') children.push(prop);
            else if (Array.isArray(prop)) children = children.concat(prop)
            else if (typeof prop === 'object') children.push({ [propName]: prop })
            else {
                res.write(' ')
                res.write(propName)
                res.write('="')
                res.write(prop)
                res.write('"')
            }
        })
        return children
    }
});


export const server = http.createServer(app);

