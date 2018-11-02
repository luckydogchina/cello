
/* Copyright IBM Corp, All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/
import jsonfile from 'jsonfile'
import rimraf from 'rimraf'
import sleep from 'sleep-promise';
import config from '../config'
import util from 'util'
const shell = require('shelljs');
const mongoose = require('mongoose');
const fs = require('fs-extra');
const crypto = require("crypto");
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"
const io = require('../io').io();
import ChainCode from './chainCode'
import UserModel from './user'
logger.setLevel(logLevel);

const subchainSchema = new mongoose.Schema({
  user_id: String,
  username: String,
  serviceUrl: mongoose.Schema.Types.Mixed,
  size: Number,
  // plugin: String,
  // mode: String,
  name: String,
  clusterId: String,
  keyValueStore: String,
  ccSrcPath: String,
  initialized: {type: Boolean, default: false},
  template: mongoose.Schema.Types.Mixed,
  type: String,
  channelName:String,
  templateFile:String,
  orgs:[],
})

subchainSchema.post('save', function(doc, next) {
  // const {type, serviceUrl, id, username} = doc;
  //
  // const templateFile = `/opt/cello/fabric-1.0/config.json`
  //
  //   let org_numbers = []
  //   let temports = [];
  //   let orgpeernum = [];
  //   let orgnum = 0;
  //   let size=0;
  //
  // const chainRootDir = util.format(config.path.chain, username, id)
  // fs.ensureDirSync(chainRootDir);
  // try {
  //   jsonfile.readFile(templateFile, function(err, template) {
  //
  //       for (let key in template.network) {
  //           if (key.indexOf('org') === 0 || key.indexOf('Org') === 0) {
  //               orgnum++;
  //               org_numbers.push(orgnum)
  //               temports.push(key);
  //               let pnum = 0;
  //               for (let key2 in template.network[key].peers){
  //                   size ++;
  //                   pnum++;
  //               }
  //               orgpeernum.push(pnum)
  //           }
  //       }
  //
  //     template.network.orderer.url = `grpcs://${serviceUrl.orderer}`
  //     org_numbers.map((org_number, i) => {
  //       const ca_org_ecap = serviceUrl[`ca_org${org_number}_ecap`]
  //       template.network[`org${org_number}`].ca = `https://${ca_org_ecap}`
  //       for (let i=0; i<orgpeernum[i]; i++) {
  //         template.network[`org${org_number}`].peers[`peer${i+1}`].requests = "grpcs://"+serviceUrl[`peer${i}_org${org_number}_grpc`]
  //         template.network[`org${org_number}`].peers[`peer${i+1}`].events = "grpcs://"+serviceUrl[`peer${i}_org${org_number}_event`]
  //       }
  //     })
  //     template.keyValueStore = `${chainRootDir}/client-kvs`
  //     template.CC_SRC_PATH = chainRootDir
  //     const txDir = `${chainRootDir}/tx`
  //     const libDir = `${chainRootDir}/lib`
  //     fs.ensureDirSync(libDir)
  //     shell.cp('-R', '/home/lijisai/cello/user-dashboard/src/config-template/cc_code/examples', template.CC_SRC_PATH);
  //     // shell.cp('-R', `/home/lijisai/cello/user-dashboard/src/modules/${type}/*`, libDir)
  //
  //     fs.ensureDirSync(template.keyValueStore)
  //     fs.ensureDirSync(txDir)
  //
  //     const configFile = `${chainRootDir}/network-config.json`
  //     jsonfile.writeFile(configFile, template, function (err) {
  //       if (err) logger.error(err)
  //       doc.template = template;
  //
  //         //template, size:peernum, orgs:temports
  //       model.findOneAndUpdate({_id: doc.id}, {template:template,size:size, orgs:temports}, {upsert: true, new:true}, function (err, doc) {
  //         if (err) { logger.error(err) }
  //         next()
  //       })
  //     })
  //   })
  // } catch (err) {
  //   logger.error(err)
  // }
    next()
});

//
// function copyExamples (doc, type) {
//   const {username, user_id} = doc;
//   const fsCommon = require('fs')
//   const path = require('path')
//
//   const dirs = p => fsCommon.readdirSync(p).filter(f => fsCommon.statSync(path.join(p, f)).isDirectory())
//   const subDirs = dirs(config.examples[type])
//   subDirs.map((subDir, i) => {
//     const exampleSourceDir = path.join(config.examples[type], subDir)
//     const chainCodeId = crypto.randomBytes(8).toString("hex");
//     const codeDir = util.format(config.path.chainCode, username, chainCodeId)
//     fs.ensureDirSync(codeDir)
//     shell.cp('-R', `${exampleSourceDir}/*`, codeDir);
//     const newChainCode = new ChainCode({
//       name: `${type}-${subDir}`,
//       userId: user_id,
//       path: codeDir
//     })
//     newChainCode.save(function(err, data){
//       if(err){ return console.log(err) }
//     })
//   })
// }


subchainSchema.post('remove', function(doc) {
  const {username, id} = doc;
  const chainRootDir = util.format(config.path.chain, username, id)
  rimraf(chainRootDir, function () { logger.info(`delete directory ${chainRootDir}`); });
  ChainCode.find({chain: doc}).exec( function (err, chainCodes) {
    chainCodes.map((chainCode, i) => {
      chainCode.status = "uploaded";
      chainCode.save()
    })
  })
});

const model = mongoose.model('subchain', subchainSchema);

module.exports = model;
