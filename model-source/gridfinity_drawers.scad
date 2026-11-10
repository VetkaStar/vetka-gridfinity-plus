// Modified 2026-11-04: custom dimensions, panel assembly and fit-test extensions.
// Project additions are distributed under GPL v3; original credits below are retained.
// Gridfinity drawer system.
// Intended for Gridfinity bins to sit in the drawers, meaning the outer chest will not fit neatly on to a gridfinity grid.
//
// Original OpenSCAD design was provided by @monniasza
// Inspiration for their design was https://www.printables.com/pl/model/363389
// The design has deviated significantly, I would not consider this compatible with the original.

use <modules/module_gridfinity_cup.scad>
use <modules/module_gridfinity_block.scad>
use <modules/module_gridfinity_baseplate.scad>
include <modules/gridfinity_constants.scad>
include <modules/polyround.scad>
use <modules/module_item_holder.scad>
include <modules/module_patterns.scad>
include <drawer_features.scad>

/* [Render] */
// select what to render
render_choice = "everything"; //[everything:Everything, onedrawer:Single Drawer, drawers:All drawers, chest:Chest]
position="center"; //["center","zero"]

/* [Size Mode] */
// Gridfinity units or exact external chest dimensions in millimetres.
size_mode = "gridfinity"; //[gridfinity, custom]
chest_outer_width_mm = 200;
chest_outer_depth_mm = 150;
chest_outer_height_mm = 120;

/* [Chest] */
//Inner width of drawer in Gridfinity units
drawer_inner_width = 4;
//Inner depth of drawer in Gridfinity units
drawer_inner_depth = 3;
//Inner height of drawer in Gridfinity units
drawer_inner_height = 4;
//Number of drawers
drawer_count = 3;
drawer_enable_custom_sizes = false;
//Inner height of drawer in Gridfinity units. Edit in script for more than 4 items.
drawer_custom_sizes = [1,2,3,4];
//Add clearance inside the drawers for the bins. Width, depth and height. Default is 0.25
drawer_clearance = [0.25,0.25,0.25];
//Add clearance inside the chest for the drawer. width, depth and height. Default is 0.25
chest_clearance = [0.25,0.25,0.25];
//Wall thickness of the chest.
chest_wall_thickness = 2; // 0.1
//Thickness of drawer slides in mm. 0 is uses wall thickness.
chest_drawer_slide_thickness = 0;
//Width of drawer slies in mm. 0 is full chest width.
chest_drawer_slide_width = 10;

/* [Drawer] */
// Handle size width, depth, height, and radius. Height, less than 0 drawerHeight/abs(height). radius, -1 = depth/2.
handle_size = [4, 10, -1, -1];
handle_vertical_center = false;
handle_cut_factor=0.5;
handle_rotate = false;
drawer_wall_thickness = 2; // 0.1
drawer_base = "default"; //[grid:Grid only, floor:floor only, default:Grid and floor]
drawer_enable_magnet = true;
drawer_magnet_size = [6.5, 2.4];  // .1

/* [Chest Top Plate] */
chest_top_wallpattern_style = "none"; //[none, grid, gridrotated, hexgrid,hexgridrotated, voronoi,voronoigrid,voronoihexgrid]
// Plate Style
chest_top_style = "none"; //[none: None, baseplate:Base Plate, lugs: Supportless feet]
// Enable magnets in the bin corner
chest_top_base_plate_enable_magnets = true;
// (Zack's design uses magnet diameter of 6.5, 2.4)
chest_top_base_plate_magnet_size = [6.5, 2.4];  // .1
//Reduce the frame wall size to this value
chest_top_base_plate_reduced_wall_height = -1; //0.1
chest_top_base_plate_reduced_wall_taper = false;

/* [Chest Base] */
chest_bottom_wallpattern_style = "none"; //[none, grid, gridrotated, hexgrid,hexgridrotated, voronoi,voronoigrid,voronoihexgrid]
chest_bottom_grid = "none"; //[none: None, grid: Gridfinity grid, lugs: Supportless feet]
//Fit clearance of chest feet
chest_leg_clearance = 0.35; //.001

// (Zack's design uses magnet diameter of 6.5)
magnet_diameter = 6.5;  // .1
// (Zack's design uses depth of 6)
screw_depth = 6;
// Sequential Bridging hole overhang remedy is active only when both screws and magnets are nonzero (and this option is selected)
hole_overhang_remedy = 2;
//Only add attachments (magnets and screw) to chest corners (prints faster).
chest_corner_attachments_only = true;
// AKA half pitch. Enable to subdivide bottom pads to allow sub-cell offsets
sub_pitch = 1; //[1:"disabled",2:"half pitch",3:"third pitch",4:"quarter pitch"]
// Removes the internal grid from base the shape
flat_base = "off";

/* [Chest Wall Pattern] */
// wall pattern border width. -1 defaults to chest_wall_thickness. less than 0 chest_wall_thickness/abs(wallpattern_border_width)
wallpattern_border_width = -1;
efficient_back = true;
// Grid wall patter
wallpattern_enabled=false;
// Style of the pattern
wallpattern_style = "hexgrid"; //[hexgrid, grid, voronoi, voronoigrid, voronoihexgrid, brick, brickoffset]
// Spacing between pattern
wallpattern_strength = 2; //0.1
// wall to enable on, front, back, left, right.
wallpattern_walls=[1,1,1,1];  //[0:1:1]
// rotate the grid
wallpattern_rotate_grid=false;
//Size of the hole
wallpattern_cell_size = [10,10]; //0.1
// Add the pattern to the dividers
wallpattern_dividers_enabled="disabled"; //[disabled, horizontal, vertical, both]
//Number of sides of the hole op
wallpattern_hole_sides = 6; //[4:square, 6:hex, 8:octo, 64:circle]
//Radius of corners
wallpattern_hole_radius = 0.5;
// pattern fill mode
wallpattern_fill = "none"; //[none, space, crop, crophorizontal, cropvertical, crophorizontal_spacevertical, cropvertical_spacehorizontal, spacevertical, spacehorizontal]
// border around the wall pattern, default is wall thickness
wallpattern_border = 0;
// depth of imprint in mm, 0 = is wall width.
wallpattern_depth = 0; // 0.1
//grid pattern hole taper
wallpattern_pattern_grid_chamfer = 0; //0.1
//voronoi pattern noise,
wallpattern_pattern_voronoi_noise = 0.75; //0.01
//brick pattern center weight
wallpattern_pattern_brick_weight = 5;
//$fs for floor pattern, min size face.
wallpattern_pattern_quality = 0.4;//0.1:0.1:2

