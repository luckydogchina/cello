
/* Copyright IBM Corp, All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/
import { Router } from 'express'
import multer from 'multer'
import UserModel from '../../../models/user'
import config from '../../../config'

import ChainModel from '../../../models/chain'
import subChainModel from '../../../models/subchain'

const mongoose = require('mongoose');
const crypto = require("crypto");
const path = require('path')
const fs = require('fs-extra');
var http = require('http');
var URL = require('url');
import util from 'util'
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"
const io = require('../../../io').io();
logger.setLevel(logLevel);

const router = new Router()

/*
 args = user_list_parser.parse_args()
 page = args['pageNo']
 per_page = args['pageSize']
 sort_columns = args['sortColumns']
 sort_columns = sort_columns.split(" ")
 sort_str = ''
 if len(sort_columns) > 1:
 sort_type = sort_columns[1]
 sort_field = sort_columns[0]
 if sort_type == "desc":
 sort_str = "-%s" % sort_field
 else:
 sort_str = sort_field
 offset = (page - 1) * per_page

 user_count = UserModel.objects.all().count()
 users = \
 UserModel.objects.skip(offset).limit(per_page).order_by(sort_str)

 users = [{
 "id": str(user.id),
 "name": user.username,
 "isAdmin": user.isAdmin,
 "role": user.role,
 "active": user.active,
 "balance": user.balance,
 "timestamp": time.mktime(user.timestamp.timetuple())
 } for user in users]

 result = {
 "users": {
 "result": users,
 "totalCount": user_count,
 "pageSize": per_page,
 "pageNo": page
 },
 }

 return result, 200
* */


router.get("/currentuser/:username", function (req, res) {
    UserModel.find({name: req.params.username}, function (err, docs) {
        if (err)
            res.json({success: false, err})
        if (docs.length == 0)
            res.json({
                success:false
            })
        else
            res.json({
                success: true,
                "user": docs[0],
            })
    })

})



router.get("/list", function (req, res) {

    const page = 1;
    let per_page = 5;
    let sort_columns = "";
    sort_columns = sort_columns.split(" ");

    let sort_str;
    if (sort_columns.length > 1) {
        const sort_type = sort_columns[1];
        const sort_field = sort_columns[0];

        if (sort_type == "desc")
            sort_str = "-%s" % sort_field;
        else
            sort_str = sort_field;
    }
    const offset = (page - 1) * per_page

    let user_count=0;
    let usersorted;
    let users = [];
    UserModel.count({}, function (err, result) {

        per_page = result;

        UserModel.find().skip(offset).limit(per_page).sort(sort_str).exec(function (err, doc) {
            usersorted = doc;


            usersorted.forEach(function(v){
                if (!v.isAdmin){
                    user_count++
                    let fname
                    // if (v.tls)
                    //     fname = v.name+'-tls'
                    // else
                    //     fname = v.name
                    users.push({
                        userId: v.userId,
                        name: v.name,
                        role:v.tls==true? 3:v.role,
                        mspid:v.mspid,
                        organization:v.org,
                        isAdmin: v.isAdmin,
                    });
                }

            });

            res.json({
                success: true,
                "users": {
                    "result": users,
                    "totalCount": user_count,
                    "pageSize": per_page,
                    "pageNo": page
                },
            })
        })
    })

    // const users = [{
    //     "id": "111",
    //     "name": "111",
    //     "role": 0,
    //     "balance": 250,
    // }]
    //
    // res.json({
    //     success: true,
    //     "users": {
    //         "result": users,
    //         "totalCount": 1,
    //         "pageSize": 3,
    //         "pageNo": 0
    //     },
    // })
})


