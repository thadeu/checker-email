const domains = require('disposable-email-domains');
const wildcards = require('disposable-email-domains/wildcard.json');

module.exports = {
  findEmail: function(domainOrEmail, callback) {
    var domain = domainOrEmail.split('@').pop()
    var isFound = domains.includes(domain)

    if (!callback) {
      return isFound
    }

    callback(null, isFound)
  }
}