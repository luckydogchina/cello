/**
 * Copyright 2017 IBM All Rights Reserved.
 *
 * Licensed under the Apache License, Version 2.0 (the 'License');
 * you may not use this file except in compliance with the License.
 * You may obtain a copy of the License at
 *
 *    http://www.apache.org/licenses/LICENSE-2.0
 *
 *  Unless required by applicable law or agreed to in writing, software
 *  distributed under the License is distributed on an 'AS IS' BASIS,
 *  WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND, either express or implied.
 *  See the License for the specific language governing permissions and
 *  limitations under the License.
 */
'use strict';
const log4js = require('log4js');
const logger = log4js.getLogger('Helper');
logger.setLevel('DEBUG');

const path = require('path');
const util = require('util');
const fs = require('fs-extra');
const User = require('fabric-client/lib/User.js');
const crypto = require('crypto');
const copService = require('fabric-ca-client');
const ECDSAKey = require('fabric-ca-client/lib/impl/ecdsa/key.js');
var jsrsasign = require('jsrsasign');
var KEYUTIL = jsrsasign.KEYUTIL;
// const ChainModel = require('../../models/chain');

const hfc = require('fabric-client');
hfc.setLogger(logger);
let ORGS = {};

let clients = {};
let channels = {};
let caClients = {};
let globalTemplate = {};
let chain = null;
let keyValueStore = ""
let caAdminUser = {};
let channelpeers = [];

// set up the client and channel objects for each org
function initialize (template) {
  globalTemplate = template;
  ORGS = template.network.application;
  for (let key in ORGS) {
    // if (key.indexOf('org') === 0) {
      let client = new hfc();

      let cryptoSuite = hfc.newCryptoSuite();
      cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: getKeyStoreForOrg(ORGS[key].name)}));
      client.setCryptoSuite(cryptoSuite);

      let channel = client.newChannel(template.channelName);
      channel.addOrderer(newOrderer(client));

      clients[key] = client;
      channels[key] = channel;

      setupPeers(channel, key, client);

      let caUrl = ORGS[key].ca;
      caClients[key] = new copService(caUrl, null /*defautl TLS opts*/, '' /* default CA */, cryptoSuite);
    // }
  }
}

function initializeWithChannel (template, channelName, channelpeerlist) {
    globalTemplate = template;
    ORGS = template.network.application;

    for (let key in ORGS) {
        // if (key.indexOf('org') === 0) {
        let client = new hfc();

        let cryptoSuite = hfc.newCryptoSuite();
        cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: getKeyStoreForOrg(ORGS[key].name)}));
        client.setCryptoSuite(cryptoSuite);

        clients[key] = client;

        let caUrl = ORGS[key].ca;
        caClients[key] = new copService(caUrl, null /*defautl TLS opts*/, '' /* default CA */, cryptoSuite);
        // }
    }

    // let ckey
    // for (let key in clients) {
    //     ckey = key
    // }
    //
    // let channel = clients[ckey].newChannel(channelName);
    // channel.addOrderer(newOrderer(clients[ckey]));
    // channels[channelName] = channel;

    channelpeers = channelpeerlist;

    // if (channelpeerlist != null) {
    //     channelpeerlist.forEach(function(item,index){
    //         let arr = item.split(' ')
    //         if (arr[2] == channelName) {
    //             let data = fs.readFileSync('/opt/cello/fabric-1.0/' + ORGS[arr[1]].peers[arr[0]]['tls_cacerts']);
    //             let peer = clients[ckey].newPeer(
    //                 ORGS[arr[1]].peers[arr[0]].requests,
    //                 {
    //                     pem: Buffer.from(data).toString(),
    //                     'ssl-target-name-override': ORGS[arr[1]].peers[arr[0]]['server_hostname']
    //                 }
    //             );
    //             peer.setName(arr[0]);
    //             channel.addPeer(peer);
    //         }
    //     });
    // }

}

