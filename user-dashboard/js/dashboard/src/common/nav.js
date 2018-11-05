import BasicLayout from '../layouts/BasicLayout';

import Chain from '../routes/Chain'
import NewChain from '../routes/Chain/New'
import Api from '../routes/Api'
import SmartContract from '../routes/SmartContract'
import SubChain from '../routes/SubChain'
import NewSubChain from '../routes/SubChain/New'
import ChannelMgr from '../routes/ChannelMgr'
import ChannelManage from '../routes/ChannelMgr/Manage'
import ChannelExplorer from '../routes/ChannelMgr/Explorer'
// import SubChannelMgr from '../routes/SubChannelMgr'
import UserManagement from '../routes/UserManagement'

const data = [
  {
    component: BasicLayout,
    layout: 'BasicLayout',
    name: 'Home', // for breadcrumb
    path: '',
    children: [
      {
        name: 'Chain',
        messageId: "Chain",
        icon: 'link',
        path: 'chain',
        component: Chain,
      },
      {
        messageId: "ChainNew",
        path: 'chain/new',
        component: NewChain,
      },
      // {
      //   name: 'Sub Chain',
      //   messageId: "SubChain",
      //   icon: 'copy',
      //   path: 'subchain',
      //   component: SubChain,
      // },
      // {
      //   messageId: 'SubChainNew',
      //   path: 'subchain/new',
      //   component: NewSubChain,
      // },
      { // ljs
        name: 'Channel Management',
        messageId: "ChannelMgr",
        icon: 'api',
        path: 'channelmgr',
        component: ChannelMgr,
      },
      {
        messageId: "ChannelMgrExplorer",
        path: 'channelmgr/explorer',
        component: ChannelExplorer,
      },
      {
        messageId: "ChannelMgrManage",
        path: 'channelmgr/manage',
        component: ChannelManage,
      },
      // { // ljs
      //   name: 'Sub Channel Management',
      //   messageId: "SubChannelMgr",
      //   icon: 'api',
      //   path: 'subchannelmgr',
      //   component: SubChannelMgr,
      // },
      {
        name: 'Smart Contract',
        messageId: "SmartContract",
        icon: 'copy',
        path: 'smart_contract',
        component: SmartContract,
      },
      {
        name: 'API',
        messageId: "API",
        icon: 'api',
        path: 'api',
        component: Api,
      },
      {
        name: 'User Management',
        messageId: 'UserManagement',
        icon: 'api',
        path: 'user',
        component: UserManagement,
      },
    ],
  }
];

export function getNavData() {
  return data;
}

export default data;
