/*
 SPDX-License-Identifier: Apache-2.0
*/
import React, { PureComponent, Fragment } from 'react';
import { connect } from 'dva';
import { stringify } from 'qs';
import { Card, Divider, Button, Modal, Form, Input, Select, InputNumber, Switch ,Checkbox} from 'antd';
import { defineMessages, injectIntl, FormattedMessage } from 'react-intl';
import Standardtable from '../../components/StandardTable';
import PageHeaderLayout from '../../layouts/PageHeaderLayout';
import request from '../../utils/request';
import config from '../../utils/config';
import { Table, Alert } from 'antd';

import styles from './style.less';

const { api } = config
const FormItem = Form.Item;
const { Option } = Select;

const messages = defineMessages({
  title: {
    create: {
      id: "UserManagement.Title.Create",
      defaultMessage: "Create new msp"
    },
    edit: {
      id: "UserManagement.Title.Edit",
      defaultMessage: "Edit user"
    }
  },
  button: {
    new: {
      id: "UserManagement.Button.New",
      defaultMessage: "New"
    },
    edit: {
      id: "UserManagement.Button.Edit",
      defaultMessage: "Edit"
    },
    download: {
      id: "UserManagement.Button.Download",
      defaultMessage: "Download"
    },
    downloadsigncert: {
      id: "UserManagement.Button.Downloadsigncert",
      defaultMessage: "Download Sign Cert"
    },
    downloadsignpub: {
      id: "UserManagement.Button.Downloadsignpub",
      defaultMessage: "Download Sign PublicKey"
    },
    delete: {
      id: "UserManagement.Button.Delete",
      defaultMessage: "Delete"
    }
  },
  label: {
    name: {
      id: "UserManagement.Label.Name",
      defaultMessage: "Name"
    },
    caurl: {
      id: "UserManagement.Label.caurl",
      defaultMessage: "CA URL"
    },
    affiliation: {
      id: "UserManagement.Label.affiliation",
      defaultMessage: "Affiliation"
    },
    role: {
      id: "UserManagement.Label.Role",
      defaultMessage: "Role"
    },
    chain: {
      id: "ChannelMgr.form.label.chain",
      defaultMessage: "Chain"
    },
    org: {
      id: "UserManagement.Label.Orgname",
      defaultMessage: "Org Name"
    },
    mspid: {
      id: "UserManagement.Label.mspid",
      defaultMessage: "MSP ID"
    },
    istls: {
      id: "UserManagement.Label.istls",
      defaultMessage: "TLS证书"
    },
    balance: {
      id: "UserManagement.Label.Balance",
      defaultMessage: "Balance"
    },
    operate: {
      id: "UserManagement.Label.Operate",
      defaultMessage: "Operate"
    },
    organization: {
      id: "UserManagement.Label.Organization",
      defaultMessage: "Organization"
    },
    password: {
      id: "UserManagement.Label.Password",
      defaultMessage: "Password"
    },
    active: {
      id: "UserManagement.Label.Active",
      defaultMessage: "Active"
    }
  },
  validate: {
    required: {
      name: {
        id: "UserManagement.Validate.Required.Name",
        defaultMessage: "Please input username"
      },
      caurl: {
        id: "UserManagement.Validate.Required.caurl",
        defaultMessage: "Please input CA URL"
      },
      affiliation: {
        id: "UserManagement.Validate.Required.affiliation",
        defaultMessage: "Please input Affiliation"
      },
      org: {
        id: "UserManagement.Validate.Required.org",
        defaultMessage: "Please input organization name"
      },
      mspid: {
        id: "UserManagement.Validate.Required.mspid",
        defaultMessage: "Please input MSP ID"
      },
      password: {
        id: "UserManagement.Validate.Required.Password",
        defaultMessage: "Please input password"
      },
    },
    nameExists: {
      id: "UserManagement.Validate.NameExists",
      defaultMessage: "{name} already exists."
    }
  },
  confirm: {
    deleteUser: {
      id: "UserManagement.Confirm.DeleteUser",
      defaultMessage: "Do you confirm to delete user {name}"
    }
  }
});

