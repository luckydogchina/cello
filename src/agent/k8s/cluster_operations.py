
# Copyright 2018 (c) VMware, Inc. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0
#

import logging
import copy
import json
import os
import sys
import shutil
import time
import yaml

from uuid import uuid4
from ..host_base import HostBase
from common import log_handler, LOG_LEVEL, db, utils
from jinja2 import Template, Environment, FileSystemLoader
from kubernetes import client, config
from kubernetes.stream import stream

from common import NODETYPE_ORDERER, NODETYPE_PEER

logger = logging.getLogger(__name__)
logger.setLevel(LOG_LEVEL)
logger.addHandler(log_handler)


class K8sClusterOperation():
    """
    Object to operate cluster on kubernetes
    """
    def __init__(self, kube_config):
        client.Configuration.set_default(kube_config)
        self.extendv1client = client.ExtensionsV1beta1Api()
        self.corev1client = client.CoreV1Api()
        self.support_namespace = ['Deployment', 'Service',
                                  'PersistentVolumeClaim']
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
            "Namespace": self._delete_namespace
        }

    def _upload_config_file(self, cluster_name, consensus):
        try:
            #TODO : cluster_path 因该修改为可以配置的
            cluster_path = os.path.join('/cello', cluster_name)
            # Uploading the 'resources' directory with its content in the
            # '/cello remote directory
            current_path = os.path.dirname(__file__)

            # Only solo and kafka supported
            if consensus == "solo":
                resources_path = os.path.join(current_path,
                                              "cluster_resources")
            else:
                resources_path = os.path.join(current_path,
                                              "cluster_resources_kafka")

            shutil.copytree(resources_path, cluster_path)
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
            shutil.rmtree(cluster_path)
        except Exception as e:
            error_msg = (
                "Failded to delete cluster files in NFS Server due "
                "to incorrect parameters."
            )
            logger.error("Creating Kubernetes cluster error msg: {}".format(e))
            raise Exception(error_msg)

    #transfer the config file to the k8s serveice.
    #this function can be reused by `setup node`
    def _render_config_file(self, file_name, cluster_name,
                            cluster_params, nfsServer_ip="", extend=False):
        # get template file's ports
        ordererId, peerId, orgId = "", "", ""
        externalPort, chaincodePort, nodePort = "", "", ""

        if ("pvc" not in file_name and "namespace" not in file_name and
           "cli" not in file_name):
            if "peer" in file_name:
                externalPort = cluster_params[file_name].get("externalPort")
                chaincodePort = cluster_params[file_name].get("chaincodePort")
                nodePort = cluster_params[file_name].get("nodePort")
                if "x" in file_name and "y" in file_name:
                    peerId = cluster_params[file_name].get("peerId")
                    orgId = cluster_params[file_name].get("organizationId")

            elif "x" in file_name and "orderer" in file_name:
                orgId = cluster_params[file_name].get("organizationId")
                ordererId = cluster_params[file_name].get("ordererId")
                nodePort = cluster_params[file_name].get("nodePort")
            elif "x" in file_name and "pvc" in file_name:
                orgId = cluster_params[file_name].get("organizationId")
            else:
                nodePort = cluster_params[file_name]

        current_path = os.path.dirname (__file__)
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

        #replace the Environment in the peer template
        #clusterName externalPort chaincodePort  nodePort
        output = template.render(clusterName=cluster_name,
                                 externalPort=externalPort,
                                 chaincodePort=chaincodePort,
                                 nodePort=nodePort,
                                 nfsServer=nfsServer_ip,
                                 peerId=peerId,
                                 organizationId=orgId,
                                 ordererId=ordererId)
        return output

    #exec the remote command
    #this fuction can be used to join channel?
    def _pod_exec_command(self, pod_name, namespace, command):
        try:
            bash_command = ['/bin/bash']
            resp = stream(self.corev1client.connect_get_namespaced_pod_exec,
                          pod_name, namespace, command=bash_command,
                          stderr=True, stdin=True, stdout=True,
                          tty=False, _preload_content=False)

            resp.write_stdin(command + "\n")

            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

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
            #if i.metadata.namespace == namespace:
            pod_list[i.metadata.name] = i.metadata.uid

        return pod_list

    def _pods_match_nodes(self, kube_pods, kube_nodes):
        nodes = []
        for i in kube_nodes.items:
            node = {}
            # print ("Node status: {}".format (i.status))
            node['addresses'] = i.status.addresses
            node['node_name'] = i.metadata.name
            # print("node_address {}".format(node))
            nodes.append (node)

        print("nodes : {}".format (nodes))

        pods = []
        for i in kube_pods.items:
            pod = {}
            # print("podname: {}, nodename: {}".format(i.metadata.name, i.spec.node_name))
            pod['pod_name'] = i.metadata.name
            pod['node_name'] = i.spec.node_name

            if i.metadata.labels is None:
                continue

            pod['labels'] = i.metadata.labels

            # cli、kafka和zookper没有需要暴露的端口
            if (pod['labels'].get('org') == 'kafkacluster') \
                    or (pod['labels'].get('app') == 'cli'):
                continue

            pods.append (pod)

        pods_result = []
        for n in nodes:
            # 提取出物理IP
            ip = None
            for addr in n.get('addresses'):
                if addr.type == "ExternalIP":
                    ip = addr.address
                elif addr.type == "InternalIP":
                    ip = addr.address
                else:
                    continue

            if ip is None:
                continue

            pods_cache = []
            for p in pods:
                if n.get('node_name') == p.get('node_name'):
                    p['address'] = ip
                    pods_result.append(p)
                else:
                    pods_cache.append(p)
            pods = pods_cache

        print ("pods : {}".format (pods_result))
        return pods_result

    def  _gen_service_url(self, kube_services, kube_pods):
        services = []
        for i in kube_services.items:
            service = {}
            service['service_name'] = i.metadata.name

            if i.spec.ports is None \
                    or i.spec.selector is None:
                continue

            service['ports'] = i.spec.ports
            service['selector'] = i.spec.selector

            if (service['selector'].get('org') == 'kafkacluster') \
                    or (service['selector'].get('app', None) is None):
                continue

            services.append (service)

        # 在我们的情况里,每一个pod都对应一个service
        services_cache = []
        for p in kube_pods:
            if len(services) is 0:
                break

            for s in services:
                if (p['labels'].get('org') == s['selector'].get('org') \
                    and p['labels'].get('name') == s['selector'].get('name')) \
                        or (p['labels'].get('app') == s['selector'].get('app') == 'explorer'):
                    s['address'] = p['address']
                    services_cache.append(s)
                    services.remove(s)
                    break

        services = services_cache
        logger.debug("services : {}".format (services))

        results = {}

        def _peer(s):
            for port in s['ports']:
                # transfer port name which can be recognized.
                if port.name == "externale-listen-endpoint":
                    external_port = port.node_port
                    name = r_name + "_grpc"
                    value = r_template.format(external_port)

                elif port.name == "listen":
                    event_port = port.node_port
                    name = r_name + "_event"
                    value = r_template.format(event_port)

                else:
                    continue

                results[name] = value
            return

        def _ca(s):
            name = r_name + "_ecap"
            for port in s['ports']:
                _port = port.node_port
                value = r_template.format(_port)
                results[name] = value
            return

        def _orderer(s):
            name = "orderer"
            for port in s['ports']:
                _port = port.node_port
                value = r_template.format(_port)
                results[name] = value
            return

        def _explore(s):
            name = "dashboard"
            for port in s['ports']:
                _port = port.node_port
                value = r_template.format(_port)
                results[name] = value

        switch = {
            "peer": _peer,
            "orderer": _orderer,
            "ca": _ca,
            "explorer": _explore
        }

        for s in services:
            r_template = s['address'] + ":" + "{}"
            r_name = s['service_name'].replace("-", "_")
            key = s['selector'].get('role')

            if key is None:
                key = s['selector'].get('app')
            try:
                switch[key](s)
            except KeyError as e:
                pass

        logger.debug("service external port: {}".format (results))
        return results

    def _create_deployment(self, namespace, data, **kwargs):
        try:
            resp = self.extendv1client.create_namespaced_deployment(namespace,
                                                                    data,
                                                                    **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    #create a service in k8s
    def _create_service(self, namespace, data, **kwargs):
        try:
            resp = self.corev1client.create_namespaced_service(namespace,
                                                               data,
                                                               **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    #create a persistent volume in k8s
    def _create_persistent_volume_claim(self, namespace, data, **kwargs):
        try:
            resp = self.corev1client.\
                create_namespaced_persistent_volume_claim(namespace,
                                                          data,
                                                          **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    def _create_persistent_volume(self, data, **kwargs):
        try:
            resp = self.corev1client.create_persistent_volume(data, **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    def _create_namespace(self, data, **kwargs):
        try:
            resp = self.corev1client.create_namespace(data, **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    def _delete_persistent_volume_claim(self, name, namespace, data, **kwargs):
        try:
            resp = self.corev1client.\
                delete_namespaced_persistent_volume_claim(name, namespace,
                                                          data, **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    def _delete_persistent_volume(self, name, data, **kwargs):
        try:
            resp = self.corev1client.delete_persistent_volume(name, data,
                                                              **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    def _delete_service(self, name, data, namespace, **kwargs):
        try:
            # delete_namespaced_service does not need data actually.
            resp = self.corev1client.delete_namespaced_service(name,
                                                               namespace,
                                                               **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    def _delete_namespace(self, name, data, **kwargs):
        try:
            resp = self.corev1client.delete_namespace(name, data, **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

    def _delete_deployment(self, name, namespace, data, **kwargs):
        try:
            resp = self.extendv1client.\
                delete_namespaced_deployment(name, namespace,
                                             data, **kwargs)
            logger.debug(resp)
        except client.rest.ApiException as e:
            logger.error(e)
        except Exception as e:
            logger.error(e)

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
            if save != None:
                save(self._fomart_yaml_data(data))

            if kind in self.support_namespace:
                self.create_func_dict.get(kind)(namespace, data)
            else:
                self.create_func_dict.get(kind)(data)
            time.sleep(3)

    def _delete_k8s_resource(self, yaml_data):
        data = yaml_data;
        #for data in yaml_data:
        if data is None:
            # continue
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
            self.delete_func_dict.get(kind)(name, namespace, delete_data)
        else:
            self.delete_func_dict.get(kind)(name, delete_data)
        time.sleep(3)

    def _setup_cluster(self, cluster_name):
        pod_commands_1 = ["peer channel create -c mychannel -o \
                          orderer0:7050 \
                          -f resources/channel-artifacts/channel.tx",
                          "cp ./businesschannel.block \
                          ./resources/channel-artifacts -rf",
                          "env CORE_PEER_ADDRESS=peer0-org1:7051 \
                          peer channel join -b \
                          resources/channel-artifacts/businesschannel.block",
                          "env CORE_PEER_ADDRESS=peer1-org1:7051 \
                          peer channel join -b \
                          resources/channel-artifacts/businesschannel.block",
                          "peer channel update -o \
                          orderer0:7050 -c businesschannel \
                          -f resources/channel-artifacts/Org1MSPanchors.tx"
                          ]

        pod_commands_2 = ["env CORE_PEER_ADDRESS=peer0-org2:7051 \
                          peer channel join -b \
                          resources/channel-artifacts/businesschannel.block",
                          "env CORE_PEER_ADDRESS=peer1-org2:7051 \
                          peer channel join -b \
                          resources/channel-artifacts/businesschannel.block",
                          "peer channel update -o \
                          orderer0:7050 -c businesschannel \
                          -f resources/channel-artifacts/Org2MSPanchors.tx"]

        pod_list = self._filter_cli_pod_name(cluster_name)
        if len(pod_list) == 2:
            for pod in pod_list:
                if "org1" in pod:
                    for cmd in pod_commands_1:
                        time.sleep(10)
                        self._pod_exec_command(pod, cluster_name, cmd)

                elif "org2" in pod:
                    for cmd in pod_commands_2:
                        time.sleep(10)
                        self._pod_exec_command(pod, cluster_name, cmd)
                else:
                    logger.info("Unknown cli pod: {}  was found".format(pod))
        else:
            e = ("Cannot not find Kubernetes cli pods.")
            logger.error("Kubernetes cluster creation error msg: {}".format(e))
            raise Exception(e)

    def get_services_urls(self, cluster_name):
        nodes = self.corev1client.list_node ()
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

    def _get_cluster_ports(self, ports_index, external_port_start):
        logger.debug("Current exsiting cluster ports= {}".format(ports_index))
        if ports_index:
            #取出当前设置的最大端口
            current_port = int(max(ports_index)) + 5
        else:
            current_port = external_port_start

        cluster_ports = {}
        current_path = os.path.dirname(__file__)
        templates_path = os.path.join(current_path, "templates")
        for (dir_path, dir_name, file_list) in os.walk(templates_path):
            for file in file_list:
                #判断是否超出指定的端口分配范围
                if current_port > external_port_start + 100:
                    return None
                # pvc and namespace files do not have port mapping
                if ("pvc" not in file and "namespace" not in file and
                   "cli" not in file):
                    if "peer" in file:
                        if "x" in file and "y" in file:
                            continue

                        peers_ports = {}
                        peers_ports["externalPort"] = str(current_port)
                        peers_ports["chaincodePort"] = str(current_port + 1)
                        peers_ports["nodePort"] = str(current_port + 2)
                        current_port = current_port + 3
                        cluster_ports[file] = peers_ports
                    else:
                        if "x" in file and "orderer" in file:
                            continue

                        cluster_ports[file] = str(current_port)
                        current_port = current_port + 1
        logger.debug("return generated cluster ports= {}"
                     .format(cluster_ports))
        return cluster_ports


    # nfserver_ip is not neccessary beacause of the pvc had been created.
    def _deploy_node_peer(self, cluster_name, node_params, save=None):
        file_data = self._render_config_file("peerx.orgy.tpl",
                                             cluster_name,
                                             node_params,
                                             extend=True);

        yaml_data = yaml.load_all(file_data);
        self._deploy_k8s_resource(yaml_data, save);

        return

    # add a orderer
    def _deploy_node_orderer(self, cluster_name, node_params, save=None):
        file_data = self._render_config_file("ordererx.ordererorg-kafka.tpl",
                                              cluster_name,
                                              node_params,
                                              extend=True);

        yaml_data = yaml.load_all(file_data);
        self._deploy_k8s_resource(yaml_data, save);

        return

    # add a organization msp file to pv
    def deploy_org_pvc(self, cluster_name, nfsServer_ip, params, save=None):

        pv_params={
            "orgx-pvc.tpl":{
                "organizationId": params.get('orgId',""),
                "nfsServer": nfsServer_ip
            }
        }

        file_data = self._render_config_file("orgx-pvc.tpl",
                                             cluster_name, pv_params,
                                             nfsServer_ip,
                                             extend=True);

        yaml_data = yaml.load_all(file_data)
        self._deploy_k8s_resource(yaml_data, save)

        return self._get_cluster_pods(cluster_name)

    def deploy_node(self, cluster_name, ports_index,
                    external_port_start, params,
                    node_type, save=None):
        """
            add a node to one cluster that has been exists.
            create a peer or orderer node;

            :param str cluster_name: the cluster name, we can get paraments from db by the  cluster_name.
            :param json ports_index: the ports had been used.
            :param int external_port_start: the start port in the cluster that named cluster_name
            :param json params:
                    nodeId: one peer id or orderer id
                    orgId: the organization that new node belongs to
            :param str node_type: peer or orderer
        """
        # 为新增加的节点产生端口
        if ports_index:
            # 取出当前设置的最大端口
            current_port = int(max(ports_index)) + 5
        else:
            current_port = external_port_start


        if node_type==NODETYPE_PEER:
            node_params = {
                "peerx.orgy.tpl" : {
                    "externalPort": str(current_port),
                    "chaincodePort": str(current_port + 1),
                    "nodePort": str(current_port + 2),
                    "peerId": params.get('nodeId'),
                    "organizationId": params.get('orgId')
                }
            };

            self._deploy_node_peer(cluster_name,  node_params, save);
        elif node_type == NODETYPE_ORDERER:
            node_params = {
                "ordererx.ordererorg-kafka.tpl":{
                    "nodePort": str(current_port + 2),
                    "ordererId": params.get('nodeId'),
                    "organizationId": params.get('orgId')
                }
            };

            self._deploy_node_orderer(cluster_name, node_params, save);

        return self._get_cluster_pods(cluster_name)


    def _deploy_cluster_resource(self, cluster_name,
                                 cluster_ports, nfsServer_ip,
                                 consensus, save=None):
        # create namespace in advance
        file_data = self._render_config_file("namespace.tpl", cluster_name,
                                             cluster_ports, nfsServer_ip)
        yaml_data = yaml.load_all(file_data)
        self._deploy_k8s_resource(yaml_data, save)

        time.sleep(3)

        current_path = os.path.dirname(__file__)
        templates_path = os.path.join(current_path, "templates")
        for (dir_path, dir_name, file_list) in os.walk(templates_path):
            # donnot search this directory.
            if 'extend' in dir_name:
                dir_name.remove ('extend')

            for file in file_list:
                # pvc should be created at first
                if "pvc" in file:
                    file_data = self._render_config_file(file, cluster_name,
                                                         cluster_ports,
                                                         nfsServer_ip)
                    yaml_data = yaml.load_all(file_data)
                    self._deploy_k8s_resource(yaml_data, save)

            time.sleep(3)


            for file in file_list:
                # Then peers
                if "peer" in file:
                    file_data = self._render_config_file(file, cluster_name,
                                                         cluster_ports,
                                                         nfsServer_ip)
                    yaml_data = yaml.load_all(file_data)
                    self._deploy_k8s_resource(yaml_data, save)

            time.sleep(3)

            if consensus == "solo":
                file_data = self._render_config_file("orderer0.ordererorg.tpl",
                                                     cluster_name,
                                                     cluster_ports,
                                                     nfsServer_ip)
            else:
                file_data = self._render_config_file("orderer0.ordererorg-kafka.tpl",
                                                     cluster_name,
                                                     cluster_ports,
                                                     nfsServer_ip)
            yaml_data = yaml.load_all(file_data)
            self._deploy_k8s_resource(yaml_data, save)

            time.sleep(3)

            for file in file_list:
                # Then ca and cli
                if "-ca" in file or "-cli" in file:
                    file_data = self._render_config_file(file, cluster_name,
                                                         cluster_ports,
                                                         nfsServer_ip)
                    yaml_data = yaml.load_all(file_data)
                    self._deploy_k8s_resource(yaml_data, save)

            time.sleep(3)

            return

    def deploy_cluster(self, cluster_name, ports_index,
                       external_port_start, nfsServer_ip,
                       consensus, save=None):
        self._upload_config_file(cluster_name, consensus)
        time.sleep(1)

        cluster_ports = self._get_cluster_ports(ports_index, external_port_start)

        self._deploy_cluster_resource(cluster_name,
                                      cluster_ports,
                                      nfsServer_ip,
                                      consensus,
                                      save)

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

        # Execute commands for cluster
        #self._setup_cluster(cluster_name)
        time.sleep(3)

        # fabric explorer at last
        file_data = self._render_config_file("fabric-1-0-explorer.tpl",
                                             cluster_name, cluster_ports,
                                             nfsServer_ip)
        yaml_data = yaml.load_all(file_data)
        self._deploy_k8s_resource(yaml_data, save)

        time.sleep(3)

        return self._get_cluster_pods(cluster_name)

    def _delete_cluster_resource(self, docs_deployments):
        """ The order to delete the cluster is reverse to
            create except for namespace
        """
        for deployment in docs_deployments:
            self._delete_k8s_resource(deployment.data)
            time.sleep(3)
            #deployment.delete()


    def delete_cluster(self,cluster_name, docs_deployment):
        self._delete_cluster_resource(docs_deployment)
        time.sleep(2)

        self._delete_config_file(cluster_name)
        time.sleep(5)

        return True

    def stop_cluster(self, docs_deployment):
        self._delete_cluster_resource(docs_deployment)
        time.sleep(2)

        return True

    def start_cluster(self, cluster_name, doc_deployments):
        kind_dict = ['Namespace','PersistentVolume',
                     'PersistentVolumeClaim',
                     'Deployment', 'Service', ]

        explorer_datas = []
        cluster_datas=[]
        for kind in kind_dict:
            for deployment in doc_deployments:
                if deployment.kind == kind:
                    if 'explorer' in deployment.name:
                        explorer_datas.append(deployment.data)
                    else:
                        cluster_datas.append(deployment.data)

        self._deploy_k8s_resource(cluster_datas)
        #self._setup_cluster(cluster_name)
        #time.sleep(3)

        self._deploy_k8s_resource(explorer_datas)
        return self._get_cluster_pods(cluster_name)

    def _fomart_yaml_data(self, data):
        kind_dict = ['Service', 'Deployment', 'PersistentVolumeClaim',
                     'PersistentVolume', 'Namespace']

        #for data in yaml_data_set:
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