/*
 SPDX-License-Identifier: Apache-2.0
 */
import React, { PureComponent } from 'react';
import { connect } from 'dva';
import { Link } from 'dva/router';
import { Row, Col, Card, List, Avatar, Badge, Button, Modal, Select,Tag, Tooltip,Form,
   Radio, Alert, Input,Icon, message,Upload,TreeSelect} from 'antd';
import { routerRedux } from 'dva/router';
import { injectIntl, intlShape, FormattedMessage} from 'react-intl';
import messages from './messages'

const FormItem = Form.Item
const confirm = Modal.confirm
const Option = Select.Option;

import PageHeaderLayout from '../../layouts/PageHeaderLayout';

import styles from './index.less';

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


const UpdateChannelForm = Form.create()(props => {
  const {
    chains,
    intl,
    form,
    dispatch,
    chaintype,
    tProps,
    orgOptions,
  } = props;

  const {
    localchannels,orgs
  } = chains[0];

  const {
    treeData,
    onChange,
    value
  } = tProps;

  const handleSubmit = (e) => {
    // const {dispatch} = this.props;
    e.preventDefault();
    form.validateFieldsAndScroll((err, values) => {
      if (!err) {
        // values["parameter"] = parameters
        dispatch({
          type: 'chain/setCurrentChannelAndLaunchPeer',
          payload: values
        })
        dispatch(routerRedux.push('/channelmgr/explorer'));
      }
    });
  }

  const channelOptions = localchannels.map((item, i) =>
    <Option value={item}>{item}</Option>
  )

  // const orgOptions2 = orgs.map((item, i) =>
  //   <Option value={item}>{item}</Option>
  // )

  return (
    <Form layout="horizontal" onSubmit={handleSubmit}>
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
      <FormItem label={intl.formatMessage(messages.form.label.launchpeer)} hasFeedback {...formItemLayout}>
        {form.getFieldDecorator('launchpeer', {
          rules: [
            {
              required: false,
            }
          ],
        })(
          <TreeSelect
            // style={{ width: 300 }}
            value={value}
            dropdownStyle={{ maxHeight: 400, overflow: 'auto' }}
            treeData={treeData}
            placeholder="Select launchpeer"
            treeDefaultExpandAll
            onChange={onChange}
          />
        )}
      </FormItem>
      {/*<FormItem label={intl.formatMessage(messages.form.label.signorgs)} hasFeedback {...formItemLayout}>*/}
        {/*{form.getFieldDecorator('orgs', {*/}
          {/*initialValue: orgs.length ? orgs[0] : "",*/}
          {/*rules: [*/}
            {/*{*/}
              {/*required: true,*/}
              {/*message: intl.formatMessage(messages.form.validate.required.orgs),*/}
            {/*}*/}
          {/*],*/}
        {/*})(*/}
          {/*<Select placeholder="Select a org">*/}
            {/*{orgOptions2}*/}
          {/*</Select>*/}
          {/*// <TreeSelect {...tProps} placeholder="Select a org" />*/}
        {/*)}*/}
      {/*</FormItem>*/}

      <FormItem {...tailFormItemLayout}>
        <Button type="primary" htmlType="submit"><FormattedMessage {...messages.button.explorer} /></Button>
      </FormItem>
    </Form>

  );
});


