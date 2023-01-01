import { app, session } from 'electron'

import console from './console'
import listen from './intercept'
const port = listen()

function setupIntercept() {
  session.defaultSession.webRequest.onBeforeRequest(
    {
      urls: ['https://auth.blitz.gg/*'],
    },
    (details, callback) => {
      const redirectURL = details.url.replace(
        /https?:\/\/auth\.blitz\.gg\//gi,
        `http://localhost:${port}/`
      )
      console.log(`\n\nurl = ${details.url}\nredirect url = ${redirectURL}\n\n`)

      return callback({
        redirectURL,
      })
    }
  )
}

try {
  setupIntercept()
  console.log('intercept setup')
} catch (err) {
  console.error(err)
  app.once('ready', () => {
    setupIntercept()
    console.log('app ready, intercept setup')
  })
}
