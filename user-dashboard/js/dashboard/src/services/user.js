/*
 SPDX-License-Identifier: Apache-2.0
*/
import { stringify } from 'qs';
import request from '../utils/request';
import config from '../utils/config';

const { api } = config
const { user } = api

export async function query() {
  return request(user.list);
}

export async function queryCurrent() {
  return request(`${user.currentuser}/${window.username}`);
}

export async function createUser(params) {
  return request(user.create, {
    method: 'POST',
    body: params,
  });
}

export async function deleteUser(params) {
  return request(user.delete, {
    method: 'POST',
    body: params,
  });
}

export async function downloadcert(params) {
  return request(user.downloadcert, {
    method: 'POST',
    body: params,
  });
}
export async function downloadpub(params) {
  return request(user.downloadpub, {
    method: 'POST',
    body: params,
  });
}

export async function searchUser(params) {
  return request(`${user.search}?${stringify(params)}`);
}

export async function updateUser(params) {
  return request(`${user.update}/${params.id}`, {
    method: 'PUT',
    body: params,
  });
}
