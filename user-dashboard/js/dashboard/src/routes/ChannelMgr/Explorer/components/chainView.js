/*
 SPDX-License-Identifier: Apache-2.0
*/
import React from 'react'
import PropTypes from 'prop-types'
import { Row, Col, Icon, Button, Modal, Badge } from 'antd'
import Overview from './overview'
import styles from './chainView.less'
import NewsBlock from './newsBlock'
import NewsTrading from './newsTrading'

const confirm = Modal.confirm;

class ChainView extends React.Component {
  constructor (props) {
    super(props)
  }

  render() {
    const {chain, currentChain, onUpdate, loadingCurrentBlockTxList, currentBlockTxList,smartChainCodes,
      dispatch,chanpath,launchpeer, currentChannel} = this.props;
    const chainId = window.localStorage.getItem(`${window.apikey}-chainId`)
    const overviewProps = {
      chain,
      smartChainCodes,
    }
    const chainStatus = chain ? chain.status || "" : ""
    const blockProps = {
      onClickBlockHash: function (blockItem) {
        dispatch({
          type: chanpath+'/showBlockInfoModal'
        })
        dispatch({
          type: chanpath+'/queryByBlockId',
          payload: {
            id : blockItem.id,
            chainId,
            launchpeer,
            currentChannel,
          }
        })
      }
    }
    const transactionProps = {
      onClickTx: function (txItem) {
        console.log(txItem, chainId)
        dispatch({
          type: chanpath+'/showTxInfoModal'
        })
        dispatch({
          type: chanpath+'/queryByTransactionId',
          payload: {
            id: txItem.id,
            chainId,
            launchpeer,
            currentChannel,
          }
        })
      }
    }

    // ljs 屏蔽掉了最近交易和块的信息
    return (
      <div>
        <Overview {...overviewProps}/>
        {currentChain &&
        <div style={{paddingRight: 40}}>
          <Row gutter={24} style={{marginTop: 20}}>
            <Col span={12}>
              <NewsBlock {...blockProps} />
            </Col>
            <Col span={12}>
              <NewsTrading {...transactionProps} />
            </Col>
          </Row>
        </div>
        }
        {/*{currentChain && currentChain.initialized &&*/}
        {/*<div style={{paddingRight: 40}}>*/}
          {/*<Row gutter={24} style={{marginTop: 20}}>*/}
            {/*<Col span={12}>*/}
              {/*<NewsBlock {...blockProps} />*/}
            {/*</Col>*/}
            {/*<Col span={12}>*/}
              {/*<NewsTrading {...transactionProps} />*/}
            {/*</Col>*/}
          {/*</Row>*/}
        {/*</div>*/}
        {/*}*/}
      </div>
    )
  }
}

export default ChainView