/* [model detail] */
// minimum angle for a fragment (fragments = 360/fa).  Low is more fragments
fa = 6;
// minimum size of a fragment.  Low is more fragments
fs = 0.1;
// number of fragments, overrides $fa and $fs
fn = 0;

/* [Independent Features] */
perforation_mode = "legacy";
case_back_perf_enabled = false;
case_back_perf_style = "hex";
case_back_perf_cell = [10, 10];
case_back_perf_web = 2;
case_back_perf_border = 5;
case_back_perf_rotate = false;
case_left_perf_enabled = false;
case_left_perf_style = "hex";
case_left_perf_cell = [10, 10];
case_left_perf_web = 2;
case_left_perf_border = 5;
case_left_perf_rotate = false;
case_right_perf_enabled = false;
case_right_perf_style = "hex";
case_right_perf_cell = [10, 10];
case_right_perf_web = 2;
case_right_perf_border = 5;
case_right_perf_rotate = false;
case_top_perf_enabled = false;
case_top_perf_style = "hex";
case_top_perf_cell = [10, 10];
case_top_perf_web = 2;
case_top_perf_border = 5;
case_top_perf_rotate = false;
case_bottom_perf_enabled = false;
case_bottom_perf_style = "hex";
case_bottom_perf_cell = [10, 10];
case_bottom_perf_web = 2;
case_bottom_perf_border = 5;
case_bottom_perf_rotate = false;
shelf_perf_enabled = false;
shelf_perf_style = "square";
shelf_perf_cell = [10, 10];
shelf_perf_web = 2;
shelf_perf_border = 5;
shelf_perf_rotate = false;
drawer_front_perf_enabled = false;
drawer_front_perf_style = "hex";
drawer_front_perf_cell = [10, 10];
drawer_front_perf_web = 2;
drawer_front_perf_border = 5;
drawer_front_perf_rotate = false;
drawer_back_perf_enabled = false;
drawer_back_perf_style = "hex";
drawer_back_perf_cell = [10, 10];
drawer_back_perf_web = 2;
drawer_back_perf_border = 5;
drawer_back_perf_rotate = false;
drawer_left_perf_enabled = false;
drawer_left_perf_style = "hex";
drawer_left_perf_cell = [10, 10];
drawer_left_perf_web = 2;
drawer_left_perf_border = 5;
drawer_left_perf_rotate = false;
drawer_right_perf_enabled = false;
drawer_right_perf_style = "hex";
drawer_right_perf_cell = [10, 10];
drawer_right_perf_web = 2;
drawer_right_perf_border = 5;
drawer_right_perf_rotate = false;
drawer_floor_perf_enabled = false;
drawer_floor_perf_style = "hex";
drawer_floor_perf_cell = [10, 10];
drawer_floor_perf_web = 2;
drawer_floor_perf_border = 5;
drawer_floor_perf_rotate = false;
guide_contact_width = 4;
case_structure = "sheet";
frame_border_mm = 8;
frame_rib_mm = 4;
frame_side_vertical = 0;
frame_side_horizontal = 0;
frame_back_vertical = 0;
frame_back_horizontal = 0;
frame_side_bracing = "none";
frame_back_bracing = "none";
frame_shelf_bracing = "none";
frame_back_diagonal = false;
frame_top_vertical = 0;
frame_top_horizontal = 0;
frame_top_bracing = "none";
frame_bottom_vertical = 0;
frame_bottom_horizontal = 0;
frame_bottom_bracing = "none";
frame_top_open = false;
frame_bottom_open = true;
stack_system_enabled = false;
stack_bottom_pegs = true;
stack_pegs_separate = false;
stack_top_sockets = true;
stack_peg_size_mm = 0;
stack_peg_inset_mm = 0;
stack_fit_mm = 0.15;
slide_shelves_enabled = false;
slide_shelf_fit_mm = 0.15;
slide_shelf_number = 1;
plywood_enabled = false;
plywood_thickness_mm = 3;
plywood_fit_mm = 0.15;
plywood_lip_mm = 2;
plywood_rim_mm = 1;
plywood_sides_mode = "off";
plywood_back_mode = "off";
plywood_top_mode = "off";
plywood_bottom_mode = "off";
plywood_shelves_mode = "off";
flatpack_enabled = false;
flatpack_base_mm = 1.5;
flatpack_belt_mm = 1.5;
flatpack_tab_count = 2;
flatpack_tab_count_side = 0;
flatpack_tab_count_back = 0;
flatpack_tab_depth_mm = 0;
flatpack_tab_width_mm = 8;
flatpack_fit_mm = 0.15;
flatpack_part_index = 1;
guide_structure = "pattern";
guide_rail_count = 6;
guide_rail_width_mm = 4;
guide_end_frame_width_mm = 4;
guide_crossbars_enabled = true;
guide_crossbar_count = 2;
guide_crossbar_width_mm = 3;
guide_crossbar_thickness_mm = 0;
guide_crossbar_recess_mm = 0;
drawer_handle_keepout = 4;
custom_drawer_heights_enabled = false;
custom_drawer_heights_mm = [0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0, 0];
single_drawer_number = 1;
connectors_enabled = false;
connector_planes = [1, 0, 0];
connector_edges = [1, 1, 1, 1];
connector_ports = 2;
connector_length = 20;
connector_width = 10;
connector_waist = 5;
connector_depth = 2;
connector_skin = 1.5;
connector_fit = 0.1;
connector_keepout = 2;
connector_key_count = 8;

/* [Hidden] */
connector_layout_enabled = false;
connector_layout_ports = [];
module end_of_customizer_opts() {}

