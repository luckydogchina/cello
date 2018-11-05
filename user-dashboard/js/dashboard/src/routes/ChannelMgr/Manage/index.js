/*
 SPDX-License-Identifier: Apache-2.0
 */
import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { Link } from 'dva/router';
import { Row, Col, Card, List, Form, Avatar, Tag, Tooltip,
  Select, Button, Radio, Alert, Input,Icon, message,Upload,TreeSelect} from 'antd';
const RadioButton = Radio.Button;
const RadioGroup = Radio.Group;
import { injectIntl, intlShape, FormattedMessage} from 'react-intl';
import messages from './messages'
import { routerRedux } from 'dva/router';
const FormItem = Form.Item
const Option = Select.Option;

import PageHeaderLayout from '../../../layouts/PageHeaderLayout';

import styles from './index.less';

const Cookies = require('js-cookie')

const formItemLayout = {
  labelCol: {
    xs: { span: 24 },
    sm: { span: 6 },
  },
  wrapperCol: {
    xs: { span: 24 },
    sm: { span: 14 },
  },
};
const tailFormItemLayout = {
  wrapperCol: {
    xs: {
      span: 24,
      offset: 0,
    },
    sm: {
      span: 14,
      offset: 6,
    },
  },
};



const GenForm = Form.create()(props => {
  const {
    intl,
    form,
    dispatch,
    chaintype,
  } = props;

  const token = Cookies.get('CelloToken')
  const configfileprops = {
    name: 'channelconfigfile',
    action: '/api/'+chaintype+'/uploadchannelconfig',
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
  // const downloadchanneltxfile = () => {
  //   dispatch({
  //     type: chaintype+'/downloadchanneltxfile',
  //   });
  // };


  const handleGenchannelTXSubmit = (e) => {
    // const {dispatch} = this.props;
    e.preventDefault();
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        if (chaintype == 'chain') {
          dispatch({
            type: 'chain/genchanneltxfile',
            payload: values
          })
        } else {
          dispatch({
            type: 'subChain/genchanneltxfile',
            payload: values
          })
        }


      }
    });
  }

  return (
    <Form layout="horizontal" onSubmit={handleGenchannelTXSubmit}>
      <FormItem label={intl.formatMessage(messages.form.label.channelName)} {...formItemLayout}>
        {form.getFieldDecorator('channelname1', {
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.channelName),
            }
          ],
        })(
          <Input />
        )}
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.channelconfig)} {...formItemLayout}>
        <Upload {...configfileprops}>
          <Button>
            <Icon type="upload" /> Click to Upload
          </Button>
        </Upload>,
      </FormItem>
      <FormItem {...tailFormItemLayout}>
        <Button type="primary" htmlType="submit"><FormattedMessage {...messages.button.genchannelconfig} /></Button>
      </FormItem>
      {/*<FormItem {...tailFormItemLayout}>*/}
        {/*<a onClick={() => downloadchanneltxfile()}>*/}
          {/*<FormattedMessage {...messages.button.downloadchanneltxfile} />*/}
        {/*</a>*/}
      {/*</FormItem>*/}
    </Form>

  );
});



const CreateChannelForm = Form.create()(props => {
  const {
    chains,
    intl,
    form,
    channelCreating,
    channelCreateResult,
    dispatch,
    chaintype,
    onChange,
  } = props;
  const {
    orgs
  } = chains[0];

  const handleSubmit = (e) => {
    // const {dispatch} = this.props;
    e.preventDefault();
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        // values["parameter"] = parameters
        dispatch({
          type: chaintype+'/createChannel',
          payload: values
        })
        dispatch({
          type: chaintype+'/listDBChain',
        })
      }
    });
    onChange([])
  }

  const chainOptions = chains.map((chainItem, i) =>
    <Option value={chainItem.id}>{chainItem.name}</Option>
  )
  const orgOptions = orgs.map((item, i) =>
    <Option value={item}>{item}</Option>
  )

  const token = Cookies.get('CelloToken')
  const txfileprops = {
    name: 'channeltxfile',
    action: '/api/'+chaintype+'/uploadchanneltx',
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

  return (
    <Form layout="horizontal" onSubmit={handleSubmit}>
      <FormItem label={intl.formatMessage(messages.form.label.chain)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('chainid', {
          initialValue: chains.length ? chains[0].id : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.chain),
            }
          ],
        })(
          <Select placeholder="Select a chain to install">
            {chainOptions}
          </Select>
        )}
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.channeltx)} {...formItemLayout}>
        <Upload {...txfileprops}>
          <Button>
            <Icon type="upload" /> Click to Upload
          </Button>
        </Upload>,
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.channelName)} {...formItemLayout}>
        {form.getFieldDecorator('channelname', {
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.channelName),
            }
          ],
        })(
          <Input />
        )}
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.signorgs)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('signorg', {
          initialValue: orgs.length ? orgs[0] : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.orgs),
            }
          ],
        })(
          <Select placeholder="Select a org">
            {orgOptions}
          </Select>
          // <TreeSelect {...tProps} placeholder="Select a org" />
        )}
      </FormItem>
      {!channelCreating && channelCreateResult.message &&
      <FormItem {...tailFormItemLayout}>
        <Alert showIcon message={channelCreateResult.message} type={channelCreateResult.success ? "success" : "error"} />
      </FormItem>
      }
      <FormItem {...tailFormItemLayout}>
        <Button loading={channelCreating} type="primary" htmlType="submit"><FormattedMessage {...messages.button.create} /></Button>
      </FormItem>
    </Form>

  );
});


