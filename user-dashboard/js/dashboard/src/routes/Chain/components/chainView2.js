/*
 SPDX-License-Identifier: Apache-2.0
*/
import React from 'react'
import PropTypes from 'prop-types'
import { Row, Col, Icon, Button, Modal, Badge,Table ,Card} from 'antd'
import Overview from './overview'
import styles from './chainView.less'
import NewsBlock from './newsBlock'
import NewsTrading from './newsTrading'
import messages from "./messages";

const confirm = Modal.confirm;

class ChainView2 extends React.Component {
  constructor (props) {
    super(props)
  }
  showReleaseConfirm = () => {
    const {chain, onRelease} = this.props;
    const chainId = chain ? chain.id || "" : ""
    const chainName = chain ? chain.name || "" : ""
    confirm({
      title: `Do you want to release chain ${chain && chain.name || ""}?`,
      content: <span style={{color: 'red'}}>This operation can not be resumed!</span>,
      onOk() {
        onRelease({
          id: chainId,
          name: chainName
        })
      },
      onCancel() {},
      okText: 'Ok',
      cancelText: 'Cancel'
    });
  }
  render() {
    const {chain, currentChain, onUpdate, loadingCurrentBlockTxList, currentBlockTxList,
      channelHeight,smartChainCodes, dispatch,intl} = this.props;
    const {ordertable, orgtable, peertable,channeltable,channelpeertable} = chain;
    const chainId = window.localStorage.getItem(`${window.apikey}-chainId`)
    const overviewProps = {
      chain,
    }

    const orgcolumns = [
      {
        title: intl.formatMessage(messages.orgtable.organizationname),
        dataIndex: 'name',
        key: 'name'
      },
      {
        title: intl.formatMessage(messages.orgtable.mspid),
        dataIndex: 'mspid',
        key: 'mspid'
      },
      {
        title: intl.formatMessage(messages.orgtable.caurl),
        dataIndex: 'ca',
        key: 'ca'
      },
      {
        title: intl.formatMessage(messages.orgtable.peernumber),
        dataIndex: 'peernum',
        key: 'peernum',
        // render: (text) => (
        //   <span className={styles.title}>{text}</span>
        // )
      }
    ]

    const peercolumns = [
      {
        title: intl.formatMessage(messages.peertable.peername),
        dataIndex: 'serverHostname',
        key: 'serverHostname'
      },
      {
        title: intl.formatMessage(messages.peertable.orgnization),
        dataIndex: 'org',
        key: 'org'
      },
      {
        title: intl.formatMessage(messages.peertable.requesturl),
        dataIndex: 'requests',
        key: 'requests'
      },
      {
        title: intl.formatMessage(messages.peertable.eventurl),
        dataIndex: 'events',
        key: 'events'
      },
    ]

    const ordercolumns = [
      {
        title: intl.formatMessage(messages.ordertable.ordername),
        dataIndex: 'serverHostname',
        key: 'serverHostname'
      },
      {
        title: intl.formatMessage(messages.ordertable.orderurl),
        dataIndex: 'url',
        key: 'url'
      }
    ]

    const channelcolumns = [
      {
        title: intl.formatMessage(messages.channeltable.channelname),
        dataIndex: 'channelname',
        key: 'channelname'
      },
    ]

    const channelpeercolumns = [
      {
        title: intl.formatMessage(messages.channeltable.peername),
        dataIndex: 'peername',
        key: 'peername'
      },
      {
        title: intl.formatMessage(messages.channeltable.orgname),
        dataIndex: 'orgname',
        key: 'orgname'
      },
      {
        title: intl.formatMessage(messages.channeltable.channelname),
        dataIndex: 'channelname',
        key: 'channelname'
      },
    ]

    return (
      <div>
        <Overview {...overviewProps}/>
        {currentChain &&
        <div style={{paddingRight: 40}}>
          <Row gutter={24} style={{marginTop: 20}}>
            <Card title={intl.formatMessage(messages.orgtable.title)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
              <Table
                className={styles.table}
                columns={orgcolumns}
                dataSource={orgtable}
                // loading={loadingList}
                locale={{
                  emptyText: 'No data'
                }}
                size="small"
                rowKey={record => record.id}
              />
            </Card>
          </Row>
          <Row gutter={24} style={{marginTop: 20}}>
            <Card title={intl.formatMessage(messages.peertable.title)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
              <Table
                className={styles.table}
                columns={peercolumns}
                dataSource={peertable}
                // loading={loadingList}
                locale={{
                  emptyText: 'No data'
                }}
                size="small"
                rowKey={record => record.id}
              />
            </Card>
          </Row>
          <Row gutter={24} style={{marginTop: 20}}>
            <Card title={intl.formatMessage(messages.ordertable.title)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
              <Table
                className={styles.table}
                columns={ordercolumns}
                dataSource={ordertable}
                // loading={loadingList}
                locale={{
                  emptyText: 'No data'
                }}
                size="small"
                rowKey={record => record.id}
              />
            </Card>
          </Row>
          <Row gutter={24} style={{marginTop: 20}}>
            <Card title={intl.formatMessage(messages.channeltable.title)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
              <Table
                className={styles.table}
                columns={channelcolumns}
                dataSource={channeltable}
                // loading={loadingList}
                locale={{
                  emptyText: 'No data'
                }}
                size="small"
                rowKey={record => record.id}
              />
              <Table
                className={styles.table}
                columns={channelpeercolumns}
                dataSource={channelpeertable}
                // loading={loadingList}
                locale={{
                  emptyText: 'No data'
                }}
                size="small"
                rowKey={record => record.id}
              />
            </Card>
          </Row>
        </div>
        }
      </div>
    )
  }
}

export default ChainView2