//Some online generators do not like direct setting of fa,fs,fn
$fa = fa;
$fs = fs;
$fn = fn;

colour_drawer = "Teal";
colour_drawer_pull = "CadetBlue";
colour_chest = "Maroon";

function drawerPosition(
  index,
  outerSizes,
  clearance,
  sliderThickness) = let(
  drawersTotal = (index<1 ? 0 : sum(partial(outerSizes,0,index-1)).z),
  clearanceTotal = clearance.z*2*(index),
  sliderThickness = sliderThickness*index) drawersTotal + clearanceTotal + sliderThickness;

//Drawer modules
module drawers(
  drawerCount,
  innerUnitSize,
  innerSizes,// = drawerInnerSizes,
  outerSizes,// = drawerOuterSizes,
  drawerBase, // = drawerbase,
  wallThickness,// = wallthicknessInner,
  handleSize,
  handleVerticalCenter,
  handleRotate,
  ridgeDepth,
  startH,
  chestClearance,
  chestWallThickness,
  magnetSize = [0,0],
  drawerClearance)
{
  assert(is_list(chestClearance) && len(chestClearance) == 3, "chestClearance must be a list of length 3");
  assert(is_list(drawerClearance) && len(drawerClearance) == 3, "drawerClearance must be a list of length 3");

  offsetW = chestWallThickness + chestClearance.x;

  for(i = [0 : drawerCount-1]){
    //IncrementH = 0;
    zpos = startH + drawerPosition(i, outerSizes, chestClearance, ridgeDepth);
    //(clearance * i) + (i<1 ? 0 : sum(partial(drawerOuterSizes,0,i-1)).z);
    if(env_help_enabled("debug")) echo("drawers", i= i, StartH=StartH, clearance=clearance, height=drawerInnerHeights[i], zpos=zpos, drawerOuterz=drawerOuterSizes.z, drawerInnerz=drawerInnerSizes.z, drawerOuterSizes.z);

    translate($preview
      ? [chestWallThickness+chestClearance.x, ((drawerCount-i)/(drawerCount+1)*-innerUnitSize.y*env_pitch().y/(1.5))+offsetW, zpos]
      : [(innerUnitSize.x+0.5)*i*env_pitch().x,0,0])
      drawer(drawerIndex=i,
        innerUnitSize=innerUnitSize,
        drawerBase=drawerBase,// = drawerbase,
        wallThickness=wallThickness,// = wallthicknessInner,
        handleSize=handleSize,
        handleVerticalCenter=handleVerticalCenter,
        handleRotate=handleRotate,
        innerSizes=innerSizes,
        outerSizes=outerSizes,
        magnetSize=magnetSize,
        clearance=drawerClearance);
  }
}

module drawer(
  drawerIndex,
  innerUnitSize,
  drawerBase,// = drawerbase,
  wallThickness,// = wallthicknessInner,
  handleSize,
  handleVerticalCenter,
  handleRotate,
  innerSizes,// = drawerInnerSizes,
  outerSizes,// = drawerOuterSizes,
  magnetSize = [0,0],
  clearance)
{
  assert(is_list(clearance) && len(clearance) == 3, "clearance must be a list of length 3");
  drawerFloor = (drawerBase == "default" || drawerBase == "floor");
  floorThickness = wallThickness;

  difference() {
  union(){
    difference(){
      color(colour_drawer)
      roundedCube(
        x=outerSizes[drawerIndex].x,
        y=outerSizes[drawerIndex].y,
        z=outerSizes[drawerIndex].z,
        sideRadius = 6);

      translate([wallThickness, wallThickness, floorThickness-fudgeFactor])
        color(colour_drawer)
        roundedCube(
          //remove the main grid space
          x=innerSizes[drawerIndex].x-fudgeFactor*2,
          y=innerSizes[drawerIndex].y-fudgeFactor*2,
          z=innerSizes[drawerIndex].z+fudgeFactor*2,
          sideRadius = 4);
          if(drawerBase == "grid"){
            translate([wallThickness+clearance.x/2+0.25,wallThickness+clearance.y/2+0.25, -fudgeFactor])
            roundedCube(
              x=env_pitch().x*innerUnitSize.x-0.5,
              y=env_pitch().y*innerUnitSize.y-0.5,
              z=floorThickness+fudgeFactor,
              sideRadius = 4);
        }
      }

      if(drawerBase == "default" || drawerBase == "grid"){
        translate([
          wallThickness,
          wallThickness,
          (drawerFloor ? floorThickness-fudgeFactor : 0)-fudgeFactor*2])
          baseplate(
            width = innerUnitSize.x,
            depth = innerUnitSize.y,
            outer_width = innerUnitSize.x+clearance.x/env_pitch().x,
            outer_depth = innerUnitSize.y+clearance.y/env_pitch().y,
            plateOptions = "default",
            magnetSize = magnetSize);
      }

    handelHeight = handleSize.z == 0 ? outerSizes[drawerIndex].z/2
      : handleSize.z <0 ? outerSizes[drawerIndex].z/abs(handleSize.z) : handleSize.z;

    //Drawer handle
    color(colour_drawer_pull)
    translate([
        outerSizes[drawerIndex].x/2,
        0,
        handleVerticalCenter
          ? outerSizes[drawerIndex].z/2
          : handleRotate ? handleSize.x/2 : handelHeight/2])
      rotate(handleRotate ? [0,90,0] : [0,0,0])
      drawerPull(handleSize.x, handleSize.y, handelHeight, handleSize[3]);
  }
    feature_drawer_cuts(outerSizes[drawerIndex], wallThickness, handleSize, handleRotate, drawerBase);
  }
}

