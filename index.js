let validator = require('validator')
let isEmail = validator.isEmail
let dns = require('dns')
let net = require('net')
let logger = require('./utils/logger.js').logger
let loggerOptions = require('./utils/logger.js').loggerOption
let standardAddresses = require('./standard.json').addresses
let disposable = require('./utils/disposable')

const defaultOptions = {
  port: 25,
  sender: 'name@example.org',
  timeout: 0,
  fqdn: 'mail.example.org',
  ignore: false
}

const errors = {
  missing: {
    email: 'Missing email parameter',
    options: 'Missing options parameter',
    callback: 'Missing callback function'
  },
  invalid: {
    email: 'Invalid Email Structure'
  },
  exception: {

  }
}

let responseObject = { 
  info: '', 
  code: '', 
  success: true,
  reason: 'unknown',
  result: 'undeliverable',
  smtp: false,
  mx_records: null,
  mx_found: false,
  role: false,
  disposable: false,
  valid_format: false,
  assuranceQuality: 0
}

const isRoleEmail = user => standardAddresses.includes(user)


function optionsDefaults(options) {
  if( !options ) options = {}
  Object.keys(defaultOptions).forEach(function(key){
    if(options && !options[key]) options[key] = defaultOptions[key]
  })
  return options
}

function dnsConfig(options){
  try {
    if( Array.isArray(options.dns) ) dns.setServers(options.dns)
    else dns.setServers([options.dns])
  }
  catch(e){
    throw new Error('Invalid DNS Options');
  }
}

function beginSMTPQueries(params){
  let stage = 0
  let success = false
  let response = ''
  let completed = false
  let ended = false
  let tryagain = false
  let banner = ''

  // SET FALSE TO SMTP_OK
  params.smtp_ok = false

  logger.info("MX FOUND = " + params.mx_found)

  logger.info("Creating connection...")
  let socket = net.createConnection(params.options.port, params.options.smtp)

  let callback = (err, object) => {
    callback = () => {}
    ended = true

    return params.callback(err, object)
  }

  let advanceToNextStage = () => {
    stage++
    response = ''
  }

  if( params.options.timeout > 0 ){
    socket.setTimeout(params.options.timeout,() => {
      callback(null, { 
          result: 'risky',
          success: false,
          smtp_ok: false, 
          reason: reasons(infoCodes.SMTPConnectionTimeout),
          role: isRoleEmail(params.user),
          disposable: disposable.findEmail(params.email),
          valid_format: params.valid_format
        }
      )

      socket.destroy()
    })
  }else {
    socket.setTimeout(5000, () => {
      callback(null, { 
          result: 'risky',
          success: false,
          smtp_ok: false, 
          reason: reasons(infoCodes.SMTPConnectionTimeout),
          role: isRoleEmail(params.user),
          disposable: disposable.findEmail(params.email),
          valid_format: params.valid_format
        }
      )

      socket.destroy()
    })
  }

  socket.on('data', function(data) {
    response += data.toString();
    completed = response.slice(-1) === '\n';

    if (completed) {
      logger.server(response)

      switch(stage) {
        case 0: 
          if (response.indexOf('220') > -1 && !ended) {
            // Connection Worked
            banner = response
            var cmd = 'EHLO '+params.options.fqdn+'\r\n'

            logger.client(cmd)
            socket.write(cmd, function() { 
              stage++; 
              response = ''; 
            });
          }else{
            if (response.indexOf('421') > -1 || response.indexOf('450') > -1 || response.indexOf('451') > -1) {
              tryagain = true;
            }

            socket.end();
          }

          break;
        case 1: 
          if (response.indexOf('250') > -1 && !ended) {
            // Connection Worked
            var cmd = 'MAIL FROM:<'+params.options.sender+'>\r\n'

            logger.client(cmd)

            socket.write(cmd, function() { 
              stage++; 
              response = ''; 
            });
          }else{
            socket.end();
          }
          break;

        case 2: 
          if (response.indexOf('250') > -1 && !ended) {
            // MAIL Worked
            var cmd = 'RCPT TO:<' + params.email + '>\r\n'
            
            logger.client(cmd)

            socket.write(cmd, function() { 
              stage++; 
              response = ''; 
            });
          }
          else{
            socket.end();
          }
          break;

        case 3: 
          if (response.indexOf('250') > -1 || (params.options.ignore && response.indexOf(params.options.ignore) > -1)) {
            // RCPT Worked
            success = true;
          }

          stage++;
          response = '';

          // close the connection cleanly.
          if(!ended) {
            var cmd = 'QUIT\r\n'

            logger.client(cmd)
            socket.write(cmd);
          }

          break;
        case 4:
          socket.end();
      }
    }
  })

  socket.once('connect', function(data) {
    logger.info("Connected")
  })

  socket.once('error', function(err) {
    logger.error("Connection error")

    callback(err, { 
        result: 'unknown',
        success: false,
        smtp_ok: params.smtp_ok, 
        reason: reasons(infoCodes.SMTPConnectionError),
        disposable: disposable.findEmail(params.email),
      }
    )
  })

  socket.once('end', function() {
    logger.info("Closing connection")

    let endReasonSMTP = ''

    if (success && params.mx_found && params.smtp_ok){
      endReasonSMTP = 'acceptedEmail'
    }else if(success && !params.mx_found) {
      endReasonSMTP = 'noMxRecords'
    }else if(params.mx_found && !params.smtp_ok) {
      endReasonSMTP = 'failedReceivedEmail'
    }

    let isDisposableEmail = () => disposable.findEmail(params.email)
    let assuranceQuality = params.assuranceQuality || responseObject.assuranceQuality

    if (success) {
      assuranceQuality += 0.5

      if (!isRoleEmail(params.user)) {
        assuranceQuality += 0.2
      }
  
      if (!isDisposableEmail()) {
        assuranceQuality += 0.21
      }
    }

    callback(null, {
      result: success ? 'deliverable' : 'undeliverable',
      success: success,
      smtp_ok: success,
      mx_found: params.mx_found,
      mx_records: JSON.parse(params.mx_records),
      reason: reasons(infoCodes[endReasonSMTP]),
      role: isRoleEmail(params.user),
      disposable: isDisposableEmail(),
      assurance_quality: assuranceQuality > 1 ? 1 : assuranceQuality.toFixed(2),
      valid_format: params.valid_format
    })
  })
}

