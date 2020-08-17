const DocumentClient = require('aws-sdk/clients/dynamodb').DocumentClient
const dynamodb = new DocumentClient()
const ssm = require('@middy/ssm')
const failureLambda = require('failure-lambda')
const Log = require('@dazn/lambda-powertools-logger')
const wrap = require('@dazn/lambda-powertools-pattern-basic')

const { serviceName, stage } = process.env

const tableName = process.env.restaurants_table

const getRestaurants = async (count) => {
  const req = {
    TableName: tableName,
    Limit: count
  }

  const resp = await dynamodb.scan(req).promise()
  return resp.Items
}

const handler = failureLambda(async (event, context) => {
  const restaurants = await getRestaurants(process.env.defaultResults)
  const response = {
    statusCode: 200,
    body: JSON.stringify(restaurants)
  }

  return response
})

module.exports.handler = wrap(handler)
  .use(ssm({
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