import os
import sys

sys.path.append(".")

from modules import host_handler, cluster_handler
# HostHandler, ClusterHandler
from common.utils import WORKER_TYPE_K8S, \
    NODETYPE_PEER, NODETYPE_ORDERER

from common import FabricV1NetworkConfig, \
    NETWORK_TYPE_FABRIC_V1_2, db
from mongoengine import connect

from kubernetes import client
from agent import KubernetesOperation

from modules.models import Cluster as ClusterModel
from modules.models import Deployment as DeploymentModel
from uuid import uuid4
import yaml

k8skey = open("../minikube/client.key").read()
k8scert = open("../minikube/client.crt").read()

k8s_config = open("../localkube/config").read()

k8s_config_yjy = open("../localkube/config-yjy").read()

worker_api = '192.168.1.185:6443'

k8s_host_param_config = {
    'Name': 'test',
    'K8SAddress': '192.168.1.185:6443',
    'Capacity': 5,
    'K8SConfig': k8s_config,
    'K8SUseSsl': 'false',
    'K8SCredType': '2',
    'LoggingType': 'local',
    'K8SSslCert': None,
    'K8SNfsServer': '192.168.1.185'}   #'K8SNfsServer': '172.168.170.201'

k8s_host_param_config_yjy = {
    'Name': 'test',
    'K8SAddress': '172.168.160.22:6443',
    'Capacity': 5,
    'K8SConfig': k8s_config_yjy,
    'K8SUseSsl': 'false',
    'K8SCredType': '2',
    'LoggingType': 'local',
    'K8SSslCert': None,
    'K8SNfsServer': '172.168.170.201'}

k8s_host_param = {
    'K8SUseSsl': 'false',
    'K8SKey': k8skey,
    'K8SCert': k8scert,
    'Capacity': 5,
    'LoggingType': 'local',
    'K8SNfsServer': '172.168.170.201',
    'Name': 'test',
    'K8SSslCert': None,
    'K8SCredType': '1',
    'K8SAddress': worker_api,
}

connect(db="dev",
        host="127.0.0.1",
        connect=False, tz_aware=True)

# dev_host_handler = HostHandler ();
# dev_cluster_handler = ClusterHandler();

host_name = "test"
cluster_name = "second"
# cluster_name = "sample"
host_id = ""
cluster_id = ""

cluster_config = FabricV1NetworkConfig(
            consensus_plugin='solo',
            size=4)

cluster_config.network_type = NETWORK_TYPE_FABRIC_V1_2

cluster_config_kafka = FabricV1NetworkConfig(
            consensus_plugin='kafka',
            size=4)

cluster_config_kafka.network_type = NETWORK_TYPE_FABRIC_V1_2

def create_host(name=host_name, config=k8s_host_param_config):
    # k8s_host_parm = resources.create_k8s_host()
    # k8s_host.create(k8s_host_parm)


    #host_api.create_k8s_host(k8s_host_param)
    print("create host")

    host_handler.create(name=name, host_type= WORKER_TYPE_K8S, capacity = 10,
                        worker_api=worker_api , params=config)
    return


def list_host(name=None):
    print("list hosts")
    #host_handler.list({'types':WORKER_TYPE_K8S})

    data = host_handler.list({'status': 'active'})
    print("the active list %s" %list(data))

    if len(data) is 0:
       return None

    if name is not None:
        for host in data:
            if host.get('name') == name:
                return host.get('id')

        return None
    else:
        host_id = data[0]['id']
        return host_id


def create_cluster(cluster_name, host_id, cluster_config):
    # cluster_handler.create(name=cluster_name, host_id= host_id,  config= cluster_config)
    cluster_handler.create(name=cluster_name, host_id=host_id,
                           config=cluster_config)
    return

def update_cluster(cluster_name, host_id, cluster_config):
    cluster_handler.update(cluster_name, host_id, cluster_config)


def add_peer(cluster_id, host_id):
    element = {
        "type": NODETYPE_PEER,
        "params": {
            "nodeId": "peer2",
            "orgId": "org2"
        }
    }

    cluster_handler.add(cluster_id=cluster_id, host_id=host_id, element=element)


def add_orderer():
    element = {
        "type": NODETYPE_ORDERER,
        "params":{
            "nodeId": "orderer1",
            "orgId": "ordererorg"
        }
    }

    cluster_handler.add(cluster_id=cluster_id, host_id=host_id, element=element)


def delete_cluster(cluster_id):
    # cluster_handler.delete(name=cluster_name, host_id= host_id,  config= cluster_config)
    cluster_handler.delete(id=cluster_id, forced=True, delete_config=True)
    return

def reset_cluster(cluster_id):
    cluster_handler.reset(cluster_id)
    return

def list_cluster(cluster_name=None):
    data = cluster_handler.list()
    if len(data) is 0:
        return None

    if cluster_name is not None:
        for c in data:
            if c.get('name') == cluster_name:
                return c.get('id')

        return None
    else:
        cluster_id = data[0]['id']
        print("the active cluster %s" %cluster_id)
    return cluster_id

