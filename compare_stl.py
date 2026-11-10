import struct
from pathlib import Path


def metrics(path):
    data = Path(path).read_bytes()
    count = struct.unpack_from('<I', data, 80)[0]
    vertices, volume, area = [], 0.0, 0.0
    for index in range(count):
        row = struct.unpack_from('<9f', data, 84 + index * 50 + 12)
        a, b, c = row[:3], row[3:6], row[6:9]
        vertices.extend((a, b, c))
        cross = (b[1]*c[2]-b[2]*c[1], b[2]*c[0]-b[0]*c[2], b[0]*c[1]-b[1]*c[0])
        volume += sum(a[i] * cross[i] for i in range(3)) / 6
        u, v = [b[i]-a[i] for i in range(3)], [c[i]-a[i] for i in range(3)]
        normal = (u[1]*v[2]-u[2]*v[1], u[2]*v[0]-u[0]*v[2], u[0]*v[1]-u[1]*v[0])
        area += sum(x*x for x in normal) ** 0.5 / 2
    bounds = [(min(p[i] for p in vertices), max(p[i] for p in vertices)) for i in range(3)]
    return {'triangles': count, 'vertices': set(vertices), 'bounds': bounds, 'volume': volume, 'area': area}


def assert_same_surface(path_a, path_b, tolerance=0.005):
    """Allow CSG tessellation artifacts, not meaningful surface changes (units: mm)."""
    shapes = [metrics(path_a), metrics(path_b)]
    for first, second in zip(shapes[0]['bounds'], shapes[1]['bounds']):
        assert max(abs(a-b) for a,b in zip(first, second)) <= tolerance
    for key in ('volume', 'area'):
        a,b = shapes[0][key], shapes[1][key]
        assert abs(a-b) <= max(0.001, max(abs(a),abs(b))*1e-6), (key,a,b)

    def sub(a,b): return tuple(x-y for x,y in zip(a,b))
    def dot(a,b): return sum(x*y for x,y in zip(a,b))

    def distance_squared(p, triangle):
        a,b,c = triangle
        u,v,w = sub(b,a),sub(c,a),sub(p,a)
        normal = (u[1]*v[2]-u[2]*v[1],u[2]*v[0]-u[0]*v[2],u[0]*v[1]-u[1]*v[0])
        normal2 = dot(normal,normal)
        if normal2 > 1e-20:
            offset = dot(w,normal)/normal2
            projected = tuple(w[i]-offset*normal[i] for i in range(3))
            uu,uv,vv = dot(u,u),dot(u,v),dot(v,v)
            denom = uu*vv-uv*uv
            if abs(denom) > 1e-20:
                x = (dot(projected,u)*vv-dot(projected,v)*uv)/denom
                y = (dot(projected,v)*uu-dot(projected,u)*uv)/denom
                if x >= -1e-8 and y >= -1e-8 and x+y <= 1+1e-8:
                    return offset*offset*normal2
        distances=[]
        for first,last in ((a,b),(b,c),(c,a)):
            edge,relative = sub(last,first),sub(p,first)
            length2 = dot(edge,edge)
            t = min(1,max(0,dot(relative,edge)/length2)) if length2 > 0 else 0
            delta = tuple(relative[i]-t*edge[i] for i in range(3))
            distances.append(dot(delta,delta))
        return min(distances)

    max_error = 0
    for first,second,target in ((shapes[0],shapes[1],path_b),(shapes[1],shapes[0],path_a)):
        extra = first['vertices']-second['vertices']
        if not extra: continue
        data = Path(target).read_bytes()
        triangles=[]
        for i in range(second['triangles']):
            row = struct.unpack_from('<9f',data,84+i*50+12)
            tri=(row[:3],row[3:6],row[6:])
            bounds=[(min(p[j] for p in tri)-tolerance,max(p[j] for p in tri)+tolerance) for j in range(3)]
            triangles.append((tri,bounds))
        for point in extra:
            candidates=[tri for tri,bounds in triangles if all(lo <= value <= hi for value,(lo,hi) in zip(point,bounds))]
            squared = min((distance_squared(point,tri) for tri in candidates), default=float('inf'))
            assert squared <= tolerance*tolerance, (point,squared**0.5)
            max_error=max(max_error,squared**0.5)
    return max_error


if __name__ == '__main__':
    a = metrics('reports/single-drawer-ru.stl')
    b = metrics('reports/single-drawer-original.stl')
    for label, value in [('Russian', a), ('Original', b)]:
        print(label, {k: len(v) if k == 'vertices' else v for k, v in value.items()})
    print('Vertex differences', len(a['vertices'] - b['vertices']), len(b['vertices'] - a['vertices']))
