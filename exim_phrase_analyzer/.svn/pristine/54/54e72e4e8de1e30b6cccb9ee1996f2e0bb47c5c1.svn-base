var urlConverter = require('./urlConverter');

var depth_nm = urlConverter.convertClubUrl({
	url : 'http://section.cafe.naver.com/SearchArticleResult.nhn?cafeUrl=disel&articleId=20082295&query=%EC%8A%A4%ED%8C%8C%ED%81%AC%2B%EC%A0%84%EA%B8%B0%EC%B0%A8',
		depth1_nm : '포털', depth2_nm : '카페', depth3_nm : '네이버'
}
);

if (typeof depth_nm.depth1_nm != 'undefined'){

											console.log(depth_nm);
										}else{ console.log('no result')}


var concept = "0824_추가 > 인테리어interiro > 시트I > 시트";

var concept_arr = concept.split('>');
console.log(concept_arr);
if (concept_arr.length >=2){
									var major_category = concept_arr[1].trim();
									//sentence.emotions[0].major_concept = major_category;
									//sentence.emotions[0].mid_concept = major_category;
									console.log('major_concept' + major_category);
								}
								if (concept_arr.length >=3){
									var mid_category = concept_arr[2].trim();
									//sentence.emotions[0].mid_concept = mid_category;
									//sentence.emotions[0].minor_concept = mid_category;
									console.log('mid_concept' + mid_category);
								}
								if (concept_arr.length >=4){
									var category = concept_arr[3].trim();
									//sentence.emotions[0].minor_concept = category;
									console.log('minor_concept' + category);
								}
									

/*
"info" : {
                        "lspid" : 1472,
                        "conceptid" : "1 > 601 > 661 > 665",
                        "conceptcodes" : "0824_추가 > 인테리어 > 시트I > 시트",
                        "conceptlabel" : "0824_추가 > 인테리어 > 시트I > 시트",
                        "lspattributes" : [
                                {"id" : 1, "name" : "일반"}
                        ],
                        "lspweight" : 1
                },
                "sentence" : {
                        "string" : "- 통풍시트 부재, 뒷열 열선시트 부재, 크루즈 컨트롤 부재 : 가격대비 옵션에서 너무 빠져있다는 생각이 듭니다.",
                        "offset" : 2072,
                        "index" : 31,
                        "neighborhoods" : [
                        ]
                },
                "matched_text" : {
                        "string" : ", 뒷열 열선시트 부재, 크루즈",
                        "begin" : 15,
                        "end" : 43
                },
                "variables" : [
                ],
                "categories" : [
                {
                        "label" : "시트",
                        "entries" : [
                                "시트[L]"
                        ]
                }
                ]
        }



*/

const posnegTag = require('./posnegTag');
posnegTag.restApi({
	"phrase_id": "2052f76ddd4fcb31095f4328bf978cfc",
	"doc_id": "67d48eb9b7186f0ba36dd5a042d8eed7",
	"matched_text": "아시아 수주도 35.5% 감소한 127억 달러에\n 불과  해외건설 수주의 양대 시장인 중동 및 아시아 시장에서 극심한 수주 부진에 빠짐 2016년 플랜트 수주액은 전년대비 50% 감소한 132억 달러에",
	"sentence": "아시아 수주도 35.5% 감소한 127억 달러에 불과  해외건설 수주의 양대 시장인 중동 및 아시아 >시장에서 극심한 수주 부진에 빠짐 2016년 플랜트 수주액은 전년대비 50% 감소한 132억 달러에 불과했으며,",
	"company_id": "",
	"borrower": "해외건설",
	"major_concept": "산업위험",
	"mid_concept": "시황침체",
	"minor_concept": "수출경기악화",
	"factor": "수주부진"
});