// import * as THREE from "https://threejs.org/build/three.module.js";
// import { OrbitControls } from "https://threejs.org/examples/jsm/controls/OrbitControls.js";
// import { TransformControls } from "https://threejs.org/examples/jsm/controls/TransformControls.js";

var line, renderer, miniAxisRenderer, scene, miniAxisScene, camera, miniAxisCamera;
var controls, transformControls;
var matLine, matLineBasic;
var matLineDrawn;
var materials = [];

var paths = [];

var somethingSelected = false;
var selectedObject; //may not be necessary anymore
var selectedGroup;
var tempgroup;
var tempArray;

var transforming;
var raycaster;
var raycastObject;

var selectionBoxStartX, selectionBoxStartY;

var selectionBox;
var helper;

var linesNeedThemeUpdate = false;

var drawingCanvas = document.getElementById("drawingCanvas");
var context = drawingCanvas.getContext("2d");
drawingCanvas.width = window.innerWidth;
drawingCanvas.height = window.innerHeight;
var main = document.getElementById("main");
var miniAxis = document.getElementById("miniAxis");

// viewport
var insetWidth;
var insetHeight;
var linepositions = [];
var linecolors = [];

//selection
var pickedObjects = [];

var themes = {
    blueprint: {
        backgroundColor: '',
        mainColor: '',
    },
    light: {
        backgroundColor: '',
        mainColor: '',
    },
    dark: {
        backgroundColor: '',
        mainColor: '',
    }
}

init();
animate();

let mouse = {
    tx: 0, //x coord for threejs
    ty: 0, //y coord for threejs
    cx: 0, //x coord for canvas
    cy: 0, //y coord for canvas
    updateCoordinates: function (event) {
        if (event.touches) {
            this.tx = (event.changedTouches[0].pageX / window.innerWidth) * 2 - 1;
            this.ty = -(event.changedTouches[0].pageY / window.innerHeight) * 2 + 1;
            this.cx = event.changedTouches[0].pageX;
            this.cy = event.changedTouches[0].pageY;
            //handler if it's a mouse event
        } else {
            this.tx = (event.clientX / window.innerWidth) * 2 - 1;
            this.ty = -(event.clientY / window.innerHeight) * 2 + 1;
            this.cx = event.clientX;
            this.cy = event.clientY;
        }
    }
};

function updateminiAxisCamera() {
    miniAxisCamera.zoom = camera.zoom;
    miniAxisCamera.position.copy(camera.position);
    miniAxisCamera.quaternion.copy(camera.quaternion);
}

function selectedTool() {
    return app.selectedTool;
}

function checkIfHelperObject(object) {
    if (object.type === "AxesHelper" || object.type === "GridHelper" || object.type === "Object3D") {
        return true
    } else { return false }
}

function redrawLine(color) {
    // clear canvas
    context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    context.strokeStyle = color;
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.lineWidth = 30;
    context.beginPath();
    for (var i = 0; i < paths.length; ++i) {
        var path = paths[i];
        if (path.length < 1)
            continue;
        context.moveTo(path[0][0], path[0][1]);
        for (var j = 1; j < path.length; ++j)
            context.lineTo(path[j][0], path[j][1]);
    }
    context.stroke();
}

