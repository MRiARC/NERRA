"""Neo4j Graph Service — Milestone 2.1.

Projects the curated Postgres story tables (Source of Truth) into a dedicated
Neo4j 5 Graph DB container (`bolt://127.0.0.1:7687`), enabling native Cypher
multi-hop traversals, relationship evolution queries, and visual inspection
in Neo4j Browser (`http://localhost:7474`).

Gracefully degrades to an in-process SQL graph projection whenever Neo4j is
disabled or unreachable (e.g. in isolated CI / unit tests).
"""

import logging
import uuid
from typing import Any

from sqlalchemy.orm import Session

from app.config import settings

logger = logging.getLogger(__name__)

_driver = None


def _get_driver():
    global _driver
    if not settings.neo4j_enabled:
        return None
    if _driver is not None:
        return _driver
    try:
        from neo4j import GraphDatabase
    except ImportError:
        logger.warning("neo4j driver not installed; falling back to SQL graph projection")
        return None

    try:
        _driver = GraphDatabase.driver(
            settings.neo4j_uri,
            auth=(settings.neo4j_user, settings.neo4j_password),
            connection_timeout=2.0,
        )
        return _driver
    except Exception as exc:  # noqa: BLE001
        logger.warning("Failed to create Neo4j driver: %s", exc)
        return None


def is_neo4j_connected() -> bool:
    """Return True if the Neo4j Bolt endpoint responds cleanly."""
    driver = _get_driver()
    if driver is None:
        return False
    try:
        driver.verify_connectivity()
        return True
    except Exception as exc:  # noqa: BLE001
        logger.debug("Neo4j connectivity check failed: %s", exc)
        return False


