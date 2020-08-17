const AWS = require('aws-sdk')
const eventBridge = new AWS.EventBridge()
const sns = new AWS.SNS()
const wrap = require('@dazn/lambda-powertools-pattern-basic')

const busName = process.env.bus_name
const topicArn = process.env.restaurant_notification_topic

module.exports.handler = wrap(async (event) => {
  const order = event.detail
  const snsReq = {
    Message: JSON.stringify(order),
    TopicArn: topicArn
  };
  await sns.publish(snsReq).promise()

  await eventBridge.putEvents({
    Entries: [{
      Source: 'big-mouth',
      DetailType: 'restaurant_notified',
      Detail: JSON.stringify(order),
      EventBusName: busName
    }]
  }).promise()
})