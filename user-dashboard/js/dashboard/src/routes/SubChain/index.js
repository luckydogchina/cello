/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { Link } from 'dva/router';
import { Row, Col, Card, List, Avatar, Badge, Button, Modal, Select } from 'antd';
import { routerRedux } from 'dva/router';
import {EmptyView, ChainView, ChainView2,EditModal, BlockInfoModal, TxInfoModal} from './components'
import { injectIntl, intlShape, FormattedMessage} from 'react-intl';
import messages from './messages'
import localStorage from 'localStorage'

const confirm = Modal.confirm
const Option = Select.Option;

import PageHeaderLayout from '../../layouts/PageHeaderLayout';

import styles from './index.less';

@connect(state => ({
  chain: state.subChain,
  fabric: state.fabric
}))
class SubChain extends PureComponent {
  state = {
    loading: true,
    editModalVisible: false,
    editing: false
  }
  componentDidMount() {
    this.props.dispatch({
      type: 'subChain/queryChains'
    }).then(() => this.setState({
      loading: false
    }))
  }

  componentWillUnmount() {
  }

  showEditModal = () => {
    const {dispatch} = this.props;
    dispatch({
      type: 'subChain/showEditModal'
    })
  }

  showReleaseConfirm = () => {
    const {chain: {currentChain}, intl, dispatch} = this.props;
    const chainId = currentChain ? currentChain.id || "" : ""
    const chainName = currentChain ? currentChain.name || "" : ""
    const title = intl.formatMessage(messages.modal.confirm.release.title, {name: currentChain && currentChain.name || ""})
    confirm({
      title,
      onOk() {
        dispatch({
          type: 'subChain/releaseChain',
          payload: {
            id: chainId,
            name: chainName
          }
        })
      },
      onCancel() {},
      okText: intl.formatMessage(messages.button.confirm),
      cancelText: intl.formatMessage(messages.button.cancel)
    });
  }
  applyNewChain = () => {
    const {dispatch} = this.props;
    dispatch(routerRedux.push("/subchain/new"))
  }

  changeChain = (chainId) => {
    const {dispatch} = this.props;
    dispatch({
      type: 'subChain/changeChainId',
      payload: {
        currentChainId: chainId
      }
    })
  }