def _build_projection_from_sql(
    db: Session, project_id: uuid.UUID, max_chapter: int | None = None
) -> tuple[list[dict[str, Any]], list[dict[str, Any]], int]:
    """Read Postgres story tables and build canonical node & edge lists."""
    from app.models import Character, Location, PlotThread, Relationship, StoryEvent, StoryObject
    from app.services import plot_threads

    cust_graph = plot_threads.get_customization(db, project_id).get("custom_graph_write") or {}
    include_threads = cust_graph.get("include_plot_threads", True)
    project_tag = cust_graph.get("project_tag")

    chars = db.query(Character).filter(Character.project_id == project_id).all()
    locs = db.query(Location).filter(Location.project_id == project_id).all()
    objs = db.query(StoryObject).filter(StoryObject.project_id == project_id).all()
    events = db.query(StoryEvent).filter(StoryEvent.project_id == project_id).all()
    rels = db.query(Relationship).filter(Relationship.project_id == project_id).all()
    threads = db.query(PlotThread).filter(PlotThread.project_id == project_id).all() if include_threads else []

    highest_chapter = 1
    for c in chars:
        if c.last_chapter:
            highest_chapter = max(highest_chapter, c.last_chapter)
        if c.first_chapter:
            highest_chapter = max(highest_chapter, c.first_chapter)
    for ev in events:
        highest_chapter = max(highest_chapter, ev.chapter_number)
    for rel in rels:
        if rel.chapter:
            highest_chapter = max(highest_chapter, rel.chapter)

    def _in_window(ch: int | None) -> bool:
        if max_chapter is None or ch is None:
            return True
        return ch <= max_chapter

    nodes: list[dict[str, Any]] = []
    edges: list[dict[str, Any]] = []

    char_by_id: dict[str, str] = {}
    char_by_name: dict[str, str] = {}
    for c in chars:
        if not _in_window(c.first_chapter):
            continue
        cid = f"char:{c.id}"
        char_by_id[str(c.id)] = cid
        char_by_name[c.name.strip().lower()] = cid
        for alias in c.aliases or []:
            char_by_name[alias.strip().lower()] = cid
        nodes.append(
            {
                "id": cid,
                "label": c.name,
                "kind": "character",
                "chapter": c.first_chapter,
                "metadata": {
                    "status": c.status,
                    "aliases": c.aliases or [],
                    "physical_traits": c.physical_traits or {},
                    "first_chapter": c.first_chapter,
                    "last_chapter": c.last_chapter,
                    "description": c.description,
                },
            }
        )

    loc_by_name: dict[str, str] = {}
    for loc in locs:
        if not _in_window(loc.first_chapter):
            continue
        lid = f"loc:{loc.id}"
        loc_by_name[loc.name.strip().lower()] = lid
        nodes.append(
            {
                "id": lid,
                "label": loc.name,
                "kind": "location",
                "chapter": loc.first_chapter,
                "metadata": {"description": loc.description},
            }
        )

    for obj in objs:
        if not _in_window(obj.first_chapter):
            continue
        oid = f"obj:{obj.id}"
        mentions = [m for m in (obj.mention_chapters or []) if _in_window(m)]
        nodes.append(
            {
                "id": oid,
                "label": obj.name,
                "kind": "object",
                "chapter": obj.first_chapter,
                "metadata": {
                    "description": obj.description,
                    "mention_chapters": mentions,
                },
            }
        )

    for ev in events:
        if not _in_window(ev.chapter_number):
            continue
        eid = f"event:{ev.id}"
        nodes.append(
            {
                "id": eid,
                "label": ev.summary[:60] + ("..." if len(ev.summary) > 60 else ""),
                "kind": "event",
                "chapter": ev.chapter_number,
                "metadata": {
                    "summary": ev.summary,
                    "participants": ev.participants or [],
                    "location": ev.location,
                },
            }
        )
        for p_name in ev.participants or []:
            c_node_id = char_by_name.get(p_name.strip().lower())
            if c_node_id:
                edges.append(
                    {
                        "id": f"part:{ev.id}:{c_node_id}",
                        "source": c_node_id,
                        "target": eid,
                        "relation": "PARTICIPATED_IN",
                        "sentiment": "neutral",
                        "since_chapter": ev.chapter_number,
                        "until_chapter": None,
                        "description": f"Chapter {ev.chapter_number}",
                    }
                )
        if ev.location:
            l_node_id = loc_by_name.get(ev.location.strip().lower())
            if l_node_id:
                edges.append(
                    {
                        "id": f"loc_ev:{ev.id}:{l_node_id}",
                        "source": eid,
                        "target": l_node_id,
                        "relation": "OCCURRED_AT",
                        "sentiment": "neutral",
                        "since_chapter": ev.chapter_number,
                        "until_chapter": None,
                        "description": f"Chapter {ev.chapter_number}",
                    }
                )

    for rel in rels:
        if not _in_window(rel.chapter):
            continue
        src = char_by_id.get(str(rel.character_a_id))
        dst = char_by_id.get(str(rel.character_b_id))
        if not src or not dst:
            continue
        edges.append(
            {
                "id": f"rel:{rel.id}",
                "source": src,
                "target": dst,
                "relation": rel.type,
                "sentiment": getattr(rel, "sentiment", "neutral") or "neutral",
                "since_chapter": rel.chapter,
                "until_chapter": getattr(rel, "until_chapter", None),
                "description": rel.description,
            }
        )

    for th in threads:
        if not _in_window(th.setup_chapter):
            continue
        tid = f"thread:{th.id}"
        nodes.append(
            {
                "id": tid,
                "label": th.title,
                "kind": "plot_thread",
                "chapter": th.setup_chapter,
                "metadata": {
                    "status": th.status,
                    "description": th.description,
                    "setup_chapter": th.setup_chapter,
                    "payoff_chapter": th.payoff_chapter,
                    "project_tag": project_tag,
                },
            }
        )
        for ent in th.related_entities or []:
            c_node_id = char_by_name.get(ent.strip().lower())
            if c_node_id:
                edges.append(
                    {
                        "id": f"th_ent:{th.id}:{c_node_id}",
                        "source": tid,
                        "target": c_node_id,
                        "relation": "THREAD_INVOLVES",
                        "sentiment": "neutral",
                        "since_chapter": th.setup_chapter,
                        "until_chapter": th.payoff_chapter,
                        "description": th.status,
                    }
                )

    if project_tag:
        for n in nodes:
            if isinstance(n.get("metadata"), dict):
                n["metadata"]["project_tag"] = project_tag

    return nodes, edges, highest_chapter


