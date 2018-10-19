import urllib.request
import json.encoder

from common import ChannelComputeUpdateV1

UPDATE_PEERS = "peers"
UPDATE_ORDERDERS= "orderers"
UPDATE_ORGANIZATION = "organization"

cry_services_url = "http://127.0.0.1:9906"


def init_fabric_network(envelop):
    try:
        data = json.dumps(envelop, default=lambda x: x.__dict__)
        cry_init_url = cry_services_url + "/v1_1/init?recreate=false"
        cry_init_request = urllib.request.Request(cry_init_url, data=bytes(data.encode()), method="POST")
        respond = urllib.request.urlopen(cry_init_request)
        urllib.request.urlcleanup()
        return respond
    except urllib.request.HTTPError as e:
        return e


def update_fabric_network(update):
    try:
        data = json.dumps(update, default=lambda x: x.__dict__)
        cry_update_url = cry_services_url + "/v1_1/update"
        cry_update_request = urllib.request.Request(cry_update_url, data=bytes(data.encode()), method="POST")
        respond = urllib.request.urlopen(cry_update_request)
        urllib.request.urlcleanup()
        return respond
    except urllib.request.HTTPError as e:
        return e


def fetch_fabric_network(cluster_id):
    try:
        cry_fetch_url = cry_services_url + "/v1_1/fetch/network?cluster=" + cluster_id
        cry_fetch_request = urllib.request.Request(cry_fetch_url,  method="GET")
        respond = urllib.request.urlopen(cry_fetch_request)

        #urllib.request.urlcleanup()
        return respond
    except (urllib.request.HTTPError, ) as e:
        return e


def delete_fabric_network(cluster_id):
    try:
        cry_delete_url = cry_services_url + "/v1/delete?cluster=" + cluster_id
        cry_delete_request = urllib.request.Request(cry_delete_url, method="DELETE")
        respond = urllib.request.urlopen(cry_delete_request)
        urllib.request.urlcleanup()
        return respond
    except urllib.request.HTTPError as e:
        return e


def fetch_organization_config(cluster_id, organization_id):
    try:
        cry_print_org_url = cry_services_url + "/v1_1/config/update/print_org?" + \
                           "cluster=" + cluster_id + "&org=" + organization_id
        cry_print_org_request = urllib.request.Request(cry_print_org_url, method="GET")
        respond = urllib.request.urlopen(cry_print_org_request)
        # urllib.request.urlcleanup()
        return respond
    except urllib.request.HTTPError as e:
        return e

def decode_config_protobuf(data, version):
    try:
        cry_decode_url = cry_services_url + "/v1/config/update/decode_config?" + \
                            "version=" + version
        cry_decode_request = urllib.request.Request(cry_decode_url, method="GET", data=data)
        respond = urllib.request.urlopen(cry_decode_request)
        # urllib.request.urlcleanup()
        return respond
    except urllib.request.HTTPError as e:
        return e

def compute_update(update, version, channel):
    try:
        data = json.dumps(update, default=lambda x: x.__dict__)
        cry_compute_url = cry_services_url + "/v1/config/update/compute_update?" + \
                          "version="+ version + "&channel=" + channel
        header ={"Content-Length": len(bytes(data.encode()))}
        cry_compute_request = urllib.request.Request(cry_compute_url,
                                                     data=bytes(data.encode()),
                                                     method="GET",)
        respond = urllib.request.urlopen(cry_compute_request)
        # urllib.request.urlcleanup()
        return respond
    except urllib.request.HTTPError as e:
        return e
