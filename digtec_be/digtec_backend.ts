import fetch from 'node-fetch';
const express = require('express')

type ProductQuery = {
    id: number
    sectorId: number
}

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
        return responseData[0]?.data?.productDetails?.offers
    }
    throw "Response data not available"
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
    let productData = createProductData(req.body.productData.id);
    try {
        let response = await fetchDigitecApi(productData)
        res.send({ payload: response, status: "SUCCESS", message: null })
    } catch (error) {
        res.status(500).send({ payload: null, status: "ERROR", message: "Error: " + error })
    }
})

app.listen(port, async () => {
    console.log(`Example app listening at http://localhost:${port}`)
})