def sync_project_graph(db: Session, project_id) -> dict[str, Any]:
    """Idempotently sync the project's Postgres story world into Neo4j."""
    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    pid_str = str(pid)
    nodes, edges, highest_chapter = _build_projection_from_sql(db, pid, max_chapter=None)

    connected = is_neo4j_connected()
    if not connected:
        return {
            "synced": True,
            "neo4j_connected": False,
            "nodes": len(nodes),
            "edges": len(edges),
            "max_chapter": highest_chapter,
        }

    driver = _get_driver()
    assert driver is not None

    with driver.session() as session:
        # Clear project subgraph before clean re-projection
        session.run("MATCH (n {project_id: $pid}) DETACH DELETE n", pid=pid_str)

        # Upsert vertices grouped by kind
        chars = [n for n in nodes if n["kind"] == "character"]
        locs = [n for n in nodes if n["kind"] == "location"]
        objs = [n for n in nodes if n["kind"] == "object"]
        events = [n for n in nodes if n["kind"] == "event"]
        threads = [n for n in nodes if n["kind"] == "plot_thread"]

        if chars:
            session.run(
                """
                UNWIND $rows AS row
                CREATE (c:Character:StoryEntity {
                    id: row.id,
                    project_id: $pid,
                    name: row.label,
                    chapter: row.chapter,
                    status: row.metadata.status,
                    first_chapter: row.metadata.first_chapter,
                    last_chapter: row.metadata.last_chapter,
                    description: row.metadata.description
                })
                """,
                rows=chars,
                pid=pid_str,
            )

        if locs:
            session.run(
                """
                UNWIND $rows AS row
                CREATE (l:Location:StoryEntity {
                    id: row.id,
                    project_id: $pid,
                    name: row.label,
                    chapter: row.chapter,
                    description: row.metadata.description
                })
                """,
                rows=locs,
                pid=pid_str,
            )

        if objs:
            session.run(
                """
                UNWIND $rows AS row
                CREATE (o:Object:StoryEntity {
                    id: row.id,
                    project_id: $pid,
                    name: row.label,
                    chapter: row.chapter,
                    description: row.metadata.description
                })
                """,
                rows=objs,
                pid=pid_str,
            )

        if events:
            session.run(
                """
                UNWIND $rows AS row
                CREATE (e:Event:StoryEntity {
                    id: row.id,
                    project_id: $pid,
                    name: row.label,
                    chapter: row.chapter,
                    summary: row.metadata.summary
                })
                """,
                rows=events,
                pid=pid_str,
            )

        if threads:
            session.run(
                """
                UNWIND $rows AS row
                CREATE (t:PlotThread:StoryEntity {
                    id: row.id,
                    project_id: $pid,
                    name: row.label,
                    chapter: row.chapter,
                    status: row.metadata.status,
                    description: row.metadata.description,
                    payoff_chapter: row.metadata.payoff_chapter
                })
                """,
                rows=threads,
                pid=pid_str,
            )

        # Create edges
        rel_edges = [e for e in edges if e["relation"] not in ("PARTICIPATED_IN", "OCCURRED_AT", "THREAD_INVOLVES")]
        part_edges = [e for e in edges if e["relation"] == "PARTICIPATED_IN"]
        loc_edges = [e for e in edges if e["relation"] == "OCCURRED_AT"]
        thread_edges = [e for e in edges if e["relation"] == "THREAD_INVOLVES"]

        if rel_edges:
            session.run(
                """
                UNWIND $rows AS row
                MATCH (a:StoryEntity {id: row.source, project_id: $pid})
                MATCH (b:StoryEntity {id: row.target, project_id: $pid})
                CREATE (a)-[:RELATED_TO {
                    id: row.id,
                    relation: row.relation,
                    sentiment: row.sentiment,
                    since_chapter: row.since_chapter,
                    until_chapter: row.until_chapter,
                    description: row.description
                }]->(b)
                """,
                rows=rel_edges,
                pid=pid_str,
            )

        if part_edges:
            session.run(
                """
                UNWIND $rows AS row
                MATCH (a:StoryEntity {id: row.source, project_id: $pid})
                MATCH (b:StoryEntity {id: row.target, project_id: $pid})
                CREATE (a)-[:PARTICIPATED_IN {
                    id: row.id,
                    since_chapter: row.since_chapter,
                    description: row.description
                }]->(b)
                """,
                rows=part_edges,
                pid=pid_str,
            )

        if loc_edges:
            session.run(
                """
                UNWIND $rows AS row
                MATCH (a:StoryEntity {id: row.source, project_id: $pid})
                MATCH (b:StoryEntity {id: row.target, project_id: $pid})
                CREATE (a)-[:OCCURRED_AT {
                    id: row.id,
                    since_chapter: row.since_chapter,
                    description: row.description
                }]->(b)
                """,
                rows=loc_edges,
                pid=pid_str,
            )

        if thread_edges:
            session.run(
                """
                UNWIND $rows AS row
                MATCH (a:StoryEntity {id: row.source, project_id: $pid})
                MATCH (b:StoryEntity {id: row.target, project_id: $pid})
                CREATE (a)-[:THREAD_INVOLVES {
                    id: row.id,
                    since_chapter: row.since_chapter,
                    status: row.description
                }]->(b)
                """,
                rows=thread_edges,
                pid=pid_str,
            )

    return {
        "synced": True,
        "neo4j_connected": True,
        "nodes": len(nodes),
        "edges": len(edges),
        "max_chapter": highest_chapter,
    }


