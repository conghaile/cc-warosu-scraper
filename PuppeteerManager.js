import axios from 'axios';
import puppeteer from 'puppeteer';
import { createClient } from 'redis';

class PuppeteerManager {
    constructor() {
        this.allThreads = []

    }

    async getLastExpired() {
        
        const browser = await puppeteer.launch({
            args: [
                "--no-sandbox",
                "--disable-gpu",
            ],
            // headless: false
        })
        const page = await browser.newPage()
        page.setDefaultTimeout(300000)
        await page.setRequestInterception(true)
        page.on('request', (req) => {
            if (req.resourceType() === 'image') {
                req.abort()
            } else {
                req.continue()
            }
        })

        await page.goto('https://boards.4channel.org/biz/archive', { waitUntil: "networkidle0"})
        const latestExpired = await page.evaluate(() => {
            let postNos = []
            document.querySelectorAll('tr:not([class]) > td:not([class])').forEach(cell => {
                if (Number(cell.innerText)) {
                postNos.push(Number(cell.innerText))
                }
            })
            return Math.max(...postNos)
        })

        await browser.close()
        return latestExpired
    }

    async getThreadsOnPage(pageNum) {
        const browser = await puppeteer.launch({
            args: [
                "--no-sandbox",
                "--disable-gpu",
            ],
            // headless: false
        })
        const page = await browser.newPage()
        page.setDefaultTimeout(300000)
        await page.setRequestInterception(true)
        page.on('request', (req) => {
            if (req.resourceType() === 'image') {
                req.abort()
            } else {
                req.continue()
            }
        })

        await page.goto(`https://warosu.org/biz/?task=page&page=${String(pageNum)}`)
        const threads = await page.evaluate(() => {
            let posts = []
            document.querySelectorAll('div[id^="p"] > a.js[href^="/biz/thread/"]')
                .forEach(post => {
                    posts.push(Number(post.innerHTML.slice(3)))
                })
            return posts
        })

        await browser.close()
        return threads

    }


    // async run() {
    //     const latestExpired = await this.getLastExpired()

    //     await page.goto(this.url, { waitUntil: "networkidle0" })
    //     const threads = await page.evaluate(() => {
    //         let posts = []
    //         document.querySelectorAll('div[itemtype="http://schema.org/DiscussionForumPosting"] > a.js[href^="/biz/thread/"]')
    //             .forEach(post => {
    //                 posts.push(Number(post.innerHTML.slice(3)))
    //             })
    //         return posts
    //     })

    //     const client = createClient()
    //     client.on('error', err => console.log('Redis Client Error', err));
    //     await client.connect();

    //     for (const thread of threads) {
    //         const earliestThread = await client.get('earliestThread')
    //         const latestThread = await client.get('latestThread')
    //         if (thread <= latestExpired) {
    //             if (!earliestThread && !latestThread) {
    //                 client
    //                     .multi()
    //                     .set('earliestThread', thread)
    //                     .set('latestThread', thread)
    //                     .exec()
    //             } else if (thread < earliestThread) {
    //                 await client.set('earliestThread', thread)
    //             } else if (thread > latestThread) {
    //                 await client.set('latestThread', thread)
    //             } else {
    //                 console.log("Cache hit, thread already scraped")
    //                 continue
    //             }
    //             await page.goto(`https://warosu.org/biz/thread/${thread}`, { waitUntil: 'networkidle0' })
    //             const data = await page.evaluate(() => {
    //                 let posts = {};
    //                 let postText = [];
    //                 let postNos = [];
    //                 let times = [];
    //                 posts[document.querySelector('div[itemtype="http://schema.org/DiscussionForumPosting"]').id.slice(1)] = {
    //                     'text': document.querySelector('blockquote > p[itemprop=text]').innerText,
    //                     'replies': []
    //                 }
    //                 document.querySelectorAll('td.reply').forEach(reply => postNos.push(reply.id.slice(1)))
    //                 document.querySelectorAll('td.reply > blockquote > p').forEach(post => postText.push(post.innerText))
    //                 document.querySelectorAll('span.posttime').forEach(stamp => times.push(stamp.title))
    //                 for (let i = 0; i < postText.length; i++) {
    //                     posts[postNos[i]] = {
    //                         'text': postText[i],
    //                         'time': times[i],
    //                         'replies': [],
    //                     }
    //                 }

    //                 Object.keys(posts).forEach(post => {
    //                     let re = />>\d{3,}/g
    //                     if (re.test(posts[post].text)) {
    //                         posts[post].text.match(re).forEach(reply => {
    //                             if (posts[reply.slice(2)]) {
    //                                 posts[reply.slice(2)].replies.push(post)
    //                             }
    //                         })
    //                     }
    //                 })
    //                 return posts
    //             })
    //             this.allThreads.push(data)
    //             }
    //         }
    //     client.quit()
            