  render() {
    const {dispatch, chain: {chains, currentChain, currentBlockTxList, loadingCurrentBlockTxList,
      currentTxInfo, loadingCurrentTxInfo, txInfoModalVisible,
      editModalVisible, blockInfoModalVisible, editing, chainLimit, smartChainCodes:{smartChainCodes}},
      fabric: {channelHeight, queryingChannelHeight}, intl} = this.props;
    const {loading} = this.state;
    const { channels: {channels} } = this.props.chain;
    // const { queryByBlockId:{queryByBlockId } } = this.props.chain;
    // const { queryByTransactionId : {queryByTransactionId}} = this.props.chain
    const cb = () => {
      console.log('expired callback')
    }
    // const {remainSeconds} = currentChain;
    const chainId = window.localStorage.getItem(`${window.apikey}-chainId`)

    const emptyViewProps = {
      onClickButton() {
        dispatch(routerRedux.push('/subchain/new'));
      }
    }
    const chainViewProps = {
      dispatch,
      chain: currentChain,
      smartChainCodes,
      onRelease (data) {
        dispatch({
          type: 'subChain/releaseChain',
          payload: data
        })
      },
      onUpdate () {
        dispatch({
          type: 'subChain/editModalVisible'
        })
      },
      currentChain,
      currentBlockTxList,
      loadingCurrentBlockTxList,
      currentTxInfo,
      loadingCurrentTxInfo,
      channelHeight,
      intl
    }
    const blockInfoModalProps = {
      visible: blockInfoModalVisible,
      title: "Block info",
      currentBlockTxList,
      loadingCurrentBlockTxList,
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
          type: 'subChain/hideTxInfoModal'
        })
      }
    }
    const editModalProps = {
      visible: editModalVisible,
      name: currentChain ? currentChain.name : "",
      loading: editing,
      onCancel () {
        dispatch({
          type: 'subChain/hideEditModal'
        })
      },
      onOk (data) {
        dispatch({
          type: 'subChain/editChain',
          payload: {
            id: currentChain ? currentChain.id : "",
            ...data
          }
        })
      },
    }

    const pageHeaderContent = chains && chains.length ? (
      <div className={styles.pageHeaderContent}>
        <div className={styles.content}>
          <p className={styles.contentTitle}>
            {chains.length < chainLimit &&
            <Button onClick={this.applyNewChain} size="small" type="primary" style={{marginRight: 5}}>New Chain</Button>
            }
            {chains.length > 1 &&
            <Select size="small" onChange={this.changeChain} value={currentChainId} style={{marginRight: 5}}>
              {chains.map((chainItem, i) =>
                <Option value={chainItem.dbId}>
                  {chainItem.name}
                </Option>
              )}
            </Select>
            }
            {currentChain && currentChain.name || ""}
          </p>
          <p>
            <FormattedMessage {...messages.pageHeader.content.title.createTime} />: {currentChain && currentChain.createTime || ""} &nbsp;&nbsp;
          </p>
          <p style={{marginTop: 5}}>
            <Button size="small" onClick={this.showEditModal} ghost className={styles.ghostBtn} style={{marginRight: 10}}><FormattedMessage {...messages.pageHeader.content.button.changeName} /></Button>
            <Button size="small" onClick={this.showReleaseConfirm} ghost type="danger"><FormattedMessage {...messages.pageHeader.content.button.release} /></Button>
          </p>
        </div>
      </div>
    ) : "";

    const chainStatus = currentChain ? currentChain.status || "error" : "error"
    function statusBadge (status) {
      switch (status) {
        case "running":
          return "success"
        case "initializing":
          return "success"
        case "releasing":
          return "processing"
        case "error":
        default:
          return "error"
      }
    }
    const pageHeaderExtra = chains && chains.length ? (
      <div className={styles.pageHeaderExtra}>
        {/*<div>*/}
          {/*<p><FormattedMessage {...messages.pageHeader.extra.title.status} /></p>*/}
          {/*<p>*/}
            {/*<span className={styles.firstUpper}><Badge status={statusBadge(chainStatus)} text={intl.formatMessage(messages.pageHeader.extra.content.status[chainStatus])} /></span>*/}
          {/*</p>*/}
        {/*</div>*/}
        <div>
          <p><FormattedMessage {...messages.pageHeader.extra.title.type} /></p>
          <p className={styles.firstUpper}>
            {currentChain && currentChain.type || ""}
          </p>
        </div>
        <div>
          <p><FormattedMessage {...messages.pageHeader.extra.title.channel} /></p>
          <p className={styles.firstUpper}>
            {channels && channels.length && channels[0].channel_id || ""}
            {/*{channels[0].channel_id}*/}
          </p>
        </div>
        <div>
          <p><FormattedMessage {...messages.pageHeader.extra.title.running} /></p>
          <p>{currentChain && currentChain.runningHours || 0}</p>
        </div>
      </div>
    ) : "";

    return (
      <PageHeaderLayout
        content={pageHeaderContent}
        extraContent={pageHeaderExtra}
        style={{minWidth:'1400px'}}
      >
        <div style={{paddingBottom: 50}}>
        {chains && chains.length ?
          <ChainView2 {...chainViewProps}/> :
          <Card
            loading={loading}
            bordered={false}
            bodyStyle={{ padding: 0 }}
            style={{marginRight:'40px'}}
          >
            <EmptyView style={{height:'100%', marginRight:'20px'}}  {...emptyViewProps}/>
          </Card>
        }
        {editModalVisible && <EditModal {...editModalProps}/>}
        </div>
      </PageHeaderLayout>
    );

    // return (
    //   <PageHeaderLayout
    //     content={pageHeaderContent}
    //     extraContent={pageHeaderExtra}
    //     style={{minWidth:'1400px'}}
    //   >
    //     <div style={{paddingBottom: 50}}>
    //       {chains && chains.length ?
    //         <ChainView {...chainViewProps}/> :
    //         <Card
    //           loading={loading}
    //           bordered={false}
    //           bodyStyle={{ padding: 0 }}
    //           style={{marginRight:'40px'}}
    //         >
    //           <EmptyView style={{height:'100%', marginRight:'20px'}}  {...emptyViewProps}/>
    //         </Card>
    //       }
    //       {editModalVisible && <EditModal {...editModalProps}/>}
    //       {blockInfoModalVisible && <BlockInfoModal {...blockInfoModalProps}/>}
    //       {txInfoModalVisible && <TxInfoModal {...txInfoModalProps}/>}
    //     </div>
    //   </PageHeaderLayout>
    // );

  }
}

export default injectIntl(SubChain)
