var threediv = document.getElementById('three');
var width = threediv.clientWidth;
var height = threediv.clientHeight;
var scene = new THREE.Scene();
var material = new THREE.MeshPhongMaterial( { color: 0xffffff,  side: THREE.DoubleSide } );
var geometries = [];
var nGeometries = 40;
var scale = 3;
var camera = new THREE.PerspectiveCamera( 75, width / height, 0.1, 100 );
var cam = new THREE.Object3D();
cam.add(camera);
var renderer = new THREE.WebGLRenderer();
renderer.setSize(width, height);
threediv.appendChild(renderer.domElement);

var light = new THREE.PointLight( 0xffffff, 1.0, 100 );
light.isLight = true;
cam.add( light );

scene.add(cam);

var keysDown = [];
var keys = { up: 38, down: 40, right: 39, left: 37, a: 65, s: 83, d: 68, w: 87, shift: 16 }
addEventListener("keydown", function(e) {
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
        geometries.push(geometry);
    }
}

function createStars(sectorX, sectorY, sectorZ) {
    var centerX = sectorX * sectorSize;
    var centerY = sectorY * sectorSize;
    var centerZ = sectorZ * sectorSize;
    var range = sectorSize / 2;
    var separateDistance = 20;
    for (var x = centerX - range; x < centerX + range; x += separateDistance) {
        for (var y = centerY - range; y < centerY + range; y += separateDistance) {
            for (var z = centerZ - range; z < centerZ + range; z += separateDistance) {
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

var sectorSize = 100;
var sectors = [];

var moveSpeed = 0.01;
var yawSpeed = 0.01;
var rollSpeed = 0.04;
var pitchSpeed = 0.03;
var throttle = 0;
var maxThrottle = 1;
var throttleChange = false; // Stop when changing forward/reverse

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

    var direction = cam.getWorldDirection();
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
        if (obj.isLight)
            continue;
        if (obj.position.distanceTo(cam.position) > sectorSize * 3) {
            scene.remove(obj);
        }
    }
}

function updateUI() {
    var throttleElem = document.getElementById('throttle');
    throttleElem.value = Math.floor(-throttle * 100);
    $('.dial').trigger('change');
}

function animate() {
    requestAnimationFrame( animate );

    updateCamera();
    updateWorld();
    updateUI();

    renderer.render( scene, camera );
}

preGenerateGeometry();
animate();