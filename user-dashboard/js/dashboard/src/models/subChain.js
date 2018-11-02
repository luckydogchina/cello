// ljs modified
/*
 SPDX-License-Identifier: Apache-2.0
 */
import {applyChain, createChannel,joinChannel,updateChannel, genchanneltxfile,downloadchannelconfigfile,listChain, releaseChain, editChain, listDBChain, getChannels, recentBlocks, recentTransactions, queryChainCodes, recentTokenTransfer, queryByBlockId, queryByTransactionId} from '../services/subChain'
import {message} from 'antd'
import { routerRedux } from 'dva/router'
import localStorage from 'localStorage'
import {isEmpty} from '../utils/utils'
import { FormattedMessage, IntlProvider, defineMessages } from 'react-intl';
const appLocale = window.appLocale;
const intlProvider = new IntlProvider({ locale: appLocale.locale, messages: appLocale.messages }, {});
const { intl } = intlProvider.getChildContext();

const messages = defineMessages({
  success: {
    applyChain: {
      id: "Chain.message.success.applyChain",
      defaultMessage: "申请链路 {name} 成功."
    },
    releaseChain: {
      id: "Chain.message.success.releaseChain",
      defaultMessage: "释放链路 {name} 成功."
    },
    editChain: {
      id: "Chain.message.success.editChain",
      defaultMessage: "编辑链路成功."
    },
    createChannel: {
      id: "Chain.message.success.createChannel",
      defaultMessage: "创建通道成功."
    },
    joinChannel: {
      id: "Chain.message.success.joinChannel",
      defaultMessage: "加入通道成功."
    },
    updateChannel: {
      id: "Chain.message.success.updateChannel",
      defaultMessage: "更新通道成功."
    },
    commonoperate: {
      id: "Global.message.success.common",
      defaultMessage: "成功."
    },
  },
  fail: {
    applyChain: {
      id: "Chain.message.fail.applyChain",
      defaultMessage: "申请链路 {name} 失败."
    },
    releaseChain: {
      id: "Chain.message.fail.releaseChain",
      defaultMessage: "释放链路 {name} 失败."
    },
    editChain: {
      id: "Chain.message.fail.editChain",
      defaultMessage: "编辑链路失败."
    },
    createChannel: {
      id: "Chain.message.fail.createChannel",
      defaultMessage: "创建通道失败."
    },
    joinChannel: {
      id: "Chain.message.fail.joinChannel",
      defaultMessage: "加入通道失败."
    },
    updateChannel: {
      id: "Chain.message.fail.updateChannel",
      defaultMessage: "更新通道失败."
    },
    commonoperate: {
      id: "Global.message.fail.common",
      defaultMessage: "失败"
    },
    queryChannels:{
      id:"Chain.message.fail.queryChannels",
      defaultMessage:"Query Channels failed!"
    },
    queryRecentBlocks:{
      id:"Chain.message.fail.queryRecentBlocks",
      defaultMessage:"Query recentBlocks failed!"
    },
    queryTransaction:{
      id:"Chain.message.fail.queryTransaction",
      defaultMessage:"Query Transaction failed!"
    },
    queryBlock:{
      id:"Chain.message.fail.queryBlock",
      defaultMessage:"Query Block failed!"
    },
    queryRecentTransaction:{
      id:"Chain.message.fail.queryRecentTransaction",
      defaultMessage:"Query recentTransactions failed!"
    },
    tokenTransfer:{
      id:"Chain.message.fail.tokenTransfer",
      defaultMessage:"Query recentTokenTransfer failed!"
    }
  }
})