const JoinChannelForm = Form.create()(props => {
  const {
    chains,
    intl,
    form,
    channelJoining,
    channelJoinResult,
    dispatch,
    chaintype,
    tProps,
  } = props;

  const {
    localchannels,orgs
  } = chains[0];

  const handleSubmit = (e) => {
    // const {dispatch} = this.props;
    e.preventDefault();
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        // values["parameter"] = parameters
        dispatch({
          type: chaintype+'/joinChannel',
          payload: values
        })
      }
    });
  }

  const chainOptions = chains.map((chainItem, i) =>
    <Option value={chainItem.id}>{chainItem.name}</Option>
  )

  const channelOptions = localchannels.map((item, i) =>
    <Option value={item}>{item}</Option>
  )


  return (

    <Form layout="horizontal" onSubmit={handleSubmit}>
      <FormItem label={intl.formatMessage(messages.form.label.chain)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('chainid', {
          initialValue: chains.length ? chains[0].id : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.chain),
            }
          ],
        })(
          <Select placeholder="Select a chain to join">
            {chainOptions}
          </Select>
        )}
      </FormItem>

      <FormItem label={intl.formatMessage(messages.form.label.channelName)} {...formItemLayout}>
        {form.getFieldDecorator('channelname', {
          initialValue: localchannels.length ? localchannels[0] : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.channelName),
            }
          ],
        })(
          <Select placeholder="Select a channel">
            {channelOptions}
          </Select>
        )}
      </FormItem>

      {/*<FormItem label={intl.formatMessage(messages.form.label.channelName)} {...formItemLayout}>*/}
        {/*{form.getFieldDecorator('channelname', {*/}
          {/*rules: [*/}
            {/*{*/}
              {/*required: true,*/}
              {/*message: intl.formatMessage(messages.form.validate.required.channelName),*/}
            {/*}*/}
          {/*],*/}
        {/*})(*/}
          {/*<Input />*/}
        {/*)}*/}
      {/*</FormItem>*/}

      <FormItem label={intl.formatMessage(messages.form.label.orgs)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('orgs', {
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.orgs),
            }
          ],
        })(
          <TreeSelect {...tProps} placeholder="Select a peers to join" />
        )}
      </FormItem>
      {/*<FormItem label={intl.formatMessage(messages.form.label.orgs)} hasFeedback {...formItemLayout}>*/}
        {/*<TreeSelect {...tProps}  placeholder="Select a peers to join"/>*/}
      {/*</FormItem>*/}
      {!channelJoining && channelJoinResult.message &&
      <FormItem {...tailFormItemLayout}>
        <Alert showIcon message={channelJoinResult.message} type={channelJoinResult.success ? "success" : "error"} />
      </FormItem>
      }


      <FormItem {...tailFormItemLayout}>
        <Button loading={channelJoining} type="primary" htmlType="submit"><FormattedMessage {...messages.button.join} /></Button>
      </FormItem>
    </Form>

  );
});


