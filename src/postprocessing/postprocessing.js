import {	
	Vector2,	
} from 'three';
import { EffectComposer } from "three/examples/jsm/postprocessing/EffectComposer.js";
import { RenderPass } from 'three/examples/jsm/postprocessing/RenderPass.js';
import { SAOPass } from './SAOPass.js';
import { SSAOPass } from './SSAOPass.js';

export function postprocessing(renderer,scene,camera){

        //post processing
        let composer = new EffectComposer(renderer);
        let renderPass = new RenderPass(scene, camera);
        composer.addPass(renderPass);
        let renderSize = new Vector2( 256, 256 )
    

        let saoPass = new SAOPass(scene, camera, true , true , renderSize);//scene, camera, useDepthTexture = false, useNormals = false, resolution = new Vector2( 256, 256 )
        composer.addPass(saoPass);

        saoPass.params = {
            output: 0,
            saoBias: 5.1,
            saoIntensity: 0.6,
            saoScale: 100,
            saoKernelRadius: 100,
            saoMinResolution: 0.0,
            saoBlur: true,
            saoBlurRadius: 16,
            saoBlurStdDev: 8,
            saoBlurDepthCutoff: 0.1
        };



		// const width = window.innerWidth * 0.5;
		// const height = window.innerHeight * 0.5;
        // let ssaoPass = new SSAOPass( scene, camera, width, height)       
        // ssaoPass.kernelRadius = 16;
		// ssaoPass.kernelSize = 64;	
		// ssaoPass.output = 2;
        // composer.addPass(ssaoPass);
        
       
        return composer;        
}