const CreateForm = Form.create()(props => {
  const {
    modalVisible,
    form,
    handleAdd,
    handleEdit,
    userActive,
    method,
    currentUser,
    creating,
    changeUserActive,
    handleModalVisible,
    intl,
    chains,
    subchains,
    onTLSChange,
  } = props;

  const okHandle = () => {
    form.validateFields((err, fieldsValue) => {
      if (err) return;
      if (method === 'create') {
        handleAdd({
          ...fieldsValue,
          active: userActive ? 'true' : 'false',
        });
      } else {
        handleEdit({
          ...fieldsValue,
          id: currentUser.id,
          active: userActive ? 'true' : 'false',
        });
      }
    });
  };
  const cancelHandle = () => {
    handleModalVisible();
  };
  const validateUsername = (rule, value, callback) => {
    if (method === 'create') {
      setTimeout(() => {
        request(`${api.user.search}?${stringify({ username: value })}`).then(response => {
          if (response.user_exists) {
            const values = { name: value };
            callback(intl.formatMessage(messages.validate.nameExists, values));
          }
          callback();
        });
      }, 100);
    } else {
      callback();
    }
  };
  const formItemLayout = {
    labelCol: {
      span: 5,
    },
    wrapperCol: {
      span: 15,
    },
  };

  const chainOptions = chains.map((chainItem, i) =>
    <Option value={chainItem.id}>{chainItem.name}</Option>
  )

  const subchainOptions = subchains.map((chainItem, i) =>
    <Option value={chainItem.id}>{chainItem.name}</Option>
  )

  // const orgOptions = chains[0].orgs.map(orgname =>
  //   <Option value={orgname}>{orgname}</Option>
  // )
  //
  // const suborgOptions = subchains[0].orgs.map(orgname =>
  //   <Option value={orgname}>{orgname}</Option>
  // )

  const roles = [
    {
      value: 1,
      label: 'User',
    },
    {
      value: 2,
      label: 'Peer',
    },
  ];
  const roleOptions = roles.map(role => <Option value={role.value}>{role.label}</Option>);

  return (
    <Modal
      title={
        method === 'create'
          ? intl.formatMessage(messages.title.create)
          : intl.formatMessage(messages.title.edit)
      }
      visible={modalVisible}
      onOk={okHandle}
      onCancel={cancelHandle}
      confirmLoading={creating}
    >



      <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.caurl)}>
        {form.getFieldDecorator('caurl', {
          initialValue: 'https://192.168.1.109:7850',
          rules: [
            { required: true, message: intl.formatMessage(messages.validate.required.name) },
          ],
        })(
          <Input
            placeholder={intl.formatMessage(messages.label.caurl)}
          />
        )}
      </FormItem>

      <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.name)}>
        {form.getFieldDecorator('username', {
          rules: [
            { required: true, message: intl.formatMessage(messages.validate.required.name) },
            // { validator: validateUsername },
          ],
        })(
          <Input
            disabled={method === 'edit'}
            placeholder={intl.formatMessage(messages.label.name)}
          />
        )}
      </FormItem>

      <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.organization)}>
        {form.getFieldDecorator('orgname', {
          initialValue: 'org1.example.com',
          rules: [
            { required: true, message: intl.formatMessage(messages.validate.required.org) },
          ],
        })(
          <Input
            placeholder={intl.formatMessage(messages.label.org)}
          />
        )}
      </FormItem>

      <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.affiliation)}>
        {form.getFieldDecorator('affiliation', {
          initialValue: 'org1',
          rules: [
            { required: true, message: intl.formatMessage(messages.validate.required.affiliation) },
          ],
        })(
          <Input
            placeholder={intl.formatMessage(messages.label.affiliation)}
          />
        )}
      </FormItem>

      <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.mspid)}>
        {form.getFieldDecorator('mspid', {
          initialValue: 'Org1MSP',
          rules: [
            { required: true, message: intl.formatMessage(messages.validate.required.mspid) },
          ],
        })(
          <Input
            placeholder={intl.formatMessage(messages.label.org)}
          />
        )}
      </FormItem>

      <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.istls)}>
        {form.getFieldDecorator('tls', {
        })(
          <Checkbox
            onChange={onTLSChange}
          >
            {intl.formatMessage(messages.label.istls)}
          </Checkbox>
        )}

      </FormItem>


      {/*{chains.length? (*/}
        {/*<FormItem label={intl.formatMessage(messages.label.chain)} hasFeedback {...formItemLayout}>*/}
          {/*{form.getFieldDecorator('chainId', {*/}
            {/*initialValue: chains.length ? chains[0].id : "",*/}
          {/*})(*/}
            {/*<Select placeholder="Select a chain" style={{ width: 120 }} disabled={chains.length ? false : true}>*/}
              {/*{chainOptions}*/}
            {/*</Select>*/}
          {/*)}*/}
        {/*</FormItem>*/}
        {/*): ""*/}
      {/*}*/}
      {/*{chains.length? (*/}
      {/*<FormItem label={intl.formatMessage(messages.label.org)} hasFeedback {...formItemLayout}>*/}
        {/*{form.getFieldDecorator('orgname', {*/}
          {/*initialValue: chains.length ? chains[0].orgs[0] : "",*/}
        {/*})(*/}
          {/*<Select placeholder="Select a org" style={{ width: 120 }} disabled={chains.length ? false : true}>*/}
            {/*{chains[0].orgs.map(orgname =>*/}
              {/*<Option value={orgname}>{orgname}</Option>*/}
            {/*)}*/}
          {/*</Select>*/}
        {/*)}*/}
      {/*</FormItem>*/}
      {/*): ""*/}
      {/*}*/}

      {/*{subchains.length? (*/}
      {/*<FormItem label={intl.formatMessage(messages.label.chain)} hasFeedback {...formItemLayout}>*/}
        {/*{form.getFieldDecorator('subchainId', {*/}
          {/*initialValue: subchains.length ? subchains[0].id : "",*/}
        {/*})(*/}
          {/*<Select placeholder="Select a subchain"  style={{ width: 120 }} disabled={subchains.length ? false : true}>*/}
            {/*{subchainOptions}*/}
          {/*</Select>*/}
        {/*)}*/}
      {/*</FormItem>*/}
      {/*): ""*/}
      {/*}*/}
      {/*{subchains.length? (*/}
      {/*<FormItem label={intl.formatMessage(messages.label.org)} hasFeedback {...formItemLayout}>*/}
        {/*{form.getFieldDecorator('orgname', {*/}
          {/*initialValue: subchains.length ? subchains[0].orgs[0] : "",*/}
        {/*})(*/}
          {/*<Select placeholder="Select a org" style={{ width: 120 }} disabled={subchains.length ? false : true}>*/}
            {/*{subchains[0].orgs.map(orgname =>*/}
              {/*<Option value={orgname}>{orgname}</Option>*/}
            {/*)}*/}
          {/*</Select>*/}
        {/*)}*/}
      {/*</FormItem>*/}
      {/*): ""*/}
      {/*}*/}

      <FormItem {...formItemLayout} label={intl.formatMessage(messages.label.role)}>
        {form.getFieldDecorator('role', {
          initialValue: method === 'edit' ? currentUser.role : roles[0].value,
          rules: [{ required: true, message: 'Please select a role' }],
        })(<Select style={{ width: 120 }} >{roleOptions}</Select>)}
      </FormItem>
    </Modal>
  );
});

