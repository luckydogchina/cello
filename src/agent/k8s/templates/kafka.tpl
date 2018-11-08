---
apiVersion: v1
kind: PersistentVolume
metadata:
    name: {{clusterName}}-kafka-pv
spec:
    capacity:
       storage: 500Mi
    accessModes:
       - ReadWriteMany
    claimRef:
      namespace: {{clusterName}}
      name: {{clusterName}}-kafka-pvc
    nfs:
      path: /{{clusterName}}/
      server: {{nfsServer}} # change to your nfs server ip here.
---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
    namespace: {{clusterName}}
    name: {{clusterName}}-kafka-pvc
spec:
   accessModes:
     - ReadWriteMany
   resources:
      requests:
        storage: 10Mi
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace: {{clusterName}}
  name: kafka0
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      labels:
        app: hyperledger
        role: kafka
        org: kafkacluster
        kafka-id: kafka0
    spec:
      containers:
      - name: kafka0
        image: hyperledger/fabric-kafka:amd64-0.4.10
        env:
        - name: KAFKA_MESSAGE_MAX_BYTES
          value: "1048576"
        - name: KAFKA_REPLICA_FETCH_MAX_BYTES
          value: "1048576"
        - name: KAFKA_UNCLEAN_LEADER_ELECTION_ENABLE
          value: "false"
        - name: KAFKA_BROKER_ID
          value: "0"
        - name: KAFKA_MIN_INSYNC_REPLICAS
          value: "2"
        - name: KAFKA_DEFAULT_REPLICATION_FACTOR
          value: "3"
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper0:2181,zookeeper1:2181,zookeeper2:2181"
        - name: KAFKA_ZOOKEEPER_CONNECTION_TIMEOUT_MS
          value: "60000"
        - name: KAFKA_ZOOKEEPER_SESSION_TIMEOUT_MS
          value: "36000"
        - name: KAFKA_ADVERTISED_HOST_NAME
          value: "kafka0"
        - name: KAFKA_LOG_DIRS
          value: "/var/lib/kafka/data"
        volumeMounts:
        - mountPath: /var/lib/kafka/data
          name: kafka
          subPath: kafka0/data
        - mountPath: /opt/kafka/logs
          name: kafka
          subPath: kafka0/logs
        ports:
         - containerPort: 9092
      volumes:
        - name: kafka
          persistentVolumeClaim:
              claimName: {{clusterName}}-kafka-pvc

---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace:  {{clusterName}}
  name: kafka1
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      labels:
        app: hyperledger
        role: kafka
        org: kafkacluster
        kafka-id: kafka1
    spec:
      containers:
      - name: kafka1
        image: hyperledger/fabric-kafka:amd64-0.4.10
        env:
        - name: KAFKA_MESSAGE_MAX_BYTES
          value: "1048576"
        - name: KAFKA_REPLICA_FETCH_MAX_BYTES
          value: "1048576"
        - name: KAFKA_UNCLEAN_LEADER_ELECTION_ENABLE
          value: "false"
        - name: KAFKA_BROKER_ID
          value: "1"
        - name: KAFKA_MIN_INSYNC_REPLICAS
          value: "2"
        - name: KAFKA_DEFAULT_REPLICATION_FACTOR
          value: "3"
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper0:2181,zookeeper1:2181,zookeeper2:2181"
        - name: KAFKA_ZOOKEEPER_CONNECTION_TIMEOUT_MS
          value: "36000"
        - name: KAFKA_ZOOKEEPER_SESSION_TIMEOUT_MS
          value: "36000"
        - name: KAFKA_ADVERTISED_HOST_NAME
          value: "kafka1"
        - name: KAFKA_LOG_DIRS
          value: "/var/lib/kafka/data"
        volumeMounts:
        - mountPath: /var/lib/kafka/data
          name: kafka
          subPath: kafka1/data
        - mountPath: /opt/kafka/logs
          name: kafka
          subPath: kafka1/logs
        ports:
         - containerPort: 9092
      volumes:
        - name: kafka
          persistentVolumeClaim:
              claimName: {{clusterName}}-kafka-pvc

---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace:  {{clusterName}}
  name: kafka2
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      labels:
        app: hyperledger
        role: kafka
        org: kafkacluster
        kafka-id: kafka2
    spec:
      containers:
      - name: kafka2
        image: hyperledger/fabric-kafka:amd64-0.4.10
        env:
        - name: KAFKA_MESSAGE_MAX_BYTES
          value: "1048576"
        - name: KAFKA_REPLICA_FETCH_MAX_BYTES
          value: "1048576"
        - name: KAFKA_UNCLEAN_LEADER_ELECTION_ENABLE
          value: "false"
        - name: KAFKA_BROKER_ID
          value: "2"
        - name: KAFKA_MIN_INSYNC_REPLICAS
          value: "2"
        - name: KAFKA_DEFAULT_REPLICATION_FACTOR
          value: "3"
        - name: KAFKA_ZOOKEEPER_CONNECT
          value: "zookeeper0:2181,zookeeper1:2181,zookeeper2:2181"
        - name: KAFKA_ZOOKEEPER_CONNECTION_TIMEOUT_MS
          value: "36000"
        - name: KAFKA_ZOOKEEPER_SESSION_TIMEOUT_MS
          value: "36000"
        - name: KAFKA_ADVERTISED_HOST_NAME
          value: "kafka2"
        - name: KAFKA_LOG_DIRS
          value: "/var/lib/kafka/data"
        volumeMounts:
        - mountPath: /var/lib/kafka/data
          name: kafka
          subPath: kafka2/data
        - mountPath: /opt/kafka/logs
          name: kafka
          subPath: kafka2/logs
        ports:
         - containerPort: 9092
      volumes:
        - name: kafka
          persistentVolumeClaim:
              claimName: {{clusterName}}-kafka-pvc
