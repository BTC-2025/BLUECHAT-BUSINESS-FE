import React from 'react';

export default function ShoppingCartModal({ isOpen, onClose, cart, onUpdateQuantity, onRemoveItem, onClearCart, onPlaceOrder }) {
    if (!isOpen) return null;

    const subtotal = cart.reduce((sum, item) => sum + (item.price * item.quantity), 0);
    const currency = cart[0]?.currency || 'INR';
    const currencySymbol = currency === 'INR' ? '₹' : currency;

    const handlePlaceOrder = () => {
        if (cart.length === 0) return;

        // Format order message
        const orderLines = cart.map(item =>
            `${item.name} x${item.quantity} - ${currencySymbol}${item.price * item.quantity}`
        );

        const orderMessage = `📦 Order:\n${orderLines.join('\n')}\n\n💰 Total: ${currencySymbol}${subtotal}`;

        onPlaceOrder(orderMessage);
    };

    return (
        <div
            className="fixed inset-0 bg-black/60 grid place-items-center z-[110] p-4 animate-in fade-in duration-300"
            onClick={onClose}
        >
            <div
                className="bg-white rounded-2xl w-full max-w-md shadow-2xl overflow-hidden animate-in zoom-in-95 duration-300 flex flex-col max-h-[85vh]"
                onClick={(e) => e.stopPropagation()}
            >
                {/* Header */}
                <div className="bg-gradient-to-r from-primary to-primary-light p-4 flex items-center justify-between">
                    <div className="flex items-center gap-2">
                        <span className="text-2xl">🛒</span>
                        <h2 className="text-xl font-bold text-white">Shopping Cart</h2>
                        <span className="bg-white/30 text-white text-xs font-bold px-2 py-1 rounded-full">
                            {cart.length}
                        </span>
                    </div>
                    <button
                        onClick={onClose}
                        className="p-2 bg-white/20 hover:bg-white/30 text-white rounded-full transition-colors"
                    >
                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" />
                        </svg>
                    </button>
                </div>

                {/* Cart Items */}
                <div className="flex-1 overflow-y-auto p-4">
                    {cart.length === 0 ? (
                        <div className="text-center py-12">
                            <div className="text-6xl mb-3">🛒</div>
                            <p className="text-gray-500 font-medium">Your cart is empty</p>
                            <p className="text-gray-400 text-sm mt-1">Add products to get started</p>
                        </div>
                    ) : (
                        <div className="space-y-3">
                            {cart.map((item) => (
                                <div
                                    key={item._id}
                                    className="bg-gray-50 rounded-xl p-3 flex gap-3 border border-gray-100"
                                >
                                    <div className="flex-1 min-w-0">
                                        <h4 className="font-bold text-gray-900 truncate">{item.name}</h4>
                                        <p className="text-primary font-bold text-sm">
                                            {currencySymbol}{item.price} each
                                        </p>
                                    </div>

                                    {/* Quantity Controls */}
                                    <div className="flex items-center gap-2">
                                        <button
                                            onClick={() => onUpdateQuantity(item._id, Math.max(1, item.quantity - 1))}
                                            className="w-7 h-7 rounded-lg bg-gray-200 hover:bg-gray-300 text-gray-700 font-bold flex items-center justify-center transition-colors"
                                        >
                                            −
                                        </button>
                                        <span className="w-8 text-center font-bold text-gray-900">
                                            {item.quantity}
                                        </span>
                                        <button
                                            onClick={() => onUpdateQuantity(item._id, item.quantity + 1)}
                                            className="w-7 h-7 rounded-lg bg-primary/10 hover:bg-primary/20 text-primary font-bold flex items-center justify-center transition-colors"
                                        >
                                            +
                                        </button>
                                    </div>

                                    {/* Remove Button */}
                                    <button
                                        onClick={() => onRemoveItem(item._id)}
                                        className="text-red-500 hover:text-red-600 p-1"
                                        title="Remove item"
                                    >
                                        <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                        </svg>
                                    </button>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Footer */}
                {cart.length > 0 && (
                    <div className="border-t border-gray-200 p-4 bg-gray-50">
                        {/* Subtotal */}
                        <div className="flex justify-between items-center mb-4">
                            <span className="text-gray-600 font-medium">Subtotal</span>
                            <span className="text-2xl font-black text-primary">
                                {currencySymbol}{subtotal}
                            </span>
                        </div>

                        {/* Action Buttons */}
                        <div className="flex gap-2">
                            <button
                                onClick={onClearCart}
                                className="flex-1 py-3 bg-gray-200 hover:bg-gray-300 text-gray-700 rounded-xl font-bold transition-colors"
                            >
                                Clear All
                            </button>
                            <button
                                onClick={handlePlaceOrder}
                                className="flex-1 py-3 bg-primary hover:bg-primary-dark text-white rounded-xl font-bold transition-colors flex items-center justify-center gap-2"
                            >
                                <span>📝</span>
                                Place Order
                            </button>
                        </div>
                    </div>
                )}
            </div>
        </div>
    );
}