@connect(({ user, loading, chain, subChain}) => ({
  user,
  loadingUsers: loading.effects['user/fetch'],
  chain,
  subChain,
}))
class UserManagement extends PureComponent {
  state = {
    modalVisible: false,
    userActive: true,
    creating: false,
    currentUser: {},
    method: 'create',
    currentPageNo: 0,
    currentpageSize: 5,
    istls:false,
  };
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
    this.props.dispatch({
      type: 'user/fetch',
    });
  }
  changeUserActive = checked => {
    this.setState({
      userActive: checked,
    });
  };
  onTLSChange = (e) => {
    this.setState({
      istls: e.target.checked,
    });
  }
  addUser = values => {
    this.setState({
      creating: true,
    });
    const {
      user: {currentUser }
    } = this.props
    const { istls } = this.state;
    this.props.dispatch({
      type: 'user/createUser',
      payload: {
        ...values,
        adminUsername: currentUser.name,
        callback: this.handleModalVisible,
        tls:istls,
      },
    });
    this.setState({
      userActive: true,
      istls:false,
    });
  };
  editUser = values => {
    this.setState({
      creating: true,
    });
    this.props.dispatch({
      type: 'user/updateUser',
      payload: {
        ...values,
        callback: this.handleModalVisible,
      },
    });
    this.setState({
      userActive: true,
    });
  };
  handleModalVisible = visible => {
    this.setState({
      creating: false,
      method: 'create',
      userActive: true,
      modalVisible: !!visible,
      istls:false,
    });
  };
  operateItem = (item, type) => {
    const { dispatch, intl } = this.props;
    const values = { name: item.name };
    switch (type) {
      case 'edit':
        this.setState({
          creating: false,
          modalVisible: true,
          method: 'edit',
          currentUser: item,
          userActive: item.active,
        });
        break;
      case 'downloadsigncert':
        dispatch({
          type: 'user/downloadcert',
          payload: {
            id: item.userId,
            name: item.name,
            role:item.role,
          },
        });

        break;
      case 'downloadsignpub':
        dispatch({
          type: 'user/downloadpub',
          payload: {
            id: item.userId,
            name: item.name,
            role:item.role,
          },
        });

        break;
      case 'delete':
        Modal.confirm({
          title: intl.formatMessage(messages.confirm.deleteUser, values),
          onOk() {
            dispatch({
              type: 'user/deleteUser',
              payload: {
                id: item.userId,
                name: item.name,
                role:item.role,
              },
            });
          },
        });
        break;
      default:
        break;
    }
  };


  handleTableChange = (pagination, filters, sorter) => {
    this.setState({
      currentPageNo: pagination.current,
      currentpageSize:pagination.pageSize,
    });
  }



  render() {
    const { user, loadingUsers, intl } = this.props;
    const {
      chain: { dbChains:thechains }, subChain:{dbChains:subchains}
    } = this.props
    const { modalVisible, userActive, creating, method, currentUser,currentPageNo,currentpageSize } = this.state;
    const { users, pageNo, pageSize, total } = user;
    const roles = ['Admin','User','Peer','TLS'];
    const columns = [
      {
        title: intl.formatMessage(messages.label.name),
        dataIndex: 'name',
      },
      {
        title: intl.formatMessage(messages.label.role),
        dataIndex: 'role',
        render: val => <span>{roles[val]}</span>,
      },
      {
        title: intl.formatMessage(messages.label.mspid),
        dataIndex: 'mspid',
      },
      {
        title: intl.formatMessage(messages.label.organization),
        dataIndex: 'organization',
        // render: val => <span>{val}</span>,
      },
      {
        title: intl.formatMessage(messages.label.operate),
        render: (val, item) => (
          <span>
            <a onClick={() => this.operateItem(item, 'downloadsigncert')}>
            {/*<a href="/images/myw3schoolimage.jpg" download="w3logo">*/}
              <FormattedMessage {...messages.button.downloadsigncert} />
            </a>
            <Divider type="vertical" />
             <a onClick={() => this.operateItem(item, 'downloadsignpub')}>
            {/*<a href="/images/myw3schoolimage.jpg" download="w3logo">*/}
               <FormattedMessage {...messages.button.downloadsignpub} />
            </a>
            <Divider type="vertical" />
            <a style={{ color: 'red' }} onClick={() => this.operateItem(item, 'delete')}>
              <FormattedMessage {...messages.button.delete} />
            </a>
          </span>
        ),
      },
    ];

    const parentMethods = {
      handleModalVisible: this.handleModalVisible,
      changeUserActive: this.changeUserActive,
      userActive,
      creating,
      method,
      currentUser,
      handleAdd: this.addUser,
      handleEdit: this.editUser,
      intl,
      chains: thechains,
      subchains,
      onTLSChange: this.onTLSChange,
    };

    return (
      <PageHeaderLayout>
        <Card bordered={false}>
          <div className={styles.tableList}>
            <div className={styles.tableListOperator}>
              <Button icon="plus" type="primary" onClick={() => this.handleModalVisible(true)}>
                <FormattedMessage {...messages.button.new} />
              </Button>
            </div>
            <Standardtable
              selectedRows={[]}
              loading={loadingUsers}
              data={{
                list: users,
                pagination: {
                  current: currentPageNo,
                  pageSize:currentpageSize,
                  total,
                },
              }}
              columns={columns}
              onChange={this.handleTableChange}
            />
             {modalVisible && <CreateForm {...parentMethods} modalVisible={modalVisible} />}
          </div>
        </Card>
      </PageHeaderLayout>
    );
  }

}

export default injectIntl(UserManagement);
