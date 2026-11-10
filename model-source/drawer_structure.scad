// Modified 2026-11-04: custom dimensions, panel assembly and fit-test extensions.
// Project additions are distributed under GPL v3; original credits below are retained.
// Optional in-envelope frame walls, locating pegs and glue-together panels.
include <drawer_plywood.scad>
function structure_slide(w) = chest_drawer_slide_thickness==0 ? w : chest_drawer_slide_thickness;
function structure_peg(w) = stack_peg_size_mm==0 ? w : stack_peg_size_mm;
function structure_inset(w) = stack_peg_inset_mm==0 ? w+structure_peg(w)/2+1 : stack_peg_inset_mm;
function tab_depth(w) = let(base=flatpack_tab_depth_mm>0 ? flatpack_tab_depth_mm : w/2,
  need=(plywood_enabled && plywood_shelves_mode!="off") ? plywood_thickness_mm+1.5 : 0) min(w,max(base,need));
function tab_count(wall) = wall==2 ? (flatpack_tab_count_back>0?flatpack_tab_count_back:flatpack_tab_count) : (flatpack_tab_count_side>0?flatpack_tab_count_side:flatpack_tab_count);
// First/last tongue edges are one wall thickness from the joint ends.
// A single tongue stays centred; intermediate tongues share equal spacing.
function tab_position(a,b,i,n,w,t=flatpack_tab_width_mm) = n==1 ? (a+b)/2 : a+w+t/2+(i-1)*(b-a-2*w-t)/(n-1);
function tab_edge_fits(a,b,n,w,t,f) = n==1 ? b-a>=t+2*w : b-a>=2*w+t && (b-a-2*w-t)/(n-1)>t+2*f+1;
function structure_bottom_lift() = size_mode=="custom" && flatpack_enabled ? flatpack_base_mm+flatpack_belt_mm : 0;
function structure_levels(size,w) = let(n=drawer_count,s=structure_slide(w),cz=chest_clearance.z,dw=drawer_wall_thickness,
  budget=size.z-2*w-(n-1)*s-n*(dw+2*cz),vals=[for(i=[0:n-1])custom_drawer_heights_mm[i]],
  zeros=len([for(v=vals)if(v==0)v]),used=sum(vals),hs=[for(i=[0:n-1])!custom_drawer_heights_enabled?budget/n:vals[i]>0?vals[i]:(budget-used)/max(1,zeros)])
  n<2 ? [] : [for(i=[1:n-1]) w+sum([for(j=[0:i-1])hs[j]+dw+2*cz])+(i-1)*s];
