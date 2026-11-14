import * as THREE from 'https://esm.sh/three@0.160.0';
import {OrbitControls} from 'https://esm.sh/three@0.160.0/examples/jsm/controls/OrbitControls.js';
import {plywoodOutline} from './assembly-math.js';

export function createPartsScene(container){
    const renderer=new THREE.WebGLRenderer({alpha:true,antialias:true});renderer.setPixelRatio(Math.min(devicePixelRatio||1,2));
    renderer.outputColorSpace=THREE.SRGBColorSpace;renderer.setClearColor(0,0);container.append(renderer.domElement);
    renderer.domElement.setAttribute('aria-label','Раздельные панели корпуса. Перетаскивание — поворот, колесо — масштаб.');
    renderer.domElement.setAttribute('role','img');
    const scene=new THREE.Scene(),camera=new THREE.PerspectiveCamera(40,1,.01,100000);camera.up.set(0,0,1);camera.position.set(160,-200,160);
    const controls=new OrbitControls(camera,renderer.domElement);controls.enableDamping=false;
    scene.add(new THREE.HemisphereLight(0xffffff,0x8a92a0,2));
    for(const [x,y,z,intensity] of [[1,-2,3,2.1],[-2,-1,1,1.3],[1,2,1,.8]]){const light=new THREE.DirectionalLight(0xffffff,intensity);light.position.set(x*1000,y*1000,z*1000);scene.add(light);}
    const objects=new Map();let lastFrame=null,pending=new Set();
    function draw(){renderer.render(scene,camera);}
    controls.addEventListener('change',draw);
    function add(id,label,color,vertices,direction){
        const geometry=new THREE.BufferGeometry();geometry.setAttribute('position',new THREE.BufferAttribute(vertices,3));geometry.computeVertexNormals();
        const material=new THREE.MeshStandardMaterial({color,roughness:.85,metalness:0,flatShading:true,side:THREE.DoubleSide});
        const mesh=new THREE.Mesh(geometry,material);mesh.name=label;mesh.userData={id,direction,color};objects.set(id,mesh);scene.add(mesh);return mesh;
    }
    function setColorOverride(color){
        for(const mesh of objects.values())mesh.material.color.set(color??mesh.userData.color);
        draw();
    }
    function clear(){for(const mesh of objects.values()){scene.remove(mesh);mesh.geometry.dispose();mesh.material.dispose();}objects.clear();pending.clear();draw();}
    function setPreparing(ids){pending=new Set(ids);for(const [id,mesh]of objects)if(pending.has(id))mesh.visible=false;draw();}
    function fit(){
        if(container.clientWidth&&container.clientHeight){renderer.setSize(container.clientWidth,container.clientHeight,false);camera.aspect=container.clientWidth/container.clientHeight;}
        const box=new THREE.Box3();for(const mesh of objects.values())if(mesh.visible)box.expandByObject(mesh);
        if(box.isEmpty()){if(lastFrame)box.copy(lastFrame);else return;}else lastFrame=box.clone();
        const center=box.getCenter(new THREE.Vector3()),radius=box.getSize(new THREE.Vector3()).length()/2;
        const angle=Math.atan(Math.tan(THREE.MathUtils.degToRad(camera.fov/2))*Math.min(1,camera.aspect));
        const distance=Math.max(10,radius/Math.sin(angle)*1.08),direction=camera.position.clone().sub(controls.target).normalize();
        controls.target.copy(center);camera.position.copy(center).addScaledVector(direction,distance);camera.near=Math.max(.01,distance/10000);camera.far=Math.max(10000,distance*100);camera.updateProjectionMatrix();controls.update();draw();
    }
    function update(state,explode,span){
        for(const [id,mesh] of objects){const s=state.get(id)||{visible:true,offset:0};mesh.visible=s.visible&&!pending.has(id);mesh.position.fromArray(mesh.userData.direction).multiplyScalar(explode*span*.6/100+s.offset);mesh.updateMatrixWorld();}
        draw();
    }
    function wood(plan,plane,index){
        plan=plane.bodyPlan||plan;
        const loops=plywoodOutline(plane),shapes=[],holes=[];
        const area=loop=>loop.reduce((sum,p,i)=>{const q=loop[(i+1)%loop.length];return sum+p[0]*q[1]-q[0]*p[1];},0)/2;
        for(const loop of loops){const path=area(loop)>0?new THREE.Shape():new THREE.Path();path.moveTo(...loop[0]);loop.slice(1).forEach(p=>path.lineTo(...p));path.closePath();(area(loop)>0?shapes:holes).push(path);}
        const contains=(path,point)=>inside(path.getPoints(),point);
        function inside(poly,p){let yes=false;for(let i=0,j=poly.length-1;i<poly.length;j=i++)if((poly[i].y>p.y)!==(poly[j].y>p.y)&&p.x<(poly[j].x-poly[i].x)*(p.y-poly[i].y)/(poly[j].y-poly[i].y)+poly[i].x)yes=!yes;return yes;}
        for(const hole of holes){const owner=shapes.find(s=>contains(s,hole.getPoints()[0]));if(owner)owner.holes.push(hole);}
        const p=plan.p,b=p.frame_border_mm+p.plywood_fit_mm,W=p.chest_outer_width_mm,D=p.chest_outer_depth_mm,H=p.chest_outer_height_mm,layer=plane.depth,t=plane.thickness;
        let direction;
        const map=(u,v,d)=>{
            if(plane.id==='levaya'){direction=[-1,0,0];return [layer+d,b+u,b+v+plan.lift];}
            if(plane.id==='pravaya'){direction=[1,0,0];return [W-layer-t+d,b+u,b+v+plan.lift];}
            if(plane.face==='back'){direction=[0,1,0];return [b+u,D-layer-t+d,b+v+plan.lift];}
            if(plane.face==='top'){direction=[0,0,1];return [b+u,b+v,H-layer-t+d+plan.lift];}
            if(plane.face==='bottom'){direction=[0,0,-1];return [b+u,b+v,layer+d+plan.lift];}
            direction=[0,-1,0];return [p.chest_wall_thickness+b-p.plywood_lip_mm+u,b-p.plywood_lip_mm+v,plane.level+d+plan.lift];
        };
        const geometry=new THREE.ExtrudeGeometry(shapes,{depth:t,bevelEnabled:false,steps:1});const positions=geometry.getAttribute('position'),vertices=new Float32Array(positions.count*3);
        for(let i=0;i<positions.count;i++)vertices.set(map(positions.getX(i),positions.getY(i),positions.getZ(i)).map((v,a)=>v+(plane.origin?.[a]||0)),i*3);
        geometry.dispose();const id=(plane.prefix||'')+'wood-'+plane.id,color=['#c9ab7e','#ba996a','#d3b98e'][index%3],label=(plane.bodyName?plane.bodyName+' · ':'')+'Фанера: '+plane.label;
        add(id,label,color,vertices,direction);return {id,label,color,direction,kind:'wood'};
    }
    const observer=new ResizeObserver(()=>{const w=container.clientWidth,h=container.clientHeight;if(!w||!h)return;renderer.setSize(w,h,false);camera.aspect=w/h;camera.updateProjectionMatrix();if(objects.size)fit();else draw();});observer.observe(container);
    return {add,clear,update,fit,wood,setColorOverride,setPreparing,objects,renderer,camera,controls};
}
