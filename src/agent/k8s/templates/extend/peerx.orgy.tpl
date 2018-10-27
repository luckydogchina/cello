apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace: {{clusterName}}
  name: {{peerId}}-{{organizationId}}
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      creationTimestamp: null
      labels:
       app: hyperledger
       role: peer
       peer-id: {{peerId}}
       org: {{organizationId}}
    spec:
      containers:
      - name: couchdb
        image: hyperledger/fabric-couchdb:x86_64-0.4.6
        ports:
         - containerPort: 5984
      - name: {{peerId}}-{{organizationId}}
        image: hyperledger/fabric-peer:amd64-1.2.0
        env:
        - name: CORE_PEER_ADDRESSAUTODETECT
          value: "true"
        - name: CORE_LEDGER_STATE_STATEDATABASE
          value: "CouchDB"
        - name: CORE_LEDGER_STATE_COUCHDBCONFIG_COUCHDBADDRESS
          value: "localhost:5984"
        - name: CORE_VM_ENDPOINT
          value: "unix:///host/var/run/docker.sock"
        - name: CORE_VM_DOCKER_HOSTCONFIG_NETWORKMODE
          value: "bridge"
        #- name: CORE_VM_DOCKER_HOSTCONFIG_DNS
        #  value: "10.100.200.10"
        - name: CORE_LOGGING_LEVEL
          value: "DEBUG"
        - name: CORE_PEER_TLS_CERT_FILE
          value: "/etc/hyperledger/fabric/tls/server.crt"
        - name: CORE_PEER_TLS_KEY_FILE
          value: "/etc/hyperledger/fabric/tls/server.key"
        - name: CORE_PEER_TLS_ROOTCERT_FILE
          value: "/etc/hyperledger/fabric/tls/ca.crt"
        - name: CORE_LOGGING_LEVEL
          value: "DEBUG"
        - name: CORE_PEER_TLS_ENABLED
          value: "true"
        - name: CORE_PEER_GOSSIP_USELEADERELECTION
          value: "true"
        - name: CORE_PEER_GOSSIP_ORGLEADER
          value: "false"
        - name: CORE_PEER_PROFILE_ENABLED
          value: "false"
        - name: CORE_PEER_ID
          value: {{peerId}}-{{organizationId}}
        - name: CORE_PEER_ADDRESS
          value: {{peerId}}-{{organizationId}}:7051
       # - name: CORE_PEER_CHAINCODELISTENADDRESS
       #   value: {{peerId}}-{{organizationId}}:7052
        - name: CORE_PEER_LOCALMSPID
          value: {{mspId}}
        - name: CORE_PEER_GOSSIP_EXTERNALENDPOINT
          value: {{peerId}}-{{organizationId}}:7051
        - name: CORE_CHAINCODE_PEERADDRESS
          value: {{peerId}}-{{organizationId}}:7051
        - name: CORE_CHAINCODE_STARTUPTIMEOUT
          value: "300s"
        - name: CORE_CHAINCODE_LOGGING_LEVEL
          value: "DEBUG"
        workingDir: /opt/gopath/src/github.com/hyperledger/fabric/peer
        ports:
         - containerPort: 7051
         - containerPort: 7052
         - containerPort: 7053
        command: ["/bin/bash", "-c", "--"]
        args: ["sleep 5; peer node start"]
        volumeMounts:
         - mountPath: /etc/hyperledger/fabric/msp
           name: certificate
           subPath: peers/{{peerId}}.{{domain}}/msp
         - mountPath: /etc/hyperledger/fabric/tls
           name: certificate
           subPath: peers/{{peerId}}.{{domain}}/tls
         - mountPath: /var/hyperledger/production
           name: certificate
           subPath: peers/{{peerId}}.{{organizationId}}/production
         - mountPath: /host/var/run
           name: run
      volumes:
       - name: certificate
         persistentVolumeClaim:
             claimName: {{clusterName}}-{{organizationId}}-pvc
       - name: run
         hostPath:
           path: /var/run

---
apiVersion: v1
kind: Service
metadata:
   namespace: {{clusterName}}
   name: {{peerId}}-{{organizationId}}
spec:
 selector:
   app: hyperledger
   role: peer
   peer-id: {{peerId}}
   org: {{organizationId}}
 type: NodePort
 ports:
   - name: external-listen-endpoint
     protocol: TCP
     port: 7051
     targetPort: 7051
     nodePort: {{nodePort}}

   - name: chaincode-listen
     protocol: TCP
     port: 7052
     targetPort: 7052
     nodePort: {{chaincodePort}}

   - name: listen
     protocol: TCP
     port: 7053
     targetPort: 7053
     nodePort: {{eventPort}}

---