router.post("/create", function(req, res) {
    const userId = mongoose.Types.ObjectId();
    const userIdStr = userId.toString();
    var fullname
    if (req.body.role == 1)
        fullname = req.body.username+'@'+req.body.orgname
    else if (req.body.role == 2)
        fullname = req.body.username+'.'+req.body.orgname

    UserModel.find({name: fullname, role: req.body.role, tls:req.body.tls}, function (err, docs) {
        if (err || docs.length>0){
            res.json({status: "FAIL", err:"Already exist!!"})
            return
        }

        const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
        return helper.generateUsers(fullname, req.body.affiliation,req.body.caurl, req.body.mspid, req.body.tls).then((response) => {

            if (response && typeof response === 'string' && response.includes(
                    'Error:')) {
                logger.error(fullname + ' enrollment failed');
                res.json({status: "FAIL", err:response})
                return
            }

            const user = new UserModel({ userId: userIdStr, name:fullname, mspid: req.body.mspid, cert:response.cert, pub:response.pub, priv:response.priv, org: req.body.orgname, role:req.body.role, adminName: req.body.adminUsername,tls:req.body.tls });

            user.save(function(err, data){
                if(err)
                    res.json({status: "FAIL", err})
                const user_id = user.id
                res.json({
                    status: "OK",
                    user_id: user_id,

                })
            })

        }, (err) => {
            res.json({status: "FAIL", err})
        })
    })

    // const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
    // if (req.body.tls) {
    //     return helper.generateUsers(fullname, req.body.affiliation,req.body.caurl, req.body.mspid, true).then((response) => {
    //
    //         const user = new UserModel({ userId: userIdStr, name:fullname, mspid: req.body.mspid, cert:response.cert, pub:response.pub, priv:response.priv, org: req.body.orgname, role:req.body.role, adminName: req.body.adminUsername,tls:true });
    //
    //         user.save(function(err, data){
    //             if(err)
    //                 res.json({status: "FAIL", err})
    //             const user_id = user.id
    //             res.json({
    //                 status: "OK",
    //                 user_id: user_id,
    //
    //             })
    //         })
    //
    //     }, (err) => {
    //         res.json({status: "FAIL", err})
    //     })
    // } else {
    //     return helper.generateUsers(fullname, req.body.affiliation,req.body.caurl, req.body.mspid, false).then((response) => {
    //
    //         const user = new UserModel({ userId: userIdStr, name:fullname, mspid: req.body.mspid, cert:response.cert, pub:response.pub, priv:response.priv, org: req.body.orgname, role:req.body.role, adminName: req.body.adminUsername,tls:false });
    //
    //         user.save(function(err, data){
    //             if(err)
    //                 res.json({status: "FAIL", err})
    //             const user_id = user.id
    //             res.json({
    //                 status: "OK",
    //                 user_id: user_id,
    //
    //             })
    //         })
    //
    //     }, (err) => {
    //         res.json({status: "FAIL", err})
    //     })
    // }



    // const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
    // // helper.initialize(chain.template)
    // return helper.generateUsers(fullname, req.body.affiliation,req.body.caurl, req.body.mspid, false).then((response) => {
    //
    //     if (req.body.istls){
    //         return helper.generateUsers(fullname, req.body.affiliation,req.body.caurl, req.body.mspid, true).then((tlsresponse) => {
    //
    //             const user = new UserModel({ userId: userIdStr, name:fullname, mspid: req.body.mspid, cert:response.cert, pub:response.pub, priv:response.priv,
    //                 tlscert:tlsresponse.cert, tlspub:tlsresponse.pub, tlspriv:tlsresponse.priv,org: req.body.orgname, role:req.body.role, adminName: req.body.adminUsername });
    //
    //             user.save(function(err, data){
    //                 if(err)
    //                     res.json({status: "FAIL", err})
    //                 const user_id = user.id
    //                 res.json({
    //                     status: "OK",
    //                     user_id: user_id,
    //
    //                 })
    //             })
    //
    //         }, (err) => {
    //             res.json({status: "FAIL", err})
    //         })
    //     } else {
    //         const user = new UserModel({ userId: userIdStr, name:fullname, mspid: req.body.mspid, cert:response.cert, pub:response.pub, priv:response.priv, org: req.body.orgname, role:req.body.role, adminName: req.body.adminUsername });
    //
    //         user.save(function(err, data){
    //             if(err)
    //                 res.json({status: "FAIL", err})
    //             const user_id = user.id
    //             res.json({
    //                 status: "OK",
    //                 user_id: user_id,
    //
    //             })
    //         })
    //     }
    //
    //
    //
    // }, (err) => {
    //     res.json({status: "FAIL", err})
    // })



    // if(typeof(req.body.chainId)!="undefined"){
    //     let chainId = req.body.chainId;
    //
    //     ChainModel.findOne({_id: chainId}, function (err, chain) {
    //
    //         const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
    //         // helper.initialize(chain.template)
    //         return helper.generateUsers(req.body.username, req.body.orgname).then((response) => {
    //
    //             const user = new UserModel({ userId: userIdStr, name:req.body.username, chainId: chainId, chainname:chain.name,cert:response.cert, org: req.body.orgname, role:req.body.role, adminName: req.body.adminUsername });
    //
    //             user.save(function(err, data){
    //                 if(err)
    //                     res.json({status: "FAIL", err})
    //                 const user_id = user.id
    //                 res.json({
    //                     status: "OK",
    //                     user_id: user_id,
    //
    //                 })
    //             })
    //
    //         }, (err) => {
    //             res.json({status: "FAIL", err})
    //         })
    //     })
    //
    // } else if(typeof(req.body.subchainId)!="undefined"){
    //     let chainId = req.body.subchainId;
    //
    //     subChainModel.findOne({_id: chainId}, function (err, chain) {
    //
    //         const helper = require(`/opt/cello/fabric-1.0/lib/helper`)
    //         helper.initialize(chain.template)
    //         return helper.generateUsers(req.body.username, req.body.orgname).then((response) => {
    //
    //             const user = new UserModel({ userId: userIdStr, name:req.body.username, chainId: chainId, chainname:chain.name,cert:response.cert, org: req.body.orgname, role:req.body.role, adminName: req.body.adminUsername });
    //
    //             user.save(function(err, data){
    //                 if(err)
    //                     res.json({status: "FAIL", err})
    //                 const user_id = user.id
    //                 res.json({
    //                     status: "OK",
    //                     user_id: user_id,
    //
    //                 })
    //             })
    //
    //         }, (err) => {
    //             res.json({status: "FAIL", err})
    //         })
    //     })
    // }


});


