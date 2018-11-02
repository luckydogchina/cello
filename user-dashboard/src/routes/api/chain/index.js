
/* Copyright IBM Corp, All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/
import { Router } from 'express'
const Chain = require("../../../modules/chain");
import ChainModel from '../../../models/chain'
import ChainCode from '../../../models/chainCode'
import util from 'util'
import multer from 'multer'
import config from '../../../config'
import Moment from 'moment'
import { extendMoment } from 'moment-range';
const moment = extendMoment(Moment);
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"
var superagent = require('superagent');
var agent = require('superagent-promise')(require('superagent'), Promise);
const fs = require('fs-extra');
var requester = require('request');
logger.setLevel(logLevel);

const router = new Router()

router.get("/:apikey/list", function(req, res) {
  const currentChannel = req.query.currentChannel;
  const launchpeer = req.query.launchpeer;
  const chain = new Chain(req.apikey, req.username);
  chain.list(req.query.page,currentChannel, launchpeer).then(function(result) {
    res.json({
      ...result,
      limit: config.limit.chainNumber
    });
  }).catch(function(err) {
    res.json(err);
  });
});

router.get("/search", function (req, res) {
  const chainName = req.query.name;
  ChainModel.count({user_id: req.apikey, name: chainName}, function (err, result) {
    res.json({
      success: true,
      existed: result>0
    })
  })
})

router.get("/:apikey/db-list", function (req, res) {
  ChainModel.find({user_id: req.apikey}, function (err, docs) {
    if (err) res.json({success: false, err})
    const chains = docs.map((chain, i) => {
      return {
        id: chain.id,
        name: chain.name,
        type: chain.type,
        orgs:chain.orgs,
        template:chain.template,
        localchannels:chain.channels,
        curchannel:chain.curchannel,
      }
    })
    res.json({
      success: true,
      chains
    })
  })
})

router.get("/:id/stat", function (req, res) {
  const id = req.params.id;
  ChainModel.findOne({id}, function (err, chainDoc) {
    if (err) res.json({success: false})
    res.json({
      success: true,
      id,
      initialized: chainDoc.initialized
    })
  })
})
router.post("/:apikey/apply", function(req, res) {
  const chain = new Chain(req.apikey, req.username);
  chain.apply(
    req.body.name,
    '',
    '',
    req.body.size,
    req.body.type
  ).then(function (result) {
    res.json(result)
  }).catch(function (err) {
    res.json(err)
  })
  // chain.apply(req.body.name,
  //   req.body.description,
  //   req.body.plugin,
  //   req.body.mode,
  //   req.body.size)
  //   .then(function(result) {
  //     res.json(result);
  //   }).catch(function(err) {
  //   res.json(err);
  // });
});

router.post("/uploadconfig", function (req, res) {
    const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, file.originalname)
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('file');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})




router.post("/:apikey/genchanneltxfile", function(req, res) {

    const chain = new Chain(req.apikey, req.username);
    chain.genchanneltxfile(
        req.body.channelname1
    ).then(function (result) {
        res.json(result)
        // res.download(result)
    }).catch(function (err) {
        res.json(err)
    })
});


router.post("/:apikey/createchannel", function(req, res) {

    const chain = new Chain(req.apikey, req.username);
    chain.createchannel(
        req.body.chainid,
        req.body.channelname,
        req.body.signorg,
    ).then(function (result) {
        res.json(result)
    }).catch(function (err) {
        res.json(err)
    })
});

router.post("/:apikey/joinchannel", function(req, res) {

    const chain = new Chain(req.apikey, req.username);
    chain.joinchannel(
        req.body.chainid,
        req.body.channelname,
        req.body.orgs
    ).then(function (result) {
        res.json(result)
    }).catch(function (err) {
        res.json(err)
    })
});

router.post("/:apikey/downloadchannelconfigfile", function (req, res) {
    const chainId = req.body.chainid;
    const channelName = req.body.channelname;
    const signorg = req.body.signorg;
    ChainModel.findOne({_id: chainId}, function (err, chain) {
        if (err) {
            res.json({
                success: false,
                error: "chain not exist!"
            })
        } else {
            const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
            helper.initializeWithChannel(chain.template, channelName, chain.channelpeerlist)
            helper.getChannelConfig(signorg, channelName).then(function(config_envelope) {
                var original_config_proto = config_envelope.config.toBuffer();

                var response = superagent.post('http://127.0.0.1:7059/protolator/decode/common.Config',
                    original_config_proto)
                    .buffer()
                    .end((err, response) => {
                        if(err) {
                            res.json(err);
                            return
                        }
                        var original_config_json = response.text.toString();
                        res.json({
                            success: true,
                            data: original_config_json
                        })
                        return
                    });
            });
        }
    })

})

router.post("/uploadoriginalconfigjson", function (req, res) {

    const configDir = "."
    //const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, "originalconfig.json")
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('originalconfigjson');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})

router.post("/uploadupdatedconfigjson", function (req, res) {

    const configDir = "."
    //const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, "updatedconfig.json")
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('updatedconfigjson');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})


router.post("/:apikey/updatechannel", function(req, res) {
    const chainId = req.body.chainid;
    const channel_name = req.body.channelname
    const signorg = req.body.signorg;
    var updated_config_json
    var original_config_json
    var updated_config_proto
    var original_config_proto
    var config_proto
    var signatures = [];
    var orgs = req.body.orgs

    ChainModel.findOne({_id: chainId}, function (err, chain) {
        if (err) {
            res.json({
                success: false,
                error: "chain not exist!"
            })
        } else {
            let readpromises = []
            let p1 = new Promise((resolve, reject) => {
                fs.readFile("updatedconfig.json", function (err, data) {
                    if (err) {
                        res.json({
                            success: false,
                            error: "updatedconfig not exist!"
                        })
                        reject()
                    }
                    updated_config_json = new Buffer(data);
                    // updated_config_json = data
                    resolve()

                })
            })
            let p2 = new Promise((resolve, reject) => {
                fs.readFile("originalconfig.json", function (err, data) {
                    if (err) {
                        res.json({
                            success: false,
                            error: "originalconfig not exist!"
                        })
                        reject()
                    }
                    original_config_json = new Buffer(data);
                    resolve()

                })
            })
            readpromises.push(p1)
            readpromises.push(p2)


            Promise.all(readpromises).then(() => {

                var aaa = superagent.post('http://127.0.0.1:7059/protolator/encode/common.Config',
                    original_config_json.toString())
                    .buffer()
                    .end((err, res) => {
                        if(err) {
                            logger.error(err);
                            return;
                        }
                        let config_proto = res.body;
                        //logger.info('config_proto %s',config_proto.toString());
                    });

                return superagent.post('http://127.0.0.1:7059/protolator/encode/common.Config',
                    original_config_json.toString())
                    .buffer();

            }).then((response) => {
                original_config_proto = response.body;
                return superagent.post('http://127.0.0.1:7059/protolator/encode/common.Config',
                    updated_config_json.toString())
                    .buffer();
            }).then((response) => {
                updated_config_proto = response.body;
                var formData = {
                    channel: channel_name,
                    original: {
                        value: original_config_proto,
                        options: {
                            filename: 'original.proto',
                            contentType: 'application/octet-stream'
                        }
                    },
                    updated: {
                        value: updated_config_proto,
                        options: {
                            filename: 'updated.proto',
                            contentType: 'application/octet-stream'
                        }
                    }
                };

                return new Promise((resolve, reject) =>{
                    requester.post({
                        url: 'http://127.0.0.1:7059/configtxlator/compute/update-from-configs',
                        formData: formData
                    }, function optionalCallback(err, res, body) {
                        if (err) {
                            reject(err);
                        } else {
                            var proto = Buffer.from(body, 'binary');
                            resolve(proto);
                        }
                    });
                });

            }).then((response) =>{

                config_proto = response;

                let promises = []
                const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
                // helper.initialize(chain.template)
                helper.initializeWithChannel(chain.template, channel_name, chain.channelpeerlist)
                orgs.forEach((org, i) => {
                    let p = new Promise((resolve, reject) => {
                        var client = helper.getClientForOrg(org);
                        var channel = helper.getChannelForName(channel_name,org);
                        client._userContext = null;
                        helper.getOrgAdmin(org).then((user) => {
                            // read the config block from the orderer for the channel
                            // and initialize the verify MSPs based on the participating
                            // organizations
                            return channel.initialize();
                        }, (err) => {
                            // logger.error('Failed to enroll user \'' + username + '\'. ' + err);
                            // throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
                        }).then((success) => {

                            var signature = client.signChannelConfig(config_proto, channel_name);
                            signatures.push(signature);
                            client._userContext = null;

                            resolve()
                        });
                    })
                    promises.push(p)
                });

                Promise.all(promises).then(() => {

                    var client = helper.getClientForOrg("org1");
                    var channel = helper.getChannelForName(channel_name,org);
                    client._userContext = null;
                    helper.getOrgAdmin(signorg).then((user) => {
                        // read the config block from the orderer for the channel
                        // and initialize the verify MSPs based on the participating
                        // organizations
                        return channel.initialize();
                    }, (err) => {
                        // logger.error('Failed to enroll user \'' + username + '\'. ' + err);
                        // throw new Error('Failed to enroll user \'' + username + '\'. ' + err);
                    }).then((success) => {

                        let tx_id = client.newTransactionID();
                        let request = {
                            config: config_proto,
                            signatures : signatures,
                            name : channel_name,
                            orderer : channel.getOrderers()[0],
                            txId  : tx_id
                        };

                        // this will send the update request to the orderer
                        return client.updateChannel(request);
                    }).then((result) => {
                        if(result.status && result.status === 'SUCCESS') {
                            res.json({
                                success: true,
                                message: "Update Channel Success!"
                            })
                        } else {
                            res.json({
                                success: false,
                                message: "Update Channel Fail!"
                            })
                        }
                    })


                })
            })


        }
    })

});

router.post("/:apikey/:id/release", function(req, res) {
  const chain = new Chain(req.apikey, req.username);
  chain.release(req.params.id).then(function(result) {
    res.json(result);
  }).catch(function(err) {
    res.json(err);
  });
});
router.post("/:apikey/:id/edit", function(req, res) {
  const chain = new Chain(req.apikey, req.username);
  chain.edit(req.params.id, req.body.name).then(function(result) {
    res.json(result);
  }).catch(function(err) {
    res.json(err);
  });
});

router.post("/uploadchannelconfig", function (req, res) {

    const configDir = "."
    //const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, file.originalname)
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('channelconfigfile');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})


router.post("/uploadchanneltx", function (req, res) {

    const configDir = "."
    //const configDir = config.path.fabricConfig
    const storage = multer.diskStorage({
        destination: function(req, file, callback) {
            callback(null, configDir)
        },
        filename: function(req, file, callback) {
            callback(null, file.originalname)
        }
    })
    const upload = multer({
        storage: storage,
        limits: { fileSize: config.fileUploadLimits},
    }).single('channeltxfile');
    upload(req, res, function(err) {
        res.json({
            success: true
        })
    })
})



router.get("/:id/blockHeight", function (req, res) {
  const chainId = req.params.id;
  ChainModel.findOne({_id: chainId}, function (err, chain) {
    const chainRootDir = util.format(config.path.chain, req.username, chainId)
    const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
    //helper.initialize(chain.template)
    helper.initializeWithChannel(chain.template, chain.curchannel, chain.channelpeerlist)
    const query = require(`/opt/cello/fabric-1.0/lib/query`)
    query.getChannelHeight('peer1', req.username, 'org1', chain.curchannel)
      .then(function(message) {
        res.json({
          success: true,
          height: parseInt(message)
        })
      });
  })
})

router.get("/:id/channels", function (req, res) {
  const chainId = req.params.id;
  ChainModel.findOne({_id: chainId}, function (err, chain) {
      if (!chain.initialized){
          res.send({
              success: true,
              channels: [],
          })
          return
      }

      const chainRootDir = util.format(config.path.chain, req.username, chainId)
      const query = require(`/opt/cello/fabric-1.0/lib/query`)
      query.initializeWithChannel(chain.template,chain.curchannel, chain.channelpeerlist)
      query.getChannels('peer1', req.username, 'org1', chain.curchannel)
      .then(function(message) {
        res.send({
          success: true,
          channels:message.channels,
        });
      }, (err) => {
        res.send({
          success: false,
          channels: [],
          error: err.stack ? err.stack : err
        })
      }).catch((err) => {
      res.send({
        success: false,
        channels: [],
        error: err.stack ? err.stack : err
      })
    });
  })
})

router.get("/:id/recentBlock", function (req, res) {
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer;
  const fgindex = launchpeer.indexOf('-')
  const orgname = launchpeer.slice(0,fgindex)
  const peername = launchpeer.slice(fgindex+1,launchpeer.length)
  const currentChannel = req.query.currentChannel;
  const blockHeight = parseInt(req.query.blockHeight);
  let recentNum = parseInt(req.query.recentNum);
  recentNum = recentNum > blockHeight ? blockHeight : recentNum;
  let blockIds = []
  for (let index=blockHeight-1; index>=blockHeight-recentNum; index--) {
    blockIds.push(index)
  }
  let allBlocks = []
  ChainModel.findOne({_id: chainId}, function (err, chain) {
    let promises = []
    for (let index in blockIds) {
      const blockId = blockIds[index];
      let p = new Promise((resolve, reject) => {
        const chainRootDir = util.format(config.path.chain, req.username, chainId)
        const query = require(`/opt/cello/fabric-1.0/lib/query`)
        query.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist)
        query.getBlockByNumber(peername, blockId, req.username, orgname, currentChannel)
          .then(function (message) {
            const {header: {data_hash}} = message;
            let txTimestamps = []
            message.data.data.map((item, index) => {
              const {payload: {header: {channel_header: {tx_id, timestamp, channel_id}}}} = item;
              const txTime = moment(timestamp, "ddd MMM DD YYYY HH:mm:ss GMT+0000 (UTC)")
              txTimestamps.push(txTime.utc())
            })
            txTimestamps = txTimestamps.sort(function (a, b) {  return a - b;  });
            allBlocks.push({
              id: blockId,
              hash: data_hash,
              transactions: message.data.data.length,
              timestamp: txTimestamps.slice(-1).pop()
            })
            resolve()
          })
      })
      promises.push(p)
    }
    Promise.all(promises).then(() => {
      res.json({success: true, allBlocks})
    })
  })
})

router.get("/:id/recentTransaction", function (req, res) {
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer;
  const fgindex = launchpeer.indexOf('-')
  const orgname = launchpeer.slice(0,fgindex)
  const peername = launchpeer.slice(fgindex+1,launchpeer.length)

  const currentChannel = req.query.currentChannel;
  const blockHeight = parseInt(req.query.blockHeight);
  let recentNum = parseInt(req.query.recentNum);
  recentNum = recentNum > blockHeight ? blockHeight : recentNum;
  let blockIds = []
  for (let index=blockHeight-1; index>=blockHeight-recentNum; index--) {
    blockIds.push(index)
  }
  let allTransactions = []
  ChainModel.findOne({_id: chainId}, function (err, chain) {
    let promises = []
    for (let index in blockIds) {
      const blockId = blockIds[index];
      let p = new Promise((resolve, reject) => {
        const chainRootDir = util.format(config.path.chain, req.username, chainId)
        const query = require(`/opt/cello/fabric-1.0/lib/query`)
        query.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist)
        query.getBlockByNumber(peername, blockId, req.username, orgname, currentChannel)
          .then(function (message) {
            message.data.data.map((item, index) => {
              const {payload: {header: {channel_header: {tx_id, timestamp, channel_id}}}} = item;
              const txTime = moment(timestamp, "ddd MMM DD YYYY HH:mm:ss GMT+0000 (UTC)")
              if (tx_id) {
                allTransactions.push({
                  id: tx_id,
                  timestamp: txTime.utc(),
                  channelId: channel_id
                })
              }
            })
            resolve()
          })
      })
      promises.push(p)
    }
    Promise.all(promises).then(() => {
      res.json({success: true, allTransactions})
    })
  })
})

router.get("/:id/queryByBlockId", function (req, res) {
  const blockId = req.query.id;
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer;
  const currentChannel = req.query.currentChannel;
  const fgindex = launchpeer.indexOf('-')
  const orgname = launchpeer.slice(0,fgindex)
  const peername = launchpeer.slice(fgindex+1,launchpeer.length)


  ChainModel.findOne({_id: chainId}, function (err, chain) {
    const chainRootDir = util.format(config.path.chain, req.username, chainId)
    const query = require(`/opt/cello/fabric-1.0/lib/query`)
    query.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist);
    query.getBlockByNumber(peername, blockId, req.username, orgname, chain.curchannel)
        .then(function(message) {
            let txList = []
            message.data.data.map((item, index) => {
                const {payload: {header: {channel_header: {tx_id, timestamp, channel_id}}}} = item;
                const txTime = moment(timestamp, "ddd MMM DD YYYY HH:mm:ss GMT+0000 (UTC)")
                txList.push({
                    id: tx_id,
                    timestamp: txTime.unix(),
                    channelId: channel_id
                })
            })
            res.send({
                success: true,
                txList
            });
        }, (err) => {
            res.json({
                success: false,
                error: err.stack ? err.stack : err
            })
        }).catch((err) => {
        res.json({
            success: false,
            txList: [],
            error: err.stack ? err.stack : err
        })
    });


  })
})

router.get("/:id/queryByTransactionId", function (req, res) {
  const trxnId = req.query.id;
  const chainId = req.params.id;
  const launchpeer = req.query.launchpeer;
  const currentChannel = req.query.currentChannel;
  const fgindex = launchpeer.indexOf('-');
  const orgname = launchpeer.slice(0,fgindex);
  const peername = launchpeer.slice(fgindex+1,launchpeer.length);

  ChainModel.findOne({_id: chainId}, function (err, chain) {
    const chainRootDir = util.format(config.path.chain, req.username, chainId)
    const query = require(`/opt/cello/fabric-1.0/lib/query`)
      query.initializeWithChannel(chain.template,currentChannel, chain.channelpeerlist)
      query.getTransactionByID(peername, trxnId, req.username, orgname, chain.curchannel)
      .then(function(message) {
        logger.debug(`message ${JSON.stringify(message, null, 2)}`)
        const {transactionEnvelope: {payload: {header: {channel_header: {type}}, data: {actions}}}, validationCode} = message
        const action = actions.length ? actions[0] : {}
        // const {payload: {chaincode_proposal_payload: {input: {chaincode_spec: {type, chaincode_id: {name}, input: {args}}}}}} = action
        const {payload: {action: {proposal_response_payload: {extension: {chaincode_id:{name,version}, response:{payload}}}}}} = action
        res.json({
          success: true,
          chaincodename:name,
          chaincodeversion:version,
          txdata:payload,
          validationCode,
          type
          // name
          // args
        })
      }, (err) => {
        res.json({
          success: false,
          error: err.stack ? err.stack : err
        })
      }).catch((err) => {
      res.json({
        success: false,
        error: err.stack ? err.stack : err
      })
    });
  })
})

router.get("/:id/chainCodes", function (req, res) {
  const chainId = req.params.id;
  let allChainCodes = []
  ChainModel.findOne({_id: chainId}, function (err, chain) {
    const chainRootDir = util.format(config.path.chain, req.username, chainId)
    const query = require(`/opt/cello/fabric-1.0/lib/query`)
    query.initializeWithChannel(chain.template,chain.curchannel, chain.channelpeerlist)
    query.getInstalledChaincodes('peer1', 'instantiated', req.username, 'org1', chain.curchannel)
      .then(function(message) {
        let promises = []
        for (let index in message) {
          const chainCodeString = message[index];
          let l = chainCodeString.slice(0,-1).split(',');
          let chainCode = {};
          for (let i in l) {
            let a = l[i].split(':');
            logger.debug(`key ${a[0]} ${a[1]}`)
            chainCode[a[0].trim()] = a[1].trim();
          }
          let p = new Promise((resolve, reject) => {
            logger.debug(`chain code name ${chainCode.name}`)
            ChainCode.findOne({chainCodeName: chainCode.name}, function (err, chainCodeDoc) {
              if (err) {
                resolve()
              } else {
                if (chainCodeDoc) {
                  allChainCodes.push({
                    name: chainCodeDoc.name
                  })
                }
                resolve()
              }
            })
          })
          promises.push(p)
        }
        Promise.all(promises).then(() => {
          res.json({success: true, allChainCodes})
        })
      }, (err) => {
        res.json({
          success: false,
          error: err.stack ? err.stack : err
        })
      }).catch((err) => {
      res.json({
        success: false,
        error: err.stack ? err.stack : err
      })
    });
  })
})

export default router
