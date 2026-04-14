import React from 'react';
import Navbar from '../components/Navbar';
import { Phone, Mail, MapPin, MessageSquare, Clock, HelpCircle } from 'lucide-react';
import { MapContainer, TileLayer, Marker, Popup } from 'react-leaflet';
import 'leaflet/dist/leaflet.css';
import L from 'leaflet';

// Fix for default Leaflet icon not working with bundlers
import icon from 'leaflet/dist/images/marker-icon.png';
import iconShadow from 'leaflet/dist/images/marker-shadow.png';

let DefaultIcon = L.icon({
    iconUrl: icon,
    shadowUrl: iconShadow,
    iconSize: [25, 41],
    iconAnchor: [12, 41]
});

L.Marker.prototype.options.icon = DefaultIcon;

export default function CustomerService() {
    return (
        <div className="public-marketing min-h-screen bg-slate-50">
            <Navbar />

            <div className="pt-32 pb-20 px-6 sm:px-10 lg:px-12 max-w-7xl mx-auto">
                <div className="text-center mb-16 animate-slide-up">
                    <h1 className="text-4xl font-black text-slate-900 mb-4 tracking-tight">How can we help you?</h1>
                    <p className="text-lg text-slate-600 font-medium max-w-2xl mx-auto">
                        Our dedicated support team is available 24/7 to assist you with any water service related concerns.
                    </p>
                </div>

                <div className="grid md:grid-cols-3 gap-8 mb-16">
                    {/* Card 1 */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                        <div className="w-16 h-16 bg-blue-100 text-blue-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-blue-600 group-hover:text-white transition-colors">
                            <Phone size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">24/7 Hotline</h3>
                        <p className="text-slate-500 font-medium mb-6">Immediate assistance for emergencies and reports.</p>
                        <a href="tel:02888WATER" className="text-2xl font-black text-blue-600 hover:text-blue-700 tracking-tight block">(02) 888-WATER</a>
                    </div>

                    {/* Card 2 */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                        <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-emerald-600 group-hover:text-white transition-colors">
                            <MessageSquare size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Live Chat</h3>
                        <p className="text-slate-500 font-medium mb-6">Chat with our support agents for quick resolution.</p>
                        <button className="px-6 py-3 bg-slate-900 text-white rounded-xl font-bold uppercase tracking-widest text-xs hover:bg-slate-800 transition-colors w-full">Start Chat</button>
                    </div>

                    {/* Card 3 */}
                    <div className="bg-white p-8 rounded-3xl shadow-xl shadow-slate-200 border border-slate-100 hover:shadow-2xl hover:scale-105 transition-all duration-300 group">
                        <div className="w-16 h-16 bg-purple-100 text-purple-600 rounded-2xl flex items-center justify-center mb-6 group-hover:bg-purple-600 group-hover:text-white transition-colors">
                            <Mail size={32} />
                        </div>
                        <h3 className="text-xl font-black text-slate-800 mb-2">Email Support</h3>
                        <p className="text-slate-500 font-medium mb-6">Send us detailed queries and document submissions.</p>
                        <a href="mailto:help@primewater.com" className="text-lg font-bold text-slate-700 hover:text-blue-600 transition-colors">help@primewater.com</a>
                    </div>
                </div>

                {/* FAQ Section */}
                <div className="max-w-3xl mx-auto">
                    <h2 className="text-2xl font-black text-slate-900 mb-8 text-center">Frequently Asked Questions</h2>
                    <div className="space-y-4">
                        {[
                            { q: "How do I report a water leak?", a: "You can report leaks instantly through our mobile app or by calling our hotline. For faster service, please provide the exact location and a photo if possible." },
                            { q: "Where can I pay my bill?", a: "Bills can be paid via the PrimeWater app, GCash, PayMaya, or at any authorized payment center nationwide." },
                            { q: "My water is discolored, what should I do?", a: "Run your tap for 3-5 minutes. If discoloration persists, please contact us immediately for water quality testing." }
                        ].map((faq, i) => (
                            <div key={i} className="bg-white p-6 rounded-2xl border border-slate-200 hover:border-blue-300 transition-colors">
                                <h4 className="font-bold text-slate-800 mb-2 flex items-start gap-3">
                                    <HelpCircle size={20} className="text-blue-500 shrink-0 mt-0.5" />
                                    {faq.q}
                                </h4>
                                <p className="text-slate-600 text-sm leading-relaxed pl-8">{faq.a}</p>
                            </div>
                        ))}
                    </div>
                </div>

                {/* Office Location */}
                <div className="mt-20 bg-white rounded-3xl p-10 border border-slate-100 shadow-xl flex flex-col lg:flex-row items-center gap-12">
                    <div className="flex-1">
                        <h3 className="text-3xl font-black text-slate-900 mb-6 tracking-tight">Visit Our Main Office</h3>
                        <div className="space-y-4">
                            <div className="flex items-center gap-4 text-slate-600 font-medium">
                                <MapPin className="text-blue-600" />
                                <span>Malaybalay City, Bukidnon</span>
                            </div>
                            <div className="flex items-center gap-4 text-slate-600 font-medium">
                                <Clock className="text-blue-600" />
                                <span>Mon - Fri: 8:00 AM - 5:00 PM</span>
                            </div>
                            <p className="text-sm text-slate-500 mt-4 leading-relaxed">
                                Our main headquarters serves as the central hub for all water service operations in the province.
                                Visit us for billing inquiries, new connection applications, and other water-related services.
                            </p>
                        </div>
                    </div>
                    <div className="w-full md:w-1/2 h-64 bg-slate-200 rounded-2xl overflow-hidden relative shadow-inner z-0">
                        <div className="h-full w-full">
                            <MapContainer
                                center={[8.1619437, 125.1200614]}
                                zoom={15}
                                style={{ height: '100%', width: '100%' }}
                                dragging={false}
                                scrollWheelZoom={false}
                            >
                                <TileLayer
                                    attribution='&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors'
                                    url="https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png"
                                />
                                <Marker position={[8.1619437, 125.1200614]}>
                                    <Popup>
                                        <div className="text-center">
                                            <p className="font-bold text-slate-800">PrimeWater Malaybalay City Branch</p>
                                            <p className="text-xs text-slate-500">Malaybalay City, Bukidnon</p>
                                        </div>
                                    </Popup>
                                </Marker>
                            </MapContainer>
                        </div>
                    </div>
                </div>
            </div>
        </div>
    );
}
