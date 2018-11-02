/*
 SPDX-License-Identifier: Apache-2.0
*/
const API = '/api'
const format = require('string-format')
format.extend(String.prototype)

module.exports = {
  name: 'Cello Baas',
  prefix: 'celloBaas',
  footerText: 'Cello Baas © 2017',
  logo: '/static/images/logo.svg',
  iconFontCSS: '/static/js/dist/iconfont.css',
  iconFontJS: '/static/js/dist/iconfont.js',
  CORS: [],
  openPages: ['/login'],
  apiPrefix: '/api/v1',
  API,
  api: {
    chain: {
      apply: `${API}/chain/{apikey}/apply`,
      createChannel: `${API}/chain/{apikey}/createchannel`,
      joinChannel: `${API}/chain/{apikey}/joinchannel`,
      updateChannel: `${API}/chain/{apikey}/updatechannel`,
      genchanneltxfile: `${API}/chain/{apikey}/genchanneltxfile`,
      downloadchannelconfigfile: `${API}/chain/{apikey}/downloadchannelconfigfile`,
      list: `${API}/chain/{apikey}/list`,
      dbList: `${API}/chain/{apikey}/db-list`,
      release: `${API}/chain/{apikey}/{id}/release`,
      edit: `${API}/chain/{apikey}/{id}/edit`,
      channels: `${API}/chain/{dbId}/channels`,
      blocks: `${API}/chain/{dbId}/recentBLock`,
      transaction: `${API}/chain/{dbId}/recentTransaction`,
      queryByBlockId: `${API}/chain/{chainId}/queryByBlockId`,
      queryByTransactionId: `${API}/chain/{chainId}/queryByTransactionId`,
      search:`${API}/chain/search`
    },
    subchain: {
      apply: `${API}/subchain/{apikey}/apply`,
      createChannel: `${API}/subchain/{apikey}/createchannel`,
      joinChannel: `${API}/subchain/{apikey}/joinchannel`,
      updateChannel: `${API}/subchain/{apikey}/updatechannel`,
      genchanneltxfile: `${API}/subchain/{apikey}/genchanneltxfile`,
      downloadchannelconfigfile: `${API}/subchain/{apikey}/downloadchannelconfigfile`,
      list: `${API}/subchain/{apikey}/list`,
      dbList: `${API}/subchain/{apikey}/db-list`,
      release: `${API}/subchain/{apikey}/{id}/release`,
      edit: `${API}/subchain/{apikey}/{id}/edit`,
      channels: `${API}/subchain/{dbId}/channels`,
      blocks: `${API}/subchain/{dbId}/recentBLock`,
      transaction: `${API}/subchain/{dbId}/recentTransaction`,
      queryByBlockId: `${API}/subchain/{chainId}/queryByBlockId`,
      queryByTransactionId: `${API}/subchain/{chainId}/queryByTransactionId`,
      queryChainCodes: `${API}/subchain/{dbId}/chainCodes`,
      search:`${API}/subchain/search`
    },
    fabric: {
      channelHeight: `${API}/fabric/{id}/channelHeight`
    },
    chainCodes: {
      list: `${API}/chain-code`,
      delete: `${API}/chain-code/{chainCodeId}`,
      edit: `${API}/chain-code/{chainCodeId}`,
      install: `${API}/chain-code/install`,
      instantiate: `${API}/chain-code/instantiate`,
      call: `${API}/chain-code/call`
    },
    token: {
      issue: `${API}/token/issue`,
      address: `${API}/token/address`,
      tokens: `${API}/token/tokens`
    },
    account: {
      list: `${API}/account/`,
      assets: `${API}/account/assets/{accountId}`,
      new: `${API}/account/new`,
      transferToken: `${API}/account/transferToken`
    },
    user: {
      list: `${API}/user/list`,
      create: `${API}/user/create`,
      delete: `${API}/user/delete`,
      downloadcert: `${API}/user/downloadcert`,
      downloadpub: `${API}/user/downloadpub`,
      search: `${API}/user/search`,
      update: `${API}/user/update`,
      currentuser:`${API}/user/currentuser`,
    },
  },
}
