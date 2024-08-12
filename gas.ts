// @ts-nocheck

async function getWeatherData({ openWeatherMapApi }) {
  const response = UrlFetchApp.fetch(`https://api.openweathermap.org/data/2.5/forecast?q=okinawa&appid=${openWeatherMapApi}`)
  const json = JSON.parse(response.getContentText())
  return json
}

function weatherToEmoji({ weather }) {
  switch (weather) {
    case 'Clear':
      return '🌞'
    case 'Clouds':
      return '🌥️'
    case 'Rain':
      return '🌧'
    case 'Snow':
      return '⛄️'
    case 'Thunderstorm':
      return '⚡️'
    default:
      return '?'
  }
}

function getWeather({ weatherData, date }) {
  const result = Array(8).fill('🏳')
  let included = false
  weatherData.list.forEach((item) => {
    const givenDate = new Date(date)
    const _date = new Date(item.dt_txt)
    if (givenDate.getDate() !== _date.getDate()) {
      return null
    }
    const weather = weatherToEmoji({ weather: item.weather[0].main })
    const time = _date.getHours()
    const index = Math.floor(time / 3)
    result[index] = weather
    included = true
  })
  if (included === false) return null
  return result.join('')
}

function messageCrator({ data }) {
  return data.map(({ date, weather }) => `${date}: ${weather}`).join('\n')
}

async function main() {
  const properties = PropertiesService.getScriptProperties()
  const openWeatherMapApi = properties.getProperty('OPEN_WEATHER_MAP_API')
  const dateFrom = properties.getProperty('DATE_FROM')
  const dateUpto = properties.getProperty('DATE_UPTO')
  const slackWebhookUrl = properties.getProperty('SLACK_WEBHOOK_URL')

  Logger.log(`openWeatherMapApi: ${openWeatherMapApi}`)

  const result = []

  const date = new Date(dateFrom)
  while (date <= new Date(dateUpto)) {
    Logger.log(date.toISOString().slice(0, 10))
    const weatherData = await getWeatherData({ openWeatherMapApi })
    const weather = getWeather({ weatherData, date })
    Logger.log(JSON.stringify(weather))
    if (weather != null) {
      result.push({
        date: date.toISOString().slice(0, 10),
        weather
      })
    }
    date.setDate(date.getDate() + 1)
  }

  const message = messageCrator({ data: result })
  Logger.log(message)

  const payload = {
    blocks: [
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: `:sunny::sunny::sunny: *お天気予報* :sunny::sunny::sunny:`
        }
      },
      {
        type: 'section',
        text: {
          type: 'mrkdwn',
          text: message
        }
      }
    ]
  }

  const options = {
    method: 'post',
    contentType: 'application/json',
    payload: JSON.stringify(payload)
  }

  UrlFetchApp.fetch(slackWebhookUrl, options)
}
