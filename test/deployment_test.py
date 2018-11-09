import datetime
import os
import shutil
import time
import unittest
import deployment
from agent.k8s.cluster_operations import Params, Element
from common import NETWORK_TYPE_FABRIC_V1_2, \
    ClusterNetwork, Organization
from modules.models import Deployment as DeploymentModel, ServicePort
from modules import host_handler, cluster_handler

org1 = Organization("Org1", "org1.example.com",
                    ["peer0", "peer1"], "peer0")

org2 = Organization("Org2", "org2.example.com",
                    ["peer0", "peer1"], "peer0")

org3 = Organization("Org3", "org3.example.com",
                    ["peer0", "peer1"], "peer0")

org4 = Organization("Org4", "org4.example.com",
                    ["peer0", "peer1"], "peer0")

ordererOrg = Organization("OrdererOrg",
                          "orderer.example.com",
                          ["orderer0"])

org1_update = Organization("Org1", "org1.example.com",
                           ["peer0", "peer2"], "peer0")

net_work = ClusterNetwork(version=NETWORK_TYPE_FABRIC_V1_2,
                          orderer=ordererOrg,
                          application=[org2, org1])

net_work_update = ClusterNetwork(version=NETWORK_TYPE_FABRIC_V1_2,
                                 orderer=ordererOrg,
                                 application=[org1_update, org3])

net_work_update1 = ClusterNetwork(version=NETWORK_TYPE_FABRIC_V1_2,
                                  orderer=ordererOrg,
                                  application=[org4, org3])

ordererKafkaOrg = Organization("OrdererOrg",
                               "orderer.example.com",
                               ["orderer0",
                                "orderer1",
                                "orderer2"])

net_work_kafka = ClusterNetwork(version=NETWORK_TYPE_FABRIC_V1_2,
                                orderer=ordererKafkaOrg,
                                application=[org2, org1])


class DeploymentTest(unittest.TestCase):
    def test_deployment_save(self):
        objectId = deployment.deployment_save()
        self.assertIsNotNone(objectId, "save to db fauilre")

    def test_create_cluster(self):
        net_work.consensus = deployment.cluster_config.consensus_plugin
        deployment.cluster_config.network(net_work)
        host_id = deployment.list_host("test")
        if host_id is None:
            deployment.create_host('test',
                                   deployment.k8s_host_param_config_yjy)
            host_id = deployment.list_host("test")

        deployment.create_cluster("first", host_id, deployment.cluster_config)

    def test_create_kafka_cluster(self):
        net_work_kafka.consensus = \
            deployment.cluster_config_kafka.consensus_plugin

        deployment.cluster_config_kafka.network(net_work_kafka)
        host_id = deployment.list_host("k8s")
        if host_id is None:
            deployment.create_host('k8s',
                                   deployment.k8s_host_param_config_yjy)

            host_id = deployment.list_host("k8s")

        deployment.create_cluster("first-kafka", host_id,
                                  deployment.cluster_config_kafka)

    def test_update_cluster(self):
        net_work.consensus = deployment.cluster_config.consensus_plugin
        deployment.cluster_config.network(net_work)
        host_id = deployment.list_host()
        if host_id is None:
            deployment.create_host()
            host_id = deployment.list_host()

        cluster_id = deployment.list_cluster()
        if cluster_id is None:
            self.skipTest()
        # deployment.update_cluster(cluster_id, host_id, net_work_update)
        # time.sleep(10)
        deployment.update_cluster(cluster_id, host_id, net_work_update1)

    def test_delete_cluster(self):
        host_id = deployment.list_host('test')
        if host_id is None:
            self.skipTest()
        cluster_id = deployment.list_cluster('first')
        deployment.delete_cluster(cluster_id)

    def test_delete_cluster_kafka(self):
        host_id = deployment.list_host('k8s')
        if host_id is None:
            self.skipTest()
        cluster_id = deployment.list_cluster('first-kafka');
        deployment.delete_cluster(cluster_id)

    def test_delete_deployment(self):
        host_id = deployment.list_host()
        if host_id is None:
            self.skipTest()
        cluster_id = deployment.list_cluster();
        if cluster_id is None:
            self.skipTest()
        deployment.delete_deployments(cluster_id);

    def test_delete_service(self):
        host_id = deployment.list_host()
        if host_id is None:
            self.skipTest()
        cluster_id = deployment.list_cluster();
        if cluster_id is None:
            self.skipTest()
        deployment.delete_services(cluster_id);

    def test_delete_namespace(self):
        deployment.delete_namespace()

    def test_delete_replica_set(self):
        deployment.delete_replica_set()

    def test_addnode(self):
        host_id = deployment.list_host()

        if host_id is None:
            self.skipTest()
        cluster_id = deployment.list_cluster()

        if cluster_id is None:
            self.skipTest()

        deployment.add_peer(cluster_id, host_id)

    def test_service_url(self):
        host_id = deployment.list_host()
        if host_id is None:
            self.skipTest()
        cluster_id = deployment.list_cluster();
        if cluster_id is None:
            self.skipTest()
        deployment.service_url("first", deployment.k8s_host_param_config_yjy)

    def test_rest(self):
        cluster_id = deployment.list_cluster('first');
        if cluster_id is None:
            self.skipTest()

        deployment.reset_cluster(cluster_id)

    def test_rest_kafka(self):
        cluster_id = deployment.list_cluster('first-kafka')
        if cluster_id is None:
            self.skipTest()

        deployment.reset_cluster(cluster_id)

    def test_find_one_of(self):
        deployment.find_one_of()
        return

    def test_list_namespaces(self):
        deployment.list_namespaces()

    # def _check_containers(self, containers, new_list, delete_list):
    #     lambda x:
    #     pass