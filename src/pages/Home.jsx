import React from 'react';
import Navbar from '../components/Navbar';
import { Droplets, ArrowRight, Activity, CreditCard, ShieldCheck } from 'lucide-react';
import { Link } from 'react-router-dom';


export default function Home() {
  return (
    <div className="min-h-screen bg-slate-50 flex flex-col">
      <Navbar />

      {/* Hero Section */}
      <section className="bg-white border-b border-slate-100">
        <div className="max-w-6xl mx-auto px-6 py-20 lg:py-28 flex flex-col lg:flex-row items-center gap-12">
          
          {/* Left Content */}
          <div className="flex-1">
            <span className="inline-block text-xs font-bold uppercase tracking-widest text-blue-600 bg-blue-50 px-3 py-1 rounded-full mb-4 group relative cursor-help">
              PrimeWater Smart <span className="border-b border-dashed border-blue-400">CSM</span>
              <span className="absolute bottom-full left-1/2 -translate-x-1/2 mb-2 w-max px-2 py-1 bg-slate-800 text-white text-[10px] rounded opacity-0 group-hover:opacity-100 transition-opacity pointer-events-none z-50">Customer Service Management</span>
            </span>
            <h1 className="text-4xl lg:text-5xl font-black text-slate-900 tracking-tight leading-tight mb-4">
              Centralized Water Incident Reporting & Response
            </h1>
            <p className="text-lg text-slate-500 mb-8 leading-relaxed">
              Experience the future of water management. Monitor consumption, report incidents, and pay bills securely with our advanced tracking system designed for your convenience.
            </p>

            <div className="flex flex-col sm:flex-row gap-4 mb-8">
              <input
                type="text"
                placeholder="Enter Account Number"
                className="flex-1 h-14 rounded-xl px-4 text-base font-medium text-slate-700 focus:outline-none border border-slate-200 focus:border-blue-500 focus:ring-2 focus:ring-blue-100 placeholder:text-slate-400"
              />
              <button
                onClick={() => (window.location.href = '/track')}
                className="h-14 px-8 rounded-xl bg-blue-600 text-white font-bold hover:bg-blue-700 transition-colors"
              >
                Check Status
              </button>
            </div>

            <div className="flex gap-4">
              <Link to="/login" className="h-12 px-6 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-700 transition-colors">
                Login to Dashboard
              </Link>
              <Link to="/info-hub" className="h-12 px-6 rounded-xl bg-slate-100 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-200 transition-colors">
                Learn More
              </Link>
            </div>
          </div>

          {/* Right Side - Mascot */}
          <div className="flex-1 flex justify-center lg:justify-end">
            <div className="relative w-64 h-64">
              <div className="w-full h-full bg-blue-600 rounded-full flex flex-col items-center justify-center shadow-lg">
                {/* Eyes Container */}
                <div className="flex gap-6 mb-4 translate-y-2">
                  {/* Left Eye */}
                  <div className="w-8 h-10 bg-slate-900 rounded-full relative overflow-hidden">
                    <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-white rounded-full"></div>
                  </div>
                  {/* Right Eye */}
                  <div className="w-8 h-10 bg-slate-900 rounded-full relative overflow-hidden">
                    <div className="absolute top-1.5 right-1.5 w-2.5 h-2.5 bg-white rounded-full"></div>
                  </div>
                </div>

                {/* Mouth */}
                <div className="w-12 h-6 border-b-4 border-slate-900 rounded-full"></div>

                {/* Arms */}
                <div className="absolute -left-8 top-24 w-12 h-4 bg-blue-500 rounded-full origin-right border-l-4 border-blue-400"></div>
                <div className="absolute -right-8 top-24 w-12 h-4 bg-blue-500 rounded-full origin-left border-r-4 border-blue-400"></div>

                <div className="absolute -bottom-4 bg-blue-800 text-white text-xs font-black px-4 py-1.5 rounded-full uppercase tracking-widest shadow-sm border border-blue-700">
                  Aqua
                </div>
              </div>
            </div>
          </div>

        </div>
      </section>

      {/* Features Grid */}
      <section id="services" className="py-20 z-10 relative scroll-mt-28 bg-slate-50">
        <div className="max-w-6xl mx-auto px-6">
          <div className="text-center mb-12">
            <h2 className="text-2xl font-bold text-slate-900 mb-4">Why Choose Smart CSM?</h2>
            <p className="text-slate-500 max-w-2xl mx-auto">Experience the future of water management with our cutting-edge features designed for your convenience.</p>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
            <FeatureCard
              icon={<Activity className="h-6 w-6 text-blue-600" />}
              iconBg="bg-blue-50"
              title="Real-time Tracking"
              description="Monitor your water consumption daily with our advanced IoT integration."
              to="/features/tracking"
            />
            <FeatureCard
              icon={<CreditCard className="h-6 w-6 text-blue-600" />}
              iconBg="bg-blue-50"
              title="Instant Payments"
              description="Pay your bills securely through our integrated payment gateway."
              to="/features/payments"
            />
            <FeatureCard
              icon={<ShieldCheck className="h-6 w-6 text-blue-600" />}
              iconBg="bg-blue-50"
              title="Secure Platform"
              description="Your data is protected with enterprise-grade encryption and security."
              to="/features/security"
            />
          </div>
        </div>
      </section>
      
      {/* About Section - Dedicated Section on Main Page */}
      <section id="about" className="py-20 z-10 relative bg-white border-t border-slate-100">
        <div className="max-w-6xl mx-auto px-6">
          <div className="flex flex-col lg:flex-row items-center gap-16">
            <div className="lg:w-1/2 space-y-6">
              <span className="inline-block px-3 py-1 rounded-full bg-slate-100 text-slate-600 text-[10px] font-bold uppercase tracking-widest">Our Legacy</span>
              <h2 className="text-3xl lg:text-4xl font-bold tracking-tight leading-tight text-slate-900">Serving the community with <span className="text-blue-600">excellence since 1982.</span></h2>
              <p className="text-slate-500 text-lg leading-relaxed">
                PrimeWater is more than just a utility provider; we are partners in progress. For over 40 years, we've pioneered sustainable water management, bringing world-class technology to millions of households.
              </p>
              <div className="flex gap-4 pt-4">
                <Link to="/info-hub" className="h-12 px-6 rounded-xl bg-blue-600 text-white font-bold flex items-center justify-center hover:bg-blue-700 transition-colors">Read Full Story</Link>
                <Link to="/customer-service" className="h-12 px-6 rounded-xl border border-slate-200 text-slate-600 font-bold flex items-center justify-center hover:bg-slate-50 transition-colors">Contact Us</Link>
              </div>
            </div>
            <div className="lg:w-1/2 grid grid-cols-2 gap-4">
              <div className="space-y-4 lg:translate-y-6">
                <div className="p-6 rounded-2xl bg-white shadow-sm border border-slate-100">
                  <h4 className="text-3xl font-bold text-blue-600">40+</h4>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-2">Years of Impact</p>
                </div>
                <div className="p-6 rounded-2xl bg-blue-50 border border-blue-100">
                  <h4 className="text-3xl font-bold text-blue-700">2M+</h4>
                  <p className="text-xs font-medium text-blue-600 uppercase tracking-wider mt-2">Home Connections</p>
                </div>
              </div>
              <div className="space-y-4">
                <div className="p-6 rounded-2xl bg-slate-800 text-white shadow-sm">
                  <h4 className="text-3xl font-bold text-white">100%</h4>
                  <p className="text-xs font-medium text-slate-400 uppercase tracking-wider mt-2">Safe Water Standard</p>
                </div>
                <div className="p-6 rounded-2xl bg-white shadow-sm border border-slate-100">
                  <h4 className="text-3xl font-bold text-slate-700">24/7</h4>
                  <p className="text-xs font-medium text-slate-500 uppercase tracking-wider mt-2">Technical Support</p>
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
    <Link to={to} className="bg-white border border-slate-100 rounded-2xl p-6 shadow-sm hover:shadow-md transition-shadow block no-underline">
      <div className={`mb-4 p-3 rounded-xl ${iconBg} w-fit`}>
        {icon}
      </div>
      <h3 className="text-lg font-bold text-slate-900 mb-2">{title}</h3>
      <p className="text-sm text-slate-500 leading-relaxed">{description}</p>
    </Link>
  );
}