function setupCryptoSuite (channelName) {
  for (let key in ORGS) {
    // if (key.indexOf('org') === 0) {
      let client = new hfc();

      let cryptoSuite = hfc.newCryptoSuite();
      cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: getKeyStoreForOrg(ORGS[key].name)}));
      client.setCryptoSuite(cryptoSuite);

      let channel = client.newChannel(channelName);
      channel.addOrderer(newOrderer(client));

      clients[key] = client;
      channels[key] = channel;

      setupPeers(channel, key, client);

      let caUrl = ORGS[key].ca;
      caClients[key] = new copService(caUrl, null /*defautl TLS opts*/, '' /* default CA */, cryptoSuite);
    // }
  }
  logger.debug("====================== setup crypto suite done =====================")
}

function setupPeers(channel, org, client) {
  for (let key in ORGS[org].peers) {
    let data = fs.readFileSync('/opt/cello/fabric-1.0/' + ORGS[org].peers[key]['tls_cacerts']);
    let peer = client.newPeer(
      ORGS[org].peers[key].requests,
      {
        pem: Buffer.from(data).toString(),
        'ssl-target-name-override': ORGS[org].peers[key]['server_hostname']
      }
    );
    peer.setName(key);

    channel.addPeer(peer);
  }
}

function newOrderer(client) {
  var caRootsPath = globalTemplate.network.orderer.tls_cacerts;
  let data = fs.readFileSync('/opt/cello/fabric-1.0/' + caRootsPath);
  let caroots = Buffer.from(data).toString();
  return client.newOrderer(globalTemplate.network.orderer.url, {
    'pem': caroots,
    'ssl-target-name-override': globalTemplate.network.orderer['server_hostname']
  });
}

function readAllFiles(dir) {
  var files = fs.readdirSync(dir);
  var certs = [];
  files.forEach((file_name) => {
    let data = fs.readFileSync(path.join(dir, file_name));
    certs.push(data);
  });
  return certs;
}

function getOrgName(org) {
  return ORGS[org].name;
}

function getKeyStoreForOrg(org) {
  // return hfc.getConfigSetting('keyValueStore') + '/' + org;
  return globalTemplate.keyValueStore + '/' + org;
}

function newRemotes(names, forPeers, userOrg) {
  let client = getClientForOrg(userOrg);

  let targets = [];
  // find the peer that match the names
  for (let idx in names) {
    let peerName = names[idx];
    if (ORGS[userOrg].peers[peerName]) {
      // found a peer matching the name
      logger.debug(userOrg, peerName, ORGS[userOrg].peers[peerName])
      let data = fs.readFileSync('/opt/cello/fabric-1.0/' + ORGS[userOrg].peers[peerName]['tls_cacerts']);
      let grpcOpts = {
        pem: Buffer.from(data).toString(),
        'ssl-target-name-override': ORGS[userOrg].peers[peerName]['server_hostname']
      };

      if (forPeers) {
        targets.push(client.newPeer(ORGS[userOrg].peers[peerName].requests, grpcOpts));
      } else {
        let eh = client.newEventHub();
        eh.setPeerAddr(ORGS[userOrg].peers[peerName].events, grpcOpts);
        targets.push(eh);
      }
    }
  }

  if (targets.length === 0) {
    logger.error(util.format('Failed to find peers matching the names %s', names));
  }

  return targets;
}

//-------------------------------------//
// APIs
//-------------------------------------//
var getChannelForOrg = function(org) {
  return channels[org];
};

var getChannelForName = function(channelName,org) {
    let channel = clients[org].newChannel(channelName);
    channel.addOrderer(newOrderer(clients[org]));
    // channels[channelName] = channel;

    if (channelpeers != null) {
        channelpeers.forEach(function(item,index){
            let arr = item.split(' ')
            if (arr[2] == channelName) {
                let data = fs.readFileSync('/opt/cello/fabric-1.0/' + ORGS[arr[1]].peers[arr[0]]['tls_cacerts']);
                let peer = clients[org].newPeer(
                    ORGS[arr[1]].peers[arr[0]].requests,
                    {
                        pem: Buffer.from(data).toString(),
                        'ssl-target-name-override': ORGS[arr[1]].peers[arr[0]]['server_hostname']
                    }
                );
                peer.setName(arr[0]);
                channel.addPeer(peer);
            }
        });
    }

    return channel;
};