function startDNSQueries(params){
  let domain = params.email.split(/[@]/).splice(-1)[0].toLowerCase()

  logger.info("Resolving DNS... " + domain)

  dns.resolveMx(domain, (err, addresses) => {
    if (err || (typeof addresses === 'undefined')) {
      responseObject = Object.assign(responseObject, { 
          reason: reasons(infoCodes.domainNotFound), 
          result: 'undeliverable', 
          success: false, 
          code: infoCodes.domainNotFound,
          role: isRoleEmail(params.user),
          disposable: disposable.findEmail(params.email)
        }
      )

      logger.info('Domain not found')

    } else if (addresses && addresses.length <= 0) {
      responseObject = Object.assign(responseObject, { 
          reason: reasons(infoCodes.domainNotFound), 
          result: 'undeliverable', 
          success: false, 
          code: infoCodes.noMxRecords,
          role: isRoleEmail(params.user),
          disposable: disposable.findEmail(params.email)
        }
      )

      logger.info('MX Record not found')

    } else{
      params.addresses = addresses
      params.mx_found = true
      params.mx_records = JSON.stringify(addresses)

      // Find the lowest priority mail server
      let priority = 10000
      let lowestPriorityIndex = 0

      for (let i = 0 ; i < addresses.length ; i++) {
        if (addresses[i].priority < priority) {
          priority = addresses[i].priority
          lowestPriorityIndex = i

          logger.info('MX Records ' + JSON.stringify(addresses[i]))
        }
      }

      params.options.smtp = addresses[lowestPriorityIndex].exchange
      params.assurance_quality += 0.21

      logger.info("Choosing " + params.options.smtp + " for connection")
    }

    if(params.mx_found){
      beginSMTPQueries(params)
    }else {
      params.callback(null, responseObject);
    }

  })
}

const reasons = code => {
	if (!code) {
		return 'unexpected_error'
	}

	switch(code){
		case infoCodes.invalidEmailStructure:
			return 'invalid_email'
		case infoCodes.domainNotFound:
			return 'invalid_domain'
		case infoCodes.SMTPConnectionTimeout:
			return 'timeout'
		case infoCodes.SMTPConnectionError:
			return 'unavailable_smtp'
		case infoCodes.noMxRecords:
			return 'invalid_mx_record'
		case infoCodes.invalidAddressEmail:
			return 'invalid_email'
		case infoCodes.acceptedEmail:
			return 'accepted_email'
		case infoCodes.failedReceivedEmail:
			return 'failed_received_email'
	}
}

const infoCodes = {
  finishedVerification: 1,
  invalidEmailStructure: 2,
  noMxRecords: 3,
  SMTPConnectionTimeout: 4,
  domainNotFound: 5,
  SMTPConnectionError: 6,
  invalidAddressEmail: 7,
  mxRecordsFound: 8,
  failedReceivedEmail: 9,
  acceptedEmail: 99
}

async function verify(email, options, callback){
  let params = {}
  let args = (arguments.length === 1 ? [arguments[0]] : Array.apply(null, arguments))

  args.forEach(function(arg){
    if(typeof arg === 'string'){
      params.email = arg
    }else if( typeof arg === 'object' ){
      params.options = arg
    }else if( typeof arg === 'function' ){
      params.callback = arg
    }
  })

  if(!params.email && params.options.email && typeof params.options.email === 'string'){
    params.email = params.options.email
  }

  params.options = optionsDefaults(params.options)

  if(!params.email){
    throw new Error(errors.missing.email)
  }

  if(!params.options) {
    throw new Error(errors.missing.options)
  }

  if(!params.callback) {
    throw new Error(errors.missing.callback)
  }

  if(!isEmail(params.email)) {
    return params.callback(null, Object.assign(responseObject, { 
        result: 'undeliverable',
        success: false, 
        reason: reasons(infoCodes.invalidEmailStructure),
        code: infoCodes.invalidEmailStructure,
        smtp_ok: false, 
        email: email,
        role: isRoleEmail(params.user),
        disposable: disposable.findEmail(params.email),
      })
    )
  }

  if(params.options.dns){
    dnsConfig(params.options)
  }

  params.user = params.email.split('@')[0]
  params.domain = params.email.split('@')[1].toLowerCase()

  params.valid_format = true
  params.assurance_quality += 0.11

  logger.info("# Veryfing " + params.email)

  startDNSQueries(params)
}

module.exports.reasons = reasons
module.exports.verify = verify
module.exports.infoCodes = infoCodes;
module.exports.verifyCodes = infoCodes;
