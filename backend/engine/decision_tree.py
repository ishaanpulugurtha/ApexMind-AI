"""Decision tree loader and traversal."""

import json
from pathlib import Path

from backend.config import TREE_REGISTRY

DATA_DIR = Path(__file__).parent.parent / "data"
_trees: dict[str, dict] = {}


def _load_tree(filename: str) -> dict:
    if filename not in _trees:
        path = DATA_DIR / filename
        _trees[filename] = json.loads(path.read_text(encoding="utf-8"))
    return _trees[filename]


def get_tree(sport: str, position: str) -> dict:
    key = (sport, position)
    filename = TREE_REGISTRY.get(key)
    if not filename:
        raise ValueError(f"No decision tree for {sport} / {position}")
    return _load_tree(filename)


def get_node(tree: dict, node_id: str) -> dict:
    node = tree["nodes"].get(node_id)
    if not node:
        raise ValueError(f"Unknown node: {node_id}")
    return node


def get_start_node(tree: dict) -> dict:
    return get_node(tree, tree["start_node"])


def find_choice(node: dict, choice_id: str) -> dict | None:
    for choice in node.get("choices", []):
        if choice["id"] == choice_id:
            return choice
    return None


def node_to_response(node: dict, match_state: dict) -> dict:
    """Serialize node for API — strips integrity weights from client."""
    return {
        "node_id": node["id"],
        "round": node["round"],
        "scenario_text": node["scenario_text"],
        "scenario_headline": node.get("scenario_headline", ""),
        "scenario_scan": node.get("scenario_scan", ""),
        "pitch": node.get("pitch", {}),
        "choices": [
            {
                "id": c["id"],
                "label": c["label"],
                "tradeoff": c["tradeoff"],
            }
            for c in node.get("choices", [])
        ],
        "match_state": {
            "time_left": match_state["time_left"],
            "score_differential": match_state["score_differential"],
            "pressure": match_state["pressure"],
            "catalyst": match_state["catalyst"],
        },
    }
