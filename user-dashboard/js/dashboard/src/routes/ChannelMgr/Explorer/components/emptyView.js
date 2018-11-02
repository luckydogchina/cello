/*
 SPDX-License-Identifier: Apache-2.0
*/
import React from 'react'
import { Row, Col, Icon, Button, Card } from 'antd'
import { injectIntl, intlShape, defineMessages, FormattedMessage} from 'react-intl';

const messages = defineMessages({
  title: {
    id: "Channel.EmptyView.Title",
    defaultMessage: "Browse Channel Fail"
  },
})

function EmptyView () {

  return (
    <Card bordered={false}>
    <Row type="flex" justify="space-around" align="middle">
      <Col span={8} style={{textAlign: "center"}}>
        <Row>
          <Icon type="copy" style={{fontSize: 120}} />
        </Row>
        <Row>
          <p style={{fontSize: 18, fontWeight: "bold", marginTop: 20}}><FormattedMessage {...messages.title} /></p>
          {/*<p style={{marginTop: 15}}><FormattedMessage {...messages.content} /></p>*/}
        </Row>
      </Col>
    </Row>
    </Card>
  )
}

export default EmptyView