@connect(state => ({
  chain: state.chain,
  subchain: state.subChain,
}))
@Form.create()
class ChannelMgr extends PureComponent {
  state = {
    value: [],
  }
  componentDidMount() {
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


  render() {
    const {intl, chain: {dbChains:chains, orgtree, orgs},
      subchain: {dbChains:subchains,
        orgtree:suborgtree,orgs:suborgs},
      dispatch} = this.props;

    function onClickButtonManage() {
      dispatch(routerRedux.push('/channelmgr/manage'));
    }

    const SHOW_PARENT = TreeSelect.SHOW_PARENT;
    const orgstProps = {
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
    const suborgstProps = {
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

    const orgOptions = orgs.map((orgItem, i) =>
      <Option value={orgItem.value}>{orgItem.value}</Option>
    )

    const suborgOptions = suborgs.map((orgItem, i) =>
      <Option value={orgItem.value}>{orgItem.value}</Option>
    )

    const channelUpdateMethods = {
      intl,
      chains,
      dispatch,
      chaintype:'chain',
      tProps:orgstProps,
      orgOptions:orgOptions
    };
    const subchannelUpdateMethods = {
      intl,
      chains:subchains,
      dispatch,
      chaintype:'subChain',
      tProps:suborgstProps,
      orgOptions:suborgOptions
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

    return (
      <PageHeaderLayout
        content={pageHeaderContent}
        extraContent={pageHeaderExtra}
      >
        <div style={{paddingRight: 40}}>
          <Row gutter={24} style={{marginTop: 20}}>
            <Col span={12}>
              <Card bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={8} style={{textAlign: "center"}}>
                    <Row>
                      <p style={{fontSize: 18, fontWeight: "bold", marginTop: 20}}><FormattedMessage {...messages.title.explorer} /></p>
                    </Row>
                  </Col>
                </Row>
                <Row align="middle">
                  {(chains.length>0) && <UpdateChannelForm {...channelUpdateMethods} ></UpdateChannelForm>}
                  {(subchains.length>0) && <UpdateChannelForm {...subchannelUpdateMethods} ></UpdateChannelForm>}
                </Row>
              </Card>
            </Col>

            <Col span={12}>
              <Card bordered={false} className={styles.cardBody} style={{ width: "100%"}}>
                <Row type="flex" justify="space-around" align="middle">
                  <Col span={8} style={{textAlign: "center"}}>
                    <Row>
                      <p style={{fontSize: 18, fontWeight: "bold", marginTop: 20}}><FormattedMessage {...messages.title.manage} /></p>
                    </Row>
                    <Row>
                      <Button onClick={onClickButtonManage} type="primary" style={{marginTop: 20}}><FormattedMessage {...messages.button.manage} /></Button>
                    </Row>
                  </Col>
                </Row>
              </Card>
            </Col>

          </Row>

        </div>

        {/*<Row gutter={24} style={{marginTop: 20}}>*/}
          {/*<Card>*/}
            {/*<Row type="flex" justify="start" align="middle">*/}
              {/*<Col span={8} style={{textAlign: "center"}}>*/}
                {/*<Row>*/}
                  {/*<p style={{fontSize: 18, fontWeight: "bold", marginTop: 20}}><FormattedMessage {...messages.title.explorer} /></p>*/}
                {/*</Row>*/}
              {/*</Col>*/}
            {/*</Row>*/}
            {/*<Row justify="start" align="middle">*/}
            {/*{(chains.length>0) && <UpdateChannelForm {...channelUpdateMethods} ></UpdateChannelForm>}*/}
            {/*{(subchains.length>0) && <UpdateChannelForm {...subchannelUpdateMethods} ></UpdateChannelForm>}*/}
            {/*</Row>*/}
          {/*</Card>*/}
        {/*</Row>*/}

        {/*<Row gutter={24} style={{marginTop: 20}}>*/}
          {/*<Card bordered={false} className={styles.cardBody} style={{ width: "100%"}}>*/}
            {/*<Row type="flex" justify="start" align="middle">*/}
              {/*<Col span={8} style={{textAlign: "center"}}>*/}
                {/*<Row>*/}
                  {/*<p style={{fontSize: 18, fontWeight: "bold", marginTop: 20}}><FormattedMessage {...messages.title.manage} /></p>*/}
                {/*</Row>*/}
                {/*<Row>*/}
                  {/*<Button onClick={onClickButtonManage} type="primary" style={{marginTop: 20}}><FormattedMessage {...messages.button.manage} /></Button>*/}
                {/*</Row>*/}
              {/*</Col>*/}
            {/*</Row>*/}
          {/*</Card>*/}
        {/*</Row>*/}


      </PageHeaderLayout>
    );
  }
}

export default injectIntl(ChannelMgr)
