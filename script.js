let scene, camera, renderer, sphere, controls;
let videoElement, videoStream = null;
let arEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);
let gyroQuaternion = new THREE.Quaternion();
let cameraGroup = new THREE.Group();

async function init() {
    setupScene();
    setupControls();
    setupGyro();
    window.addEventListener('resize', onWindowResize);
    animate();
}

function setupScene() {
    scene = new THREE.Scene();
    
    // Create camera group for combined controls
    camera = new THREE.PerspectiveCamera(75, window.innerWidth/window.innerHeight, 0.1, 1000);
    cameraGroup.add(camera);
    scene.add(cameraGroup);
    camera.position.z = 0.1;

    renderer = new THREE.WebGLRenderer({
        antialias: true,
        alpha: true,
        powerPreference: "high-performance"
    });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').appendChild(renderer.domElement);

    // Setup orbit controls
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.1;
    controls.maxDistance = 10;

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
    }, undefined, err => console.error(err));
}

function setupControls() {
    document.getElementById('arToggle').addEventListener('click', toggleAR);
    document.getElementById('opacitySlider').addEventListener('input', updateOpacity);
}

function setupGyro() {
    if (!isMobile) return;
    
    window.addEventListener('deviceorientation', event => {
        if (!event.alpha) return;
        
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

async function toggleAR() {
    arEnabled = !arEnabled;
    
    if (arEnabled) {
        await enableCamera();
        sphere.material.opacity = 0.8;
        document.getElementById('opacitySlider').value = 0.8;
        document.getElementById('transparencyControl').classList.remove('hidden');
    } else {
        disableCamera();
        sphere.material.opacity = 1;
        document.getElementById('transparencyControl').classList.add('hidden');
    }
    
    document.getElementById('arToggle').textContent = arEnabled ? '📷 Disable AR' : '📷 Enable AR';
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
    } catch(error) {
        console.error('Camera error:', error);
        alert(`Camera access required: ${error.message}`);
    }
}

function disableCamera() {
    if (videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    document.getElementById('cameraContainer').innerHTML = '';
}

function updateOpacity(event) {
    if (!arEnabled) return;
    const value = parseFloat(event.target.value);
    sphere.material.opacity = value;
    document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    // Apply combined gyro and manual controls
    if (isMobile) {
        cameraGroup.quaternion.slerp(gyroQuaternion, 0.1);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
