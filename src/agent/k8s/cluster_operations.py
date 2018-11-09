
# Copyright 2018 (c) VMware, Inc. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#

import logging
import json
import os
import shutil
import time
import yaml

from copy import deepcopy
from uuid import uuid4

import common
from common.utils import CONSENSUS_PLUGIN_KAFKA
from modules.models import Deployment
from ..host_base import HostBase
from common import log_handler, LOG_LEVEL, db, utils, ClusterEnvelop, \
    ChannelComputeUpdateV1, CA_PORTS_UPPER_LIMIT, CLUSTER_PORT_STEP, \
    ORDERER_PORTS_UPPER_LIMIT, CONSENSUS_PLUGIN_SOLO
from jinja2 import Template, Environment, FileSystemLoader
from kubernetes import client, config
from kubernetes.stream import stream

from common import NODETYPE_ORDERER, ELEMENT_PVC,\
    NODETYPE_PEER, NODETYPE_CA, NODETYPE_CLI

from agent.client import crypto_client, modify

logger = logging.getLogger(__name__)
logger.setLevel(LOG_LEVEL)
logger.addHandler(log_handler)


class Params(dict):
    def __init__(self):
        super(Params, self).__init__()

    def set(self, key, value):
        self[key] = value

    def copy(self):
        p = Params()
        p.update(self)
        return p


class Element(dict):
    def __init__(self, type, params):
        self["type"] = type
        self["params"] = params
        super(Element, self).__init__()