const DownloadChannelConfigForm = Form.create()(props => {
  const {
    intl,
    chains,
    form,
    dispatch,
    chaintype,
  } = props;

  const {
    localchannels,orgs
  } = chains[0];

  const handleDownloadChannelConfigSubmit = (e) => {
    // const {dispatch} = this.props;
    e.preventDefault();
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        dispatch({
          type: chaintype+'/downloadchannelconfigfile',
          payload: values
        })
      }
    });
  }

  const chainOptions = chains.map((chainItem, i) =>
    <Option value={chainItem.id}>{chainItem.name}</Option>
  )

  const channelOptions = localchannels.map((item, i) =>
    <Option value={item}>{item}</Option>
  )

  const orgOptions = orgs.map((item, i) =>
    <Option value={item}>{item}</Option>
  )

  return (
    <Form layout="horizontal" onSubmit={handleDownloadChannelConfigSubmit}>
      <FormItem label={intl.formatMessage(messages.form.label.chain)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('chainid', {
          initialValue: chains.length ? chains[0].id : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.chain),
            }
          ],
        })(
          <Select placeholder="Select a chain">
            {chainOptions}
          </Select>
        )}
      </FormItem>

      <FormItem label={intl.formatMessage(messages.form.label.channelName)} {...formItemLayout}>
        {form.getFieldDecorator('channelname', {
          initialValue: localchannels.length ? localchannels[0] : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.channelName),
            }
          ],
        })(
          <Select placeholder="Select a channel">
            {channelOptions}
          </Select>
        )}
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.signorgs)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('signorg', {
          initialValue: orgs.length ? orgs[0] : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.orgs),
            }
          ],
        })(
          <Select placeholder="Select a org">
            {orgOptions}
          </Select>
          // <TreeSelect {...tProps} placeholder="Select a org" />
        )}
      </FormItem>

      {/*<FormItem label={intl.formatMessage(messages.form.label.channelName)} {...formItemLayout}>*/}
        {/*{form.getFieldDecorator('channelname', {*/}
          {/*rules: [*/}
            {/*{*/}
              {/*required: true,*/}
              {/*message: intl.formatMessage(messages.form.validate.required.channelName),*/}
            {/*}*/}
          {/*],*/}
        {/*})(*/}
          {/*<Input />*/}
        {/*)}*/}
      {/*</FormItem>*/}
      <FormItem {...tailFormItemLayout}>
        <Button type="primary" htmlType="submit"><FormattedMessage {...messages.button.downloadchannelconfigfile} /></Button>
      </FormItem>
      {/*<FormItem {...tailFormItemLayout}>*/}
      {/*<a onClick={() => downloadchanneltxfile()}>*/}
      {/*<FormattedMessage {...messages.button.downloadchanneltxfile} />*/}
      {/*</a>*/}
      {/*</FormItem>*/}
    </Form>

  );
});



