/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { Link } from 'dva/router';
import { Row, Col, Card, List, Avatar, Badge, Button, Modal, Select } from 'antd';
import { routerRedux } from 'dva/router';
import {ChainView, BlockInfoModal, TxInfoModal} from './components'
import { injectIntl, intlShape, FormattedMessage} from 'react-intl';
import messages from './messages'
import localStorage from 'localStorage'

const confirm = Modal.confirm
const Option = Select.Option;

import PageHeaderLayout from '../../../layouts/PageHeaderLayout';

import styles from './index.less';

@connect(state => ({
  chain: state.chain,
  subchain: state.subChain,
}))
class ChannelExplorer extends PureComponent {
  state = {
    loading: true,
    editing: false
  }
  componentDidMount() {
    const {chain: {currentChannel, launchpeer}} = this.props;
    this.props.dispatch({
      type: 'chain/queryChains',
      payload: {
        currentChannel,
        launchpeer,
      }
    }).then(() => this.setState({
      loading: false
    }))
    this.props.dispatch({
      type: 'subChain/queryChains'
    }).then(() => this.setState({
      loading: false
    }))
  }

  componentWillUnmount() {
  }



  render() {
    const {dispatch,
      chain: {chains, currentChain, currentBlockTxList, loadingCurrentBlockTxList,
          currentTxInfo, loadingCurrentTxInfo, txInfoModalVisible,
          blockInfoModalVisible, smartChainCodes:{smartChainCodes}, launchpeer, currentChannel},
      subchain: {chains:subchains, currentChain:subcurrentChain, currentBlockTxList:subcurrentBlockTxList, loadingCurrentBlockTxList:subloadingCurrentBlockTxList,
          currentTxInfo:subcurrentTxInfo, loadingCurrentTxInfo:subloadingCurrentTxInfo, txInfoModalVisible:subtxInfoModalVisible,
          blockInfoModalVisible:subblockInfoModalVisible,smartChainCodes:{smartChainCodes:subsmartChainCodes}},
      intl} = this.props;
    const {loading} = this.state;

    const { channels: {channels} } = this.props.chain;
    const { channels: {channels:subchannels} } = this.props.subchain;

    const chainId = window.localStorage.getItem(`${window.apikey}-chainId`)

    const chainViewProps = {
      dispatch,
      chain: currentChain,
      smartChainCodes,
      currentChain,
      currentBlockTxList,
      loadingCurrentBlockTxList,
      currentTxInfo,
      loadingCurrentTxInfo,
      chanpath:"chain",
      launchpeer,
      currentChannel
    }
    const subchainViewProps = {
      dispatch,
      chain: subcurrentChain,
      smartChainCodes:subsmartChainCodes,
      currentChain:subcurrentChain,
      currentBlockTxList:subcurrentBlockTxList,
      loadingCurrentBlockTxList:subloadingCurrentBlockTxList,
      currentTxInfo:subcurrentTxInfo,
      loadingCurrentTxInfo:subloadingCurrentTxInfo,
      chanpath:"subChain"
    }

    const blockInfoModalProps = {
      visible: blockInfoModalVisible,
      title: "Block info",
      currentBlockTxList,
      loadingCurrentBlockTxList,
      launchpeer,
      currentChannel,
      onCancel () {
        dispatch({
          type: 'chain/hideBlockInfoModal'
        })
      },
      onClickTx: function (txId) {
        dispatch({
          type: 'chain/showTxInfoModal'
        })
        dispatch({
          type: 'chain/queryByTransactionId',
          payload: {
            id: txId,
            chainId,
            launchpeer,
            currentChannel,
          }
        })
      }
    }
    const subblockInfoModalProps = {
      visible: subblockInfoModalVisible,
      title: "Block info",
      currentBlockTxList:subcurrentBlockTxList,
      loadingCurrentBlockTxList:subloadingCurrentBlockTxList,
      onCancel () {
        dispatch({
          type: 'subChain/hideBlockInfoModal'
        })
      },
      onClickTx: function (txId) {
        dispatch({
          type: 'subChain/showTxInfoModal'
        })
        dispatch({
          type: 'subChain/queryByTransactionId',
          payload: {
            id: txId,
            chainId
          }
        })
      }
    }

    const txInfoModalProps = {
      visible: txInfoModalVisible,
      title: "Transaction Info",
      currentTxInfo,
      loadingCurrentTxInfo,
      onCancel () {
        dispatch({
          type: 'chain/hideTxInfoModal'
        })
      }
    }
    const subtxInfoModalProps = {
      visible: subtxInfoModalVisible,
      title: "Transaction Info",
      currentTxInfo:subcurrentTxInfo,
      loadingCurrentTxInfo:subloadingCurrentTxInfo,
      onCancel () {
        dispatch({
          type: 'subChain/hideTxInfoModal'
        })
      }
    }

    // const pageHeaderContent = (
    //   <div className={styles.pageHeaderContent}>
    //     <FormattedMessage {...messages.pageHeader.content} />
    //   </div>
    // );
    //
    // const pageHeaderExtra = (
    //   <div className={styles.pageHeaderExtra}>
    //   </div>
    // );

    return (
      <PageHeaderLayout title={intl.formatMessage(messages.title.explorer)+'      '+currentChannel}>
        <div style={{paddingBottom: 50}}>
          {chains && chains.length &&
            <ChainView {...chainViewProps}/>
          }
          {subchains && subchains.length &&
            <ChainView {...subchainViewProps}/>
          }
          {chains && chains.length && blockInfoModalVisible && <BlockInfoModal {...blockInfoModalProps}/>}
          {subchains && subchains.length && subblockInfoModalVisible && <BlockInfoModal {...subblockInfoModalProps}/>}
          {chains && chains.length && txInfoModalVisible && <TxInfoModal {...txInfoModalProps}/>}
          {subchains && subchains.length && txInfoModalVisible && <TxInfoModal {...subtxInfoModalProps}/>}
        </div>
      </PageHeaderLayout>
    );
  }
}

export default injectIntl(ChannelExplorer)
