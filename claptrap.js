const fs = require('fs');
const util = require('util');
const toml = require('toml');
const backoff = require('backoff');
const Twitter = require('twitter');
const sqlite3 = require('sqlite3');

const streamBackoff = backoff.exponential({
  maxDelay: 60 * 1000
});
var dbCon = null;
streamBackoff.failAfter(15);

function makeError(err) {
  return new Error(util.format('twitter error %d: %d', err.code, err.message));
}

function streamTweets(db, client) {
  client.stream('user', {}, (stream) => {
    console.log('streaming for user');
    stream.on('data', function(event) {
      streamBackoff.reset();
      var keys = Object.keys(event);
      if (keys.length == 1) {
        console.log('received object type %s', keys[0]);
        if (event.delete) {
          var sid = event.delete.status.id_str;
          console.log('deleting tweet %s', sid);
          db.run('DELETE FROM tweets WHERE tweet_id = ?', [sid], (err) => {
            if (err) console.error('error deleting tweet: %s', err);
          })
        }
      } else if (event.event) {
        console.log('received event type %s', event.event);
      } else {
        console.log('received tweet ‘%s’', event.text);
        var date = new Date(event.created_at);
        db.run('INSERT INTO tweets (tweet_id, user, timestamp, body) VALUES (?, ?, ?, ?)', [
          event.id_str, event.user.screen_name, date.toISOString(),
          JSON.stringify(event)
        ], (err) => {
          if (err) {
            console.error('error saving tweet: %s', err);
          }
        })
      }
    });
    stream.on('error', function(err) {
      console.error(err);
    });
    stream.on('end', function() {
      console.log('stream disconnected, reconnecting');
      streamBackoff.backoff();
    });
  })
}

function openDatabase(callback) {
  var db = new sqlite3.Database('tweets.db', function(err) {
    if (err) return callback(err);
    db.run('CREATE TABLE IF NOT EXISTS tweets (tweet_id INTEGER PRIMARY KEY, user VARCHAR, timestamp VARCHAR, body VARCHAR)', (err) => {
      callback(err, db);
    })
  })
}

streamBackoff.on('backoff', function(number, delay) {
  console.log('will attempt to reconnect in %d ms', delay);
});
streamBackoff.on('fail', function() {
  console.error('failed to reconnect, exiting');
  if (dbCon != null) {
    dbCon.close();
  }
  process.exit(3);
})

fs.readFile('config.toml', (err, data) => {
  if (err) throw err;
  var str = data.toString('utf-8');
  var config = toml.parse(str);
  var client = new Twitter({
    consumer_key: config.app.key,
    consumer_secret: config.app.secret,
    access_token_key: config.user.token,
    access_token_secret: config.user.secret
  });
  client.get('account/verify_credentials', {}, function(err, user) {
    if (err) throw makeError(err);
    console.log('logged in as %s', user.screen_name);
    openDatabase((err, db) => {
      if (err) throw err;
      dbCon = db;
      streamTweets(db, client);
      streamBackoff.on('ready', function() {
        streamTweets(db, client);
      });
    })
  })
})
