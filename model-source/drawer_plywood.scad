// Modified 2026-11-04: custom dimensions, panel assembly and fit-test extensions.
// Project additions are distributed under GPL v3; original credits below are retained.
// Plywood panels seated in printed lattice walls. All layers are derived from the
// total wall thickness, so after assembly nothing protrudes on either side.
pw_pin_size = 1.5;
pw_pin_height = 1.5;
pw_pin_fit = 0.1;
pw_pin_inset = 3;

function pw_q() = plywood_thickness_mm + 2*plywood_fit_mm;
function pw_face_mode(face) =
  face=="sides"   ? plywood_sides_mode :
  face=="back"    ? plywood_back_mode :
  face=="top"     ? plywood_top_mode :
  face=="bottom"  ? plywood_bottom_mode :
  face=="shelves" ? plywood_shelves_mode : "off";
function pw_on(face) = plywood_enabled && pw_face_mode(face)!="off";
// Every cut and part is gated by the master switch, not by the stored per-face mode.
function pw_act(face) = plywood_enabled ? pw_face_mode(face) : "off";
function pw_any() = plywood_enabled && (pw_on("sides") || pw_on("back") || pw_on("top") || pw_on("bottom") || pw_on("shelves"));
function pw_rim(face) = pw_act(face)=="overlay" ? plywood_rim_mm : 0;
function pw_lattice(w,face) = w - pw_q() - pw_rim(face);
function pw_face_of(name) = (name=="left"||name=="right") ? "sides" : name;
function pw_side_border(w) = frame_border_mm;
// Pin seats live in the border ring, never under the sheet.
function pw_pins(U,V) = let(i=pw_pin_inset)
  [[i,i],[U-i,i],[i,V-i],[U-i,V-i],[U/2,i],[U/2,V-i],[i,V/2],[U-i,V/2]];
module plywood_validate(size,w) {
  if(plywood_enabled) {
    q=pw_q();
    assert(size_mode=="custom" && case_structure=="frame","Фанера: нужны произвольные миллиметры и каркас");
    assert(plywood_thickness_mm>=1 && plywood_thickness_mm<=5,"Толщина фанеры должна быть от 1 до 5 мм");
    assert(plywood_fit_mm>=0 && plywood_fit_mm<=0.5,"Зазор фанеры: от 0 до 0,5 мм на сторону");
    assert(plywood_lip_mm>=1 && plywood_lip_mm<=6 && plywood_rim_mm>=0.8 && plywood_rim_mm<=3,"Нахлёст 1…6 мм, толщина бортика 0,8…3 мм");
    assert(pw_any() || render_choice=="plywood_probe","Выберите хотя бы одну поверхность с фанерой");
    for(face=["sides","back","top","bottom"]) if(pw_on(face)) let(l=pw_lattice(w,face))
      assert(l>=0.6,str("Для фанеры не хватает толщины стенки: обрешётка ",l," мм, минимум 0,6 мм"));
    if(pw_on("shelves")) let(s=structure_slide(w))
      assert(s>=q+0.8,str("Направляющая ",s," мм тоньше паза под фанеру"));
    for(face=["sides","back","top","bottom"]) if(pw_on(face))
      assert(frame_border_mm>=plywood_lip_mm+2,"Рамка должна быть шире нахлёста хотя бы на 2 мм");
    for(face=["sides","back","top","bottom"]) if(pw_face_mode(face)=="overlay")
      assert(w>=plywood_rim_mm+pw_pin_height+0.8,"Для шипов бортика нужна стенка толще: увеличьте стенку или уменьшите бортик");
  }
}

