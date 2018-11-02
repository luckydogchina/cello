
/* Copyright IBM Corp, All Rights Reserved.

 SPDX-License-Identifier: Apache-2.0
*/

const mongoose = require('mongoose');
const log4js = require('log4js');
const logger = log4js.getLogger(__filename.slice(__dirname.length + 1));
const logLevel = process.env.DEV === "True" ? "DEBUG" : "INFO"
logger.setLevel(logLevel);

const userSchema = new mongoose.Schema({
  name: String,
  userId: String,
  chainId:String,
  adminName:String,
  isAdmin:Boolean,
  role:String,
  cert:String,
  pub:String,
  priv:String,
  exampleCodes: [],
  org:String,
  mspid:String,
  tls:Boolean,
})

userSchema.statics.findOneOrCreate = function findOneOrCreate(condition, callback) {
    const self = this
    self.findOne(condition, (err, result) => {
        return result ? callback(err, result) : self.create(condition, (err, result) => { return callback(err, result) })
    })
}



userSchema.post('save', function (doc, next) {

    next()
})


userSchema.post('remove', function(doc) {

});

const UserModel = mongoose.model('User', userSchema);

module.exports = UserModel;
