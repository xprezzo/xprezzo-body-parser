const http = require('http')
const methods = require('methods')
const request = require('supertest')
const bodyParser = require('..')

describe('bodyParser()', () => {
  before( () => {
    this.server = createServer()
  })

  it('should default to {}', (done) => {
    request(this.server)
      .post('/')
      .expect(200, '{}', done)
  })

  it('should parse JSON', (done) => {
    request(this.server)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('{"user":"tobi"}')
      .expect(200, '{"user":"tobi"}', done)
  })

  it('should parse x-www-form-urlencoded', (done) => {
    request(this.server)
      .post('/')
      .set('Content-Type', 'application/x-www-form-urlencoded')
      .send('user=tobi')
      .expect(200, '{"user":"tobi"}', done)
  })

  it('should handle duplicated middleware', (done) => {
    let _bodyParser = bodyParser()
    let server = http.createServer( (req, res) => {
      _bodyParser(req, res, (err0) => {
        _bodyParser(req, res, (err1) => {
          let err = err0 || err1
          res.statusCode = err ? (err.status || 500) : 200
          res.end(err ? err.message : JSON.stringify(req.body))
        })
      })
    })

    request(server)
      .post('/')
      .set('Content-Type', 'application/json')
      .send('{"user":"tobi"}')
      .expect(200, '{"user":"tobi"}', done)
  })

  describe('http methods', () => {
    before( () => {
      var _bodyParser = bodyParser()

      this.server = http.createServer( (req, res) => {
        _bodyParser(req, res, function (err) {
          if (err) {
            res.statusCode = 500
            res.end(err.message)
            return
          }

          res.statusCode = req.headers['x-expect-method'] === req.method
            ? req.body.user === 'tobi'
              ? 201
              : 400
            : 405
          res.end()
        })
      })
    })

    methods.slice().sort().forEach( (method) => {
      if (method === 'connect') {
        // except CONNECT
        return
      }

      it('should support ' + method.toUpperCase() + ' requests', (done) => {
        request(this.server)[method]('/')
          .set('Content-Type', 'application/json')
          .set('Content-Length', '15')
          .set('X-Expect-Method', method.toUpperCase())
          .send('{"user":"tobi"}')
          .expect(201, done)
      })
    })
  })

  describe('with type option', () => {
    before( () => {
      this.server = createServer({ limit: '1mb', type: 'application/octet-stream' })
    })

    it('should parse JSON', (done) => {
      request(this.server)
        .post('/')
        .set('Content-Type', 'application/json')
        .send('{"user":"tobi"}')
        .expect(200, '{"user":"tobi"}', done)
    })

    it('should parse x-www-form-urlencoded', (done) => {
      request(this.server)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send('user=tobi')
        .expect(200, '{"user":"tobi"}', done)
    })
  })

  describe('with verify option', () => {
    it('should apply to json', (done) => {
      var server = createServer({
        verify: (req, res, buf) => {
          console.log(buf)
          if (buf[0] === 0x20) throw new Error('no leading space')
        }
      })

      request(server)
        .post('/')
        .set('Content-Type', 'application/json')
        .send(' {"user":"tobi"}')
        .expect(403, 'no leading space', done)
    })

    it('should apply to urlencoded', (done) => {
      var server = createServer({
        verify: (req, res, buf) => {
          if (buf[0] === 0x20) throw new Error('no leading space')
        }
      })

      request(server)
        .post('/')
        .set('Content-Type', 'application/x-www-form-urlencoded')
        .send(' user=tobi')
        .expect(403, 'no leading space', done)
    })
  })
})

function createServer (opts) {
  var _bodyParser = bodyParser(opts)

  return http.createServer( (req, res) => {
    _bodyParser(req, res, (err) => {
      res.statusCode = err ? (err.status || 500) : 200
      res.end(err ? err.message : JSON.stringify(req.body))
    })
  })
}
