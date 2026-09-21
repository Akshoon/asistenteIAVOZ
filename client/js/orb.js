/**
 * Visualizador 3D Three.js: Orbe Cuántico Celeste
 * Tono celeste / azul cielo luminoso sobre fondo oscuro mate
 */
class VoiceOrb {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    this.scene = null;
    this.camera = null;
    this.renderer = null;
    
    this.orbMesh = null;
    this.innerMesh = null;
    this.outerHalo = null;
    this.particles = null;
    this.particleCount = 2400;
    
    this.state = 'ready';
    this.audioIntensity = 0.0;
    
    // Paleta cromática basada enteramente en gama Celeste
    this.stateColors = {
      ready: new THREE.Color(0x38bdf8),      // Celeste puro luminoso (#38bdf8)
      listening: new THREE.Color(0x22d3ee),  // Celeste turquesa / aguamarina (#22d3ee)
      analyzing: new THREE.Color(0x60a5fa),  // Celeste zafiro cielo (#60a5fa)
      speaking: new THREE.Color(0xbae6fd),   // Celeste hielo brillante (#bae6fd)
      error: new THREE.Color(0xf87171)       // Coral sutil para error
    };
    
    this.targetColor = this.stateColors.ready.clone();
    this.currentColor = this.stateColors.ready.clone();
    
