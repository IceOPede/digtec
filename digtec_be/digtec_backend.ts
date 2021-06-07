import { Browser, Page } from "puppeteer-core";

const puppeteer = require('puppeteer')
const express = require('express')

let config = {
    launchOptions: {
        // headless: false,
        // executablePath: '/usr/bin/chromium-browser'
    }
}

let browser: Browser;
let page: Page;

let offersPromise: Promise<any> | null;
let offersResolve: ((value: any) => void) | null = null;

async function initPuppeteer() {
    browser = await puppeteer.launch(config.launchOptions);
    page = await browser.newPage()
    await page.setDefaultNavigationTimeout(0);

    page.on('response', async (response) => {
        if (response.url() === "https://www.digitec.ch/api/graphql") {
            const data = JSON.parse(response.request().postData())
            if (
                data &&
                data[0] &&
                data[0].operationName &&
                data[0].operationName === "PDP_GET_PRODUCT_DETAILS_CRITICAL_DATA_REFETCH"
            ) {
                console.log(await response.status())
                let responseData = await response.json();
                if (offersResolve) {
                    offersResolve(responseData[0].data.productDetails.offers)
                }
            }
        }
    })
    // https://www.digitec.ch/de/s1/product/msi-geforce-rtx-3080-ti-suprim-x-12g-12gb-grafikkarte-15950523
    // https://www.digitec.ch/de/s1/product/msi-geforce-rtx-3080-suprim-x-10g-10gb-grafikkarte-14370977
    await page.goto("https://www.digitec.ch/de/s1/product/msi-geforce-rtx-3080-ti-suprim-x-12g-12gb-grafikkarte-15950523")
}


async function fetchDigitecData() {
    if (!browser) {
        return;
    }

    if (offersPromise) {
        return await offersPromise;
    }

    offersPromise = new Promise((resolve, reject) => {
        offersResolve = resolve;
        page.reload()
        setTimeout(reject, 5*60*1000)
    });

    const offers = await offersPromise;

    offersPromise = null;
    offersResolve = null;

    return offers;
}

const app = express()
const port = 3000

app.get('/', (req, res) => {
    res.send('Hello World!')
})

app.get('/digitec', async (req, res) => {
    try {
        let data = await fetchDigitecData();
        res.send({payload: data, status: "SUCCESS", message: null})
    } catch (error) {
        res.status(500).send({payload: null, status: "ERROR", message: "Error: " + error})
    }
})

app.listen(port, async () => {
    await initPuppeteer()
    console.log(`Example app listening at http://localhost:${port}`)
})