class K8sClusterOperation():
    """
    Object to operate cluster on kubernetes
    """
    def __init__(self, kube_config):
        client.Configuration.set_default(kube_config)
        self.extendv1client = client.ExtensionsV1beta1Api()
        self.corev1client = client.CoreV1Api()
        self.support_namespace = ['Deployment', 'Service',
                                  'PersistentVolumeClaim',
                                  'Pod', 'ReplicaSet']
        self.create_func_dict = {
            "Deployment": self._create_deployment,
            "Service": self._create_service,
            "PersistentVolume": self._create_persistent_volume,
            "PersistentVolumeClaim": self._create_persistent_volume_claim,
            "Namespace": self._create_namespace
        }
        self.delete_func_dict = {
            "Deployment": self._delete_deployment,
            "Service": self._delete_service,
            "PersistentVolume": self._delete_persistent_volume,
            "PersistentVolumeClaim": self._delete_persistent_volume_claim,
            "Namespace": self._delete_namespace,
            "Pod": self._delete_pod,
            "ReplicaSet": self._delete_replica_set
        }

    def _upload_config_file(self, cluster_name, cluster_config):
        try:
            cluster_path = os.path.join('/cello', cluster_name)
            resources_path = os.path.join('/resources', cluster_name)
            respond = crypto_client.init_fabric_network(ClusterEnvelop(
                cluster_id=cluster_name,
                net_work=cluster_config))

            if respond.code != 200:
                raise Exception(respond)

            common.copytree(resources_path, cluster_path)
            genesis = os.path.join(cluster_path, "channel-artifacts",
                                   "genesis.block")

            dst = os.path.join(cluster_path, "crypto-config",
                               "ordererOrganizations",
                               cluster_config.get("orderer", {}).get("domain"),
                               "genesis.block")

            shutil.copy(genesis, dst)
        except Exception as e:
            error_msg = (
                "Failded to upload cluster files to NFS Server due "
                "to incorrect parameters."
            )
            logger.error("Creating Kubernetes cluster error msg: {}".format(e))
            raise Exception(error_msg)

    def _delete_config_file(self, cluster_name):
        try:
            cluster_path = os.path.join('/cello', cluster_name)
            # fsatat = os.fstat(cluster_path)
            shutil.rmtree(cluster_path)
        except FileNotFoundError:
            return
        except Exception as e:
            error_msg = (
                "Failded to delete cluster files in NFS Server due "
                "to incorrect parameters."
            )
            logger.error("Deleteing Kubernetes "
                         "cluster error msg: {}".format(e))
            raise Exception(error_msg)

    # transfer the config file to the k8s serveice.
    # this function can be reused by `setup node`
    def _render_config_file(self, file_name, cluster_name,
                            cluster_params, nfsServer_ip="", extend=False):
        # get template file's ports
        prvKey, domain = "", ""
        ordererId, peerId, orgId, mspId = "", "", "", ""
        eventPort, chaincodePort, nodePort = "", "", ""

        if ("namespace" not in file_name):
            if "peer" in file_name:
                eventPort = cluster_params[file_name].get("eventPort", "")
                chaincodePort =\
                    cluster_params[file_name].get("chaincodePort", "")
                nodePort = cluster_params[file_name].get("nodePort", "")
                if "x" in file_name and "y" in file_name:
                    peerId = \
                        cluster_params[file_name].get("peerId", "")
                    orgId = \
                        cluster_params[file_name].get("organizationId", "")
                    mspId = orgId + 'MSP'
                    orgId = str(orgId).lower()
                    domain = cluster_params[file_name].get("domain", "")
            elif "x" in file_name and "orderer" in file_name:
                orgId = cluster_params[file_name].get("organizationId", "")
                ordererId = cluster_params[file_name].get("ordererId", "")
                orgId = str(orgId).lower()
                nodePort = cluster_params[file_name].get("nodePort", "")
                domain = cluster_params[file_name].get("domain", "")
            elif "x" in file_name and "ca" in file_name:
                orgId = cluster_params[file_name].get("organizationId", "")
                orgId = str(orgId).lower()
                nodePort = cluster_params[file_name].get("nodePort", "")
                domain = cluster_params[file_name].get("domain", "")
                prvKey = cluster_params[file_name].get("prvKey", "")
            elif "x" in file_name and "pvc" in file_name:
                orgId = cluster_params[file_name].get("organizationId", "")
                orgId = str(orgId).lower()
                domain = cluster_params[file_name].get("domain", "")
            else:
                domain = cluster_params[file_name].get("domain", "")

        current_path = os.path.dirname(__file__)
        if not extend:
            templates_path = os.path.join(current_path, "templates")
        else:
            templates_path = os.path.join(current_path, "templates/extend")

        env = Environment(
            loader=FileSystemLoader(templates_path),
            trim_blocks=True,
            lstrip_blocks=True
        )
        template = env.get_template(file_name)

        # replace the Environment in the peer template
        # clusterName externalPort chaincodePort  nodePort
        output = template.render(clusterName=cluster_name,
                                 eventPort=eventPort,
                                 chaincodePort=chaincodePort,
                                 nodePort=nodePort,
                                 nfsServer=nfsServer_ip,
                                 peerId=peerId,
                                 organizationId=orgId,
                                 ordererId=ordererId,
                                 domain=domain,
                                 privateKey=prvKey,
                                 mspId=mspId)
        return output

    # exec the remote command
    # this fuction can be used to join channel?
    def _pod_exec_command(self, pod_name, namespace, command):
        try:
            bash_command = ['/bin/bash', '-c', command]
            resp = stream(self.corev1client.connect_get_namespaced_pod_exec,
                          pod_name, namespace, command=bash_command,
                          stdout=True)

            logger.debug(resp)
            return True
        except client.rest.ApiException as e:
            logger.error(e)
            return False
        except Exception as e:
            logger.error(e)
            return False

    def _filter_cli_pod_name(self, namespace):
        ret = self.corev1client.list_namespaced_pod(namespace, watch=False)
        pod_list = []
        for i in ret.items:
            if (i.metadata.namespace == namespace and
                    i.metadata.name.startswith("cli")):
                pod_list.append(i.metadata.name)
        return pod_list

    def _is_cluster_pods_running(self, namespace):
        ret = self.corev1client.list_namespaced_pod(namespace, watch=False)
        for i in ret.items:
            if not i.status.phase == "Running":
                return False

        return True

    def _get_cluster_pods(self, namespace):
        ret = self.corev1client.list_namespaced_pod(namespace, watch=False)
        pod_list = {}
        for i in ret.items:
            # if i.metadata.namespace == namespace:
            pod_list[i.metadata.name] = i.metadata.uid

        return pod_list

    def get_cluster_container(self, cluster_name):
        return self._get_cluster_pods(cluster_name)

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

        logger.info("nodes : {}".format(nodes))

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

            name_list = ['name', 'peer-id', 'orderer-id']
            name = str()
            for e in name_list:
                name = pod.metadata.labels.get(e, None)
                if name is not None:
                    break

            pod_id = "{}_{}_{}_{}".format(pod.metadata.labels.get('app', ""),
                                          pod.metadata.labels.get('org', ""),
                                          pod.metadata.labels.get('role', ""),
                                          name)

            pods[pod_id] = {'pod_name': pod.metadata.name,
                            'node_name': pod.spec.node_name,
                            'labels': pod.metadata.labels,
                            'address': pod_ip}

        logger.info("pods : {}".format(pods))
        return pods

    def _gen_service_url(self, kube_services, kube_pods):
        services = []
        for i in kube_services.items:
            service = {}
            if i.spec.ports is None \
                    or i.spec.selector is None:
                continue

            service['service_name'] = i.metadata.name
            service['ports'] = i.spec.ports
            service['selector'] = i.spec.selector

            if (service['selector'].get('org', "") == 'kafkacluster') \
                    or (service['selector'].get('app', None) is None):
                continue

            name_list = ['name', 'peer-id', 'orderer-id']
            for e in name_list:
                name = service['selector'].get(e, None)
                if name is not None:
                    break

            select_id = \
                "{}_{}_{}_{}".format(service['selector'].get('app', ""),
                                     service['selector'].get('org', ""),
                                     service['selector'].get('role', ""),
                                     name, )

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
                results[name + "_ecap"] = template.format(port.node_port)
            return

        # TODO: the external orderer node
        def _orderer(s):
            if name == 'orderer0':
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
                logger.error("key error {}".format(e))

        logger.debug("service external port: {}".format(results))
        return results

    def _create_deployment(self, namespace, data, **kwargs):
        try:
            resp = self.extendv1client.create_namespaced_deployment(namespace,
                                                                    data,
                                                                    **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    # create a service in k8s
    def _create_service(self, namespace, data, **kwargs):
        try:
            resp = self.corev1client.create_namespaced_service(namespace,
                                                               data,
                                                               **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    # create a persistent volume in k8s
    def _create_persistent_volume_claim(self, namespace, data, **kwargs):
        try:
            resp = self.corev1client.\
                create_namespaced_persistent_volume_claim(namespace,
                                                          data,
                                                          **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _create_persistent_volume(self, data, **kwargs):
        try:
            resp = self.corev1client.create_persistent_volume(data, **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _create_namespace(self, data, **kwargs):
        try:
            resp = self.corev1client.create_namespace(data, **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _delete_persistent_volume_claim(self, name, namespace, data, **kwargs):
        try:
            resp = self.corev1client.\
                delete_namespaced_persistent_volume_claim(name, namespace,
                                                          data, **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _delete_persistent_volume(self, name, data, **kwargs):
        try:
            resp = self.corev1client.delete_persistent_volume(name, data,
                                                              **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _delete_service(self, name, namespace, data, **kwargs):
        try:
            # delete_namespaced_service does not need data actually.
            resp = self.corev1client.delete_namespaced_service(name,
                                                               namespace,
                                                               data,
                                                               **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _delete_pod(self, name, namespace, data, **kwargs):
        try:
            # delete_namespaced_service does not need data actually.
            resp = self.corev1client.delete_namespaced_pod(name,
                                                           namespace,
                                                           data,
                                                           **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _delete_replica_set(self, name, namespace, data, **kwargs):
        try:
            # delete_namespaced_service does not need data actually.
            resp = \
                self.extendv1client.delete_namespaced_replica_set(name,
                                                                  namespace,
                                                                  data,
                                                                  **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _delete_namespace(self, name, data, **kwargs):
        try:
            resp = self.corev1client.delete_namespace(name, data, **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _delete_deployment(self, name, namespace, data, **kwargs):
        try:
            resp = self.extendv1client.\
                delete_namespaced_deployment(name, namespace,
                                             data, **kwargs)
            logger.debug(resp)
            return True, resp
        except client.rest.ApiException as e:
            logger.error(e)
            return False, e
        except Exception as e:
            logger.error(e)
            return False, None

    def _deploy_k8s_resource(self, yaml_data, save=None):
        for data in yaml_data:
            if data is None:
                continue
            kind = data.get('kind', None)
            name = data.get('metadata').get('name', None)
            namespace = data.get('metadata').get('namespace', None)

            logs = "Deploy namespace={}, name={}, kind={}".format(namespace,
                                                                  name,
                                                                  kind)
            logger.info(logs)
            if save is not None:
                save(self._fomart_yaml_data(data))

            if kind in self.support_namespace:
                isOk, resp = self.create_func_dict.get(kind)(namespace, data)
            else:
                isOk, resp = self.create_func_dict.get(kind)(data)

            if not isOk:
                return False
            else:
                time.sleep(3)

        return True

    def _delete_k8s_resource(self, yaml_data):
        data = yaml_data

        if data is None:
            return

        kind = data.get('kind', None)
        name = data.get('metadata').get('name', None)
        namespace = data.get('metadata').get('namespace', None)

        delete_data = client.V1DeleteOptions()

        logs = "Delete namespace={}, name={}, kind={}".format(namespace,
                                                              name,
                                                              kind)
        logger.info(logs)

        if kind in self.support_namespace:
            isOk, resp = self.delete_func_dict.get(kind)(name,
                                                         namespace,
                                                         delete_data)
        else:
            isOk, resp = self.delete_func_dict.get(kind)(name, delete_data)

        # if not isOk:
        #     time.sleep(3)
        #     return
        time.sleep(3)

    def get_services_urls(self, cluster_name):
        nodes = self.corev1client.list_node()
        if nodes is None:
            return None

        pods = self.corev1client.list_namespaced_pod(cluster_name)
        if pods is None:
            return None

        # NodeName is a request to schedule this pod
        # onto a specific node. If it is non-empty, the scheduler
        #  simply schedules this pod onto that node,
        # assuming that it fits resource requirements.
        pods = self._pods_match_nodes(pods, nodes)
        services = self.corev1client.list_namespaced_service(cluster_name)
        if services is None:
            return None

        return self._gen_service_url(services, pods)

    # nfserver_ip is not neccessary beacause of the pvc had been created.
    def _deploy_node_peer(self, cluster_name, node_params, save=None):
        file_data = self._render_config_file("peerx.orgy.tpl",
                                             cluster_name,
                                             node_params,
                                             extend=True)

        yaml_data = yaml.load_all(file_data)
        return self._deploy_k8s_resource(yaml_data, save)

    # add a orderer
    def _deploy_node_orderer(self, cluster_name, node_params,
                             consensus=CONSENSUS_PLUGIN_KAFKA, save=None):
        if consensus == CONSENSUS_PLUGIN_KAFKA:
            file_data = self._render_config_file("ordererx.kafka.tpl",
                                                 cluster_name,
                                                 node_params,
                                                 extend=True)
        elif consensus == CONSENSUS_PLUGIN_SOLO:
            file_data = self._render_config_file("ordererx.solo.tpl",
                                                 cluster_name,
                                                 node_params,
                                                 extend=True)
        yaml_data = yaml.load_all(file_data)
        return self._deploy_k8s_resource(yaml_data, save)

    def _deploy_node_ca(self, cluster_name, node_params, save=None):
        domain = node_params.get("orgx.ca.tpl").get("domain", None)
        if domain is None:
            return

        ca_path = os.path.join("/cello", cluster_name,
                               "crypto-config",
                               "peerOrganizations",
                               domain, "ca")

        for (dir_path, dir_name, file_list) in os.walk(ca_path):
            for file in file_list:
                if "_sk" in file:
                    node_params["orgx.ca.tpl"]["prvKey"] = file
                    break

        file_data = self._render_config_file("orgx.ca.tpl",
                                             cluster_name,
                                             node_params,
                                             extend=True)

        yaml_data = yaml.load_all(file_data)
        return self._deploy_k8s_resource(yaml_data, save)

    # add a organization msp file to pv
    def deploy_org_pvc(self, cluster_name, nfsServer_ip, params, save=None):
        pv_params = {
            "orgx.pvc.tpl": params
        }

        file_data = self._render_config_file("orgx.pvc.tpl",
                                             cluster_name, pv_params,
                                             nfsServer_ip,
                                             extend=True)

        yaml_data = yaml.load_all(file_data)
        if not self._deploy_k8s_resource(yaml_data, save):
            return None

        return self._get_cluster_pods(cluster_name)

    def deploy_node(self, cluster_name, params,
                    node_type, save=None):
        """
            add a node to one cluster that has been exists.
            create a peer or orderer node;

            :param str cluster_name: the cluster name, we can get paraments
            from db by the  cluster_name.
            :param json ports_index: the ports had been used.
            :param int external_port_start: the start port in the cluster
             that named cluster_name
            :param json params:
                    nodeId: one peer id or orderer id
                    orgId: the organization that new node belongs to
            :param str node_type: peer or orderer
        """
        isOK = True
        if node_type == NODETYPE_PEER:
            node_params = {
                "peerx.orgy.tpl": params
            }

            isOK = self._deploy_node_peer(cluster_name, node_params, save)
        elif node_type == NODETYPE_ORDERER:
            node_params = {
                "ordererx.kafka.tpl": params
            }

            isOK = self._deploy_node_orderer(cluster_name,
                                             node_params,
                                             save=save)
        elif node_type == NODETYPE_CA:
            node_params = {
                "orgx.ca.tpl": params
            }

            isOK = self._deploy_node_ca(cluster_name, node_params, save)
        elif node_type == NODETYPE_CLI:
                pass
        if isOK:
            return self._get_cluster_pods(cluster_name)
        else:
            return None

    def _deploy_cluster_resource(self, cluster_name,
                                 current_port, nfsServer_ip,
                                 cluster_config, save=None):
        consensus = cluster_config.get("consensus")
        if consensus != CONSENSUS_PLUGIN_KAFKA and \
                consensus != CONSENSUS_PLUGIN_SOLO:
            logger.error("the cluster: {} is wrong consensus "
                         "{}".format(cluster_name, consensus))
            return False

        # create namespace in advance
        file_data = self._render_config_file("namespace.tpl", cluster_name,
                                             {}, nfsServer_ip, True)
        yaml_data = yaml.load_all(file_data)
        if not self._deploy_k8s_resource(yaml_data, save):
            return False

        ca_start = current_port
        orderer_start = current_port + CA_PORTS_UPPER_LIMIT
        peer_start = orderer_start + ORDERER_PORTS_UPPER_LIMIT
        for org in cluster_config.get("application", []):
            # deploy the pvc
            pv_params = {
                "orgx.pvc.tpl": {
                    "organizationId": org.get("org_name"),
                    "nfsServer": nfsServer_ip,
                    "domain": org.get("domain")
                }
            }

            file_data = self._render_config_file("orgx.pvc.tpl",
                                                 cluster_name,
                                                 pv_params,
                                                 nfsServer_ip,
                                                 True)

            yaml_data = yaml.load_all(file_data)
            if not self._deploy_k8s_resource(yaml_data, save):
                return False

            # deploy the ca
            ca_params = {
                "orgx.ca.tpl": {
                    "nodePort": str(ca_start),
                    "organizationId": org.get("org_name"),
                    "domain": org.get("domain")
                }
            }

            if not self._deploy_node_ca(cluster_name, ca_params, save):
                return False
            ca_start += 1

            for peer in org.get("peers", ""):
                peer_params = {
                    "peerx.orgy.tpl": {
                        "nodePort": str(peer_start),
                        "chaincodePort": str(peer_start + 1),
                        "eventPort": str(peer_start + 2),
                        "peerId": peer,
                        "organizationId": org.get("org_name"),
                        "domain": org.get("domain")
                    }
                }

                if not self._deploy_node_peer(cluster_name, peer_params, save):
                    return False

                peer_start += 3

        # deploy the orderers
        orderer_org = deepcopy(cluster_config.get("orderer", {}))
        orderer_org["org_name"] = "ordererorg"

        # deploy orderer org pv
        pv_params = {
            "ordererorg.pvc.tpl": {
                "domain": orderer_org.get("domain", "")
            }
        }

        file_data = self._render_config_file("ordererorg.pvc.tpl",
                                             cluster_name,
                                             pv_params,
                                             nfsServer_ip,
                                             False)

        yaml_data = yaml.load_all(file_data)
        if not self._deploy_k8s_resource(yaml_data, save):
            return False

        if consensus == CONSENSUS_PLUGIN_KAFKA:
            kafka_params = {
                "kafka.tpl": {
                    "nfsServer": nfsServer_ip,
                }
            }

            file_data = self._render_config_file("kafka.tpl", cluster_name,
                                                 kafka_params, nfsServer_ip,
                                                 False)

            yaml_data = yaml.load_all(file_data)
            if not self._deploy_k8s_resource(yaml_data, save):
                return False
            time.sleep(3)

            for orderer in orderer_org.get("peers", ""):
                node_params = {
                    "ordererx.kafka.tpl": {
                        "nodePort": str(orderer_start),
                        "ordererId": orderer,
                        "organizationId": orderer_org.get('org_name'),
                        "domain": orderer_org.get("domain")
                    }
                }

                if not self._deploy_node_orderer(cluster_name, node_params,
                                                 save=save):
                    return False
                orderer_start += 1

        else:
            orderers = orderer_org.get("peers", "")
            node_params = {
                "ordererx.solo.tpl": {
                    "nodePort": str(orderer_start),
                    "ordererId": orderers[0],
                    "organizationId": orderer_org.get('org_name'),
                    "domain": orderer_org.get("domain")
                }
            }

            if not self._deploy_node_orderer(cluster_name, node_params,
                                             consensus=CONSENSUS_PLUGIN_SOLO,
                                             save=save):
                return False

        return True

    def check_pvs(self, documents):
        mapping_list = []
        for doc in documents:
            if doc.kind == "PersistentVolume":
                mapping_list.append(doc.name)

        try:
            response = self.corev1client.list_persistent_volume()
            for item in response.items:
                if item.metadata.name in mapping_list:
                    return False

            return True

        except client.rest.ApiException as e:
            logger.error("Exception raised in list pv: %s\n" % e)
        except Exception as e:
            logger.error("Exception raised in list pv: %s\n" % e)

    def deploy_cluster(self, cluster_name, ports_index,
                       external_port_start, nfsServer_ip,
                       cluster_config, save=None):
        self._upload_config_file(cluster_name, cluster_config)
        time.sleep(1)

        isOK = self._deploy_cluster_resource(cluster_name,
                                             external_port_start,
                                             nfsServer_ip,
                                             cluster_config,
                                             save)
        if not isOK:
            return None

        check_times = 0
        while check_times < 10:
            if self._is_cluster_pods_running(cluster_name):
                break
            logger.debug("Checking pods status...")
            time.sleep(30)
            check_times += 1

        if check_times == 10:
            logger.error("Failed to create cluster, the pods status is not "
                         "Running.")
            return None

        # setup the ordererorg cli
        node_params = {
            "ordererorg.cli.tpl": {
                "domain": cluster_config.get("orderer", {}).get("domain"),
            }
        }

        file_data = self._render_config_file("ordererorg.cli.tpl",
                                             cluster_name,
                                             node_params,
                                             nfsServer_ip)

        yaml_data = yaml.load_all(file_data)
        self._deploy_k8s_resource(yaml_data, save)

        time.sleep(3)

        return self._get_cluster_pods(cluster_name)

    def delete_resources(self, docs_deployments):
        self._delete_cluster_resource(docs_deployments)

    def _delete_cluster_resource(self, docs_deployments):
        """ The order to delete the cluster is reverse to
            create except for namespace
        """
        for deployment in docs_deployments:
            self._delete_k8s_resource(deployment.data)

    def delete_cluster(self, cluster_name, docs_deployment, delete_config):

        if not self.stop_cluster(cluster_name, docs_deployment):
            return False

        kind_dict = ['Deployment', 'Service', ]

        deployments = []
        # delete_list = ['cli', 'kafka']

        for deployment in docs_deployment:
            if deployment.kind in kind_dict:
                continue

            deployments.append(deployment)

        self._delete_cluster_resource(deployments)
        time.sleep(2)

        while not self.check_pvs(docs_deployment):
            logger.info("cleaning the pv ... ...")
            time.sleep(3)

        while True:
            logger.info("cleaning the namespace "
                        "{} ... ...".format(cluster_name))
            namespaces = self.corev1client.list_namespace()
            namespace_list = [n.metadata.name for n in namespaces.items]
            if cluster_name not in namespace_list:
                break
            time.sleep(3)

        self._delete_config_file(cluster_name)
        time.sleep(5)

        if delete_config:
            respond = crypto_client.delete_fabric_network(cluster_name)
            if respond.code != 200:
                logger.error("delete config in "
                             "crypot server : {}".format(respond))
                return False

        return True

    def stop_cluster(self, cluster_name, doc_deployments):
        kind_dict = ['Deployment', 'Service', ]

        deployments = []
        delete_list = ['cli', 'kafka']

        for deployment in doc_deployments:
            # if 'cli' in deployment.name:
            #     continue

            if deployment.kind not in kind_dict:
                continue

            if 'explorer' in deployment.name:
                deployments.append(deployment)
            else:
                deployments.append(deployment)

            if deployment.kind == 'Service':
                delete_list.append(deployment.name)

        self.pod_replica_delete_list(cluster_name, delete_list, deployments)
        self.delete_resources(deployments)
        time.sleep(2)

        while True:
            logger.info("stop the cluster"
                        " {} ... ...".format(cluster_name))
            pods = self.corev1client.list_namespaced_pod(cluster_name)
            pods_list = [n.metadata.name for n in pods.items]
            if not len(pods_list):
                break
            time.sleep(3)

        return True

    def start_cluster(self, cluster_name, doc_deployments):
        kind_dict = ['Deployment', 'Service']

        explorer_datas = []
        cluster_datas = []

        for deployment in doc_deployments:
            # if 'cli' in deployment.name:
            #     continue

            if deployment.kind in kind_dict:
                if 'explorer' in deployment.name:
                    explorer_datas.append(deployment.data)
                else:
                    cluster_datas.append(deployment.data)

        self._deploy_k8s_resource(cluster_datas)

        time.sleep(2)
        return self._get_cluster_pods(cluster_name)

    def _fomart_yaml_data(self, data):
        kind_dict = ['Service', 'Deployment', 'PersistentVolumeClaim',
                     'PersistentVolume', 'Namespace']

        if data is None:
            return None

        kind = data.get('kind', None)
        name = data.get('metadata').get('name', None)

        if kind in kind_dict:
            yaml_data = {
                'id': uuid4().hex,
                'kind': kind,
                'name': name,
                'data': data
            }
        else:
            logger.warning("this kind {} will not be saved "
                           "to db: {}".format(kind, data))
            return None

        return yaml_data

    def _update_delete(self, cluster_name, original, update):
        delete_list = []
        delete_orderers = []

        # check the application organization
        original_orgs = dict((org.get("org_name", ""), org)
                             for org in original.get("application", []))
        update_orgs = dict((org.get("org_name", ""), org)
                           for org in update.get("application", []))

        delete_orgs = list(filter(lambda x: update_orgs.get(x, None) is None,
                                  original_orgs.keys()))

        for org_name in delete_orgs:
            original_org = original_orgs.get(org_name)
            id = cluster_name + "-" + org_name + "-pvc"
            delete_list.append(id.lower())
            id = cluster_name + "-" + org_name + "-pv"
            delete_list.append(id.lower())
            id = "ca-" + org_name
            delete_list.append(id.lower())

            for original_peer in original_org.get("peers"):
                id = original_peer + "-" + org_name
                delete_list.append(id.lower())

            original_orgs.pop(org_name)

        for org_name, original_org in original_orgs.items():
            org_name = original_org.get("org_name")
            update_org = update_orgs.get(org_name)

            for original_peer in original_org.get("peers"):
                is_find = False
                for update_peer in update_org.get("peers"):
                    if original_peer == update_peer:
                        is_find = True
                        break
                if not is_find:
                    id = original_peer + "-" + org_name
                    delete_list.append(id.lower())

        # check the orderer node
        if original.get("consensus") == CONSENSUS_PLUGIN_SOLO:
            return delete_list, delete_orgs, delete_orderers

        original_orderer = original.get("orderer", {})
        update_orderer = original.get("orderer", {})

        for original_peer in original_orderer.get("peers"):
            is_find = False
            for update_peer in update_orderer.get("peers"):
                if original_peer == update_peer:
                    is_find = True
                    break
            if not is_find:
                delete_orderers.append(original_peer)
                delete_list.append(original_peer)

        return delete_list, delete_orgs, delete_orderers

    def _update_new(self, original, update):
        new_elements = []
        new_orderers = []

        original_orgs = dict((org.get("org_name", ""), org)
                             for org in original.get("application", []))
        update_orgs = dict((org.get("org_name", ""), org)
                           for org in update.get("application", []))

        new_orgs = list(filter(lambda x: original_orgs.get(x, None) is None,
                        update_orgs.keys()))

        original_peer = str()
        for org_name in new_orgs:
            update_org = update_orgs.get(org_name)

            params = Params()
            params.set("organizationId", org_name)
            params.set("domain", update_org.get("domain"))

            for update_peer in update_org.get("peers"):
                params_peer = params.copy()
                params_peer.set("peerId", update_peer)
                new_elements.append(Element(NODETYPE_PEER, params_peer))

            params_ca = params.copy()
            new_elements.append(Element(NODETYPE_CA, params_ca))

            params_pvc = params.copy()
            new_elements.append(Element(ELEMENT_PVC, params_pvc))

            update_orgs.pop(org_name)

        for org_name, update_org in update_orgs.items():
            params = Params()
            params.set("organizationId", update_org.get('org_name'))
            params.set("domain", update_org.get("domain"))

            original_org = original_orgs.get(org_name)

            for update_peer in update_org.get("peers"):
                isfind = False
                for original_peer in original_org.get("peers"):
                    if original_peer == update_peer:
                        isfind = True
                        break
                if not isfind:
                    params_peers = params.copy()
                    params_peers.set("peerId", update_peer)
                    new_elements.append(Element(NODETYPE_PEER, params_peers))

        if original.get("consensus") == CONSENSUS_PLUGIN_SOLO:
            return new_elements, new_orgs, new_orderers

        original_orderer = original.get("orderer", {})
        update_orderer = original.get("orderer", {})
        for update_peer in update_orderer.get("peers"):
            is_find = False
            for original_peer in original_orderer.get("peers"):
                if original_peer == update_peer:
                    is_find = True
                    break
            if not is_find:
                new_orderers.append(original_peer)
                params_orderer = Params()
                params_orderer.set("organizationId", "ordererorg")
                params_orderer.set("domain", original_orderer.get("domain"))
                params_orderer.set("ordererId", original_peer)
                new_elements.append(Element(NODETYPE_ORDERER, params_orderer))

        return new_elements, new_orgs, new_orderers

    def new_to_delete(self, cluster_name, new_elements):
        delete_list = []
        for e in new_elements:
            if e.get("type", "") == NODETYPE_PEER:
                param = e.get("params", "")
                identity = \
                    param.get("peerId") + "-" + \
                    str(param.get("organizationId")).lower()
                delete_list.append(identity)
            elif e.get("type", "") == NODETYPE_ORDERER:
                param = e.get("params", "")
                identity = param.get("ordererId") + "-" + \
                    str(param.get("organizationId")).lower()
                delete_list.append(identity)
            elif e.get("type", "") == NODETYPE_CA:
                param = e.get("params", "")
                identity = "ca-" + param.get("organizationId")
                delete_list.append(identity.lower())
            elif e.get("type", "") == ELEMENT_PVC:
                param = e.get("params", "")
                identity = cluster_name + "-" + \
                    str(param.get("organizationId")).lower() + "-pvc"
                delete_list.append(identity.lower())
                identity = cluster_name + "-" + \
                    str(param.get("organizationId")).lower() + "-pv"
                delete_list.append(identity.lower())

        return delete_list

    def _fetch_config(self, cluster_name, orderer):
        pod_commands = ["peer channel fetch config  -c e2e-orderer-syschan -o "
                        + orderer + ":7050"
                        + " resources/channel-artifacts/config.pb "
                        + " --tls  --cafile $CORE_PEER_TLS_ROOTCERT_FILE",
                        "chmod +666 resources/channel-artifacts/config.pb",
                        "peer channel signconfigtx "
                        + " -f resources/channel-artifacts/config_update.tx",
                        "peer channel update -c e2e-orderer-syschan -o "
                        + orderer + ":7050"
                        + " -f resources/channel-artifacts/config_update.tx"
                        + " --tls  --cafile $CORE_PEER_TLS_ROOTCERT_FILE", ]

        pod_list = self._filter_cli_pod_name(cluster_name)
        pods = list(filter(lambda x: 'cli' in x and "ordererorg" in x,
                           pod_list))
        if len(pods) == 0:
            logger.error("the cli-orderer is not existed.")
            return False

        check_times = 5
        config_pb = os.path.join("/cello",
                                 cluster_name,
                                 "channel-artifacts/config.pb")
        while check_times:
            if not self._pod_exec_command(pods[0],
                                          cluster_name,
                                          pod_commands[0]):
                logger.error("fetch the system channel config failure")
                return False
            time.sleep(3)

            if not self._pod_exec_command(pods[0],
                                          cluster_name,
                                          pod_commands[1]):
                logger.error("chmod the config.pb +666 failure")
                return False
            time.sleep(3)

            if os.path.lexists(config_pb):
                break
            check_times -= 1
            if check_times == 0:
                logger.error("the update config.pb is not existed.")
                return False

        return True

    def _generate_config_update(self, cluster_name, new_orgs,
                                delete_orgs, delete_orderers,
                                new_orderes):
        config_pb = os.path.join("/cello", cluster_name,
                                 "channel-artifacts/config.pb")
        fp = open(config_pb, "rb+")
        data = fp.read()
        fp.close()

        respond = crypto_client.decode_config_protobuf(data, "fabric-1.2")
        if respond.code != 200:
            logger.error("decode_config_protobuf: {}".format(respond))
            return False

        config_json = json.loads(respond.fp.read().decode('utf-8'))
        respond.close()

        modify_json = deepcopy(config_json)
        deepTrees = ["channel_group", "groups", "Consortiums",
                     "groups", "SampleConsortium", "groups"]
        for org_name in new_orgs:
            respond =\
                crypto_client.fetch_organization_config(cluster_name,
                                                        org_name)
            if respond.code != 200:
                logger.error("fetch_organization_config:", respond)
                return False

            org_json = json.loads(respond.fp.read().decode('utf-8'))
            respond.close()
            modify.insert_kv(deepTrees, modify_json, org_name, org_json)

        for org_name in delete_orgs:
            modify.delete_key(deepTrees, modify_json, org_name)

        deepTrees = ["channel_group", "values",
                     "OrdererAddresses", "value", "addresses"]
        modify.delete_elements(deepTrees, modify_json, delete_orderers)
        modify.insert_elements(deepTrees, modify_json, new_orderes)

        compute_update = ChannelComputeUpdateV1(config_json, modify_json)
        respond = crypto_client.compute_update(compute_update,
                                               "fabric-1.2",
                                               "e2e-orderer-syschan")
        if respond.code != 200:
            logger.error("compute_update:{}".format(respond))
            return False

        data = respond.fp.read()
        config_update_tx = os.path.join("/cello", cluster_name,
                                        "channel-artifacts/config_update.tx")
        fp = open(config_update_tx, "wb+")
        fp.write(data)
        fp.close()

        return True

    def _update_config(self, cluster_name, orderer, new_orgs, new_orderers):

        pod_commands = ["peer channel fetch config  -c e2e-orderer-syschan -o "
                        + orderer + ":7050"
                        + " resources/channel-artifacts/config.pb "
                        + " --tls  --cafile $CORE_PEER_TLS_ROOTCERT_FILE",
                        "chmod +666 resources/channel-artifacts/config.pb",
                        "peer channel signconfigtx"
                        + " -f resources/channel-artifacts/config_update.tx",
                        "peer channel update -c e2e-orderer-syschan -o "
                        + orderer + ":7050"
                        + " -f resources/channel-artifacts/config_update.tx"
                        + " --tls  --cafile $CORE_PEER_TLS_ROOTCERT_FILE", ]

        pod_list = self._filter_cli_pod_name(cluster_name)
        pods = list(filter(lambda x: 'cli' in x and "ordererorg" in x,
                           pod_list))
        if len(pods) == 0:
            logger.error("the cli-orderer is not existed.")
            return False

        check_times = 5
        while check_times:
            if not self._pod_exec_command(pods[0],
                                          cluster_name,
                                          pod_commands[2]):
                logger.error("signature configtx failure")
                return False
            time.sleep(3)

            if not self._pod_exec_command(pods[0],
                                          cluster_name,
                                          pod_commands[3]):
                logger.error("update the channel config failure")
                return False
            time.sleep(3)

            config_pb = os.path.join("/cello",
                                     cluster_name,
                                     "channel-artifacts/config.pb")
            os.remove(config_pb)
            if not self._fetch_config(cluster_name, orderer):
                return False

            fp = open(config_pb, "rb+")
            data = fp.read()
            fp.close()

            respond = crypto_client.decode_config_protobuf(data, "fabric-1.2")
            if respond.code != 200:
                logger.error("decode_config_protobuf: {}".format(respond))
                return False

            config_json = json.loads(respond.fp.read().decode('utf-8'))
            respond.close()

            is_ok = True
            deep_trees = ["channel_group", "groups", "Consortiums",
                          "groups", "SampleConsortium", "groups"]
            for org in new_orgs:
                res = modify.find_key(deep_trees, config_json, org)
                if res is not True:
                    is_ok = False
                    break

            if not is_ok:
                check_times -= 1
                continue

            deep_trees = ["channel_group", "values",
                          "OrdererAddresses", "value", "addresses"]
            for e in new_orderers:
                res = modify.find_element(deep_trees, config_json, e)
                if res is not True:
                    is_ok = False
                    break

            if is_ok:
                return True
            else:
                check_times -= 1

        return False

    def update_config(self, cluster_name, original_config,
                      cluster_config):
        delete_list, delete_orgs, delete_orderers = \
            self._update_delete(cluster_name, original_config, cluster_config)

        new_list, new_orgs, new_orderes = \
            self._update_new(original_config, cluster_config)

        # 先生成配置文件并复制
        if len(new_list) + len(delete_list):
            respond = crypto_client.update_fabric_network(ClusterEnvelop(
                cluster_id=cluster_name,
                net_work=cluster_config))

            if respond.code != 200:
                logger.error("update_fabric_network:{}".format(respond))
                raise respond

        cluster_path = os.path.join('/cello', cluster_name)
        resources_path = os.path.join('/resources', cluster_name)

        common.copytree(resources_path, cluster_path,
                        overwrite=self.__overwrite,
                        ignore=self.__ignore)

        def _run_update():
            logger.info("start to update the {} cluster".format(cluster_name))
            updates = len(new_orgs) + len(new_orderes) + \
                len(delete_orgs) + len(delete_orderers)

            if not updates:
                return True

            orderers = original_config.get("orderer", {}).get("peers", [])

            # Fetch the system channel last config.block
            if not self._fetch_config(cluster_name, orderers[0]):
                return False

            # Generate the update config Tx
            if not self._generate_config_update(cluster_name, new_orgs,
                                                delete_orgs, new_orderes,
                                                delete_orgs):
                return False

            # Update the system channel config
            if not self._update_config(cluster_name, orderers[0],
                                       new_orgs, new_orderes):
                return False

            logger.info("update the {} cluster"
                        " successfully".format(cluster_name))
            return True

        return delete_list, new_list, _run_update

    def __overwrite(self, srcname, dstname):
        if '.yaml' in srcname:
            shutil.copy2(srcname, dstname)
        return

    def __ignore(self, src, names):

        names = list(filter(lambda x: '.josn' in x
                                      or 'update' in x
                                      or '.pb' in x, names))
        return names

    def pod_replica_delete_list(self, cluster_name,
                                delete_list=[], deployments=[]):
        replicas = \
            self.extendv1client.list_namespaced_replica_set(cluster_name)
        pods = self.corev1client.list_namespaced_pod(cluster_name)

        replica_lists = [replica.metadata.name for replica in replicas.items]
        pod_lists = [pod.metadata.name for pod in pods.items]

        replica_lists = \
            list(filter(lambda x: True in [n in x for n in delete_list],
                        replica_lists))
        pod_lists = \
            list(filter(lambda x: True in [n in x for n in delete_list],
                        pod_lists))
        for name in replica_lists:
            data = Params()
            data.set('kind', 'ReplicaSet')
            data.set('metadata', {'name': name,
                                  'namespace': cluster_name})

            deployment = Deployment()
            deployment.data = data
            deployments.append(deployment)

        for name in pod_lists:
            data = Params()
            data.set('kind', 'Pod')
            data.set('metadata', {'name': name,
                                  'namespace': cluster_name})
            deployment = Deployment()
            deployment.data = data
            deployments.append(deployment)

        return deployments
