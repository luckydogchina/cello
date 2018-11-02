/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, {PropTypes} from 'react'
import { Modal, Form, Row, Col, Input, Select,TreeSelect } from 'antd'
const FormItem = Form.Item
import {isAscii, isByteLength} from 'validator';
import { injectIntl, intlShape, FormattedMessage} from 'react-intl';
const Option = Select.Option;
import messages from './messages'

const formItemLayout = {
  labelCol: {
    span: 6,
  },
  wrapperCol: {
    span: 14,
  },
}

@Form.create()
class InstallModal extends React.Component {
  constructor (props) {
    super(props)
  }
  onOk = (e) => {
    const {form: {validateFields}, onOk} = this.props
    e.preventDefault()
    validateFields((errors, values) => {
      if (errors) {
        return
      }
      onOk(values)
    })
  }
  render () {
    const {onCancel, visible, loading, chains, subchains, form: {getFieldDecorator}, intl,tProps} = this.props;
    const title = intl.formatMessage(messages.form.title.installChainCode)
    const okText = intl.formatMessage(messages.button.submit)
    const cancelText = intl.formatMessage(messages.button.cancel)
    const modalProps = {
      title,
      visible,
      onOk: this.onOk,
      onCancel,
      confirmLoading: loading,
      okText,
      cancelText,
      style: { top: 50 }
    }
    const {
      localchannels
    } = chains[0];
    // const chainOptions = chains.map((chain, i) =>
    //   <Option value={chain.id}>{chain.name}</Option>
    // )

    const channelOptions = localchannels.map((item, i) =>
      <Option value={item}>{item}</Option>
    )


    return (
      <Modal {...modalProps}>
        <Form layout="horizontal">

          <FormItem label="Chain" hasFeedback {...formItemLayout}>
            {getFieldDecorator('chainId', {
              initialValue: chains.length ? chains[0].id : "",
              rules: [
                {
                  required: true,
                  message: intl.formatMessage(messages.form.validate.chain.required),
                }
              ],
            })(
              <Select placeholder="Select a chain to install" notFoundContent="No available chain">
                {chains.map((chain, i) =>
                  <Option value={chain.id}>{chain.name}</Option>
                )}
              </Select>
            )}
          </FormItem>
          <FormItem label="Channel" hasFeedback {...formItemLayout}>
            {getFieldDecorator('channelname', {
              initialValue: localchannels.length ? localchannels[0] : "",
              rules: [
                {
                  required: true,
                  // message: intl.formatMessage(messages.form.validate.org.required),
                }
              ],
            })(
              <Select placeholder="Select a channel">
                {channelOptions}
              </Select>
            )}
          </FormItem>

          <FormItem label="Peer" hasFeedback {...formItemLayout}>
            {getFieldDecorator('orgs', {
              rules: [
                {
                  required: true,
                  message: intl.formatMessage(messages.form.validate.org.required),
                }
              ],
            })(
              <TreeSelect {...tProps} placeholder="Select peers to join" />
            )}
          </FormItem>
        </Form>



      </Modal>
    )
  }
}

export default injectIntl(InstallModal)
