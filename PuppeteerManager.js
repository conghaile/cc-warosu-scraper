const puppeteer = require('puppeteer');

class PuppeteerManager {
    constructor(args) {
        this.url = args.url
        this.allThreads = []

    }

    async run() {
        const browser = await puppeteer.launch()
        const page = await browser.newPage()
        await page.setRequestInterception(true)
        page.on('request', (req) => {
            if (req.resourceType() === 'image') {
                req.abort()
            } else {
                req.continue()
            }
        })

        await page.goto(this.url, { waitUntil: "networkidle0" })
        const threads = await page.evaluate(() => {
            let posts = []
            document.querySelectorAll('div[itemtype="http://schema.org/DiscussionForumPosting"] > a.js[href^="/biz/thread/"]')
                .forEach(post => {
                    posts.push(post.href)
                })
            return posts
        })

        for (const thread of threads) {
            await page.goto(thread, { waitUntil: 'networkidle0' })
            const data = await page.evaluate(() => {
                let posts = {};
                let postText = [];
                let postNos = [];
                posts[document.querySelector('div[itemtype="http://schema.org/DiscussionForumPosting"]').id.slice(1)] = {
                    'text': document.querySelector('blockquote > p[itemprop=text]').innerText,
                    'replies': []
                }
                document.querySelectorAll('td.reply').forEach(reply => postNos.push(reply.id.slice(1)))
                document.querySelectorAll('td.reply > blockquote > p').forEach(post => postText.push(post.innerText))
                for (let i = 0; i < postText.length; i++) {
                    posts[postNos[i]] = {
                        'text': postText[i],
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
            this.allThreads.push(data)
        }
        await browser.close()
    }

    async getThreads() {
        await this.run()
        return this.allThreads
    }

}

module.exports = { PuppeteerManager }