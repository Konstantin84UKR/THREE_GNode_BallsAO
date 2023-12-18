// import './style.css'
import * as THREE from 'three'
import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SAOPass } from 'three/examples/jsm/postprocessing/SAOPass.js';

import { ContrastShadow } from './ContrastShadow.js';
import {postprocessing} from "./postprocessing/postprocessing.js"

import {GLTFLoader as THREE_GLTFLoader} from "three/examples/jsm/loaders/GLTFLoader.js";
import studioGLTF from './models/studio.glb?url'

import { Perlin } from 'three-noise/build/three-noise.module';


export default class Sketch {
    constructor() {
        this.canvas = document.querySelector('canvas.webgl');
        this.sizes = {
            width: window.innerWidth,
            height: window.innerHeight
        };

        this.renderer = new THREE.WebGLRenderer({
            canvas: this.canvas,
            antialias: true
        });
        this.renderer.setSize(this.sizes.width, this.sizes.height);

        this.scene = new THREE.Scene()
        this.scene.background = new THREE.Color(0x555555);

        this.raycaster = new THREE.Raycaster();
        this.pointer = new THREE.Vector2(0, -0.1);

        //any var
        this.composer;
        this.renderPass;
        this.saoPass;

        this.pngCubeRenderTarget;
        this.exrCubeRenderTarget;
        this.pngBackground;
        this.exrBackground;
        this.newEnvMap;

        this.shadowGroup;
        this.renderTarget;
        this.renderTargetBlur;
        this.shadowCamera;
        this.cameraHelper;
        this.depthMaterial;
        this.horizontalBlurMaterial;
        this.verticalBlurMaterial;
        this.plane;
        this.blurPlane;
        this.fillPlane;

        this.orange = new THREE.Color(0xFF8800); //  #a1cbdd
        this.white = new THREE.Color(0xffffff);
        this.blue = new THREE.Color(0x0088ff);
        this.color2 = new THREE.Color(0xff0000);

        this.offset = 5;
        this.clock = new THREE.Clock()

        //https://www.npmjs.com/package/three-noise
        this.perlin = new Perlin(Math.random())

        this.initAll();
    }

    async initAll() {

        let pmremGenerator;
        THREE.DefaultLoadingManager.onLoad = function () {

            pmremGenerator.dispose();

        };

        pmremGenerator = new THREE.PMREMGenerator(this.renderer);
        pmremGenerator.compileEquirectangularShader();
        this.TextureLoader = new THREE.TextureLoader();
        let CubeRenderTarget, Background, newEnvMap;
        var texture = await this.TextureLoader.loadAsync('/textures/equirectangular.png');

        texture.mapping = THREE.EquirectangularReflectionMapping;
        texture.colorSpace = THREE.SRGBColorSpace;
        CubeRenderTarget = pmremGenerator.fromEquirectangular(texture);
        newEnvMap = CubeRenderTarget
        this.newEnvMap = newEnvMap;
        Background = texture
        //this.scene.background = Background;

        this.addModel();

        //helpBox for POINTER
        this.helpBox = new THREE.BoxGeometry(1, 1, 1, 1, 1, 1);
        this.materialhelpBox = new THREE.MeshBasicMaterial({ color: 0x008800, side: THREE.FrontSide, wireframe: true });
        this.helpBoxMesh = new THREE.Mesh(this.helpBox, this.materialhelpBox);
        this.helpBoxMesh.visible = false;
        this.scene.add(this.helpBoxMesh);
        /**
         * Ligth
         */
        this.addLight();

        /**
         * Camera
         */
        this.camera = new THREE.PerspectiveCamera(75, this.sizes.width / this.sizes.height)
        this.camera.position.z = 50
        this.camera.position.x = -50
        this.camera.position.y = 70        

        this.scene.add(this.camera)

        //CONTROLS
        this.controls = new OrbitControls(this.camera, this.canvas)
        this.controls.enableDamping = true
        this.controls.target = new THREE.Vector3(0,25,0);
        this.controls.maxDistance = 100
        this.controls.minDistance = 80
        //EVENTS
        this.canvas.addEventListener('pointermove', this.onPointerMove);

        //POSTPROCESSING
        this.composer = postprocessing(this.renderer,this.scene, this.camera);
   
        //SHADOW
        this.cShadow = new ContrastShadow(this.scene, this.renderer, this);

        //RENDER
        this.renderLoop();
    }