function drawStart() {
    //draw line
    context.beginPath();
    context.lineWidth = app.lineWidth;
    context.strokeStyle = "white";
    context.lineCap = 'round';
    context.lineJoin = 'round';
    context.moveTo(mouse.cx, mouse.cy);
    //Start
    var vNow = new THREE.Vector3(mouse.tx, mouse.ty, 0);
    vNow.unproject(camera);
    linepositions.push(vNow);
    //mirrorAxis(app.mirrorX, app.mirrorY, app.mirrorZ, vNow.x, vNow.y, vNow.z)
    //linecolors.push(206, 216, 247);
}
function drawMove() {
    //Draw on canvas
    context.lineTo(mouse.cx, mouse.cy);
    context.stroke();
    //Add line elements
    var vNow = new THREE.Vector3(mouse.tx, mouse.ty, 0);
    vNow.unproject(camera);
    linepositions.push(vNow);
    //mirrorAxis(app.mirrorX, app.mirrorY, app.mirrorZ, vNow.x, vNow.y, vNow.z)
    //linecolors.push(206, 216, 247);
}
function drawEnd() {
    //render line
    context.lineTo(mouse.cx, mouse.cy);
    context.stroke();
    context.closePath();
    context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    //Close and add line to scene
    var vNow = new THREE.Vector3(mouse.tx, mouse.ty, 0);
    vNow.unproject(camera);
    linepositions.push(vNow);
    //mirrorAxis(app.mirrorX, app.mirrorY, app.mirrorZ, vNow.x, vNow.y, vNow.z)
    //experimental approach to rejecting points that
    //are too far apart and are artifacts of palm rejection failing
    // for (var i = 0; i < linepositions.length - 3; i = i + 3) {
    //     alert(linepositions.length[i] - linepositions.length[i + 3])
    //     // if (linepositions.length[i] - linepositions.length[i + 3] > 0.01) {
    //     //     alert('should palm reject')
    //     // }
    // }
    const line = new MeshLine()
    line.setVertices(linepositions, p => p / p)
    var material = new MeshLineMaterial({
        transparent: true,
        lineWidth: 0.05,
        depthTest: true,
        dashArray: 0.01,
        color: new THREE.Color("rgb(255, 0, 0)"),
        sizeAttenuation: 1,
        alpha: 0.4
    });
    var mesh = new THREE.Mesh(line, material);
    mesh.raycast = MeshLineRaycast;
    //recentering geometry around a central point
    mesh.layers.set(1);
    scene.add(mesh);
    //drawMirrored(app.mirrorX)
    //Remove listener and clear arrays
    linepositions = [];
    linecolors = [];
}

function eraseStart() {
    raycaster = new THREE.Raycaster();
    raycaster.layers.set(1)
    raycaster.params.Line.threshold = 0.00001;
    raycaster.setFromCamera(new THREE.Vector2(mouse.tx, mouse.ty), camera);
    var object = raycaster.intersectObjects(scene.children)[0].object;
    console.log(object);
}
function eraseMove() {
    paths[paths.length - 1].push([mouse.cx, mouse.cy]);
    //This is to render line transparency,
    //we are redrawing the line every frame
    redrawLine('rgba(255,20,147, 0.15)');

    raycaster.params.Line.threshold = 0.0000001;
    // raycaster.setFromCamera(new THREE.Vector2(mouse.tx, mouse.ty), camera);
    // var object = raycaster.intersectObjects(scene.children)[0].object;
    // if (checkIfHelperObject(object)) {
    // } else {
    //     scene.remove(object);
    // }
}
function eraseEnd() {
    //Actually empty for now
    context.closePath();
    context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
    paths = [];
}

