/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, {PropTypes} from 'react'
import { Modal, Form, Row, Col, Input,message,Upload,Button,Icon } from 'antd'
const FormItem = Form.Item
import {isAscii, isByteLength} from 'validator';
import { injectIntl, intlShape, FormattedMessage} from 'react-intl';
import messages from '../New/messages'
const Cookies = require('js-cookie')

const formItemLayout = {
  labelCol: {
    span: 6,
  },
  wrapperCol: {
    span: 14,
  },
}

@Form.create()
class EditModal extends React.Component {
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
  // validateName = (rule, value, callback) => {
  //   const {intl} = this.props;
  //   if (value) {
  //     if (!isAscii(value)) {
  //       callback(intl.formatMessage(messages.form.validate.name.invalidName))
  //     } else {
  //       if (!isByteLength(value, {max: 20})) {
  //         callback(intl.formatMessage(messages.form.validate.name.invalidLength))
  //       }
  //     }
  //   }
  //   callback()
  // }
  render () {
    const {onCancel, visible, loading, name, form: {getFieldDecorator}, intl} = this.props;
    const title = intl.formatMessage(messages.form.title.updateChain)
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

    const token = Cookies.get('CelloToken')
    const uploadprops = {
      name: 'file',
      action: '/api/subchain/uploadconfig',
      headers: {
        authorization: `Bearer ${token}`,
      },
      onChange(info) {
        if (info.file.status !== 'uploading') {
          console.log(info.file, info.fileList);
        }
        if (info.file.status === 'done') {
          message.success(`${info.file.name} file uploaded successfully`);
        } else if (info.file.status === 'error') {
          message.error(`${info.file.name} file upload failed.`);
        }
      },
    };

    const { TextArea } = Input;

    return (
      <Modal {...modalProps}>
        <Form layout="horizontal">
          {/*<FormItem label={intl.formatMessage(messages.form.label.name)} hasFeedback {...formItemLayout}>*/}
            {/*{getFieldDecorator('name', {*/}
              {/*initialValue: name,*/}
              {/*rules: [*/}
                {/*{*/}
                  {/*required: true,*/}
                  {/*message: intl.formatMessage(messages.form.validate.name.required),*/}
                {/*},*/}
                {/*{*/}
                  {/*validator: this.validateName*/}
                {/*}*/}
              {/*],*/}
            {/*})(<Input />)}*/}
          {/*</FormItem>*/}
          <FormItem label={intl.formatMessage(messages.form.label.chainconfig)} {...formItemLayout}>
            <Upload {...uploadprops}>
              <Button>
                <Icon type="upload" /> Click to Upload
              </Button>
            </Upload>,
          </FormItem>
          <FormItem label={intl.formatMessage(messages.form.label.chainaddress)} {...formItemLayout}>
            {getFieldDecorator('chainaddress', {
              initialValue: '"ca_org1_ecap":"192.168.1.109:7850",'+
              '"ca_org2_ecap":"192.168.1.109:7950",'+
              '"dashboard":"192.168.1.109:8150",'+
              '"orderer": "192.168.1.109:8050",'+
              '"peer0_org1_event": "192.168.1.109:7150",'+
              '"peer0_org1_grpc": "192.168.1.109:7050",'+
              '"peer0_org2_event": "192.168.1.109:7550",'+
              '"peer0_org2_grpc": "192.168.1.109:7450",'+
              '"peer1_org1_event": "192.168.1.109:7350",'+
              '"peer1_org1_grpc": "192.168.1.109:7250",'+
              '"peer1_org2_event": "192.168.1.109:7750",'+
              '"peer1_org2_grpc": "192.168.1.109:7650"'
            })(<TextArea rows={15} />)}
          </FormItem>

        </Form>
      </Modal>
    )
  }
}

export default injectIntl(EditModal)