// Zones where flatpack shelf tongues enter the wall: the sheet recess must skip them.
module pw_tongue_zone(size,w,face,levels,source=false) {
  if(plywood_enabled && flatpack_enabled && len(levels)>0) {
    n=tab_count(0);d=tab_depth(w);tw=flatpack_tab_width_mm;f=source?0:flatpack_fit_mm;s=structure_slide(w);
    // Protect the full tongue footprint on every wall; the stub stays under the tongue.
    // Printed tongues retain a 0.2 mm root overlap. In the sheet preview the
    // same rectangular laser windows cut through the entire sheet thickness.
    if(face=="left") for(z=levels) for(i=[1:n]) translate([source?w-d:-0.1,tab_position(0,size.y-w,i,n,w)-tw/2-f,z-f]) cube([source?d+0.2:w+0.2,tw+2*f,s+2*f]);
    if(face=="right") for(z=levels) for(i=[1:n]) translate([source?size.x-w-0.2:size.x-w-0.1,tab_position(0,size.y-w,i,n,w)-tw/2-f,z-f]) cube([source?d+0.2:w+0.2,tw+2*f,s+2*f]);
    if(face=="back") { n2=tab_count(2);
      for(z=levels) for(i=[1:n2]) translate([tab_position(w,size.x-w,i,n2,w)-tw/2-f,source?size.y-w-0.2:size.y-w-0.1,z-f]) cube([tw+2*f,source?d+0.2:w+0.2,s+2*f]);
    }
  }
}
module pw_box(size,face,d0,d1,u0,u1,v0,v1) {
  if(d1>d0 && u1>u0 && v1>v0) {
    if(face=="left")       translate([d0,u0,v0]) cube([d1-d0,u1-u0,v1-v0]);
    else if(face=="right") translate([size.x-d1,u0,v0]) cube([d1-d0,u1-u0,v1-v0]);
    else if(face=="back")  translate([u0,size.y-d1,v0]) cube([u1-u0,d1-d0,v1-v0]);
    else if(face=="bottom")translate([u0,v0,d0]) cube([u1-u0,v1-v0,d1-d0]);
    else if(face=="top")   translate([u0,v0,size.z-d1]) cube([u1-u0,v1-v0,d1-d0]);
  }
}
function pw_window(size,face) =
  face=="left"||face=="right" ? [frame_border_mm,size.y-frame_border_mm,frame_border_mm,size.z-frame_border_mm] :
  face=="back" ? [frame_border_mm,size.x-frame_border_mm,frame_border_mm,size.z-frame_border_mm] :
  [frame_border_mm,size.x-frame_border_mm,frame_border_mm,size.y-frame_border_mm];