function selectStart() {
    if (!transforming) {
        paths.push([mouse.cx, mouse.cy]);
        raycaster = new THREE.Raycaster();
        raycaster.layers.set(1);
        // raycaster.params.Line.threshold = 0.001;
        // raycaster.params.Mesh.threshold = 0.001;
        tempArray = [];
    }
    //Setting the first raycast at start point seems to be causing problems,
    //turning it off for now
    /*raycaster.setFromCamera(new THREE.Vector2(mouse.tx, mouse.ty), camera);
    var intersectObject = raycaster.intersectObjects(scene.children)[0].object;
    if (intersectObject && !checkIfHelperObject(intersectObject)) {
        toggleDash(intersectObject, true);
        tempArray.push(intersectObject);
    }*/
}
function selectMove() {
    if (!transforming) {
        paths[paths.length - 1].push([mouse.cx, mouse.cy]);
        //This is to render line transparency,
        //we are redrawing the line every frame
        redrawLine('rgba(255, 255, 255, 0.15)');
    }

    if (somethingSelected === false) {
        raycaster.setFromCamera(new THREE.Vector2(mouse.tx, mouse.ty), camera);
        var intersectObject = raycaster.intersectObjects(scene.children)[0].object;
        //Check if the object exists, check if it's not an helper object, check if it's already in the tempArray
        if (intersectObject && !checkIfHelperObject(intersectObject) && tempArray.indexOf(intersectObject) < 0) {
            toggleDash(intersectObject, true);
            tempArray.push(intersectObject);
        }
    }
}
function selectEnd() {

    if (!transforming) {
        context.closePath();
        context.clearRect(0, 0, drawingCanvas.width, drawingCanvas.height);
        paths = [];
    }

    //If tempArray is empty and we are not transforming, we deselect
    if (tempArray.length == 0 && !transforming) {

        //Ungroup if we have a group selection
        if (typeof tempgroup !== 'undefined') {

            var ungroupArray = [];
            for (var i = 0; i < tempgroup.children.length; i++) {
                var object = tempgroup.children[i]
                var position = new THREE.Vector3();
                position = object.getWorldPosition(position);
                object.position.copy(position);
                //Rotation definitly doesn't work. It's difficult to work with because
                //it requires me to reset the rotation center in the center of the tempgroup
                //which is a mess so I'll see if I can live without it
                /*var quaternion = new THREE.Quaternion();
                quaternion = children.getWorldQuaternion(quaternion);
                children.quaternion.copy(quaternion);*/
                object.needsUpdate = true;
                if (!checkIfHelperObject(object)) {
                    toggleDash(object, false)
                }
                ungroupArray.push(object);
            }

            ungroupArray.forEach(object => scene.add(object))
            //tempArray = [];
            transformControls.detach();
            transforming = false;
            scene.remove(tempgroup);
        }

        //This is _extremely_ wasteful but it will work for now
        scene.children.forEach(object => {
            if (!checkIfHelperObject(object)) {
                toggleDash(object, false)
            }
        })
        somethingSelected = false;
        transformControls.detach();
    }
    //If tempArray has one selected object, 
    //we attach the controls only to that object
    else if (tempArray.length == 1) {
        somethingSelected = true;
        transformControls = new THREE.TransformControls(camera, drawingCanvas);
        transformControls.attach(tempArray[0]);
        scene.add(transformControls);
        transformControls.addEventListener("mouseDown", function () {
            transforming = true;
        });
        transformControls.addEventListener("mouseUp", function () {
            transforming = false;
        });

    }
    //If tempArray has several selected objects,
    //we group them together and attach transform controls to the group
    else if (tempArray.length > 1) {
        somethingSelected = true;
        tempgroup = new THREE.Group();
        scene.add(tempgroup);
        //Add all the selected elements to the temporary groups
        tempArray.forEach(element => {
            toggleDash(element, true)
            tempgroup.add(element);
        })
        //Attach controls to the temporary group
        transformControls = new TransformControls(camera, drawingCanvas);
        transformControls.attach(tempgroup);
        scene.add(transformControls);
        //Calculate center between the elements of the group
        transformControls.position.set(
            computeGroupCenter().x,
            computeGroupCenter().y,
            computeGroupCenter().z
        );
        transformControls.addEventListener("mouseDown", function () {
            transforming = true;
        });
        transformControls.addEventListener("mouseUp", function () {
            transforming = false;
        });
    }
}

function computeGroupCenter() {
    var center = new THREE.Vector3();
    var children = tempgroup.children;
    var count = children.length;
    for (var i = 0; i < count; i++) {
        center.add(children[i].position);
    }
    center.divideScalar(count);
    return center;
}

function toggleDash(object, bool) {
    // var material = object.material;
    // material.dashed = bool;
    // // dashed is implemented as a defines -- not as a uniform. this could be changed.
    // // ... or THREE.LineDashedMaterial could be implemented as a separate material
    // // temporary hack - renderer should do this eventually
    // if (bool) material.defines.USE_DASH = "";
    // else delete material.defines.USE_DASH;
    // material.dashSize = bool ? 0.01 : 1000;
    // material.gapSize = bool ? 0.01 : 1000;
    // material.dashScale = bool ? 1 : 1000;
    // material.needsUpdate = true;
}

