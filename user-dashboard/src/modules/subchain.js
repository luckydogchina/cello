
/* Copyright IBM Corp, All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
 */

/**
 * Created by lixuc on 2017/5/3.
 */
var rp = require("request-promise");
var configuration = require("./configuration");
var dt = require("../kit/date-tool");
var Pagination = require("../kit/pagination");
import jsonfile from 'jsonfile'
import Moment from 'moment'
import { extendMoment } from 'moment-range';
import util from 'util'
import config from '../config'
import sleep from 'sleep-promise';
import ChainModel from '../models/subchain'
import UserModel from '../models/user'
import ChainCodeModel from '../models/chainCode'
const fs = require('fs-extra');
const crypto = require("crypto");
const shell = require('shelljs');
const mongoose = require('mongoose');
const moment = extendMoment(Moment);
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"

const io = require('../io').io();

logger.setLevel(logLevel);

function subchain(apikey, username) {
    this.apikey = apikey;
    this.username = username;
    // this.clusterid = null;  // ljs modified
}
subchain.prototype = {
    RESTfulURL: "http://" + configuration.RESTful_Server + configuration.RESTful_BaseURL,
    PoolManagerURL: "http://" + configuration.PoolManager_Server + configuration.PoolManager_BaseURL,
    LogURL: "http://" + configuration.Log_Server + configuration.Log_BaseURL,
    amount: function() {
        return new Promise(function(resolve, reject) {
            rp({
                uri: this.RESTfulURL + "cluster/list?user_id=" + this.apikey,
                json: true
            }).then(function(response) {
                if (response.success) {
                    var clusters = response.result.clusters;
                    resolve({
                        success: true,
                        amount: clusters.length
                    });
                } else {
                    var e = new Error(response.message);
                    e.status = 503;
                    throw e;
                }
            }).catch(function(err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
                });
            });
        }.bind(this));
    },

    list: function(page) {
        const username = this.username
        const userId = this.apikey
        let chains = [];
        return new Promise(function(resolve, reject) {

                let promises = []
                let p = new Promise((resolve, reject) => {

                    ChainModel.findOne({user_id: userId}, function (err, chainDoc) {

                        if (chainDoc != null) {
                            if (chainDoc.template == null) {
                                chainDoc.remove(function(err){logger.error(err)});
                            } else {

                                let orgtable = []
                                let peertable = []
                                let ordertable = []

                                let thistemplate = chainDoc.template
                                for (let orderkey in thistemplate.network) {
                                    if (orderkey == 'orderer')
                                        ordertable.push({
                                            serverHostname: thistemplate.network[orderkey].server_hostname,
                                            url: thistemplate.network[orderkey].url,
                                        })

                                }
                                for (let orgkey in thistemplate.network.application) {
                                    orgtable.push({
                                        name: thistemplate.network.application[orgkey].name,
                                        mspid: thistemplate.network.application[orgkey].mspid,
                                        ca: thistemplate.network.application[orgkey].ca,
                                        peernum: 2,
                                    })

                                    for (let peerkey in thistemplate.network.application[orgkey].peers){
                                        peertable.push({
                                            serverHostname: thistemplate.network.application[orgkey].peers[peerkey].server_hostname,
                                            org: thistemplate.network.application[orgkey].name,
                                            requests: thistemplate.network.application[orgkey].peers[peerkey].requests,
                                            events: thistemplate.network.application[orgkey].peers[peerkey].events,
                                        })
                                    }
                                }

                                chains.push({
                                    id: chainDoc.clusterId,
                                    dbId: chainDoc.id,
                                    blocks: 0,
                                    scNum: 0,
                                    initialized: chainDoc.initialized,
                                    keyValueStore: chainDoc.keyValueStore,
                                    status: chainDoc.initialized ? "running" : "initializing",
                                    name: chainDoc.name,
                                    template: chainDoc.template,
                                    type: chainDoc.type,
                                    peerNum: chainDoc.size,
                                    createTime: 0,
                                    runningHours: 0,
                                    orgs: chainDoc.orgs,
                                    orgtable,
                                    peertable,
                                    ordertable
                                });
                            }
                        }
                        resolve()
                    })
                })

                promises.push(p)

                function asyncQuery(arr) {
                    return arr.reduce((promise, chain) => {
                        return promise.then((result) => {
                            return new Promise((resolve, reject) => {

                                const query = require(`/opt/cello/fabric-1.0/lib/query`)
                                query.initializeWithChannel(chain.template,chain.curchannel, chain.channelpeerlist)
                                query.getChannels('peer1', username, chain.orgs[0], chain.curchannel)
                                    .then(function(message) {
                                        if (typeof message != 'string' && ( typeof(message.channels.length) != "undefined") &&  message.channels.length > 0){
                                            chain.initialized = true
                                            chain.status = "running"

                                            ChainModel.findOneAndUpdate({clusterId: chain.id}, {initialized:true}, {upsert: true, new:true}, function (err, doc) {
                                                if (err) { logger.error(err) }
                                            })
                                        }

                                        if (chain.initialized) {
                                            const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
                                            helper.initializeWithChannel(chain.template,chain.curchannel, chain.channelpeerlist)
                                            helper.setupChaincodeDeploy()
                                            // const query = require(`/opt/cello/fabric-1.0/lib/query`)
                                            // query.initialize(chain.template)
                                            query.getChannelHeight("peer1", username, chain.orgs[0], chain.curchannel)
                                                .then(function(message) {
                                                    const chainIndex = chains.findIndex(x => x.id === chain.id);
                                                    let chainItem = chains[chainIndex]
                                                    chainItem.blocks = parseInt(message)
                                                    chains[chainIndex] = chainItem
                                                }).then(sleep(500)).then(() => {
                                                resolve()
                                            })
                                        } else {
                                            resolve()
                                        }

                                    }, (err) => {
                                        resolve()
                                    }).catch((err) => {
                                        resolve()
                                });

                            })
                        })
                    }, Promise.resolve())
                }



                Promise.all(promises).then(() => {
                    asyncQuery(chains).then(() => {
                        resolve({
                            success: true,
                            chains: chains,
                            totalNumber: chains.length,//pg.getTotalRow(),
                            totalPage: chains.length//pg.getTotalPage()
                        });
                    })
                })


        }.bind(this));
    },

    apply: function(name, chainaddress) {
        return new Promise(function(resolve, reject) {
            const apikey = this.apikey
            const username = this.username
            // let serviceUrl = { "ca_org1_ecap": "192.168.1.109:7850",
            //                     "ca_org2_ecap": "192.168.1.109:7950",
            //                     "dashboard":  "192.168.1.109:8150",
            //                     "orderer":  "192.168.1.109:8050",
            //                     "peer0_org1_event":  "192.168.1.109:7150",
            //                     "peer0_org1_grpc":  "192.168.1.109:7050",
            //                     "peer0_org2_event":  "192.168.1.109:7550",
            //                     "peer0_org2_grpc":  "192.168.1.109:7450",
            //                     "peer1_org1_event":  "192.168.1.109:7350",
            //                     "peer1_org1_grpc":  "192.168.1.109:7250",
            //                     "peer1_org2_event":  "192.168.1.109:7750",
            //                     "peer1_org2_grpc":  "192.168.1.109:7650"
            //                     }
            const sevice_url_str = '{'+chainaddress+'}';
            const serviceUrl = JSON.parse(sevice_url_str);

            const chainId = mongoose.Types.ObjectId();
            const chainRootDir = util.format(config.path.chain, username, chainId)
            let newChain

            const templateFile = `/opt/cello/fabric-1.0/config.json`

            // let org_numbers = []
            let temporgs = [];
            // let orgpeernum = [];
            // let orgnum = 0;
            let size=0;



            try {
                 fs.ensureDirSync(chainRootDir);
                 jsonfile.readFile(templateFile, function(err, template) {

                    template.network.orderer.url = `grpcs://${serviceUrl.orderer}`

                    let orgindex = 0
                    let peerindex = 0
                    for (let orgkey in template.network.application) {
                        temporgs.push(orgkey);

                        const ca_org_ecap = serviceUrl[`ca_org${orgindex+1}_ecap`]
                        template.network.application[orgkey].ca = `https://${ca_org_ecap}`

                        peerindex = 0
                        for (let peerkey in template.network.application[orgkey].peers){
                            template.network.application[orgkey].peers[peerkey].requests = "grpcs://"+serviceUrl[`peer${peerindex}_org${orgindex+1}_grpc`]
                            template.network.application[orgkey].peers[peerkey].events = "grpcs://"+serviceUrl[`peer${peerindex}_org${orgindex+1}_event`]
                            size ++;
                            peerindex++
                        }
                        orgindex++
                    }

                    template.keyValueStore = `${chainRootDir}/client-kvs`
                    template.CC_SRC_PATH = chainRootDir
                    const txDir = `${chainRootDir}/tx`
                    const libDir = `${chainRootDir}/lib`
                    fs.ensureDirSync(libDir)
                    shell.cp('-R', '/home/lijisai/cello/user-dashboard/src/config-template/cc_code/examples', template.CC_SRC_PATH);
                    // shell.cp('-R', `/home/lijisai/cello/user-dashboard/src/modules/${type}/*`, libDir)

                    fs.ensureDirSync(template.keyValueStore)
                    fs.ensureDirSync(txDir)

                    const configFile = `${chainRootDir}/network-config.json`
                    jsonfile.writeFile(configFile, template, function (err) {
                        if (err) {
                            logger.error(err)
                            err.status = 503;
                            throw err;
                        }

                        newChain = new ChainModel({
                            _id: chainId,
                            keyValueStore: `${chainRootDir}/client-kvs`,
                            ccSrcPath: chainRootDir,
                            serviceUrl,  // ljs 暂时没办法生成service_url,可以参照chain里面的值，拼装一个
                            user_id: apikey,
                            size,
                            username,
                            name,
                            // plugin,
                            // mode,
                            type: "fabric",
                            template,
                            clusterId: chainId.toString(),
                            orgs:temporgs
                        })

                        newChain.save(function(err, data){
                            if(err){ return console.log(err) }

                            resolve({
                                success: true,
                                id: chainId.toString(),
                                dbId: newChain.id,
                                applyTime: 0
                            });
                        })

                    })
                })
            } catch (err) {
                logger.error(err)
                resolve({
                    success: false,
                });
            }


            // newChain = new ChainModel({
            //     _id: chainId,
            //     keyValueStore: `${chainRootDir}/client-kvs`,
            //     ccSrcPath: chainRootDir,
            //     serviceUrl,  // ljs 暂时没办法生成service_url,可以参照chain里面的值，拼装一个
            //     user_id: apikey,
            //     username,
            //     // plugin,
            //     // mode,
            //     type: "fabric",
            //     clusterId: chainId.toString(),
            // })
            //
            // newChain.save(function(err, data){
            //     if(err){ return console.log(err) }
            //
            //     resolve({
            //         success: true,
            //         id: chainId.toString(),
            //         dbId: newChain.id,
            //         applyTime: 0
            //     });
            // })

        }.bind(this));
    },

    genchanneltxfile: function(channelname) {
        return new Promise(function(resolve, reject){
            try {
                const channelName = channelname;
                const channelConfigPath = ".";
                fs.ensureDirSync(channelConfigPath)
                if (shell.exec(`configtxgen -profile TwoOrgsChannel -channelID ${channelName} -outputCreateChannelTx ${channelConfigPath}/${channelName}.tx`).code !== 0) {
                    var e = new Error('generate channel tx file fail');
                    e.status = 503;
                    throw e;
                }

                const filepath = channelConfigPath+'/'+channelName+'.tx';
                fs.readFile(filepath, 'binary', function (err, data) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    }
                    fs.writeFile('./copychannel.tx', data, 'binary');

                    var b = new Buffer(data).toString('base64');

                    var bitmap = new Buffer(b, 'base64');
                    fs.writeFile('./copy2222channel.tx', bitmap, 'binary');

                    resolve({
                        success: true,
                        filedata: b,
                    });

                })

            } catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "Create Channel fail!"
                });
            }

        }.bind(this));

    },

    createchannel: function(chainid, channelname) {
        return new Promise(function(resolve, reject){
            try {
                ChainModel.findOne({_id: chainid}, function (err, doc) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    } else {
                        const {id, username} = doc;
                        const channelName = channelname;
                        const chainRootDir = util.format(config.path.chain, username, id)
                        const channelConfigPath = `${chainRootDir}/tx`

                        fs.ensureDirSync(channelConfigPath)
                        shell.cp('-R', `./${channelName}.tx`, channelConfigPath);

                        const helper = require(`/opt/cello/fabric-1.0/lib/helper.js`)
                        helper.initializeWithChannel(doc.template, channelName, doc.channelpeerlist)
                        const channels = require(`/opt/cello/fabric-1.0/lib/create-channel.js`);
                        channels.initializeWithChannel(doc.template, channelName, doc.channelpeerlist)

                        channels.createChannel(channelName, `${channelConfigPath}/${channelName}.tx`, username, "org1")
                            .then(
                                resolve({
                                    success: true,
                                    message: "Create Channel Success!"
                                })
                            )
                    }
                })
            } catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "Create Channel fail!"
                });
            }

        }.bind(this));

    },


    joinchannel: function(chainid, channelname,orgs) {
        return new Promise(function(resolve, reject){
            try {
                ChainModel.findOne({_id: chainid}, function (err, doc) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    } else {
                        const {id, username, clusterId, user_id, size, keyValueStore, template} = doc;
                        const channelName = channelname;
                        const chainRootDir = util.format(config.path.chain, username, id)

                        let orgNames=[]

                        for (let i=0; i<orgs.length; i++){
                            let fgindex = orgs[i].indexOf('-')
                            let oname = orgs[i].slice(0,fgindex)
                            if(orgNames.indexOf(oname) == -1)
                                orgNames.push(oname)
                        }


                        const helper = require(`/opt/cello/fabric-1.0/lib/helper.js`)
                        helper.initializeWithChannel(doc.template, doc.curchannel, doc.channelpeerlist)

                        const channels = require(`/opt/cello/fabric-1.0/lib/create-channel.js`);
                        channels.initializeWithChannel(doc.template, doc.curchannel, doc.channelpeerlist)
                        function asyncInstallChainCode(arr) {
                            return arr.reduce((promise, orgName) => {
                                return promise.then((result) => {
                                    return new Promise((resolve, reject) => {
                                        let peerNames = []
                                        for (let i=0; i<orgs.length; i++){
                                            let fgindex = orgs[i].indexOf('-')
                                            if (orgName == orgs[i].slice(0,fgindex)){
                                                peerNames.push(orgs[i].slice(fgindex+1,orgs[i].length))
                                            }
                                        }

                                        // for (let key in template.network[orgName].peers) {
                                        //     peerNames.push(key)
                                        // }

                                        const join = require(`/opt/cello/fabric-1.0/lib/join-channel.js`);
                                        join.initializeWithChannel(doc.template, doc.curchannel, doc.channelpeerlist)
                                        join.joinChannel(channelName, peerNames, username, orgName)
                                            .then(function(message) {
                                                resolve()
                                            });
                                    })
                                })
                            }, Promise.resolve())
                        }

                        helper.setupCryptoSuite(channelName)
                        asyncInstallChainCode(orgNames).then(() => {
                            io.to(user_id).emit('update chain', {message: 'initialize done'});
                            ChainModel.findOneAndUpdate({_id: doc.id}, {initialized: true}, {upsert: true}, function (err, doc) {
                                if (err) {
                                    logger.error(err)
                                    err.status = 503;
                                    throw err;
                                }

                            })
                        })

                        resolve({
                            success: true,
                            message: "Join Channel Success!"
                        });
                    }
                })
            } catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "Create Channel fail!"
                });
            }

        }.bind(this));

    },


    edit: function(id, chainaddress) {
        return new Promise(function(resolve, reject) {
            try {
                const query = {clusterId: id};

                ChainModel.findOneAndUpdate(query, {name}, {upsert: true}, function (err, doc) {
                    if (err) {
                        logger.error(err)
                        err.status = 503;
                        throw err;
                    } else {
                        resolve({success: true})
                    }
                })
            } catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
                });
            }
        }.bind(this));
    },


    release: function(id) {

        return new Promise(function(resolve, reject) {
            try {
                ChainModel.findOne({user_id: this.apikey}, function (err, doc) {
                    if (err) {
                        err.status = 503;
                        throw err;
                    } else {
                        if (doc != null){


                            // UserModel.find({chainId: id}, function (err, docs) {
                            //     if (err) {
                            //         err.status = 503;
                            //         throw err;
                            //     } else {
                            //         if (docs != null){
                            //             docs.map((user, i) => {
                            //
                            //                 user.remove(
                            //                     function(err){
                            //                         if (err){
                            //                             err.status = 503;
                            //                             throw err;
                            //                         }
                            //                     });
                            //             })
                            //
                            //             // resolve({success: true})
                            //         }
                            //         // else
                            //         //     resolve({success: true})
                            //
                            //     }
                            // })

                            ChainCodeModel.find({chain: doc}, function (err, docs) {
                                if (err) {
                                    err.status = 503;
                                    throw err;
                                } else {
                                    if (docs != null){
                                        docs.map((chaincode, i) => {

                                            chaincode.remove(
                                                function(err){
                                                    if (err){
                                                        err.status = 503;
                                                        throw err;
                                                    }
                                                });
                                        })

                                        // resolve({success: true})
                                    }
                                    // else
                                    //     resolve({success: true})

                                }
                            })

                            doc.remove(
                                function(err){
                                    if (err){
                                        err.status = 503;
                                        throw err;
                                    }

                                    resolve({success: true})
                                });
                        }

                    }
                })
           }catch (err) {
                reject({
                    success: false,
                    message: (err.status === 503 && err.message) || "System maintenance, please try again later!"
                });
           }

        }.bind(this));
    },


};
module.exports = subchain;