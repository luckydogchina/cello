/*
 SPDX-License-Identifier: Apache-2.0
 */
import React from 'react'
import PropTypes from 'prop-types'
import styles from './cardView.less'
import { Table, Divider, Icon, Card } from 'antd';
import { connect } from 'dva';
import moment from "moment"
import { Modal, Button } from 'antd';
import { injectIntl, intlShape, defineMessages, FormattedMessage} from 'react-intl';
import messages from "./messages";

@connect(state => ({
  chain:state.chain,
  subchain:state.subChain,
  recentTransactions : state.recentTransactions,
}))

class NewsTrading extends React.Component {
  constructor (props) {
    super(props)
    this.state = {
      logging:true
    }
  }

  render() {
    const {chains, recentTransactions: { recentTransactions }, loadingRecentTransactions }= this.props.chain;
    const {chains:subchains, recentTransactions: { recentTransactions:subrecentTransactions }, loadingRecentTransactions:subloadingRecentTransactions }= this.props.subchain;
    const {onClickTx, intl} = this.props;
    const columns = [
      {
        title: intl.formatMessage(messages.recentTransactions.transactionContent),
        dataIndex: 'id',
        key: 'id',
        width:'288px',
        render: (text, record) => (
          <a className={styles.link} style={{width:'288px',display:'inline-block'}} onClick={() => onClickTx(record)}>
            {text}
          </a>
        ),
      },
      {
        title: intl.formatMessage(messages.recentTransactions.tradingTime),
        key: 'timestamp',
        dataIndex: 'timestamp',
        render: (text, record) => (
          <span>
                      {moment(record.timestamp).format('YYYY-MM-DD HH:mm:ss')}
                    </span>
        ),
        defaultSortOrder: 'descend',
        sorter: (a, b) => moment(a.timestamp).unix() - moment(b.timestamp).unix()
      }
    ];


    return (
      <Card title={intl.formatMessage(messages.recentTransactions.title)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
        {chains && chains.length && <Table
          loading={loadingRecentTransactions}
          scroll={{ y: 420 }}
          columns={columns}
          dataSource={recentTransactions}
          pagination={false}

        />}
        {subchains && subchains.length && <Table
          loading={subloadingRecentTransactions}
          scroll={{ y: 420 }}
          columns={columns}
          dataSource={subrecentTransactions}
          pagination={false}

        />}
      </Card>
    )
  }
}

export default injectIntl(NewsTrading)
