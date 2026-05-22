# Skyrdle

Skyrdle is an open source word game you can play on your AT Protocol account, storing your scores in your PDS! The official game is live at [skyrdle.com](https://skyrdle.com). Written entirely in TypeScript. Relies on Mongo in order to store a list of words as well as canonical game scores.

# Sub-projects

* `skyrdle-admin` - Admin tools to help manage the game
* `skyrdle-native` - React Native app for iOS & ANdroid

# Server hardening notes

The API verifies DID-bound write requests through `verifyDidRequest` in `createApp`. Production runs fail closed by default. During a legacy migration, `SKYRDLE_ALLOW_UNVERIFIED_DID_WRITES=true` restores the previous behavior; `SKYRDLE_AUTH_BYPASS_TOKEN` can also be used with `Authorization: Bearer <token>` and `X-Skyrdle-Did`.

Set `CORS_ORIGINS` to a comma-separated list of browser origins that may call the API. If unset, production only accepts same-origin/non-browser requests.