    renderLoop() {

        this.renderer.setAnimationLoop((ts) => {
           
            this.elapsedTime = this.clock.getElapsedTime()
            const getDelta = this.clock.getDelta();
            // Update controls
            this.controls.update();

            // update the picking ray with the camera and pointer position
            this.raycaster.setFromCamera(this.pointer, this.camera);
            const intersects = this.raycaster.intersectObjects([this.sphereBox]);
           
            if(intersects.length > 0 ){
                for (let i = 0; i < intersects.length; i++) {
                    this.helpBoxMesh.position.lerpVectors(intersects[i].point, this.helpBoxMesh.position, 0.95); 
                }
            }else{
    
                const vTemp = new THREE.Vector3();
                this.curve.getPointAt(Math.abs(Math.sin(this.elapsedTime * 0.05)), vTemp); 

                this.helpBoxMesh.position.lerpVectors(vTemp,this.helpBoxMesh.position, 0.95); 
            }
                     
            this.updateInstanceLogic(this.helpBoxMesh);

            // Render        
            this.cShadow.renderLoop();
            //this.renderer.render( this.scene, this.camera );   
            this.composer.render();                      
        })
    }

    onPointerMove = (event) => {

        // calculate pointer position in normalized device coordinates
        // (-1 to +1) for both components

        this.pointer.x = (event.clientX / this.sizes.width) * 2 - 1;
        this.pointer.y = - (event.clientY / this.sizes.height) * 2 + 1;

    }

    updateInstanceLogic(pointer) {
        const count = this.meshCell.count;
        for (let index = 0; index < count; index++) {

            let TempMatrix = new THREE.Matrix4();
            let matrixPositionCell = new THREE.Matrix4();
            this.meshCell.getMatrixAt(index, matrixPositionCell);

            let positionCell = new THREE.Vector3();
            let quaternionCell = new THREE.Quaternion();
            let scaleCell = new THREE.Vector3();
            matrixPositionCell.decompose(positionCell, quaternionCell, scaleCell);
            let dist = positionCell.distanceTo(pointer.position);
            
            let nd = 10 * this.perlin.get3(new Vector3(positionCell.y + this.elapsedTime * 0.1, positionCell.x + this.elapsedTime * 0.1, this.elapsedTime * 0.1  + 0.5)) 
            let perlinDistFactor = (20 + nd);
            if (dist < perlinDistFactor) {
                const t = dist / perlinDistFactor;
                const s = THREE.MathUtils.lerp(10, 1, t)

                TempMatrix.compose(positionCell, quaternionCell, new Vector3(s, s, s))
                //TempMatrix.compose(positionCell, quaternionCell, new Vector3(1, 1,1))

                //Color
                const nColor = new THREE.Color().lerpColors(this.orange, this.white, t * t * t);
                this.meshCell.setColorAt(index, nColor);               
            } else {
                TempMatrix.compose(positionCell, quaternionCell, new Vector3(0.1, 0.1, 0.1)) //Скейлим для того что бы єти сферы не были видны при АО
                //Color
                this.meshCell.setColorAt(index, this.white);               
            }
            this.meshCell.setMatrixAt(index, TempMatrix);
        }
        this.meshCell.instanceMatrix.needsUpdate = true;
        this.meshCell.instanceColor.needsUpdate = true;
    }

    addLight = () => {
        const light = new THREE.PointLight(0xefffef, 0.3);
        light.position.z = 100;
        light.position.y = 500;
        light.position.x = - 100;
        this.scene.add(light);

        const light2 = new THREE.PointLight(0xffefef, 0.3);
        light2.position.z = 10;
        light2.position.x = 500;
        light2.position.y = 500;
        this.scene.add(light2);

        const light3 = new THREE.PointLight(0xefefff, 0.3);
        light3.position.z = 500;
        light3.position.x = 100;
        light3.position.y = 100;
        this.scene.add(light3);

        const hemiLight = new THREE.HemisphereLight(0xffffff, 0xffffff, 0.4);
        hemiLight.color.setHSL(0.6, 1, 0.6);
        hemiLight.groundColor.setHSL(0.095, 1, 0.75);
        hemiLight.position.set(0, 50, 0);
        this.scene.add(hemiLight);

        // const hemiLightHelper = new THREE.HemisphereLightHelper( hemiLight, 10 );
        // this.scene.add( hemiLightHelper );

    }

    addModel = () => {

        this.addBOXforRayCast();
        this.addCylinderInstancedMeshforGRID();
        this.addSphereInstancedMesh();
        this.addStudio();
        this.addCurva()

    }