function init() {
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true
    });
    renderer.setPixelRatio(window.devicePixelRatio);
    renderer.setClearColor(0x000000, 0); //transparent so the background shows through
    renderer.setSize(window.innerWidth, window.innerHeight);
    main.appendChild(renderer.domElement);

    miniAxisRenderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: false
    });
    miniAxisRenderer.setPixelRatio(window.devicePixelRatio);
    miniAxisRenderer.setClearColor(0x000000, 1);
    miniAxisRenderer.setSize(300, 300);
    miniAxis.appendChild(miniAxisRenderer.domElement);

    scene = new THREE.Scene();
    miniAxisScene = new THREE.Scene();

    var axesHelper = new THREE.AxesHelper();
    axesHelper.layers.set(0);
    scene.add(axesHelper);

    drawAxisHelperControls();

    var size = 1;
    var divisions = 1;
    var gridHelper = new THREE.GridHelper(size, divisions);
    gridHelper.layers.set(0);
    scene.add(gridHelper);

    camera = new THREE.OrthographicCamera(
        window.innerWidth / -2,
        window.innerWidth / 2,
        window.innerHeight / 2,
        window.innerHeight / -2,
        1,
        90
    );
    camera.layers.enable(0); // enabled by default
    camera.layers.enable(1);

    camera.position.set(0, 0, 2);
    controls = new THREE.OrbitControls(camera, miniAxisRenderer.domElement);
    controls.enabled = true;
    controls.minDistance = 1;
    controls.maxDistance = 3;
    controls.rotateSpeed = 0.5;
    controls.autoRotateSpeed = 5.0;
    camera.zoom = 100;
    controls.zoomEnabled = false;
    controls.panEnabled = false;
    transformControls = new THREE.TransformControls(camera, drawingCanvas);

    miniAxisCamera = new THREE.OrthographicCamera();
    miniAxisCamera.position.copy(camera.position);
    miniAxisCamera.zoom = 75;
    miniAxisCamera.layers.enable(0);
    miniAxisCamera.layers.enable(1);


    //drawTestLines();

    window.addEventListener("resize", onWindowResize, false);
    onWindowResize();
    drawingCanvas.addEventListener("touchstart", onTapStart, false);
    drawingCanvas.addEventListener("mousedown", onTapStart, false);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();

    renderer.setSize(window.innerWidth, window.innerHeight);

    insetWidth = window.innerHeight / 4; // square
    insetHeight = window.innerHeight / 4;
}

function animate() {
    updateminiAxisCamera();
    requestAnimationFrame(animate);
    //may need to wrap this in a function
    if (transformControls) {
        transformControls.mode = app.selectedTransformation;
    }
    if (controls) {
        controls.enabled = !app.controlsLocked
        //should make sure we can't mess with autorotate
        if (app.autoRotate) {
            app.controlsLocked = true;
            camera.layers.disable(0)
            controls.autoRotate = app.autoRotate;
            controls.update();
        } else {
            camera.layers.enable(0)
            app.controlsLocked = false;
        }
    }
    renderer.setViewport(0, 0, window.innerWidth, window.innerHeight);
    miniAxisRenderer.setViewport(0, 0, 300, 300);
    // renderer will set this eventually

    //matLine.resolution.set(window.innerWidth, window.innerHeight); // resolution of the viewport
    if (materials) {
        materials.forEach(material =>
            material.resolution.set(window.innerWidth, window.innerHeight)
        );
    } // resolution of the inset viewport

    //May not be possible? Maybe too much geometry to update?
    // if (app.linesNeedThemeUpdate) {
    //     scene.children.forEach(object => {
    //         if (object.layers.mask == 2) {
    //             console.log(object)
    //             recolorLine(object, 255, 0, 0);
    //         }
    //     })
    //     app.linesNeedThemeUpdate = false;
    // }

    renderer.render(scene, camera);
    miniAxisRenderer.render(miniAxisScene, miniAxisCamera);
}

