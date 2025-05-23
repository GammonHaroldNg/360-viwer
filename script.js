let scene, camera, renderer, sphere, controls;
let videoElement, videoStream = null;
let cameraEnabled = false, gyroEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroQuaternion = new THREE.Quaternion();
let screenOrientation = 0;

// Main initialization
function init() {
    setupScene();
    setupEventListeners();
    setupControls();
    window.addEventListener('resize', onWindowResize);
    animate();
}

function setupScene() {
    // Three.js scene setup
    scene = new THREE.Scene();
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.001, 1000);
    camera.position.set(0, 0, 0.1);

    // WebGL renderer
    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);

    // Orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.01;
    controls.maxDistance = 10;
    controls.rotateSpeed = 0.5;

    // Load 360 image
    new THREE.TextureLoader().load('images/Panorama7D6346.jpg', texture => {
        document.getElementById('loading').remove();
        const geometry = new THREE.SphereGeometry(2, 64, 64).scale(-1, 1, 1);
        sphere = new THREE.Mesh(geometry, new THREE.MeshBasicMaterial({
            map: texture,
            transparent: true,
            opacity: 1
        }));
        scene.add(sphere);
    }, undefined, err => console.error(err));
}

function setupEventListeners() {
    // Screen orientation handling
    window.addEventListener('orientationchange', () => {
        screenOrientation = window.orientation || 0;
    });
}

function setupControls() {
    // Button event listeners
    document.getElementById('cameraToggle').addEventListener('click', toggleCamera);
    document.getElementById('gyroToggle').addEventListener('click', handleGyro);
    document.getElementById('resetView').addEventListener('click', resetView);
    document.getElementById('opacityControl').addEventListener('input', updateOpacity);

    // Mobile touch controls
    if(isMobile) setupTouchControls();
}

async function toggleCamera() {
    if(cameraEnabled) {
        disableCamera();
    } else {
        await enableCamera();
        if(isMobile) await handleMobilePermissions();
    }
    updateUI();
}

async function enableCamera() {
    try {
        const constraints = {
            video: {
                facingMode: 'environment',
                width: { ideal: 1920 },
                height: { ideal: 1080 }
            }
        };

        videoStream = await navigator.mediaDevices.getUserMedia(constraints);
        videoElement = document.createElement('video');
        videoElement.srcObject = videoStream;
        videoElement.playsInline = true;
        videoElement.style.cssText = `
            position: fixed;
            width: 100%;
            height: 100%;
            object-fit: cover;
            transform: scaleX(-1);
        `;
        document.getElementById('cameraContainer').appendChild(videoElement);
        await videoElement.play();
        
        cameraEnabled = true;
    } catch(error) {
        console.error('Camera error:', error);
        alert(`Camera access required: ${error.message}`);
    }
}

function disableCamera() {
    if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    document.getElementById('cameraContainer').innerHTML = '';
    cameraEnabled = false;
}

async function handleMobilePermissions() {
    if(typeof DeviceOrientationEvent !== 'undefined' && 
       typeof DeviceOrientationEvent.requestPermission === 'function') {
        try {
            const permission = await DeviceOrientationEvent.requestPermission();
            if(permission === 'granted') enableGyro();
        } catch(error) {
            console.error('Gyro permission error:', error);
        }
    }
}

function handleGyro() {
    if(!isMobile) return;
    gyroEnabled ? disableGyro() : enableGyro();
    updateUI();
}

function enableGyro() {
    window.addEventListener('deviceorientation', handleOrientation);
    gyroEnabled = true;
    controls.enabled = false;
}

function disableGyro() {
    window.removeEventListener('deviceorientation', handleOrientation);
    gyroEnabled = false;
    controls.enabled = true;
    controls.reset();
}

function handleOrientation(event) {
    if(!gyroEnabled || !event.alpha) return;

    const alpha = THREE.MathUtils.degToRad(event.alpha);
    const beta = THREE.MathUtils.degToRad(event.beta);
    const gamma = THREE.MathUtils.degToRad(event.gamma);
    const screenAdjust = THREE.MathUtils.degToRad(-screenOrientation);

    const euler = new THREE.Euler(
        Math.max(-Math.PI/2, Math.min(Math.PI/2, beta)),
        alpha,
        -gamma,
        'YXZ'
    );
    
    gyroQuaternion.setFromEuler(euler)
        .multiply(new THREE.Quaternion().setFromAxisAngle(new THREE.Vector3(0,0,1), screenAdjust));
}

function updateOpacity(event) {
    if(cameraEnabled) {
        const value = parseFloat(event.target.value);
        sphere.material.opacity = value;
        document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
    }
}

function resetView() {
    camera.position.set(0, 0, 0.1);
    controls.reset();
}

function setupTouchControls() {
    let touchStartDistance = 0;
    
    renderer.domElement.addEventListener('touchstart', e => {
        if(e.touches.length === 2) {
            touchStartDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
        }
    });

    renderer.domElement.addEventListener('touchmove', e => {
        if(e.touches.length === 2) {
            const currentDistance = Math.hypot(
                e.touches[0].clientX - e.touches[1].clientX,
                e.touches[0].clientY - e.touches[1].clientY
            );
            const delta = (touchStartDistance - currentDistance) * 0.002;
            controls.dolly(delta);
            touchStartDistance = currentDistance;
        }
    });
}

function updateUI() {
    document.getElementById('cameraToggle').textContent = cameraEnabled ? '📷 Disable AR' : '📷 Enable AR';
    document.getElementById('gyroToggle').textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
    document.getElementById('gyroToggle').className = `control-btn ${gyroEnabled ? 'gyro-on' : 'gyro-off'}`;
    document.getElementById('transparencyControl').classList.toggle('hidden', !cameraEnabled);
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

// Start application
window.addEventListener('load', init);
