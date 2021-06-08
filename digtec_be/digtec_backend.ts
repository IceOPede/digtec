import fetch from 'node-fetch';

import { Subscription, interval } from 'rxjs';
import { delay, take, tap } from 'rxjs/operators';

const express = require('express')
const nodemailer = require("nodemailer");
const emailData = require('./emailData.json');

import * as moment from 'moment';

enum LaunchMode {
  WEBSITE_RUN,
  NIGHTLY_RUN
}

enum State {
  RUNNING = "Running",
  STOPPED = "Stopped"
}

const callDelay = 30 * 1000;

let currentLunchMode: LaunchMode | null;
let currentState: State = State.STOPPED;
let fetchSubscription: Subscription;

type ProductQuery = {
  id: number
  sectorId: number
}

let emailSend = false;

async function fetchDigitecApi(productData: ProductQuery) {
  let response = await fetch('https://www.digitec.ch/api/graphql', {
    headers: {
      'User-Agent': 'Mozilla/5.0 (Windows NT 10.0; Win64; x64; rv:90.0) Gecko/20100101 Firefox/90.0',
      'Accept': '*/*',
      'Accept-Language': 'de-CH',
      'content-type': 'application/json',
      'Pragma': 'no-cache',
      'Cache-Control': 'no-cache'
    },
    body: JSON.stringify([
      {
        operationName: 'PDP_GET_PRODUCT_DETAILS_CRITICAL_DATA_REFETCH',
        variables: {
          productId: productData.id,
          supplierId: null,
          secondHandSalesOfferId: null,
          sectorId: productData.sectorId
        },
        query: `query PDP_GET_PRODUCT_DETAILS_CRITICAL_DATA_REFETCH($productId: Int!) {
                    productDetails: productDetailsV3(productId: $productId) {
                      mandatorSpecificData {
                        isBestseller
                        isDeleted
                        showroomSites
                        sectorIds
                        __typename
                      }
                      product {
                        id
                        productId
                        name
                        nameProperties
                        productTypeId
                        productTypeName
                        brandId
                        brandName
                        averageRating
                        totalRatings
                        totalQuestions
                        isProductSet
                        images {
                          url
                          height
                          width
                          __typename
                        }
                        energyEfficiency {
                          energyEfficiencyColorType
                          energyEfficiencyLabelText
                          energyEfficiencyLabelSigns
                          energyEfficiencyImage {
                            url
                            height
                            width
                            __typename
                          }
                          __typename
                        }
                        seo {
                          seoProductTypeName
                          seoNameProperties
                          productGroups {
                            productGroup1
                            productGroup2
                            productGroup3
                            productGroup4
                            __typename
                          }
                          __typename
                        }
                        lowQualityImagePlaceholder
                        hasVariants
                        __typename
                      }
                      offers {
                        ...ProductDetailsOffer
                        __typename
                      }
                      __typename
                    }
                  }
                  
                  fragment ProductDetailsOffer on ProductDetailOffer {
                    id
                    productId
                    offerId
                    shopOfferId
                    price {
                      amountIncl
                      amountExcl
                      currency
                      fraction
                      __typename
                    }
                    deliveryOptions {
                      mail {
                        classification
                        futureReleaseDate
                        __typename
                      }
                      pickup {
                        siteId
                        classification
                        futureReleaseDate
                        __typename
                      }
                      detailsProvider {
                        productId
                        offerId
                        quantity
                        type
                        __typename
                      }
                      certainty
                      __typename
                    }
                    supplier {
                      name
                      countryIsoCode
                      countryName
                      customsType
                      link
                      __typename
                    }
                    label
                    type
                    volumeDiscountPrices {
                      minAmount
                      price {
                        amountIncl
                        amountExcl
                        currency
                        __typename
                      }
                      isDefault
                      __typename
                    }
                    salesInformation {
                      numberOfItems
                      numberOfItemsSold
                      isEndingSoon
                      __typename
                    }
                    incentiveText
                    isIncentiveCashback
                    isNew
                    isSalesPromotion
                    hideInProductDiscovery
                    canAddToBasket
                    hidePrice
                    insteadOfPrice {
                      type
                      price {
                        amountIncl
                        amountExcl
                        currency
                        fraction
                        __typename
                      }
                      __typename
                    }
                    minOrderQuantity
                    hasMobileSubscription
                    secondHandOfferInfo {
                      conditions {
                        name
                        value
                        description
                        __typename
                      }
                      generalCondition {
                        name
                        value
                        description
                        __typename
                      }
                      description
                      sellerCustomerId
                      images {
                        fileUrl
                        description
                        width
                        height
                        __typename
                      }
                      warranty {
                        title
                        description
                        tooltip
                        isSpecificWarranty
                        __typename
                      }
                      __typename
                    }
                    returnText {
                      title
                      description
                      __typename
                    }
                    warrantyOverviews {
                      title
                      description
                      __typename
                    }
                    digitecConnect {
                      months
                      value
                      type
                      __typename
                    }
                    specifications {
                      title
                      description
                      link
                      type
                      properties {
                        name
                        propertyId
                        description
                        descriptionLink
                        type
                        values {
                          value
                          description
                          descriptionLink
                          link
                          propertyDefinitionOptionId
                          __typename
                        }
                        __typename
                      }
                      __typename
                    }
                    __typename
                  }
                `
      }
    ]),
    method: 'POST',
  });
  if (!response) {
    throw "Response was empty"
  }
  console.log(response.status)
  let responseData = await response.json();
  if (responseData) {
    if (responseData[0]?.data?.productDetails?.offers[0]?.canAddToBasket) {
      await sendEmail({
        name: responseData[0]?.data?.productDetails?.product?.name,
        brandName: responseData[0]?.data?.productDetails?.product?.brandName,
      })
    }
    return responseData[0]?.data?.productDetails?.offers
  }
  throw "Response data not available"
}

