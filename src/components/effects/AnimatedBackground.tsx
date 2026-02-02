'use client';

import { useEffect, useRef } from 'react';

interface Particle {
  x: number;
  y: number;
  vx: number;
  vy: number;
  size: number;
  alpha: number;
  color: string;
}

export function AnimatedBackground() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const particlesRef = useRef<Particle[]>([]);
  const mouseRef = useRef({ x: 0, y: 0 });
  const animationRef = useRef<number>(0);

  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const ctx = canvas.getContext('2d');
    if (!ctx) return;

    // Set canvas size
    const resize = () => {
      canvas.width = window.innerWidth;
      canvas.height = window.innerHeight;
    };
    resize();
    window.addEventListener('resize', resize);

    // Track mouse
    const handleMouseMove = (e: MouseEvent) => {
      mouseRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    // Initialize particles
    const colors = ['#00e5ff', '#00a8bb', '#ffaa00', '#8866ff'];
    const particleCount = 50;

    particlesRef.current = Array.from({ length: particleCount }, () => ({
      x: Math.random() * canvas.width,
      y: Math.random() * canvas.height,
      vx: (Math.random() - 0.5) * 0.5,
      vy: (Math.random() - 0.5) * 0.5,
      size: Math.random() * 2 + 1,
      alpha: Math.random() * 0.5 + 0.2,
      color: colors[Math.floor(Math.random() * colors.length)],
    }));

    // Animation loop
    let lastTime = 0;
    const animate = (timestamp: number) => {
      const delta = timestamp - lastTime;
      lastTime = timestamp;

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      // Update and draw particles
      particlesRef.current.forEach((particle, i) => {
        // Subtle mouse attraction
        const dx = mouseRef.current.x - particle.x;
        const dy = mouseRef.current.y - particle.y;
        const dist = Math.sqrt(dx * dx + dy * dy);

        if (dist < 200) {
          particle.vx += dx * 0.00003;
          particle.vy += dy * 0.00003;
        }

        // Update position
        particle.x += particle.vx * (delta * 0.1);
        particle.y += particle.vy * (delta * 0.1);

        // Wrap around edges
        if (particle.x < 0) particle.x = canvas.width;
        if (particle.x > canvas.width) particle.x = 0;
        if (particle.y < 0) particle.y = canvas.height;
        if (particle.y > canvas.height) particle.y = 0;

        // Draw particle with glow
        ctx.beginPath();
        ctx.arc(particle.x, particle.y, particle.size, 0, Math.PI * 2);
        ctx.fillStyle = particle.color;
        ctx.globalAlpha = particle.alpha;
        ctx.fill();

        // Draw connections between nearby particles
        particlesRef.current.slice(i + 1).forEach((other) => {
          const dx2 = particle.x - other.x;
          const dy2 = particle.y - other.y;
          const dist2 = Math.sqrt(dx2 * dx2 + dy2 * dy2);

          if (dist2 < 120) {
            ctx.beginPath();
            ctx.moveTo(particle.x, particle.y);
            ctx.lineTo(other.x, other.y);
            ctx.strokeStyle = particle.color;
            ctx.globalAlpha = (1 - dist2 / 120) * 0.15;
            ctx.lineWidth = 0.5;
            ctx.stroke();
          }
        });
      });

      ctx.globalAlpha = 1;
      animationRef.current = requestAnimationFrame(animate);
    };

    animationRef.current = requestAnimationFrame(animate);

    return () => {
      window.removeEventListener('resize', resize);
      window.removeEventListener('mousemove', handleMouseMove);
      cancelAnimationFrame(animationRef.current);
    };
  }, []);

  return (
    <canvas
      ref={canvasRef}
      className="fixed inset-0 pointer-events-none"
      style={{ zIndex: 1, opacity: 0.6 }}
    />
  );
}

// Floating data streams component
export function DataStreams() {
  return (
    <div className="fixed inset-0 pointer-events-none overflow-hidden" style={{ zIndex: 0 }}>
      {/* Vertical data streams */}
      {[...Array(8)].map((_, i) => (
        <div
          key={i}
          className="absolute w-px h-32 opacity-30"
          style={{
            left: `${10 + i * 12}%`,
            background: `linear-gradient(to bottom, transparent, ${i % 2 === 0 ? 'var(--accent-cyan)' : 'var(--accent-amber)'}, transparent)`,
            animation: `stream-fall ${3 + i * 0.5}s linear infinite`,
            animationDelay: `${i * 0.3}s`,
          }}
        />
      ))}

      {/* Horizontal pulse lines */}
      {[...Array(3)].map((_, i) => (
        <div
          key={`h-${i}`}
          className="absolute h-px w-48 opacity-20"
          style={{
            top: `${25 + i * 25}%`,
            background: `linear-gradient(to right, transparent, var(--accent-cyan), transparent)`,
            animation: `stream-across ${4 + i}s linear infinite`,
            animationDelay: `${i * 1.5}s`,
          }}
        />
      ))}

      <style jsx>{`
        @keyframes stream-fall {
          0% {
            transform: translateY(-100%);
            opacity: 0;
          }
          10% {
            opacity: 0.4;
          }
          90% {
            opacity: 0.4;
          }
          100% {
            transform: translateY(100vh);
            opacity: 0;
          }
        }

        @keyframes stream-across {
          0% {
            transform: translateX(-100%);
            opacity: 0;
          }
          10% {
            opacity: 0.3;
          }
          90% {
            opacity: 0.3;
          }
          100% {
            transform: translateX(100vw);
            opacity: 0;
          }
        }
      `}</style>
    </div>
  );
}

// Glowing orb that follows cursor slowly
export function CursorGlow() {
  const glowRef = useRef<HTMLDivElement>(null);
  const targetRef = useRef({ x: 0, y: 0 });
  const currentRef = useRef({ x: 0, y: 0 });

  useEffect(() => {
    const handleMouseMove = (e: MouseEvent) => {
      targetRef.current = { x: e.clientX, y: e.clientY };
    };
    window.addEventListener('mousemove', handleMouseMove);

    const animate = () => {
      // Smooth follow with easing
      currentRef.current.x += (targetRef.current.x - currentRef.current.x) * 0.05;
      currentRef.current.y += (targetRef.current.y - currentRef.current.y) * 0.05;

      if (glowRef.current) {
        glowRef.current.style.transform = `translate(${currentRef.current.x - 150}px, ${currentRef.current.y - 150}px)`;
      }

      requestAnimationFrame(animate);
    };
    animate();

    return () => {
      window.removeEventListener('mousemove', handleMouseMove);
    };
  }, []);

  return (
    <div
      ref={glowRef}
      className="fixed pointer-events-none w-[300px] h-[300px] rounded-full"
      style={{
        background: 'radial-gradient(circle, rgba(0, 229, 255, 0.08) 0%, transparent 70%)',
        filter: 'blur(40px)',
        zIndex: 1,
      }}
    />
  );
}