module drawerPull(width, depth, height, radius) {
  difference() {
      basicDrawerPull(width, depth, height, radius);
      basicDrawerPull(width*1.5,
        depth-(1-handle_cut_factor)*height/2,
        height*handle_cut_factor,
        // radius*handle_cut_factor);
        radius-(1-handle_cut_factor)*height/2);
  }
}
module basicDrawerPull(width, depth, height, radius){
  radius = min(radius < 0 ? depth/2 : radius, height/2,depth);
    translate([-width/2,-depth, -height/2])
    if (radius == 0){ cube([width, depth, height]); }
    else {
        hull(){
            translate([0,radius,0])
            cube([width, depth-radius, height]);

            // i = 0 is for the top one and 1 for the bottom
            for (i = [0:1])
            {
              translate(i == 0 ? [0, radius, height-radius] :
                [0, radius, radius])
              rotate(i == 0 ? [180, 0, 0] : [-90,0,0])
              rotate([0,90,0])
              color(i == 0 ? "yellow" : "blue")
              PartialCylinder(width,radius,90);
            }
        }
    }
}

//Chest modules
module chest(
  outerChest,
  totalH,
  chestWallThickness,
  enableTopGrid,
  topStyle,
  topWallPatternStyle,
  topBasePlateMagnetSize,
  topBasePlateReducedWallHeight,
  topBasePlateReducedWallTaper,
  bottomGrid,
  bottomMagnetDiameter,
  bottomScrewDepth,
  bottomHoleOverhangRemedy,
  bottomCornerAttachmentsOnly,
  bottomSubPitch,
  bottomFlatBase,
  drawerCount,
  drawerInnerUnitSize,
  drawerOuterSizes,
  drawerSlideThickness,
  drawerWallThickness,
  startH,
  clearance,
  chestLegClearance
){
  assert(is_list(clearance), "clearance must be a list");
  bottomGridOffset = [
    chestWallThickness + clearance.x + (drawerOuterSizes[0].x-drawerInnerUnitSize.x*env_pitch().x)/2,
    chestWallThickness + clearance.y + (drawerOuterSizes[0].y-drawerInnerUnitSize.y*env_pitch().y)/2, 0];

  topGridOffset = [bottomGridOffset.x - 0.25, bottomGridOffset.y - 0.25,0];

  difference(){
    union(){
      color(colour_chest)
      cube([outerChest.x, outerChest.y, totalH]);

      if(bottomGrid != "none") {
        baseHeight=0.7;
        translate(bottomGridOffset)
        tz(-env_pitch().z*baseHeight+fudgeFactor)
        if(bottomGrid == "grid") grid_block(
          num_x=drawerInnerUnitSize.x,
          num_y=drawerInnerUnitSize.y,
          num_z=baseHeight,
          position = "zero",
          lipStyle = "none",    //"minimum" "none" "reduced" "reduced_double" "normal"
          filledin = "disabled", //[disabled, enabled, enabledfilllip]
          cupBase_settings = CupBaseSettings(
            magnetSize=[bottomMagnetDiameter, 2.6],
            screwSize=[4,bottomScrewDepth],
            holeOverhangRemedy=bottomHoleOverhangRemedy,
            cornerAttachmentsOnly=bottomCornerAttachmentsOnly,
            subPitch = bottomSubPitch,
            flatBase = bottomFlatBase));
            //echo(x=drawerInnerUnitSize.x, y=drawerInnerUnitSize.y);
         if(bottomGrid == "lugs") feet(drawerInnerUnitSize.x, drawerInnerUnitSize.y, outerChest.x);
      }

      if(topStyle == "baseplate") {
        //translate(topGridOffset)
        tz(totalH-fudgeFactor)
        baseplate(
          width = drawerInnerUnitSize.x,
          depth = drawerInnerUnitSize.y,
          outer_width = outerChest.x/env_pitch().x,
          outer_depth = outerChest.y/env_pitch().y,
          outer_height = topBasePlateReducedWallHeight,
          magnetSize = topBasePlateMagnetSize,
          plateOptions = "default",
          plate_corner_radius = 0,
          //reducedWallHeight = ,
          reduceWallTaper = topBasePlateReducedWallTaper);
      } else if(topStyle == "lugs"){
          translate([0, 0, totalH - fudgeFactor]) footrecess(drawerInnerUnitSize.x, drawerInnerUnitSize.y, outerChest.x, outerChest.y, widen = chestLegClearance);
      }
    }
    children();
  }
}

