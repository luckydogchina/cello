import json
import unittest
from copy import deepcopy

from agent.client import crypto_client
from agent.client import modify

from common import Organization, \
    ClusterNetwork, ClusterEnvelop, \
    ClusterUpdateV1, ChannelComputeUpdateV1


org1 = Organization("org1","org1.example.com", ["peer0","peer1"], "peer0")
org2 = Organization("org2","org2.example.com", ["peer0","peer1"], "peer0")
org3 = Organization("org3","org3.example.com", ["peer0","peer1"], "peer0")
ordererOrg = Organization("ordererOrg","orderer.example.com",["orderer0"])

net_work = ClusterNetwork(version="fabric-1.2", orderer=ordererOrg, application=[org2, org1])
env = ClusterEnvelop(cluster_id="test_python", net_work=net_work)

net_work_update = ClusterNetwork(version="fabric-1.2", orderer=ordererOrg, application=[org2, org1, org3])
env_update = ClusterEnvelop(cluster_id="test_python", net_work=net_work_update)



class ClientTest(unittest.TestCase):

    def test_init_fabric(self):
        respond = crypto_client.init_fabric_network(env)
        self.assertEqual(respond.code, 200, respond)
        respond.close()

    def test_fetch_network(self):
        respond = crypto_client.fetch_fabric_network("test_python")
        self.assertEqual(respond.code, 200, respond)
        decode = json.loads(respond.fp.read().decode('utf-8'))
        print(decode)
        respond.close()
        # client.responses
        # respond.fd

    def test_update(self):

        respond = crypto_client.update_fabric_network(env_update)
        self.assertEqual(respond.code, 200, respond)
        respond.close()

    def test_print_org(self):
        respond = crypto_client.fetch_organization_config("test_python", "org3")
        self.assertEqual(respond.code, 200, respond)
        decode = json.loads(respond.fp.read().decode('utf-8'))
        print(decode)
        respond.close()
        return decode

    def test_decode_config(self):
        try:
            config_block = open("./sources/genesis.block","rb+")
            data = config_block.read()
            respond = crypto_client.decode_config_protobuf(data, "fabric-1.2")
            self.assertEqual(respond.code, 200, respond)
            decode = json.loads(respond.fp.read().decode('utf-8'))
            print(decode)
            respond.close()
            return decode
        finally:
            if config_block:
                config_block.close()

    def test_compute_update(self):
        config = self.test_decode_config()
        org = self.test_print_org()

        deepTrees = ["channel_group","groups","Consortiums",
			"groups","SampleConsortium","groups"]

        original = deepcopy(config)

        modified = modify.insert_kv(deepTrees, config, "Org3", org)
        print(modified)

        compute_update = ChannelComputeUpdateV1(original, modified)
        respond = crypto_client.compute_update(compute_update, "fabric-1.2", "e2e-orderer-syschan")
        self.assertEqual(respond.code, 200, respond)

        print(respond.fp.read())
        respond.close()



    def test_delete(self):
        respond = crypto_client.delete_fabric_network("first")
        self.assertEqual (respond.code, 200, respond)
