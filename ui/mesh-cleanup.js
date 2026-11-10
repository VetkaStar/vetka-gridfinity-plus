// OFF coordinates are converted to Float32 for STL and GLB. At that precision
// distinct CSG vertices can become identical. Remove only exactly zero-area
// triangles, without moving vertices, filling holes or changing any surface.
export function cleanMeshTriangles(mesh){
    const p=mesh.positions;
    function valid(i){
        const ux=p[i+3]-p[i],uy=p[i+4]-p[i+1],uz=p[i+5]-p[i+2],vx=p[i+6]-p[i],vy=p[i+7]-p[i+1],vz=p[i+8]-p[i+2];
        const nx=uy*vz-uz*vy,ny=uz*vx-ux*vz,nz=ux*vy-uy*vx;
        return nx!==0||ny!==0||nz!==0;
    }
    let removed=0;for(let i=0;i<p.length;i+=9)if(!valid(i))removed++;
    if(!removed)return mesh;
    const positions=new Float32Array(p.length-removed*9),colors=mesh.colors?new Float32Array(positions.length):null;
    let cursor=0;
    for(let i=0;i<p.length;i+=9)if(valid(i)){positions.set(p.subarray(i,i+9),cursor);if(colors)colors.set(mesh.colors.subarray(i,i+9),cursor);cursor+=9;}
    return {...mesh,positions,colors,removedDegenerateTriangles:removed};
}
