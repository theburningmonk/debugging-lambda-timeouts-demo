const XRay = require('aws-xray-sdk-core')
const AWS = XRay.captureAWS(require('aws-sdk'))
const dynamodb = new AWS.DynamoDB.DocumentClient()
const middy = require('@middy/core')
const ssm = require('@middy/ssm')
const failureLambda = require('failure-lambda')

const { serviceName, stage } = process.env

const tableName = process.env.restaurants_table

const findRestaurantsByTheme = async (theme, count) => {
  const req = {
    TableName: tableName,
    Limit: count,
    FilterExpression: "contains(themes, :theme)",
    ExpressionAttributeValues: { ":theme": theme }
  }

  if (theme) {
    req.FilterExpression = "contains(themes, :theme)"
    req.ExpressionAttributeValues = { ":theme": theme }
  }

  const resp = await dynamodb.scan(req).promise()
  return resp.Items
}

const handler = failureLambda(async (event, context) => {
  const req = JSON.parse(event.body)
  const theme = req.theme
  const restaurants = await findRestaurantsByTheme(theme, process.env.defaultResults)
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants)
  }

  return response
})

module.exports.handler = middy(handler).use(ssm({
  cache: true,
  cacheExpiryInMillis: 5 * 60 * 1000, // 5 mins
  names: {
    config: `/${serviceName}/${stage}/search-restaurants/config`
  },
  onChange: () => {
    const config = JSON.parse(process.env.config)
    process.env.defaultResults = config.defaultResults
  }
}))