def run():
    current_path = os.path.dirname (__file__)
    templates_path = os.path.join (current_path, "agent/k8s/templates")
    for (dir_path, dir_name, file_list) in os.walk (templates_path):
        print("dir: {} dir_name: {}".format(dir_path, dir_name))

        # if 'extend' in dir_name:
        #     dir_name.remove ('extend')
        for file in file_list:
            print(file)
    return

def test(cluster_name):
    kube_config = KubernetesOperation()._get_config_from_params (k8s_host_param_config)
    client.Configuration.set_default(kube_config)
    corev1client = client.CoreV1Api()
    extensionv1client = client.ExtensionsV1beta1Api()

    ret = corev1client.list_namespaced_service(cluster_name)

    if len(ret.items) == 0 or ret is None:
        print("the services in the cluster {} are None".format (cluster_name))
        return None

    for i in ret.items:
        service = i.metadata.name
        print("service: {}".format(service))
        data = corev1client.read_namespaced_service(name=service, namespace=cluster_name)
        print("data: {}".format(data))

    #枚举当前集群的节点,找出External_IP和Internal_IP
    ret = corev1client.list_node()
    for i in ret.items:
        print("Node status: {}".format(i.status))


    ret = corev1client.list_namespaced_pod(cluster_name)
    for i in ret.items:
        print("result {}".format(i.spec))

    ret = extensionv1client.list_namespaced_ingress(cluster_name)
    for i in ret.items:
        print("ingress {}".format(i))

def _pods_match_nodes(self, kube_pods, kube_nodes):
    nodes = {}
    for i in kube_nodes.items:
        ip = None
        for addr in i.status.addresses:
            if addr.type == "ExternalIP":
                ip = addr.address
            elif addr.type == "InternalIP":
                ip = addr.address
            else:
                continue

        if ip is not None:
            nodes[i.metadata.name] = ip

    #logger.info("nodes : {}".format(nodes))

    pod_list = list(filter(lambda i: i.metadata.labels is not None,
                       kube_pods.items))
    pods = {}
    for pod in pod_list:
        if (pod.metadata.labels.get('org') == 'kafkacluster') \
                or (pod.metadata.labels.get('app') == 'cli'):
            continue

        pod_ip = nodes.get(pod.spec.node_name, None)
        if pod_ip is None:
            continue

        name_list= ['name','peer-id','orderer-id']
        for e in name_list:
            name = pod.metadata.labels.get(e, None)
            if name is not None:
                break

        pod_id = "{}_{}_{}_{}".format(pod.metadata.labels.get('app',""),
                           pod.metadata.labels.get('org', ""),
                           pod.metadata.labels.get('role', ""),
                           name,)
        pods[pod_id] = {'pod_name': pod.metadata.name,
                     'node_name': pod.spec.node_name,
                     'labels': pod.metadata.labels,
                     'address':pod_ip}

    #logger.info("pods : {}".format (pods))
    return pods

def  _gen_service_url(self, kube_services, kube_pods):
    services = []
    for i in kube_services.items:
        service = {}
        if i.spec.ports is None \
                or i.spec.selector is None:
            continue

        service['service_name'] = i.metadata.name
        service['ports'] = i.spec.ports
        service['selector'] = i.spec.selector

        if (service['selector'].get('org',"") == 'kafkacluster') \
                or (service['selector'].get('app', None) is None):
            continue

        name_list = ['name', 'peer-id', 'orderer-id']
        for e in name_list:
            name = service['selector'].get(e, None)
            if name is not None:
                break
        select_id = "{}_{}_{}_{}".format(service['selector'].get('app',""),
                                         service['selector'].get('org', ""),
                                         service['selector'].get('role', ""),
                                         name,)

        pod = kube_pods.get(select_id, None)
        if pod is None:
            continue

        service['address'] = pod.get('address')
        services.append(service)

    results = {}

    def _peer(s):
        for port in s['ports']:
            value = template.format(port.node_port)
            # transfer port name which can be recognized.
            if port.name == "external-listen-endpoint":
                results[name + "_grpc"] = value
            elif port.name == "listen":
                results[name + "_event"] = value
            else:
                continue
        return

    def _ca(s):
        for port in s['ports']:
            results[ name + "_ecap"] = template.format(port.node_port)
        return

    def _orderer(s):
        for port in s['ports']:
            results["orderer"] = template.format(port.node_port)
        return

    def _explore(s):
        for port in s['ports']:
            results["dashboard"] = template.format(port.node_port)

    switch = {
        "peer": _peer,
        "orderer": _orderer,
        "ca": _ca,
        "explorer": _explore
    }

    for service in services:
        template = service['address'] + ":" + "{}"
        name = service['service_name'].replace("-", "_")
        key = service['selector'].get('role')

        if key is None:
            key = service['selector'].get('app')
        try:
            switch[key](service)
        except KeyError as e:
            pass

    #logger.debug("service external port: {}".format (results))
    return results


