/*
 SPDX-License-Identifier: Apache-2.0
*/
import { defineMessages } from 'react-intl';

const messages = defineMessages({
  pageHeader: {
    content: {
      id: "API.pageHeader.content",
      defaultMessage: "Contract call"
    }
  },
  button: {
    newParam: {
      id: "API.button.newParam",
      defaultMessage: "New Parameter"
    },
    call: {
      id: "API.button.call",
      defaultMessage: "Call"
    }
  },
  form: {
    label: {
      smartContract: {
        id: "API.form.label.smartContract",
        defaultMessage: "Smart Contract"
      },
      function: {
        id: "API.form.label.function",
        defaultMessage: "Function Name"
      },
      parameter: {
        id: "API.form.label.parameter",
        defaultMessage: "Parameter"
      },
      method: {
        id: "API.form.label.method",
        defaultMessage: "Method"
      },
      chain:{
        id: "ChannelMgr.form.label.signorgs",
        defaultMessage: "Organization"
      },
      signorg:{
        id: "ChannelMgr.form.label.signorgs",
        defaultMessage: "Organization"
      },
      channelName: {
        id: "ChannelMgr.form.label.channelName",
        defaultMessage: "Channel Name"
      },
      endorsers:{
        id: "API.form.label.endorsers",
        defaultMessage: "Endorsers"
      },
      eventhubs:{
        id: "API.form.label.eventhubs",
        defaultMessage: "EventHubs"
      },
    },
    validate: {
      required: {
        chainCode: {
          id: "API.form.validate.required.chainCode",
          defaultMessage: "Must select a smart contract"
        },
        parameter: {
          id: "API.form.validate.required.parameter",
          defaultMessage: "Must input parameter"
        },
        function: {
          id: "API.form.validate.required.function",
          defaultMessage: "Must input function name"
        },
        method: {
          id: "API.form.validate.required.method",
          defaultMessage: "Must select a method"
        },
        signorg: {
          id: "ChannelMgr.form.validate.required.orgs",
          defaultMessage: "Must select a org"
        },
        channelName: {
          id: "ChannelMgr.form.validate.required.channelName",
          defaultMessage: "Must input channel name"
        },
        endorsers: {
          id: "API.form.validate.required.endorsers",
          defaultMessage: "Must select a endorser"
        },
        chain: {
          id: "ChannelMgr.form.validate.required.chain",
          defaultMessage: "Must select a chain"
        },
      }
    },
    options: {
      method: {
        invoke: {
          id: "API.form.options.method.invoke",
          defaultMessage: "Invoke"
        },
        query: {
          id: "API.form.options.method.query",
          defaultMessage: "Query"
        }
      }
    },
    info: {
      parameter: {
        id: "API.form.info.parameter",
        defaultMessage: "Use , to separate parameters"
      }
    }
  }
});

export default messages
