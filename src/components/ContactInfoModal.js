import React, { useState, useEffect } from "react";
import axios from 'axios';
import { API_BASE } from '../api';

export default function ContactInfoModal({ contact, open, onClose, onProductInquiry }) {
    const [activeTab, setActiveTab] = useState('info'); // 'info' or 'products'
    const [business, setBusiness] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(false);

    useEffect(() => {
        if (open) {
            console.log('ContactInfoModal Open:', { contact, isBusiness: contact?.isBusiness });
        }
        if (open && contact?.isBusiness) {
            loadBusinessData();
        } else {
            // Reset for non-business or closure
            setBusiness(null);
            setProducts([]);
            setActiveTab('info');
        }
    }, [open, contact]);

    const loadBusinessData = async () => {
        setLoading(true);
        try {
            const [businessRes, productsRes] = await Promise.all([
                axios.get(`${API_BASE}/business/${contact.id}`),
                axios.get(`${API_BASE}/business/${contact.id}/products`)
            ]);
            setBusiness(businessRes.data);
            setProducts(productsRes.data);
            // Default to products tab if business, or keep user choice? Let's stick to info first.
        } catch (error) {
            console.error('Load business error:', error);
        } finally {
            setLoading(false);
        }
    };

    if (!open || !contact) return null;

    return (
        <div
            className="fixed inset-0 bg-black/60 grid place-items-center z-[100] p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white border border-background-dark rounded-2xl w-full max-w-2xl shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header/Banner Area */}
                <div className="relative h-32 bg-gradient-to-r from-primary to-primary-light shrink-0">
                    <button
                        onClick={onClose}
                        className="absolute top-4 right-4 p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                    {contact.isBusiness && business && (
                        <div className="absolute bottom-4 left-6 text-white">
                            <h1 className="text-2xl font-black drop-shadow-md">{business.businessName}</h1>
                            <p className="text-sm opacity-90 font-medium">{business.category}</p>
                        </div>
                    )}
                </div>

                {/* Profile Header (Avatar & Name) - Only for non-business or if business data loading */}
                {(!contact.isBusiness || !business) && (
                    <div className="px-6 pb-6 -mt-16 relative text-center shrink-0">
                        <div className="w-32 h-32 rounded-2xl border-4 border-white shadow-xl bg-background overflow-hidden mx-auto mb-4">
                            {contact.avatar ? (
                                <img src={contact.avatar} alt={contact.full_name} className="w-full h-full object-cover" />
                            ) : (
                                <div className="w-full h-full bg-gradient-to-br from-secondary to-secondary-dark grid place-items-center text-4xl font-bold text-white uppercase">
                                    {(contact.full_name || contact.phone)?.[0]}
                                </div>
                            )}
                        </div>
                        <h2 className="text-2xl font-bold text-primary mb-1">
                            {contact.full_name || "Anonymous User"}
                        </h2>
                        <p className="text-primary/60 font-medium">
                            {contact.phone}
                        </p>
                    </div>
                )}

                {/* Tabs for Business Accounts */}
                {contact.isBusiness && business && (
                    <div className="px-6 mt-4 border-b border-gray-100 flex gap-6 shrink-0">
                        <button
                            onClick={() => setActiveTab('info')}
                            className={`py-3 font-bold border-b-2 transition-colors ${activeTab === 'info' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            About Business
                        </button>
                        <button
                            onClick={() => setActiveTab('products')}
                            className={`py-3 font-bold border-b-2 transition-colors ${activeTab === 'products' ? 'border-primary text-primary' : 'border-transparent text-gray-400 hover:text-gray-600'
                                }`}
                        >
                            Products ({products.length})
                        </button>
                    </div>
                )}

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto">
                    {activeTab === 'info' && (
                        <div className="space-y-5">
                            {/* Standard User Info (Show if NOT business OR if business data failed to load) */}
                            {(!contact.isBusiness || !business) && (
                                <>
                                    <div className="bg-background rounded-xl p-4 border border-background-dark/50">
                                        <label className="text-[10px] font-bold uppercase tracking-wider text-secondary-dark mb-1 block">About</label>
                                        <p className="text-primary/80 text-sm leading-relaxed italic">
                                            "{contact.about || "No status available."}"
                                        </p>
                                    </div>
                                    {contact.email && (
                                        <div className="bg-background rounded-xl p-4 border border-background-dark/50">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-secondary-dark mb-1 block">Email</label>
                                            <p className="text-primary/80 text-sm font-medium">{contact.email}</p>
                                        </div>
                                    )}
                                </>
                            )}

                            {/* Business Info */}
                            {contact.isBusiness && business && (
                                <>
                                    {business.description && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-2 block">Description</label>
                                            <p className="text-gray-700 text-sm leading-relaxed">{business.description}</p>
                                        </div>
                                    )}

                                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Contact</label>
                                            <p className="text-black font-medium">{contact.phone}</p>
                                            {business.email && <p className="text-black font-medium mt-1">{business.email}</p>}
                                        </div>
                                        {business.website && (
                                            <div className="bg-gray-50 rounded-xl p-4">
                                                <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Website</label>
                                                <a href={business.website} target="_blank" rel="noreferrer" className="text-primary hover:underline truncate block">
                                                    {business.website}
                                                </a>
                                            </div>
                                        )}
                                    </div>

                                    {business.address && (
                                        <div className="bg-gray-50 rounded-xl p-4">
                                            <label className="text-[10px] font-bold uppercase tracking-wider text-gray-500 mb-1 block">Address</label>
                                            <p className="text-gray-700 text-sm">{business.address}</p>
                                        </div>
                                    )}
                                </>
                            )}
                            {contact.isBusiness && loading && (
                                <div className="py-8 text-center text-gray-500">Loading business details...</div>
                            )}
                        </div>
                    )}

                    {activeTab === 'products' && (
                        <div className="space-y-4">
                            {products.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <div className="text-4xl mb-3">🛍️</div>
                                    <p className="text-gray-500 font-medium">No products listed yet.</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                                    {products.map(product => (
                                        <div key={product._id} className="bg-white border border-gray-100 rounded-xl p-4 shadow-sm hover:shadow-md transition-shadow flex flex-col h-full">
                                            <div className="mb-2">
                                                <div className="flex justify-between items-start mb-1">
                                                    <h4 className="font-bold text-gray-900 line-clamp-1" title={product.name}>{product.name}</h4>
                                                    {product.inStock ?
                                                        <span className="text-[10px] font-bold bg-green-100 text-green-700 px-2 py-0.5 rounded-full shrink-0 ml-2">Stock</span> :
                                                        <span className="text-[10px] font-bold bg-gray-100 text-gray-500 px-2 py-0.5 rounded-full shrink-0 ml-2">Out</span>
                                                    }
                                                </div>
                                                <p className="text-primary font-black text-lg">
                                                    {product.currency === 'INR' ? '₹' : product.currency} {product.price}
                                                </p>
                                            </div>

                                            {product.description && (
                                                <p className="text-gray-500 text-xs line-clamp-2 mb-4 flex-1">{product.description}</p>
                                            )}

                                            <button
                                                onClick={() => {
                                                    onProductInquiry?.(product);
                                                    onClose();
                                                }}
                                                className="w-full py-2 bg-primary/10 text-primary hover:bg-primary hover:text-white rounded-lg font-bold text-sm transition-colors mt-auto flex items-center justify-center gap-2"
                                            >
                                                <span>💬</span> Know More
                                            </button>
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* Footer Actions (Only for non-business or simple Close) */}
                <div className="bg-background-dark/30 px-6 py-4 flex justify-end shrink-0">
                    <button
                        onClick={onClose}
                        className="px-6 py-2.5 bg-gray-200 text-gray-700 hover:bg-gray-300 rounded-xl font-semibold transition-colors text-sm"
                    >
                        Close
                    </button>
                </div>
            </div>
        </div>
    );
}
