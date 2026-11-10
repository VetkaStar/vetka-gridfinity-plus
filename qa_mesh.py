"""Small binary STL ray-intersection helpers, with cached triangle parsing."""
import struct
from functools import lru_cache
from pathlib import Path

@lru_cache(maxsize=64)
def triangles(path):
    data=Path(path).read_bytes()
    count=struct.unpack_from('<I',data,80)[0]
    rows=[]
    for i in range(count):
        v=struct.unpack_from('<9f',data,84+i*50+12)
        rows.append((v[:3],v[3:6],v[6:]))
    return rows


def hits(path,axis,point):
    """Sorted surface positions on a ray parallel to axis (0=x, 1=y, 2=z)."""
    axes=[i for i in range(3) if i!=axis]
    x,y=point;u,v=axes
    result=[]
    for a,b,c in triangles(str(path)):
        den=(b[v]-c[v])*(a[u]-c[u])+(c[u]-b[u])*(a[v]-c[v])
        if abs(den)<1e-10:continue
        p=((b[v]-c[v])*(x-c[u])+(c[u]-b[u])*(y-c[v]))/den
        q=((c[v]-a[v])*(x-c[u])+(a[u]-c[u])*(y-c[v]))/den
        r=1-p-q
        if min(p,q,r)>=-1e-7:result.append(p*a[axis]+q*b[axis]+r*c[axis])
    return sorted(set(round(n,4) for n in result))


def near(values,lo,hi):
    return [n for n in values if lo-0.001<=n<=hi+0.001]
