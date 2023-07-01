import express from 'express';
import bodyParser from 'body-parser';
import PuppeteerManager from './PuppeteerManager.js'
import dotenv from 'dotenv'
import axios from 'axios';
import os from 'os';

dotenv.config()

const PORT = Number(process.env.PORT)
console.log(PORT)
const app = express()
let timeout = 1500000


app.use(bodyParser.urlencoded({ extended: true }))
app.use(bodyParser.json())

let browsers = 0
let maxNumberOfBrowsers = 20

// app.post('/test', async (req, res) => {
//     try {
//         let data = req.body
//         const postRes = await axios.post('http://127.0.0.1:5001/threads', data)
//         res.send(postRes.data)
//     } catch (error) {
//         console.log(error)
//     }
// })

app.get('/', async (req, res) => {
    const scrapeType = req.query.scrapeType
    await fullScrapeHandler(scrapeType)
    res.send("Done")
})

app.post('/api/threads', async (req, res) => {
    req.setTimeout(timeout)
    try {
        let data = req.body
        console.log(data)
        while (browsers === maxNumberOfBrowsers) {
            await sleep(1000)
        }

        await getThreadsHandler(data).then(result => {
            if (result.length > 0) {
                axios.post('http://127.0.0.1:5001/threads', result).then(response => {
                    console.log(response.data)
                    res.send(response.data)
                })
            } else {
                res.send("No new threads")
            }

        })
    } catch (error) {
        res.send({ error: error.toString })
    }
})

async function fullScrapeHandler(scrapeType) {
    console.log("Scraping /biz/...")
    let puppeteerMng = new PuppeteerManager()
    await puppeteerMng.fullScrape(scrapeType)
}

async function getThreadsHandler(arg) {
    console.log("handler called")
    let puppeteerMng = new PuppeteerManager(arg)
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