router.put("/update/:user_id", function (req, res) {
    // const userId = req.body.id;
    // UserModel.findOne({_id: userId}, function (err, doc) {
    //     if (err) {
    //         res.json({status: "FAIL"})
    //     } else {
    //         doc.remove(function(err){logger.error(err)});
    //         res.json({status: "OK"})
    //     }
    // })
})

router.post("/delete/", function (req, res) {
    const userId = req.body.id;
    var istls = false
    if (req.body.role == 3)
        istls = true
    UserModel.findOne({userId: userId, tls: istls}, function (err, doc) {
        if (err || doc==null) {
            res.json({status: "FAIL"})
        } else {
            doc.remove(
                function(err){
                    if (err)
                        logger.error(err)
                });
            res.json({status: "OK"})
        }
    })
})

router.post("/downloadcert/", function (req, res) {
    const userId = req.body.id;
    var istls = false
    if (req.body.role == 3)
        istls = true
    UserModel.findOne({userId: userId, tls: istls}, function (err, doc) {
        if (err || doc==null) {
            res.json({status: "FAIL"})
        } else {
            fs.readFile(doc.cert,'binary',  function (err, data) {
                if (err || data==null) {
                    res.json({status: "FAIL"})
                }
                let idx = doc.cert.lastIndexOf('/')
                let fn = doc.cert.substring(idx+1,doc.cert.length)
                res.json({
                    filename: fn,
                    filedata:data,
                })

            })
            // res.download(doc.cert);
        }
    })
})
router.post("/downloadpub/", function (req, res) {
    const userId = req.body.id;
    var istls = false
    if (req.body.role == 3)
        istls = true

    UserModel.findOne({userId: userId, tls: istls}, function (err, doc) {
        if (err || doc==null) {
            res.json({status: "FAIL"})
        } else {
            fs.readFile(doc.pub,'binary',  function (err, data) {
                if (err || data==null) {
                    res.json({status: "FAIL"})
                }
                let idx = doc.pub.lastIndexOf('/')
                let fn = doc.pub.substring(idx+1,doc.pub.length)
                res.json({
                    filename: fn,
                    filedata:data,
                })

            })
            // res.download(doc.pub);
        }
    })
})