module structure_validate(size,w) {
  if(case_structure=="frame" || flatpack_enabled || stack_system_enabled || slide_shelves_enabled || plywood_enabled) {
    assert(size_mode=="custom","Каркас, ножки и панельная сборка доступны в произвольных миллиметрах");
    assert(case_structure=="sheet" || case_structure=="frame","Неизвестная конструкция корпуса");
    plywood_validate(size,w);
  }
  if(slide_shelves_enabled)assert(!flatpack_enabled && drawer_count>=2 && w>=2 && slide_shelf_fit_mm>=0 && slide_shelf_fit_mm<=0.5,"Съёмные направляющие: минимум два ящика, стенка от 2 мм, зазор 0…0,5 мм; выключите полную панельную сборку");
  if(flatpack_enabled) {
    assert(is_num(flatpack_base_mm) && is_num(flatpack_belt_mm) && min(flatpack_base_mm,flatpack_belt_mm)>=0.6,"Опорный слой дна и поясок стенки должны быть не меньше 0,6 мм");
    assert(drawer_count<=16,"Панельная сборка: не больше 16 ящиков");
    assert(w>=2,"Для шип–паза нужна стенка не тоньше 2 мм");
    assert(flatpack_tab_count>=1 && flatpack_tab_count<=6 && flatpack_tab_count==floor(flatpack_tab_count) && flatpack_tab_count_side<=6 && flatpack_tab_count_back<=6 && flatpack_tab_depth_mm>=0 && flatpack_tab_depth_mm<=w,"Шипов должно быть от 1 до 6");
    assert(flatpack_tab_width_mm>=2 && flatpack_fit_mm>=0 && flatpack_fit_mm<=0.5,"Проверьте ширину шипа и зазор под клей");
    assert(tab_edge_fits(0,size.y-w,tab_count(0),w,flatpack_tab_width_mm,flatpack_fit_mm) && tab_edge_fits(w,size.x-w,tab_count(2),w,flatpack_tab_width_mm,flatpack_fit_mm) && tab_edge_fits(w,size.z-w,tab_count(2),w,flatpack_tab_width_mm,flatpack_fit_mm),"Крайние шипы не помещаются: уменьшите количество или ширину, либо увеличьте панель");
  }
  if(stack_system_enabled) {
    if(stack_bottom_pegs && stack_pegs_separate)assert(w>=2,"Для отдельных ножек и глухих пазов нужна стенка не тоньше 2 мм");
    p=structure_peg(w); a=structure_inset(w);f=stack_fit_mm;
    assert(p>=1 && f>=0 && f<=0.5 && a>p/2+f && min([size.x,size.y])>2*(a+p/2+f+w),"Ножки или сквозные гнёзда не помещаются: проверьте ширину, отступ и зазор");
  }
}
module structure_peg_positions(size,w) {
  a=structure_inset(w);
  for(x=[a,size.x-a],y=[a,size.y-a])translate([x,y,0])children();
}
module structure_keepouts(size,w) {
  // Keep support pads under the locating pegs even in an open bottom frame.
  if(stack_system_enabled)let(a=structure_inset(w)+structure_peg(w)/2+1)
    for(z=concat([-0.1],stack_top_sockets ? [size.z-w-0.1] : []))
      for(x=[0,size.x-a],y=[0,size.y-a])translate([x,y,z])cube([a,a,w+0.2]);
  if(flatpack_enabled) {
    // Continuous, uniform rims protect blind joints from optional face patterns.
    for(z=[0,size.z-w])translate([0,0,z-0.1])difference(){cube([size.x,size.y,w+0.2]);translate([w+2,w+2,-0.1])cube([size.x-2*w-4,size.y-2*w-4,w+0.4]);}
  }
  if(pw_on("shelves"))for(z=structure_levels(size,w))translate([w,0,z-0.1])cube([size.x-2*w,frame_border_mm,structure_slide(w)+0.2]);
  if(flatpack_enabled || slide_shelves_enabled)for(z=structure_levels(size,w))translate([0,0,z-1])difference(){cube([size.x,size.y,structure_slide(w)+2]);translate([w,-0.1,-0.1])cube([size.x-2*w,size.y-w+0.1,structure_slide(w)+2.2]);}
}
module structure_addons(size,w) {
  structure_validate(size,w);
  difference(){
    union(){children();if(stack_system_enabled && stack_bottom_pegs && !stack_pegs_separate)structure_peg_positions(size,w)translate([-structure_peg(w)/2,-structure_peg(w)/2,-w])cube([structure_peg(w),structure_peg(w),w+0.01]);}
    if(!flatpack_enabled && stack_system_enabled && stack_bottom_pegs && stack_pegs_separate)structure_peg_positions(size,w)translate([-structure_peg(w)/2-stack_fit_mm,-structure_peg(w)/2-stack_fit_mm,-0.02])cube([structure_peg(w)+2*stack_fit_mm,structure_peg(w)+2*stack_fit_mm,w/2+0.02]);
    if(stack_system_enabled && stack_top_sockets)structure_peg_positions(size,w)translate([-structure_peg(w)/2-stack_fit_mm,-structure_peg(w)/2-stack_fit_mm,size.z-w-0.02])cube([structure_peg(w)+2*stack_fit_mm,structure_peg(w)+2*stack_fit_mm,w+0.04]);
  }
}
module structure_pin_plate() {
  w=chest_wall_thickness;p=structure_peg(w);
  assert(size_mode=="custom" && stack_system_enabled && stack_bottom_pegs && stack_pegs_separate,"Для отдельных ножек включите установочные ножки снизу и их отдельную печать в произвольном режиме");
  assert(w>=2 && p>=1,"Для отдельной ножки нужна стенка от 2 мм и ширина ножки от 1 мм");
  for(i=[0:(render_choice=="stack_pin"?0:3)])translate([(i%2)*(p+5),floor(i/2)*(p+5),0])cube([p,p,w*1.5]);
}
module structure_diagonal(span,t,r,cross=false) {
  for(sign=cross?[-1,1]:[1])rotate([0,0,sign*atan2(span.y,span.x)])cube([sqrt(pow(span.x,2)+pow(span.y,2))+2*r,r,t+0.2],center=true);
}
module structure_window(span,t,nx,ny,bracing="none",border=undef) {
  bx=is_undef(border)?frame_border_mm:border.x;by=is_undef(border)?frame_border_mm:border.y;r=frame_rib_mm;
  assert(bracing=="none" || bracing=="diagonal" || bracing=="cross" || bracing=="cell_diagonal" || bracing=="cell_cross","Неизвестный вариант диагоналей каркаса");
  assert(bx>=2 && by>=2 && r>=1 && nx>=0 && nx<=12 && ny>=0 && ny<=12 && nx==floor(nx) && ny==floor(ny),"Каркас: рамка от 2 мм, перемычки от 1 мм, количество от 0 до 12");
  dx=(span.x-2*bx-nx*r)/(nx+1);dy=(span.y-2*by-ny*r)/(ny+1);
  assert(dx>=2 && dy>=2,"Окна каркаса не помещаются: уменьшите рамку или число/ширину перемычек");
  difference(){
    union(){for(i=[0:nx],j=[0:ny])translate([-span.x/2+bx+i*(dx+r),-span.y/2+by+j*(dy+r),-t/2-0.04])cube([dx,dy,t+0.08]);}
    if(bracing=="diagonal" || bracing=="cross")structure_diagonal([span.x-2*bx,span.y-2*by],t,r,bracing=="cross");
    if(bracing=="cell_diagonal" || bracing=="cell_cross")for(i=[0:nx],j=[0:ny])
      translate([-span.x/2+bx+i*(dx+r)+dx/2,-span.y/2+by+j*(dy+r)+dy/2,0])structure_diagonal([dx,dy],t,r,bracing=="cell_cross");
  }
}
module structure_frame_cuts(size,w,drawers,clearance,slide,startH) {
  if(case_structure=="frame") feature_safe_cut(size,w) {
    for(i=[0:len(drawers)-1])let(h=drawers[i].z+2*clearance.z,z=startH+drawerPosition(i,drawers,clearance,slide)+h/2) {
      translate([size.x/2,size.y-w/2,z])rotate([90,0,0])structure_window([size.x-2*w,h],w,frame_back_vertical,frame_back_horizontal,frame_back_diagonal ? "diagonal" : frame_back_bracing,[frame_border_mm+(pw_on("back")?plywood_lip_mm:0),frame_border_mm+(pw_on("back")?plywood_lip_mm:0)]);
      for(side=[0:1])translate([side==0?w/2:size.x-w/2,(size.y-w)/2,z])rotate([90,0,90])structure_window([size.y-w,h],w,frame_side_vertical,frame_side_horizontal,frame_side_bracing,[frame_border_mm+(pw_on("sides")?plywood_lip_mm:0),frame_border_mm]);
    }
    if(frame_top_open)translate([size.x/2,size.y/2,size.z-w/2])structure_window([size.x,size.y],w,frame_top_vertical,frame_top_horizontal,frame_top_bracing,[frame_border_mm+(pw_on("top")?plywood_lip_mm:0),frame_border_mm+(pw_on("top")?plywood_lip_mm:0)]);
    if(frame_bottom_open)translate([size.x/2,size.y/2,w/2])structure_window([size.x,size.y],w,frame_bottom_vertical,frame_bottom_horizontal,frame_bottom_bracing,[frame_border_mm+(pw_on("bottom")?plywood_lip_mm:0),frame_border_mm+(pw_on("bottom")?plywood_lip_mm:0)]);
    // Default frame shelves are open rings. Explicit longitudinal runners win.
    if(!guide_rails_active() && len(drawers)>1)for(i=[1:len(drawers)-1])let(z=startH+drawerPosition(i,drawers,clearance,slide)-slide/2)
      translate([size.x/2,(size.y-w)/2,z])structure_window([size.x-2*w,size.y-w],slide,0,0,frame_shelf_bracing,[frame_border_mm,frame_border_mm]);
  }
}
// Tongues lie within the ORIGINAL wall envelope; matching blind grooves are larger.
module structure_plate_tabs(size,w,expand=0,which=-1,zlevel=-1) {
  d=tab_depth(w);t=flatpack_tab_width_mm;f=expand;
  for(top=[0:1],wall=[0:2])if((which<0||wall==which)&&(zlevel<0||top==zlevel))for(i=[1:tab_count(wall)])let(n=tab_count(wall))let(z=top==0?w-d:size.z-w, u=wall==2?tab_position(w,size.x-w,i,n,w):tab_position(0,size.y-w,i,n,w))
    if(wall<2)translate([wall==0?-f:size.x-w-f,u-t/2-f,z-f])cube([w+2*f,t+2*f,d+2*f]);
    else translate([u-t/2-f,size.y-w-f,z-f])cube([t+2*f,w+2*f,d+2*f]);
}
module structure_back_tabs(size,w,expand=0) {
  d=tab_depth(w);t=flatpack_tab_width_mm;f=expand;n=tab_count(2);
  for(side=[0:1],i=[1:n])let(z=tab_position(w,size.z-w,i,n,w))
    translate([side==0?w-d-f:size.x-w-f,size.y-w-f,z-t/2-f])cube([d+2*f,w+2*f,t+2*f]);
}
module structure_shelf_tabs(size,w,z,slide,expand=0) {
  d=tab_depth(w);t=flatpack_tab_width_mm;f=expand;n=tab_count(0);n2=tab_count(2);
  for(side=[0:1],i=[1:n])let(y=tab_position(0,size.y-w,i,n,w))translate([side==0?w-d-f:size.x-w-f,y-t/2-f,z-f])cube([d+2*f,t+2*f,slide+2*f]);
  for(i=[1:n2])let(x=tab_position(w,size.x-w,i,n2,w))translate([x-t/2-f,size.y-w-f,z-f])cube([t+2*f,d+2*f,slide+2*f]);
}