module pw_face_cut(size,w,face) {
  q=pw_q();r=pw_rim(pw_face_of(face));m=pw_act(pw_face_of(face));
  let(win=pw_window(size,face)) {
    if(m=="overlay") {
      if(face=="left"||face=="right") pw_box(size,face,-0.1,r,0,size.y,0,size.z);
      else if(face=="back") pw_box(size,face,-0.1,r,0,size.x,0,size.z);
      else pw_box(size,face,-0.1,r,0,size.x,0,size.y);
      pw_box(size,face,r,r+q,win[0],win[1],win[2],win[3]);
    } else if(m=="outside") pw_box(size,face,-0.1,q,win[0],win[1],win[2],win[3]);
    else if(m=="inside") pw_box(size,face,w-plywood_thickness_mm-plywood_fit_mm,w+0.1,win[0],win[1],win[2],win[3]);
  }
}
module pw_socket(size,face,u,v) {
  r=pw_rim(pw_face_of(face));s=pw_pin_size+2*pw_pin_fit;d=pw_pin_height;
  if(face=="left"||face=="right") pw_box(size,face,r-0.01,r+d,u-s/2,u+s/2,v-s/2,v+s/2);
  else if(face=="back") pw_box(size,face,r-0.01,r+d,u-s/2,u+s/2,v-s/2,v+s/2);
  else pw_box(size,face,r-0.01,r+d,u-s/2,u+s/2,v-s/2,v+s/2);
}
module plywood_slots(size,w,levels) {
  difference() {
    union() {
      pw_face_cut(size,w,"left");pw_face_cut(size,w,"right");
      pw_face_cut(size,w,"back");
      pw_face_cut(size,w,"top");pw_face_cut(size,w,"bottom");
    if(pw_on("shelves")) {e=plywood_lip_mm;t2=plywood_thickness_mm;s=structure_slide(w);
      for(z=levels) translate([w+frame_border_mm-e,frame_border_mm-e,z+s-t2]) cube([size.x-2*w-2*frame_border_mm+2*e,size.y-w-2*frame_border_mm+2*e,t2+0.001]);}
    }
    // Keep the material the shelf tongues fuse to; the stub stays under the tongue.
    // Preserve the actual tongue, not an expanded collar around its window.
    // The collar becomes detached material (or a zero-thickness film) when the
    // wall's matching clearance window is subtracted during panel extraction.
    pw_tongue_zone(size,w,"left",levels,true);
    pw_tongue_zone(size,w,"right",levels,true);
    pw_tongue_zone(size,w,"back",levels,true);
  }
}
module plywood_pin_sockets(size,w) {
  if(pw_any()) {
    for(face=["left","right","back","top","bottom"]) if(pw_act(pw_face_of(face))=="overlay") {
      U=(face=="left"||face=="right")?size.y:(face=="back"?size.x:size.x);
      V=(face=="left"||face=="right")?size.z:(face=="back"?size.z:size.y);
      for(p=pw_pins(U,V)) pw_socket(size,face,p[0],p[1]);
    }
  }
}
module pw_sheet(size,face,d0) {
  f=plywood_fit_mm;t=plywood_thickness_mm;b=frame_border_mm;
  if(face=="left")       translate([d0,b+f,b+f]) cube([t,size.y-2*b-2*f,size.z-2*b-2*f]);
  else if(face=="right") translate([size.x-d0-t,b+f,b+f]) cube([t,size.y-2*b-2*f,size.z-2*b-2*f]);
  else if(face=="back")  translate([b+f,size.y-d0-t,b+f]) cube([size.x-2*b-2*f,t,size.z-2*b-2*f]);
  else if(face=="bottom")translate([b+f,b+f,d0]) cube([size.x-2*b-2*f,size.y-2*b-2*f,t]);
  else if(face=="top")   translate([b+f,b+f,size.z-d0-t]) cube([size.x-2*b-2*f,size.y-2*b-2*f,t]);
}
module pw_side_cutouts(size,w,levels) {
  // Shelves slide along the inner face, so an inside sheet needs slots for them.
  if(slide_shelves_enabled && pw_on("sides") && pw_act("sides")=="inside") {s=structure_slide(w);
    for(z=levels) translate([-0.1,-0.1,z]) cube([size.x+0.2,size.y+0.2,s+0.2]);}
}
module plywood_sheets(size,w,levels) {
  f=plywood_fit_mm;t=plywood_thickness_mm;b=frame_border_mm;s=structure_slide(w);
  color([0.72,0.51,0.29]) difference() {
    union() {
      difference() {
        if(pw_on("sides")) let(d0=pw_rim("sides")+(pw_act("sides")=="inside" ? w-t : 0)) {pw_sheet(size,"left",d0);pw_sheet(size,"right",d0);}
        pw_side_cutouts(size,w,levels);
      }
      for(face=["back","top","bottom"]) if(pw_on(face)) pw_sheet(size,face,pw_rim(face)+(pw_act(face)=="inside" ? w-t : 0));
      if(pw_on("shelves")) for(z=levels)
        translate([w+b-plywood_lip_mm+f,b-plywood_lip_mm+f,z+s-t]) cube([size.x-2*w-2*b-2*f+2*plywood_lip_mm,size.y-w-2*b-2*f+2*plywood_lip_mm,t]);
    }
    pw_tongue_zone(size,w,"left",levels);
    pw_tongue_zone(size,w,"right",levels);
    pw_tongue_zone(size,w,"back",levels);
  }
}
function pw_rim_parts(size) = concat(
  pw_on("sides")  ? [["left",size.y,size.z],["right",size.y,size.z]] : [],
  pw_on("back")   ? [["back",size.x,size.z]] : [],
  pw_on("top")    ? [["top",size.x,size.y]] : [],
  pw_on("bottom") ? [["bottom",size.x,size.y]] : []);
