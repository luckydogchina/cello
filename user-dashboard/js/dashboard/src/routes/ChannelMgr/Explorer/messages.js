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
  title: {
    explorer: {
      id: "Path.ChannelMgrExplorer",
      defaultMessage: "Channel Explorer"
    }
  },
  modal: {
    confirm: {
      release: {
        title: {
          id: "Chain.Index.Modal.Confirm.Title.release",
          defaultMessage: "Do you want to release chain {name}?"
        }
      }
    }
  },
  button: {
    confirm: {
    	id: "Button.Confirm",
    	defaultMessage: "Confirm"
    },
    cancel: {
    	id: "Button.Cancel",
    	defaultMessage: "Cancel"
    }
  }
});

export default messages
