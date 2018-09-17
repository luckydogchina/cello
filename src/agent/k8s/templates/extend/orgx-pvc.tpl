---
apiVersion: v1
kind: PersistentVolume
metadata:
  name: {{clusterName}}-{{organizationId}}-pv
spec:
  capacity:
    storage: 500Mi
  accessModes:
    - ReadWriteMany
  claimRef:
    namespace: {{clusterName}}
    name: {{clusterName}}-{{organizationId}}-pvc
  nfs:
    path: /{{clusterName}}/resources/crypto-config/peerOrganizations/{{organizationId}}
    server: {{nfsServer}}  #change to your nfs server ip here

---
apiVersion: v1
kind: PersistentVolumeClaim
metadata:
 namespace: {{clusterName}}
 name: {{clusterName}}-{{organizationId}}-pvc
spec:
 accessModes:
   - ReadWriteMany
 resources:
   requests:
     storage: 10Mi

---