var getClientForOrg = function(org) {
  return clients[org];
};

var newPeers = function(names, org) {
  return newRemotes(names, true, org);
};

var newEventHubs = function(names, org) {
  return newRemotes(names, false, org);
};

var newPeerAll = function(fullnames, forPeers) {

    let targets = [];

    for (let i=0; i<fullnames.length; i++){
        let fgindex = fullnames[i].indexOf('-')
        let userOrg = fullnames[i].slice(0,fgindex)
        let peerName = fullnames[i].slice(fgindex+1,fullnames[i].length)

        let client = getClientForOrg(userOrg);

        if (ORGS[userOrg].peers[peerName]) {
            // found a peer matching the name
            logger.debug(userOrg, peerName, ORGS[userOrg].peers[peerName])
            let data = fs.readFileSync('/opt/cello/fabric-1.0/' + ORGS[userOrg].peers[peerName]['tls_cacerts']);
            let grpcOpts = {
                pem: Buffer.from(data).toString(),
                'ssl-target-name-override': ORGS[userOrg].peers[peerName]['server_hostname']
            };

            if (forPeers) {
                targets.push(client.newPeer(ORGS[userOrg].peers[peerName].requests, grpcOpts));
            } else {
                let eh = client.newEventHub();
                eh.setPeerAddr(ORGS[userOrg].peers[peerName].events, grpcOpts);
                targets.push(eh);
            }
        }
    }

    if (targets.length === 0) {
        logger.error(util.format('Failed to find peers matching the names %s', names));
    }

    return targets;
};



var getMspID = function(org) {
  logger.debug('Msp ID : ' + ORGS[org].mspid);
  return ORGS[org].mspid;
};

var getAdminUser = function(userOrg) {
  var users = globalTemplate.admins;
  var username = users[0].username;
  var password = users[0].secret;
  var member;
  var client = getClientForOrg(userOrg);

  return hfc.newDefaultKeyValueStore({
    path: getKeyStoreForOrg(getOrgName(userOrg))
  }).then((store) => {
    client.setStateStore(store);
    // clearing the user context before switching
    client._userContext = null;
    return client.getUserContext(username, true).then((user) => {
      if (user && user.isEnrolled()) {
        logger.info('Successfully loaded member from persistence');
        return user;
      } else {
        let caClient = caClients[userOrg];
        // need to enroll it with CA server
        return caClient.enroll({
          enrollmentID: username,
          enrollmentSecret: password
        }).then((enrollment) => {
          logger.info('Successfully enrolled user \'' + username + '\'');
          member = new User(username);
          member.setCryptoSuite(client.getCryptoSuite());
          return member.setEnrollment(enrollment.key, enrollment.certificate, getMspID(userOrg));
        }).then(() => {
          return client.setUserContext(member);
        }).then(() => {
          caAdminUser[userOrg] = member
          return member;
        }).catch((err) => {
          logger.error('Failed to enroll and persist user. Error: ' + err.stack ?
            err.stack : err);
          return null;
        });
      }
    });
  });
};

