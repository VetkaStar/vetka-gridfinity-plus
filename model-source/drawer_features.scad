// Modified 2026-11-04: custom dimensions, panel assembly and fit-test extensions.
// Project additions are distributed under GPL v3; original credits below are retained.
include <drawer_structure.scad>
// Local configurable surfaces and flush keys. All defaults live in the main model.
// New features never add material inside or outside the nominal chest wall.
function feature_settings(enabled, style, cell, web, border, rotate) = [enabled,style,cell,web,border,rotate];
function feature_settings_all() = [
  [case_back_perf_enabled,case_back_perf_style,case_back_perf_cell,case_back_perf_web,case_back_perf_border,case_back_perf_rotate],
  [case_left_perf_enabled,case_left_perf_style,case_left_perf_cell,case_left_perf_web,case_left_perf_border,case_left_perf_rotate],
  [case_right_perf_enabled,case_right_perf_style,case_right_perf_cell,case_right_perf_web,case_right_perf_border,case_right_perf_rotate],
  [case_top_perf_enabled,case_top_perf_style,case_top_perf_cell,case_top_perf_web,case_top_perf_border,case_top_perf_rotate],
  [case_bottom_perf_enabled,case_bottom_perf_style,case_bottom_perf_cell,case_bottom_perf_web,case_bottom_perf_border,case_bottom_perf_rotate],
  [shelf_perf_enabled,shelf_perf_style,shelf_perf_cell,shelf_perf_web,shelf_perf_border,shelf_perf_rotate],
  [drawer_front_perf_enabled,drawer_front_perf_style,drawer_front_perf_cell,drawer_front_perf_web,drawer_front_perf_border,drawer_front_perf_rotate],
  [drawer_back_perf_enabled,drawer_back_perf_style,drawer_back_perf_cell,drawer_back_perf_web,drawer_back_perf_border,drawer_back_perf_rotate],
  [drawer_left_perf_enabled,drawer_left_perf_style,drawer_left_perf_cell,drawer_left_perf_web,drawer_left_perf_border,drawer_left_perf_rotate],
  [drawer_right_perf_enabled,drawer_right_perf_style,drawer_right_perf_cell,drawer_right_perf_web,drawer_right_perf_border,drawer_right_perf_rotate],
  [drawer_floor_perf_enabled,drawer_floor_perf_style,drawer_floor_perf_cell,drawer_floor_perf_web,drawer_floor_perf_border,drawer_floor_perf_rotate]
];

module feature_validate_patterns() {
  assert(perforation_mode == "legacy" || perforation_mode == "off" || perforation_mode == "individual", "Неизвестный режим перфорации");
  if(perforation_mode == "individual") {
    assert(guide_contact_width >= 2, "Сплошная дорожка направляющей должна быть не меньше 2 мм");
    assert(drawer_handle_keepout >= 1, "Рамка вокруг ручки должна быть не меньше 1 мм");
    for(si=[0:len(feature_settings_all())-1]) let(s=feature_settings_all()[si])
      if(s[0] && !(si==5 && guide_rails_active()) && !(case_structure=="frame" && (si<3 || (si==3 && frame_top_open) || (si==4 && frame_bottom_open)))) {
      assert(s[1]=="square" || s[1]=="hex" || s[1]=="circle" || s[1]=="slots" || s[1]=="voronoi", "Неизвестный тип узора поверхности");
      assert(is_list(s[2]) && len(s[2])==2 && min(s[2])>=0.5, "Размеры отверстий должны быть не меньше 0,5 мм");
      assert(is_num(s[3]) && s[3]>=0.4, "Перемычки должны быть не меньше 0,4 мм");
      assert(is_num(s[4]) && s[4]>=1, "Сплошная рамка должна быть не меньше 1 мм");
    }
  }
}