export default {
  namespace: 'subChain',

  state: {
    chains: [],
    dbChains: [],
    chainLimit: 1,
    loadingDBChains: false,
    currentChainId: "",
    currentChain: {},
    modalVisible: false,
    applying: false,
    channelCreating: false,
    channelCreateResult: {
      success: true,
      message: ""
    },
    channelJoining: false,
    channelJoinResult: {
      success: true,
      message: ""
    },
    channelUpdating: false,
    channelUpdateResult: {
      success: true,
      message: ""
    },
    releasing: false,
    editing: false,
    editModalVisible: false,
    blockInfoModalVisible: false,
    txInfoModalVisible: false,
    channels: [],
    recentBlocks: [],
    loadingRecentBlocks: false,
    loadingRecentTransactions: false,
    recentTransactions:[],
    smartChainCodes : [],
    loadingSmartChainCodes: false,
    recentTokenTransfer:[],
    queryByBlockId:[],
    currentBlockTxList: [],
    currentTxInfo: {},
    loadingCurrentBlockTxList: false,
    loadingCurrentTxInfo: false,
    queryBlockVisible:false,
    queryByTransactionId:[],
    queryByTransactionVisible:false,
    orgtree:[],
    orgs:[],
  },


  effects: {
    * queryChains ({payload}, {call, put}) {
      const data = yield call(listChain)
      if (data && data.success) {
        let currentChainId = localStorage.getItem(`${window.apikey}-chainId`)
        const chains = data.chains
        let currentChain = {};
        let findMatchChainId = false;
        if (!currentChainId && chains.length) {
          localStorage.setItem(`${window.apikey}-chainId`, chains[0].dbId)
          currentChain = chains[0]
        } else {
          chains.forEach(function (chain, index, _ary) {
            if (currentChainId === chain.dbId) {
              currentChain = chain
              findMatchChainId = true
              return false
            } else {
              return true
            }
          })
          if (!findMatchChainId && chains.length) {
            currentChain = chains[0]
            currentChainId = chains[0].dbId
          }
        }
        if (!isEmpty(currentChain)) {
          yield put({
            type: 'getChannels',
            payload: {
              dbId : currentChain.dbId
            }
          })
          yield put({
            type: 'recentBlocks',
            payload: {
              blockHeight: currentChain.blocks,
              recentNum : currentChain.blocks >= 6 ? 6 : currentChain.blocks,
              dbId : currentChain.dbId
            }
          })
          yield put({
            type: 'recentTransactions',
            payload: {
              blockHeight: currentChain.blocks,
              recentNum : currentChain.blocks >= 6 ? 6 : currentChain.blocks,
              dbId : currentChain.dbId
            }
          })
          yield put({
            type: 'token/listTokens',
            payload: {
              chainId: currentChain.dbId
            }
          })
          yield put({
            type: 'queryChainCodes',
            payload: {
              dbId : currentChain.dbId
            }
          })
        }
        yield put({type: 'setChains', payload: {chains: data.chains, chainLimit: data.limit, currentChain, currentChainId}})
      } else {
        message.error("Query chains failed!")
        yield put({type: 'setChains', payload: {chains: []}})
      }
    },

    * listDBChain ({payload}, {call, put}) {
      yield put({type: 'showLoadingDBChains'})
      const data = yield call(listDBChain)
      if (data && data.success) {
        yield put({type: 'setDBChains', payload: {dbChains: data.chains}})
        if (data.chains.length > 0){
          var orgtreeArray=[];
          var orgsArray=[];

          for (let i=0; i<data.chains[0].orgs.length; i++){
            var orginfo = {};
            var orginfo2 = {};
            var peertreeArray=[];
            let peerindex = 0
            for (let peerkey in data.chains[0].template.network.application[data.chains[0].orgs[i]].peers){
              var peerinfo = {};
              peertreeArray.push(peerinfo);
              peerinfo["key"] = data.chains[0].orgs[i]+"-"+peerkey;
              peerinfo["value"] = data.chains[0].orgs[i]+"-"+peerkey;
              peerinfo["title"] = data.chains[0].orgs[i]+"-"+peerkey;
              peerindex++
            }
            orginfo["children"] = peertreeArray;
            orginfo["disabled"] = true;
            orginfo["key"] = data.chains[0].orgs[i];
            orginfo["value"] = data.chains[0].orgs[i];
            orginfo["title"] = data.chains[0].orgs[i];
            orgtreeArray.push(orginfo);

            orginfo2["key"] = data.chains[0].orgs[i];
            orginfo2["value"] = data.chains[0].orgs[i];
            orginfo2["title"] = data.chains[0].orgs[i];
            orgsArray.push(orginfo2);
          }

          yield put({type: 'setOrgtree', payload: {orgtree: orgtreeArray, orgs:orgsArray}})
        }

      }
    },

    * applyChain({payload}, {call, put}) {
      yield put({type: 'setApplying', payload: {applying: true}})
      const data = yield call(applyChain, payload)
      if (data && data.success) {
        yield put({type: 'setApplying', payload: {applying: false}})
        yield put({type: 'hideModal'})
        message.success(intl.formatMessage(messages.success.applyChain, {name: payload.name}))
        localStorage.setItem(`${window.apikey}-chainId`, data.dbId)
        yield put(routerRedux.push({
          pathname: '/subchain'
        }))
      } else {
        yield put({type: 'setApplying', payload: {applying: false}})
        message.error(intl.formatMessage(messages.fail.applyChain, {name: payload.name}))
      }
    },


    *genchanneltxfile ({payload}, {call, put}) {
      const data = yield call(genchanneltxfile, payload)
      if (data && data.success) {
        message.success(intl.formatMessage(messages.success.commonoperate))
      } else {
        message.error(intl.formatMessage(messages.fail.commonoperate))
      }

      const fileName=payload.channelname1+'.tx';

      var repstr = new Buffer(data.filedata, 'base64');

      var blob = new Blob([repstr],{'type': 'application/octet-stream'});

      if (window.navigator.msSaveOrOpenBlob) {
        navigator.msSaveBlob(blob, fileName);
      } else {
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;

        //此写法兼容可火狐浏览器
        document.body.appendChild(link);

        var evt = document.createEvent("MouseEvents");
        evt.initEvent("click", false, false);
        link.dispatchEvent(evt);

        document.body.removeChild(link);
      }
    },

    *downloadchannelconfigfile ({payload}, {call, put}) {
      const data = yield call(downloadchannelconfigfile, payload)
      if (data && data.success) {
        message.success(intl.formatMessage(messages.success.commonoperate))
      } else {
        message.error(intl.formatMessage(messages.fail.commonoperate))
      }

      const fileName=payload.channelname+'.json';

      var repstr = data.data;

      var blob = new Blob([repstr]);

      if (window.navigator.msSaveOrOpenBlob) {
        navigator.msSaveBlob(blob, fileName);
      } else {
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;

        //此写法兼容可火狐浏览器
        document.body.appendChild(link);

        var evt = document.createEvent("MouseEvents");
        evt.initEvent("click", false, false);
        link.dispatchEvent(evt);

        document.body.removeChild(link);
      }
    },

    *createChannel ({payload}, {call, put}) {
      yield put({type: 'setChannelCreating', payload: {channelCreating: true}})
      const data = yield call(createChannel, payload)
      if (data && data.success) {
        yield put({
          type: 'setChannelCreateResult',
          payload: {
            channelCreateResult: data
          }
        })
        message.success(intl.formatMessage(messages.success.createChannel))
        // yield put(routerRedux.push({
        //   pathname: '/subchain'
        // }))
      } else {
        message.error(intl.formatMessage(messages.fail.createChannel))
      }
    },

    *joinChannel ({payload}, {call, put}) {
      yield put({type: 'setChannelJoining', payload: {channelJoining: true}})
      const data = yield call(joinChannel, payload)
      if (data && data.success) {
        yield put({
          type: 'setChannelJoinResult',
          payload: {
            channelJoinResult: data
          }
        })
        message.success(intl.formatMessage(messages.success.joinChannel))
        // yield put(routerRedux.push({
        //   pathname: '/chain'
        // }))
      } else {
        message.error(intl.formatMessage(messages.fail.joinChannel))
      }
    },

    *updateChannel ({payload}, {call, put}) {
      yield put({type: 'setChannelUpdating', payload: {channelUpdating: true}})
      const data = yield call(updateChannel, payload)
      if (data && data.success) {
        yield put({
          type: 'setChannelUpdateResult',
          payload: {
            channelUpdateResult: data
          }
        })
        message.success(intl.formatMessage(messages.success.updateChannel))
        // yield put(routerRedux.push({
        //   pathname: '/chain'
        // }))
      } else {
        message.error(intl.formatMessage(messages.fail.updateChannel))
      }
    },

    *releaseChain({payload}, {call, put}) {
      yield put({type: 'setReleasing', payload: {releasing: true}})
      const data = yield call(releaseChain, payload)
      if (data && data.success) {
        localStorage.removeItem(`${window.apikey}-chainId`)
        message.success(intl.formatMessage(messages.success.releaseChain, {name: payload.name}))
        yield put({
          type: 'queryChains'
        })
      } else {
        message.error(intl.formatMessage(messages.fail.releaseChain, {name: payload.name}))
      }
      yield put({type: 'setReleasing', payload: {releasing: false}})
    },
    *editChain({payload}, {call, put}) {
      yield put({type: 'setEditing', payload: {editing: true}})
      const data = yield call(editChain, payload)
      if (data && data.success) {
        yield put({type: 'updateCurrentChainName', payload: {name: payload.name}})
        yield put({type: 'hideEditModal'})
        message.success(intl.formatMessage(messages.success.editChain))
      } else {
        message.error(intl.formatMessage(messages.fail.editChain))
      }
      yield put({type: 'setEditing', payload: {editing: false}})
    },
    * getChannels ({payload}, {call, put}) {
      // yield put({type: 'showLoadingRecentBlocks'})
      const data = yield call(getChannels,payload)
      if (data && data.success) {
        yield put({type: 'setChannels', payload: {channels: data.channels}})
      } else {
        message.error(intl.formatMessage(messages.fail.queryChannels))
      }
    },
    * recentBlocks ({payload}, {call, put}) {
      yield put({type: 'showLoadingRecentBlocks'})
      const data = yield call(recentBlocks,payload)
      if (data && data.success) {
        yield put({type: 'setRecentBlocks', payload: {recentBlocks: data.allBlocks}})
      } else {
        message.error(intl.formatMessage(messages.fail.queryRecentBlocks))
      }
    },
    * queryByTransactionId ({payload}, {call, put}) {
      console.log(payload)
      const data = yield call(queryByTransactionId, payload)
      console.log(data)
      if (data && data.success) {
        yield put({type: 'setCurrentTxInfo', payload: {currentTxInfo: data}})
      } else {
        message.error(intl.formatMessage(messages.fail.queryTransaction))
      }
    },

    * queryChainCodes ({payload}, {call, put}) {
      const data = yield call(queryChainCodes,payload)
      if (data && data.success) {
        yield put({type: 'setChainCodes', payload: {smartChainCodes: data.allChainCodes}})
      } else {
        message.error(intl.formatMessage(messages.fail.queryRecentTransaction))
      }
    },

    * queryByBlockId ({payload}, {call, put}) {
      const data = yield call(queryByBlockId,payload)
      yield put({type: 'showLoadingCurrentBlockTxList'})
      if (data && data.success) {
        yield put({type: 'setCurrentBlockTxList', payload: {currentBlockTxList: data.txList}})
      } else {
        message.error(intl.formatMessage(messages.fail.queryBlock))
      }
      yield put({type: 'hideLoadingCurrentBlockTxList'})
    },
    * recentTransactions ({payload}, {call, put}) {
      const data = yield call(recentTransactions,payload)
      if (data && data.success) {
        yield put({type: 'setTransactions', payload: {recentTransactions: data.allTransactions}})
      } else {
        message.error(intl.formatMessage(messages.fail.queryRecentTransaction))
      }
    },

    * recentTokenTransfer ({payload}, {call, put}) {

      const data = yield call(recentTokenTransfer,payload)
      if (data && data.success) {

        yield put({type: 'setTokenTransfer', payload: {recentTokenTransfer: data.records}})
      } else {
        message.error(intl.formatMessage(messages.fail.tokenTransfer))
      }
    },
  },

  reducers: {
    showEditModal (state) {
      return {...state, editModalVisible: true}
    },
    hideEditModal (state) {
      return {...state, editModalVisible: false}
    },
    changeChainType (state, {payload: {chainType}}) {
      return {...state, chainType, selectedConfig: null, selectedConfigId: 0}
    },
    setSelectedConfig (state, {payload: {selectedConfig, selectedConfigId}}) {
      return {...state, selectedConfig, selectedConfigId}
    },
    setChains (state, {payload: {chains, chainLimit}}) {
      const currentChainId = localStorage.getItem(`${window.apikey}-chainId`)
      let currentChain = null;
      if (!currentChainId && chains.length) {
        localStorage.setItem(`${window.apikey}-chainId`, chains[0].dbId)
        currentChain = chains[0]
      } else {
        chains.forEach(function (chain, index, _ary) {
          if (currentChainId === chain.dbId) {
            currentChain = chain
            return false
          } else {
            return true
          }
        })
      }
      return {...state, chains, currentChain, loadingChains: false, chainLimit, currentChainId}
    },
    setApplying (state, {payload: {applying}}) {
      return {...state, applying}
    },
    setChannelCreating (state, {payload: {channelCreating}}) {
      return {...state, channelCreating}
    },
    setChannelCreateResult(state, {payload: {channelCreateResult}}) {
      return {...state, channelCreateResult, channelCreating: false}
    },
    setChannelJoining (state, {payload: {channelJoining}}) {
      return {...state, channelJoining}
    },
    setChannelJoinResult(state, {payload: {channelJoinResult}}) {
      return {...state, channelJoinResult, channelJoining: false}
    },
    setChannelUpdating (state, {payload: {channelUpdating}}) {
      return {...state, channelUpdating}
    },
    setChannelUpdateResult(state, {payload: {channelUpdateResult}}) {
      return {...state, channelUpdateResult, channelUpdating: false}
    },
    setEditing (state, {payload: {editing}}) {
      return {...state, editing}
    },
    setReleasing (state, {payload: {releasing}}) {
      let {currentChain} = state;
      if (currentChain) {
        currentChain.releasing = releasing
        currentChain.status = "releasing"
      }
      return {...state, currentChain}
    },
    updateCurrentChainName (state, {payload: {name}}) {
      let {currentChain} = state;
      currentChain.name = name
      return {...state, currentChain}
    },
    showLoadingDBChains(state) {
      return {...state, loadingDBChains: true}
    },
    setDBChains(state, {payload: {dbChains}}) {
      return {...state, dbChains, loadingDBChains: false}
    },

    setOrgtree(state, {payload: {orgtree,orgs}}) {
      return {...state, orgtree,orgs}
    },

    changeChainId(state, {payload: {currentChainId}}) {
      let {chains, currentChain} = state;
      localStorage.setItem(`${window.apikey}-chainId`, currentChainId)
      chains.forEach(function (chain, index, _ary) {
        if (currentChainId === chain.dbId) {
          currentChain = chain
          return false
        } else {
          return true
        }
      })
      return {...state, currentChainId, currentChain}
    },

    hideQueryBlock(state){
      state.queryBlockVisible = false
      return {...state, queryBlockVisible: false}
    },
    showQueryBlock (state) {
      state.queryBlockVisible = true
      return {...state, queryBlockVisible: true}
    },
    showQueryTransactionId (state) {
      state.queryByTransactionVisible = true
      return {...state, queryByTransactionVisible: true}
    },
    hideQueryTransactionId(state){
      state.queryByTransactionVisible = false
      return {...state, queryByTransactionVisible: false}
    },
    setqueryByTransactionId (state , {payload : queryByTransactionId}) {
      state.queryByTransactionId = queryByTransactionId

      return {...state,queryByBlockId}
    },
    setqueryByBlockId (state , {payload : queryByBlockId}) {
      state.queryByBlockId = queryByBlockId

      return {...state,queryByBlockId}
    },
    setCurrentBlockTxList (state, {payload: {currentBlockTxList}}) {
      return {...state, currentBlockTxList}
    },
    showLoadingRecentBlocks (state) {
      return {...state, loadingRecentBlocks: true}
    },
    showLoadingRecentTransactions (state) {
      return {...state, loadingRecentTransactions: true}
    },
    setCurrentTxInfo (state, {payload: {currentTxInfo}}) {
      return {...state, currentTxInfo}
    },
    setTokenTransfer (state , {payload : recentTokenTransfer}) {
      state.recentTokenTransfer = recentTokenTransfer

      return {...state,recentTokenTransfer}
    },
    setTransactions (state , {payload : recentTransactions}) {
      state.recentTransactions = recentTransactions
      return {...state,recentTransactions, loadingRecentTransactions: false}
    },
    setChainCodes (state , {payload : smartChainCodes}) {
      state.smartChainCodes = smartChainCodes
      return {...state,smartChainCodes}
    },
    setChannels (state , {payload : channels}) {
      state.channels = channels
      return {...state, channels}
    },
    setRecentBlocks (state , {payload : recentBlocks}) {
      state.recentBlocks = recentBlocks
      return {...state, recentBlocks, loadingRecentBlocks: false}
    },
    showBlockInfoModal(state) {
      return {...state, blockInfoModalVisible: true}
    },
    hideBlockInfoModal(state) {
      return {...state, blockInfoModalVisible: false}
    },
    showTxInfoModal(state) {
      return {...state, txInfoModalVisible: true}
    },
    hideTxInfoModal(state) {
      return {...state, txInfoModalVisible: false}
    },
    changeChainType (state, {payload: {chainType}}) {
      return {...state, chainType, selectedConfig: null, selectedConfigId: 0}
    },
    setSelectedConfig (state, {payload: {selectedConfig, selectedConfigId}}) {
      return {...state, selectedConfig, selectedConfigId}
    },
    setChains (state, {payload: {chains, chainLimit, currentChain, currentChainId}}) {
      return {...state, chains, currentChain, loadingChains: false, chainLimit, currentChainId}
    },
    setApplying (state, {payload: {applying}}) {
      return {...state, applying}
    },
    setEditing (state, {payload: {editing}}) {
      return {...state, editing}
    },
    setReleasing (state, {payload: {releasing}}) {
      let {currentChain} = state;
      if (currentChain) {
        currentChain.releasing = releasing
        currentChain.status = "releasing"
      }
      return {...state, currentChain}
    },
    updateCurrentChainName (state, {payload: {name}}) {
      let {currentChain} = state;
      currentChain.name = name
      return {...state, currentChain}
    },
    showLoadingDBChains(state) {
      return {...state, loadingDBChains: true}
    },
    setDBChains(state, {payload: {dbChains}}) {
      return {...state, dbChains, loadingDBChains: false}
    },
    changeChainId(state, {payload: {currentChainId}}) {
      let {chains, currentChain} = state;
      localStorage.setItem(`${window.apikey}-chainId`, currentChainId)
      chains.forEach(function (chain, index, _ary) {
        if (currentChainId === chain.dbId) {
          currentChain = chain
          return false
        } else {
          return true
        }
      })
      return {...state, currentChainId, currentChain}
    },
    showLoadingCurrentBlockTxList(state) {
      return {...state, loadingCurrentBlockTxList: true}
    },
    hideLoadingCurrentBlockTxList(state) {
      return {...state, loadingCurrentBlockTxList: false}
    },
    showLoadingCurrentTxInfo(state) {
      return {...state, loadingCurrentTxInfo: true}
    },
    hideLoadingCurrentTxInfo(state) {
      return {...state, loadingCurrentTxInfo: false}
    },
    showLoadingChainCodes(state) {
      return {...state, loadingChainCodes: true}
    },
    hideLoadingChainCodes(state) {
      return {...state, loadingChainCodes: false}
    }
  },

  subscriptions: {
    setup({ history }) {
    },
  },
};
