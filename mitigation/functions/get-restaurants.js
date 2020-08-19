const AWS = require('aws-sdk')
const dynamodb = new AWS.DynamoDB.DocumentClient({
  maxRetries: 3
})
const middy = require('@middy/core')
const ssm = require('@middy/ssm')
const failureLambda = require('failure-lambda')

const { serviceName, stage } = process.env

const tableName = process.env.restaurants_table
let responseCache
const defaultRestaurants = require('../static/default_restaurants.json')

const getRestaurants = async (count) => {
  console.log(`fetching ${count} restaurants from ${tableName}...`)
  const req = {
    TableName: tableName,
    Limit: count
  }

  const resp = await dynamodb.scan(req).promise()
  console.log(`found ${resp.Items.length} restaurants`)

  responseCache = resp.Items
  return resp.Items
}

const handler = failureLambda(async (event, context) => {
  const restaurants = await getRestaurants(process.env.defaultResults).catch(err => {
    console.log("max retries exceeded... executing fallbacks")
    if (responseCache) {
      console.log("returning cached response")
      return responseCache
    } else {
      console.log("returning default restaurants")
      return defaultRestaurants
    }
  })

  return {
    statusCode: 200,
    body: JSON.stringify(restaurants)
  }
})

module.exports.handler = middy(handler).use(ssm({
  cache: true,
  cacheExpiryInMillis: 5 * 60 * 1000, // 5 mins
  names: {
    config: `/${serviceName}/${stage}/get-restaurants/config`
  },
  onChange: () => {
    const config = JSON.parse(process.env.config)
    process.env.defaultResults = config.defaultResults
  }
}))