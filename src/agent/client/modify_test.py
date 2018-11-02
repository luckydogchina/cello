import unittest
from copy import deepcopy

from agent.client import modify

test_data = {
    "date": "2018.10.03",
    "instruction": {
        "name": "insert",
        "function": "insert",
        "alias": ["gousheng", "wangerni"]
    },
    "test": [{"class": "ModifyTest"}]
}

test_res1 = {
    "date": "2018.10.03",
    "instruction": {
        "name": "insert",
        "function": "insert",
        "alias": ["gousheng", "wangerni"],
        "moudle": "modify"
    },
    "test": [{"class": "ModifyTest"}]
}

test_res2 = {
    "date": "2018.10.03",
    "instruction": {
        "name": "insert",
        "function": "insert",
        "alias": ["gousheng", "wangerni", "ligoudan"],
    },
    "test": [{"class": "ModifyTest"}]
}

test_res3 = {
    "date": "2018.10.03",
    "instruction": {
        "name": "insert",
        "function": "insert",
        "alias": ["gousheng", "wangerni"]
    },
    "test": [{"class": "ModifyTest",
              "function": ["test_insertKV", "test_insertElements"]}]
}


class ModifyTest(unittest.TestCase):

    def test_insertKV(self):
        deep_trees = ["instruction"]
        res = modify.insert_kv(deep_trees, test_data, "moudle", "modify")
        self.assertDictEqual(res, test_res1, "test_insertKV, failure")

    def test_insertElements(self):
        deep_trees = ["instruction", "alias"]
        res = modify.insert_elements(deep_trees, test_data, ["ligoudan"])
        self.assertDictEqual(res, test_res2, "test_insertElements, failure")

    def test_delete_key(self):
        deep_tress = ["instruction"]
        res = modify.delete_key(deep_tress, test_res1, "moudle")
        self.assertDictEqual(res, test_data, "test_delete_key, failure")

    def test_delete_elements(self):
        deep_trees = ["instruction", "alias"]
        res = modify.delete_elements(deep_trees, test_res2, ["ligoudan"])
        self.assertDictEqual(res, test_data, "test_delete_elements, failure")

    def test_Unit(self):
        test_data_ = deepcopy(test_data)
        deep_trees = ["test", "0"]
        res = modify.insert_kv(deep_trees, test_data_,
                               "function", ["test_insertKV"])
        deep_trees_ = ["test", "0", "function"]
        res = modify.insert_elements(deep_trees_, res, ["test_insertElements"])
        self.assertDictEqual(res, test_res3, "test_Unit, failure")

        res = modify.delete_elements(deep_trees_, res, ["test_insertElements"])
        res = modify.delete_key(deep_trees, res, "function")
        self.assertDictEqual(res, test_data, "test_Unit, failure")
