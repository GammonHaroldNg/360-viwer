let scene, camera, renderer, sphere, controls;
let videoElement, videoTexture, videoMesh;
let cameraEnabled = false;
let isMobile = /iPhone|iPad|iPod|Android/i.test(navigator.userAgent);

// Initialize the application
function init() {
    setupScene();
    setupControls();
    window.addEventListener('resize', onWindowResize);
}

function setupScene() {
    // Create scene
    scene = new THREE.Scene();
    
    // Create camera
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.5);
    
    // Create renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    renderer.setPixelRatio(window.devicePixelRatio);
    document.getElementById('container').prepend(renderer.domElement);
    
    // Add orbit controls with enhanced zoom range
    controls = new THREE.OrbitControls(camera, renderer.domElement);
    controls.enableDamping = true;
    controls.dampingFactor = 0.25;
    controls.screenSpacePanning = false;
    controls.minDistance = 0.05;  // Allows much closer zoom
    controls.maxDistance = 5;     // Increased maximum zoom out
    controls.enablePan = false;
    
    // Load 360 image
    const textureLoader = new THREE.TextureLoader();
    textureLoader.load(
        'images/Panorama7D6346.jpg',
        () => {
            // Success callback - hide loading message
            document.getElementById('loading').classList.add('hidden');
        },
        undefined,
        (error) => {
            console.error('Error loading image:', error);
            document.getElementById('loading').textContent = 'Error loading image';
        }
    );
    
    const texture = new THREE.TextureLoader().load('images/Panorama7D6346.jpg');
    const geometry = new THREE.SphereGeometry(1, 64, 64);
    geometry.scale(-1, 1, 1);
    
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1
    });
    
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    
    animate();
}

function setupCameraFeed() {
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    
    if (isMobile) {
        window.addEventListener('deviceorientation', handleOrientation, true);
    }
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: window.innerWidth * window.devicePixelRatio },
            height: { ideal: window.innerHeight * window.devicePixelRatio }
        } 
    })
    .then(function(stream) {
        videoElement.srcObject = stream;
        videoElement.play();
        
        videoTexture = new THREE.VideoTexture(videoElement);
        videoTexture.minFilter = THREE.LinearFilter;
        videoTexture.magFilter = THREE.LinearFilter;
        
        const videoGeometry = new THREE.PlaneGeometry(2, 2);
        const videoMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture,
            transparent: false
        });
        
        videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
        videoMesh.position.z = -1.5;
        scene.add(videoMesh);
        
        document.getElementById('transparencyControl').classList.remove('hidden');
        document.getElementById('viewControls').classList.remove('hidden');
        document.getElementById('cameraToggle').textContent = '📷 Disable AR';
        cameraEnabled = true;
        
        sphere.material.opacity = 0.8;
        document.getElementById('opacityControl').value = 0.8;
        document.getElementById('opacityValue').textContent = '80%';
        
        controls.enabled = true;
    })
    .catch(function(error) {
        console.error('Error accessing camera:', error);
        alert('Camera access is required for AR mode. Please enable camera permissions.');
        toggleCamera();
    });
}

function toggleCamera() {
    if (cameraEnabled) {
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        if (videoMesh) scene.remove(videoMesh);
        if (isMobile) {
            window.removeEventListener('deviceorientation', handleOrientation);
        }
        
        document.getElementById('cameraToggle').textContent = '📷 Enable AR';
        document.getElementById('transparencyControl').classList.add('hidden');
        
        sphere.material.opacity = 1;
        cameraEnabled = false;
        controls.enabled = true;
        resetView();
    } else {
        setupCameraFeed();
    }
}

function handleOrientation(event) {
    if (!cameraEnabled || !isMobile) return;
    
    const beta = event.beta ? THREE.MathUtils.degToRad(event.beta) : 0;
    const gamma = event.gamma ? THREE.MathUtils.degToRad(event.gamma) : 0;
    const alpha = event.alpha ? THREE.MathUtils.degToRad(event.alpha) : 0;
    
    camera.rotation.set(beta, alpha, -gamma, 'YXZ');
}

function resetView() {
    camera.position.set(0, 0, 0.5);
    controls.reset();
}

function zoom(amount) {
    const newDistance = controls.getDistance() * (amount > 0 ? 1.2 : 0.8);
    controls.dollyTo(newDistance, true);
    controls.update();
    showZoomFeedback(amount > 0 ? "Zooming Out" : "Zooming In");
}

function showZoomFeedback(message) {
    const feedback = document.createElement('div');
    feedback.className = 'zoom-feedback';
    feedback.textContent = message;
    document.getElementById('controls').appendChild(feedback);
    
    setTimeout(() => {
        feedback.classList.add('fade-out');
        setTimeout(() => feedback.remove(), 500);
    }, 800);
}

function setupControls() {
    const cameraToggle = document.getElementById('cameraToggle');
    cameraToggle.addEventListener('click', toggleCamera);
    
    const opacityControl = document.getElementById('opacityControl');
    opacityControl.addEventListener('input', function(e) {
        if (cameraEnabled) {
            const value = parseFloat(e.target.value);
            sphere.material.opacity = value;
            document.getElementById('opacityValue').textContent = `${Math.round(value * 100)}%`;
        }
    });
    
    document.getElementById('resetView').addEventListener('click', resetView);
    document.getElementById('zoomIn').addEventListener('click', () => zoom(-1));
    document.getElementById('zoomOut').addEventListener('click', () => zoom(1));
    
    if (isMobile) {
        let touchStartDistance = 0;
        
        renderer.domElement.addEventListener('touchstart', (e) => {
            if (e.touches.length === 2) {
                touchStartDistance = getDistanceBetweenTouches(e);
            }
        });
        
        renderer.domElement.addEventListener('touchmove', (e) => {
            if (e.touches.length === 2) {
                e.preventDefault();
                const currentDistance = getDistanceBetweenTouches(e);
                const delta = (touchStartDistance - currentDistance) * 0.01;
                zoom(delta);
                touchStartDistance = currentDistance;
            }
        });
    }
}

function getDistanceBetweenTouches(e) {
    const dx = e.touches[0].clientX - e.touches[1].clientX;
    const dy = e.touches[0].clientY - e.touches[1].clientY;
    return Math.sqrt(dx * dx + dy * dy);
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    if (videoMesh) {
        videoMesh.scale.x = window.innerWidth / 500;
        videoMesh.scale.y = window.innerHeight / 500;
    }
}

function animate() {
    requestAnimationFrame(animate);
    
    if (controls) {
        if (cameraEnabled && isMobile) {
            controls.update();
            controls.target.set(0, 0, 0);
        } else {
            controls.update();
        }
    }
    
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
