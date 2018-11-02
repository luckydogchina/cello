/*
 SPDX-License-Identifier: Apache-2.0
*/
import { defineMessages } from 'react-intl';


const messages = defineMessages({
  pageHeader: {
    content: {
      id: "ChannelMgr.pageHeader.content",
      defaultMessage: "Channel Manager"
    }
  },
  button: {
    create: {
      id: "ChannelMgr.button.create",
      defaultMessage: "Create"
    },
    update: {
      id: "ChannelMgr.button.update",
      defaultMessage: "Update"
    },
    join: {
      id: "ChannelMgr.button.join",
      defaultMessage: "Join"
    },
    genchannelconfig: {
      id: "ChannelMgr.button.genchannelconfig",
      defaultMessage: "Generate"
    },
    genupdateconfig: {
      id: "ChannelMgr.button.genupdateconfig",
      defaultMessage: "Generate"
    },
    downloadchanneltxfile: {
      id: "ChannelMgr.button.downloadchanneltxfile",
      defaultMessage: "Download tx file"
    },
    downloadchannelconfigfile: {
      id: "ChannelMgr.button.downloadchannelconfigfile",
      defaultMessage: "Download channel config file"
    }
  },
  form: {
    label: {
      chainType: {
        id: "ChannelMgr.form.label.chainType",
        defaultMessage: "Chain Construct Type"
      },
      chain: {
        id: "ChannelMgr.form.label.chain",
        defaultMessage: "Chain"
      },
      orgs: {
        id: "ChannelMgr.form.label.orgs",
        defaultMessage: "Organization"
      },
      signorgs: {
        id: "ChannelMgr.form.label.signorgs",
        defaultMessage: "Organization"
      },
      channelName: {
        id: "ChannelMgr.form.label.channelName",
        defaultMessage: "Channel Name"
      },
      launchpeer: {
        id: "API.form.label.eventhubs",
        defaultMessage: "Launch Peer"
      },
      configtxlatorurl: {
        id: "ChannelMgr.form.label.configtxlatorurl",
        defaultMessage: "configtxlator URL"
      },
      channelconfig: {
        id: "ChannelMgr.form.label.channelconfig",
        defaultMessage: "Channel config file"
      },
      channeltx: {
        id: "ChannelMgr.form.label.channeltx",
        defaultMessage: "Channel tx file"
      },
      originalchannelconfig: {
        id: "ChannelMgr.form.label.originalchannelconfig",
        defaultMessage: "Original Channel config file"
      },
      updatedchannelconfig: {
        id: "ChannelMgr.form.label.updatedchannelconfig",
        defaultMessage: "Updated Channel config file"
      },

      // parameter: {
      //   id: "API.form.label.parameter",
      //   id: "API.form.label.parameter",
      //   defaultMessage: "Parameter"
      // },
      // method: {
      //   id: "API.form.label.method",
      //   defaultMessage: "Method"
      // }
    },
    validate: {
      required: {
        chain: {
          id: "ChannelMgr.form.validate.required.chain",
          defaultMessage: "Must select a chain"
        },
        orgs: {
          id: "ChannelMgr.form.validate.required.orgs",
          defaultMessage: "Must select a org"
        },
        channelName: {
          id: "ChannelMgr.form.validate.required.channelName",
          defaultMessage: "Must input channel name"
        },
        configtxlatorurl: {
          id: "ChannelMgr.form.validate.required.configtxlatorurl",
          defaultMessage: "Must input configtxlator URL"
        },
      }
    }
  },
  title: {
    explorer: {
      id: "ChannelMgr.explorer.Title",
      defaultMessage: "You can BROWSE the channel"
    },
    manage: {
      id: "ChannelMgr.manage.Title",
      defaultMessage: "You can CREATE or MODIFY channel"
    },
  },
  button: {
    explorer: {
      id: "ChannelMgr.explorer.Button",
      defaultMessage: "Browse Now"
    },
    manage: {
      id: "ChannelMgr.manage.Button",
      defaultMessage: "Oprate Now"
    },
  },
});

export default messages
