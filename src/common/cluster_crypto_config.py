class cluster(dict):
    def __init__(self):
        super(cluster, self).__init__()

    def __setattr__(self, key, value):
        self[key] = value


class Organization(cluster):
    org_name = str
    domain = str
    peers_num = int

    def __init__(self, org_name, domain, peers, anchor_peer=""):
        self.__setattr__("org_name", org_name)
        self.__setattr__("domain", domain)
        self.__setattr__("peers", peers)
        self.__setattr__("anchor_peer", anchor_peer)
        super(Organization, self).__init__()


class ClusterNetwork(cluster):

    def __init__(self, version=0, orderer={},
                 application=[], consensus="solo"):

        self.__setattr__("orderer", orderer)
        self.__setattr__("application", application)
        self.__setattr__("version", version)
        self.__setattr__("consensus", consensus)

        super(ClusterNetwork, self).__init__()


class ClusterEnvelop(cluster):

    def __init__(self, cluster_id, net_work):
        self.__setattr__("id", cluster_id)
        self.__setattr__("net_work", net_work)
        super(ClusterEnvelop, self).__init__()


class ClusterUpdateV1(cluster):

    def __init__(self, id, channel=None, org={}, orderers_num=None):
        self.__setattr__("id", id)
        self.__setattr__("channel", channel)
        self.__setattr__("org", org)
        self.__setattr__("orderers_num", orderers_num)
        super(cluster, self).__init__()


class ChannelComputeUpdateV1(object):
    def __init__(self, original={}, update={}):
        self.__setattr__("original", original)
        self.__setattr__("update", update)