function pw_rim_count(size) = len([for(part=pw_rim_parts(size)) if(pw_act(pw_face_of(part[0]))=="overlay") part]);
module pw_rim_part(U,V,r,e,b) {
  f=plywood_fit_mm;
  difference() {
    union() {
      difference() {
        cube([U,V,r]);
        translate([b+e,b+e,-0.1]) cube([U-2*(b+e),V-2*(b+e),r+0.2]);
      }
      for(p=pw_pins(U,V)) translate([p[0]-pw_pin_size/2,p[1]-pw_pin_size/2,r-0.01]) cube([pw_pin_size,pw_pin_size,pw_pin_height+0.01]);
    }
  }
}
module plywood_rims(size,w,layout=false) {
  b=frame_border_mm;e=plywood_lip_mm;r=plywood_rim_mm;
  assert(plywood_enabled,"Включите фанерные вставки");
  assert(pw_rim_count(size)>0,"Накладной бортик не выбран ни для одной поверхности");
  parts=[for(part=pw_rim_parts(size)) if(pw_act(pw_face_of(part[0]))=="overlay") part];
  for(i=[0:len(parts)-1]) let(U=parts[i][1],V=parts[i][2])
    translate(layout?[i*(U+10),0,0]:[0,0,0]) pw_rim_part(U,V,r,e,b);
}

// Fit coupon: the exact groove width and the exact pin/socket pair, printed flat.
module plywood_probe(size,w) {
  q=pw_q();f=plywood_fit_mm;r=plywood_rim_mm;e=plywood_lip_mm;b=frame_border_mm;
  assert(plywood_enabled,"Включите фанерные вставки");
  plate=[60,40,4];
  translate([0,0,0]) difference() {
    cube(plate);
    translate([5,plate.y/2-q/2,plate.z-plywood_thickness_mm]) cube([plate.x-10,q,plywood_thickness_mm+0.01]);
    for(p=pw_pins(20,20)) translate([10+p[0],15+p[1],plate.z-pw_pin_height-0.01]) cube([pw_pin_size+2*pw_pin_fit,pw_pin_size+2*pw_pin_fit,pw_pin_height+0.01]);
  }
  translate([plate.x+10,0,0]) difference() {
    union() {
      cube([plate.x,20,r]);
      for(p=pw_pins(plate.x,20)) translate([p[0]-pw_pin_size/2,p[1]-pw_pin_size/2,r-0.01]) cube([pw_pin_size,pw_pin_size,pw_pin_height+0.01]);
    }
    translate([b+e,b+e,-0.1]) cube([plate.x-2*(b+e),20-2*(b+e),r+0.2]);
  }
}

// Shelf-joint coupon: a plate with a through mortise and a bar with a matching tenon.
module shelf_probe(size,w) {
  assert(flatpack_enabled || plywood_enabled,"Включите панельную сборку или фанеру для пробника полки");
  d=tab_depth(w);t=flatpack_tab_width_mm;f=flatpack_fit_mm;s=structure_slide(w);
  holeW=t+2*f; holeH=s+2*f; tenonD=w+2;
  // 1) mortise plate: through slot for the shelf tenon
  difference() {
    cube([50,40,w]);
    translate([25-holeW/2,20-holeH/2,-0.01]) cube([holeW,holeH,w+0.02]);
  }
  // 2) bar with a tenon that passes through the slot
  translate([0,50,0]) {
    cube([50,20,s]);
    translate([25-t/2,20,0]) cube([t,tenonD,s]);
  }
}
