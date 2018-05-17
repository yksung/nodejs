const mysqlPool = require('../dao/mariaPool');
const logger = require('../lib/logger');
const config = require('../lib/config_dev');
const async = require('async');

var mariaDBDao = (function() {

	var selectConceptIds = function (analType, callback){
		var params = [];
		mysqlPool.getConnection('bicanalyzer', function(err, conn) {
			var result = {};
			// 상시 : 요인/차주/산업군
			// 소급 : 요인/ 추가차주
			var sql = "select id, name from wn_tmf_tbl_concept "
					+ " where parent_id = '-1' ";
			sql += " and name in (";
			if (analType === config.ANAL_TYPE.TYPE_PEORIODIC){
				// 상시
				sql += " ?,?,? ";
				params.push( config.ANAL_TYPE.TYPE_FACTOR_KR);
				params.push( config.ANAL_TYPE.TYPE_COMPANY_KR);
				params.push( config.ANAL_TYPE.TYPE_INDUSTRY_KR);

			}else if (analType === config.ANAL_TYPE.TYPE_RETROACTIVE){
				// 소급
			}
			sql += " ) ";

			conn.query(sql, params, function(err, results, fields) {
			  if (err) {
					conn.release();
					logger.error(err);
					callback(err);
			  } else {
					conn.release();
					var ret = "";
					results.forEach(function(item, index){
						ret+= item.id;
						if (index < results.length-1){
							ret += ", ";
						}
					});
					callback(null, ret);
			  }
			});

		});
	}

    return {
        selectConceptIds: selectConceptIds
    };
})();

if (exports) {
  module.exports = mariaDBDao;
}
