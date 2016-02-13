This is a small tool that listens to the Twitter user stream and saves all tweets you receive to a database.

Instructions currently assume you know how to register Twitter applications & connect them to the API.

## Installation Instructions

To use:

1.  Clone the repository
2.  Install dependencies (`npm install`)
3.  Register an application with Twitter to obtain OAuth credentials
4.  Create a configuration file

The configuration file is a TOML file, named `config.toml`, that looks like this:

```toml
[app]
key = # your consumer API key from Twitter
secret = # your consumer secret from Twitter

[user]
token = # your access token from Twitter
secret = # your access token secret from Twitter
```

Tweets get saved to `tweets.db`.
