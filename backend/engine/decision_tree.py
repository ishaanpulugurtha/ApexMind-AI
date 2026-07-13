"""Decision tree loader and traversal."""

import json
import random
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


def pick_entry_node(tree: dict, catalyst: str | None = None) -> dict:
    """
    Randomly select a Round 1 entry node for replay variety.

    Uses catalyst-weighted pool when defined, otherwise entry_nodes list.
    """
    nodes = tree["nodes"]
    by_catalyst = tree.get("catalyst_entries", {})
    pool = by_catalyst.get(catalyst or "", []) if catalyst else []

    if not pool:
        pool = tree.get("entry_nodes", [tree["start_node"]])

    pool = [nid for nid in pool if nid in nodes]
    if not pool:
        pool = [tree["start_node"]]

    node_id = random.choice(pool)
    return get_node(tree, node_id)


def pick_final_node(tree: dict, match_state: dict | None = None) -> dict:
    """Pick Round 3 finale weighted by live score — no 'protect lead' when down."""
    nodes = tree["nodes"]
    pool = tree.get("final_nodes", ["r3_final"])
    pool = [nid for nid in pool if nid in nodes]
    if not pool:
        pool = ["r3_final"]

    score_idx = match_state.get("score_index", 2) if match_state else 2
    if score_idx >= 3:
        preferred = [n for n in pool if n in ("r3_final_lead", "r3_final_counter")]
    elif score_idx <= 1:
        preferred = [n for n in pool if n in ("r3_final", "r3_final_counter")]
    else:
        preferred = pool

    pick_from = preferred if preferred else pool
    return get_node(tree, random.choice(pick_from))


def resolve_next_node(
    tree: dict, next_node_id: str | None, match_state: dict | None = None
) -> str | None:
    """Map pool tokens (e.g. r3_pool) to concrete node ids."""
    if next_node_id == "r3_pool":
        return pick_final_node(tree, match_state)["id"]
    return next_node_id


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
            "your_score": match_state.get("your_score", 1),
            "their_score": match_state.get("their_score", 1),
            "pressure": match_state["pressure"],
            "catalyst": match_state["catalyst"],
        },
    }