    addStudio = () => {
        this.geometryPlane = new THREE.PlaneGeometry(1000,1000);
        this.geometryPlane.translate(0, 0, -100)
        this.materialPlane = new THREE.MeshBasicMaterial({ color: this.white, side: THREE.FrontSide, wireframe: false });
        this.spherePlane = new THREE.Mesh(this.geometryPlane, this.materialPlane);
        this.spherePlane.visible = true
        this.spherePlane.layers.mask = 1;
        this.spherePlane.name = "noAO";
        //this.scene.add(this.spherePlane);

        const GLTFLoader = new THREE_GLTFLoader();
        GLTFLoader.load(studioGLTF, (obj) => {


            this.studioModel = obj.scene.children[0];
            this.studioModel.geometry.scale(1000,1000,1000);
            this.studioModel.geometry.translate(850,-9,1)

            this.studioModel.layers.mask = 1;
            this.studioModel.name = "noAO";
            //this.scene.add( this.studioModel);
        });          
                  
    }


    addBOXforRayCast = () => {
        //BOX for RayCast
        this.geometryBox = new THREE.BoxGeometry(10 * this.offset, 10 * this.offset, 10 * this.offset, 1, 1, 1);
        this.geometryBox.translate(0, 35, 0)
        this.materialBox = new THREE.MeshBasicMaterial({ color: this.blue, side: THREE.FrontSide, wireframe: true });
        this.sphereBox = new THREE.Mesh(this.geometryBox, this.materialBox);
        this.sphereBox.visible = false
        this.sphereBox.layers.mask = 1;
        this.scene.add(this.sphereBox);
    }
 

    addSphereInstancedMesh = () => {
        //InstancedMesh
        const cell = 10;

        this.geometryPosition = new THREE.BoxGeometry(5 * this.offset, 10 * this.offset, 10 * this.offset, 1, 1, 1);
        this.geometryInstancedSphere = new THREE.SphereGeometry(0.5, 32, 16)
        this.materialInstancedSphere = new THREE.MeshStandardMaterial(
            {
                color: this.white,
                side: THREE.FrontSide,
                wireframe: false,
                roughness: 0.0,
                metalness: 0.0,
                envMapIntensity: 1.0
            });

        this.meshCell = new THREE.InstancedMesh(this.geometryInstancedSphere, 
            this.materialInstancedSphere, 
            602);
        //эти сферы не будут отображаться при АО
        this.meshCell_SAO = new THREE.InstancedMesh(this.geometryInstancedSphere, 
            this.materialInstancedSphere, 
            602 );
        
        
        this.meshCell.layers.mask = 1;
        this.meshCell.name = "sphere";
       
        this.meshCell_SAO.layers.mask = 1;
        this.meshCell_SAO.name = "noAO";    

        let xCell = 10;
        let yCell = 10;
        let zCell = 10;

        let index = 0;

        for (let iX = 0; iX <= xCell; iX++) {
            for (let iY = 0; iY <= yCell; iY++) {
                for (let iZ = 0; iZ <= zCell; iZ++) {

                    //Color
                    this.meshCell.setColorAt(index, this.white);
                    this.meshCell_SAO.setColorAt(index, this.white);


                    //Position 
                    if (iZ != 0 && iZ != 10) {
                        if (iX != 0 && iX != 10 && iY != 0 && iY != 10) {
                            continue;
                        }
                    }


                    let matrixPositionCell = new THREE.Matrix4();
                    matrixPositionCell.identity();
                    matrixPositionCell.makeTranslation(
                        (iX * this.offset) - xCell * this.offset * 0.5,
                        (iY * this.offset) + xCell,
                        (iZ * this.offset) - zCell * this.offset * 0.5);
                    this.meshCell.setMatrixAt(index, matrixPositionCell);
                    this.meshCell_SAO.setMatrixAt(index, matrixPositionCell);

                    index++;
                }
            }
        }

        this.meshCell.instanceColor.needsUpdate = true;
        this.meshCell.instanceMatrix.needsUpdate = true;

        this.meshCell.material.envMap = this.newEnvMap.texture;
        this.meshCell.material.needsUpdate = true;
        this.meshCell.needsUpdate = true;       

        this.scene.add(this.meshCell);
        this.scene.add(this.meshCell_SAO);

        // const size = 10;
        // const divisions = 10;

        // const gridHelper = new THREE.GridHelper(size, divisions);
        // this.scene.add(gridHelper);

    }
    
