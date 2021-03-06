import axios from 'axios'

export default class BotonicPluginInbenta {
  constructor({ API_KEY, API_SECRET, env, source, ...rest }) {
    this.API_KEY = API_KEY
    this.API_SECRET = API_SECRET
    this.env = env || 'production'
    this.source = source
  }

  async pre({ input, session }) {
    if (input.type != 'text') return

    let intent = null
    let confidence = 0
    let intents = []
    let entities = []

    try {
      const inbentaResponse = await this.knowledgeManagementAPI(input.data, session)
      if (
        !inbentaResponse.data.results ||
        !inbentaResponse.data.results.length > 0
      )
        return
      intent = inbentaResponse.data.results[0].title
      confidence = inbentaResponse.data.results[0].score
      intents = inbentaResponse.data.results
      Object.assign(input, { intent, confidence, intents, entities })
    } catch (e) {
      console.log(`[Inbenta Plugin Error] ${e}`)
    }
  }

  async getToken() {
    if (this.token && this.tokenExpires > new Date()) return this.token
    try {
      const inbentaAuth = await axios({
        method: 'post',
        url: 'https://api.inbenta.io/v1/auth',
        headers: {
          'X-Inbenta-Key': this.API_KEY,
        },
        data: { secret: this.API_SECRET },
      })
      this.token = inbentaAuth.data.accessToken
      this.tokenExpires = new Date(inbentaAuth.data.expiration * 1000)
      this.apis = inbentaAuth.data.apis
      return this.token
    } catch (e) {
      throw new Error(`Couldn't get token: ${e}`)
    }
  }

  async getSessionToken(session) {
    if (session.inbentaSessionToken) return session.inbentaSessionToken
    try {
      const inbentaSession = await axios({
        method: 'post',
        url: `${this.apis.knowledge}/v1/tracking/session`,
        headers: {
          Authorization: `Bearer ${this.token}`,
          'X-Inbenta-Key': this.API_KEY,
        }
      })
      session.inbentaSessionToken = inbentaSession.data.sessionToken;
      return session.inbentaSessionToken
    } catch (e) {
      throw new Error(`Couldn't get session token: ${e}`)
    }
  }

  async knowledgeManagementAPI(query, session) {
    const token = await this.getToken()
    const sessionToken = await this.getSessionToken(session)
    return axios({
      method: 'post',
      url: `${this.apis.knowledge}/v1/search`,
      headers: {
        Authorization: `Bearer ${token}`,
        'Content-Type': 'application/json',
        'X-Inbenta-Key': this.API_KEY,
        'X-Inbenta-Env': this.env,
        'X-Inbenta-Session': sessionToken,
        'X-Inbenta-Source': this.source
      },
      data: JSON.stringify({ query }),
    })
  }

  post({ input, session, lastRoutePath, response }) {}
}