var getRegisteredUsers = function(username, userOrg, isJson) {
  var member;
  var client = getClientForOrg(userOrg);
  var enrollmentSecret = null;
  return hfc.newDefaultKeyValueStore({
    path: getKeyStoreForOrg(getOrgName(userOrg))
  }).then((store) => {
    client.setStateStore(store);
    // clearing the user context before switching
    client._userContext = null;
    return client.getUserContext(username, true).then((user) => {
      if (user && user.isEnrolled()) {
        logger.info('Successfully loaded member from persistence');
        return user;
      } else {
        let caClient = caClients[userOrg];
        return getAdminUser(userOrg).then(function(adminUserObj) {
          member = adminUserObj;
          return caClient.register({
            enrollmentID: username,
            affiliation: userOrg + '.department1'
          }, member);
        }).then((secret) => {
          enrollmentSecret = secret;
          logger.debug(username + ' registered successfully');
          return caClient.enroll({
            enrollmentID: username,
            enrollmentSecret: secret
          });
        }, (err) => {
          logger.debug(username + ' failed to register');
          return '' + err;
          //return 'Failed to register '+username+'. Error: ' + err.stack ? err.stack : err;
        }).then((message) => {
          if (message && typeof message === 'string' && message.includes(
              'Error:')) {
            logger.error(username + ' enrollment failed');
            return message;
          }
          logger.debug(username + ' enrolled successfully');

          member = new User(username);
          member._enrollmentSecret = enrollmentSecret;
          return member.setEnrollment(message.key, message.certificate, getMspID(userOrg));
        }).then(() => {
          client.setUserContext(member);
          return member;
        }, (err) => {
          logger.error(util.format('%s enroll failed: %s', username, err.stack ? err.stack : err));
          return '' + err;
        });;
      }
    });
  }).then((user) => {
    if (isJson && isJson === true) {
      var response = {
        success: true,
        secret: user._enrollmentSecret,
        message: username + ' enrolled Successfully',
      };
      return response;
    }
    return user;
  }, (err) => {
    logger.error(util.format('Failed to get registered user: %s, error: %s', username, err.stack ? err.stack : err));
    return '' + err;
  });
};

var getOrgAdmin = function(userOrg) {
  var admin = ORGS[userOrg].admin;
  var keyPEM = Buffer.from(readAllFiles('/opt/cello/fabric-1.0/' + admin.key)[0]).toString();
  var certPEM = readAllFiles('/opt/cello/fabric-1.0/' + admin.cert)[0].toString();

  var client = getClientForOrg(userOrg);
  var cryptoSuite = hfc.newCryptoSuite();
  if (userOrg) {
    cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: getKeyStoreForOrg(getOrgName(userOrg))}));
    client.setCryptoSuite(cryptoSuite);
  }

  return hfc.newDefaultKeyValueStore({
    path: getKeyStoreForOrg(getOrgName(userOrg))
  }).then((store) => {
    client.setStateStore(store);

    return client.createUser({
      username: 'peer'+userOrg+'Admin',
      mspid: getMspID(userOrg),
      cryptoContent: {
        privateKeyPEM: keyPEM,
        signedCertPEM: certPEM
      }
    });
  });
};

var setupChaincodeDeploy = function() {
  process.env.GOPATH = globalTemplate.CC_SRC_PATH;
};

var getLogger = function(moduleName) {
  var logger = log4js.getLogger(moduleName);
  logger.setLevel('DEBUG');
  return logger;
};

var getAdminUser2 = function(userOrg) {
    var mspid = 'Org1MSP'
    var username = "admin";
    var password = "adminpw";
    var member;
    var path =  "/opt/cello/baas/"
    let cryptoSuite = hfc.newCryptoSuite();
    cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: path}));

    return hfc.newDefaultKeyValueStore({
        path: path //getKeyStoreForOrg(getOrgName(userOrg))
    }).then((store) => {
        if (caAdminUser[userOrg]) {
            logger.info('Successfully loaded member from persistence');
            return caAdminUser[userOrg];
        } else {
            let caClient
            if (caClients[userOrg])
                caClient = caClients[userOrg]
            else {
                caClient = new copService(caUrl, null /*defautl TLS opts*/, '' /* default CA */, cryptoSuite)
                caClients[userOrg] = caClient
            }

            // need to enroll it with CA server
            return caClient.enroll({
                enrollmentID: username,
                enrollmentSecret: password
            }).then((enrollment) => {
                logger.info('Successfully enrolled user \'' + username + '\'');
                member = new User(username);
                member.setCryptoSuite(cryptoSuite);
                return member.setEnrollment(enrollment.key, enrollment.certificate, mspid);
            }).then(() => {
                store.setValue(member._name, member.toString())
                caAdminUser[userOrg] = member
                return member;
            }).catch((err) => {
                logger.error('Failed to enroll and persist user. Error: ' + err.stack ?
                    err.stack : err);
                return null;
            });
        }
    });
};