    addCylinderInstancedMeshforGRID = () => {
        //CylinderInstancedMesh for GRID
        this.geometryCylinder = new THREE.CylinderGeometry(0.1, 0.1, 50, 4);
        this.geometryCylinder.translate(0, 25, 0)
        this.materialCylinder = new THREE.MeshStandardMaterial(
            {
                color: this.white,
                side: THREE.FrontSide,
                wireframe: false,
                roughness: 0.0,
                metalness: 0.0,
                envMapIntensity: 1.0
            });
        this.cylinderCell = new THREE.InstancedMesh(this.geometryCylinder, this.materialCylinder, (11 * 12 ));
        this.cylinderCell.layers.mask = 1;
        this.cylinderCell.name = "noAO";
        
        this.indexCylinderCell = 0;

        const xCellcylinder = 11;
        const yCellcylinder = 11;
        const zCellcylinder = 11;  
        
        this.gridBuilder(xCellcylinder, 1, 1 , 0 ,new THREE.Vector3(0, 0, 1), - 25 , 10, 25);
        this.gridBuilder(1, yCellcylinder, 1 , Math.PI / 2 ,new THREE.Vector3(0, 0, 1),  25 , 10 , 25);

        this.gridBuilder(xCellcylinder, 1, 1 , 0 ,new THREE.Vector3(0, 0, 1) , - 25 , 10, -25);
        this.gridBuilder(1, yCellcylinder, 1 , Math.PI / 2 ,new THREE.Vector3(0, 0, 1),  25 , 10 , -25);

        this.gridBuilder(1, 1, xCellcylinder , 0 ,new THREE.Vector3(1, 0, 0), - 25 , 10, -25);
        this.gridBuilder(1, yCellcylinder, 1 , Math.PI / 2 , new THREE.Vector3(1, 0, 0),  -25 , 10 , -25);

        this.gridBuilder(1, 1, xCellcylinder , 0 ,new THREE.Vector3(1, 0, 0),  25 , 10, -25);
        this.gridBuilder(1, yCellcylinder, 1 , Math.PI / 2 , new THREE.Vector3(1, 0, 0),  25 , 10 , -25);

        this.gridBuilder(1, 1, zCellcylinder , Math.PI / 2 ,new THREE.Vector3(0, 0, 1),  25 , 10, -25);
        this.gridBuilder(zCellcylinder, 1, 1 , Math.PI / 2  ,new THREE.Vector3(1, 0, 0),  -25 , 10, -25);

        this.gridBuilder(1, 1, zCellcylinder , Math.PI / 2 ,new THREE.Vector3(0, 0, 1),  25 , 60, -25);
        this.gridBuilder(zCellcylinder, 1, 1 , Math.PI / 2  ,new THREE.Vector3(1, 0, 0),  -25 , 60, -25);

   
        this.cylinderCell.instanceMatrix.needsUpdate = true;
        this.cylinderCell.needsUpdate = true;
       
        this.scene.add(this.cylinderCell);
    }

    gridBuilder(xCell, yCell, zCell, angle , axis , mXCell , mYCell, mZCell){

        const xCellcylinder = xCell;
        const yCellcylinder = yCell;
        const zCellcylinder = zCell;

        for (let i = 0; i < xCellcylinder; i++) {

            for (let j = 0; j < yCellcylinder; j++) {

                for (let k = 0; k < zCellcylinder; k++) {

            let matrixPositionCell = new THREE.Matrix4();
            matrixPositionCell.identity();
            matrixPositionCell.compose(new THREE.Vector3(
                    (i * this.offset) +  mXCell,
                    (j * this.offset) +  mYCell,
                    (k * this.offset) +  mZCell),
                   
                    new THREE.Quaternion().setFromAxisAngle(axis, angle),
                    new THREE.Vector3(1, 1, 1));                  

            this.cylinderCell.setMatrixAt(this.indexCylinderCell, matrixPositionCell);

            this.indexCylinderCell++;

                }
           }
        }      
    }

    addCurva(){
                //Create a closed wavey loop
        this.curve = new THREE.CatmullRomCurve3( [
            new THREE.Vector3( -25, 10, 25),
            new THREE.Vector3( 25, 10, -25 ),
            new THREE.Vector3( 25, 60, 25 ),
            new THREE.Vector3( -25, 10, 25 ),
            new THREE.Vector3( -25, 60, -25 ),
            new THREE.Vector3( 25, 10, 25 ),
            new THREE.Vector3( -25, 60, 25 ),
            new THREE.Vector3(  25, 60, -25 ),
            new THREE.Vector3( -25, 10, 25 )
        ] );

        const points =  this.curve.getPoints( 50 );
        const geometry = new THREE.BufferGeometry().setFromPoints( points );

        const material = new THREE.LineBasicMaterial( { color: 0xff0000 } );

        // Create the final object to add to the scene
        this.curveObject = new THREE.Line( geometry, material );
     

       // this.scene.add(this.curveObject) 
        
        // const curvePath = new THREE.CurvePath();
        // curvePath.add(curve);


    }
  
}
new Sketch();