// Centred, THROUGH cut with an explicit rectangular clip, retaining the chosen rim.
module feature_panel(settings, size, thickness) {
  s=settings;
  if(s[0] && size.x>2*s[4] && size.y>2*s[4])
    intersection() {
      cube([size.x-2*s[4],size.y-2*s[4],thickness+0.08],center=true);
      cutout_pattern(
        patternStyle=s[1]=="hex" ? "hexgrid" : s[1]=="voronoi" ? "voronoi" : "grid",
        canvasSize=size, circleFn=s[1]=="square" ? 4 : s[1]=="hex" ? 6 : 48,
        cellSize=s[2], strength=[s[3],s[3]], holeHeight=thickness+0.08,
        holeRadius=0.5, center=true, centerz=true, fill="crop", border=s[4],
        patternVoronoiNoise=0.6,patternFs=0.5,rotateGrid=s[5],source="independent-surface");
    }
}

module connector_validate(wall, surface=[200,150,140]) {
  assert(is_list(connector_planes) && len(connector_planes)==3 && min(connector_planes)>=0 && max(connector_planes)<=1,"Плоскости ключей: три значения 0 или 1");
  assert(is_list(connector_edges) && len(connector_edges)==4 && min(connector_edges)>=0 && max(connector_edges)<=1,"Края ключей: четыре значения 0 или 1");
  assert(connector_ports>=1 && connector_ports<=4 && connector_ports==floor(connector_ports),"Количество ключей на краю должно быть целым от 1 до 4");
  assert(connector_length>=6 && connector_width>=3 && connector_waist>=1 && connector_waist<connector_width,"Проверьте длину, ширину и шейку ключа");
  assert(connector_depth>=0.5 && connector_skin>=1 && connector_depth+connector_skin<=wall+0.0001,
    "Стенка слишком тонкая для ключей: увеличьте толщину всей стенки или уменьшите глубину кармана. Внутренние утолщения не добавляются");
  assert(connector_fit>=-0.2 && connector_fit<=0.5 && abs(connector_fit)*2<connector_waist,"Посадочный зазор ключа должен быть от -0,2 до 0,5 мм");
  assert(connector_keepout>=1,"Сплошная зона вокруг ключа должна быть не меньше 1 мм");
  if(connector_layout_enabled) {
    assert(is_list(connector_layout_ports),"Не заданы позиции ключей по чертежу");
    for(port=connector_layout_ports) {
      assert(is_list(port) && len(port)==3 && min([port.x,port.y])>=0 && port.x<=surface.x && port.y<=surface.z,"Позиция ключа выходит за корпус");
      assert(port.z==0 || port.z==90,"Неверный поворот ключа по чертежу");
    }
  }
  for(face=[0:2]) if(connector_planes[face] && !connector_layout_enabled) {
    span=[surface.x,face==0 ? surface.z : surface.y];
    assert(min(span)>connector_length+2*connector_keepout,"Ключ слишком велик для выбранной поверхности");
    assert(min(span)/(connector_ports+1)>max(connector_length/2+connector_keepout,connector_width+2*connector_keepout),
      "Карманы ключей слишком близко: уменьшите число/размер ключей или увеличьте корпус");
  }
}

module connector_shape2d(fit=0) {
  offset(delta=-fit)
    polygon([[-connector_length/2,-connector_width/2],[-connector_length/2,connector_width/2],
      [0,connector_waist/2],[connector_length/2,connector_width/2],
      [connector_length/2,-connector_width/2],[0,-connector_waist/2]]);
}

// Local coordinates: u,v in the outer surface, +z points INTO its wall.
module connector_frame(face, size) {
  if(face==0) translate([0,size.y,0]) rotate([90,0,0]) children();
  else if(face==1) children();
  else translate([0,0,size.z]) mirror([0,0,1]) children();
}
module connector_positions(span,face=0) {
  if(connector_layout_enabled) {
    if(face==0) for(port=connector_layout_ports)
      translate([port.x,port.y,0]) rotate([0,0,port.z]) children();
  } else
  for(edge=[0:3]) if(connector_edges[edge])
    for(i=[1:connector_ports])
      translate(edge<2 ? [edge==0 ? 0 : span.x,span.y*i/(connector_ports+1),0]
        : [span.x*i/(connector_ports+1),edge==2 ? 0 : span.y,0])
        rotate([0,0,edge<2 ? 0 : 90]) children();
}
module connector_pockets(size, wall) {
  if(connectors_enabled) {
    connector_validate(wall,size);
    for(face=[0:2]) if(connector_planes[face])
      connector_frame(face,size)
        connector_positions([size.x,face==0 ? size.z : size.y],face)
          translate([0,0,-0.02]) linear_extrude(connector_depth+0.02) connector_shape2d();
  }
}
module connector_keepouts(size, wall) {
  if(connectors_enabled)
    for(face=[0:2]) if(connector_planes[face])
      connector_frame(face,size)
        connector_positions([size.x,face==0 ? size.z : size.y],face)
          translate([0,0,-0.1]) linear_extrude(wall+0.2)
            offset(delta=connector_keepout) connector_shape2d();
}
module feature_safe_cut(size, wall) {
  difference() { children(); connector_keepouts(size,wall); structure_keepouts(size,wall); }
}