const UpdateChannelForm = Form.create()(props => {
  const {
    chains,
    intl,
    form,
    channelUpdating,
    channelUpdateResult,
    dispatch,
    chaintype,
    tProps,
  } = props;


  const {
    localchannels,orgs
  } = chains[0];

  const handleSubmit = (e) => {
    // const {dispatch} = this.props;
    e.preventDefault();
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        // values["parameter"] = parameters
        dispatch({
          type: chaintype+'/updateChannel',
          payload: values
        })
      }
    });
  }

  const chainOptions = chains.map((chainItem, i) =>
    <Option value={chainItem.id}>{chainItem.name}</Option>
  )

  const channelOptions = localchannels.map((item, i) =>
    <Option value={item}>{item}</Option>
  )

  const orgOptions = orgs.map((item, i) =>
    <Option value={item}>{item}</Option>
  )


  const token = Cookies.get('CelloToken')
  const originalconfigjsonprops = {
    name: 'originalconfigjson',
    action: '/api/'+chaintype+'/uploadoriginalconfigjson',
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
  const updatedconfigjsonprops = {
    name: 'updatedconfigjson',
    action: '/api/'+chaintype+'/uploadupdatedconfigjson',
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

  return (
    <Form layout="horizontal" onSubmit={handleSubmit}>
      <FormItem label={intl.formatMessage(messages.form.label.chain)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('chainid', {
          initialValue: chains.length ? chains[0].id : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.chain),
            }
          ],
        })(
          <Select placeholder="Select a chain to install">
            {chainOptions}
          </Select>
        )}
      </FormItem>
      {/*<FormItem label={intl.formatMessage(messages.form.label.channelName)} {...formItemLayout}>*/}
        {/*{form.getFieldDecorator('channelname', {*/}
          {/*rules: [*/}
            {/*{*/}
              {/*required: true,*/}
              {/*message: intl.formatMessage(messages.form.validate.required.channelName),*/}
            {/*}*/}
          {/*],*/}
        {/*})(*/}
          {/*<Input />*/}
        {/*)}*/}
      {/*</FormItem>*/}
      <FormItem label={intl.formatMessage(messages.form.label.channelName)} {...formItemLayout}>
        {form.getFieldDecorator('channelname', {
          initialValue: localchannels.length ? localchannels[0] : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.channelName),
            }
          ],
        })(
          <Select placeholder="Select a channel">
            {channelOptions}
          </Select>
        )}
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.signorgs)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('signorg', {
          initialValue: orgs.length ? orgs[0] : "",
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.orgs),
            }
          ],
        })(
          <Select placeholder="Select a org">
            {orgOptions}
          </Select>
          // <TreeSelect {...tProps} placeholder="Select a org" />
        )}
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.originalchannelconfig)} {...formItemLayout}>
        <Upload {...originalconfigjsonprops}>
          <Button>
            <Icon type="upload" /> Click to Upload
          </Button>
        </Upload>,
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.updatedchannelconfig)} {...formItemLayout}>
        <Upload {...updatedconfigjsonprops}>
          <Button>
            <Icon type="upload" /> Click to Upload
          </Button>
        </Upload>,
      </FormItem>
      <FormItem label={intl.formatMessage(messages.form.label.orgtosign)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('orgs', {
          rules: [
            {
              required: true,
              message: intl.formatMessage(messages.form.validate.required.orgs),
            }
          ],
        })(
          <TreeSelect {...tProps} placeholder="Select org to sign" />
        )}
      </FormItem>
      {!channelUpdating && channelUpdateResult.message &&
      <FormItem {...tailFormItemLayout}>
        <Alert showIcon message={channelUpdateResult.message} type={channelUpdateResult.success ? "success" : "error"} />
      </FormItem>
      }
      <FormItem {...tailFormItemLayout}>
        <Button loading={channelUpdating} type="primary" htmlType="submit"><FormattedMessage {...messages.button.update} /></Button>
      </FormItem>
    </Form>

  );
});


@connect(state => ({
  chain: state.chain,
  subchain: state.subChain,
  // chainCode: state.chainCode
}))
@Form.create()
class ChannelMgr extends PureComponent {
  constructor (props) {
    super(props)
    this.state = {
      inputVisible: false,
      inputValue: '',
      value: [],
    }
  }
  componentDidMount() {
    // this.props.dispatch({
    //   type: 'chain/queryChains',
    // })
    // this.props.dispatch({
    //   type: 'subChain/queryChains',
    // })
    this.props.dispatch({
      type: 'chain/listDBChain',
    })
    this.props.dispatch({
      type: 'subChain/listDBChain',
    })
  }

  componentWillUnmount() {

  }



  onChange = (value) => {
    this.setState({ value });
  }

  saveInputRef = input => this.input = input

