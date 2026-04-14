import React, { useState } from 'react';
import Navbar from '../components/Navbar';
import { ArrowRight, Activity, CreditCard, ShieldCheck } from 'lucide-react';
import { Link, useNavigate } from 'react-router-dom';


export default function Home() {
  const [accountNumber, setAccountNumber] = useState('');
  const navigate = useNavigate();

  const goTrack = (e) => {
    e.preventDefault();
    const q = accountNumber.trim();
    if (q) navigate(`/track?q=${encodeURIComponent(q)}`);
    else navigate('/track');
  };

  return (
    <div className="public-marketing min-h-screen relative flex flex-col overflow-x-hidden water-bg">
      <Navbar />

      {/* Hero: responsive type, no fixed 100vh overflow; account card aligned */}
      <section className="relative flex flex-col min-h-[calc(100dvh-4rem)] sm:min-h-[calc(100dvh-5rem)] justify-center overflow-hidden pt-24 sm:pt-28 pb-16 sm:pb-20">
        <div className="absolute inset-0 bg-gradient-to-b from-[#BAE6FD] via-[#7DD3FC] to-[#38BDF8] z-0">
          <div className="absolute inset-0 bg-[url('https://grainy-gradients.vercel.app/noise.svg')] opacity-20 brightness-100 contrast-150" />
        </div>

        <div className="relative z-10 w-full max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 text-center">
          <h1 className="text-3xl sm:text-5xl md:text-6xl font-black tracking-tight mb-6 sm:mb-8 text-white leading-[1.12] drop-shadow-sm max-w-3xl mx-auto">
            Celebrate clear water every day with smart, sustainable living.
          </h1>

          <form
            onSubmit={goTrack}
            className="w-full max-w-xl mx-auto mt-6 sm:mt-10 rounded-2xl border border-white/40 bg-white/25 backdrop-blur-md p-3 sm:p-4 shadow-lg"
          >
            <div className="flex flex-col sm:flex-row gap-3 items-stretch">
              <input
                type="text"
                inputMode="numeric"
                autoComplete="off"
                placeholder="Enter account number"
                maxLength={16}
                value={accountNumber}
                onChange={(e) => setAccountNumber(e.target.value)}
                className="marketing-field flex-1 min-h-[3.5rem] rounded-xl border border-slate-200/90 bg-white/95 px-4 text-base sm:text-lg font-semibold text-slate-800 shadow-inner outline-none ring-2 ring-transparent placeholder:text-slate-500 focus:border-blue-500 focus:ring-blue-500/25"
              />
              <button
                type="submit"
                className="inline-flex h-14 min-h-[3.5rem] shrink-0 items-center justify-center gap-2 rounded-xl bg-blue-600 px-6 sm:px-8 text-sm sm:text-base font-bold uppercase tracking-wide text-white shadow-md transition-colors hover:bg-blue-700 focus-visible:outline focus-visible:outline-2 focus-visible:outline-offset-2 focus-visible:outline-white"
              >
                Check status
                <ArrowRight className="h-5 w-5" aria-hidden />
              </button>
            </div>
            <p className="mt-2 text-left text-xs text-slate-700 sm:text-center">
              Optional — opens bill tracking; leave blank to enter your account on the next screen.
            </p>
          </form>

          <div className="mt-10 sm:mt-14 flex justify-center px-2 pb-4">
            <div className="relative w-40 h-40 sm:w-44 sm:h-44 md:w-48 md:h-48">
              <div className="absolute inset-0 rounded-full bg-blue-500/20 blur-xl" />
              <div className="relative flex h-full w-full flex-col items-center justify-center rounded-full border-4 border-white/25 bg-gradient-to-br from-blue-400 to-blue-600 shadow-xl">

                <div className="mb-3 flex translate-y-1 gap-5 sm:gap-6">
                  <div className="relative h-9 w-7 overflow-hidden rounded-full bg-slate-900 sm:h-10 sm:w-8">
                    <div className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-white sm:h-2.5 sm:w-2.5" />
                  </div>
                  <div className="relative h-9 w-7 overflow-hidden rounded-full bg-slate-900 sm:h-10 sm:w-8">
                    <div className="absolute right-1 top-1.5 h-2 w-2 rounded-full bg-white sm:h-2.5 sm:w-2.5" />
                  </div>
                </div>

                <div className="h-5 w-10 rounded-b-full border-b-4 border-slate-900 sm:h-6 sm:w-12" />

                <div className="absolute -bottom-1 left-1/2 -translate-x-1/2 translate-y-1/2 rounded-full bg-blue-900 px-3 py-1 text-[10px] font-black uppercase tracking-widest text-white shadow-md sm:text-xs sm:px-4 sm:py-1.5">
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