module structure_piece_mask(index,size,w,levels,slide) {
  f=flatpack_fit_mm;
  difference(){
    union(){
      if(index==0)translate([0,0,size.z-w])cube([size.x,size.y,w]);
      if(index==1)translate([0,0,-w])cube([size.x,size.y,2*w]);
      if(index==2||index==3){translate([index==2?0:size.x-w,0,w])cube([w,size.y,size.z-2*w]);structure_plate_tabs(size,w,0,index==2?0:1,1);}
      if(index==4){translate([w,size.y-w,w])cube([size.x-2*w,w,size.z-2*w]);structure_plate_tabs(size,w,0,2,1);structure_back_tabs(size,w);}
      if(index>=5)let(z=levels[index-5]){translate([w,0,z])cube([size.x-2*w,size.y-w,slide]);structure_shelf_tabs(size,w,z,slide);}
    }
    if(index<2)structure_plate_tabs(size,w,f);
    if(index==2||index==3)structure_back_tabs(size,w,f);
    if(index>=2&&index<=4)for(z=levels)structure_shelf_tabs(size,w,z,slide,f);
  }
}
// The floor owns these horizontal tongues. The window starts exactly at the
// belt height; clearance is split above/below the tongue, never below the belt.
module structure_bottom_tabs(size,w,window=false,which=-1) {
  f=flatpack_fit_mm;t=flatpack_tab_width_mm;e=window?f:0;
  z=flatpack_base_mm+flatpack_belt_mm+(window?0:f);
  for(wall=[0:2])if(which<0||wall==which)for(i=[1:tab_count(wall)])
    let(u=wall==2?tab_position(w,size.x-w,i,tab_count(wall),w):tab_position(0,size.y-w,i,tab_count(wall),w))
    if(wall<2)translate([wall==0?-e:size.x-w-e,u-t/2-e,z])cube([w+2*e,t+2*e,w+2*e]);
    else translate([u-t/2-e,size.y-w-e,z])cube([t+2*e,w+2*e,w+2*e]);
}
// Two small coupons of the actual floor/side-wall joint. Dimensions and
// per-side fit are shared with structure_bottom_tabs, including the closed belt.
module structure_bottom_probe(w,wall=false) {
  f=flatpack_fit_mm;t=flatpack_tab_width_mm;b=flatpack_base_mm;p=flatpack_belt_mm;
  L=max(30,t+2*w+2*f+4);D=max(24,2*w+8);r=min(2,w/2);H=p+w+2*f+6;
  assert(size_mode=="custom" && flatpack_enabled,"Для пробника дна включите панельную сборку в миллиметрах");
  assert(w>=2 && t>=2 && f>=0 && f<=0.5 && b>=0.6 && p>=0.6,"Проверьте толщину стенки, шип, зазор, основание и поясок");
  if(!wall)union(){
    cube([D,L,b]);
    translate([w+0.02,0,b])cube([D-w-0.02,L,p+w]);
    translate([w,0,b])cube([r,L,p+w]);
    translate([0,L/2-t/2,b+p+f])cube([w,t,w]);
  }
  else translate([H,0,0])rotate([0,-90,0])difference(){
    cube([w,L,H]);
    translate([-0.01,L/2-t/2-f,p])cube([w+0.02,t+2*f,w+2*f]);
  }
}
module structure_bottom_seat(size,w,r=0) {
  // Three bearing edges, with no fictitious front wall or front tongues.
  union(){
    cube([w+r,size.y,1]);
    translate([size.x-w-r,0,0])cube([w+r,size.y,1]);
    translate([w,size.y-w-r,0])cube([size.x-2*w,w+r,1]);
  }
}
module structure_bottom_panel(size,w) {
  b=flatpack_base_mm;lift=structure_bottom_lift();f=flatpack_fit_mm;
  r=min(2,w/2);
  difference(){
    union(){
      // Preserve the original floor, perforation and plywood seat above the
      // added foundation. Clip the wall footprints out of the upper floor.
      translate([0,0,lift])intersection(){children();translate([w+0.02,0,0])cube([size.x-2*w-0.04,size.y-w-0.02,w]);}
      // Extend the lower cross-section, keeping through openings open and
      // outside plywood recesses accessible from below.
      linear_extrude(height=b)projection(cut=true)translate([0,0,-0.001])intersection(){children();cube([size.x,size.y,w]);}
      translate([0,0,b])linear_extrude(height=flatpack_belt_mm+0.02)
        intersection(){projection(cut=true)translate([0,0,-0.001])children();translate([w+0.02,0])square([size.x-2*w-0.04,size.y-w-0.02]);}
      // The bearing strip is integral with the base, not an isolated skin.
      scale([1,1,b])structure_bottom_seat(size,w,r);
      // Inner shoulders connect every raised tongue to the floor and base.
      for(side=[0:1])translate([side==0?w:size.x-w-r,0,b])cube([r,size.y-w,lift+w-b]);
      translate([w,size.y-w-r,b])cube([size.x-2*w,r,lift+w-b]);
      structure_bottom_tabs(size,w);
      if(stack_system_enabled && stack_bottom_pegs && !stack_pegs_separate)
        structure_peg_positions(size,w)translate([-structure_peg(w)/2,-structure_peg(w)/2,-w])cube([structure_peg(w),structure_peg(w),w+0.01]);
    }
    if(stack_system_enabled && stack_bottom_pegs && stack_pegs_separate)
      structure_peg_positions(size,w)translate([-structure_peg(w)/2-stack_fit_mm,-structure_peg(w)/2-stack_fit_mm,-0.02])cube([structure_peg(w)+2*stack_fit_mm,structure_peg(w)+2*stack_fit_mm,w/2+0.02]);
  }
}
module structure_panel(index,size,w,levels,slide) {
  lift=structure_bottom_lift();b=flatpack_base_mm;
  if(index==1)structure_bottom_panel(size,w)children();
  else if(index>=2 && index<=4)difference(){
    union(){
      translate([0,0,lift])intersection(){children();structure_piece_mask(index,size,w,levels,slide);}
      if(index==2||index==3)translate([index==2?0:size.x-w,0,b])cube([w,size.y,lift+w-b+0.02]);
      else translate([w,size.y-w,b])cube([size.x-2*w,w,lift+w-b+0.02]);
    }
    structure_bottom_tabs(size,w,true,index-2);
  }
  else translate([0,0,lift])intersection(){children();structure_piece_mask(index,size,w,levels,slide);}
}
module structure_flat_position(index,size,w,levels) {
  lift=structure_bottom_lift();
  if(index==0)translate([0,size.y,size.z+lift])rotate([180,0,0])children();
  else if(index==1){
    if(stack_system_enabled && stack_bottom_pegs && !stack_pegs_separate)
      translate([0,size.y,lift+w+flatpack_fit_mm])rotate([180,0,0])children();
    else children();
  }
  else if(index==2)translate([size.z+lift,0,0])rotate([0,-90,0])children();
  else if(index==3)translate([0,0,size.x])rotate([0,90,0])children();
  else if(index==4)translate([0,0,size.y])rotate([-90,0,0])children();
  else translate([0,0,-levels[index-5]-lift])children();
}
module structure_slide_guide(size,w,z,slide) {
  translate([0,0,-z])intersection(){children();translate([w-plywood_guide_depth(w),0,z])cube([size.x-2*w+2*plywood_guide_depth(w),size.y-w,slide]);}
}
module structure_slide_output(size,w,levels,slide) {
  single=render_choice=="shelf_guide";all=render_choice=="shelf_guides";
  if(single || all){
    assert(!single || (slide_shelf_number>=1 && slide_shelf_number<=len(levels) && slide_shelf_number==floor(slide_shelf_number)),"Номер съёмной направляющей выходит за количество ярусов");
    for(i=[0:len(levels)-1])if(!single || i==slide_shelf_number-1)translate(all?[(i%3)*(size.x+15),floor(i/3)*(size.y+15),0]:[0,0,0])structure_slide_guide(size,w,levels[i],slide)children();
  } else {
    difference(){
      children();
      for(z=levels){
        translate([w,-0.02,z])cube([size.x-2*w,size.y-w+0.02,slide]);
        for(side=[0:1])translate([side==0?w-plywood_guide_depth(w)-slide_shelf_fit_mm:size.x-w-0.02,-0.02,z])cube([plywood_guide_depth(w)+slide_shelf_fit_mm+0.02,size.y-w+0.02,slide+slide_shelf_fit_mm]);
      }
    }
    if(render_choice=="plywood_preview")for(z=levels)translate([0,0,z])structure_slide_guide(size,w,z,slide)children();
    if(render_choice=="everything")for(i=[0:len(levels)-1])translate([i*(size.x+20),-size.y-100-max(size.x,size.y,abs(handle_size[1])),0])structure_slide_guide(size,w,levels[i],slide)children();
  }
}
module structure_output(size,w,levels,slide) {
  panel=render_choice=="panel";layout=render_choice=="panels";
  if(panel||layout)assert(flatpack_enabled,"Для отдельных панелей включите панельную сборку шип–паз");
  if(render_choice=="shelf_guide" || render_choice=="shelf_guides")assert(slide_shelves_enabled,"Включите отдельные направляющие в цельном корпусе");
  if(slide_shelves_enabled)structure_slide_output(size,w,levels,slide)children();
  else if(!flatpack_enabled)children();
  else {
    count=5+len(levels);
    assert(!panel || (flatpack_part_index>=1 && flatpack_part_index<=count && flatpack_part_index==floor(flatpack_part_index)),"Номер панели выходит за доступное количество");
    for(i=[0:count-1])if(!panel || i==flatpack_part_index-1)
      if(panel||layout)translate(layout?[(i%3)*(max(size.x,size.z)+15),floor(i/3)*(max(size.y,size.z)+15),0]:[0,0,0])
        structure_flat_position(i,size,w,levels)structure_panel(i,size,w,levels,slide)children();
      else structure_panel(i,size,w,levels,slide)children();
  }
}