async function sendEmail(productInformation) {
  if (!emailSend) {
    moment.locale("de-ch");
    let transporter = nodemailer.createTransport({
      host: emailData.host,
      port: emailData.port,
      secure: emailData.secure, // true for 465, false for other ports
      auth: {
        user: emailData.auth.user, // generated ethereal user
        pass: emailData.auth.pass, // generated ethereal password
      },
    });
    let info = await transporter.sendMail({
      from: emailData.from, // sender address
      to: emailData.to, // list of receivers
      subject: "Product available", // Subject line
      html: "<p>Check digitec now</p>" +
        "<p>Product now available: </p>" +
        "<p><b>" + productInformation.brandName + " </b>" +
        productInformation.name + "</p>" +
        "<p>Available since " + moment().format('L LTS') + "</p>", // plain text body
    });

    console.log("Message sent: %s", info.messageId);
    emailSend = true;
    fetchSubscription.unsubscribe();
  }
}

function createProductData(productId): ProductQuery {
  return {
    id: productId,
    sectorId: 1
  }
}

const app = express()
const port = 3000

app.use(express.json())

app.get('/', (req, res) => {
  res.send('Hello World!')
})

app.post('/fetchDigitecApi', async (req, res) => {
  if (currentLunchMode && currentLunchMode === LaunchMode.NIGHTLY_RUN) {
    res.send({ payload: null, status: "ERROR", message: "Please stop nighly run first" })
  } else {
    currentLunchMode = LaunchMode.WEBSITE_RUN
    let productData = createProductData(req.body.productData.id);
    try {
      let response = await fetchDigitecApi(productData)
      res.send({ payload: response, status: "SUCCESS", message: null })
    } catch (error) {
      res.status(500).send({ payload: null, status: "ERROR", message: "Error: " + error })
    }
  }
})


app.post('/start', async (req, res) => {
  currentLunchMode = LaunchMode.NIGHTLY_RUN
  currentState = State.RUNNING
  let productData = createProductData(req.body.productData.id);
  loopingCalls(productData);

  res.send({ status: currentState.toString() })
})

app.get('/stop', async (req, res) => {
  currentLunchMode = null
  if (currentState === State.RUNNING && fetchSubscription) {
    fetchSubscription.unsubscribe();
  }
  currentState = State.STOPPED
  res.send({ status: currentState.toString() })
})

app.get('/getStatus', async (req, res) => {
  res.send({ status: currentState.toString() })
})

function loopingCalls(productData) {
  fetchSubscription = interval(callDelay).pipe(
    take(2000),
    tap(async () => await fetchDigitecApi(productData))
  ).subscribe()
}

app.listen(port, async () => {
  console.log(`Example app listening at http://localhost:${port}`)
})