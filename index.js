'use strict'

var extend = require('util')._extend
var isCacheable = require('is-cacheable')

var _cache = {}

function hasCache (uri) {
  return !!_cache[uri]
}

function responseCallback (uri, callback) {
  return function onResponse (err, res, body) {
    if (err) {
      return callback(err)
    }

    if (isCacheable(res.headers)) {
      _cache[uri] = res
    }

    if (res.statusCode === 304) {
      var prevCached = _cache[uri]
      return callback(err, prevCached, prevCached.body)
    }

    callback(err, res, body)
  }
}

module.exports = function cache (request) {
  function requestWrapper (uri, options, callback) {
    if (typeof options === 'function') {
      callback = options
      options = {}
    } else if (!options) {
      options = {}
    }

    if (hasCache(uri)) {
      if (_cache[uri].headers.etag) {
        options.headers = extend({
          'If-None-Match': _cache[uri].headers.etag
        }, options.headers || {})
      } else {
        return callback(null, _cache[uri], _cache[uri].body)
      }
    }

    request(uri, options, responseCallback(uri, callback))
  }

  ['get', 'patch', 'post', 'put', 'head', 'del'].forEach(function (method) {
    requestWrapper[method] = request[method]
  })

  return requestWrapper
}

module.exports._flushCache = function () {
  _cache = {}
}
