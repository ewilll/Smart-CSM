import React, { useEffect, useRef } from 'react';

export default function WaterDropBackground() {
    const canvasRef = useRef(null);

    useEffect(() => {
        const canvas = canvasRef.current;
        const ctx = canvas.getContext('2d');
        let animationFrameId;
        let drops = [];

        const resizeCanvas = () => {
            canvas.width = window.innerWidth;
            canvas.height = window.innerHeight;
        };

        window.addEventListener('resize', resizeCanvas);
        resizeCanvas();

        class WaterDrop {
            constructor() {
                this.x = Math.random() * canvas.width;
                this.y = -20;
                this.length = Math.random() * 20 + 10;
                this.speed = Math.random() * 3 + 2;
                this.opacity = Math.random() * 0.3 + 0.1;
            }

            update() {
                this.y += this.speed;

                // Reset when drop goes off screen
                if (this.y > canvas.height) {
                    this.y = -20;
                    this.x = Math.random() * canvas.width;
                }
            }

            draw() {
                ctx.beginPath();
                ctx.moveTo(this.x, this.y);
                ctx.lineTo(this.x, this.y + this.length);
                ctx.strokeStyle = `rgba(14, 165, 233, ${this.opacity})`;
                ctx.lineWidth = 1.5;
                ctx.stroke();
            }
        }

        // Create initial drops
        for (let i = 0; i < 50; i++) {
            drops.push(new WaterDrop());
        }

        const animate = () => {
            ctx.clearRect(0, 0, canvas.width, canvas.height);

            drops.forEach(drop => {
                drop.update();
                drop.draw();
            });

            animationFrameId = requestAnimationFrame(animate);
        };

        animate();

        return () => {
            window.removeEventListener('resize', resizeCanvas);
            cancelAnimationFrame(animationFrameId);
        };
    }, []);

    return (
        <div className="fixed inset-0 z-0 overflow-hidden pointer-events-none">
            {/* Subtle gradient background */}
            <div className="absolute inset-0 bg-gradient-to-br from-white via-blue-50/30 to-cyan-50/30"></div>

            {/* Canvas for water drops */}
            <canvas ref={canvasRef} className="absolute inset-0"></canvas>
        </div>
    );
}
