// script.js
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
    setupGyro();
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

    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.05;
    controls.minDistance = 0.05;
    controls.maxDistance = 10;

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

    if(isMobile) {
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
                controls.dolly((touchStartDistance - currentDistance) * 0.002);
                touchStartDistance = currentDistance;
            }
        });
    }
}

async function toggleAR() {
    try {
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
            disableGyro();
        }
        
        updateButtonStates();
    } catch(error) {
        console.error('AR toggle error:', error);
        alert(`Error: ${error.message}`);
    }
}

async function enableCamera() {
    videoStream = await navigator.mediaDevices.getUserMedia({
        video: { facingMode: 'environment' }
    });
    
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
}

function disableCamera() {
    if(videoStream) {
        videoStream.getTracks().forEach(track => track.stop());
        videoStream = null;
    }
    document.getElementById('cameraContainer').innerHTML = '';
}

function toggleGyro() {
    if(!isMobile) return;
    
    gyroEnabled = !gyroEnabled;
    controls.enabled = !gyroEnabled;
    updateButtonStates();
    
    if(gyroEnabled && typeof DeviceOrientationEvent.requestPermission === 'function') {
        DeviceOrientationEvent.requestPermission()
            .then(permission => {
                if(permission !== 'granted') disableGyro();
            })
            .catch(console.error);
    }
}

function updateButtonStates() {
    // AR Button
    const arButton = document.getElementById('arToggle');
    arButton.classList.toggle('ar-active', arEnabled);
    arButton.classList.toggle('ar-inactive', !arEnabled);
    arButton.textContent = arEnabled ? '📷 AR Mode' : '📷 Enable AR';

    // Gyro Button
    const gyroButton = document.getElementById('gyroToggle');
    gyroButton.classList.toggle('gyro-active', gyroEnabled);
    gyroButton.classList.toggle('gyro-inactive', !gyroEnabled);
    gyroButton.textContent = gyroEnabled ? '🔄 Gyro On' : '🔄 Gyro Off';
}

function updateOpacity(event) {
    const value = parseFloat(event.target.value);
    sphere.material.opacity = value;
    document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
}

function storeInitialView() {
    initialCameraPosition.copy(camera.position);
    initialCameraRotation.copy(camera.rotation);
}

function resetView() {
    camera.position.copy(initialCameraPosition);
    camera.rotation.copy(initialCameraRotation);
    controls.reset();
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
}

function animate() {
    requestAnimationFrame(animate);
    
    if(gyroEnabled && isMobile) {
        camera.quaternion.slerp(gyroQuaternion, 0.1);
        controls.target.set(0, 0, 0);
    }
    
    controls.update();
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
