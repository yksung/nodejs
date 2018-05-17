const async = require('async');
const logger = require('./logger');
const md5 = require('md5');

var jsonAnalyzer = (function() {
	const FACTOR = 'factor';
	const COMPANY = 'company';
	const INDUSTRY = 'industry';
	// {'doc_id': doc.doc_id, 'result':result.result}
    var analyze = function(results, callback) {
		//깨진 문자에 의한 모듈이 죽는 것을 방지 하기 위해 Catch
		try {
				var analysisResult = {};
				var doc_id = results.doc_id;
				logger.debug('[jsonAnalyzer] Step #0 : sentence 의 index 순서로 정렬');
				results = results.result.sort(function(a, b){
					return a.sentence.index - b.sentence.index;
				});

				if (results.length > 0) {
					logger.debug('[jsonAnalyzer] Step #1 : 요인 Map 만들기');
					var factorMap = new Map();
					var factorKeys = [];
					// [sentence>index + '_' + matched_text>begin, {major/mid/minor concept, factor, sentence, matched_text}]
					for (idx2 in results) {
						if (results[idx2].lsp.includes(FACTOR)){
							// lsp 가 요인인 경우 요인 컨셉 체계 지정
							var regex = new RegExp("\\$"+FACTOR+"\=\@(.*)\\+");
							var factor_ret = results[idx2].lsp.match(regex);
							var factor = "";
							if (factor_ret != null){
								factor=factor_ret[1];
							}
							var factorObj = {
								'factor' : factor,
								'sentence': results[idx2].sentence,
								'matched_text': results[idx2].matched_text,
								'variables' : results[idx2].variables,
								'factor_category1' : '',
								'factor_category2' : '',
								'factor_category3' : ''
							}
							// logger.debug(results[idx2].variables);

							var concept = results[idx2].info.conceptlabel.split(' > ');
							var factor_category1 = '';
							var factor_category2 = '';
							var factor_category3 = '';
							if (concept.length >= 2){
								factor_category1 = concept[1];
								factorObj.factor_category1 = factor_category1;
							}
							if (concept.length >= 3){
								factor_category2 = concept[2];
								factorObj.factor_category2 = factor_category2;
							}
							if (concept.length >= 4){
								factor_category3 = concept[3];
								factorObj.factor_category3 = factor_category3;
							}
							factorMap.set(results[idx2].sentence.index + '_' + results[idx2].matched_text.begin+ '_' + factor , factorObj);
							factorKeys.push(results[idx2].sentence.index + '_' + results[idx2].matched_text.begin+ '_' + factor);

							logger.debug('[jsonAnalyzer] ' + results[idx2].sentence.index + '_' + results[idx2].matched_text.begin+ '_' + factor);
							// logger.debug(factorObj);
						}
					}

					analysisResult.sentences = [];

					for (idx3 in results) {
						if (!results[idx3].lsp.includes(FACTOR)){
							var thisSentenceIndex = results[idx3].sentence.index;
							var thisFactorMapKey = '';

							if (results[idx3].lsp.includes(COMPANY)){
								logger.debug('[jsonAnalyzer] Step #2 : 요인과 차주사 매칭하기 sentece.index : ' + thisSentenceIndex);						
								// lsp 가 차주사인 경우
								var regex = new RegExp("\\$"+COMPANY+"\=\@(.*)\\+");
								var target_ret = results[idx3].lsp.match(regex);
								var company = "";
								if (target_ret != null){
									company=target_ret[1];
								}

								factorMap.forEach(function(value, key) {
									// logger.debug('key : ' + key + '/ this_sentence_index : ' +results[idx3].sentence.index);
									if (key.split('_')[0] == results[idx3].sentence.index ){
										// logger.debug(value);
										thisFactorMapKey = key;
										// 요인과 차주/산업군의 sentence > offset + matched_text > begin 값을 비교하여 차주/산업군의 offset 이 요인 offset 보다 앞서 있는 경우만 추출
										var target_begin_offset = results[idx3].sentence.offset + results[idx3].matched_text.begin;
										var target_end_offset = results[idx3].sentence.offset + results[idx3].matched_text.end;
										var factor_begin_offset = value.sentence.offset + value.matched_text.begin;
										var factor_end_offset = value.sentence.offset + value.matched_text.end;
										
										if (target_begin_offset < factor_begin_offset && target_end_offset >= factor_begin_offset  && target_end_offset <= factor_end_offset ){
											var matched_text = results[idx3].matched_text.string;
											var variables = results[idx3].variables;
											var factor_variable = value.variables[0].value;
											logger.debug('[jsonAnalyzer] company : ' + company);

											//if (matched_text.toUpperCase().indexOf(factor_variable.toUpperCase()) != -1){											
											// 차주/산업군의 매칭문장을 요인의 matched_text > begin 까지 절사
											var matched_text_front = calByte.cutByteLength(matched_text, (value.matched_text.begin - results[idx3].matched_text.begin));
											var matched_text_total = matched_text_front.substring(0,matched_text_front.length +1 ) + value.matched_text.string;												
											logger.debug('matched_text_total : ' + matched_text_total);
											
											var index_factor_in_matched_text_total = matched_text_total.toUpperCase().indexOf(factor_variable.toUpperCase());
											var index_target_in_matched_text_total = matched_text_total.toUpperCase().indexOf(variables[0].value.toUpperCase());
											
											logger.debug('[jsonAnalyzer] index_factor_in_matched_text_total : ' + index_factor_in_matched_text_total);
											logger.debug('[jsonAnalyzer] index_target_in_matched_text_total : ' + index_target_in_matched_text_total);
											
											// 매칭문장 내에서 차주/산업군 요인이 요인보다 앞에 있다면
											if (index_target_in_matched_text_total < index_factor_in_matched_text_total){
												logger.debug('[jsonAnalyzer] Step #3 : 매칭문장 만들기' );
												// 분석 대상
												var sentence = {
													'text': results[idx3].sentence.string,
													'offset': results[idx3].sentence.offset,
													'news': [{
														'phrase_id' : md5(doc_id+results[idx3].sentence.index+results[idx3].matched_text.begin+value.factor+company.split('_')[0]+company.split('_')[1]),
														'doc_id' : doc_id,
														'matched_text': matched_text_total, // substringMatchedText + value.matched_text.string,
														'sentence': results[idx3].sentence.string,
														'target_name' : company.split('_')[0],
														'corporate_number' : company.split('_')[1],
														'factor_category1' : value.factor_category1,
														'factor_category2' : value.factor_category2,
														'factor_category3' : value.factor_category3,
														'factor' : value.factor
													}]
												};	
												
												var findSentenceIdx = -1;
												for (idx4 in analysisResult.sentences) {
													if (sentence.offset == analysisResult.sentences[idx4].offset) {
														logger.debug('[jsonAnalyzer] findSentenceIdx : ' + findSentenceIdx);
														findSentenceIdx = idx4;
														break;
													}
												}
												
												// 문장 배열에 현재 문장과 같은 offset 의 문장이 없는 경우
												if (findSentenceIdx == -1) {    
													// 현재 문장을 문장 배열에 push
													analysisResult.sentences.push(sentence);
												} else {
													// 이미 추출된 category일 경우 Pass
													var isExist = false;

													//현재 해당 문장
													if (analysisResult.sentences[findSentenceIdx].news) {
														for (idx5 in analysisResult.sentences[findSentenceIdx].news) {
															var tmp_category = analysisResult.sentences[findSentenceIdx].news[idx5].factor;
															var tmp_target = analysisResult.sentences[findSentenceIdx].news[idx5].target_name;
															logger.debug('[jsonAnalyzer] tmp_target : ' + tmp_target + ' / tmp_category : ' + tmp_category);
															if(tmp_category == sentence.news[0].factor && tmp_target == sentence.news[0].target_name) {
																isExist = true;
																// 같은 문장 내에서 같은 요인 산업군/차주 일 경우 매칭 문장 길이가 긴 것을 결과로 함.
																if (sentence.news[0].matched_text.length > analysisResult.sentences[findSentenceIdx].news[idx5].matched_text.length){
																	analysisResult.sentences[findSentenceIdx].news[idx5].matched_text = sentence.news[0].matched_text;
																}
																break;
															}
														}
													}

													 if(isExist) {
													 	logger.debug('[jsonAnalyzer] exist_category');
													 	//continue;
													 } else {
														// 현재 문장의 news 배열에 push
														logger.debug('[jsonAnalyzer] 현재 문장의 news 배열에 push');
														analysisResult.sentences[findSentenceIdx].news.push(sentence.news[0]);
													 }
													// 이미 추출된 category일 경우 Pass
												}
											}
										}
									} 
									// End of sentence index check
								});
							}
							
							if (results[idx3].lsp.includes(INDUSTRY)){
								logger.debug('[jsonAnalyzer] Step #2 : 요인과 산업군 매칭하기 results['+idx3+'] sentece.index : ' + thisSentenceIndex);						
								// lsp 가 산업군인 경우
								var regex = new RegExp("\\$"+INDUSTRY+"\=\@(.*)\\+");
								var target_ret = results[idx3].lsp.match(regex);
								var industry = "";
								if (target_ret != null){
									industry=target_ret[1];
								}

								factorMap.forEach(function(value, key) {
									// logger.debug('[jsonAnalyzer] key : ' + key + '/ this_sentence_index : ' +results[idx3].sentence.index);
									// 요인과 해당 차주/산업군이 같은 문장인지 확인
									if (key.split('_')[0] == results[idx3].sentence.index ){
										// logger.debug(value);
										thisFactorMapKey = key;
										// 요인과 차주/산업군의 sentence > offset + matched_text > begin 값을 비교하여 차주/산업군의 offset 이 요인 offset 보다 앞서 있는 경우만 추출
										var target_begin_offset = results[idx3].sentence.offset + results[idx3].matched_text.begin;
										var target_end_offset = results[idx3].sentence.offset + results[idx3].matched_text.end;
										var factor_begin_offset = value.sentence.offset + value.matched_text.begin;
										var factor_end_offset = value.sentence.offset + value.matched_text.end;

										if (target_begin_offset < factor_begin_offset && target_end_offset >= factor_begin_offset  && target_end_offset <= factor_end_offset ){
											var matched_text = results[idx3].matched_text.string;
											var variables = results[idx3].variables;
											var factor_variable = value.variables[0].value;
											logger.debug('[jsonAnalyzer] industry : ' + industry);

											//if (matched_text.toUpperCase().indexOf(factor_variable.toUpperCase()) != -1){
												// 차주/산업군의 매칭문장을 요인의 matched_text > begin 까지 절사
											var matched_text_front = calByte.cutByteLength(matched_text, (value.matched_text.begin - results[idx3].matched_text.begin));
											var matched_text_total = matched_text_front.substring(0,matched_text_front.length +1 ) + value.matched_text.string;
											
											var index_factor_in_matched_text_total = matched_text_total.toUpperCase().indexOf(factor_variable.toUpperCase());
											var index_target_in_matched_text_total = matched_text_total.toUpperCase().indexOf(variables[0].value.toUpperCase());

											if (index_target_in_matched_text_total < index_factor_in_matched_text_total){
												logger.debug('[jsonAnalyzer] Step #3 : 매칭문장 만들기' );
												
												var sentence = {
													'text': results[idx3].sentence.string,
													'offset': results[idx3].sentence.offset,
													'news': [{
														'phrase_id' : md5(doc_id+results[idx3].sentence.index+results[idx3].matched_text.begin+value.factor+industry), 
														'doc_id' : doc_id,
														'matched_text': matched_text_total, // substringMatchedText + value.matched_text.string,
														'sentence': results[idx3].sentence.string,
														'target_name' : industry,
														'corporate_number' : '',
														'factor_category1' : value.factor_category1,
														'factor_category2' : value.factor_category2,
														'factor_category3' : value.factor_category3,
														'factor' : value.factor
													}]
												};	
												
												var findSentenceIdx = -1;
												for (idx4 in analysisResult.sentences) {
													if (sentence.offset == analysisResult.sentences[idx4].offset) {
														logger.debug('[jsonAnalyzer] findSentenceIdx : ' + findSentenceIdx);
														findSentenceIdx = idx4;
														break;
													}
												}
												
												// 문장 배열에 현재 문장과 같은 offset 의 문장이 없는 경우
												if (findSentenceIdx == -1) {    
													// 현재 문장을 문장 배열에 push
													analysisResult.sentences.push(sentence);
												} else {
													// 이미 추출된 category일 경우 Pass
													var isExist = false;

													//현재 해당 문장
													if (analysisResult.sentences[findSentenceIdx].news) {
														for (idx5 in analysisResult.sentences[findSentenceIdx].news) {
															var tmp_category = analysisResult.sentences[findSentenceIdx].news[idx5].factor;
															var tmp_target = analysisResult.sentences[findSentenceIdx].news[idx5].target_name;
															logger.debug('[jsonAnalyzer] tmp_target : ' + tmp_target + ' / tmp_category : ' + tmp_category);
															if(tmp_category == sentence.news[0].factor && tmp_target == sentence.news[0].target_name) {
																isExist = true;
																// 같은 문장 내에서 같은 요인 산업군/차주 일 경우 매칭 문장 길이가 긴 것을 결과로 함.
																if (sentence.news[0].matched_text.length > analysisResult.sentences[findSentenceIdx].news[idx5].matched_text.length){
																	analysisResult.sentences[findSentenceIdx].news[idx5].matched_text = sentence.news[0].matched_text;
																}
																break;
															}
														}
													}

													 if(isExist) {
													 	logger.debug('[jsonAnalyzer] exist_category');
													 	//continue;
													 } else {
														// 현재 문장의 news 배열에 push
														logger.debug('[jsonAnalyzer] 현재 문장의 news 배열에 push');
														analysisResult.sentences[findSentenceIdx].news.push(sentence.news[0]);
													 }
													// 이미 추출된 category일 경우 Pass
												}
											}
										}
									} 
									// End of sentence index check
								});
								// End of factorMap.forEach
							}
							// true return 시 멈춤
							var isDelete = -1;
							for (idx4 in factorKeys){
								var key = factorKeys[idx4];
								if (Number(key.split('_')[0]) < Number(results[idx3].sentence.index) ){
									// logger.debug(Number(key.split('_')[0]));
									// logger.debug(Number(results[idx3].sentence.index));
									factorMap.delete(key);
									isDelete = idx4;
									logger.debug('[jsonAnalyzer] 지난 sentence index에 해당하는 요인 맵에서 삭제 / isDelete:' + isDelete +' / key:' + key);
								}
							}

							if (isDelete != -1){
								factorKeys.splice(isDelete+1); //factorKeys.splice(isDelete, 1);
								isDelete = -1;
								logger.debug(factorKeys);
							}
							/*logger.debug(factorKeys);
							factorKeys = factorKeys.filter(function(key, index, array){
								var skip = true;
								if (Number(key.split('_')[0]) < Number(results[idx2].sentence.index) ){
									logger.debug(Number(key.split('_')[0]));
									logger.debug(Number(results[idx2].sentence.index));
									logger.debug('지난 sentence index에 해당하는 요인 맵에서 삭제');
									factorMap.delete(key);
									skip = false;
								}else{
									skip = true;
								}
								return skip;
							});
							logger.debug(factorKeys);*/
						}				
						/*
						if (thisFactorMapKey !== '' ){
							logger.debug('지난 sentence index에 해당하는 요인 맵에서 삭제');
							factorMap.delete(thisFactorMapKey);
							thisFactorMapKey = '';
						}*/
						/*factorKeys = factorKeys.filter(function(key, index, array){
							var skip = true;
							if (Number(key.split('_')[0]) < Number(results[idx2].sentence.index) ){
								logger.debug(Number(key.split('_')[0]));
								logger.debug(Number(results[idx2].sentence.index));
								logger.debug('지난 sentence index에 해당하는 요인 맵에서 삭제');
								factorMap.delete(key);
								skip = false;
							}else{
								skip = true;
							}
							return skip;
						});*/
					}	
					// End of for
				} else {
					logger.debug('[jsonAnalyzer] result length is 0!!');
				}
				logger.debug('[jsonAnalyzer] <<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<<');
				//logger.debug(analysisResult);
				callback(null, analysisResult);
			//}
		} catch (e) {
			callback('[jsonAnalyzer] json parse failed.');
		}
    };


/*
matched_text, sentence의 offset, begin, end 값을 연산하기 위한 byte 계산 함수
*/
	var calByte = {
		getByteLength : function(s) {
			if (s == null || s.length == 0) {
				return 0;
			}
			var size = 0;
			for ( var i = 0; i < s.length; i++) {
				size += this.charByteSize(s.charAt(i));
			}
			return size;
		},
			
		cutByteLength : function(s, len) {
			if (s == null || s.length == 0) {
				return 0;
			}
			var size = 0;
			var rIndex = s.length;
			for ( var i = 0; i < s.length; i++) {
				size += this.charByteSize(s.charAt(i));
				if( size == len ) {
					rIndex = i + 1;
					break;
				} else if( size > len ) {
					rIndex = i;
					break;
				}
			}

			return s.substring(0, rIndex);
		},

		charByteSize : function(ch) {
			if (ch == null || ch.length == 0) {
				return 0;
			}
			var charCode = ch.charCodeAt(0);
			var ret = 0;
			ret = (charCode >> 11 ? 2 : 1);
			return ret;

/*			if (charCode <= 0x00007F) {
				return 1;
			} else if (charCode <= 0x0007FF) {
				return 2;
			} else if (charCode <= 0x00FFFF) {
				return 3;
			} else {
				return 4;
			}*/
		}
	};

	function getByteLength(s,b,i,c) {
		for (b=i=0;c=s.charCodeAt(i++);b+=c>>11?3:c>>7?2:1);
		return b;
	}


    return {
        analyze: analyze
    };
})();

if (exports) {
  module.exports = jsonAnalyzer;
}

