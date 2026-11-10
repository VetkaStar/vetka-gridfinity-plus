"""Closed-shell STL assertions shared by regression tests."""
from collections import defaultdict
from qa_mesh import triangles

def shell(path):
    """Every triangle belongs to one closed, consistently oriented shell."""
    ts = triangles(str(path))
    edges = defaultdict(list)
    for i, tri in enumerate(ts):
        points = [tuple(round(v, 5) for v in p) for p in tri]
        assert len(set(points)) == 3, (path, 'collapsed triangle', i)
        a, b, c = points
        u = [b[k]-a[k] for k in range(3)]
        v = [c[k]-a[k] for k in range(3)]
        cross = [u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0]]
        assert sum(x*x for x in cross) > 1e-12, (path, 'zero-area film', i)
        for a, b in zip(points, points[1:]+points[:1]):
            edges[tuple(sorted((a, b)))].append((i, a < b))
    neighbours = [set() for _ in ts]
    for edge, uses in edges.items():
        assert len(uses) == 2, (path, 'open/nonmanifold edge', edge, uses)
        assert uses[0][1] != uses[1][1], (path, 'inconsistent orientation', edge)
        a, b = [item[0] for item in uses]
        neighbours[a].add(b)
        neighbours[b].add(a)
    seen = {0}
    todo = [0]
    while todo:
        i = todo.pop()
        new = neighbours[i]-seen
        seen.update(new)
        todo.extend(new)
    assert len(seen) == len(ts), (path, 'detached shell', len(seen), len(ts))
    return {'triangles': len(ts), 'shells': 1, 'closed': True, 'degenerate': 0}
