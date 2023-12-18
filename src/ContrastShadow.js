import * as THREE from 'three'
import { HorizontalBlurShader } from 'three/examples/jsm/shaders/HorizontalBlurShader.js';
import { VerticalBlurShader } from 'three/examples/jsm/shaders/VerticalBlurShader.js';


export class ContrastShadow {
    constructor(scene,renderer,mainObj){
        this.scene = scene;
        this.renderer = renderer;

        this.PLANE_WIDTH = 75;
        this.PLANE_HEIGHT = 75;
        this.CAMERA_HEIGHT = 65.0;

        this.init();
    }
    
    init(){
        //Shadow
        // the container, if you need to move the plane just move this
        this.shadowGroup = new THREE.Group();
        this.shadowGroup.position.y = - 0.3;
        this.shadowGroup.layers.mask = 2;
        this.scene.add( this.shadowGroup );
    
        // the render target that will show the shadows in the plane texture
        this.renderTarget = new THREE.WebGLRenderTarget( 128, 128 );
        this.renderTarget.texture.generateMipmaps = false;
    
        // the render target that we will use to blur the first render target
        this.renderTargetBlur = new THREE.WebGLRenderTarget( 128, 128 );
        this.renderTargetBlur.texture.generateMipmaps = false;
    
            // make a plane and make it face up
            const planeGeometry = new THREE.PlaneGeometry( this.PLANE_HEIGHT, this.PLANE_WIDTH ).rotateX( Math.PI / 2 );
           // planeGeometry.translate(0,30,0)
            const planeMaterial = new THREE.MeshBasicMaterial( {
                map: this.renderTarget.texture,
                opacity: 0.5,
                transparent: true,
                depthWrite: false,
            } );
            this.plane = new THREE.Mesh( planeGeometry, planeMaterial );
            // make sure it's rendered after the fillPlane
            this.plane.renderOrder = 1;
            this.shadowGroup.add( this.plane );
    
            // the y from the texture is flipped!
            this.plane.scale.y = - 1;
    
            // the plane onto which to blur the texture
            this.blurPlane = new THREE.Mesh( planeGeometry );
            this.blurPlane.visible = false;
                    this.shadowGroup.add(  this.blurPlane );
    
                    // the plane with the color of the ground
                    const fillPlaneMaterial = new THREE.MeshBasicMaterial( {
                        color: this.white,
                        opacity: 0.0,
                        transparent: true,
                        depthWrite: false,
                    } );
                    this.fillPlane = new THREE.Mesh( planeGeometry, fillPlaneMaterial );
                    this.fillPlane.rotateX( Math.PI );
                    this.shadowGroup.add( this.fillPlane );
    
                    // the camera to render the depth material from
                    this.shadowCamera = new THREE.OrthographicCamera( - this.PLANE_WIDTH / 2, this.PLANE_WIDTH / 2, this.PLANE_HEIGHT / 2, - this.PLANE_HEIGHT / 2, 0, this.CAMERA_HEIGHT );
                    this.shadowCamera.rotation.x = Math.PI / 2; // get the camera to look up
                    this.shadowGroup.add( this.shadowCamera );
    
                    this.cameraHelper = new THREE.CameraHelper( this.shadowCamera );
                    //this.scene.add( this.cameraHelper );
    
                    // like MeshDepthMaterial, but goes from black to transparent
                    this.depthMaterial = new THREE.MeshDepthMaterial();
                    this.depthMaterial.userData.darkness = { value: 5.0 };
                    this.depthMaterial.onBeforeCompile = ( shader ) => {
    
                        shader.uniforms.darkness =  this.depthMaterial.userData.darkness;
                        shader.fragmentShader = /* glsl */`
                            uniform float darkness;
                            ${shader.fragmentShader.replace(
                        'gl_FragColor = vec4( vec3( 1.0 - fragCoordZ ), opacity );',
                        'gl_FragColor = vec4( vec3( 0.0 ), ( 1.0 - fragCoordZ ) * darkness );'
                    )}
                        `;
    
                    };
    
                    this.depthMaterial.depthTest = false;
                    this.depthMaterial.depthWrite = false;
    
                    this.horizontalBlurMaterial = new THREE.ShaderMaterial( HorizontalBlurShader );
                    this.horizontalBlurMaterial.depthTest = false;
    
                    this.verticalBlurMaterial = new THREE.ShaderMaterial( VerticalBlurShader );
                    this.verticalBlurMaterial.depthTest = false;
    }

    renderLoop(){
        // Render
        // renderer.toneMappingExposure = 2.2;
        // renderer.render(scene, camera)
        
        // remove the background
        this.initialBackground = this.scene.background;
        this.scene.background = null;
    
        // force the depthMaterial to everything
        this.cameraHelper.visible = false;
        this.scene.overrideMaterial = this.depthMaterial;
    
        // set renderer clear alpha
        this.initialClearAlpha = this.renderer.getClearAlpha();
        this.renderer.setClearAlpha( 0 );
    
        // render to the render target to get the depths
        this.renderer.setRenderTarget( this.renderTarget );
        this.renderer.render( this.scene, this.shadowCamera );
    
        // and reset the override material
        this.scene.overrideMaterial = null;
        this.cameraHelper.visible = true;
    
        this.blurShadow( 1.0 );
    
        // a second pass to reduce the artifacts
        // (0.4 is the minimum blur amout so that the artifacts are gone)
        this.blurShadow( 1.0 * 0.4 );
    
        // reset and render the normal scene
        this.renderer.setRenderTarget( null );
        this.renderer.setClearAlpha( this.initialClearAlpha );
        this.scene.background = this.initialBackground;
    }

    blurShadow( amount ) {
    
        this.blurPlane.visible = true;
    
        // blur horizontally and draw in the renderTargetBlur
        this.blurPlane.material = this.horizontalBlurMaterial;
        this.blurPlane.material.uniforms.tDiffuse.value = this.renderTarget.texture;
        this.horizontalBlurMaterial.uniforms.h.value = amount * 1 / 64;
    
        this.renderer.setRenderTarget( this.renderTargetBlur );
        this.renderer.render( this.blurPlane, this.shadowCamera );
    
        // blur vertically and draw in the main renderTarget
        this.blurPlane.material = this.verticalBlurMaterial;
        this.blurPlane.material.uniforms.tDiffuse.value = this.renderTargetBlur.texture;
        this.verticalBlurMaterial.uniforms.v.value = amount * 1 / 64;
    
        this.renderer.setRenderTarget( this.renderTarget );
        this.renderer.render( this.blurPlane, this.shadowCamera );
    
        this.blurPlane.visible = false;
    
    }
}