    //     await browser.close()
    // }

    async getThreads() {
        await this.run()
        return this.allThreads
    }

    async scrapeThread(thread) { 
        const browser = await puppeteer.launch({
            args: [
                "--no-sandbox",
                "--disable-gpu",
            ],
            // headless: false
        })
        const page = await browser.newPage()
        page.setDefaultTimeout(300000)
        await page.setRequestInterception(true)
        page.on('request', (req) => {
            if (req.resourceType() === 'image') {
                req.abort()
            } else {
                req.continue()
            }
        })

        await page.goto(`https://warosu.org/biz/thread/${thread}`)
        const posts = await page.evaluate(() => {
            let subjectCheck = document.querySelector('span.filetitle')
            if (subjectCheck !== null) {
                re = new RegExp(/\/\w{2,}\//)
                if (re.test(subjectCheck.innerText)) {
                    return null
                }
            }
            let posts = {};
            let postText = [];
            let postNos = [];
            let times = [];
            posts[document.querySelector('div[id^="p"]').id.slice(1)] = {
                'text': document.querySelector('blockquote > p').innerText,
                'time': document.querySelector('div > label > span.posttime').title,
                'replies': []
            }
            document.querySelectorAll('td.reply').forEach(reply => postNos.push(reply.id.slice(1)))
            document.querySelectorAll('td.reply > blockquote > p').forEach(post => postText.push(post.innerText))
            document.querySelectorAll('span.posttime').forEach(stamp => times.push(stamp.title))
            for (let i = 0; i < postText.length; i++) {
                posts[postNos[i]] = {
                    'text': postText[i],
                    'time': times[i],
                    'replies': [],
                }
            }

            Object.keys(posts).forEach(post => {
                let re = />>\d{3,}/g
                if (re.test(posts[post].text)) {
                    posts[post].text.match(re).forEach(reply => {
                        if (posts[reply.slice(2)]) {
                            posts[reply.slice(2)].replies.push(post)
                        }
                    })
                }
            })
            return posts
                
        })
        await browser.close()
        return posts
    }

    async fullScrape(scrapeType) {
        const lastExpired = await this.getLastExpired()
        const latestScraped = await this.getLatestScraped()
        const redisClient = createClient()
        redisClient.on('error', err => console.log('Redis Client Error', err));
        await redisClient.connect();
        let finished = false
        let page = 1
        let firstScraped = -1
        while (!finished && page < 1000) {
            if (scrapeType === "full") {
                const threads = await this.getThreadsOnPage(page)
                await this.sleep(1000)
                if (threads.length > 0) {
                    page++
                    for (const thread of threads) {
                        if (Number(thread) < Number(lastExpired)) {
                            let isMember = await redisClient.sIsMember('seenThreads', String(thread))
                            if (!isMember) {
                                console.log("thread", thread, "not seen, scraping...")
                                let threadPosts = await this.scrapeThread(thread)
                                await this.sleep(1000)
                                if (threadPosts !== null) {
                                    await redisClient.sAdd('seenThreads', String(thread))
                                    await axios.post('http://127.0.0.1:5001/threads', threadPosts)
                                }
                            }
                        }
                    }
                } else {
                    console.log("Whew, all done!")
                    await redisClient.quit()
                    finished = true
                }
            }  else if (scrapeType === "latest") {
                const threads = await this.getThreadsOnPage(page)
                await this.sleep(1000)
                if (threads.length > 0) {
                    page++
                    for (const thread of threads) {
                        if (Number(thread) < Number(lastExpired) && Number(thread) > Number(latestScraped)) {
                            let isMember = await redisClient.sIsMember('seenThreads', String(thread))
                            if (!isMember) {
                                console.log("thread", thread, "not seen, scraping...")
                                if (firstScraped === -1) {
                                    firstScraped = Number(thread)
                                    await redisClient.set("latestScraped", String(firstScraped))
                                }
                                let threadPosts = await this.scrapeThread(thread)
                                await this.sleep(1000)
                                if (threadPosts !== null) {
                                    await redisClient.sAdd('seenThreads', String(thread))
                                    await axios.post('http://127.0.0.1:5001/threads', threadPosts)
                                }
                            }
                        } else {
                            console.log("Done.")
                            await redisClient.quit()
                            finished = true
                            break
                        }
                    }
                } else {
                    console.log("Done.")
                    await redisClient.quit()
                    finished = true
                    break
                }
            }
        }
    }

    async sleep(ms) {
        return new Promise(resolve => setTimeout(resolve, ms))
    }

    async getLatestScraped() {
        const redisClient = createClient()
        redisClient.on('error', err => console.log('Redis Client Error', err));
        await redisClient.connect();
        const result = await redisClient.get("latestScraped")
        return result === null ? 0 : result
    }

}

export default PuppeteerManager