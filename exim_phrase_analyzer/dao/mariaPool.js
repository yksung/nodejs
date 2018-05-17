var mysql = require('mysql');

var mariaPool = (function() {
	var poolCluster = mysql.createPoolCluster();
	//add bicanalyzer
	poolCluster.add('bicanalyzer', 
		{
		connectionLimit: 100,
		host: '211.39.140.133',
		user: 'bicanalyzer',
		password: 'bicanalyzer#wisenut!',
		database: 'bicanalyzer_exim'
		}
	);
	//add dmap	차주사목록 관리 위한 DB
	poolCluster.add('dmap', 
		{
		connectionLimit: 100,
		host: '211.39.140.133',
		user: 'dmap',
		password: 'dmap#wisenut!',
		database: 'dmap'
		}
	);
	
  var getConnection = function(name, callback) {
    poolCluster.getConnection(name, callback);
  };

  return {
    getConnection: getConnection
  };
})();

if (exports) {
    module.exports = mariaPool;
}