function makeRealPem(pem) {
    var result = null;
    if(typeof pem == 'string') {
        result = pem.replace(/-----BEGIN -----/, '-----BEGIN CERTIFICATE-----');
        result = result.replace(/-----END -----/, '-----END CERTIFICATE-----');
        result = result.replace(/-----([^-]+) ECDSA ([^-]+)-----([^-]*)-----([^-]+) ECDSA ([^-]+)-----/, '-----$1 EC $2-----$3-----$4 EC $5-----');
    }
    return result;
}

var generateUsers = function(username, userOrg, caUrl, mspid, istls) {
    var member;
    // var client = getClientForOrg(userOrg);
    // var caUrl = `https://192.168.1.109:7850`
    // var mspid = 'Org1MSP'
    var enrollmentSecret = null;
    var response;
    var path =  "/opt/cello/baas/msp/"
    var enrollname
    let cryptoSuite = hfc.newCryptoSuite();
    cryptoSuite.setCryptoKeyStore(hfc.newCryptoKeyStore({path: path}));

    return hfc.newDefaultKeyValueStore({
        path: path//getKeyStoreForOrg(getOrgName(userOrg))
    }).then((store) => {
        // client.setStateStore(store);
        let caClient
        if (caClients[userOrg])
            caClient = caClients[userOrg]
        else {
            caClient = new copService(caUrl, null /*defautl TLS opts*/, '' /* default CA */, cryptoSuite);
            caClients[userOrg] = caClient
        }
        return getAdminUser2(userOrg).then(function (adminUserObj) {
            member = adminUserObj;
            if (istls)
                enrollname = username+'-tls'
            else
                enrollname = username
            return caClient.register({
                enrollmentID: enrollname,
                affiliation: userOrg + '.department1'
            }, member);
            // return caClient.register({
            //     enrollmentID: username,
            //     affiliation: 'org1' + '.department1'
            // }, member);
        }).then((secret) => {
            enrollmentSecret = secret;
            logger.debug(username + ' registered successfully');
            if (istls)
                enrollname = username+'-tls'
            else
                enrollname = username
            return caClient.enroll({
                enrollmentID: enrollname,
                enrollmentSecret: secret
            });
        }, (err) => {
            logger.debug(username + ' failed to register');
            return '' + err;
            //return 'Failed to register '+username+'. Error: ' + err.stack ? err.stack : err;
        }).then((message) => {
            var certpath
            if (!istls)
                certpath =  '/opt/cello/baas/msp/'+username+'/msp/signcerts/'
            else
                certpath =  '/opt/cello/baas/msp/'+username+'/tls/'
            return hfc.newDefaultKeyValueStore({
                path: certpath//getKeyStoreForOrg(getOrgName(userOrg))
            }).then((certstore) => {
                if (message && typeof message === 'string' && message.includes(
                        'Error:')) {
                    logger.error(username + ' enrollment failed');
                    return message;
                }
                logger.debug(username + ' enrolled successfully');

                var pemString = Buffer.from(message.certificate).toString();
                pemString = makeRealPem(pemString);
                var certidx
                if (!istls)
                    certidx = username+'-cert.pem'
                else
                    certidx = 'server.crt'
                return certstore.setValue(certidx, pemString)
                    .then(() => {
                        var pubpath
                        if (!istls)
                            pubpath =  '/opt/cello/baas/msp/'+username+'/msp/signpubkey/'
                        else
                            pubpath =  '/opt/cello/baas/msp/'+username+'/tls/'
                        return hfc.newDefaultKeyValueStore({
                            path: pubpath//getKeyStoreForOrg(getOrgName(userOrg))
                        }).then((pubstore) => {
                            var pubkey
                            var theKey
                            try {
                                pubkey = KEYUTIL.getKey(pemString);
                            } catch(err) {
                                // error = new Error('Failed to parse pubkey from PEM: ' + err);
                            }

                            if (pubkey && pubkey.type && pubkey.type === 'EC') {
                                theKey = new ECDSAKey(pubkey);
                                logger.debug('importKey - have the key %j',theKey);
                            }

                            var pem = theKey.toBytes();
                            var idx
                            if (!istls)
                                idx = theKey.getSKI()+'.pem'
                            else
                                idx = 'server.pub'
                            return pubstore.setValue(idx, pem)
                                .then(() => {
                                    var privpath
                                    if (!istls)
                                        privpath =  '/opt/cello/baas/msp/'+username+'/msp/keystore/'
                                    else
                                        privpath =  '/opt/cello/baas/msp/'+username+'/tls/'

                                    return hfc.newDefaultKeyValueStore({
                                        path: privpath//getKeyStoreForOrg(getOrgName(userOrg))
                                    }).then((privstore) => {
                                        var privpem = message.key.toBytes();
                                        var prividx
                                        if (!istls)
                                            prividx = message.key.getSKI()+'_sk'
                                        else
                                            prividx = 'server.key'
                                        return privstore.setValue(prividx, privpem)
                                            .then(() => {
                                                if (istls)
                                                    response = {
                                                        success: true,
                                                        cert:certpath+'server.crt',
                                                        priv:privpath+'server.key',
                                                        pub:pubpath+'server.pub',
                                                        message: username + ' enrolled Successfully',
                                                    };
                                                else
                                                    response = {
                                                        success: true,
                                                        cert:certpath+username+'-cert.pem',
                                                        priv:privpath+prividx,
                                                        pub:pubpath+idx,
                                                        message: username + ' enrolled Successfully',
                                                    };
                                                return response;
                                            });



                                    });
                                });;
                        });
                    });
            });

        });;


    });

};

