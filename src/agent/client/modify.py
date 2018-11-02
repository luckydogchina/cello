import string


def insert_kv(deep_trees, src, key, value):
    data = src
    for leaf in deep_trees:
        if isinstance(data, list):
            index = int(leaf)
            if len(data) <= index:
                return None
            else:
                data = data[index]
        elif isinstance(data, dict):
            data = data.get(leaf, None)
            if data is None:
                return None
        else:
            return None

    data[key] = value
    return src


def find_key(deep_trees, src, key):
    data = src
    for leaf in deep_trees:
        if isinstance(data, list):
            index = int(leaf)
            if len(data) <= index:
                return None
            else:
                data = data[index]
        elif isinstance(data, dict):
            data = data.get(leaf, None)
            if data is None:
                return None
        else:
            return None

    if data.get(key, None) is not None:
        return True
    else:
        return False


def delete_key(deep_trees, src, key):
    data = src
    for leaf in deep_trees:
        if isinstance(data, list):
            index = int(leaf)
            if len(data) <= index:
                return None
            else:
                data = data[index]
        elif isinstance(data, dict):
            data = data.get(leaf, None)
            if data is None:
                return None
        else:
            return None
    if data.get(key, None) is not None:
        data.pop(key)
    return src


def insert_elements(deep_trees, src, e_list):
    data = src
    for leaf in deep_trees:
        if isinstance(data, list):
            index = int(leaf)
            if len(data) <= index:
                return None
            else:
                data = data[index]
        elif isinstance(data, dict):
            data = data.get(leaf, None)
            if data is None:
                return None
        else:
            return None

    for e in e_list:
        data.append(e)

    return src


def find_element(deep_trees, src, e):
    data = src
    for leaf in deep_trees:
        if isinstance(data, list):
            index = int(leaf)
            if len(data) <= index:
                return None
            else:
                data = data[index]
        elif isinstance(data, dict):
            data = data.get(leaf, None)
            if data is None:
                return None
        else:
            return None

    if e in data:
        return True
    else:
        return False


def delete_elements(deep_trees, src, e_list):
    data = src
    for leaf in deep_trees:
        if isinstance(data, list):
            index = int(leaf)
            if len(data) <= index:
                return None
            else:
                data = data[index]
        elif isinstance(data, dict):
            data = data.get(leaf, None)
            if data is None:
                return None
        else:
            return None

    for e in e_list:
        data.remove(e)

    return src
