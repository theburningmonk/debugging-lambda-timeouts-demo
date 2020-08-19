const fs = require("fs")
const Mustache = require('mustache')
const http = require('axios')
const aws4 = require('aws4')
const URL = require('url')
const Promise = require('bluebird')

const restaurantsApiRoot = process.env.restaurants_api
const ordersApiRoot = process.env.orders_api
const awsRegion = process.env.AWS_REGION

const days = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday']

const template = fs.readFileSync('static/index.html', 'utf-8')
let responseCache
const resolvedTime = 100
const defaultRestaurants = require('../static/default_restaurants.json')

const getRestaurants = async () => {
  console.log(`loading restaurants from ${restaurantsApiRoot}...`)

  const url = URL.parse(restaurantsApiRoot)
  const opts = {
    host: url.hostname,
    path: url.pathname
  }

  aws4.sign(opts)

  const timeout = global.context.getRemainingTimeInMillis() - resolvedTime
  return await Promise.resolve(http.get(restaurantsApiRoot, {
    headers: opts.headers
  }))
    .timeout(timeout)
    .then(resp => {
      responseCache = resp.data
      return resp.data
    })
    .catch(err => {
      if (err.name === "TimeoutError") {
        console.log("request timed out, executing fallbacks")
        if (responseCache) {
          console.log("returning cached response")
          return responseCache
        } else {
          console.log("returning default response")
          return defaultRestaurants
        }
      } else {
        throw err
      }
    })
}

module.exports.handler = async (event, context) => {
  global.context = context

  const restaurants = await getRestaurants()
  const dayOfWeek = days[new Date().getDay()]
  const view = {
    awsRegion,
    dayOfWeek,
    restaurants,
    searchUrl: `${restaurantsApiRoot}/search`,
    placeOrderUrl: `${ordersApiRoot}`
  }
  const html = Mustache.render(template, view)
  const response = {
    statusCode: 200,
    headers: {
      'content-type': 'text/html; charset=UTF-8'
    },
    body: html
  }

  return response
}