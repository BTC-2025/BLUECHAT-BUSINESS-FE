import React, { useState, useEffect, useCallback } from "react";
import axios from 'axios';
import { API_BASE } from '../api';
import ShoppingCartModal from './ShoppingCartModal';

export default function ContactInfoModal({
    contact,
    open,
    onClose,
    onProductInquiry,
    chatId,
    blockStatus,
    onBlock,
    onUnblock,
    onReport,
    onClearChat,
    onArchiveChat,
    isArchived
}) {
    const [activeTab, setActiveTab] = useState('info'); // 'info', 'products', 'media', 'docs', 'links'
    const [business, setBusiness] = useState(null);
    const [products, setProducts] = useState([]);
    const [sharedContent, setSharedContent] = useState({ media: [], docs: [], links: [] });
    const [loading, setLoading] = useState(false);
    const [loadingMedia, setLoadingMedia] = useState(false);

    // Shopping cart state
    const [cart, setCart] = useState([]);
    const [showCart, setShowCart] = useState(false);

    const loadBusinessData = useCallback(async () => {
        setLoading(true);
        try {
            const [businessRes, productsRes] = await Promise.all([
                axios.get(`${API_BASE}/business/${contact.id}`),
                axios.get(`${API_BASE}/business/${contact.id}/products`)
            ]);
            setBusiness(businessRes.data);
            setProducts(productsRes.data);
        } catch (error) {
            console.error('Load business error:', error);
        } finally {
            setLoading(false);
        }
    }, [contact?.id]);

    const loadSharedContent = useCallback(async () => {
        if (!chatId) return;
        setLoadingMedia(true);
        try {
            const { data: messages } = await axios.get(`${API_BASE}/messages/${chatId}`);

            const media = [];
            const docs = [];
            const links = [];
            const linkRegex = /(https?:\/\/[^\s]+)/g;

            messages.forEach(msg => {
                // Filter Attachments
                if (msg.attachments?.length > 0) {
                    msg.attachments.forEach(att => {
                        console.log("Processing attachment:", att, "Type:", att.type);

                        // ✅ Fallback type detection
                        let type = att.type;
                        if (!type && att.url) {
                            const ext = att.url.split('.').pop().toLowerCase();
                            if (['jpg', 'jpeg', 'png', 'gif', 'webp', 'svg', 'heic'].includes(ext)) type = 'image';
                            else if (['mp4', 'mov', 'webm', 'avi', 'mkv'].includes(ext)) type = 'video';
                            else if (['mp3', 'wav', 'ogg', 'm4a'].includes(ext)) type = 'audio';
                            else type = 'file';
                        }

                        if (type === 'image' || type === 'video') {
                            media.push({ ...att, msgId: msg._id, createdAt: msg.createdAt });
                        } else if (type !== 'audio') { // Exclude voice notes from docs
                            docs.push({ ...att, msgId: msg._id, createdAt: msg.createdAt });
                        }
                    });
                }

                // Extract Links
                const foundLinks = msg.body?.match(linkRegex);
                if (foundLinks) {
                    foundLinks.forEach(link => {
                        links.push({ url: link, msgId: msg._id, createdAt: msg.createdAt });
                    });
                }
            });

            setSharedContent({
                media: media.reverse(),
                docs: docs.reverse(),
                links: links.reverse()
            });
        } catch (error) {
            console.error("Failed to load shared content", error);
        } finally {
            setLoadingMedia(false);
        }
    }, [chatId]);

    // Cart handlers
    const addToCart = (product) => {
        setCart(prevCart => {
            const existing = prevCart.find(item => item._id === product._id);
            if (existing) {
                return prevCart.map(item =>
                    item._id === product._id
                        ? { ...item, quantity: item.quantity + 1 }
                        : item
                );
            }
            return [...prevCart, { ...product, quantity: 1 }];
        });
    };

    const updateQuantity = (productId, newQuantity) => {
        if (newQuantity < 1) return;
        setCart(prevCart =>
            prevCart.map(item =>
                item._id === productId ? { ...item, quantity: newQuantity } : item
            )
        );
    };

    const removeFromCart = (productId) => {
        setCart(prevCart => prevCart.filter(item => item._id !== productId));
    };

    const clearCart = () => {
        setCart([]);
    };

    const handlePlaceOrder = (orderMessage) => {
        // Send order to chat input
        onProductInquiry?.({ orderText: orderMessage });
        // Close modals and clear cart
        setShowCart(false);
        onClose();
        clearCart();
    };

    useEffect(() => {
        if (open) {
            if (contact?.isBusiness) {
                loadBusinessData();
            }
            loadSharedContent();
        } else {
            // Reset
            setBusiness(null);
            setProducts([]);
            setActiveTab('info');
            setCart([]);
            setSharedContent({ media: [], docs: [], links: [] });
        }
    }, [open, contact, loadBusinessData, loadSharedContent]);

    if (!open || !contact) return null;

    const TabButton = ({ id, label, count }) => (
        <button
            onClick={() => setActiveTab(id)}
            className={`py-3 px-4 font-bold border-b-2 transition-colors whitespace-nowrap ${activeTab === id
                ? 'border-primary text-primary'
                : 'border-transparent text-gray-400 hover:text-gray-600'
                }`}
        >
            {label} {count !== undefined && <span className="text-xs opacity-70 ml-1">({count})</span>}
        </button>
    );

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
                    <div className="absolute top-4 right-4 flex gap-2">
                        {/* Cart Button (Only for business) */}
                        {contact.isBusiness && business && (
                            <button
                                onClick={() => setShowCart(true)}
                                className="relative p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
                                title="View cart"
                            >
                                <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 3h2l.4 2M7 13h10l4-8H5.4M7 13L5.4 5M7 13l-2.293 2.293c-.63.63-.184 1.707.707 1.707H17m0 0a2 2 0 100 4 2 2 0 000-4zm-8 2a2 2 0 11-4 0 2 2 0 014 0z" />
                                </svg>
                                {cart.length > 0 && (
                                    <span className="absolute -top-1 -right-1 bg-red-500 text-white text-xs font-bold w-5 h-5 rounded-full flex items-center justify-center">
                                        {cart.length}
                                    </span>
                                )}
                            </button>
                        )}

                        {/* Close Button */}
                        <button
                            onClick={onClose}
                            className="p-2 bg-black/20 hover:bg-black/40 text-white rounded-full transition-colors z-10"
                        >
                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
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

                {/* Navigation Tabs */}
                <div className="px-6 mt-4 border-b border-gray-100 flex gap-2 shrink-0 overflow-x-auto hide-scrollbar">
                    <TabButton id="info" label={contact.isBusiness ? "Business Info" : "Info"} />
                    {contact.isBusiness && business && (
                        <TabButton id="products" label="Products" count={products.length} />
                    )}
                    <TabButton id="media" label="Media" count={sharedContent.media.length} />
                    <TabButton id="docs" label="Docs" count={sharedContent.docs.length} />
                    <TabButton id="links" label="Links" count={sharedContent.links.length} />
                </div>

                {/* Scrollable Content */}
                <div className="p-6 overflow-y-auto min-h-[300px]">
                    {activeTab === 'info' && (
                        <div className="space-y-6">
                            {/* Loading State */}
                            {loading && (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            )}
                            {/* Standard User Info */}
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

                            {/* Actions Section */}
                            <div className="pt-6 border-t border-gray-100">
                                <h3 className="text-xs font-black uppercase text-gray-400 mb-4 tracking-wider">Actions</h3>
                                <div className="space-y-2">
                                    <button
                                        onClick={onClearChat}
                                        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-200 group-hover:text-gray-800 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-gray-700">Clear all messages</span>
                                    </button>

                                    <button
                                        onClick={onArchiveChat}
                                        className="w-full p-4 flex items-center gap-4 hover:bg-gray-50 rounded-xl transition-colors text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-gray-100 flex items-center justify-center text-gray-600 group-hover:bg-gray-200 group-hover:text-gray-800 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 8h14M5 8a2 2 0 110-4h14a2 2 0 110 4M5 8v10a2 2 0 002 2h10a2 2 0 002-2V8m-9 4h4" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-gray-700">
                                            {isArchived ? "Unarchive user" : "Archive user"}
                                        </span>
                                    </button>

                                    <button
                                        onClick={blockStatus?.isBlocked ? onUnblock : onBlock}
                                        className="w-full p-4 flex items-center gap-4 hover:bg-red-50 rounded-xl transition-colors text-left group"
                                    >
                                        <div className={`w-10 h-10 rounded-full flex items-center justify-center transition-colors ${blockStatus?.isBlocked
                                            ? "bg-red-100 text-red-600 group-hover:bg-red-200"
                                            : "bg-gray-100 text-gray-600 group-hover:bg-gray-200"
                                            }`}
                                        >
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M18.364 18.364A9 9 0 005.636 5.636m12.728 12.728A9 9 0 015.636 5.636m12.728 12.728L5.636 5.636" />
                                            </svg>
                                        </div>
                                        <span className={`font-semibold ${blockStatus?.isBlocked ? "text-red-600" : "text-gray-700 group-hover:text-red-600"}`}>
                                            {blockStatus?.isBlocked ? "Unblock User" : "Block User"}
                                        </span>
                                    </button>

                                    <button
                                        onClick={onReport}
                                        className="w-full p-4 flex items-center gap-4 hover:bg-orange-50 rounded-xl transition-colors text-left group"
                                    >
                                        <div className="w-10 h-10 rounded-full bg-orange-100 flex items-center justify-center text-orange-600 group-hover:bg-orange-200 transition-colors">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                                            </svg>
                                        </div>
                                        <span className="font-semibold text-orange-600">Report User</span>
                                    </button>
                                </div>
                            </div>
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
                                    {products.map(product => {
                                        const cartItem = cart.find(item => item._id === product._id);
                                        const inCart = !!cartItem;
                                        const cartQuantity = cartItem?.quantity || 0;

                                        return (
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
                                                    onClick={() => addToCart(product)}
                                                    disabled={!product.inStock}
                                                    className={`w-full py-2 rounded-lg font-bold text-sm transition-colors mt-auto flex items-center justify-center gap-2 ${!product.inStock
                                                        ? 'bg-gray-100 text-gray-400 cursor-not-allowed'
                                                        : inCart
                                                            ? 'bg-green-100 text-green-700 hover:bg-green-200'
                                                            : 'bg-primary/10 text-primary hover:bg-primary hover:text-white'
                                                        }`}
                                                >
                                                    {!product.inStock ? (
                                                        <><span>🛒</span> Out of Stock</>
                                                    ) : inCart ? (
                                                        <><span>✓</span> In Cart ({cartQuantity})</>
                                                    ) : (
                                                        <><span>🛒</span> Add to Cart</>
                                                    )}
                                                </button>
                                            </div>
                                        );
                                    })}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'media' && (
                        <div className="space-y-4">
                            {loadingMedia ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : sharedContent.media.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <div className="text-4xl mb-3 opacity-50">🖼️</div>
                                    <p className="text-gray-500 font-medium">No shared media</p>
                                </div>
                            ) : (
                                <div className="grid grid-cols-3 gap-2">
                                    {sharedContent.media.map((item, i) => (
                                        <div key={i} className="aspect-square rounded-xl overflow-hidden bg-gray-100 border border-gray-200 relative group cursor-pointer">
                                            {item.type === 'video' ? (
                                                <video src={item.url} className="w-full h-full object-cover" />
                                            ) : (
                                                <img src={item.url} alt="" className="w-full h-full object-cover" />
                                            )}
                                            {item.type === 'video' && (
                                                <div className="absolute inset-0 flex items-center justify-center bg-black/30">
                                                    <svg className="w-8 h-8 text-white opacity-80" fill="currentColor" viewBox="0 0 24 24">
                                                        <path d="M8 5v14l11-7z" />
                                                    </svg>
                                                </div>
                                            )}
                                        </div>
                                    ))}
                                </div>
                            )}
                        </div>
                    )}

                    {activeTab === 'docs' && (
                        <div className="space-y-2">
                            {loadingMedia ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : sharedContent.docs.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <div className="text-4xl mb-3 opacity-50">📄</div>
                                    <p className="text-gray-500 font-medium">No shared documents</p>
                                </div>
                            ) : (
                                sharedContent.docs.map((doc, i) => (
                                    <a
                                        key={i}
                                        href={doc.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="flex items-center gap-4 p-4 bg-gray-50 hover:bg-gray-100 rounded-xl border border-gray-100 transition-colors group"
                                    >
                                        <div className="w-10 h-10 rounded-lg bg-orange-100 text-orange-600 flex items-center justify-center shrink-0">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                                            </svg>
                                        </div>
                                        <div className="min-w-0 flex-1">
                                            <div className="font-semibold text-gray-800 truncate group-hover:text-primary transition-colors">
                                                {doc.name || "Untitled Document"}
                                            </div>
                                            <div className="text-xs text-gray-400">
                                                {new Date(doc.createdAt).toLocaleDateString()}
                                            </div>
                                        </div>
                                        <div className="text-gray-400 group-hover:text-primary">
                                            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
                                            </svg>
                                        </div>
                                    </a>
                                ))
                            )}
                        </div>
                    )}

                    {activeTab === 'links' && (
                        <div className="space-y-4">
                            {loadingMedia ? (
                                <div className="flex justify-center p-8">
                                    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary"></div>
                                </div>
                            ) : sharedContent.links.length === 0 ? (
                                <div className="text-center py-12 bg-gray-50 rounded-xl border border-dashed border-gray-200">
                                    <div className="text-4xl mb-3 opacity-50">🔗</div>
                                    <p className="text-gray-500 font-medium">No shared links</p>
                                </div>
                            ) : (
                                sharedContent.links.map((link, i) => (
                                    <a
                                        key={i}
                                        href={link.url}
                                        target="_blank"
                                        rel="noreferrer"
                                        className="block p-4 bg-gray-50 hover:bg-blue-50/50 rounded-xl border border-gray-100 transition-colors group"
                                    >
                                        <div className="text-blue-600 font-medium truncate mb-1 group-hover:underline">
                                            {link.url}
                                        </div>
                                        <div className="text-xs text-gray-400">
                                            Sent {new Date(link.createdAt).toLocaleDateString()}
                                        </div>
                                    </a>
                                ))
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

                {/* Shopping Cart Modal */}
                <ShoppingCartModal
                    isOpen={showCart}
                    onClose={() => setShowCart(false)}
                    cart={cart}
                    onUpdateQuantity={updateQuantity}
                    onRemoveItem={removeFromCart}
                    onClearCart={clearCart}
                    onPlaceOrder={handlePlaceOrder}
                />
            </div>
        </div>
    );
}