def get_project_graph(
    db: Session, project_id, max_chapter: int | None = None, force_sync: bool = False
) -> dict[str, Any]:
    """Return nodes and edges for a project, backed by Neo4j Cypher when available."""
    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    pid_str = str(pid)

    connected = is_neo4j_connected()
    if connected:
        driver = _get_driver()
        assert driver is not None
        with driver.session() as session:
            count_res = session.run(
                "MATCH (n:StoryEntity {project_id: $pid}) RETURN count(n) AS cnt",
                pid=pid_str,
            ).single()
            if force_sync or (count_res and count_res["cnt"] == 0):
                sync_project_graph(db, pid)

            # Query nodes filtered by chapter
            node_rows = session.run(
                """
                MATCH (n:StoryEntity {project_id: $pid})
                WHERE $max_ch IS NULL OR n.chapter IS NULL OR n.chapter <= $max_ch
                RETURN n.id AS id, n.name AS label, labels(n) AS labels,
                       n.chapter AS chapter, properties(n) AS props
                """,
                pid=pid_str,
                max_ch=max_chapter,
            )
            nodes: list[dict[str, Any]] = []
            for row in node_rows:
                lbls = row["labels"]
                kind = "character"
                if "Location" in lbls:
                    kind = "location"
                elif "Object" in lbls:
                    kind = "object"
                elif "Event" in lbls:
                    kind = "event"
                props = dict(row["props"] or {})
                for drop_k in ("id", "project_id", "name", "chapter"):
                    props.pop(drop_k, None)
                nodes.append(
                    {
                        "id": row["id"],
                        "label": row["label"],
                        "kind": kind,
                        "chapter": row["chapter"],
                        "metadata": props,
                    }
                )

            edge_rows = session.run(
                """
                MATCH (a:StoryEntity {project_id: $pid})-[r]->(b:StoryEntity {project_id: $pid})
                WHERE ($max_ch IS NULL OR r.since_chapter IS NULL OR r.since_chapter <= $max_ch)
                  AND ($max_ch IS NULL OR a.chapter IS NULL OR a.chapter <= $max_ch)
                  AND ($max_ch IS NULL OR b.chapter IS NULL OR b.chapter <= $max_ch)
                RETURN a.id AS source, b.id AS target, type(r) AS rel_type, properties(r) AS props
                """,
                pid=pid_str,
                max_ch=max_chapter,
            )
            edges: list[dict[str, Any]] = []
            for row in edge_rows:
                props = dict(row["props"] or {})
                edges.append(
                    {
                        "id": props.get("id", f"{row['source']}->{row['target']}"),
                        "source": row["source"],
                        "target": row["target"],
                        "relation": props.get("relation", row["rel_type"]),
                        "sentiment": props.get("sentiment", "neutral"),
                        "since_chapter": props.get("since_chapter"),
                        "until_chapter": props.get("until_chapter"),
                        "description": props.get("description"),
                    }
                )

            max_ch_row = session.run(
                "MATCH (n:StoryEntity {project_id: $pid}) RETURN coalesce(max(n.chapter), 1) AS m",
                pid=pid_str,
            ).single()
            highest_chapter = int(max_ch_row["m"]) if max_ch_row else 1

            return {
                "nodes": nodes,
                "edges": edges,
                "neo4j_connected": True,
                "max_chapter": max(highest_chapter, 1),
            }

    # SQL Projection Fallback (when Neo4j is disabled or unreachable)
    nodes, edges, highest_chapter = _build_projection_from_sql(db, pid, max_chapter=max_chapter)
    return {
        "nodes": nodes,
        "edges": edges,
        "neo4j_connected": False,
        "max_chapter": highest_chapter,
    }


