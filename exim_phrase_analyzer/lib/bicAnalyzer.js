var bicAnalyzer = (function() {
  const logger = require('./logger');
  //	const slack = require('../lib/slack');
  const config = require('../lib/config_dev');
  const async = require('async');
  const http = require('http');
  const querystring = require('querystring');
  const mariaDBDao = require('../dao/mariaDBDao');
  // require('string-format-js');

  const TIMEOUT = config.BICA_CONFIG.TIMEOUT;

  const RETRY_TIME = config.BICA_CONFIG.RETRY_TIME; // async.retry
  const RETRY_INTERVAL = config.BICA_CONFIG.RETRY_INTERVAL;
  const BUF_SIZE = config.BICA_CONFIG.MAX_CONTENT_SIZE;

  const bicHost = {
    host: config.BICA_CONFIG.BICA_IP,
    port: config.BICA_CONFIG.BICA_PORT
  }

  var setConceptId = function(analType, callback) {
    mariaDBDao.selectConceptIds(analType, function(err, results) {
      if (err) {
        callback('ERR_DB_CONCEPT');
      } else {
        bicHost.concept_id = results;
        logger.debug(bicHost);
        callback(null);
      }
    });
  }

  async function processArray(callback, array) {
    const promises = array.map(task);

    Promise.all(promises).then(function(values) {
      console.log("All done!!! " + values);
      //callback(null, results);
    });
  }

  var task = function(obj) {

    var iPromise = null;

    if (obj.cont === "") {
      //callback(null, {'doc_id': obj.doc.doc_id,'result': []});
      iPromise = new Promise(function(resolved) {
        resolved({
          'doc_id': obj.doc.doc_id,
          'result': []
        });
      });

    } else {
      var formData = "data=" + obj.cont + "&conceptID=" + obj.concept_id;

      var byteLength = Buffer.byteLength(formData);
      console.log("Content-length >>>>>>> " + byteLength);

      var options = {
        host: bicHost.host,
        port: bicHost.port,
        path: '/request.is',
        method: 'POST',
        //path: '/request.is?data=' +content + "&conceptID=" + bicHost.concept_id, method:'GET',
        headers: {
          "User-Agent": "Wget/1.12 (linux-gnu)",
          "Content-Type": "application/x-www-form-urlencoded",
          "Content-Length": byteLength
          //'Transfer-Encoding': 'chunked'
        }
      };

      var req = new http.ClientRequest(options, function(res) {
        res.setEncoding('utf8');
        var ret = "";
        res.on('data', function(chunk) {
          ret += chunk;
        });
        res.on('end', function() {
          if (res.statusCode === 200) {
            try { //
              ret = ret.replace(/\n/g, "")
                .replace(/\'/g, "\'")
                .replace(/\&/g, "\&")
                .replace(/\r/g, "")
                .replace(/\t/g, "")
                .replace(/\b/g, "")
                .replace(/\f/g, "")
                .replace(/\",\"index\"/g, ',\"index\"')
                .replace(/\"/g, '\"')
                .replace(/[\u0000-\u0019]+/g, "")
                .replace(/[\u001A]+/g, "");

              var result = JSON.parse(ret);
              var statusCode = result.stauts.code;
              if (statusCode === 200 || statusCode === "200") {
                iPromise = new Promise(function(resolved) {
                  resolved({
                    'doc_id': doc.doc_id,
                    'result': result.result
                  });
                });
              } else {
                // ------result.stauts.code 607 : All TMF daemon busy //------result.stauts.code 900 : Unknown error occured
                logger.debug(result.stauts.msg);
                logger.debug('[bicAnalyzer] retry...');
                //callback(result.stauts.msg, null);
                iPromise = new Promise(function(resolved, rejected) {
                  rejected(result.stauts.msg);
                });
              }
            } catch (e) {
              logger.error("[bicAnalyzer] json parse error : " + e);
              // logger.debug(ret);
              //callback('ERR_JSON_PARSE_FAILED ' + obj.doc.doc_id);
              iPromise = new Promise(function(resolved, rejected) {
                rejected('ERR_JSON_PARSE_FAILED ' + obj.doc.doc_id);
              });
            }
          } else {
            logger.debug("[bicAnalyzer] BICA status error : " + res.statusCode);
            //callback(res.statusCode, null);
            iPromise = new Promise(function(resolved, rejected) {
              rejected(res.statusCode);
            });
          }
        });
      });

      req.write(formData);
      // req.write(postData, 'utf8');
      req.setTimeout(TIMEOUT, function() {
        logger.debug('request timed out');
        // callback('request timed out');
        iPromise = new Promise(function(resolved, rejected) {
          rejected('request timed out');
        });
      }); //ms
      req.on('error', function(err) {
        return new Promise(function(resolved, rejected) {
          rejected('[bicAnalyzer] problem with request : ' + err);
        })
      });
      req.end();
    }

    return iPromise;
  };

  var restApi = function(concept_id, doc, callback) {
    //http://[Interface Server IP]:[InterfaceServer Port]/request.is?data=[sentence]&conceptID=[최상위컨셉아이디]
    var attachs = "";
    if (typeof doc.attachs !== "undefined") {
      attachs = doc.attachs[0].content;
      doc.attachs.forEach(function(element, index, array) {
        // attachs += element.content.replace('/\\n/gi',' ') + ' ';
        attachs += element.content + ' ';
      });
    }
    const content = (typeof doc.doc_content === "undefined" ? "" : doc.doc_content);

    var buffer = new Buffer(attachs + ' ' + content);
    console.log("buffer 사이즈 " + buffer.length);
    var bufNumber = buffer.length / BUF_SIZE;
    console.log("buffer 개수 " + bufNumber);

    var buf = new Buffer(BUF_SIZE);
    var bufferArr = new Array(Math.ceil(bufNumber));
    for (var i = 0; i < bufNumber; i++) {
      bufferArr[i] = {
        "callback": callback,
        "concept_id": concept_id,
        "doc": doc,
        "cont": buffer.slice(i * BUF_SIZE, i * BUF_SIZE + BUF_SIZE)
      };
    }

    console.log(bufferArr);
    Promise.all(bufferArr.map(task)).then(function(resolvedValues) {
      console.log("All done!!! " + resolvedValues);

      if (resolvedValues.length > 0) {
        var results = {
          doc_id: resolvedValues[0].doc_id,
          result: []
        };
        for (var i = 0; i < resolvedValues.length; i++) {
          results.result.push(resolvedValues[i].result);
        }
      }

      callback(null, results);
    }).catch(function(rejectedValues){
      callback(rejectedValues, null);
    });

    async.retry({
      times: RETRY_TIME,
      interval: RETRY_INTERVAL
    }, task, function(err, result) {
      //logger.debug(err);			logger.debug(result);
      if (err) {
        logger.error('[bicAnalyzer] ');
        logger.error(err);
        callback(config.LOG_MESSAGE.ERR_BICA_RESTAPI);

      } else {
        //callback(null);
        logger.debug('[bicAnalyzer] ');
        callback(null, result); //-----callback was already called...?error
      }
    });

  };

  return {
    restApi: restApi,
    setConceptId: setConceptId
  };
})();

if (exports) {
  module.exports = bicAnalyzer;
}
