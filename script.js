// script.js (corrected version)
let scene, camera, renderer, sphere, controls;
let videoElement, videoStream = null;
let arEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroQuaternion = new THREE.Quaternion();
let initialCameraPosition = new THREE.Vector3(0, 0, 0.1);
let initialCameraRotation = new THREE.Euler();

async function init() {
    setupScene();
    setupControls();
    setupGyro(); // Now properly defined
    window.addEventListener('resize', onWindowResize);
    storeInitialView();
    animate();
}

function setupScene() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    camera.position.copy(initialCameraPosition);
    camera.rotation.x = -0.5;

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').appendChild(renderer.domElement);

    // Proper sphere creation with error handling
    new THREE.TextureLoader().load(
        'images/Panorama7D6346.jpg',
        texture => {
            const geometry = new THREE.SphereGeometry(5, 64, 64).scale(-1, 1, 1);
            sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
                map: texture,
                transparent: true,
                opacity: 1
            }));
            scene.add(sphere);
            document.getElementById('loading').remove();
        },
        undefined,
        err => {
            console.error('Failed to load texture:', err);
            document.getElementById('loading').textContent = 'Error loading image';
        }
    );

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.05;
    controls.maxDistance = 10;
}

// Add missing gyro functions
function setupGyro() {
    if(!isMobile) return;
    
    window.addEventListener('deviceorientation', handleDeviceOrientation);
}

function handleDeviceOrientation(event) {
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
}

function disableGyro() {
    gyroEnabled = false;
    controls.enabled = true;
    updateButtonStates();
}

async function toggleAR() {
    try {
        arEnabled = !arEnabled;
        
        if(arEnabled) {
            await enableCamera();
            if(sphere) sphere.material.opacity = 0.8;
            document.getElementById('transparencyControl').classList.remove('hidden');
            if(isMobile) {
                gyroEnabled = true;
                controls.enabled = false;
                if(typeof DeviceOrientationEvent.requestPermission === 'function') {
                    await DeviceOrientationEvent.requestPermission();
                }
            }
        } else {
            disableCamera();
            if(sphere) sphere.material.opacity = 1;
            document.getElementById('transparencyControl').classList.add('hidden');
            disableGyro();
        }
        
        updateButtonStates();
    } catch(error) {
        console.error('AR toggle error:', error);
        alert(`Error: ${error.message}`);
    }
}

// Rest of the functions remain the same as previous answer
// (setupControls, enableCamera, disableCamera, updateOpacity, etc.)

// Make sure all functions are properly defined
function updateButtonStates() {
    const arButton = document.getElementById('arToggle');
    arButton.classList.toggle('ar-active', arEnabled);
    arButton.classList.toggle('ar-inactive', !arEnabled);
    arButton.textContent = arEnabled ? '📷 AR Mode' : '📷 Enable AR';

    const gyroButton = document.getElementById('gyroToggle');
    gyroButton.classList.toggle('gyro-active', gyroEnabled);
    gyroButton.classList.toggle('gyro-inactive', !gyroEnabled);
    gyroButton.textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
}

window.addEventListener('load', init);
