# Copyright 2018 (c) VMware, Inc. All Rights Reserved.
# SPDX-License-Identifier: Apache-2.0

import logging
import os
import sys

from agent import K8sClusterOperation
from agent import KubernetesOperation

sys.path.append(os.path.join(os.path.dirname(__file__), '..', '..'))
from common import log_handler, LOG_LEVEL, \
    NODETYPE_ORDERER, NODETYPE_PEER, NODETYPE_CA, ELEMENT_PVC

from agent import compose_up, compose_clean, compose_start, compose_stop, \
    compose_restart

from common import NETWORK_TYPES, CONSENSUS_PLUGINS_FABRIC_V1, \
    CONSENSUS_MODES, NETWORK_SIZE_FABRIC_PRE_V1

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
            cluster, cluster_name, kube_config, ports_index, external_port_start, \
                nfsServer_ip, consensus = self._get_cluster_info(cid, config)

            operation = K8sClusterOperation(kube_config)
            cluster_name = self.trim_cluster_name(cluster_name)

            def _save(data):
                if data is None:
                    return ;
                deployment = DeploymentModel (id=data.get('id',""),
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
                                                consensus,
                                                _save)

        except Exception as e:
            logger.error("Failed to create Kubernetes Cluster: {}".format(e))
            return None
        return containers

    def delete(self, cid, worker_api, config):
        try:
            cluster, cluster_name, kube_config, ports_index, external_port_start,\
                nfsServer_ip, consensus = self._get_cluster_info(cid, config)

            operation = K8sClusterOperation(kube_config)
            cluster_name = self.trim_cluster_name(cluster_name)
            deployments = DeploymentModel.objects (cluster=cluster)
            operation.delete_cluster(cluster_name, deployments)

            # only delete the deployments during deleting cluster
            for deployment in deployments:
                deployment.delete ()

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

    #add a element to specified cluster.
    def add(self, cid, element, user_id):
        try:
            cluster, cluster_name, kube_config, ports_index, external_port_start, \
            nfsServer_ip, consensus = self._get_cluster_info(cid);
            operation = K8sClusterOperation(kube_config);

            def _save(data):
                if data is None:
                    return;
                deployment = DeploymentModel(id=data.get('id', ""),
                                              kind=data.get('kind', ""),
                                              name=data.get('name', ""),
                                              data=data.get('data', {}),
                                              cluster=cluster);

                deployment.save();
                return;

            containers = {};
            type = element.get('type');
            params = element.get('params');

            type_dict = [NODETYPE_PEER, NODETYPE_CA, NODETYPE_ORDERER]
            if type in type_dict:
                containers = operation.deploy_node(cluster_name,
                                                ports_index,
                                                external_port_start,
                                                params,
                                                type,
                                                 _save);
            elif type == ELEMENT_PVC:
                operation.deploy_org_pvc(cluster_name,
                                         nfsServer_ip,
                                         params,
                                         _save);
            else:
                logger.warning("type: {} is not supported to "
                               "add into cluster".format(element['type']));
                return None;

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