def list_namespaces():
    kube_config = KubernetesOperation()._get_config_from_params(k8s_host_param_config)
    client.Configuration.set_default(kube_config)
    corev1client = client.CoreV1Api()

    namespaces = corev1client.list_namespace()
    namespace_list = [n.metadata.name for n in namespaces.items]
    print(namespace_list)

def service_url(cluster_name='first', config=k8s_host_param_config):
    kube_config = KubernetesOperation()._get_config_from_params(config)
    client.Configuration.set_default(kube_config)
    corev1client = client.CoreV1Api()

    # {
    #     'Node': Id ,
    #     'addresses': [
    #         {'address': '192.168.1.185', 'type': 'InternalIP'},
    #         {'address': 'whty0-to-be-filled-by-o-e-m', 'type': 'Hostname'}
    #     ],
    # }
    #先获取Node的信息
    nodes = corev1client.list_node ()
    if nodes is None:
        return None

    pods = corev1client.list_namespaced_pod(cluster_name)
    if pods is None:
        return None


    #NodeName is a request to schedule this pod
    # onto a specific node. If it is non-empty, the scheduler
    #  simply schedules this pod onto that node,
    # assuming that it fits resource requirements.
    pods = _pods_match_nodes("",pods, nodes)
    services = corev1client.list_namespaced_service(cluster_name)
    if services is None:
        return None

    print(_gen_service_url("",services, pods))

    return None



def delete_deployments(cluster_id):
    kube_config = KubernetesOperation ()._get_config_from_params (k8s_host_param_config)
    client.Configuration.set_default (kube_config)
    extendv1client = client.ExtensionsV1beta1Api()

    def _delete_deployment(name, namespace, data, **kwargs):
        try:
            resp = extendv1client. \
                delete_namespaced_deployment(name, namespace,
                                              data, **kwargs)
            print(resp)
        except client.rest.ApiException as e:
            print(e)
        except Exception as e:
            print(e)

    cluster = ClusterModel.objects.get(id=cluster_id)
    deployments = DeploymentModel.objects(cluster=cluster, kind="Deployment")

    for deployment in deployments:
        delete_data = client.V1DeleteOptions()
        namespace = deployment.data.get ('metadata').get ('namespace', None)
        _delete_deployment(deployment.name, namespace, delete_data)
        deployment.delete()

    return


def delete_services(cluster_id):
    kube_config = KubernetesOperation ()._get_config_from_params (k8s_host_param_config)
    client.Configuration.set_default (kube_config)
    corev1client = client.CoreV1Api()

    def _delete_deployment(name, namespace, data, **kwargs):
        try:
            resp = corev1client. \
                delete_namespaced_service(name, namespace,
                                              data, **kwargs)
            print(resp)
        except client.rest.ApiException as e:
            print(e)
        except Exception as e:
            print(e)

    cluster = ClusterModel.objects.get(id=cluster_id)
    services = DeploymentModel.objects(cluster=cluster, kind="Service")

    for service in services:
        delete_data = client.V1DeleteOptions()
        namespace = service.data.get ('metadata').get ('namespace', None)
        _delete_deployment(service.name, namespace, delete_data)
        service.delete()

    return

def delete_namespace():
    kube_config = KubernetesOperation ()._get_config_from_params (k8s_host_param_config)
    client.Configuration.set_default (kube_config)
    corev1client = client.CoreV1Api()

    delete_data = client.V1DeleteOptions ()

    try:
        resp = corev1client. \
            delete_namespace("first", delete_data)
        print(resp)
    except client.rest.ApiException as e:
        print(e)
    except Exception as e:
        print(e)

    return

def delete_namespace():
    kube_config = KubernetesOperation ()._get_config_from_params (k8s_host_param_config)
    client.Configuration.set_default (kube_config)
    corev1client = client.CoreV1Api()

    delete_data = client.V1DeleteOptions()

    try:
        resp = corev1client. \
            delete_namespace("first", delete_data)
        print(resp)
    except client.rest.ApiException as e:
        print(e)
    except Exception as e:
        print(e)

    return

def delete_replica_set():
    kube_config = KubernetesOperation()._get_config_from_params(k8s_host_param_config)
    client.Configuration.set_default(kube_config)
    extendv1client = client.ExtensionsV1beta1Api()
    corev1client = client.CoreV1Api()
    replicas= extendv1client.list_namespaced_replica_set("first")
    pods = corev1client.list_namespaced_pod("first")

    replica_sets = []
    for replica in replicas.items:
        name = replica.metadata.name
        replica_sets.append(name)


    pod_sets = []
    for pod in pods.items:
        name = pod.metadata.name
        pod_sets.append(name)

def find_one_of():
    clusterdb = db['cluster']
    cluster = clusterdb.find({"_id": "7a4af46dbbf046938b1b68ae2145695f", "release_ts": None})
    # for c in cluster:
    #     print(c)
    cm = list(c.get('_id') for c in cluster)
    print(cm)
    cluster = clusterdb.find_one()
    print(cluster)


