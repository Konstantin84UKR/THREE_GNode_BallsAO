// import './style.css'
import * as THREE from 'three'
import { Vector3 } from 'three';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js'

// Canvas
const canvas = document.querySelector('canvas.webgl')

// Scene
const scene = new THREE.Scene()

const raycaster = new THREE.Raycaster();
const pointer = new THREE.Vector2(0,-0.1);
let planeIntersect = new THREE.Vector3();



//Texture 

const textureloader = new THREE.TextureLoader();
const matCapTexture = textureloader.load("/MatCap/green.jpg")
const matCapTexture3 = textureloader.load("/MatCap/clay.jpg")

/**
 * Object
 */
//MeshMatcapMaterial



const geometryTorus = new THREE.TorusGeometry(7, 3, 16, 100);
// const geometryTorus = new THREE.TorusKnotGeometry(10, 3, 100, 16);
// const geometryTorus = new THREE.BoxGeometry(20,20, 20);
const materialTorus = new THREE.MeshBasicMaterial({ color: 0x008800, side: THREE.DoubleSide });
const torus = new THREE.Mesh(geometryTorus, materialTorus);
torus.geometry.computeBoundingBox();
torus.name = "torus";
scene.add(torus);

// const box = new THREE.Box3();
// box.copy(torus.geometry.boundingBox).applyMatrix4(torus.matrixWorld);

// const helper = new THREE.Box3Helper(box, 0xffff00);
// scene.add(helper);



//box
let legoGridSize = 20;
const geometryBox2 = new THREE.BoxGeometry(0.9, 0.9, 0.9);
const materialBox2 = new THREE.MeshMatcapMaterial({ color: 0xffffff, wireframe: false, matcap: matCapTexture3 });


let groupLego = new THREE.Group();

for (let x = 0; x < legoGridSize; x++) {

    for (let y = 0; y < legoGridSize; y++) {

        for (let z = 0; z < legoGridSize; z++) {
            // const geometryBox2 = new THREE.BoxGeometry(0.9, 0.9, 0.9);
            // const materialBox2 = new THREE.MeshMatcapMaterial({ color: 0xffffff, wireframe: false, matcap: matCapTexture3 });
            const cube2 = new THREE.Mesh(geometryBox2, materialBox2);
            cube2.position.set(x-9.5, y-9.5, z-9.5);
            groupLego.add(cube2);
            // cube2.visible = false

        }
    }
}
scene.add(groupLego);
// updateLego();

///
const plane = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
scene.add(plane)

const size = 10;
const divisions = 10;

const gridHelper = new THREE.GridHelper(size, divisions);
scene.add(gridHelper);




/**
 * Sizes
 */
const sizes = {
    width: window.innerWidth, //
    height: window.innerHeight //
}

/**
 * Camera
 */
const camera = new THREE.PerspectiveCamera(75, sizes.width / sizes.height)
camera.position.z = 120
scene.add(camera)

// Controls
const controls = new OrbitControls(camera, canvas)
// controls.target.y = 2
controls.enableDamping = true

canvas.addEventListener('pointermove', onPointerMove);

// Renderer
const renderer = new THREE.WebGLRenderer({
    canvas: canvas,
    antialias : true
})
renderer.setSize(sizes.width, sizes.height)

// Animate
const clock = new THREE.Clock()

const tick = () => {
    const elapsedTime = clock.getElapsedTime()

    // Update controls
    controls.update()

    // update the picking ray with the camera and pointer position
    // torus.rotateX(elapsedTime * 0.1)
    // updateLego();
    // }

    // Render
    renderer.render(scene, camera)
    

    // Call tick again on the next frame
    window.requestAnimationFrame(tick)
}

tick()


function onPointerMove(event) {

    // calculate pointer position in normalized device coordinates
    // (-1 to +1) for both components

    pointer.x = (event.clientX / sizes.width) * 2 - 1;
    pointer.y = - (event.clientY / sizes.height) * 2 + 1;

}

function updateLego() {
    
    //box
    // torus.geometry.rotateX(Math.PI * 0.25)
    torus.geometry.rotateY(Math.PI * 0.25)
    torus.geometry.computeBoundingBox();

    const box = new THREE.Box3();
    box.copy(torus.geometry.boundingBox).applyMatrix4(torus.matrixWorld);

    const helper = new THREE.Box3Helper(box, 0xffff00);
    scene.add(helper);

    let boundingX = torus.geometry.boundingBox.min.x;
    let boundingY = torus.geometry.boundingBox.min.y;
    let boundingZ = torus.geometry.boundingBox.min.z;


    let lX = torus.geometry.boundingBox.max.x - torus.geometry.boundingBox.min.x;
    let lY = torus.geometry.boundingBox.max.y - torus.geometry.boundingBox.min.y;
    let lZ = torus.geometry.boundingBox.max.z - torus.geometry.boundingBox.min.z;

    let cell = 12
    let stepX = lX / cell;




    ///

    let sizeLego = 6;
    let stepZ = Math.floor(lZ / sizeLego);


    for (let i = 0; i < cell; i++) {

        for (let j = 0; j < cell; j++) {

            let origin = new Vector3(boundingX + stepX * i + sizeLego, boundingY + stepX * j + sizeLego, boundingZ + 200);
            let target = new Vector3(0, 0, -1);


            raycaster.set(origin, target);

            const intersects = raycaster.intersectObject(torus);

            if (intersects.length > 0) {
                console.log(intersects[0].object.name);

                let lineLength = Math.abs(intersects[0].point.z - intersects[1].point.z);

                for (let index = 0; index < lineLength; index = index + stepX) {
                    let s = 0.90;
                    const geometryBox = new THREE.BoxGeometry(sizeLego * s, sizeLego * s, sizeLego * s);
                    const materialBox = new THREE.MeshMatcapMaterial({ color: 0xffffff, wireframe: false, matcap: matCapTexture3 });
                    const cube = new THREE.Mesh(geometryBox, materialBox);
                    cube.position.set(intersects[0].point.x, intersects[0].point.y, Math.floor(intersects[0].point.z) - index);
                    scene.add(cube);
                
                }


            }
        }


    }

    // for (let index = 0; index < lZ; index = index + 1) {

    //     const geometryBox2 = new THREE.BoxGeometry(sizeLego, sizeLego, sizeLego);
    //     const materialBox2 = new THREE.MeshBasicMaterial({ color: 0x000fff });
    //     const cube2 = new THREE.Mesh(geometryBox2, materialBox2);
    //     cube2.position.set(boundingX, boundingY, boundingZ + index);
    //     scene.add(cube2);
    // }

    torus.visible = false

}