"use client";

import { useEffect, useState } from "react";
import styles from "./Hero.module.css";

interface Particle {
  id: number;
  left: string;
  animationDelay: string;
  animationDuration: string;
}

export default function Hero() {
  const [isLoaded, setIsLoaded] = useState(false);
  const [particles, setParticles] = useState<Particle[]>([]);

  useEffect(() => {
    setIsLoaded(true);

    // Generate 20 particles scattered randomly across screen (optimized for performance)
    const generatedParticles = Array.from({ length: 20 }).map((_, i) => {
      return {
        id: i,
        left: `${Math.random() * 100}%`,
        animationDelay: `${Math.random() * 15}s`, // Each starts at different time
        animationDuration: `${12 + Math.random() * 8}s`,
      };
    });
    setParticles(generatedParticles);
  }, []);

  return (
    <div className={styles.heroContainer}>
      {/* Corner Glowing Lights */}
      <div className={styles.cornerLight1} />
      <div className={styles.cornerLight2} />
      <div className={styles.cornerLight3} />
      <div className={styles.cornerLight4} />

      {/* Center Glowing Light */}
      <div className={styles.centerGlow} />

      {/* Animated Background Petals */}
      <div className={styles.petalsContainer}>
        {Array.from({ length: 9 }).map((_, i) => (
          <div
            key={i}
            className={`${styles.petal} ${styles[`petal${i + 1}`]} ${isLoaded ? styles.active : ""
              }`}
          />
        ))}
      </div>

      {/* Frosted Glass Overlay */}
      <div className={styles.glassOverlay} />

      {/* Particles Layer - Top most layer in hero */}
      <div className={styles.particlesLayer}>
        {particles.map((particle) => (
          <div
            key={particle.id}
            className={styles.sparkle}
            style={{
              left: particle.left,
              animationDelay: particle.animationDelay,
              animationDuration: particle.animationDuration,
            }}
          />
        ))}
      </div>

      {/* Content */}
      <div className={`${styles.content} ${isLoaded ? styles.contentVisible : ""}`}>
        <div className={styles.badge}>
          <span className={styles.badgeGlow}>HSD Community</span>
        </div>

        <h1 className={styles.title}>
          <span className={styles.titleMain}>Malatya Turgut Özal</span>
          <div className={styles.glassBox}>
            <span className={styles.titleSub}>
              <span className={styles.brandName}>Huawei</span> <span className={styles.studentDev}>Student Developer</span> <span className={styles.community}>Topluluğu</span>
            </span>
          </div>
        </h1>

        <p className={styles.description}>
          Karanlıkta parlayan fikirlerin bir araya geldiği yerde,{" "}
          <span className={styles.highlight}>kodların büyüdüğü</span> topluluk
        </p>

        <div className={styles.ctaContainer}>
          <button className={`${styles.ctaButton} ${styles.primary}`}>
            <span className={styles.buttonText}>Topluluğa Katıl</span>
            <span className={styles.buttonGlow} />
          </button>
          <button className={`${styles.ctaButton} ${styles.secondary}`}>
            <span className={styles.buttonText}>Keşfet</span>
          </button>
        </div>
      </div>
    </div>
  );
}

