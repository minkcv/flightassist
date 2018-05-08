var threediv = document.getElementById('three');
var width = threediv.clientWidth;
var height = threediv.clientHeight;
var scene;
var material = new THREE.MeshPhongMaterial( { color: 0xffffff,  side: THREE.DoubleSide } );
var geometries = [];
var nGeometries = 40;
var scale = 3;
var gameOver;
var sectorSize = 100;
var sectors;
var cam;
var camera;
var endPoint;
var totalDistance;
var highScore = 0;
var renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
threediv.appendChild(renderer.domElement);

function init() {
    scene = new THREE.Scene();
    gameOver = false;
    document.getElementById('gameover').style.display = 'none';
    cam = new THREE.Object3D();
    camera = new THREE.PerspectiveCamera( 75, width / height, 0.1, 100 );
    cam.add(camera);
    var light = new THREE.PointLight( 0xffffff, 1.0, 100 );
    light.dontRemove = true;
    cam.add( light );
    scene.add(cam);
    sectors = [];
    throttle = 0;
    createSpline();
    animate();
}

var keysDown = [];
var keys = { up: 38, down: 40, right: 39, left: 37, a: 65, s: 83, d: 68, w: 87, r: 82 }
addEventListener("keydown", function(e) {
    if (e.keyCode == keys.r)
    {
        init();
    }
    Object.keys(keys).forEach(function(key) {
        if (keys[key] == e.keyCode) {
          e.preventDefault();
          keysDown[e.keyCode] = true;
        }
    });
}, false);

addEventListener("keyup", function(e) {
    delete keysDown[e.keyCode];
}, false);

function preGenerateGeometry() {
    for (var i = 0; i < nGeometries; i++) {
        var l = Math.random() * 15;
        var w = Math.random() * 15;
        var h = Math.random() * 15;
        var geometry = new THREE.BoxGeometry( l, w, h );
        geometry.computeBoundingBox();
        geometries.push(geometry);
    }
}

function createSpline() {
    var anchors = [];
    var x = 0, y = 0, z = 0;
    var nAnchors = 1000;
    anchors.push(new THREE.Vector3(0, 0, -10));
    for (var i = 0; i < nAnchors; i++)
    {
        x -= Math.random() * 10;
        y -= Math.random() * 10;
        z -= Math.random() * 20;
        anchors.push(new THREE.Vector3(x, y, z));
    }
    endPoint = anchors[nAnchors];
    totalDistance = cam.position.distanceTo(endPoint);
    var curve = new THREE.CatmullRomCurve3(anchors);

    var points = curve.getPoints( 1000 );
    var geometry = new THREE.BufferGeometry().setFromPoints( points );

    var lineMaterial = new THREE.LineBasicMaterial( { color : 0x00ff00 } );

    // Create the final object to add to the scene
    var curveObject = new THREE.Line( geometry, lineMaterial );
    curveObject.dontRemove = true
    scene.add(curveObject);
}

function createStars(sectorX, sectorY, sectorZ) {
    var centerX = sectorX * sectorSize;
    var centerY = sectorY * sectorSize;
    var centerZ = sectorZ * sectorSize;
    var range = sectorSize / 2;
    var separateDistance = 20;
    var padding = 20;
    for (var x = centerX - range; x < centerX + range; x += separateDistance) {
        for (var y = centerY - range; y < centerY + range; y += separateDistance) {
            for (var z = centerZ - range; z < centerZ + range; z += separateDistance) {
                var center = new THREE.Vector3(x, y, z);
                if (cam.position.distanceTo(center) < padding)
                    continue; // Ensure the player doesn't start in a box.
                var index = Math.floor(Math.random() * nGeometries);
                var geometry = geometries[index];
                var box = new THREE.Mesh( geometry, material );
                box.position.x = x + Math.random() * 10;
                box.position.y = y + Math.random() * 10;
                box.position.z = z + Math.random() * 10;
                scene.add( box );
            }
        }
    }
}

function isInAABB(point, min, max) {
    return (point.x < max.x && point.x > min.x &&
        point.y < max.y && point.y > min.y &&
        point.z < max.z && point.z > min.z);
}

var moveSpeed = 0.01;
var yawSpeed = 0.01;
var rollSpeed = 0.04;
var pitchSpeed = 0.03;
var throttle = 0;
var maxThrottle = 1;
var throttleChange = false; // Stop when changing forward/reverse
var direction = new THREE.Vector3();

