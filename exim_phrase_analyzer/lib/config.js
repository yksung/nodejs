function define(name, value) {
	Object.defineProperty(exports, name, {
        value: value,
        enumerable : true
    });
}

define("JSON_PATH", {
	"INPUT_JSON" : "/data/exim_data/2_analyzing", // "INPUT_JSON" : "./2_analyzing/jsons",
	"BACKUP_JSON" : "/data/exim_data/2_analyzing/jsons_ok",	//대상 원문 백업 폴더 -> 일정시간 마다 삭제
	"PHRASE_JSON" : "/data/exim_data/2_analyzing/done",	//분석된 구문 json파일 위치
	"ERR_JSON" : "/data/exim_data/2_analyzing/error"		// BICA 분석 중 에러 발생시 원문 이동하는 패쓰
	});

define("THREAD_CNT", {
	"THREAD_ALWAYS" : 2,		// BICA 에 동시에 요청 날릴 횟수
	"THREAD_RETROACTIVE" : 10
	});

define("ANAL_TYPE", {	// 플래닝팀과 논의하여 정의??
	"TYPE_PEORIODIC": 'P',
	"TYPE_RETROACTIVE": 'R',

	"TYPE_FACTOR_KR": '요인단독',
	"TYPE_COMPANY_KR": '차주사단독',
	"TYPE_INDUSTRY_KR": '산업군단독',
	"TYPE_RET_COMPANY_KR": '추가_차주사단독',
	"TYPE_RET_INDUSTRY_KR": '추가_산업군단독'
	});

define("BICA_CONFIG", {
	"TIMEOUT": 600000,
	"RETRY_TIME": 3,
	"RETRY_INTERVAL": 5000,
	"BICA_IP": '211.39.140.217', // '211.39.140.106',
	"BICA_PORT": 25000, // 23001,
	"CONCEPT_ID": '1, 78, 79',
	"NUM_OF_TMF" : 20,		// THREAD_CNT 합이 NUM_OF_TMF 보다 같거나 작아야함
	"STOP_TIME" : '00',	//TMF 재시작을 위해 멈추는 시각
	"MAX_CONTENT_SIZE" : 1024*30
	});

define("LOG_MESSAGE", {
        "WARN_NO_FILES": 'WARN_NO_FILES',
        "ERR_READ_JSON": 'ERR_READ_JSON',
        "NO_ANALYZED_RESULT" : "NO_ANALYZED_RESULT",
        "NO_MATCHED_RESULT": 'NO_MATCHED_RESULT',
        "ERR_BICA_RESTAPI" : 'ERR_BICA_RESTAPI',
        "RETRY_INTERVAL": 5000
        });
