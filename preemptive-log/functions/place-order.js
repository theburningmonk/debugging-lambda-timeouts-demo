const AWS = require('aws-sdk')
const eventBridge = new AWS.EventBridge()
const chance = require('chance').Chance()
const wrap = require('@dazn/lambda-powertools-pattern-basic')

const busName = process.env.bus_name

module.exports.handler = wrap(async (event) => {
  const restaurantName = JSON.parse(event.body).restaurantName

  const orderId = chance.guid()
  await eventBridge.putEvents({
    Entries: [{
      Source: 'big-mouth',
      DetailType: 'order_placed',
      Detail: JSON.stringify({
        orderId,
        restaurantName,
      }),
      EventBusName: busName
    }]
  }).promise()

  const response = {
    statusCode: 200,
    body: JSON.stringify({ orderId })
  }

  return response
})