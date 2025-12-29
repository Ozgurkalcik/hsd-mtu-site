'use client';
import React, { useRef, useEffect } from 'react';
import { Renderer, Program, Mesh, Triangle } from 'ogl';
import { useFrozen } from '../FrozenSection';

import './LiquidChrome.css';

interface LiquidChromeProps extends React.HTMLAttributes<HTMLDivElement> {
    baseColor?: [number, number, number];
    speed?: number;
    amplitude?: number;
    frequencyX?: number;
    frequencyY?: number;
    interactive?: boolean;
}

export const LiquidChrome: React.FC<LiquidChromeProps> = ({
    baseColor = [0.1, 0.1, 0.1],
    speed = 0.2,
    amplitude = 0.5,
    frequencyX = 3,
    frequencyY = 2,
    interactive = true,
    ...props
}) => {
    const containerRef = useRef<HTMLDivElement | null>(null);
    const isPausedRef = useRef<boolean>(true);
    const isFrozen = useFrozen(); // Correct placement: Top level

    useEffect(() => {
        if (!containerRef.current) return;

        const container = containerRef.current;

        // Intersection Observer to pause when not visible
        const observer = new IntersectionObserver(
            (entries) => {
                entries.forEach((entry) => {
                    isPausedRef.current = !entry.isIntersecting;
                });
            },
            { threshold: 0.1 }
        );
        observer.observe(container);

        const renderer = new Renderer({ antialias: true, alpha: true });
        const gl = renderer.gl;
        gl.clearColor(0, 0, 0, 0);

        const vertexShader = `
      attribute vec2 position;
      attribute vec2 uv;
      varying vec2 vUv;
      void main() {
        vUv = uv;
        gl_Position = vec4(position, 0.0, 1.0);
      }
    `;

        const fragmentShader = `
      precision highp float;
      uniform float uTime;
      uniform vec3 uResolution;
      uniform vec3 uBaseColor;
      uniform float uAmplitude;
      uniform float uFrequencyX;
      uniform float uFrequencyY;
      uniform vec2 uMouse;
      varying vec2 vUv;

      vec4 renderImage(vec2 uvCoord) {
          vec2 fragCoord = uvCoord * uResolution.xy;
          vec2 uv = (2.0 * fragCoord - uResolution.xy) / min(uResolution.x, uResolution.y);

          // Optimized: Reduced iterations from 10 to 5 for performance
          for (float i = 1.0; i < 5.0; i++){
              uv.x += uAmplitude / i * cos(i * uFrequencyX * uv.y + uTime + uMouse.x * 3.14159);
              uv.y += uAmplitude / i * cos(i * uFrequencyY * uv.x + uTime + uMouse.y * 3.14159);
          }

          vec2 diff = (uvCoord - uMouse);
          float dist = length(diff);
          float falloff = exp(-dist * 20.0);
          float ripple = sin(10.0 * dist - uTime * 2.0) * 0.03;
          uv += (diff / (dist + 0.0001)) * ripple * falloff;

          vec3 color = uBaseColor / abs(sin(uTime - uv.y - uv.x));
          return vec4(color, 1.0);
      }

      void main() {
          gl_FragColor = renderImage(vUv);
      }
    `;

        const geometry = new Triangle(gl);
        const program = new Program(gl, {
            vertex: vertexShader,
            fragment: fragmentShader,
            uniforms: {
                uTime: { value: 0 },
                uResolution: {
                    value: new Float32Array([gl.canvas.width, gl.canvas.height, gl.canvas.width / gl.canvas.height])
                },
                uBaseColor: { value: new Float32Array(baseColor) },
                uAmplitude: { value: amplitude },
                uFrequencyX: { value: frequencyX },
                uFrequencyY: { value: frequencyY },
                uMouse: { value: new Float32Array([0, 0]) }
            },
            transparent: true
        });
        const mesh = new Mesh(gl, { geometry, program });

        function resize() {
            if (!container) return;
            const scale = 0.5; // Lower resolution for performance
            // Optimize: Set correct logical size but keep internal resolution low (1.0 dpr max)
            const dpr = Math.min(window.devicePixelRatio, 1);
            renderer.setSize(container.offsetWidth * scale, container.offsetHeight * scale);

            // Set display size to fill container
            gl.canvas.style.width = '100%';
            gl.canvas.style.height = '100%';

            const resUniform = program.uniforms.uResolution.value as Float32Array;
            resUniform[0] = gl.canvas.width;
            resUniform[1] = gl.canvas.height;
            resUniform[2] = gl.canvas.width / gl.canvas.height;
        }
        let resizeTimeout: ReturnType<typeof setTimeout>;
        const handleResize = () => {
            // Debounce resize
            clearTimeout(resizeTimeout);
            resizeTimeout = setTimeout(() => {
                resize();
            }, 200);
        };
        window.addEventListener('resize', handleResize);
        resize(); // Initial call

        function handleMouseMove(event: MouseEvent) {
            const rect = container.getBoundingClientRect();
            const x = (event.clientX - rect.left) / rect.width;
            const y = 1 - (event.clientY - rect.top) / rect.height;
            const mouseUniform = program.uniforms.uMouse.value as Float32Array;
            mouseUniform[0] = x;
            mouseUniform[1] = y;
        }

        function handleTouchMove(event: TouchEvent) {
            if (event.touches.length > 0) {
                const touch = event.touches[0];
                const rect = container.getBoundingClientRect();
                const x = (touch.clientX - rect.left) / rect.width;
                const y = 1 - (touch.clientY - rect.top) / rect.height;
                const mouseUniform = program.uniforms.uMouse.value as Float32Array;
                mouseUniform[0] = x;
                mouseUniform[1] = y;
            }
        }

        if (interactive) {
            container.addEventListener('mousemove', handleMouseMove);
            container.addEventListener('touchmove', handleTouchMove);
        }

        let animationId: number;
        function update(t: number) {
            // Stop loop if document is hidden, paused by intersection, OR frozen by viewport optimization
            if (document.hidden || isPausedRef.current || isFrozen) {
                // do nothing
            } else {
                program.uniforms.uTime.value = t * 0.001 * speed;
                renderer.render({ scene: mesh });
            }
            animationId = requestAnimationFrame(update);
        }
        animationId = requestAnimationFrame(update);

        container.appendChild(gl.canvas);

        return () => {
            cancelAnimationFrame(animationId);
            observer.disconnect();
            window.removeEventListener('resize', handleResize);
            clearTimeout(resizeTimeout);
            if (interactive) {
                container.removeEventListener('mousemove', handleMouseMove);
                container.removeEventListener('touchmove', handleTouchMove);
            }
            if (gl.canvas.parentElement) {
                gl.canvas.parentElement.removeChild(gl.canvas);
            }
            gl.getExtension('WEBGL_lose_context')?.loseContext();
        };
    }, [baseColor, speed, amplitude, frequencyX, frequencyY, interactive, isFrozen]);

    return <div ref={containerRef} className="liquidChrome-container" {...props} />;
};

export default React.memo(LiquidChrome);