module chestCutouts(
  drawerCount,
  drawerOuterSizes,
  ridgeDepth,
  drawerSlideThickness,
  drawerSlideWidth,
  startH,
  outerChest,
  clearance,
  chestWallThickness,
  efficientBack,
  topWallPatternStyle,
  bottomWallpatternStyle,
  wall_pattern_settings
){
  efficientBackThickness= chestWallThickness+fudgeFactor*2;

  partial_depth_pattern = wall_pattern_settings[iPatternDepth] != 0;
  wallPattern_thickness = get_related_value(wall_pattern_settings[iPatternDepth], chestWallThickness)+fudgeFactor*2;


  for(iDrawer = [0 : drawerCount-1]){
    innerchest = [
      drawerOuterSizes[iDrawer].x + clearance.x*2,
      drawerOuterSizes[iDrawer].y + clearance.y*2,
      drawerOuterSizes[iDrawer].z + clearance.z*2];

    //positions for wall cutouts
    back = [
      [innerchest.z-ridgeDepth*2,innerchest.x-ridgeDepth*2], //size
      [innerchest.x/2+chestWallThickness, innerchest.y+chestWallThickness/2, innerchest.z/2], //location: centred through back wall
      [0,90,90], [0,0,0]]; //rotation , mirror
    left = [
      [innerchest.z-ridgeDepth*2,innerchest.y-ridgeDepth*2],    //size
      [+chestWallThickness/2, (innerchest.y+chestWallThickness)/2, innerchest.z/2], //location
      [0,90,0], [0,0,1]];//rotation, mirror
    right = [
      [innerchest.z-ridgeDepth*2,innerchest.y-ridgeDepth*2],//size
      [innerchest.x+chestWallThickness*2-wallPattern_thickness/2+fudgeFactor, (innerchest.y+chestWallThickness)/2, innerchest.z/2],//location
      [0,90,0], [0,0,0]];//rotation, mirror

    vpos = startH + drawerPosition(iDrawer, drawerOuterSizes, clearance, drawerSlideThickness);

    locations = [back, left, right];

    color(colour_chest)
    translate([chestWallThickness, -fudgeFactor, vpos])
      cube([innerchest.x, innerchest.y+fudgeFactor, innerchest.z]);

    if(efficientBack)
      feature_safe_cut(outerChest,chestWallThickness)
      translate([back[1].x,innerchest.y-fudgeFactor,back[1].z])
      translate([-back[0][1]/2, 0, vpos-back[0][0]/2])
      cube([back[0][1], efficientBackThickness, back[0][0]]);

    if(!partial_depth_pattern && wall_pattern_settings[iPatternEnabled])
      feature_safe_cut(outerChest,chestWallThickness)
      translate([0, 0, vpos])
      for(iSide = [efficientBack ? 1 : 0:1:len(locations)-1])
        if(wallpattern_walls[iSide+1] != 0)
        translate(locations[iSide][1])
        rotate(locations[iSide][2])
        mirror(locations[iSide][3])
        render() //Render on chest pattern because detailed patters can be slow
        cutout_pattern(
          patternStyle = wall_pattern_settings[iPatternStyle],
          canvasSize = locations[iSide][0],
          border = wall_pattern_settings[iPatternBorder],
          customShape = false,
          circleFn = wall_pattern_settings[iPatternHoleSides],
          cellSize = wall_pattern_settings[iPatternCellSize],
          strength = wall_pattern_settings[iPatternStrength],
          holeHeight = wallPattern_thickness,
          center=true,
          centerz = true,
          fill = wall_pattern_settings[iPatternFill], //"none", "space", "crop"
          patternGridChamfer = wall_pattern_settings[iPatternGridChamfer],
          patternVoronoiNoise = wall_pattern_settings[iPatternVoronoiNoise],
          patternBrickWeight = wall_pattern_settings[iPatternBrickWeight],
          partialDepth = wall_pattern_settings[iPatternDepth] != 0,
          holeRadius = wall_pattern_settings[iPatternHoleRadius],
          source = "chestCutouts",
          rotateGrid = wall_pattern_settings[iPatternRotate],
          patternFs = wall_pattern_settings[iPatternFs]);
  }

  if(partial_depth_pattern) {
    //positions for wall cutouts
    back = [
      [outerChest.z-ridgeDepth*2,outerChest.x-ridgeDepth*2], //size
      [outerChest.x/2, outerChest.y+chestWallThickness/2-efficientBackThickness/2, outerChest.z/2], //location
      [0,90,90], [0,0,0]]; //rotation , mirror
    left = [
      [outerChest.z-ridgeDepth*2,outerChest.y-ridgeDepth*2],    //size
      [+chestWallThickness/2-wallPattern_thickness/2, outerChest.y/2, outerChest.z/2], //location
      [0,90,0], [0,0,1]];//rotation, mirror
    right = [
      [outerChest.z-ridgeDepth*2,outerChest.y-ridgeDepth*2],//size
      [outerChest.x-wallPattern_thickness/2+fudgeFactor, outerChest.y/2, outerChest.z/2],//location
      [0,90,0], [0,0,0]];//rotation, mirror

    locations = [back, left, right];

    if(wall_pattern_settings[iPatternEnabled])
      feature_safe_cut(outerChest,chestWallThickness)
      translate([0, 0, 0])
      for(iSide = [efficientBack ? 1 : 0:1:len(locations)-1])
        if(wallpattern_walls[iSide+1] != 0)
        translate(locations[iSide][1])
        rotate(locations[iSide][2])
        mirror(locations[iSide][3])
        render() //Render on chest pattern because detailed patters can be slow
        cutout_pattern(
          patternStyle = wall_pattern_settings[iPatternStyle],
          canvasSize = locations[iSide][0],
          border = wall_pattern_settings[iPatternBorder],
          customShape = false,
          circleFn = wall_pattern_settings[iPatternHoleSides],
          cellSize = wall_pattern_settings[iPatternCellSize],
          strength = wall_pattern_settings[iPatternStrength],
          holeHeight = wallPattern_thickness,
          center=true,
          centerz = true,
          fill = wall_pattern_settings[iPatternFill], //"none", "space", "crop"
          patternGridChamfer = wall_pattern_settings[iPatternGridChamfer],
          patternVoronoiNoise = wall_pattern_settings[iPatternVoronoiNoise],
          patternBrickWeight = wall_pattern_settings[iPatternBrickWeight],
          partialDepth = wall_pattern_settings[iPatternDepth] != 0,
          holeRadius = wall_pattern_settings[iPatternHoleRadius],
          source = "chestCutouts",
          rotateGrid = wall_pattern_settings[iPatternRotate],
          patternFs = wall_pattern_settings[iPatternFs]);

  }

  top = [
    [outerChest.x-ridgeDepth*2,outerChest.y-ridgeDepth*2], //size
    [outerChest.x/2, outerChest.y/2, outerChest.z-chestWallThickness-fudgeFactor], //location
    [0,0,0],
    topWallPatternStyle]; //rotation
  bottom = [
    [outerChest.x-ridgeDepth*2,outerChest.y-ridgeDepth*2], //size
    [outerChest.x/2, outerChest.y/2, -fudgeFactor], //location
    [0,0,0],
    bottomWallpatternStyle]; //rotation

  feature_safe_cut(outerChest,chestWallThickness)
  for(side = [top, bottom])
    if(side[3] != "none")
      translate(side[1])
      rotate(side[2])
      render() //Render on chest pattern because detailed patters can be slow
        cutout_pattern(
          // Panel styles predate the shared PatternSettings API. Use the same
          // validated settings as the walls, and normalize rotated style aliases.
          patternStyle = side[3] == "gridrotated" ? "grid"
            : side[3] == "hexgridrotated" ? "hexgrid" : side[3],
          canvasSize = side[0],
          customShape = false,
          circleFn = wall_pattern_settings[iPatternHoleSides],
          cellSize = wall_pattern_settings[iPatternCellSize],
          strength = wall_pattern_settings[iPatternStrength],
          holeHeight = wallPattern_thickness,
          center=true,
          fill = wall_pattern_settings[iPatternFill],
          patternGridChamfer = wall_pattern_settings[iPatternGridChamfer],
          patternVoronoiNoise = wall_pattern_settings[iPatternVoronoiNoise],
          patternBrickWeight = wall_pattern_settings[iPatternBrickWeight],
          holeRadius = wall_pattern_settings[iPatternHoleRadius],
          border = wall_pattern_settings[iPatternBorder],
          patternFs = wall_pattern_settings[iPatternFs],
          rotateGrid = side[3] == "gridrotated" || side[3] == "hexgridrotated",
          source = "chestCutouts-panel");

  color(colour_chest)
  if(drawerSlideWidth > 0 && drawerCount > 1)
  {
    zposFirstDivider =drawerPosition(1, drawerOuterSizes, clearance, drawerSlideThickness)-drawerSlideThickness*2;
    zposLastDivider =drawerPosition(drawerCount-1, drawerOuterSizes, clearance, drawerSlideThickness)+drawerSlideThickness;
    translate([drawerSlideWidth, -drawerSlideWidth, startH+zposFirstDivider])
      roundedCube(
        x=outerChest.x-drawerSlideWidth*2,
        y=outerChest.y, //was innerchest
        z=zposLastDivider-zposFirstDivider,
        sideRadius = drawerSlideWidth-fudgeFactor*2);
  }
}

