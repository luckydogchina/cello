/*
 SPDX-License-Identifier: Apache-2.0
*/
import { message } from 'antd';
import { IntlProvider, defineMessages } from 'react-intl';
import {
  query as queryUsers,
  queryCurrent,
  createUser,
  deleteUser,
  downloadcert,
  downloadpub,
  updateUser,
} from '../services/user';
// import { getLocale } from '../utils/utils';

const currentLocale = window.appLocale;
const intlProvider = new IntlProvider(
  { locale: currentLocale.locale, messages: currentLocale.messages },
  {}
);
const { intl } = intlProvider.getChildContext();

const messages = defineMessages({
  operate: {
    success: {
      create: {
        id: "UserManagement.Messages.Operate.Success.Create",
        defaultMessage: "创建用户 {name} 成功"
      },
      edit: {
        id: "UserManagement.Messages.Operate.Success.Update",
        defaultMessage: "更新用户 {name} 成功"
      },
      delete: {
        id: "UserManagement.Messages.Operate.Success.Delete",
        defaultMessage: "删除用户 {name} 成功"
      }
    },
  },
});

export default {
  namespace: 'user',

  state: {
    users: [],
    total: 0,
    pageNo: 1,
    pageSize: 10,
    currentUser: {},
  },

  effects: {
    *fetch(_, { call, put }) {
      const response = yield call(queryUsers);
      const { pageNo, pageSize, totalCount, result } = response.users;
      yield put({
        type: 'save',
        payload: {
          pageNo,
          pageSize,
          total: totalCount,
          users: result,
        },
      });
    },
    *fetchCurrent(_, { call, put }) {
      const response = yield call(queryCurrent);
      yield put({
        type: 'saveCurrentUser',
        payload: response.user,
      });
    },
    *createUser({ payload }, { call, put }) {
      const response = yield call(createUser, payload);
      if (response.status === 'OK') {
        const values = { name: payload.username };
        message.success(intl.formatMessage(messages.operate.success.create, values));
      } else {
        message.error(response.err)
      }
      yield call(payload.callback);
      yield put({
        type: 'fetch',
      });
    },
    *deleteUser({ payload }, { call, put }) {
      const response = yield call(deleteUser, payload);
      if (response.status === 'OK') {
        const values = { name: payload.name };
        message.success(intl.formatMessage(messages.operate.success.delete, values));
      }
    },
    *downloadcert({ payload }, { call, put }) {
      const response = yield call(downloadcert, payload);

      const fileName=response.filename;
      // yield put({
      //   type: 'saveFile',
      //   payload: {blob: data.data, fileName: realFileName},
      // });

      // var repstr = JSON.stringify(response);
      var repstr = response.filedata;
      var blob = new Blob([repstr]);

      if (window.navigator.msSaveOrOpenBlob) {
        navigator.msSaveBlob(blob, fileName);
      } else {
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;

        //此写法兼容可火狐浏览器
        document.body.appendChild(link);

        var evt = document.createEvent("MouseEvents");
        evt.initEvent("click", false, false);
        link.dispatchEvent(evt);

        document.body.removeChild(link);
      }

    },

    *downloadpub({ payload }, { call, put }) {
      const response = yield call(downloadpub, payload);

      const fileName=response.filename;
      // yield put({
      //   type: 'saveFile',
      //   payload: {blob: data.data, fileName: realFileName},
      // });

      // var repstr = JSON.stringify(response);
      var repstr = response.filedata;
      var blob = new Blob([repstr]);

      if (window.navigator.msSaveOrOpenBlob) {
        navigator.msSaveBlob(blob, fileName);
      } else {
        var link = document.createElement('a');
        link.href = window.URL.createObjectURL(blob);
        link.download = fileName;

        //此写法兼容可火狐浏览器
        document.body.appendChild(link);

        var evt = document.createEvent("MouseEvents");
        evt.initEvent("click", false, false);
        link.dispatchEvent(evt);

        document.body.removeChild(link);
      }

    },

    *updateUser({ payload }, { call, put }) {
      const response = yield call(updateUser, payload);
      if (response.status === 'OK') {
        const values = { name: payload.username };
        message.success(intl.formatMessage(messages.operate.success.edit, values));
      }
      yield call(payload.callback);
      yield put({
        type: 'fetch',
      });
    },
  },

  reducers: {
    save(state, action) {
      const { users, pageNo, pageSize, total } = action.payload;
      return {
        ...state,
        currentPageNo:pageNo,
        users,
        pageNo,
        pageSize,
        total,
      };
    },
    saveCurrentUser(state, action) {
      return {
        ...state,
        currentUser: action.payload,
      };
    },

    changeNotifyCount(state, action) {
      return {
        ...state,
        currentUser: {
          ...state.currentUser,
          notifyCount: action.payload,
        },
      };
    },
  },

  subscriptions: {
    setup({ history }) {
    },
  },
};