var getChannelConfig = function(org,channelName) {

    var channel = getChannelForName(channelName,org);
    var client = getClientForOrg(org);

    return getOrgAdmin(org).then((user) => {
        // read the config block from the orderer for the channel
        // and initialize the verify MSPs based on the participating
        // organizations
        return channel.initialize();
    }, (err) => {
        logger.error('Failed to enroll user \'' + username + '\'. ' + err);
        throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
    }).then((success) => {
        return channel.getChannelConfig()
    });

};


var signChannelConfig = function(org,channelName) {

    var channel = getChannelForName(channelName,org);
    var client = getClientForOrg(org);

    return getOrgAdmin(org).then((user) => {
        // read the config block from the orderer for the channel
        // and initialize the verify MSPs based on the participating
        // organizations
        return channel.initialize();
    }, (err) => {
        logger.error('Failed to enroll user \'' + username + '\'. ' + err);
        throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
    }).then((success) => {
        return channel.getChannelConfig()
    });

};

exports.initializeWithChannel = initializeWithChannel;
exports.getChannelConfig = getChannelConfig;
exports.generateUsers = generateUsers;
exports.getChannelForOrg = getChannelForOrg;
exports.getChannelForName = getChannelForName;
exports.getClientForOrg = getClientForOrg;
exports.getLogger = getLogger;
exports.setupChaincodeDeploy = setupChaincodeDeploy;
exports.getMspID = getMspID;
exports.ORGS = ORGS;
exports.newPeers = newPeers;
exports.newEventHubs = newEventHubs;
exports.newPeerAll = newPeerAll;
exports.getRegisteredUsers = getRegisteredUsers;
exports.getOrgAdmin = getOrgAdmin;
exports.setupCryptoSuite = setupCryptoSuite;
exports.initialize = initialize;
