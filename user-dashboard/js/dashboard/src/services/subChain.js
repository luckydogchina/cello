/*
 SPDX-License-Identifier: Apache-2.0
 */
import request from '../utils/request'
import config from '../utils/config'
import { stringify } from 'qs';

const { api } = config
const { subchain } = api

export async function applyChain(params) {
  return request(subchain.apply.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

// ljs modified
export async function createChannel(params) {
  return request(subchain.createChannel.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function joinChannel(params) {
  return request(subchain.joinChannel.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function updateChannel(params) {
  return request(subchain.updateChannel.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function genchanneltxfile(params) {
  return request(subchain.genchanneltxfile.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function downloadchannelconfigfile(params) {
  return request(subchain.downloadchannelconfigfile.format({apikey: window.apikey}), {
    method: "POST",
    body: params
  })
}

export async function listChain(params) {
  return request(`${subchain.list.format({apikey: window.apikey})}?${stringify(params)}`)
}

export async function listDBChain(params) {
  return request(`${subchain.dbList.format({apikey: window.apikey})}?${stringify(params)}`)
}

export async function releaseChain(params) {
  return request(subchain.release.format({apikey: window.apikey, id: params.id}), {
    method: "POST",
    body: params
  })
}

export async function editChain(params) {
  return request(subchain.edit.format({apikey: window.apikey, id: params.id}), {
    method: "POST",
    body: params
  })
}

export async function getChannels(params) {
  return request(`${subchain.channels.format({dbId: params.dbId})}?${stringify(params)}`)
}

export async function recentBlocks(params) {
  return request(`${subchain.blocks.format({dbId: params.dbId})}?${stringify(params)}`)
}

export async function recentTransactions(params) {
  return request(`${subchain.transaction.format({dbId: params.dbId})}?${stringify(params)}`)
}

export async function recentTokenTransfer(params) {
  return request(`${subchain.recentTokenTransfer.format({dbId: params.dbId})}?${stringify(params)}`)
}

export async function queryByBlockId(params) {
  return request(`${subchain.queryByBlockId.format({chainId: params.chainId})}?${stringify(params)}`)

}
export async function queryByTransactionId(params) {
  return request(`${subchain.queryByTransactionId.format({chainId: params.chainId})}?${stringify(params)}`)

}

export async function queryChainCodes(params) {
  return request(`${subchain.queryChainCodes.format({dbId: params.dbId})}?${stringify(params)}`)
}