//render function
module gridfinity_drawer(
    sizeMode = size_mode,
    outerSizeMm = [chest_outer_width_mm, chest_outer_depth_mm, chest_outer_height_mm],
    render_choice = render_choice,
    position = position,
    drawerInnerWidth = drawer_inner_width,
    drawerInnerDepth = drawer_inner_depth,
    drawerInnerHeight = drawer_inner_height,
    drawerCount = drawer_count,
    drawerEnableCustomSizes = drawer_enable_custom_sizes,
    drawerCustomSizes = drawer_custom_sizes,
    drawerClearance = drawer_clearance,
    chestClearance = chest_clearance,
    chestWallThickness = chest_wall_thickness,
    chestDrawerSlideThickness = chest_drawer_slide_thickness,
    chestDrawerSlideWidth = chest_drawer_slide_width,
    handleSize = handle_size,
    handleVerticalCenter = handle_vertical_center,
    handleRotate = handle_rotate,
    drawerWallThickness = drawer_wall_thickness,
    drawerBase = drawer_base,
    drawerMagnetSize = drawer_enable_magnet ? drawer_magnet_size : [0,0],
    chestTopStyle = chest_top_style,
    chestTopWallPatternStyle=chest_top_wallpattern_style,
    chestTopBasePlateMagnetSize = chest_top_base_plate_enable_magnets? chest_top_base_plate_magnet_size : [0,0],
    chestTopBasePlateReducedWallHeight = chest_top_base_plate_reduced_wall_height,
    chestTopBasePlateReducedWallTaper = chest_top_base_plate_reduced_wall_taper,
    bottomGrid = chest_bottom_grid,
    bottomWallpatternStyle = chest_bottom_wallpattern_style,
    bottomMagnetDiameter = magnet_diameter,
    bottomScrewDepth = screw_depth,
    bottomHoleOverhangRemedy = hole_overhang_remedy,
    bottomCornerAttachmentsOnly = chest_corner_attachments_only,
    bottomSubPitch = sub_pitch,
    bottomFlatBase = flat_base,
    wallPatternBorderWidth=wallpattern_border_width,
    efficientBack = efficient_back,
    wall_pattern_settings = PatternSettings(
      patternEnabled = perforation_mode == "legacy" && case_structure!="frame" && wallpattern_enabled,
      patternStyle = wallpattern_style,
      patternRotate = wallpattern_rotate_grid,
      patternFill = wallpattern_fill,
      patternBorder = wallpattern_border,
      patternDepth = wallpattern_depth,
      patternCellSize = wallpattern_cell_size,
      patternHoleSides = wallpattern_hole_sides,
      patternStrength = wallpattern_strength,
      patternHoleRadius = wallpattern_hole_radius,
      patternGridChamfer = wallpattern_pattern_grid_chamfer,
      patternVoronoiNoise = wallpattern_pattern_voronoi_noise,
      patternBrickWeight = wallpattern_pattern_brick_weight,
      patternFs = wallpattern_pattern_quality),
    chestLegClearance = chest_leg_clearance){

  feature_validate_patterns();
  // Apply defaults
  drawerSlideThickness =chestDrawerSlideThickness == 0 ? chestWallThickness : chestDrawerSlideThickness;
  ridgeDepth = wallPatternBorderWidth < 0 ? chestWallThickness/abs(wallPatternBorderWidth) : wallPatternBorderWidth;

  // In custom mode the dimensions describe the CHEST, excluding protruding handles.
  // No pitch rounding or Gridfinity base height is applied to solid drawers.
  isCustom = sizeMode == "custom";
  assert(sizeMode == "gridfinity" || isCustom, "Неизвестный режим размеров");
  effectiveDrawerBase = isCustom ? "floor" : drawerBase;
  effectiveMagnetSize = isCustom ? [0,0] : drawerMagnetSize;
  drawerInnerHeights = !isCustom && drawerEnableCustomSizes
    ? drawerCustomSizes : [for(i=[0:drawerCount-1]) drawerInnerHeight];
  effectiveDrawerCount = isCustom ? drawerCount : len(drawerInnerHeights);
  heightBudget = outerSizeMm.z - 2*chestWallThickness - drawerSlideThickness*(effectiveDrawerCount-1)
    - effectiveDrawerCount*(2*chestClearance.z+drawerWallThickness);
  specifiedHeights = [for(i=[0:effectiveDrawerCount-1]) custom_drawer_heights_mm[i]];
  specifiedTotal = sum(specifiedHeights);
  autoHeights = len([for(h=specifiedHeights) if(h==0) h]);
  customHeights = [for(i=[0:effectiveDrawerCount-1])
    !custom_drawer_heights_enabled ? heightBudget/effectiveDrawerCount
      : specifiedHeights[i]>0 ? specifiedHeights[i] : (heightBudget-specifiedTotal)/max(1,autoHeights)];
  if(isCustom && custom_drawer_heights_enabled) {
    assert(effectiveDrawerCount<=len(custom_drawer_heights_mm),"Для разных высот доступно до 16 ящиков");
    assert(min(specifiedHeights)>=0,"Высоты должны быть неотрицательными: 0 означает остаток");
    assert(min(customHeights)>0,"Заданные высоты не помещаются в корпус: уменьшите их или задайте 0 для остатка");
    assert(autoHeights>0 || abs(specifiedTotal-heightBudget)<0.001,
      "Сумма высот не совпадает с доступной: задайте 0 хотя бы одному ящику для автоматического остатка");
  }
  customInnerSize = [
    outerSizeMm.x - 2*chestWallThickness - 2*chestClearance.x - 2*drawerWallThickness,
    outerSizeMm.y - chestWallThickness - 2*chestClearance.y - 2*drawerWallThickness,
    (outerSizeMm.z - 2*chestWallThickness - drawerSlideThickness*(effectiveDrawerCount-1))/effectiveDrawerCount
      - 2*chestClearance.z - drawerWallThickness];
  if(isCustom) {
    assert(is_num(drawerCount) && drawerCount >= 1 && drawerCount == floor(drawerCount),
      "Количество ящиков должно быть целым числом не меньше 1");
    assert(is_num(chestWallThickness) && chestWallThickness > 0 && is_num(drawerWallThickness) && drawerWallThickness > 0,
      "Толщина стенок корпуса и ящика должна быть больше нуля");
    assert(drawerSlideThickness > 0, "Толщина направляющих должна быть больше нуля");
    assert(min(chestClearance) >= 0, "Зазоры между ящиком и корпусом не могут быть отрицательными");
    assert(is_num(outerSizeMm.x) && customInnerSize.x >= 8,
      "Недостаточная внешняя ширина корпуса: увеличьте её или уменьшите стенки и зазоры");
    assert(is_num(outerSizeMm.y) && customInnerSize.y >= 8,
      "Недостаточная внешняя глубина корпуса: увеличьте её или уменьшите стенки и зазоры");
    assert(is_num(outerSizeMm.z) && customInnerSize.z > 0,
      "Недостаточная внешняя высота корпуса для заданного количества ящиков, стенок и зазоров");
  }
  drawerInnerUnitSize = isCustom
    ? [customInnerSize.x/env_pitch().x, customInnerSize.y/env_pitch().y]
    : [drawerInnerWidth, drawerInnerDepth];
  drawerInnerSizes = [for(i = [0:effectiveDrawerCount-1]) isCustom ? [customInnerSize.x,customInnerSize.y,customHeights[i]] : [
    (drawerInnerWidth*env_pitch().x) + drawerClearance.x,
    (drawerInnerDepth*env_pitch().y) + drawerClearance.y,
    (drawerInnerHeights[i]*env_pitch().z) + drawerClearance.z + 4.25 + (drawerBase == "default" ? drawerMagnetSize.y : 0)
  ]];
  drawerOuterSizes = [for(i = [0:effectiveDrawerCount-1]) [
    drawerInnerSizes[i].x + (drawerWallThickness * 2),
    drawerInnerSizes[i].y + (drawerWallThickness * 2),
    drawerInnerSizes[i].z + ((effectiveDrawerBase == "floor" || effectiveDrawerBase == "default") ? drawerWallThickness : 0)
  ]];
  outerChest = isCustom ? outerSizeMm : [
    drawerOuterSizes[0].x + (chestClearance.x * 2) + (chestWallThickness * 2),
    drawerOuterSizes[0].y + (chestClearance.y * 2) + (chestWallThickness),
    sum(drawerOuterSizes).z + (chestClearance.z*2*effectiveDrawerCount) + drawerSlideThickness * (effectiveDrawerCount - 1) + chestWallThickness*2];

  totalH = outerChest.z;

  startH = chestWallThickness;

  translate(position == "center" ? [-outerChest.x/2,-outerChest.y/2,0] : [0,0,0])
  union(){
  if(render_choice == "chest" || render_choice == "everything" || render_choice=="panel" || render_choice=="panels" || render_choice=="shelf_guide" || render_choice=="shelf_guides" || render_choice=="plywood_preview")
    structure_output(outerChest,chestWallThickness,isCustom ? structure_levels(outerChest,chestWallThickness) : [],drawerSlideThickness)
    structure_addons(outerChest,chestWallThickness)
    chest(
      outerChest=outerChest,
      totalH=totalH,
      chestWallThickness=chestWallThickness,
      topStyle=isCustom ? "none" : chestTopStyle,
      topWallPatternStyle=chestTopWallPatternStyle,
      topBasePlateMagnetSize=chestTopBasePlateMagnetSize,
      topBasePlateReducedWallHeight=chestTopBasePlateReducedWallHeight,
      topBasePlateReducedWallTaper=chestTopBasePlateReducedWallTaper,
      bottomGrid=isCustom ? "none" : bottomGrid,
      bottomMagnetDiameter=bottomMagnetDiameter,
      bottomScrewDepth=bottomScrewDepth,
      bottomHoleOverhangRemedy=bottomHoleOverhangRemedy,
      bottomCornerAttachmentsOnly=bottomCornerAttachmentsOnly,
      bottomSubPitch=bottomSubPitch,
      bottomFlatBase=bottomFlatBase,
      drawerCount=effectiveDrawerCount,
      drawerInnerUnitSize=drawerInnerUnitSize,
      drawerOuterSizes=drawerOuterSizes,
      drawerSlideThickness=drawerSlideThickness,
      drawerWallThickness=drawerWallThickness,
      startH=startH,
      clearance=chestClearance,
      chestLegClearance = chestLegClearance) {
      chestCutouts(
        drawerCount=effectiveDrawerCount,
        drawerOuterSizes=drawerOuterSizes,
        ridgeDepth=ridgeDepth,
        drawerSlideThickness=drawerSlideThickness,
        drawerSlideWidth=guide_rails_active() || flatpack_enabled || slide_shelves_enabled || case_structure=="frame" ? 0 : chestDrawerSlideWidth,
        startH=startH,
        outerChest=outerChest,
        clearance=chestClearance,
        chestWallThickness=chestWallThickness,
        efficientBack=perforation_mode=="legacy" && case_structure!="frame" && efficientBack,
        topWallPatternStyle=perforation_mode=="legacy" && !(case_structure=="frame" && frame_top_open) ? chestTopWallPatternStyle : "none",
        bottomWallpatternStyle = perforation_mode=="legacy" && !(case_structure=="frame" && frame_bottom_open) ? bottomWallpatternStyle : "none",
        wall_pattern_settings = wall_pattern_settings);
      feature_chest_cuts(outerChest,chestWallThickness,drawerOuterSizes,chestClearance,drawerSlideThickness,startH);
      structure_frame_cuts(outerChest,chestWallThickness,drawerOuterSizes,chestClearance,drawerSlideThickness,startH);
      connector_pockets(outerChest,chestWallThickness);
      plywood_slots(outerChest,chestWallThickness,isCustom ? structure_levels(outerChest,chestWallThickness) : []);
      plywood_pin_sockets(outerChest,chestWallThickness);
      }
  if(render_choice=="plywood_preview"){
    assert(plywood_enabled,"Включите фанерные вставки");
    translate([0,0,structure_bottom_lift()])
    plywood_sheets(outerChest,chestWallThickness,isCustom ? structure_levels(outerChest,chestWallThickness) : []);
  }
  if(render_choice=="plywood_rims")plywood_rims(outerChest,chestWallThickness,true);
  if(render_choice=="plywood_probe")plywood_probe(outerChest,chestWallThickness);
  if(render_choice=="shelf_probe")shelf_probe(outerChest,chestWallThickness);
  if(render_choice=="everything" && plywood_enabled && pw_rim_count(outerChest)>0)
    translate([-outerChest.x-20,0,0])plywood_rims(outerChest,chestWallThickness,true);
  if(render_choice=="everything" && stack_system_enabled && stack_bottom_pegs && stack_pegs_separate)
    translate([0,outerChest.y+20,0])structure_pin_plate();
  if(render_choice == "drawers" || render_choice == "everything")
    translate([0,0,structure_bottom_lift()])
    translate(render_choice == "everything" && !$preview
      ? [(drawerInnerUnitSize.x+0.5)*env_pitch().x,0,0]
      : [0,0,0])
    drawers(
      drawerCount=effectiveDrawerCount,
      innerUnitSize=drawerInnerUnitSize,
      innerSizes=drawerInnerSizes,
      outerSizes=drawerOuterSizes,
      drawerBase=effectiveDrawerBase,
      wallThickness=drawerWallThickness,
      handleSize=handleSize,
      handleVerticalCenter=handleVerticalCenter,
      handleRotate=handleRotate,
      ridgeDepth=ridgeDepth,
      startH=startH,
      chestClearance=chestClearance,
      chestWallThickness=chestWallThickness,
      magnetSize = effectiveMagnetSize,
      drawerClearance=drawerClearance);
  if(render_choice == "onedrawer") {
    assert(single_drawer_number>=1 && single_drawer_number<=effectiveDrawerCount && single_drawer_number==floor(single_drawer_number),
      "Номер ящика должен быть целым числом от 1 до количества ящиков");
    drawer(
      drawerIndex = single_drawer_number-1,
      innerUnitSize = drawerInnerUnitSize,
      drawerBase = effectiveDrawerBase,
      wallThickness = drawerWallThickness,
      handleSize = handleSize,
      handleVerticalCenter = handleVerticalCenter,
      handleRotate = handleRotate,
      innerSizes = drawerInnerSizes,
      outerSizes = drawerOuterSizes,
      magnetSize = effectiveMagnetSize,
      clearance = drawerClearance);
  }
  }
}

