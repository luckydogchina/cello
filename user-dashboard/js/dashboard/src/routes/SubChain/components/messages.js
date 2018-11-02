/*
 SPDX-License-Identifier: Apache-2.0
 */
import { defineMessages } from 'react-intl';

const messages = defineMessages({
  topology: {
    title: {
      id: "Chain.Index.topologicalGraph.Title",
      defaultMessage: "Network topology diagram"
    },
  },
  blockChain:{
    title:{
      id:"Chain.Index.BlockChain.Title",
      defaultMessage:"New block"
    },
    transactions:{
      id:"Chain.Index.BlockChain.transactions",
      defaultMessage:"transactions"
    },
    generationTime:{
      id:"Chain.Index.BlockChain.generationTime",
      defaultMessage:"Generation Time"
    }
  },
  recentTransactions:{
    title:{
      id:"Chain.Index.recentTransactions.title",
      defaultMessage:"Recent transactions"
    },
    transactionContent:{
      id:"Chain.Index.recentTransactions.transactionContent",
      defaultMessage:"Transaction content"
    },
    tradingTime:{
      id:"Chain.Index.recentTransactions.tradingTime",
      defaultMessage:"Trading time"
    }
  },
  smartContract:{
    title:{
      id:"Chain.Index.smartContract.title",
      defaultMessage:"Smart contract"
    },
    count:{
      id:"Chain.Index.smartContract.count",
      defaultMessage:"Number of smart contracts"
    },
    deployment:{
      id:"Chain.Index.smartContract.deployment",
      defaultMessage:"No intelligent deployment contracts"
    },
    goDdeployment:{
      id:"Chain.Index.smartContract.goDdeployment",
      defaultMessage:"Go to the deployment contract"
    }
  },
  token:{
    name:{
      id:"Chain.Index.token.name",
      defaultMessage:"Name"
    },
    total:{
      id:"Chain.Index.token.total",
      defaultMessage:"Total"
    },
    decimal:{
      id:"Chain.Index.token.decimal",
      defaultMessage:"Decimal"
    },
    firstTime:{
      id:"Chain.Index.token.firstTime",
      defaultMessage:"First New Time"
    }
  },
  orgtable:{
    title:{
      id:"Chain.Index.orgtable.title",
      defaultMessage:"Organization Table"
    },
    organizationname:{
      id:"Chain.Index.orgtable.organizationname",
      defaultMessage:"Organization Name"
    },
    mspid:{
      id:"Chain.Index.orgtable.mspid",
      defaultMessage:"MSP ID"
    },
    caurl:{
      id:"Chain.Index.orgtable.caurl",
      defaultMessage:"CA URL"
    },
    peernumber:{
      id:"Chain.Index.orgtable.peernumber",
      defaultMessage:"peer number"
    },
  },
  peertable:{
    title:{
      id:"Chain.Index.peertable.title",
      defaultMessage:"Peer Table"
    },
    peername:{
      id:"Chain.Index.peertable.peername",
      defaultMessage:"Peer Name"
    },
    orgnization:{
      id:"Chain.Index.peertable.orgnization",
      defaultMessage:"Orgnization"
    },
    requesturl:{
      id:"Chain.Index.peertable.requesturl",
      defaultMessage:"Request URL"
    },
    eventurl:{
      id:"Chain.Index.peertable.eventurl",
      defaultMessage:"Event URL"
    },
  },
  ordertable:{
    title:{
      id:"Chain.Index.ordertable.title",
      defaultMessage:"Order Table"
    },
    ordername:{
      id:"Chain.Index.ordertable.ordername",
      defaultMessage:"Order Name"
    },
    orderurl:{
      id:"Chain.Index.ordertable.orderurl",
      defaultMessage:"Order URL"
    }
  },
});

export default messages
