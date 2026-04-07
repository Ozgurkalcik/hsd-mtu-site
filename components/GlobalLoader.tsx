'use client'

import { useEffect, useState } from 'react'
import { motion, AnimatePresence } from 'motion/react'
import Image from 'next/image'
import './GlobalLoader.css'

const VANILLA_WEBGL_HTML = `
<canvas id="gl-loader-canvas" style="position: absolute; top: 0; left: 0; width: 100%; height: 100%; pointer-events: none; z-index: 1;"></canvas>
<script>
(function() {
    var canvas = document.getElementById('gl-loader-canvas');
    if (!canvas) return;
    var gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return;
    
    var pid = gl.createProgram();
    function createShader(type, source) {
        var s = gl.createShader(type);
        gl.shaderSource(s, source);
        gl.compileShader(s);
        gl.attachShader(pid, s);
    }
    
    createShader(gl.VERTEX_SHADER, 'attribute vec2 p; void main() { gl_Position = vec4(p, 0.0, 1.0); }');
    createShader(gl.FRAGMENT_SHADER, \`
precision highp float;
uniform float uTime;
uniform vec3 uResolution;

float wavePulse(float dist, float birthTime) {
    float cycle = 8.0;
    float t = mod(uTime - birthTime, cycle);
    if (t > 3.5) return 0.0;
    
    float speed  = 1.0;
    float front  = t * speed;
    float behind = dist - front;
    if (behind > 0.08) return 0.0;
    
    float wavelength = 0.18;
    float ripple = sin(behind / wavelength * 6.2832);
    float envelope = exp(behind * 5.0);
    float ageFade = smoothstep(4.0, 0.0, front);
    
    return ripple * envelope * ageFade;
}

void main() {
    vec2 fragCoord = gl_FragCoord.xy;
    vec2 pos = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);
    float dist = length(pos);
    vec2 dir = dist > 0.001 ? pos / dist : vec2(0.0);
    
    float w1 = wavePulse(dist, 0.0);
    float w2 = wavePulse(dist, 1.2);
    float wave = w1 + w2;
    
    float refractionStrength = 0.15;
    vec2 offset = dir * wave * refractionStrength;
    vec2 refractedPos = pos + offset;
    
    vec3 bgDark = vec3(0.012, 0.012, 0.022);
    
    vec2 gp = fract(refractedPos * 6.0) - 0.5;
    float gridLine = smoothstep(0.46, 0.49, abs(gp.x)) + smoothstep(0.46, 0.49, abs(gp.y));
    gridLine = min(gridLine, 1.0);
    
    // Dengeli orta ton arka plan kırmızısı (Ne çok neon, ne çok soluk)
    bgDark += vec3(0.18, 0.04, 0.05) * gridLine * 0.4;
    bgDark += vec3(0.06, 0.005, 0.01) * exp(-dist * dist * 2.0);
    
    vec3 finalColor = bgDark;
    
    float absWave = abs(wave);
    
    // Dalgaların kırmızısı zarif ve zengin bir "kırmızı şarap/yakut" tonunda
    vec3 waveEdge = vec3(0.55, 0.05, 0.08) * smoothstep(0.15, 0.6, absWave) * 0.8;
    waveEdge += vec3(0.8, 0.15, 0.12) * pow(absWave, 4.0) * 0.4;
    finalColor += waveEdge;
    
    finalColor *= smoothstep(2.8, 0.2, dist);
    gl_FragColor = vec4(finalColor, 1.0);
}
    \`);
    
    gl.linkProgram(pid);
    gl.useProgram(pid);
    
    var p = gl.getAttribLocation(pid, 'p');
    gl.bindBuffer(gl.ARRAY_BUFFER, gl.createBuffer());
    gl.bufferData(gl.ARRAY_BUFFER, new Float32Array([-1,-1, 1,-1, -1,1, -1,1, 1,-1, 1,1]), gl.STATIC_DRAW);
    gl.enableVertexAttribArray(p);
    gl.vertexAttribPointer(p, 2, gl.FLOAT, false, 0, 0);
    
    var uTime = gl.getUniformLocation(pid, 'uTime');
    var uRes = gl.getUniformLocation(pid, 'uResolution');
    var start = Date.now();
    
    function draw() {
        var canvasActive = document.getElementById('gl-loader-canvas');
        if (!canvasActive) return;
        
        var dpr = window.devicePixelRatio || 1;
        var w = canvasActive.offsetWidth * dpr;
        var h = canvasActive.offsetHeight * dpr;
        
        if (canvas.width !== w || canvas.height !== h) {
            canvas.width = w; canvas.height = h;
            gl.viewport(0, 0, w, h);
        }
        
        gl.uniform3f(uRes, canvas.width, canvas.height, canvas.width / canvas.height);
        gl.uniform1f(uTime, (Date.now() - start) * 0.001);
        
        gl.drawArrays(gl.TRIANGLES, 0, 6);
        requestAnimationFrame(draw);
    }
    requestAnimationFrame(draw);
})();
</script>
`;

function ShaderWavesCanvas() {
    return <div suppressHydrationWarning={true} dangerouslySetInnerHTML={{ __html: VANILLA_WEBGL_HTML }} />;
}

export default function GlobalLoader() {
    const [isLoading, setIsLoading] = useState(true)
    const [isExiting, setIsExiting] = useState(false)

    useEffect(() => {
        if (!isLoading) return;

        const finishLoading = () => {
            setTimeout(() => {
                setIsLoading(false)
                setIsExiting(true)
            }, 1000)
        }

        if (document.readyState === 'complete') {
            finishLoading()
        } else {
            window.addEventListener('load', finishLoading)
            const fallback = setTimeout(finishLoading, 12000)

            return () => {
                window.removeEventListener('load', finishLoading)
                clearTimeout(fallback)
            }
        }
    }, [isLoading])

    return (
        <>
            {(isLoading || isExiting) && (
                <style dangerouslySetInnerHTML={{ __html: `
                    body { overflow: hidden !important; }
                `}} />
            )}

            <AnimatePresence onExitComplete={() => setIsExiting(false)}>
                {isLoading && (
                    <motion.div
                        className="global-loader-overlay"
                        initial={{ opacity: 1 }}
                        exit={{ opacity: 0 }}
                        transition={{ duration: 1.2, ease: [0.2, 0.4, 0.3, 1] }} 
                    >
                        {/* WebGL FİZİK MOTORU ARKA PLANI */}
                        <ShaderWavesCanvas />

                        <div className="global-loader-center">
                            {/* Merkezdeki Dev Logo */}
                            <div className="global-loader-logo-wrapper">
                                <Image
                                    src="/images/hsd-logo-white.png"
                                    alt="HSD Logo"
                                    width={400}
                                    height={200}
                                    priority
                                    className="global-loader-logo"
                                    style={{ width: '100%', height: 'auto', objectFit: 'contain' }}
                                />
                            </div>
                        </div>
                    </motion.div>
                )}
            </AnimatePresence>
        </>
    )
}
