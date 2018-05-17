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

	function GetByteLength(s,b,i,c) {
		for (b=i=0;c=s.charCodeAt(i++);b+=c>>11?3:c>>7?2:1);
		return b;
	}
	//-------
	function getByteLength2(s,b,i,c){
		for (b = i = 0; c = s.charCodeAt(i++); b += c >> 11 ? 2 : 1);
		return b;
	}

/*
var text = '박원순' ;
console.log(GetByteLength(text));
console.log(getByteLength2(text));
console.log(calByte.getByteLength(text));
console.log('------------------------------');
console.log(calByte.charByteSize('박'));

var text = '박원순 서울' ;
console.log(GetByteLength(text));
console.log(getByteLength2(text));
console.log(calByte.getByteLength(text));
*/

var factorMap = new Map();

factorMap.set('1' , {val:'일'});
factorMap.set('2' , {val:'이'});
factorMap.set('3' , {val:'삼'});
console.log( factorMap.entries());

var keyArr = ['1', '2','3'];
console.log('---------------');
keyArr.filter(function(value, index){
	var skip = false;
	if (value==2){
		console.log('skip');
		skip = true;
		factorMap.delete(value);
	}else{
		console.log('key : ' + value);
	}
	return skip;
});
console.log('---------------');

factorMap.forEach(function (item, key, mapObj) {
    console.log(item);
});

/*
for (var [key, value] of factorMap.entries()) {
  console.log(key + ' = ' + value);
}

factorMap.some(function(value, key){
	var skip = false;
	console.log(value);
	console.log(key);
	if (key==2){
		skip = true;
	}
	return skip;
});*/

//backup
//koreaexim_1308_D-1-201804230812-27881.json
const fs = require('fs-extra');

fs.writeFile('/data/exim_module/phrase_analyzer/logs/temp.json', JSON.stringify([]), function(err){
	console.log(err);
});
/*	
var filePath = '/data/exim_data/2_analyzing/backup'

var stats = fs.statSync(filePath);
console.log(stats);
console.log(stats.isFile());

console.log('## Read json File');
fs.readJson(filePath, function(err, doc){
	if (err){
		console.log(err);
		console.log('ERR_READ_JSON');
	}else{
		console.log('## get json');
		console.log(doc);
	}
});*/