def get_entity_neighborhood(
    db: Session, project_id, entity_name: str, hops: int = 2
) -> list[dict[str, Any]]:
    """Multi-hop neighborhood lookup around a character or entity."""
    pid = uuid.UUID(str(project_id)) if not isinstance(project_id, uuid.UUID) else project_id
    pid_str = str(pid)
    hops = max(1, min(hops, 3))

    if is_neo4j_connected():
        driver = _get_driver()
        assert driver is not None
        with driver.session() as session:
            query = (
                f"MATCH (start:StoryEntity {{project_id: $pid}})-[r*1..{hops}]-(nbr:StoryEntity {{project_id: $pid}}) "
                "WHERE toLower(start.name) = toLower($name) "
                "RETURN DISTINCT nbr.id AS id, nbr.name AS name, labels(nbr) AS labels, nbr.chapter AS chapter "
                "LIMIT 25"
            )
            res = session.run(query, pid=pid_str, name=entity_name.strip())
            return [
                {
                    "id": row["id"],
                    "name": row["name"],
                    "labels": row["labels"],
                    "chapter": row["chapter"],
                }
                for row in res
            ]

    # SQL Fallback neighborhood (1-hop BFS over projected edges)
    nodes, edges, _ = _build_projection_from_sql(db, pid)
    node_map = {n["id"]: n for n in nodes}
    start_ids = {n["id"] for n in nodes if n["label"].strip().lower() == entity_name.strip().lower()}
    visited = set(start_ids)
    frontier = set(start_ids)
    for _ in range(hops):
        next_frontier = set()
        for e in edges:
            if e["source"] in frontier and e["target"] not in visited:
                next_frontier.add(e["target"])
            elif e["target"] in frontier and e["source"] not in visited:
                next_frontier.add(e["source"])
        visited |= next_frontier
        frontier = next_frontier

    return [
        {
            "id": node_map[nid]["id"],
            "name": node_map[nid]["label"],
            "labels": [node_map[nid]["kind"].capitalize()],
            "chapter": node_map[nid]["chapter"],
        }
        for nid in visited - start_ids
        if nid in node_map
    ]