function updateCamera() {
    // Roll
    if (keys.right in keysDown) {
        cam.rotateZ(-rollSpeed);
    }
    if (keys.left in keysDown) {
        cam.rotateZ(rollSpeed);
    }
    // Pitch
    if (keys.up in keysDown) {
        cam.rotateX(-pitchSpeed);
    }
    if (keys.down in keysDown) {
        cam.rotateX(pitchSpeed);
    }
    // Yaw
    if (keys.a in keysDown) {
        cam.rotateY(yawSpeed);
    }
    if (keys.d in keysDown) {
        cam.rotateY(-yawSpeed);
    }

    // Throttle
    if (keys.s in keysDown) {
        if (throttle < 0 && (throttle + moveSpeed == 0 || throttle + moveSpeed > 0)) {
            throttle = 0;
            throttleChange = true;
        }
        else if (!throttleChange)
            throttle += moveSpeed;
    }
    if (keys.w in keysDown) {
        if (throttle > 0 && (throttle - moveSpeed == 0 || throttle - moveSpeed < 0)) {
            throttle = 0;
            throttleChange = true;
        }
        else if (!throttleChange)
            throttle -= moveSpeed;
    }

    cam.getWorldDirection(direction);
    direction.normalize();
    direction.multiplyScalar(throttle);

    if (throttle > maxThrottle || throttle < -maxThrottle)
        throttle = maxThrottle * Math.sign(throttle);

    if (!(keys.w in keysDown) && !(keys.s in keysDown) && throttleChange)
        throttleChange = false;
    
    cam.position.x += direction.x;
    cam.position.y += direction.y;
    cam.position.z += direction.z;
}

function findSector(find) {
    for (var i = 0; i < sectors.length; i++) {
        var s = sectors[i];
        if (s.x == find.x && s.y == find.y && s.z == find.z)
            return i;
    }
    return -1;
}

function updateWorld() {
    var x = Math.round(cam.position.x / sectorSize);
    var y = Math.round(cam.position.y / sectorSize);
    var z = Math.round(cam.position.z / sectorSize);
    var around = [];
    for (var ix = -1; ix < 2; ix++) {
        for (var iy = -1; iy < 2; iy++) {
            for (var iz = -1; iz < 2; iz++) {
                around.push({x: x + ix, y: y + iy, z: z + iz});
            }
        }
    }

    around.forEach((pos) => {
        var index = findSector(pos);
        if (index == -1) {
            sectors.push(pos);
            createStars(pos.x, pos.y, pos.z);
        }
    });

    for (var i = 0; i < sectors.length; i++) {
        var s = sectors[i];
        if (Math.abs(s.x - x) > 1 || Math.abs(s.y - y) > 1 || Math.abs(s.z - z) > 1) {
            sectors[i] = sectors[sectors.length - 1];
            sectors.pop();
            i--;
        }
    }
    
    for (var i = 0; i < scene.children.length; i++) {
        var obj = scene.children[i];
        if (obj.dontRemove)
            continue;
        if (obj.geometry != null) {
            var min = obj.geometry.boundingBox.min.clone();
            var max = obj.geometry.boundingBox.max.clone();
            min.x += obj.position.x;
            min.y += obj.position.y;
            min.z += obj.position.z;
            max.x += obj.position.x;
            max.y += obj.position.y;
            max.z += obj.position.z;
            if (isInAABB(cam.position, min, max)) {
                gameOver = true;
                document.getElementById('gameover').style.display = 'block';
                var score = Math.round(totalDistance - cam.position.distanceTo(endPoint));
                highScore = Math.max(highScore, score);
                document.getElementById('highscore').innerHTML = highScore;
            }
        }
        if (obj.position.distanceTo(cam.position) > sectorSize * 3) {
            scene.remove(obj);
        }
    }
}

function updateUI() {
    var throttleElem = document.getElementById('throttle');
    throttleElem.value = Math.floor(-throttle * 100);
    var scoreElem = document.getElementById('score');
    score.innerHTML = Math.round(totalDistance - cam.position.distanceTo(endPoint));
    $('.dial').trigger('change');
}

function animate() {
    if (!gameOver)
        requestAnimationFrame( animate );

    updateCamera();
    updateWorld();
    updateUI();

    renderer.render( scene, camera );
}

preGenerateGeometry();
init();