// Longitudinal runners: remove material ONLY within an existing divider slab.
// Its top plane and the clearances of BOTH neighbouring drawers never change.
function guide_rails_active() = perforation_mode=="individual" && shelf_perf_enabled && guide_structure=="rails";
function guide_cross_thickness(slide) = guide_crossbar_thickness_mm==0 ? slide/2 : guide_crossbar_thickness_mm;
function guide_cross_recess(slide) = guide_crossbar_recess_mm==0 ? slide-guide_cross_thickness(slide) : guide_crossbar_recess_mm;
module feature_guide_rail_cuts(span,slide) {
  n=guide_rail_count; r=guide_rail_width_mm; side=max(guide_contact_width,r); frame=guide_end_frame_width_mm;
  pitch=(span.x-side)/(n-1);
  gap=n==2 ? span.x-2*side : min(pitch-(side+r)/2,pitch-r);
  assert(n>=2 && n<=32 && n==floor(n),"Полозьев должно быть от 2 до 32");
  assert(r>=1 && frame>=1 && gap>=1 && span.y-2*frame>=1,"Полозья или рамка не помещаются: уменьшите их ширину/количество");
  t=guide_cross_thickness(slide); recess=guide_cross_recess(slide);
  if(guide_crossbars_enabled) {
    assert(guide_crossbar_count>=1 && guide_crossbar_count<=20 && guide_crossbar_count==floor(guide_crossbar_count),"Поперечин должно быть от 1 до 20");
    assert(guide_crossbar_thickness_mm>=0 && guide_crossbar_recess_mm>=0 && t>=0.4 && recess>=0.2 && t+recess<=slide+0.0001,
      "Поперечины должны быть внутри толщины направляющих: толщина от 0,4 мм, отступ вниз от 0,2 мм, их сумма не больше толщины направляющих");
    assert(guide_crossbar_width_mm>=0.6 && (span.y-2*frame)/(guide_crossbar_count+1)>guide_crossbar_width_mm,
      "Поперечины не помещаются по глубине: уменьшите их число или ширину");
  }
  difference() {
    translate([0,0,-0.04]) cube([span.x,span.y,slide+0.08]);
    union() {
      for(x=[0,span.x-side]) translate([x,-0.04,-0.05]) cube([side,span.y+0.08,slide+0.1]);
      if(n>2) for(i=[1:n-2])
        translate([side/2+i*pitch-r/2,-0.04,-0.05]) cube([r,span.y+0.08,slide+0.1]);
      for(y=[0,span.y-frame]) translate([-0.04,y,-0.05]) cube([span.x+0.08,frame,slide+0.1]);
      if(guide_crossbars_enabled) for(i=[1:guide_crossbar_count])
        translate([-0.04,frame+(span.y-2*frame)*i/(guide_crossbar_count+1)-guide_crossbar_width_mm/2,slide-recess-t])
          cube([span.x+0.08,guide_crossbar_width_mm,t]);
    }
  }
}

