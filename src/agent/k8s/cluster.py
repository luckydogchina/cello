# Copyright 2018 (c) VMware, Inc. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import sys

from agent import K8sClusterOperation
from agent import KubernetesOperation
from agent.k8s.cluster_operations import Params
from modules.models.host import ClusterNetwork

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from common import log_handler, LOG_LEVEL, \
    NODETYPE_ORDERER, NODETYPE_PEER, NODETYPE_CA, ELEMENT_PVC, CLUSTER_PORT_STEP, CA_PORTS_UPPER_LIMIT, \
    ORDERER_PORTS_UPPER_LIMIT

from agent import compose_up, compose_clean, compose_start, compose_stop, \
    compose_restart

from common import NETWORK_TYPES, CONSENSUS_PLUGINS_FABRIC_V1, \
    CONSENSUS_MODES, NETWORK_SIZE_FABRIC_PRE_V1, ClusterEnvelop

from ..cluster_base import ClusterBase

from modules.models import Cluster as ClusterModel
from modules.models import Container, ServicePort
from modules.models import Deployment as DeploymentModel

logger = logging.getLogger(__name__)
logger.setLevel(LOG_LEVEL)
logger.addHandler(log_handler)


class ClusterOnKubernetes(ClusterBase):
    """ Main handler to operate the cluster in Kubernetes

    """
    def __init__(self):
        pass

    def _get_cluster_info(self, cid, config=None):
        cluster = ClusterModel.objects.get(id=cid)

        cluster_name = cluster.name
        kube_config = KubernetesOperation()._get_config_from_params(cluster
                                                                    .host
                                                                    .k8s_param)

        ports_index = [service.port for service in ServicePort
                        .objects(cluster=cluster)]

        nfsServer_ip = cluster.host.k8s_param.get('K8SNfsServer')

        consensus = None
        if config is not None:
            consensus = config['consensus_plugin']

        external_port_start = cluster.external_port_start

        return cluster, cluster_name, kube_config, ports_index, external_port_start, \
            nfsServer_ip, consensus

    def create(self, cid, mapped_ports, host, config, user_id):
        try:
            cluster_network = config.get("network", None)
            if cluster_network is None:
                logger.error("the cluster network config is None.")
                return None

            # check if the port sources is enough.
            if len(cluster_network.get("orderer",{}).get("peers",[])) > CA_PORTS_UPPER_LIMIT:
                logger.error(" the number of orderer nodes is over {}.".format(CA_PORTS_UPPER_LIMIT))
                return None

            if len(cluster_network.get("application", [])) > ORDERER_PORTS_UPPER_LIMIT:
                logger.error(" the number of organization is over {}.".format(ORDERER_PORTS_UPPER_LIMIT))
                return None

            port_num = 0
            for org in cluster_network.get("application", []):
                port_num += len(org.get("peers", []))*3

            peer_ports_max = CLUSTER_PORT_STEP - CA_PORTS_UPPER_LIMIT - ORDERER_PORTS_UPPER_LIMIT
            if port_num > peer_ports_max:
                logger.error(" the number of peer ports is over {}.".format(peer_ports_max))
                return None

            if port_num > CLUSTER_PORT_STEP:
                logger.error("port_num: {} > CLUSTER_PORT_STEP {},"
                             " the ports is not enough.".format(port_num, CLUSTER_PORT_STEP))
                return None

            cluster, cluster_name, kube_config, ports_index, external_port_start, \
                nfsServer_ip, consensus = self._get_cluster_info(cid, config)

            operation = K8sClusterOperation(kube_config)
            cluster_name = self.trim_cluster_name(cluster_name)

            def _save(data):
                if data is None:
                    return ;
                deployment = DeploymentModel(id=data.get('id',""),
                                              kind=data.get('kind',""),
                                              name=data.get('name',""),
                                              data=data.get('data',{}),
                                              cluster=cluster);

                deployment.save();
                return ;

            containers = operation.deploy_cluster(cluster_name,
                                                ports_index,
                                                external_port_start,
                                                nfsServer_ip,
                                                cluster_network,
                                                _save)

        except Exception as e:
            logger.error("Failed to create Kubernetes Cluster: {}".format(e))
            return None

        return containers

    def delete(self, cid, worker_api, config, delete_config=True):
        try:
            cluster, cluster_name, kube_config, ports_index, external_port_start,\
                nfsServer_ip, consensus = self._get_cluster_info(cid, config)

            operation = K8sClusterOperation(kube_config)
            cluster_name = self.trim_cluster_name(cluster_name)
            deployments = DeploymentModel.objects(cluster=cluster)
            operation.delete_cluster(cluster_name, deployments, delete_config)

            # only delete the deployments during deleting cluster
            for deployment in deployments:
                deployment.delete()

            # delete ports for clusters
            cluster_ports = ServicePort.objects(cluster=cluster)
            if cluster_ports:
                for ports in cluster_ports:
                    ports.delete()
            cluster_containers = Container.objects(cluster=cluster)
            if cluster_containers:
                for container in cluster_containers:
                    container.delete()

        except Exception as e:
            logger.error("Failed to delete Kubernetes Cluster: {}".format(e))
            return False
        return True

    def get_services_urls(self, cid):
        try:
            cluster = ClusterModel.objects.get(id=cid)

            cluster_name = cluster.name
            kube_config = KubernetesOperation()._get_config_from_params(cluster
                                                                 .host
                                                                 .k8s_param)

            operation = K8sClusterOperation(kube_config)
            cluster_name = self.trim_cluster_name(cluster_name)
            services_urls = operation.get_services_urls(cluster_name)
        except Exception as e:
            logger.error("Failed to get Kubernetes services's urls: {}"
                         .format(e))
            return None
        return services_urls

    def start(self, name, worker_api, mapped_ports, log_type, log_level,
              log_server, config):
        try:
            cluster, cluster_name, kube_config, ports_index, external_port_start, \
                nfsServer_ip, consensus = self._get_cluster_info(name, config)

            operation = K8sClusterOperation(kube_config)
            cluster_name = self.trim_cluster_name(cluster_name)
            deployments = DeploymentModel.objects(cluster=cluster)

            containers = operation.start_cluster(cluster_name, deployments)

            if not containers:
                logger.warning("failed to start cluster={}, stop it again."
                               .format(cluster_name))
                operation.stop_cluster(cluster_name, ports_index,
                                       nfsServer_ip, consensus)
                return False

            service_urls = self.get_services_urls(name)
            # Update the service port table in db
            for k, v in service_urls.items():
                service_port = ServicePort(name=k, ip=v.split(":")[0],
                                           port=int(v.split(":")[1]),
                                           cluster=cluster)
                service_port.save()

            for k, v in containers.items():
                container = Container(id=v, name=k, cluster=cluster)
                container.save()

        except Exception as e:
            logger.error("Failed to start Kubernetes Cluster: {}".format(e))
            return False
        return True

    def stop(self, name, worker_api, mapped_ports, log_type, log_level,
             log_server, config):
        try:
            cluster, cluster_name, kube_config, ports_index, external_port_start, \
                nfsServer_ip, consensus = self._get_cluster_info(name, config)

            operation = K8sClusterOperation(kube_config)
            #cluster_name = self.trim_cluster_name(cluster_name)
            deployments = DeploymentModel.objects(cluster=cluster)
            operation.stop_cluster(deployments)

            cluster_ports = ServicePort.objects(cluster=cluster)
            for ports in cluster_ports:
                ports.delete()
            cluster_containers = Container.objects(cluster=cluster)
            for container in cluster_containers:
                container.delete()

        except Exception as e:
            logger.error("Failed to stop Kubernetes Cluster: {}".format(e))
            return False
        return True

    def _release_port(self, map_ports, node_id):
        map_ports = dict(filter(lambda x : node_id not in x[0], map_ports.items()))
        return map_ports

    def _find_free_port(self, extarnel_start_port, ports, type=""):
        param = Params ()
        if type == NODETYPE_PEER:
            candidates = [i for i in range(extarnel_start_port + 20, extarnel_start_port + 97)]
            free = lambda x : x not in ports and (x+1) not in ports and (x + 2) not in ports
            free_ports = list(filter(free, candidates))
            if len(free_ports):
                start = free_ports[0]
                ports.append(start)
                param.set("nodePort", start)
                ports.append(start + 1)
                param.set("chaincodePort", start + 1)
                ports.append(start + 2)
                param.set("eventPort", start + 2)
                return param
            else:
                logger.error("peers ports are exhausted!")
                return None
        elif type == NODETYPE_CA or type == NODETYPE_ORDERER:
            candidates = [i for i in range(extarnel_start_port, extarnel_start_port + 9)]
            free = lambda x : x not in ports not in ports
            free_ports = list(filter (free, candidates))
            if len(free_ports):
                start = free_ports[0]
                ports.append (start)
                param.set("nodePort", start)
                return param
            else:
                logger.error ("{} ports are exhausted!".format(type))
                return None
        else:
            return param

    # update to specified cluster.
    def update(self, cid, cluster_config, user_id):
        try:
            cluster, cluster_name, kube_config, ports_index, external_port_start, \
            nfs_server_ip, consensus = self._get_cluster_info(cid);
            operation = K8sClusterOperation(kube_config);

            map_ports = dict((service.name, service.port) for service in ServicePort
                              .objects(cluster=cluster))
            ports = [value for value in map_ports.values()]

            current_config = ClusterNetwork.objects.get(cluster=cluster, version=cluster.version)
            delete_list, new_list, run_upadte_config = \
                operation.update_config(cluster_name, current_config.network, cluster_config)

            for id in delete_list:
                map_ports = self._release_port(map_ports, str(id).replace("-", "_"))

            for new_element in new_list:
                param = self._find_free_port(external_port_start,
                                     ports, new_element.get("type"))

                if param is None:
                    return None

                new_element.get("params",{}).update(param)

            # new the elements
            def _save(data):
                if data is None:
                    return;
                deployment = DeploymentModel(id=data.get ('id', ""),
                                              kind=data.get ('kind', ""),
                                              name=data.get ('name', ""),
                                              data=data.get ('data', {}),
                                              cluster=cluster);

                deployment.save();
                return;

            containers = {};
            for element in new_list:
                type = element.get('type');
                params = element.get('params');

                type_dict = [NODETYPE_PEER, NODETYPE_CA, NODETYPE_ORDERER]
                if type in type_dict:
                    containers = operation.deploy_node(cluster_name, params, type, _save);
                elif type == ELEMENT_PVC:
                    operation.deploy_org_pvc(cluster_name,
                                              nfs_server_ip,
                                              params,
                                              _save);
                else:
                    logger.warning("type: {} is not supported to "
                                    "add into cluster".format(element['type']));
                    return None;

            # run the config update
            if not run_upadte_config():
                return None

            # delete the elements
            deployments = []
            for id in delete_list:
                deployment = DeploymentModel.objects(cluster=cluster, name=id)

                for item in deployment:
                    deployments.append(item)


            deployments = operation.pod_replica_delete_list(cluster_name,
                                                   delete_list,
                                                   deployments)
            operation.delete_resources(deployments)

            for deployment in deployments:
                deployment.delete()

        except Exception as e:
            logger.error ("Failed to create Kubernetes Cluster: {}".format(e));
            return None;

        return containers;


    def restart(self, name, worker_api, mapped_ports, log_type, log_level,
                log_server, config):
        result = self.stop(name, worker_api, mapped_ports, log_type, log_level,
                           log_server, config)
        if result:
            return self.start(name, worker_api, mapped_ports, log_type,
                              log_level, log_server, config)
        else:
            logger.error("Failed to Restart Kubernetes Cluster")
            return False

    # replace "_" to "-" in the cluster name
    def trim_cluster_name(self, cluster_name):
        if cluster_name.find("_") != -1:
            cluster_name = cluster_name.replace("_", "-")
        return cluster_name.lower()
