'use client';
import { Renderer, Program, Mesh, Color, Triangle } from 'ogl';
import { useEffect, useRef, useState } from 'react';
import { useFrozen } from '../FrozenSection';

const vertexShader = `
attribute vec2 uv;
attribute vec2 position;

varying vec2 vUv;

void main() {
  vUv = uv;
  gl_Position = vec4(position, 0, 1);
}
`;

const fragmentShader = `
precision highp float;

uniform float uTime;
uniform vec3 uResolution;
uniform vec2 uFocal;
uniform vec2 uRotation;
uniform float uStarSpeed;
uniform float uDensity;
uniform float uHueShift;
uniform float uSpeed;
uniform vec2 uMouse;
uniform float uGlowIntensity;
uniform float uSaturation;
uniform bool uMouseRepulsion;
uniform float uTwinkleIntensity;
uniform float uRotationSpeed;
uniform float uRepulsionStrength;
uniform float uMouseActiveFactor;
uniform float uAutoCenterRepulsion;
uniform bool uTransparent;

varying vec2 vUv;

#define NUM_LAYER 4.0
#define STAR_COLOR_CUTOFF 0.2
#define MAT45 mat2(0.7071, -0.7071, 0.7071, 0.7071)
#define PERIOD 3.0

float Hash21(vec2 p) {
  p = fract(p * vec2(123.34, 456.21));
  p += dot(p, p + 45.32);
  return fract(p.x * p.y);
}

float tri(float x) {
  return abs(fract(x) * 2.0 - 1.0);
}

float tris(float x) {
  float t = fract(x);
  return 1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0));
}

float trisn(float x) {
  float t = fract(x);
  return 2.0 * (1.0 - smoothstep(0.0, 1.0, abs(2.0 * t - 1.0))) - 1.0;
}

vec3 hsv2rgb(vec3 c) {
  vec4 K = vec4(1.0, 2.0 / 3.0, 1.0 / 3.0, 3.0);
  vec3 p = abs(fract(c.xxx + K.xyz) * 6.0 - K.www);
  return c.z * mix(K.xxx, clamp(p - K.xxx, 0.0, 1.0), c.y);
}

float Star(vec2 uv, float flare) {
  float d = length(uv);
  float m = (0.05 * uGlowIntensity) / d;
  float rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * flare * uGlowIntensity;
  uv *= MAT45;
  rays = smoothstep(0.0, 1.0, 1.0 - abs(uv.x * uv.y * 1000.0));
  m += rays * 0.3 * flare * uGlowIntensity;
  m *= smoothstep(1.0, 0.2, d);
  return m;
}

vec3 StarLayer(vec2 uv) {
  vec3 col = vec3(0.0);

  vec2 gv = fract(uv) - 0.5; 
  vec2 id = floor(uv);

  for (int y = -1; y <= 1; y++) {
    for (int x = -1; x <= 1; x++) {
      vec2 offs = vec2(float(x), float(y));
      float n = Hash21(id + offs);
      float size = fract(n * 456.32);
      vec2 starPos = gv - offs - (vec2(n, fract(n * 34.0)) - 0.5);

      if (uMouseRepulsion && uMouseActiveFactor > 0.01) {
        vec2 worldStarPos = (id + offs + 0.5 + (vec2(n, fract(n * 34.0)) - 0.5)) / uResolution.xy;
        vec2 toMouse = worldStarPos - uMouse;
        float dist = length(toMouse);
        float repulse = smoothstep(0.3, 0.0, dist) * uRepulsionStrength * uMouseActiveFactor;
        starPos += normalize(toMouse + 0.0001) * repulse * 0.3;
      }

      if (uAutoCenterRepulsion > 0.01) {
        vec2 worldStarPos = (id + offs + 0.5 + (vec2(n, fract(n * 34.0)) - 0.5)) / uResolution.xy;
        vec2 center = vec2(0.5);
        vec2 toCenter = worldStarPos - center;
        float dist = length(toCenter);
        float repulse = smoothstep(0.3, 0.0, dist) * uAutoCenterRepulsion;
        starPos += normalize(toCenter + 0.0001) * repulse * 0.3;
      }

      float twinkle = 1.0;
      if (uTwinkleIntensity > 0.0) {
        float twinkleSpeed = fract(n * 789.123) * 2.0 + 1.0;
        twinkle = 1.0 - uTwinkleIntensity * 0.5 * (1.0 + sin(uTime * twinkleSpeed + n * 6.28));
      }

      float star = Star(starPos, smoothstep(0.7, 1.0, size)) * twinkle;
      float hue = fract(n * 234.45 + uHueShift / 360.0);
      vec3 color = hsv2rgb(vec3(hue, uSaturation, 1.0));
      col += star * size * color;
    }
  }

  return col;
}

void main() {
  vec2 fragCoord = vUv * uResolution.xy;
  vec2 uv = (fragCoord - 0.5 * uResolution.xy) / uResolution.y;

  vec2 M = (uFocal.xy - uResolution.xy * 0.5) / uResolution.y;
  float t = uStarSpeed;

  uv *= uRotation;
  float rotAngle = uRotationSpeed * uTime * 0.1;
  mat2 rotMat = mat2(cos(rotAngle), -sin(rotAngle), sin(rotAngle), cos(rotAngle));
  uv *= rotMat;

  vec3 col = vec3(0.0);

  for (float i = 0.0; i < 1.0; i += 1.0 / NUM_LAYER) {
    float depth = fract(i + t);
    float scale = mix(20.0, 0.5, depth) * uDensity;
    float fade = depth * smoothstep(1.0, 0.9, depth);
    col += StarLayer(uv * scale + i * 453.2 - M) * fade;
  }

  if (uTransparent) {
    float alpha = clamp(length(col), 0.0, 1.0);
    gl_FragColor = vec4(col, alpha);
  } else {
    gl_FragColor = vec4(col, 1.0);
  }
}
`;

