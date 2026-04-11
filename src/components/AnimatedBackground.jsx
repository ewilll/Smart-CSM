import React, { useEffect, useRef } from 'react';

export default function AnimatedBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let molecules = [];

        // Configuration
        const MOLECULE_COUNT = 80;
        const CONNECTION_DISTANCE = 150;
        const MOUSE_INFLUENCE_RADIUS = 200;

        let mouse = { x: null, y: null };

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        window.addEventListener('mousemove', (e) => {
            mouse.x = e.x;
            mouse.y = e.y;
        });

        resizeCanvas();

        class Molecule {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = Math.random() * canvas.height;
                this.vx = (Math.random() - 0.5) * 1;
                this.vy = (Math.random() - 0.5) * 1;
                this.size = Math.random() * 3 + 2;
            }

            update() {
                this.x += this.vx;
                this.y += this.vy;

                // Bounce off edges
                if (this.x < 0 || this.x > canvas.width) this.vx = -this.vx;
                if (this.y < 0 || this.y > canvas.height) this.vy = -this.vy;

                // Mouse Interaction
                if (mouse.x != null) {
                    let dx = mouse.x - this.x;
                    let dy = mouse.y - this.y;
                    let distance = Math.sqrt(dx * dx + dy * dy);
                    if (distance < MOUSE_INFLUENCE_RADIUS) {
                        const forceDirectionX = dx / distance;
                        const forceDirectionY = dy / distance;
                        const force = (MOUSE_INFLUENCE_RADIUS - distance) / MOUSE_INFLUENCE_RADIUS;
                        const directionX = forceDirectionX * force * 2;
                        const directionY = forceDirectionY * force * 2;

                        this.vx -= directionX * 0.05;
                        this.vy -= directionY * 0.05;
                    }
                }
            }

            draw() {
                ctx.beginPath();
                ctx.arc(this.x, this.y, this.size, 0, Math.PI * 2);
                ctx.fillStyle = '#0ea5e9'; // Blue particles
                ctx.fill();
            }
        }

        const init = () => {
            molecules = [];
            for (let i = 0; i < MOLECULE_COUNT; i++) {
                molecules.push(new Molecule());
            }
        };

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            for (let i = 0; i < molecules.length; i++) {
                molecules[i].update();
                molecules[i].draw();

                // Draw connections (Pipes)
                for (let j = i; j < molecules.length; j++) {
                    let dx = molecules[i].x - molecules[j].x;
                    let dy = molecules[i].y - molecules[j].y;
                    let distance = Math.sqrt(dx * dx + dy * dy);

                    if (distance < CONNECTION_DISTANCE) {
                        ctx.beginPath();
                        ctx.strokeStyle = `rgba(14, 165, 233, ${1 - distance / CONNECTION_DISTANCE})`; // Blue lines
                        ctx.lineWidth = 1;
                        ctx.moveTo(molecules[i].x, molecules[i].y);
                        ctx.lineTo(molecules[j].x, molecules[j].y);
                        ctx.stroke();
                        ctx.closePath();
                    }
                }
            }
            animationFrameId = requestAnimationFrame(animate);
        };

        init();
        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="absolute inset-0 z-[-1] overflow-hidden pointer-events-none">
            {/* Premium Mesh Gradient Background */}
            <div
                className="absolute inset-0"
                style={{ background: 'var(--mesh-gradient)', backgroundAttachment: 'fixed' }}
            ></div>

            {/* Subtle Watermark/Pipe Texture Overlay */}
            <div className="absolute inset-0 opacity-[0.05] bg-[size:50px_50px] bg-[linear-gradient(to_right,#3b82f6_1px,transparent_1px),linear-gradient(to_bottom,#3b82f6_1px,transparent_1px)]"></div>

            {/* Canvas for Particles/Pipes */}
            <canvas ref={canvasRef} className="absolute inset-0 opacity-40"></canvas>

            {/* Bottom Overlay for depth */}
            <div className="absolute inset-0 bg-gradient-to-t from-blue-100/20 to-transparent"></div>
        </div>
    );
}
