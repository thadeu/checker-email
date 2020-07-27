# Checker Email Verification

[![NPM package version](https://img.shields.io/npm/v/@thadeu/checker-email.svg)](https://www.npmjs.com/package/@thadeu/checker-email)
[![Build Status](https://travis-ci.org/thadeu/checker-email.svg?branch=master)](https://travis-ci.org/thadeu/checker-email)
![Minified size](http://img.badgesize.io/thadeu/checker-email/master/dist/checker-email.min.js.svg?label=min+size)
![Minified+Gzip size](http://img.badgesize.io/thadeu/checker-email/master/dist/checker-email.min.js.svg?compression=gzip&label=min%2Bgzip+size)
![License: MIT](https://img.shields.io/npm/l/@thadeu/checker-email.svg)

Email Checker is a email verification tool. and more

# Instalation
This lib is available as a NPM package. To install it, use the following command:

```bash
npm install @thadeu/checker-email --save
```

If you're using Yarn (and you should):

```bash
yarn add @thadeu/checker-email
```

### How to use?

```
import { verify } from '@thadeu/checker-email';
```

```js
verify(your_email, (err, data) => {})
```

## Expected data

### reason
type: `unknown|invalid_email|invalid_domain|timeout|unavailable_smtp|invalid_mx_record|invalid_email|accepted_email|failed_received_email`

### smtp_ok 
type: `true|false`

### role
type: `true|false`

### mx_found
type: `true|false`

### mx_records
type: `true|false`

### smtp_ok
type: `true|false`

### result
type: `undeliverable|deliverable|risky|unknown`

### disposable
checks if the email belongs to the trusted list
type: `true|false`

### assurance_quality
score email quality
type: `float`

### valid_format
checks if email have a valid format
type: `true|false`

## Do you developer?

**watching tests**

```js
npm run test
```

We going to enjoy!!

# Contributing

Once you've made your great commits (include tests, please):

1. Fork this repository
2. Create a topic branch - `git checkout -b my_branch`
3. Push to your branch - `git push origin my_branch`
4. Create a pull request

That's it!

Please respect the indentation rules and code style. And use 2 spaces, not tabs. And don't touch the version thing or distribution files; this will be made when a new version is going to be released.

## License
(The MIT License)

Permission is hereby granted, free of charge, to any person obtaining a copy of this software and associated documentation files (the 'Software'), to deal in the Software without restriction, including without limitation the rights to use, copy, modify, merge, publish, distribute, sublicense, and/or sell copies of the Software, and to permit persons to whom the Software is furnished to do so, subject to the following conditions:

The above copyright notice and this permission notice shall be included in all copies or substantial portions of the Software.

THE SOFTWARE IS PROVIDED 'AS IS', WITHOUT WARRANTY OF ANY KIND, EXPRESS OR IMPLIED, INCLUDING BUT NOT LIMITED TO THE WARRANTIES OF MERCHANTABILITY, FITNESS FOR A PARTICULAR PURPOSE AND NONINFRINGEMENT. IN NO EVENT SHALL THE AUTHORS OR COPYRIGHT HOLDERS BE LIABLE FOR ANY CLAIM, DAMAGES OR OTHER LIABILITY, WHETHER IN AN ACTION OF CONTRACT, TORT OR OTHERWISE, ARISING FROM, OUT OF OR IN CONNECTION WITH THE SOFTWARE OR THE USE OR OTHER DEALINGS IN THE SOFTWARE.
