
/* Copyright IBM Corp, All Rights Reserved.

SPDX-License-Identifier: Apache-2.0
 */

/**
 * Created by lixuc on 2017/5/2.
 */
module.exports = {
    cookieName: "BlockChainAccount",

    // SV_BaseURL: "http://localhost:8090/api/",
    // RESTful_Server: "localhost:8090",
    // RESTful_BaseURL: "/api/",
    // PoolManager_Server: "localhost",
    // PoolManager_BaseURL: "/v2/",
    // Log_Server: process.env.Log_Server || "localhost:8090",
    // Log_BaseURL: "/v1/log",

    SV_BaseURL: "http://192.168.1.185:8081/api/",
    RESTful_Server: "192.168.1.185:8081",
    RESTful_K8sServer: "192.168.1.185:9906",
    RESTful_BaseURL: "/api/",
    PoolManager_Server: "192.168.1.185",
    PoolManager_BaseURL: "/v2/",
    Log_Server: process.env.Log_Server || "192.168.1.185:8081",
    Log_BaseURL: "/v1/log",

    // SV_BaseURL: process.env.SV_BaseURL || "https://ptopenlab.com/cloudlab/api/",
    // RESTful_Server: process.env.RESTful_Server || "9.186.91.4:8108",
    // RESTful_BaseURL: process.env.RESTful_BaseURL || "/restful/api/v2/",
    // PoolManager_Server: process.env.PoolManager_Server || "9.186.91.26",
    // PoolManager_BaseURL: "/v2/",
    // Log_Server: process.env.Log_Server || "9.186.91.29:8080",
    // Log_BaseURL: "/v1/log",


    mongodb: {
        ip: "localhost",
        port: 27017,
        name: "bc_dashboard",
        auth: false,
        username: "admin",
        password: "passw0rd"
    },
    topology: {
        vp0: [200, 130],
        vp1: [300, -130],
        vp2: [-300, -130],
        vp3: [-200, 130],
        vp4: [350, 30],
        vp5: [-350, 30],
        vp6: [50, -250],
        vp7: [-50, -250]
    }
};

// module.exports = {
//     cookieName: "BlockChainAccount",
//
//     SV_BaseURL: "http://192.168.1.185:8081/api/",
//     RESTful_Server: "192.168.1.185:8081",
//     RESTful_BaseURL: "/api/",
//     PoolManager_Server: "192.168.1.185",
//     PoolManager_BaseURL: "/v2/",
//     Log_Server: process.env.Log_Server || "192.168.1.185:8081",
//     Log_BaseURL: "/v1/log",
//
//     // SV_BaseURL: process.env.SV_BaseURL || "https://ptopenlab.com/cloudlab/api/",
//     // RESTful_Server: process.env.RESTful_Server || "9.186.91.4:8108",
//     // RESTful_BaseURL: process.env.RESTful_BaseURL || "/restful/api/v2/",
//     // PoolManager_Server: process.env.PoolManager_Server || "9.186.91.26",
//     // PoolManager_BaseURL: "/v2/",
//     // Log_Server: process.env.Log_Server || "9.186.91.29:8080",
//     // Log_BaseURL: "/v1/log",
//
//
//     mongodb: {
//         ip: "localhost",
//         port: 27017,
//         name: "bc_dashboard",
//         auth: false,
//         username: "admin",
//         password: "passw0rd"
//     },
//     topology: {
//         vp0: [200, 130],
//         vp1: [300, -130],
//         vp2: [-300, -130],
//         vp3: [-200, 130],
//         vp4: [350, 30],
//         vp5: [-350, 30],
//         vp6: [50, -250],
//         vp7: [-50, -250]
//     }
// };