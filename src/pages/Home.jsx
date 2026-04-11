import React from 'react';
import Navbar from '../components/Navbar';
import { Droplets, ArrowRight, Activity, CreditCard, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';


export default function Home() {
  return (
    <div className="min-h-screen relative flex flex-col overflow-x-hidden water-bg">
      <Navbar />

      {/* Hero Section - Reference Style */}
      <section className="relative h-screen min-h-[600px] flex items-center justify-center overflow-hidden">
        {/* Detailed Gradient Background matching Reference */}
        <div className="absolute inset-0 bg-gradient-to-b from-[#BAE6FD] via-[#7DD3FC] to-[#38BDF8] z-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150"></div>
        </div>

        <div className="relative z-10 max-w-5xl mx-auto px-4 sm:px-6 lg:px-8 text-center mt-16">
          <h1 className="text-5xl md:text-7xl font-black tracking-tight mb-8 text-white leading-[1.1] drop-shadow-sm">
            Celebrate clear water <br />
            every day with <span className="text-white">smart, sustainable living.</span>
          </h1>

          <div className="max-w-lg mx-auto mt-10 flex flex-col sm:flex-row gap-4">
            <input
              type="text"
              placeholder="Enter Account Number"
              className="flex-1 h-16 rounded-xl px-6 text-lg font-bold text-slate-700 focus:outline-none shadow-lg border-2 border-white/50 focus:border-white placeholder:text-slate-400"
            />
            <button
              onClick={() => (window.location.href = '/track')}
              className="btn-premium h-16 px-10 text-lg !w-auto"
            >
              Check Status
            </button>
          </div>

          <div className="mt-12 flex justify-center">
            {/* Aqua Mascot - Reference Position - UPDATED WITH EYES */}
            <div className="relative w-48 h-48">
              <div className="absolute inset-0 bg-blue-500/20 rounded-full blur-xl animate-pulse-slow"></div>
              <div className="relative w-full h-full bg-gradient-to-br from-blue-400 to-blue-600 rounded-full flex flex-col items-center justify-center shadow-2xl border-4 border-white/20 animate-float">

                {/* Eyes Container */}
                <div className="flex gap-6 mb-4 translate-y-2">
                  {/* Left Eye */}
                  <div className="w-8 h-10 bg-slate-900 rounded-full relative overflow-hidden animate-blink">
                    <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-white rounded-full"></div>
                  </div>
                  {/* Right Eye */}
                  <div className="w-8 h-10 bg-slate-900 rounded-full relative overflow-hidden animate-blink">
                    <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Mouth */}
                <div className="w-12 h-6 border-b-4 border-slate-900 rounded-full"></div>

                {/* Arms */}
                <div className="absolute -left-8 top-20 w-12 h-4 bg-blue-500 rounded-full origin-right border-l-4 border-blue-400 animate-wave-left"></div>
                <div className="absolute -right-8 top-20 w-12 h-4 bg-blue-500 rounded-full origin-left border-r-4 border-blue-400 animate-wave-right"></div>

                <div className="absolute -bottom-6 bg-blue-800 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-lg">
                  Aqua
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Grid */}
      <section id="services" className="py-20 z-10 relative scroll-mt-28">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center mb-16">
            <h2 className="text-3xl font-bold text-slate-900 mb-4">Why Choose Smart CSM?</h2>
            <p className="text-slate-600 max-w-2xl mx-auto">Experience the future of water management with our cutting-edge features designed for your convenience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <FeatureCard
              icon={<Activity className="h-8 w-8 text-white" />}
              iconBg="bg-cyan-500"
              title="Real-time Tracking"
              description="Monitor your water consumption daily with our advanced IoT integration."
              to="/features/tracking"
            />
            <FeatureCard
              icon={<CreditCard className="h-8 w-8 text-white" />}
              iconBg="bg-blue-500"
              title="Instant Payments"
              description="Pay your bills securely through our integrated payment gateway."
              to="/features/payments"
            />
            <FeatureCard
              icon={<ShieldCheck className="h-8 w-8 text-white" />}
              iconBg="bg-emerald-500"
              title="Secure Platform"
              description="Your data is protected with enterprise-grade encryption and security."
              to="/features/security"
            />
          </div>
        </div>
      </section>
      {/* About Section - Dedicated Section on Main Page */}
      <section id="about" className="py-24 z-10 relative bg-white/30 backdrop-blur-md border-y border-white/20">
        <div className="max-w-7xl mx-auto px-6 lg:px-8">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-8">
              <span className="inline-block px-4 py-1.5 rounded-full bg-blue-600/20 border border-blue-400/30 text-blue-600 text-[10px] font-black uppercase tracking-[0.3em]">Our Legacy</span>
              <h2 className="text-5xl font-black tracking-tight leading-tight text-slate-900">Serving the community with <span className="text-blue-600">excellence since 1982.</span></h2>
              <p className="text-slate-600 text-lg font-medium leading-relaxed">
                PrimeWater is more than just a utility provider; we are partners in progress. For over 40 years, we've pioneered sustainable water management, bringing world-class technology to millions of households.
              </p>
              <div className="flex gap-4">
                <Link to="/info-hub" className="btn-premium px-8 py-4 !w-auto">Read Full Story</Link>
                <Link to="/customer-service" className="px-8 py-4 rounded-2xl border-2 border-slate-200 text-slate-700 font-bold hover:bg-white hover:text-blue-600 transition-all flex items-center gap-2">Contact Us</Link>
              </div>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
              <div className="space-y-4 translate-y-8">
                <div className="p-8 rounded-[32px] bg-white shadow-2xl shadow-blue-500/10 border border-blue-50">
                  <h4 className="text-4xl font-black text-blue-600">40+</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Years of Impact</p>
                </div>
                <div className="p-8 rounded-[32px] bg-blue-600 text-white shadow-2xl shadow-blue-600/20">
                  <h4 className="text-4xl font-black">2M+</h4>
                  <p className="text-[10px] font-bold text-blue-100 uppercase tracking-widest mt-2">Home Connections</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-8 rounded-[32px] bg-slate-900 text-white shadow-2xl">
                  <h4 className="text-4xl font-black text-cyan-400">100%</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Safe Water Standard</p>
                </div>
                <div className="p-8 rounded-[32px] bg-white shadow-2xl shadow-blue-500/10 border border-blue-50">
                  <h4 className="text-4xl font-black text-orange-500">24/7</h4>
                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-widest mt-2">Technical Support</p>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>
    </div>
  );
}

function FeatureCard({ icon, iconBg, title, description, to }) {
  return (
    <Link to={to} className="p-8 rounded-3xl bg-white border border-slate-100 shadow-xl shadow-slate-200/50 hover:shadow-2xl hover:shadow-blue-500/10 transition-all hover:-translate-y-1 group cursor-pointer block no-underline">
      <div className={`mb-6 p-4 rounded-2xl ${iconBg} shadow-lg shadow-${iconBg}/30 w-fit group-hover:scale-110 transition-transform duration-300`}>
        {icon}
      </div>
      <h3 className="text-xl font-bold text-slate-900 mb-3">{title}</h3>
      <p className="text-slate-600 leading-relaxed">{description}</p>
    </Link>
  );
}
