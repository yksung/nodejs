const BUF_SIZE = 1024 * 30;
const fs = require('fs-extra');
const root = 'C:\\dev\\nodejs\\nodejs\\';

var bufferArr = null;
fs.readFile(root+'exim_phrase_analyzer\\koreaexim_1309_D-1-201805150921-09044.txt', (err, data) => {
  if (err) throw err;

  var buffer1 = new Buffer(data.toString());
  console.log("buffer1 사이즈 " + buffer1.length);
  var bufNumber = buffer1.length / BUF_SIZE;
  console.log("buffer 개수 " + bufNumber);

  var buf = new Buffer(BUF_SIZE);
  var bufferArr = new Array(Math.ceil(bufNumber));
  for (var i = 0; i < bufNumber; i++) {
    bufferArr[i] = {
      "num": i,
      "cont": buffer1.slice(i * BUF_SIZE, i * BUF_SIZE + BUF_SIZE)
    };
  }

  console.log(bufferArr);
  Promise.all(bufferArr.map(writeFile)).then(function(resolvedArr) {
    console.log("All done!!!" + resolvedArr);
  });
});

var writeFile = function(obj) {
  return new Promise(function(resolved, rejected) {
    fs.writeFile(root+'exim_phrase_analyzer\\' + obj.num + '.txt', obj.cont, (err) => {
      if (err) {
        rejected(err);
      } else {
        resolved(obj.num);
      }
    })
  });
}