    this.clock = new THREE.Clock();
    this.init();
  }

  init() {
    this.scene = new THREE.Scene();

    this.camera = new THREE.PerspectiveCamera(
      45,
      window.innerWidth / window.innerHeight,
      0.1,
      1000
    );
    this.camera.position.z = 6.0;

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance'
    });
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.createOrb();
    this.createParticles();
    this.setupLighting();

    window.addEventListener('resize', () => this.onResize());
    this.animate();
  }

  setupLighting() {
    const ambientLight = new THREE.AmbientLight(0xffffff, 0.45);
    this.scene.add(ambientLight);

    // Luz frontal celeste
    this.pointLight = new THREE.PointLight(0x38bdf8, 3.2, 50);
    this.pointLight.position.set(0, 0, 4);
    this.scene.add(this.pointLight);

    // Contraluz celeste profundo
    this.backLight = new THREE.PointLight(0x0284c7, 2.2, 40);
    this.backLight.position.set(-3, 2, -4);
    this.scene.add(this.backLight);
  }

  createOrb() {
    // 1. Malla icosaédrica en celeste
    const orbGeo = new THREE.IcosahedronGeometry(1.65, 4);
    
    const pos = orbGeo.attributes.position;
    orbGeo.userData = { originalPos: pos.clone() };

    const orbMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      wireframe: true,
      transparent: true,
      opacity: 0.85,
      roughness: 0.15,
      metalness: 0.9,
      emissive: 0x075985,
      emissiveIntensity: 0.6
    });

    this.orbMesh = new THREE.Mesh(orbGeo, orbMat);
    this.scene.add(this.orbMesh);

    // 2. Núcleo volumétrico celeste
    const innerGeo = new THREE.SphereGeometry(1.1, 32, 32);
    const innerMat = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.35,
      blending: THREE.AdditiveBlending
    });
    this.innerMesh = new THREE.Mesh(innerGeo, innerMat);
    this.scene.add(this.innerMesh);

    // 3. Halo exterior translúcido celeste
    const haloGeo = new THREE.SphereGeometry(1.85, 32, 32);
    const haloMat = new THREE.MeshBasicMaterial({
      color: 0x7dd3fc,
      transparent: true,
      opacity: 0.08,
      wireframe: false,
      blending: THREE.AdditiveBlending
    });
    this.outerHalo = new THREE.Mesh(haloGeo, haloMat);
    this.scene.add(this.outerHalo);
  }

  createParticles() {
    const pGeo = new THREE.BufferGeometry();
    const positions = new Float32Array(this.particleCount * 3);
    const scales = new Float32Array(this.particleCount);

    for (let i = 0; i < this.particleCount; i++) {
      const radius = 2.0 + Math.random() * 4.5;
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.acos(2 * Math.random() - 1);

      positions[i * 3] = radius * Math.sin(phi) * Math.cos(theta);
      positions[i * 3 + 1] = radius * Math.sin(phi) * Math.sin(theta);
      positions[i * 3 + 2] = radius * Math.cos(phi);

      scales[i] = Math.random() * 0.04 + 0.015;
    }

    pGeo.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    pGeo.setAttribute('scale', new THREE.BufferAttribute(scales, 1));

    const pMat = new THREE.PointsMaterial({
      color: 0x7dd3fc,
      size: 0.035,
      transparent: true,
      opacity: 0.65,
      blending: THREE.AdditiveBlending
    });

    this.particles = new THREE.Points(pGeo, pMat);
    this.scene.add(this.particles);
  }

  setState(newState) {
    this.state = newState;
    if (this.stateColors[newState]) {
      this.targetColor = this.stateColors[newState];
    } else {
      this.targetColor = this.stateColors.ready;
    }
  }

  setAudioIntensity(val) {
    this.audioIntensity = Math.min(Math.max(val, 0), 1.0);
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();

    // Interpolación suave del color celeste
    this.currentColor.lerp(this.targetColor, 0.06);

    if (this.orbMesh) {
      this.orbMesh.material.color.copy(this.currentColor);
      this.orbMesh.material.emissive.copy(this.currentColor).multiplyScalar(0.4);
    }
    if (this.innerMesh) {
      this.innerMesh.material.color.copy(this.currentColor);
    }
    if (this.outerHalo) {
      this.outerHalo.material.color.copy(this.currentColor);
    }
    if (this.particles) {
      this.particles.material.color.copy(this.currentColor);
    }
    if (this.pointLight) {
      this.pointLight.color.copy(this.currentColor);
    }

    let rotSpeed = 0.35;
    if (this.state === 'listening') rotSpeed = 0.85;
    if (this.state === 'analyzing') rotSpeed = 1.6;
    if (this.state === 'speaking') rotSpeed = 0.65;

    // Deformación de ondas 3D del Orbe
    if (this.orbMesh) {
      this.orbMesh.rotation.y += 0.005 * rotSpeed;
      this.orbMesh.rotation.x += 0.003 * rotSpeed;

      const pos = this.orbMesh.geometry.attributes.position;
      const orig = this.orbMesh.geometry.userData.originalPos;
      const count = pos.count;

      const intensity = this.audioIntensity * 0.45;
      const pulse = Math.sin(time * 2.5) * 0.05;

      for (let i = 0; i < count; i++) {
        const ox = orig.getX(i);
        const oy = orig.getY(i);
        const oz = orig.getZ(i);

        const dist = Math.sqrt(ox * ox + oy * oy + oz * oz);
        const wave = Math.sin(dist * 3.2 + time * 3.5) * (0.08 + intensity)
                   + Math.cos(ox * 2.0 + time * 2.0) * (0.04 + intensity * 0.5);

        const factor = 1.0 + pulse + wave;
        pos.setXYZ(i, ox * factor, oy * factor, oz * factor);
      }
      pos.needsUpdate = true;
    }

    // Rotación del campo de partículas
    if (this.particles) {
      this.particles.rotation.y -= 0.0012 * rotSpeed;
      this.particles.rotation.z += 0.0006 * rotSpeed;
    }

    // Pulsación del núcleo interno
    if (this.innerMesh) {
      const innerScale = 1.0 + this.audioIntensity * 0.4 + Math.sin(time * 3.0) * 0.06;
      this.innerMesh.scale.set(innerScale, innerScale, innerScale);
    }

    if (this.outerHalo) {
      const haloScale = 1.0 + this.audioIntensity * 0.2 + Math.sin(time * 2.0) * 0.03;
      this.outerHalo.scale.set(haloScale, haloScale, haloScale);
    }

    this.renderer.render(this.scene, this.camera);
  }

  onResize() {
    if (!this.renderer || !this.camera) return;
    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
  }
}

window.VoiceOrb = VoiceOrb;
