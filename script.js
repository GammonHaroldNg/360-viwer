// script.js
let scene, camera, renderer, sphere, controls;
let videoElement, videoStream = null;
let arEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroQuaternion = new THREE.Quaternion();
let initialCameraPosition = new THREE.Vector3();
let initialCameraRotation = new THREE.Euler();

// Initialization
async function init() {
    setupScene();
    setupControls();
    setupGyro();
    window.addEventListener('resize', onWindowResize);
    storeInitialView();
    animate();
}

function setupScene() {
    scene = new THREE.Scene();
    
    // Camera setup
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);
    camera.rotation.x = -0.5; // Look at horizon instead of top

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Controls setup
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.05;  // Closer zoom
    controls.maxDistance = 10;
    controls.rotateSpeed = 0.5;

    // Load 360 image
    new THREE.TextureLoader().load('images/Panorama7D6346.jpg', texture => {
        document.getElementById('loading').remove();
        const geometry = new THREE.SphereGeometry(5, 64, 64).scale(-1, 1, 1);
        sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1
        }));
        scene.add(sphere);
    });
}

function setupControls() {
    document.getElementById('arToggle').addEventListener('click', toggleAR);
    document.getElementById('gyroToggle').addEventListener('click', toggleGyro);
    document.getElementById('resetView').addEventListener('click', resetView);
    document.getElementById('opacitySlider').addEventListener('input', updateOpacity);

    // Pinch-to-zoom for mobile
    if(isMobile) {
        let touchStartDistance = 0;
        
        renderer.domElement.addEventListener('touchstart', e => {
            if(e.touches.length === 2) {
                touchStartDistance = getTouchDistance(e.touches);
            }
        });

        renderer.domElement.addEventListener('touchmove', e => {
            if(e.touches.length === 2) {
                const currentDistance = getTouchDistance(e.touches);
                controls.dolly((touchStartDistance - currentDistance) * 0.002);
                touchStartDistance = currentDistance;
            }
        });
    }
}

function setupGyro() {
    if(!isMobile) return;
    
    window.addEventListener('deviceorientation', event => {
        if(!gyroEnabled || !event.alpha) return;
        
        const alpha = THREE.MathUtils.degToRad(event.alpha);
        const beta = THREE.MathUtils.degToRad(event.beta);
        const gamma = THREE.MathUtils.degToRad(event.gamma);
        
        gyroQuaternion.setFromEuler(new THREE.Euler(
            Math.max(-Math.PI/2, Math.min(Math.PI/2, beta)),
            alpha,
            -gamma,
            'YXZ'
        ));
    });
}

function storeInitialView() {
    initialCameraPosition.copy(camera.position);
    initialCameraRotation.copy(camera.rotation);
}

function resetView() {
    camera.position.copy(initialCameraPosition);
    camera.rotation.copy(initialCameraRotation);
    controls.reset();
    if(gyroEnabled) toggleGyro();
}

async function toggleAR() {
    arEnabled = !arEnabled;
    
    if(arEnabled) {
        await enableCamera();
        sphere.material.opacity = 0.8;
        document.getElementById('transparencyControl').classList.remove('hidden');
        if(isMobile) enableGyro(true);
    } else {
        disableCamera();
        sphere.material.opacity = 1;
        document.getElementById('transparencyControl').classList.add('hidden');
        if(isMobile) disableGyro();
    }
    
    document.getElementById('gyroToggle').classList.toggle('hidden', arEnabled);
    document.getElementById('arToggle').textContent = arEnabled ? '📷 Disable AR' : '📷 Enable AR';
}

function toggleGyro() {
    if(arEnabled) return;
    
    gyroEnabled = !gyroEnabled;
    controls.enabled = !gyroEnabled;
    document.getElementById('gyroToggle').textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
    document.getElementById('gyroToggle').classList.toggle('gyro-on', gyroEnabled);
}

function updateOpacity(event) {
    const value = parseFloat(event.target.value);
    sphere.material.opacity = value;
    document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
}

function getTouchDistance(touches) {
    return Math.hypot(
        touches[0].clientX - touches[1].clientX,
        touches[0].clientY - touches[1].clientY
    );
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if(gyroEnabled) {
        camera.quaternion.slerp(gyroQuaternion, 0.1);
        controls.target.set(0, 0, 0);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
