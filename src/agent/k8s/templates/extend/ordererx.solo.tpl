---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace: {{clusterName}}
  name: {{ordererId}}-{{organizationId}}
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      labels:
        app: hyperledger
        role: orderer
        org: {{organizationId}}
        orderer-id: {{ordererId}}
    spec:
      containers:
      - name: {{ordererId}}-{{organizationId}}
        image: hyperledger/fabric-orderer:amd64-1.2.0
        env:
        - name: ORDERER_GENERAL_LOGLEVEL
          value: debug
        - name: ORDERER_GENERAL_LISTENADDRESS
          value: 0.0.0.0
        - name: ORDERER_GENERAL_GENESISMETHOD
          value: file
        - name: ORDERER_GENERAL_GENESISFILE
          value: /var/hyperledger/orderer/orderer.genesis.block
        - name: ORDERER_GENERAL_LOCALMSPID
          value: OrdererMSP
        - name: ORDERER_GENERAL_LOCALMSPDIR
          value: /var/hyperledger/orderer/msp
        - name: ORDERER_GENERAL_TLS_ENABLED
          value: "true"
        - name: ORDERER_GENERAL_TLS_PRIVATEKEY
          value: /var/hyperledger/orderer/tls/server.key
        - name: ORDERER_GENERAL_TLS_CERTIFICATE
          value: /var/hyperledger/orderer/tls/server.crt
        - name: ORDERER_GENERAL_TLS_ROOTCAS
          value: '[/var/hyperledger/orderer/tls/ca.crt]'
        workingDir: /opt/gopath/src/github.com/hyperledger/fabric/peer
        ports:
         - containerPort: 7050
        command: ["orderer"]
        volumeMounts:
         - mountPath: /var/hyperledger/orderer/msp
           name: certificate
           subPath: orderers/{{ordererId}}.{{domain}}/msp
         - mountPath: /var/hyperledger/orderer/tls
           name: certificate
           subPath: orderers/{{ordererId}}.{{domain}}/tls
         - mountPath: /var/hyperledger/orderer/orderer.genesis.block
           name: certificate
           subPath: genesis.block
         - mountPath: /var/hyperledger/production
           name: certificate
           subPath: orderers/{{ordererId}}.{{domain}}/production
      volumes:
       - name: certificate
         persistentVolumeClaim:
             claimName: {{clusterName}}-{{organizationId}}-pvc
         #persistentVolumeClaim:
         #  claimName: nfs


---
apiVersion: v1
kind: Service
metadata:
  name: orderer0
  namespace: {{clusterName}}
spec:
 selector:
   app: hyperledger
   role: orderer
   orderer-id: orderer0
   org: ordererorg
 type: NodePort
 ports:
   - name: listen-endpoint
     protocol: TCP
     port: 7050
     targetPort: 7050
     nodePort: {{nodePort}}
