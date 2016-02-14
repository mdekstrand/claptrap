const fs = require('fs'), os = require('os');
const cli = require('commander');
const sqlite = require('sqlite3');

var out = fs.createWriteStream('tweets.csv');
out.write('ID\tUser\tTimestamp' + os.EOL);

var db = new sqlite.Database('tweets.db', function(err) {
  if (err) throw err;
  db.each('SELECT tweet_id, user, timestamp, body FROM tweets', (err, row) => {
    if (err) throw err;
    out.write([row.tweet_id, row.user, row.timestamp].join('\t') + os.EOL);
  }, (err, n) => {
    if (err) throw err;
    console.log('wrote %d rows', n);
    out.end((err) => {
      if (err) throw err;
    });
  })
});
