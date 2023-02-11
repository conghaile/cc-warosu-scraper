const express = require('express');
const bodyParser = require('body-parser');
const os = require('os');


const PORT = 5000
const app = express()
let timeout = 1500000

app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

let browsers = 0
let maxNumberOfBrowsers = 5

app.post('/api/threads', async (req, res) => {
    req.setTimeout(timeout)
    try {
        let data = req.body
        console.log(req.body.url)
        while (browsers === maxNumberOfBrowsers) {
            await sleep(1000)
        }
        await getThreadsHandler(data).then(result => {
            let response = {
                msg: 'retrieved threads ',
                hostname: os.hostname(),
                threads: result
            }
            console.log('done')
            res.send(response)
        })
    } catch (error) {
        res.send({ error: error.toString })
    }
})

async function getThreadsHandler(arg) {
    let pMng = require('./PuppeteerManager');
    let puppeteerMng = new pMng.PuppeteerManager(arg)
    browsers += 1
    try {
        let threads = await puppeteerMng.getThreads().then(result => {
            return result
        })
        browsers -= 1
        return threads
    } catch (error) {
        browsers -= 1
        console.log(error)
    }
}

function sleep(ms) {
    console.log('running maximum number of browsers')
    return new Promise(resolve => setTimeout(resolve, ms))
}

app.listen(PORT)
console.log('listening on', PORT)