//Supportless feet
module feet(width, length, twidth, fin = true, widen = 0, thickness = 3){
    actualSpacing = (width*42) - 21.68;

    translate([13.888, 23.92, fudgeFactor]) foot(length, fin = fin, widen = widen, thickness = thickness);
    translate([twidth - 13.888, 23.92, fudgeFactor]) foot(length, fin = fin, widen = widen, thickness = thickness);
}

module foot(length, fin = true, widen = 0, thickness = 3){
    actualLength = (widen*2) + (length*42) - 47.84;
    dx = 6.23 + widen;
    dy = 7.33 + widen;
    r1 = 0.223 + widen;
    r2 = 5.91 + widen;
    chamfer = 1;

    radiiPoints = [
        [0, -widen, r1],
        [dx, dy, r2],
        [dx, actualLength-dy, r2],
        [0.25, actualLength - 1, 0],
        [-0.25, actualLength - 1, 0],
        [-dx, actualLength-dy, r2],
        [-dx, dy, r2]
    ];
    polyrounded = polyRound(radiiPoints);
    minkowski(){
        translate([0, 0, -thickness]) linear_extrude(thickness) polygon(polyrounded);
        cylinder(chamfer, 0, chamfer);
    }

    finheight = thickness - chamfer;

    //Support fin
    if(fin) translate([0, actualLength, 0]) rotate([0, 90, 0]) linear_extrude(0.5, center=true) polygon([[finheight, 0], [0, 0], [0, finheight]]);
}

module footrecess(width, length, twidth, tlength, widen = 0.25){
    difference(){
        cube([twidth, tlength, 3.5 + widen]);
        translate([0, 0, 3.5]) feet(width, length, twidth, fin=false, widen = widen, thickness = 3 + widen);
    }
}

if(render_choice=="keys") connector_key_plate();
else if(render_choice=="bottom_probe_floor" || render_choice=="bottom_probe_wall")structure_bottom_probe(chest_wall_thickness,render_choice=="bottom_probe_wall");
else if(render_choice=="joint_test") connector_test_coupon();
else if(render_choice=="plywood_rims_one")plywood_rims([chest_outer_width_mm,chest_outer_depth_mm,chest_outer_height_mm],chest_wall_thickness,false);
else if(render_choice=="stack_pin" || render_choice=="stack_pins")structure_pin_plate();
else gridfinity_drawer();
//foot(3);
