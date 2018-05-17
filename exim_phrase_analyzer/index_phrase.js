const cluster = require('cluster');
const express = require('express');
const config = require('./lib/config_dev');
const logger = require('./lib/logger');
const sleep = require('sleep');

const jsonPath = config.JSON_PATH.INPUT_JSON;
//const jsonOKPath = config.JSON_PATH.BACKUP_JSON;
const phrasePath = config.JSON_PATH.PHRASE_JSON;
const errorPath = config.JSON_PATH.ERR_JSON;

var sourcePaths = [
	jsonPath	//상시 P
	//소급 R
];

if (cluster.isMaster) {
	for (var idx = 0; idx < sourcePaths.length; idx++) {
        cluster.fork();
    }

    cluster.on('exit', function(worker, code, signal) {
        logger.error('[index] worker ' + worker.process.pid + ' died - code : ' + code + ', signal : ' + signal);
    });

    var app = express();
    app.set('port', 25000);
    // app.use(morgan('combined', {'stream': logger.stream}));
    app.get('/health', function(req, res) {
        res.send('OK');
    });

    var server = app.listen(app.get('port'), function() {
        const host = server.address().address;
        const port = server.address().port;

        logger.info('[index] Server Listening on port %d', port);
    });
}else{
	const fs = require('fs-extra');
	const async = require('async');
	const jsonAnalyzer = require('./lib/jsonAnalyzer_exim_phrase');

	const sourcePath = sourcePaths[cluster.worker.id - 1];
    logger.info('[index] Start Path ' + sourcePath);

	async.forever(
		function(next){
			if (sourcePath === jsonPath){
				const bicAnalyzer = require('./lib/bicAnalyzer');
				logger.debug('[index] Start 상시 구문분석 시작');
				// 소급/상시 여부 (R/P)
				const analType = 'P';
				async.waterfall([
					// Stepn #0. get ConceptID and set concept
					function(callback) {
						bicAnalyzer.setConceptId(analType, callback);
					},
					// Step #1. 뉴스 파일 가져오기
					function(callback) {
						logger.info('Step #1. 뉴스 파일 가져오기 ' + jsonPath);
						fs.readdir(jsonPath, function(err, files) {
							if (err) {
								callback(err);
							} else {
								logger.debug(files);
								if (files.length === 0){
									logger.warn(config.LOG_MESSAGE.WARN_NO_FILES);
									callback(config.LOG_MESSAGE.WARN_NO_FILES);
								}else{
									var retFiles = [];
									async.eachSeries(files, function(file,callback){
										var stats = fs.statSync(jsonPath + '/' + file);
										// logger.debug('stats.isFile : ' + stats.isFile());
										if (stats.isFile()){	// 파일인 경우
											retFiles.push(file);
										}
										callback(null);
									}, function(err){
										if (err){callback(err);
										}else{
											logger.debug('---------------------------------------------------');
											// logger.debug(retFiles);
											callback(null, retFiles);
										}
									});

								}
							}
						});
					},
					// Step #2. 각 파일 처리하기
					function(files, callback) {
						var rets = [];
						logger.info('Step #2. 각 파일 처리하기');
						// Step #1. readJson
						async.eachOfLimit(files, config.THREAD_CNT.THREAD_ALWAYS, function(file, idx, callback){
							var filePath = jsonPath + '/' +  file;
							async.waterfall([
								function(callback){
									logger.info('['+idx+']Step #2-1. 뉴스 읽기 : ' + filePath);
									fs.readJson(filePath, function(err, doc){
										if (err){
											logger.error(err);
											callback(config.LOG_MESSAGE.ERR_READ_JSON);
										}else{
											callback(null, doc);
										}
									});
								},
								function (doc, callback){
									logger.info('['+idx+']Step #2-2. BICA');
									var starttime = new Date();

									// ---- 00시인지 확인하여 10분 쉬기
									if (starttime.getHours() == config.BICA_CONFIG.STOP_TIME){
										sleep.sleep(10 * 60);
										starttime = new Date();
									}

									bicAnalyzer.restApi(config.BICA_CONFIG.CONCEPT_ID, doc, function(err, result){
										if (err){
											logger.error(err);
											callback(err);
										}else{
											var endtime = new Date();
											logger.debug('['+idx+']BICA elapsed time [' + (endtime - starttime)/1000 + ' second]');
											if (result.result.length == 0){
												logger.debug('['+idx+']'+config.LOG_MESSAGE.NO_ANALYZED_RESULT);
												callback(config.LOG_MESSAGE.NO_ANALYZED_RESULT);
											}else{
												logger.info('['+idx+']Step #2-2-1. jsonAnalyzer');
												var starttime1 = new Date();
												jsonAnalyzer.analyze(result, function(err, res){
													if (err) {
														logger.error(err);
														if(err == 'jsonResult is none.') {
															callback(null);
														} else if(err == 'json parse failed.') {
															callback(null);
														} else {
															callback(err);
														}
													} else {
														var endtime1 = new Date();
														logger.debug('['+idx+']jsonAnalyzer elapsed time [' + (endtime1 - starttime1)/1000 + ' second]');
														// logger.debug('['+idx+']res');
														// logger.debug(res);
														if (res.sentences.length === 0){
															logger.debug('['+idx+']' + config.LOG_MESSAGE.NO_MATCHED_RESULT);
															callback(config.LOG_MESSAGE.NO_MATCHED_RESULT);
														}else{
															callback(null, res.sentences);
														}
													}
												});
											}
										}
									});
								},
								function(sentences, callback){
									// write
									logger.info('['+idx+']Step #2-3. write phrase json');
									var ret = [];
									async.eachSeries(sentences, function(sentence, callback){
										ret = ret.concat(sentence.news);
										callback(null);
									}, function(err){
										if (err){ callback(err);
										}else{
											const fileName = phrasePath + '/' +  'S-' + file;
											fs.ensureDir(phrasePath, function(err){
												if (err){callback(err);
												}else{
													fs.writeFile(fileName, JSON.stringify({'sentences' : ret}), function(err){
														if (err){callback(err);
														}else{
															logger.debug('['+idx+']Step #2-3. write file : ' + fileName);
															callback(null);
														}
													});
												}
											});
										}
									});
								}
							]
							, function(err){
								// move json
								if (err == null || err === config.LOG_MESSAGE.NO_ANALYZED_RESULT || err === config.LOG_MESSAGE.NO_MATCHED_RESULT){
									logger.info('['+idx+']Step #2-4. remove original json');
									//fs.move(filePath, filePath.replace(jsonPath, jsonOKPath), {overwrite:true}, callback);
									fs.remove(filePath, callback);
								}else if (err == config.LOG_MESSAGE.ERR_BICA_RESTAPI){
									fs.ensureDir(phrasePath, function(err){
										if (err){
											callback(err);
										}else{
											fs.move(filePath, filePath.replace(jsonPath, jsonOKPath), {overwrite:true}, callback);
										}
									});
								}else{
									callback(err);
								}
							});
						}, function(err){
							if (err){
								callback(err);
							}else{
								logger.debug('All files processed.');
								//-- 수집 원본 데이터 삭제처리
								callback(null);
							}
						});
					}
				], function(err) {
					if (err){
						logger.error('sleep for 10 mins');
						sleep.sleep(10 * 60);
						next(null);
					}else{
						logger.info('sleep for 10 mins');
						sleep.sleep(10 * 60);
						next(null);
					}
				});

			}
		}, function (err){
			  if (err) {
                logger.error('[index] ' + err);
				/*
				// slack alert
				var slackMessage = {
						color: 'danger',
						title: 'index',
						value: '[index] application process failed : ' + err
				};

				slack.sendMessage(slackMessage, function(err) {
						if (err) {
								logger.error(err);
								cluster.worker.kill(-1);
						} else {
								logger.info('[index] Successfully push message to Slack');
								cluster.worker.kill(-1);
						}
				});*/
				logger.error(err);
				cluster.worker.kill(-1);
            } else {
				logger.error('[index] Module unexpectedly finished.');
				cluster.worker.kill(0);
            }
		}
	);

}