---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace:  {{clusterName}}
  name: zookeeper0
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      labels:
        app: hyperledger
        role: zookeeper
        org: kafkacluster
        zookeeper-id: zookeeper0
    spec:
      containers:
      - name: zookeeper0
        image: hyperledger/fabric-zookeeper:amd64-0.4.10
        env:
         - name: ZOO_MY_ID
           value: "1"
         - name: ZOO_SERVERS
           value: "server.1=0.0.0.0:2888:3888 server.2=zookeeper1:2888:3888 server.3=zookeeper2:2888:3888"
         - name: ZOO_TICK_TIME
           value: "6000"
        ports:
         - containerPort: 2181
         - containerPort: 2888
         - containerPort: 3888
        volumeMounts:
        - mountPath: /datalog
          name: kafka
          subPath: zookeeper0/datalog
        - mountPath: /data
          name: kafka
          subPath: zookeeper0/data
      volumes:
        - name: kafka
          persistentVolumeClaim:
              claimName: {{clusterName}}-kafka-pvc

---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace: {{clusterName}}
  name: zookeeper1
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      labels:
        app: hyperledger
        role: zookeeper
        org: kafkacluster
        zookeeper-id: zookeeper1
    spec:
      containers:
      - name: zookeeper1
        image: hyperledger/fabric-zookeeper:amd64-0.4.10
        env:
         - name: ZOO_MY_ID
           value: "2"
         - name: ZOO_SERVERS
           value: "server.1=zookeeper0:2888:3888 server.2=0.0.0.0:2888:3888 server.3=zookeeper2:2888:3888"
         - name: ZOO_TICK_TIME
           value: "6000"
        ports:
         - containerPort: 2181
         - containerPort: 2888
         - containerPort: 3888
        volumeMounts:
        - mountPath: /datalog
          name: kafka
          subPath: zookeeper1/datalog
        - mountPath: /data
          name: kafka
          subPath: zookeeper1/data
      volumes:
        - name: kafka
          persistentVolumeClaim:
              claimName: {{clusterName}}-kafka-pvc

---
apiVersion: extensions/v1beta1
kind: Deployment
metadata:
  namespace: {{clusterName}}
  name: zookeeper2
spec:
  replicas: 1
  strategy: {}
  template:
    metadata:
      labels:
        app: hyperledger
        role: zookeeper
        org: kafkacluster
        zookeeper-id: zookeeper2
    spec:
      containers:
      - name: zookeeper2
        image: hyperledger/fabric-zookeeper:amd64-0.4.10
        env:
         - name: ZOO_MY_ID
           value: "3"
         - name: ZOO_SERVERS
           value: "server.1=zookeeper0:2888:3888 server.2=zookeeper1:2888:3888 server.3=0.0.0.0:2888:3888"
         - name: ZOO_TICK_TIME
           value: "6000"
        ports:
         - containerPort: 2181
         - containerPort: 2888
         - containerPort: 3888
        volumeMounts:
        - mountPath: /datalog
          name: kafka
          subPath: zookeeper2/datalog
        - mountPath: /data
          name: kafka
          subPath: zookeeper2/data
      volumes:
        - name: kafka
          persistentVolumeClaim:
              claimName: {{clusterName}}-kafka-pvc

---
apiVersion: v1
kind: Service
metadata:
  namespace: {{clusterName}}
  name: kafka0
spec:
 selector:
   app: hyperledger
   role: kafka
   kafka-id: kafka0
   org: kafkacluster
 clusterIP: None
 ports:
   - name: listen-endpoint
     protocol: TCP
     port: 9092

---
apiVersion: v1
kind: Service
metadata:
  namespace: {{clusterName}}
  name: kafka1
spec:
 selector:
   app: hyperledger
   role: kafka
   kafka-id: kafka1
   org: kafkacluster
 clusterIP: None
 ports:
   - name: listen-endpoint
     protocol: TCP
     port: 9092
---
apiVersion: v1
kind: Service
metadata:
  namespace: {{clusterName}}
  name: kafka2
spec:
 selector:
   app: hyperledger
   role: kafka
   kafka-id: kafka2
   org: kafkacluster
 clusterIP: None
 ports:
   - name: listen-endpoint
     protocol: TCP
     port: 9092

---
apiVersion: v1
kind: Service
metadata:
  namespace: {{clusterName}}
  name: zookeeper0
spec:
 selector:
   app: hyperledger
   role: zookeeper
   zookeeper-id: zookeeper0
   org: kafkacluster
 clusterIP: None
 ports:
   - name: client
     port: 2181
   - name: peer
     port: 2888
   - name: leader-election
     port: 3888
---
apiVersion: v1
kind: Service
metadata:
  namespace: {{clusterName}}
  name: zookeeper1
spec:
 selector:
   app: hyperledger
   role: zookeeper
   zookeeper-id: zookeeper1
   org: kafkacluster
 clusterIP: None
 ports:
   - name: client
     port: 2181
   - name: peer
     port: 2888
   - name: leader-election
     port: 3888

---
apiVersion: v1
kind: Service
metadata:
  namespace: {{clusterName}}
  name: zookeeper2
spec:
 selector:
   app: hyperledger
   role: zookeeper
   zookeeper-id: zookeeper2
   org: kafkacluster
 clusterIP: None
 ports:
   - name: client
     port: 2181
   - name: peer
     port: 2888
   - name: leader-election
     port: 3888