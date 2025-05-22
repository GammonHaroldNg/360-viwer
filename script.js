let scene, camera, renderer, sphere;
let videoElement, videoTexture, videoMesh;
let cameraEnabled = false;

function init() {
    setupScene();
    setupControls();
    window.addEventListener('resize', onWindowResize);
}

function setupScene() {
    scene = new THREE.Scene();
    
    camera = new THREE.PerspectiveCamera(75, window.innerWidth / window.innerHeight, 0.1, 1000);
    camera.position.set(0, 0, 0.1);
    
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: true });
    renderer.setSize(window.innerWidth, window.innerHeight);
    document.getElementById('container').prepend(renderer.domElement);
    
    const texture = new THREE.TextureLoader().load('images/Panorama7D6346.jpg');
    const geometry = new THREE.SphereGeometry(500, 60, 40);
    geometry.scale(-1, 1, 1);
    
    const material = new THREE.MeshBasicMaterial({
        map: texture,
        transparent: true,
        opacity: 1 // Image starts fully visible
    });
    
    sphere = new THREE.Mesh(geometry, material);
    scene.add(sphere);
    
    animate();
}

function setupCameraFeed() {
    videoElement = document.createElement('video');
    videoElement.setAttribute('playsinline', '');
    videoElement.setAttribute('webkit-playsinline', '');
    
    navigator.mediaDevices.getUserMedia({ 
        video: { 
            facingMode: 'environment',
            width: { ideal: window.innerWidth },
            height: { ideal: window.innerHeight }
        } 
    })
    .then(function(stream) {
        videoElement.srcObject = stream;
        videoElement.play();
        
        videoTexture = new THREE.VideoTexture(videoElement);
        const videoGeometry = new THREE.PlaneGeometry(
            window.innerWidth / 100, 
            window.innerHeight / 100
        );
        
        const videoMaterial = new THREE.MeshBasicMaterial({
            map: videoTexture,
            transparent: true
        });
        
        videoMesh = new THREE.Mesh(videoGeometry, videoMaterial);
        videoMesh.position.z = -0.5;
        scene.add(videoMesh);
        
        document.getElementById('transparencyControl').classList.remove('hidden');
        document.getElementById('cameraToggle').textContent = 'Disable Camera';
        cameraEnabled = true;
        
        // Set transparency to 80% when camera turns on
        sphere.material.opacity = 0.8;
        document.getElementById('opacityControl').value = 0.8;
    })
    .catch(function(error) {
        console.error('Error accessing camera:', error);
        alert('Camera access is required for this experience. Please enable camera permissions.');
        toggleCamera();
    });
}

function toggleCamera() {
    if (cameraEnabled) {
        if (videoElement && videoElement.srcObject) {
            videoElement.srcObject.getTracks().forEach(track => track.stop());
        }
        if (videoMesh) scene.remove(videoMesh);
        
        document.getElementById('cameraToggle').textContent = 'Enable Camera';
        document.getElementById('transparencyControl').classList.add('hidden');
        
        // Return image to 100% opacity when camera turns off
        sphere.material.opacity = 1;
        cameraEnabled = false;
    } else {
        setupCameraFeed();
    }
}

function setupControls() {
    const cameraToggle = document.getElementById('cameraToggle');
    cameraToggle.addEventListener('click', toggleCamera);
    
    const opacityControl = document.getElementById('opacityControl');
    opacityControl.addEventListener('input', function(e) {
        if (cameraEnabled) {
            sphere.material.opacity = parseFloat(e.target.value);
        }
    });
}

function onWindowResize() {
    camera.aspect = window.innerWidth / window.innerHeight;
    camera.updateProjectionMatrix();
    renderer.setSize(window.innerWidth, window.innerHeight);
    
    if (videoMesh) {
        videoMesh.scale.x = window.innerWidth / 100;
        videoMesh.scale.y = window.innerHeight / 100;
    }
}

function animate() {
    requestAnimationFrame(animate);
    renderer.render(scene, camera);
}

window.addEventListener('load', init);