/*
var callback_cnt = 0;
var doc_array = [];

if (cluster.isMaster) {
	var sendCnt = 0;
	console.log('callback_cnt  isMaster1 : ' + callback_cnt);
	// 클러스터 워커 프로세스 포크
	for (var idx = 0; idx < config.THREAD_CNT.THREAD_ALWAYS; idx++) {
		cluster.fork();
	}
	cluster.on('exit', function(worker, code, signal) {
		console.log('[index] worker ' + worker.process.pid + ' died - code : ' + code + ', signal : ' + signal);
		// logger.error('[index] worker ' + worker.process.pid + ' died - code : ' + code + ', signal : ' + signal);
	});

	async.waterfall([
		// Step #1. 뉴스 파일 가져오기
		function(callback) {
			const resultPath = config.JSON_PATH.INPUT_JSON;
			fs.readdir(resultPath, function(err, files) {
				if (err) {
					callback(err);
				} else {
					callback(null, files);
				}
			});
		},
		// Step #2. 각 파일 처리하기
		function(files, callback){
			callback_cnt = 0;
			sendCnt = 0;
			console.log('callback_cnt isMaster2 : ' + callback_cnt);
			async.eachOfLimit(files, config.THREAD_CNT.THREAD_ALWAYS, function(file, idx, callback){
				var worker_id = (idx%config.THREAD_CNT.THREAD_ALWAYS)+1;
				fs.readJson(file, function(err, doc) {
					cluster.workers[worker_id].send({'file':file, 'doc': doc, from: 'master', id : cluster.workers[worker_id].id});
					console.log('마스터가 ' + worker_id + 'worker에게 메세지 보냄');
					sendCnt++;
					cluster.on('message', function(message) {
						console.log('마스터가 ' + cluster.workers[worker_id].process.pid + ' 워커로 부터 받은 메세지 : ' + message);
					});
					callback(null);
				});
			}, function(err){
				if (err){
					callback(err);
				}else{
					console.log('sendCnt' + sendCnt);
					if (sendCnt == files.length){
						callback(null);
					}else{
						console.log('master send message and wait....' + sendCnt);
					}
				}
			});
		}
	]
	, function(err) {
		if (err) {
			console.log(err);
			//process.exit(-1);
		} else {
			console.log("Master Finished!!");
			console.log(doc_array);
			//process.exit(0);
		}
	});
} else {
	//마스터가 보낸 메시지 처리
	process.on('message', function(message) {
		async.waterfall([
			function (callback){
				console.log(process.pid + 'worker가 마스터에게 받은 메시지 : ' + message.id);
				console.log(message);
				doc_array.push(message.file);
				//마스터에게 메시지 보내기
				process.send(process.pid + ' pid 를 가진 워커가 마스터에게 보내는 메시지' + message.file);
				console.log(process.pid + 'worker send message');
				callback_cnt++;
				console.log(process.pid + 'worker / callback_cnt : ' + callback_cnt);
				callback(null);
			}
		]
		, function(err){
			console.log(err);
			console.log("Worker Finished!!");
			console.log(doc_array);
		});

	});
}

*/