function onTapMove(event) {
    mouse.updateCoordinates(event);
    //DRAW
    if (selectedTool() == "draw") {
        drawMove();
    }
    //ERASER
    else if (selectedTool() == "erase") {
        eraseMove()
    }
    //SELECT
    else if (selectedTool() == "select") {
        selectMove()
    }
}

function onTapEnd(event) {
    //handler if it's a touch event
    mouse.updateCoordinates(event);
    //DRAW
    if (selectedTool() == "draw") {
        drawEnd()
    }
    //ERASER
    else if (selectedTool() == "erase") {
        eraseEnd()
    }
    //SELECT
    else if (selectedTool() == "select") {
        selectEnd()
    }
    drawingCanvas.removeEventListener("touchmove", onTapMove, false);
    drawingCanvas.removeEventListener("mousemove", onTapMove, false);
}

function onTapStart(event) {
    if (event.which == 3) return;
    mouse.updateCoordinates(event);
    //DRAW
    if (selectedTool() == "draw") {
        drawStart()
    }
    //ERASER
    else if (selectedTool() == "erase") {
        eraseStart();
    }
    //SELECT
    else if (selectedTool() == "select") {
        selectStart();
    }
    drawingCanvas.addEventListener("touchmove", onTapMove, false);
    drawingCanvas.addEventListener("mousemove", onTapMove, false);
    drawingCanvas.addEventListener("touchend", onTapEnd, false);
    drawingCanvas.addEventListener("mouseup", onTapEnd, false);
}

//Undo: it removes the last object added to the scene, unless it's an AxesHelper or a GridHelper
//I might need to make it smarter so it also deletes materials and geometry connected to the deleted object

/*document.getElementById("undo").addEventListener("click", function() {
  var objectToBeRemoved = scene.children[scene.children.length - 1];
  console.log(objectToBeRemoved);
  if (
    objectToBeRemoved.type === "AxesHelper" ||
    objectToBeRemoved.type === "GridHelper"
  ) {
    //do nothing
  } else {
    scene.remove(scene.children[scene.children.length - 1]);
  }
});*/