interface GalaxyProps extends React.HTMLAttributes<HTMLDivElement> {
  focal?: [number, number];
  rotation?: [number, number];
  starSpeed?: number;
  density?: number;
  hueShift?: number;
  speed?: number;
  disableAnimation?: boolean;
  mouseInteraction?: boolean;
  glowIntensity?: number;
  saturation?: number;
  mouseRepulsion?: boolean;
  twinkleIntensity?: number;
  rotationSpeed?: number;
  repulsionStrength?: number;
  autoCenterRepulsion?: number;
  transparent?: boolean;
}

const DEFAULT_FOCAL: [number, number] = [1, 1];
const DEFAULT_ROTATION: [number, number] = [1, 1];

export default function Galaxy({
  focal = DEFAULT_FOCAL,
  rotation = DEFAULT_ROTATION,
  starSpeed = 0.5,
  density = 1,
  hueShift = 0,
  speed = 1,
  disableAnimation = false,
  mouseInteraction = true,
  glowIntensity = 0.5,
  saturation = 0.5,
  mouseRepulsion = false,
  twinkleIntensity = 0.3,
  rotationSpeed = 0.1,
  repulsionStrength = 2,
  autoCenterRepulsion = 0,
  transparent = false,
  ...rest
}: GalaxyProps) {
  const ctnDom = useRef<HTMLDivElement>(null);
  const isFrozen = useFrozen();
  const isFrozenRef = useRef(isFrozen);

  // Smart Loop State
  const [isVisible, setIsVisible] = useState(true);
  const isVisibleRef = useRef(isVisible);

  useEffect(() => {
    isVisibleRef.current = isVisible;
  }, [isVisible]);

  useEffect(() => {
    const handleVisibility = () => setIsVisible(!document.hidden);
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  // Keep isFrozen ref updated
  useEffect(() => {
    isFrozenRef.current = isFrozen;
  }, [isFrozen]);

  useEffect(() => {
    const ctn = ctnDom.current;
    if (!ctn) return;

    const renderer = new Renderer({ alpha: transparent, premultipliedAlpha: false });
    const gl = renderer.gl;
    gl.clearColor(0, 0, 0, 0);

    let animateId: number;

    const targetMousePos = { current: { x: 0.5, y: 0.5 } };
    const smoothMousePos = { current: { x: 0.5, y: 0.5 } };
    const targetMouseActive = { current: 0.0 };
    const smoothMouseActive = { current: 0.0 };

    function resize() {
      if (!ctn) return;
      const w = ctn.offsetWidth;
      const h = ctn.offsetHeight;
      renderer.setSize(w, h);
      program.uniforms.uResolution.value = new Color(w, h, w / h);
    }

    window.addEventListener('resize', resize);

    const geometry = new Triangle(gl);
    const program = new Program(gl, {
      vertex: vertexShader,
      fragment: fragmentShader,
      uniforms: {
        uTime: { value: 0 },
        uResolution: {
          value: new Color(ctn.offsetWidth, ctn.offsetHeight, ctn.offsetWidth / ctn.offsetHeight),
        },
        uFocal: { value: focal },
        uRotation: { value: rotation },
        uStarSpeed: { value: starSpeed },
        uDensity: { value: density },
        uHueShift: { value: hueShift },
        uSpeed: { value: speed },
        uMouse: { value: [0.5, 0.5] },
        uGlowIntensity: { value: glowIntensity },
        uSaturation: { value: saturation },
        uMouseRepulsion: { value: mouseRepulsion },
        uTwinkleIntensity: { value: twinkleIntensity },
        uRotationSpeed: { value: rotationSpeed },
        uRepulsionStrength: { value: repulsionStrength },
        uMouseActiveFactor: { value: 0.0 },
        uAutoCenterRepulsion: { value: autoCenterRepulsion },
        uTransparent: { value: transparent },
      },
    });

    const mesh = new Mesh(gl, { geometry, program });
    resize();

    function update(t: number) {
      if (!isFrozenRef.current && isVisibleRef.current) {
        if (!disableAnimation) {
          program.uniforms.uTime.value = t * 0.001 * speed;
          program.uniforms.uStarSpeed.value = (t * 0.001 * starSpeed) / 10.0;
        }

        const lerpFactor = 0.05;
        smoothMousePos.current.x += (targetMousePos.current.x - smoothMousePos.current.x) * lerpFactor;
        smoothMousePos.current.y += (targetMousePos.current.y - smoothMousePos.current.y) * lerpFactor;

        smoothMouseActive.current += (targetMouseActive.current - smoothMouseActive.current) * lerpFactor;

        program.uniforms.uMouse.value[0] = smoothMousePos.current.x;
        program.uniforms.uMouse.value[1] = smoothMousePos.current.y;
        program.uniforms.uMouseActiveFactor.value = smoothMouseActive.current;

        renderer.render({ scene: mesh });
      }
      animateId = requestAnimationFrame(update);
    }
    animateId = requestAnimationFrame(update);
    ctn.appendChild(gl.canvas);

    function handleMouseMove(e: MouseEvent) {
      const rect = ctn!.getBoundingClientRect();
      const x = (e.clientX - rect.left) / rect.width;
      const y = 1.0 - (e.clientY - rect.top) / rect.height;
      targetMousePos.current = { x, y };
      targetMouseActive.current = 1.0;
    }

    function handleMouseLeave() {
      targetMouseActive.current = 0.0;
    }

    if (mouseInteraction) {
      ctn.addEventListener('mousemove', handleMouseMove);
      ctn.addEventListener('mouseleave', handleMouseLeave);
    }

    return () => {
      cancelAnimationFrame(animateId);
      window.removeEventListener('resize', resize);
      if (mouseInteraction) {
        ctn.removeEventListener('mousemove', handleMouseMove);
        ctn.removeEventListener('mouseleave', handleMouseLeave);
      }
      if (ctn.contains(gl.canvas)) {
        ctn.removeChild(gl.canvas);
      }
      gl.getExtension('WEBGL_lose_context')?.loseContext();
    };
  }, [
    focal,
    rotation,
    starSpeed,
    density,
    hueShift,
    disableAnimation,
    speed,
    mouseInteraction,
    glowIntensity,
    saturation,
    mouseRepulsion,
    twinkleIntensity,
    rotationSpeed,
    repulsionStrength,
    autoCenterRepulsion,
    transparent
  ]);

  return <div ref={ctnDom} className="w-full h-full relative" {...rest} />;
}
