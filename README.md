# grease
 Experimental tool (still in development) to draw in 3D

---
Draw:
- ~~Draw a tail on mousemove~~
- Change color of the line
    - https://github.com/Simonwep/pickr
- Change width of the line
- Maybe add some smoothing?
  - https://github.com/dulnan/lazy-brush

Erase:

Select:
-~~ Make lines selectable~~
-~~Make lines DE selectable~~
- Allow switching between modes (move, rotation, scale)
- ~~Group selection~~
  - Allow all group selection transform (at the moment it's only move)
  - https://threejs.org/examples/misc_boxselection.html
  - https://github.com/mrdoob/three.js/issues/6336#issuecomment-626628464
  - https://github.com/mrdoob/three.js/issues/6336

Camera controls:
~~- Fine tune speed~~
- Snap to axis (x, y, z)

Other features
- Selectable themes (light, dark, blueprint)
    - Would imply changing the color of the main color line, at least. Could be diffiult but maybe it can be brute-forced
- ~~Make the miniAxis window draggable~~
  - Make sure the miniAxis window can't be dragged out of the screen 
- Handle undo properly (can't delete basic objects!)
  - Maybe not needed? Maybe I only need an eraser? Handling undo is a lot of work because it needs to support ALL events.
- Make slow auto rotate that hides UI

Difficult stuff:
- Drawing while rotating the camera is possible but it would require to actually render the "guide line" as it's drawn
  - This is non trivial considering that the "guide line" is drawn on a separate canvas and not really in threejs
  - It would also require multitouch to be handled properly so the user could adjust the camera view as they draw

Various links:
https://discourse.threejs.org/t/three-infinitegridhelper-anti-aliased/8377

//https://rawgit.com/gkjohnson/three.js/161915d/examples/webgl_lines_fat.html
//https://dustinpfister.github.io/2018/11/07/threejs-line-fat-width/

Original draw: https://jsfiddle.net/w67tzfhx/40/
Original with Line2: https://jsfiddle.net/brLk6aud/1/

https://mattdesl.svbtle.com/drawing-lines-is-hard

https://github.com/spite/THREE.MeshLine