module feature_chest_cuts(size,wall,outerDrawers,clearance,slide,startH) {
  if(perforation_mode=="individual") {
    s=feature_settings_all();
    feature_safe_cut(size,wall) {
      for(i=[0:len(outerDrawers)-1]) {
        h=outerDrawers[i].z+2*clearance.z;
        z=startH+drawerPosition(i,outerDrawers,clearance,slide)+h/2;
        // Back panel centre lies in the MIDDLE of the actual wall thickness.
        if(case_structure!="frame") translate([size.x/2,size.y-wall/2,z]) rotate([90,0,0])
          feature_panel(s[0],[size.x-2*wall,h],wall);
        if(case_structure!="frame") for(side=[0:1])
          translate([side==0 ? wall/2 : size.x-wall/2,(size.y-wall)/2,z]) rotate([90,0,90])
            feature_panel(s[side+1],[size.y-wall,h],wall);
      }
      if(!(case_structure=="frame" && frame_top_open)) translate([size.x/2,size.y/2,size.z-wall/2]) feature_panel(s[3],[size.x,size.y],wall);
      if(!(case_structure=="frame" && frame_bottom_open)) translate([size.x/2,size.y/2,wall/2]) feature_panel(s[4],[size.x,size.y],wall);
      if(len(outerDrawers)>1)
        for(i=[1:len(outerDrawers)-1]) {
          z=startH+drawerPosition(i,outerDrawers,clearance,slide)-slide/2;
          if(guide_rails_active())
            translate([wall,0,z-slide/2]) feature_guide_rail_cuts([size.x-2*wall,size.y-wall],slide);
          else if(case_structure!="frame") translate([size.x/2,(size.y-wall)/2,z])
            feature_panel(s[5],[size.x-2*(wall+guide_contact_width),size.y-wall],slide);
        }
    }
  }
}
module feature_drawer_cuts(size,wall,handle,rotated,base) {
  if(perforation_mode=="individual") {
    s=feature_settings_all();
    if(s[10][0]) assert(base=="floor", "Для перфорации дна выберите сплошное дно без решётки Gridfinity");
    hh=handle.z==0 ? size.z/2 : handle.z<0 ? size.z/abs(handle.z) : handle.z;
    handleBand=(rotated ? max(handle.x,hh) : handle.x)+2*drawer_handle_keepout;
    difference() {
    union() {
    difference() {
      translate([size.x/2,wall/2,size.z/2]) rotate([90,0,0]) feature_panel(s[6],[size.x,size.z],wall);
      translate([(size.x-handleBand)/2,-0.1,-0.1]) cube([handleBand,wall+0.2,size.z+0.2]);
    }
    translate([size.x/2,size.y-wall/2,size.z/2]) rotate([90,0,0]) feature_panel(s[7],[size.x,size.z],wall);
    for(side=[0:1])
      translate([side==0 ? wall/2 : size.x-wall/2,size.y/2,size.z/2]) rotate([90,0,90])
        feature_panel(s[8+side],[size.y,size.z],wall);
    }
    // Continuous lower wall band: holes never interrupt the sliding contact edge.
    translate([-0.1,-0.1,-0.1]) cube([size.x+0.2,size.y+0.2,wall+guide_contact_width+0.1]);
    }
    floorSettings=[s[10][0],s[10][1],s[10][2],s[10][3],max(s[10][4],wall+guide_contact_width),s[10][5]];
    translate([size.x/2,size.y/2,wall/2]) feature_panel(floorSettings,[size.x,size.y],wall);
  }
}

module connector_key() {
  // Recessed 0.1 mm below the nominal outer surface; no added assembly gap.
  linear_extrude(max(0.3,connector_depth-0.1)) connector_shape2d(connector_fit);
}
module connector_key_plate() {
  connector_validate(chest_wall_thickness);
  assert(connector_key_count>=1 && connector_key_count<=40 && connector_key_count==floor(connector_key_count),"Количество печатных ключей должно быть от 1 до 40");
  for(i=[0:connector_key_count-1])
    translate([(i%5)*(connector_length+4),floor(i/5)*(connector_width+4),0]) connector_key();
}
module connector_test_coupon() {
  // The coupon is a test piece, so it carries a wall thick enough for its own pocket.
  wall_c=max(chest_wall_thickness,connector_depth+connector_skin);
  connector_validate(wall_c);
  w=connector_length/2+5; h=connector_width+10;
  for(side=[0:1]) translate([side*(w+5),0,0])
    difference() {
      cube([w,h,wall_c]);
      translate([side==0 ? w : 0,h/2,wall_c-connector_depth])
        linear_extrude(connector_depth+0.02) connector_shape2d();
    }
  translate([w, h+connector_width,0]) connector_key();
}
