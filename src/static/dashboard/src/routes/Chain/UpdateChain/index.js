/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { PureComponent } from 'react';
import { Card, Form, Input, Button, Select} from 'antd';
import { routerRedux } from 'dva/router';
import { connect } from 'dva';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import PageHeaderLayout from '../../../layouts/PageHeaderLayout';
import styles from './index.less';
const { TextArea } = Input;

const FormItem = Form.Item;
const { Option } = Select;

const messages = defineMessages({
  updateTitle: {
    id: 'Host.Create.UpdateTitle',
    defaultMessage: 'Update Host',
  },
  title: {
    id: 'Chain.Create.Title',
    defaultMessage: 'Create New Chain',
  },
  subTitle: {
    id: 'Host.Create.SubTitle',
    defaultMessage: 'Here you can create multiple type host, for creating fabric cluster.',
  },
  label: {
    name: {
      id: 'Host.Create.Validate.Label.Name',
      defaultMessage: 'Name',
    },
    host: {
      id: 'Chain.Create.Label.Host',
      defaultMessage: 'Host',
    },
    networkType: {
      id: 'Chain.Label.NetworkType',
      defaultMessage: 'Network Type',
    },
    consensusPlugin: {
      id: 'Chain.Label.ConsensusPlugin',
      defaultMessage: 'Consensus Plugin',
    },
    chainSize: {
      id: 'Chain.Create.Label.ChainSize',
      defaultMessage: 'Chain Size',
    },
    oldchainConfig: {
      id: 'Chain.Create.Label.OldChainConfig',
      defaultMessage: 'Origin Chain Config',
    },
    newchainConfig: {
      id: 'Chain.Create.Label.NewChainConfig',
      defaultMessage: 'New Chain Config',
    },
  },
  button: {
    submit: {
      id: 'Host.Create.Button.Submit',
      defaultMessage: 'Submit',
    },
    cancel: {
      id: 'Host.Create.Button.Cancel',
      defaultMessage: 'Cancel',
    },
  },
  validate: {
    error: {
      workerApi: {
        id: 'Host.Create.Validate.Error.WorkerApi',
        defaultMessage: 'Please input validate worker api.',
      },
    },
    required: {
      name: {
        id: 'Host.Create.Validate.Required.Name',
        defaultMessage: 'Please input name.',
      },
      host: {
        id: 'Chain.Create.Validate.Required.Host',
        defaultMessage: 'Must select a host',
      },
      chainConfig: {
        id: 'Chain.Create.Validate.Required.chainConfig',
        defaultMessage: 'Must Input Chain Config',
      },
    },
  },
});

@connect(({ chain }) => ({
  chain,
  // loadingHosts: loading.effects['host/fetchHosts'],
}))
@Form.create()
class UpdateChain extends PureComponent {
  state = {
    submitting: false,
  };
  componentDidMount() {
    // this.props.dispatch({
    //   type: 'chain/fetchChains',
    // });
  }
  submitCallback = () => {
    this.setState({
      submitting: false,
    });
  };
  clickCancel = () => {
    this.props.dispatch(
      routerRedux.push({
        pathname: '/chain',
      })
    );
  };
  handleSubmit = e => {
    const { chain:{currentChain:{id, name, host_id, network}}} = this.props;
    var networkstr=JSON.stringify(network)
    e.preventDefault();
    this.props.form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        this.setState({
          submitting: true,
        });
        this.props.dispatch({
          type: 'chain/operateChain',
          payload: {
            cluster_id: id,
            action: 'update',
            name,
            host_id,
            old_network: networkstr,
            ...values,
            // callback: this.submitCallback,
          },
        });
        this.props.dispatch(
          routerRedux.push({
            pathname: '/chain',
          })
        );
      }
    });
  };
  render() {
    const { getFieldDecorator } = this.props.form;
    const { intl ,chain} = this.props;
    const {currentChain: currentChain } = chain;
    const {network } = currentChain;
    const { submitting } = this.state;
    const { curclusterid } = chain;
    var varnetwork=JSON.parse(JSON.stringify(network))
    delete varnetwork.orderer;
    delete varnetwork.consensus;
    delete varnetwork.version;
    var networkstr=JSON.stringify(varnetwork)

    const formItemLayout = {
      labelCol: {
        xs: { span: 24 },
        sm: { span: 7 },
      },
      wrapperCol: {
        xs: { span: 24 },
        sm: { span: 12 },
        md: { span: 10 },
      },
    };

    const submitFormLayout = {
      wrapperCol: {
        xs: { span: 24, offset: 0 },
        sm: { span: 10, offset: 7 },
      },
    };
    return (
      <PageHeaderLayout title={intl.formatMessage(messages.title)}>
        <Card bordered={false}>
          <Form onSubmit={this.handleSubmit} hideRequiredMark style={{ marginTop: 8 }}>
            <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.name)}>
                <p>{currentChain.name}</p>
            </FormItem>
            <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.host)}>
                <p>{currentChain.host_id}</p>
            </FormItem>
            <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.networkType)}>
               <p>{currentChain.network_type}</p>
            </FormItem>
            <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.chainSize)}>
              <p>{currentChain.size}</p>
            </FormItem>
            <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.consensusPlugin)}>
              <p>{currentChain.consensus_plugin}</p>
            </FormItem>
            <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.newchainConfig)}>
              {getFieldDecorator('network', {
                initialValue:networkstr,
                rules: [
                  {
                    required: true,
                    message: intl.formatMessage(messages.validate.required.chainConfig),
                  },
                ],
              })(<TextArea  rows={11} />)}
            </FormItem>

            <FormItem {...submitFormLayout} style={{ marginTop: 32 }}>
              <Button loading={submitting} type="primary" htmlType="submit">
                <FormattedMessage {...messages.button.submit} />
              </Button>
              <Button onClick={this.clickCancel} style={{ marginLeft: 8 }}>
                <FormattedMessage {...messages.button.cancel} />
              </Button>
            </FormItem>
          </Form>
        </Card>
      </PageHeaderLayout>
    );
  }
}

export default injectIntl(UpdateChain);
