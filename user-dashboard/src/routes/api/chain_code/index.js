
/* Copyright IBM Corp, All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/
import { Router } from 'express'
import multer from 'multer'
import ChainCode from '../../../models/chainCode'
import ChainModel from '../../../models/chain'
import subChainModel from '../../../models/subchain'
import config from '../../../config'
const mongoose = require('mongoose');
const crypto = require("crypto");
const path = require('path')
const fs = require('fs-extra');
import util from 'util'
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"
const io = require('../../../io').io();
logger.setLevel(logLevel);

const router = new Router()


router.get("/", function (req, res) {
  ChainCode.find({userId: req.apikey, ...req.query}).sort('-uploadTime').populate('chain').exec( function (err, docs) {
    if (err) res.json({success: false, err})
    const chainCodes = docs.map((chainCode, i) => {
      return {
        id: chainCode.id,
        name: chainCode.name,
        uploadTime: chainCode.uploadTime,
        chainName: chainCode.chain ? chainCode.chain.name : "",
        status: chainCode.status
      }
    })
    res.json({
      success: true,
      chainCodes
    })
  })
})

router.delete("/:id", function (req, res) {
  const chainCodeId = req.params.id;
  ChainCode.findOne({_id: chainCodeId}, function (err, doc) {
    if (err) {
      res.json({success: false})
    } else {
      doc.remove(function(err){logger.error(err)});
      res.json({success: true})
    }
  })
})

router.put("/:id", function (req, res) {
  const name = req.body.name;
  ChainCode.findOneAndUpdate({_id: req.params.id}, {name}, {upsert: true}, function (err, doc) {
    if (err) {
      res.json({success: false})
    } else {
      res.json({success: true})
    }
  })
})

router.post("/install", function (req, res) {
    let chainId;
    const orgs = req.body.orgs
    const channelName = req.body.channelname
    const signorg = req.body.signorg
    const id = req.body.id;
    const name = req.body.name;
    if(typeof(req.body.chainId)!="undefined"){
        chainId = req.body.chainId;

        const chainRootDir = util.format(config.path.chain, req.username, chainId)
        const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
        const install = require(`/opt/cello/fabric-1.0/lib/install-chaincode`);

        ChainModel.findOne({_id: chainId}, function (err, chainDoc) {
            if (err) res.json({success: false})
            const clusterId = chainDoc.clusterId;
            const chaincodeVersion = "v0"
            const chaincodePath = `github.com/${id}`
            const chaincodeName = `${clusterId}-${id}`;

            let orgNames=[]
            for (let i=0; i<orgs.length; i++){
                let fgindex = orgs[i].indexOf('-')
                let oname = orgs[i].slice(0,fgindex)
                if(orgNames.indexOf(oname) == -1)
                    orgNames.push(oname)
            }



            helper.initializeWithChannel(chainDoc.template, channelName, chainDoc.channelpeerlist)
            // install.initialize(chainDoc.template)
            function asyncInstallChainCode(arr) {
                return arr.reduce((promise, orgName) => {
                    return promise.then((result) => {
                        return new Promise((resolve, reject) => {
                            helper.setupChaincodeDeploy()

                            let peerNames = []
                            for (let i=0; i<orgs.length; i++){
                                let fgindex = orgs[i].indexOf('-')
                                if (orgName == orgs[i].slice(0,fgindex)){
                                    peerNames.push(orgs[i].slice(fgindex+1,orgs[i].length))
                                }
                            }

                            install.installChaincode(peerNames, chaincodeName, chaincodePath, chaincodeVersion, req.username, orgName, channelName)
                                .then(function (message) {
                                    resolve()
                                });
                        })
                    })
                }, Promise.resolve())
            }
            ChainCode.findOne({_id: id}, function (err, chainCode) {
                fs.copySync(chainCode.path, `${chainRootDir}/src/github.com/${id}`)
                asyncInstallChainCode(orgNames).then(() => {
                    chainCode.status = "installed";
                    chainCode.chainCodeName = chaincodeName;
                    chainCode.chain = chainDoc._id;
                    chainCode.save()
                    res.json({success: true});
                })
            })
        })
    } else if(typeof(req.body.subchainId)!="undefined"){
        chainId = req.body.subchainId;

        const id = req.body.id;
        const chainRootDir = util.format(config.path.chain, req.username, chainId)
        const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
        const install = require(`/opt/cello/fabric-1.0/lib/install-chaincode`);

        subChainModel.findOne({_id: chainId}, function (err, chainDoc) {
            if (err) res.json({success: false})
            const clusterId = chainDoc.clusterId;
            const chaincodeVersion = "v0"
            const chaincodePath = `github.com/${id}`
            const chaincodeName = `${clusterId}-${id}`;
            const size = chainDoc.size;
            let peer_end = 1
            let peerNames = []
            let orgNames = ["Org1"]
            if (size > 1) {
                orgNames = ["Org1", "Org2"]
                peer_end = size/2
            }
            for (let i=0; i<peer_end; i++) {
                peerNames.push(`peer${i+1}`)
            }
            helper.initializeWithChannel(chainDoc.template,channelName, chainDoc.channelpeerlist)
            install.initializeWithChannel(chainDoc.template,channelName, chainDoc.channelpeerlist)
            function asyncInstallChainCode(arr) {
                return arr.reduce((promise, orgName) => {
                    return promise.then((result) => {
                        return new Promise((resolve, reject) => {
                            helper.setupChaincodeDeploy()
                            install.installChaincode(peerNames, chaincodeName, chaincodePath, chaincodeVersion, req.username, orgName,channelName)
                                .then(function (message) {
                                    resolve()
                                });
                        })
                    })
                }, Promise.resolve())
            }
            ChainCode.findOne({_id: id}, function (err, chainCode) {
                fs.copySync(chainCode.path, `${chainRootDir}/src/github.com/${id}`)
                asyncInstallChainCode(orgNames).then(() => {
                    chainCode.status = "installed";
                    chainCode.chainCodeName = chaincodeName;
                    chainCode.chain = chainDoc._id;
                    chainCode.save()
                    res.json({success: true});
                })
            })
        })
    }


})

router.post("/instantiate", function (req, res) {
    let chainId;
    if(typeof(req.body.chainId)!="undefined"){
        chainId = req.body.chainId;
    } else if(typeof(req.body.subchainId)!="undefined"){
        chainId = req.body.subchainId;
    }

  const id = req.body.id;
  const user_id = req.apikey;
  const args = req.body.parameter;
  const channelName = req.body.channelname
  const orgName = req.body.signorg
  const chaincodeVersion = "v0"
  const fcn = null
  const chainRootDir = util.format(config.path.chain, req.username, chainId)
  const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
  const instantiate = require(`/opt/cello/fabric-1.0/lib/instantiate-chaincode`);
  ChainCode.findOne({_id: id}).populate('chain').exec(function (err, chainCode) {
    if (err) {
      res.json({success: false})
    } else {
      helper.initializeWithChannel(chainCode.chain.template, channelName, chainCode.chain.channelpeerlist)
      helper.setupChaincodeDeploy()
      instantiate.initializeWithChannel(chainCode.chain.template, channelName, chainCode.chain.channelpeerlist)
      instantiate.instantiateChaincode(channelName, chainCode.chainCodeName, chaincodeVersion, fcn, args, req.username, orgName)
        .then(function(message) {
          chainCode.status = "instantiated"
          chainCode.save()
          io.to(user_id).emit('instantiate done', {
            chainName: chainCode.chain.name,
            name: chainCode.name,
            id: chainCode.id,
            message: 'instantiate done'
          });
        });
      chainCode.status = "instantiating"
      chainCode.save()
      res.json({
        success: true
      });
    }
  })
})

router.post("/call", function (req, res) {
  const channelName = req.body.channelname;
  const method = req.body.method ? req.body.method : "query";
  // const orgName = req.body.signorg;
  const endorsers = req.body.endorsers;
  const eventhubs = req.body.eventhubs;
  const chainCodeId = req.body.id;
  const args = req.body.parameter;
  const fcn = req.body.func;
  const user_id = req.apikey;

    const fgindex = eventhubs.indexOf('-');
    const orgName = eventhubs.slice(0,fgindex);
    const peerName = eventhubs.slice(fgindex+1,eventhubs.length);

  ChainCode.findOne({_id: chainCodeId}).populate('chain').exec(function (err, chainCode) {
    if (err) {
      res.json({success: false})
    } else {
      const chainId = chainCode.chain.id;
      const chainRootDir = util.format(config.path.chain, req.username, chainId)
      const chainCodeName = chainCode.chainCodeName;
      const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
      helper.initializeWithChannel(chainCode.chain.template, channelName, chainCode.chain.channelpeerlist)
      helper.setupChaincodeDeploy()
      const query = require(`/opt/cello/fabric-1.0/lib/query`)
      if (method === "invoke") {
        const invoke = require(`/opt/cello/fabric-1.0/lib/invoke-transaction`)
        invoke.initializeWithChannel(chainCode.chain.template, channelName, chainCode.chain.channelpeerlist)
        invoke.invokeChaincode(endorsers,peerName, channelName, chainCodeName, fcn, args, req.username, orgName)
          .then(function(message) {
            const success = message.toLowerCase().indexOf("error") < 0
            res.json({
              message,
              success
            });
            if (success) {
              io.to(user_id).emit('new transaction', {
                id: message
              });
            }
          });
      } else {
        query.initializeWithChannel(chainCode.chain.template, channelName, chainCode.chain.channelpeerlist)
        query.queryChaincode("peer1", channelName, chainCodeName, args, fcn, req.username, orgName)
          .then(function(message) {
            const success = message.toLowerCase().indexOf("error") < 0
            res.json({
              success,
              message
            });
          });
      }
    }
  })

})


router.post("/upload", function (req, res) {
  const chainCodeId = crypto.randomBytes(8).toString("hex");
  let chainCodeName
  const codeDir = util.format(config.path.chainCode, req.username, chainCodeId)
  const storage = multer.diskStorage({
    destination: function(req, file, callback) {
      callback(null, codeDir)
    },
    filename: function(req, file, callback) {
      callback(null, file.fieldname + '-' + Date.now() + path.extname(file.originalname))
    }
  })
  const upload = multer({
    storage: storage,
    limits: { fileSize: config.fileUploadLimits},
    fileFilter: function(req, file, callback) {
      const ext = path.extname(file.originalname)
      chainCodeName = path.basename(file.originalname, '.go')
      if (ext !== '.go') {
        return callback(res.end({
          success: false,
          message: 'Only go code file is allowed'
        }), null)
      }
      fs.ensureDirSync(codeDir)
      callback(null, true)
    }
  }).single('code');
  upload(req, res, function(err) {
    const newChainCode = new ChainCode({
      name: `${chainCodeName}-${chainCodeId}`,
      userId: req.apikey,
      path: codeDir
    })
    newChainCode.save(function(err, data){
      if(err){ return console.log(err) }
      res.json({
        success: true
      })
    })
  })
})

export default router