function drawTestLines() {
    var positions = [];
    var colors = [];
    // Position and THREE.Color Data
    positions.push(0.1, 0.1, 0.1);
    positions.push(0.4, 0.4, 0.4);
    colors.push(255, 0, 0);
    colors.push(255, 0, 0);
    // Line2 ( LineGeometry, LineMaterial )
    var geometry = new LineGeometry();
    //geometry.setDrawRange( 0, 100);
    //geometry.maxInstancedCount = 100;
    geometry.setPositions(
        positions,
        new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setColors(colors);
    matLine = new LineMaterial({
        //color: 0xffffff,
        linewidth: app.lineWidth, // in pixels
        vertexColors: true,
        //resolution:  // to be set by renderer, eventually
        depthWrite: false
    });
    materials.push(matLine);
    line = new Line2(geometry, matLine);
    //Recentering geometry around the central point
    line.position.set(
        line.geometry.boundingSphere.center.x,
        line.geometry.boundingSphere.center.y,
        line.geometry.boundingSphere.center.z
    );
    line.geometry.center();
    line.needsUpdate = true;
    line.computeLineDistances();
    line.scale.set(1, 1, 1);
    line.layers.set(1);
    scene.add(line);
    var positions = [];
    var colors = [];
    // Position and THREE.Color Data
    positions.push(0.4, 0, 0);
    positions.push(0, 0.4, 0.4);
    colors.push(255, 0, 0);
    colors.push(255, 0, 0);
    // Line2 ( LineGeometry, LineMaterial )
    var geometry = new LineGeometry();
    //geometry.setDrawRange( 0, 100);
    //geometry.maxInstancedCount = 100;
    geometry.setPositions(
        positions,
        new THREE.Float32BufferAttribute(positions, 3)
    );
    geometry.setColors(colors);
    matLine = new LineMaterial({
        color: 0xffffff,
        linewidth: app.lineWidth, // in pixels
        vertexColors: true,
        //resolution:  // to be set by renderer, eventually
        depthWrite: false
    });
    materials.push(matLine);
    line = new Line2(geometry, matLine);
    //Recentering geometry around the central point
    line.position.set(
        line.geometry.boundingSphere.center.x,
        line.geometry.boundingSphere.center.y,
        line.geometry.boundingSphere.center.z
    );
    line.geometry.center();
    line.needsUpdate = true;
    line.computeLineDistances();
    line.scale.set(1, 1, 1);
    line.layers.set(1);
    scene.add(line);
}

function drawAxisHelperControls() {
    let handlesSize = 0.15;
    let handlesDistance = 0.6

    var controlAxesHelper = new THREE.AxesHelper();
    miniAxisScene.add(controlAxesHelper);
    miniAxisScene.layers.set(0);
    controlAxesHelper.scale.set(0.5, 0.5, 0.5)

    //Z axis
    var geometry = new THREE.SphereGeometry(handlesSize, handlesSize, handlesSize);
    var material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    var sphereZ = new THREE.Mesh(geometry, material);
    sphereZ.position.set(0, 0, handlesDistance)
    sphereZ.name = "z";
    sphereZ.layers.set(1);
    miniAxisScene.add(sphereZ);
    //Y axis
    var geometry = new THREE.SphereGeometry(handlesSize, handlesSize, handlesSize);
    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    var sphereY = new THREE.Mesh(geometry, material);
    sphereY.position.set(0, handlesDistance, 0)
    sphereY.name = "y";
    sphereY.layers.set(1);
    miniAxisScene.add(sphereY);
    //X axis
    var geometry = new THREE.SphereGeometry(handlesSize, handlesSize, handlesSize);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var sphereX = new THREE.Mesh(geometry, material);
    sphereX.position.set(handlesDistance, 0, 0)
    sphereX.name = "x";
    sphereX.layers.set(1);
    miniAxisScene.add(sphereX);

    //Flipped control handles
    var controlAxesHelperFlipped = new THREE.AxesHelper();
    miniAxisScene.add(controlAxesHelperFlipped);
    controlAxesHelperFlipped.applyMatrix4(new THREE.Matrix4().makeScale(-0.5, -0.5, -0.5));
    miniAxisScene.layers.set(0);

    //-Z axis
    var geometry = new THREE.SphereGeometry(handlesSize, handlesSize, handlesSize);
    var material = new THREE.MeshBasicMaterial({ color: 0x0000ff });
    var sphereZFlipped = new THREE.Mesh(geometry, material);
    sphereZFlipped.position.set(0, 0, -handlesDistance)
    sphereZFlipped.name = "-z";
    miniAxisScene.add(sphereZFlipped);
    sphereZFlipped.layers.set(1);
    //-Y axis
    var geometry = new THREE.SphereGeometry(handlesSize, handlesSize, handlesSize);
    var material = new THREE.MeshBasicMaterial({ color: 0x00ff00 });
    var sphereYFlipped = new THREE.Mesh(geometry, material);
    sphereYFlipped.position.set(0, -handlesDistance, 0)
    sphereYFlipped.name = "-y";
    miniAxisScene.add(sphereYFlipped);
    sphereYFlipped.layers.set(1);
    //-X axis
    var geometry = new THREE.SphereGeometry(handlesSize, handlesSize, handlesSize);
    var material = new THREE.MeshBasicMaterial({ color: 0xff0000 });
    var sphereXFlipped = new THREE.Mesh(geometry, material);
    sphereXFlipped.position.set(-handlesDistance, 0, 0)
    sphereXFlipped.name = "-x";
    miniAxisScene.add(sphereXFlipped);
    sphereXFlipped.layers.set(1);

    miniAxis.addEventListener("touchstart", repositionCamera, false);
    miniAxis.addEventListener("mousedown", repositionCamera, false);
}

let miniAxisMouse = {
    tx: 0, //x coord for threejs
    ty: 0, //y coord for threejs
    updateCoordinates: function (event) {
        let canvasBounds = miniAxisRenderer.context.canvas.getBoundingClientRect();
        if (event.touches) {
            this.tx = ((event.changedTouches[0].pageX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1;
            this.ty = - ((event.changedTouches[0].pageY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1;
            //handler if it's a mouse event
        } else {
            this.tx = ((event.clientX - canvasBounds.left) / (canvasBounds.right - canvasBounds.left)) * 2 - 1;
            this.ty = -((event.clientY - canvasBounds.top) / (canvasBounds.bottom - canvasBounds.top)) * 2 + 1;
        }
    }
}

function repositionCamera() {
    if (!app.controlsLocked) {
        miniAxisMouse.updateCoordinates(event);
        var miniAxisRaycaster = new THREE.Raycaster();
        miniAxisRaycaster.layers.set(1);
        miniAxisRaycaster.setFromCamera(
            new THREE.Vector2(
                miniAxisMouse.tx,
                miniAxisMouse.ty
            ),
            miniAxisCamera);
        var object = miniAxisRaycaster.intersectObjects(miniAxisScene.children)[0].object;
        if (checkIfHelperObject(object)) {
        } else {
            switch (object.name) {
                case 'z':
                    controls.enabled = false;
                    camera.position.set(0, 0, 2);
                    camera.lookAt(controls.target);
                    controls.enabled = true;
                    break;
                case 'x':
                    controls.enabled = false;
                    camera.position.set(2, 0, 0);
                    camera.lookAt(controls.target);
                    controls.enabled = true;
                    break;
                case 'y':
                    controls.enabled = false;
                    camera.position.set(0, 2, 0);
                    camera.lookAt(controls.target);
                    controls.enabled = true;
                    break;
                case '-x':
                    controls.enabled = false;
                    camera.position.set(-2, 0, 0);
                    camera.lookAt(controls.target);
                    controls.enabled = true;
                    break;
                case '-y':
                    controls.enabled = false;
                    camera.position.set(0, -2, 0);
                    camera.lookAt(controls.target);
                    controls.enabled = true;
                    break;
                case '-z':
                    controls.enabled = false;
                    camera.position.set(0, 0, -2);
                    camera.lookAt(controls.target);
                    controls.enabled = true;
                    break;
                default:
            }
        }
    }
};

var mirroredLinePositions = [];

function mirrorAxis(xBool, yBool, zBool, x, y, z) {
    if (xBool) {
        mirroredLinePositions.push(-x, y, z);
    }
    if (yBool) {
        //fill in later
    }
    if (zBool) {
        //fill in later
    }
}

function drawMirrored(xBool) {
    if (xBool) {
        var matLineDrawn = new LineMaterial({
            color: 0xffffff,
            linewidth: app.lineWidth, // in pixels
            vertexColors: true,
            //resolution set later,
            depthWrite: true
        });
        materials.push(matLineDrawn);
        var geometry = new LineGeometry();
        geometry.setPositions(mirroredLinePositions);
        geometry.setColors(linecolors);
        line = new Line2(geometry, matLineDrawn);
        //recentering geometry around a central point
        line.position.set(
            line.geometry.boundingSphere.center.x,
            line.geometry.boundingSphere.center.y,
            line.geometry.boundingSphere.center.z
        );
        line.geometry.center();
        line.needsUpdate = true;
        line.computeLineDistances();
        line.scale.set(1, 1, 1);
        line.layers.set(1);
        scene.add(line);

        mirroredLinePositions = [];
    }
}

function recolorLine(object, r, g, b) {
    var colorArray = [];
    for (var x = 0; x < object.geometry.attributes.instanceColorStart.data.array.length; x++) {
        colorArray.push(r)
        colorArray.push(g)
        colorArray.push(b)
    }
    var updatedColors = new Float32Array(colorArray);
    object.geometry.attributes.instanceColorStart.data.array = updatedColors;
    var updatedColors = new Float32Array(colorArray);
    object.geometry.attributes.instanceColorStart.data.array = updatedColors;
    object.geometry.colorsNeedUpdate = true;
    object.material.needsUpdate = true;
}