  render() {
    const {form: {getFieldDecorator}, intl, chain: {dbChains:chains, channelCreating, channelCreateResult, channelJoining, channelJoinResult,channelUpdating,channelUpdateResult, orgtree,orgs},
      subchain: {dbChains:subchains, channelCreating:subchannelCreating, channelCreateResult:subchannelCreateResult, channelJoining:subchannelJoining, channelJoinResult:subchannelJoinResult,
        channelUpdating:subchannelUpdating,channelUpdateResult:subchannelUpdateResult, orgtree:suborgtree,orgs:suborgs},
      dispatch} = this.props;
    const { inputVisible, inputValue, refreshedTag} = this.state; //parameters,


    const SHOW_PARENT = TreeSelect.SHOW_PARENT;
    const tProps = {
      treeData:orgtree,
      value: this.state.value,
      onChange: this.onChange,
      treeCheckable: true,
      showCheckedStrategy: SHOW_PARENT,
      searchPlaceholder: 'Please select',
      style: {
        width: 300,
      },
    };
    const subtProps = {
      treeData:suborgtree,
      value: this.state.value,
      onChange: this.onChange,
      treeCheckable: true,
      showCheckedStrategy: SHOW_PARENT,
      searchPlaceholder: 'Please select',
      style: {
        width: 300,
      },
    };

    const orgstProps = {
      treeData:orgs,
      value: this.state.value,
      onChange: this.onChange,
      treeCheckable: true,
      showCheckedStrategy: SHOW_PARENT,
      searchPlaceholder: 'Please select',
      style: {
        width: 300,
      },
    };
    const suborgstProps = {
      treeData:suborgs,
      value: this.state.value,
      onChange: this.onChange,
      treeCheckable: true,
      showCheckedStrategy: SHOW_PARENT,
      searchPlaceholder: 'Please select',
      style: {
        width: 300,
      },
    };

    const pageHeaderContent = (
      <div className={styles.pageHeaderContent}>
        <FormattedMessage {...messages.pageHeader.content} />
      </div>
    );

    const pageHeaderExtra = (
      <div className={styles.pageHeaderExtra}>
      </div>
    );

    const genprops = {
      intl,
      dispatch,
      chaintype:'chain',
    }
    const subgenprops = {
      intl,
      dispatch,
      chaintype:'subChain',
    }

    const channelCreatMethods = {
      intl,
      chains,
      channelCreating,
      channelCreateResult,
      dispatch,
      chaintype:'chain',
      onChange: this.onChange,
    };
    const subchannelCreatMethods = {
      intl,
      chains:subchains,
      channelCreating:subchannelCreating,
      channelCreateResult:subchannelCreateResult,
      dispatch,
      chaintype:'subChain',
    };

    const channelJoinMethods = {
      intl,
      chains,
      channelJoining,
      channelJoinResult,
      dispatch,
      chaintype:'chain',
      tProps,
    };
    const subchannelJoinMethods = {
      intl,
      chains:subchains,
      channelJoining:subchannelJoining,
      channelJoinResult:subchannelJoinResult,
      dispatch,
      chaintype:'subChain',
      tProps:subtProps
    };

    const getchannelconfigprops = {
      intl,
      chains:chains,
      dispatch,
      chaintype:'chain',
    }
    const subgetchannelconfigprops = {
      intl,
      chains:subchains,
      dispatch,
      chaintype:'subChain',
    }

    const channelUpdateMethods = {
      intl,
      chains,
      channelUpdating,
      channelUpdateResult,
      dispatch,
      chaintype:'chain',
      tProps:orgstProps,
    };
    const subchannelUpdateMethods = {
      intl,
      chains:subchains,
      channelUpdating:subchannelUpdating,
      channelUpdateResult:subchannelUpdateResult,
      dispatch,
      chaintype:'subChain',
      tProps:suborgstProps,
    };

    return (
      <PageHeaderLayout title={intl.formatMessage(messages.title.manage)}>
        <Row gutter={24} style={{marginTop: 20}}>
          <Card title={intl.formatMessage(messages.button.genchannelconfig)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
            {(chains.length>0) && <GenForm {...genprops} ></GenForm>}
            {(subchains.length>0) && <GenForm {...subgenprops} ></GenForm>}
          </Card>
        </Row>
        <Row gutter={24} style={{marginTop: 20}}>
          <Card title={intl.formatMessage(messages.button.create)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
            {(chains.length>0) && <CreateChannelForm {...channelCreatMethods} ></CreateChannelForm>}
            {(subchains.length>0) && <CreateChannelForm {...subchannelCreatMethods} ></CreateChannelForm>}
          </Card>
        </Row>
        <Row gutter={24} style={{marginTop: 20}}>
          <Card title={intl.formatMessage(messages.button.join)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
            {(chains.length>0) && <JoinChannelForm {...channelJoinMethods} ></JoinChannelForm>}
            {(subchains.length>0) && <JoinChannelForm {...subchannelJoinMethods} ></JoinChannelForm>}
          </Card>
        </Row>
        <Row gutter={24} style={{marginTop: 20}}>
          <Card title={intl.formatMessage(messages.button.downloadchannelconfigfile)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
            {(chains.length>0) && <DownloadChannelConfigForm {...getchannelconfigprops} ></DownloadChannelConfigForm>}
            {(subchains.length>0) && <DownloadChannelConfigForm {...subgetchannelconfigprops} ></DownloadChannelConfigForm>}
          </Card>
        </Row>
        <Row gutter={24} style={{marginTop: 20}}>
          <Card title={intl.formatMessage(messages.button.update)} bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
            {(chains.length>0) && <UpdateChannelForm {...channelUpdateMethods} ></UpdateChannelForm>}
            {(subchains.length>0) && <UpdateChannelForm {...subchannelUpdateMethods} ></UpdateChannelForm>}
          </Card>
        </Row>
      </PageHeaderLayout>
    );
  }
}

export default injectIntl(ChannelMgr)