router.get("/account/:user_id", function (req, res) {
    // const name = req.body.name;
    // ChainCode.findOneAndUpdate({_id: req.params.id}, {name}, {upsert: true}, function (err, doc) {
    //   if (err) {
    //     res.json({success: false})
    //   } else {
    //     res.json({success: true})
    //   }
    // })
})

/*
 args = user_search_parser.parse_args()
 username = args["username"]
 user_obj = User()
 user = user_obj.get_by_username(username)
 if not user:
 return {"user_exists": False}, 200

 data = {
 "username": user.username,
 "apikey": str(user.id),
 "isActivated": user.active,
 "balance": user.balance,
 "user_exists": True
 }

 return data, 200

 */

router.get("/search", function (req, res) {

 //   var arg = URL.parse(req.url, true).query;

    UserModel.find({name: req.query.username}, function (err, docs) {
        if (err)
            res.json({user_exists: false, err})
        if (docs.length == 0)
            res.json({
                user_exists:false
            })
        else
            res.json({
                user_exists:true
            })
    })

  // const chainId = req.body.chainId;
  // const id = req.body.id;
  // const chainRootDir = util.format(config.path.chain, req.username, chainId)
  // const helper = require(`${chainRootDir}/lib/helper`)
  // const install = require(`${chainRootDir}/lib/install-chaincode`);
  //
  // ChainModel.findOne({_id: chainId}, function (err, chainDoc) {
  //   if (err) res.json({success: false})
  //   const clusterId = chainDoc.clusterId;
  //   const chaincodeVersion = "v0"
  //   const chaincodePath = `github.com/${id}`
  //   const chaincodeName = `${clusterId}-${id}`;
  //   const size = chainDoc.size;
  //   let peer_end = 1
  //   let peerNames = []
  //   let orgNames = ["org1"]
  //   if (size > 1) {
  //     orgNames = ["org1", "org2"]
  //     peer_end = size/2
  //   }
  //   for (let i=0; i<peer_end; i++) {
  //     peerNames.push(`peer${i+1}`)
  //   }
  //   helper.initialize(chainDoc.template)
  //   install.initialize(chainDoc.template)
  //   function asyncInstallChainCode(arr) {
  //     return arr.reduce((promise, orgName) => {
  //       return promise.then((result) => {
  //         return new Promise((resolve, reject) => {
  //           helper.setupChaincodeDeploy()
  //           install.installChaincode(peerNames, chaincodeName, chaincodePath, chaincodeVersion, req.username, orgName)
  //             .then(function (message) {
  //               resolve()
  //             });
  //         })
  //       })
  //     }, Promise.resolve())
  //   }
  //   ChainCode.findOne({_id: id}, function (err, chainCode) {
  //     fs.copySync(chainCode.path, `${chainRootDir}/src/github.com/${id}`)
  //     asyncInstallChainCode(orgNames).then(() => {
  //       chainCode.status = "installed";
  //       chainCode.chainCodeName = chaincodeName;
  //       chainCode.chain = chainDoc._id;
  //       chainCode.save()
  //       res.json({success: true});
  //     })
  //   })
  // })
})



export default router
