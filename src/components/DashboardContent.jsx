import { useState, useEffect, useCallback } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';
import { useAuth } from '../context/AuthContext';
import { Trash2, Plus, LogOut } from 'lucide-react';

const PRESET_GREETINGS = [
    "Hello! How can we help you today?",
    "Welcome! We're here to assist you with anything you need.",
    "Hi there! Check out our latest products while we get back to you.",
    "Thanks for reaching out! Someone will be with you shortly.",
    "Greetings! We appreciate your interest in our business."
];

export default function DashboardContent({ onBack }) {
    const { user, logout } = useAuth();
    const [business, setBusiness] = useState(null);
    const [products, setProducts] = useState([]);
    const [loading, setLoading] = useState(true);
    const [activeTab, setActiveTab] = useState('overview');
    const [showAddProduct, setShowAddProduct] = useState(false);
    const [confirmDialog, setConfirmDialog] = useState({ show: false, productId: null });
    const [productForm, setProductForm] = useState({
        name: '',
        description: '',
        price: '',
        currency: 'INR',
        category: '',
        inStock: true
    });
    const [greetingType, setGreetingType] = useState('preset');
    const [customGreeting, setCustomGreeting] = useState('');
    const [selectedGreeting, setSelectedGreeting] = useState('');
    const [isSavingGreeting, setIsSavingGreeting] = useState(false);





    const loadData = useCallback(async () => {
        try {
            const [businessRes, productsRes] = await Promise.all([
                axios.get(`${API_BASE}/business/my-business`, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                }),
                axios.get(`${API_BASE}/business/products`, {
                    headers: { Authorization: `Bearer ${user?.token}` }
                })
            ]);

            setBusiness(businessRes.data);
            setProducts(productsRes.data);

            const currentGreeting = businessRes.data.greetingMessage || "Hello! How can we help you today?";
            const isPreset = PRESET_GREETINGS.includes(currentGreeting);
            setGreetingType(isPreset ? 'preset' : 'custom');
            setSelectedGreeting(isPreset ? currentGreeting : PRESET_GREETINGS[0]);
            setCustomGreeting(isPreset ? '' : currentGreeting);
        } catch (error) {
            console.error('❌ Load error:', error.response?.data || error.message);
        } finally {
            setLoading(false);
        }
    }, [user?.token]);

    useEffect(() => {
        loadData();
    }, [loadData]);

    const handleAddProduct = async (e) => {
        e.preventDefault();
        try {
            await axios.post(`${API_BASE}/business/products`, productForm, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setProductForm({ name: '', description: '', price: '', currency: 'INR', category: '', inStock: true });
            setShowAddProduct(false);
            loadData();
        } catch (error) {
            alert(error.response?.data?.message || 'Failed to add product');
        }
    };

    const handleDeleteProduct = (id) => {
        setConfirmDialog({ show: true, productId: id });
    };

    const confirmDelete = async () => {
        try {
            await axios.delete(`${API_BASE}/business/products/${confirmDialog.productId}`, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setConfirmDialog({ show: false, productId: null });
            loadData();
        } catch (error) {
            alert('Failed to delete');
        }
    };

    const handleSaveGreeting = async () => {
        try {
            setIsSavingGreeting(true);
            const messageToSave = greetingType === 'preset' ? selectedGreeting : customGreeting;
            await axios.patch(`${API_BASE}/business/update`, {
                greetingMessage: messageToSave
            }, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });
            setBusiness(prev => ({ ...prev, greetingMessage: messageToSave }));
            alert('Greeting message updated successfully!');
        } catch (error) {
            alert('Failed to update greeting message');
        } finally {
            setIsSavingGreeting(false);
        }
    };

    if (loading) return <div className="p-10 text-center">Loading business data...</div>;
    if (!business) return <div className="p-10 text-center">No business data found.</div>;

    const getStatusConfig = () => {
        const configs = {
            pending: { bg: 'bg-yellow-100', text: 'text-yellow-800', icon: '⏳', label: 'Pending Approval' },
            approved: { bg: 'bg-green-100', text: 'text-green-800', icon: '✅', label: 'Approved' },
            rejected: { bg: 'bg-red-100', text: 'text-red-800', icon: '❌', label: 'Rejected' }
        };
        return configs[business.status] || configs.pending;
    };
    const statusConfig = getStatusConfig();

    return (
        <div className="flex flex-col h-screen bg-[#E9F4FF]">
            {/* Navbar */}
            <div className="bg-white/70 backdrop-blur-xl border-b border-white/60 shadow-sm px-6 md:px-8 py-4 flex justify-between items-center z-20 sticky top-0">
                <div>
                    <h1 className="text-2xl font-black text-slate-800 tracking-tight">{business.businessName}</h1>
                    <div className="flex items-center gap-3 mt-1">
                        <span className="text-xs font-bold text-slate-400 uppercase tracking-widest">{business.category}</span>
                        <span className={`px-2.5 py-1 rounded-lg text-[10px] font-bold uppercase tracking-wider ${statusConfig.bg} ${statusConfig.text} shadow-sm`}>
                            {statusConfig.icon} {statusConfig.label}
                        </span>
                    </div>
                </div>
                <button onClick={logout} className="flex items-center gap-2 text-red-500 font-bold hover:bg-red-50 px-4 py-2.5 rounded-xl transition-all shadow-sm hover:shadow-md border border-transparent hover:border-red-100">
                    <LogOut size={18} strokeWidth={2.5} /> <span className="hidden sm:inline">Logout</span>
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white/40 backdrop-blur-md border-b border-white/40 px-8 z-10">
                <div className="flex gap-8">
                    {['overview', 'products'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            disabled={tab === 'products' && business.status !== 'approved'}
                            className={`py-4 font-bold text-sm uppercase tracking-wider border-b-2 transition-all ${activeTab === tab
                                ? 'border-primary text-primary'
                                : 'border-transparent text-slate-400 hover:text-slate-600'
                                } ${tab === 'products' && business.status !== 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {tab}
                            {tab === 'products' && ` (${products.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-6 md:p-8">
                {activeTab === 'overview' && (
                    <div className="max-w-4xl mx-auto space-y-6 animate-slide-up">
                        {business.status === 'pending' && (
                            <div className="bg-yellow-50/80 backdrop-blur-sm border border-yellow-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-yellow-100 text-yellow-600 rounded-2xl">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-yellow-900 text-lg mb-1">Awaiting Approval</h3>
                                    <p className="text-yellow-800/80 text-sm leading-relaxed">Your business registration is currently under review by our team. You'll strictly be unable to manage products until approved.</p>
                                </div>
                            </div>
                        )}
                        {business.status === 'rejected' && business.rejectionReason && (
                            <div className="bg-red-50/80 backdrop-blur-sm border border-red-200 p-6 rounded-3xl shadow-sm flex items-start gap-4">
                                <div className="p-3 bg-red-100 text-red-600 rounded-2xl">
                                    <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2m7-2a9 9 0 11-18 0 9 9 0 0118 0z" /></svg>
                                </div>
                                <div>
                                    <h3 className="font-bold text-red-900 text-lg mb-1">Registration Rejected</h3>
                                    <p className="text-red-800/80 text-sm leading-relaxed">Reason: {business.rejectionReason}</p>
                                </div>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white/70 backdrop-blur-3xl p-8 rounded-[2rem] shadow-float border border-white/60">
                                <h3 className="font-bold text-slate-800 text-xl mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-primary/10 text-primary rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" /></svg></span>
                                    Contact Details
                                </h3>
                                <div className="space-y-4">
                                    <div className="p-4 bg-white/50 rounded-2xl border border-white/60 shadow-sm">
                                        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest block mb-1">Email</span>
                                        <span className="text-slate-700 font-medium">{business.email}</span>
                                    </div>
                                    <div className="p-4 bg-white/50 rounded-2xl border border-white/60 shadow-sm">
                                        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest block mb-1">Website</span>
                                        <span className="text-slate-700 font-medium">{business.website || 'N/A'}</span>
                                    </div>
                                    <div className="p-4 bg-white/50 rounded-2xl border border-white/60 shadow-sm">
                                        <span className="font-bold text-slate-400 text-[10px] uppercase tracking-widest block mb-1">Address</span>
                                        <span className="text-slate-700 font-medium">{business.address || 'N/A'}</span>
                                    </div>
                                </div>
                            </div>

                            {/* Greeting Editor */}
                            <div className="bg-white/70 backdrop-blur-3xl p-8 rounded-[2rem] shadow-float border border-white/60 flex flex-col">
                                <h3 className="font-bold text-slate-800 text-xl mb-6 flex items-center gap-3">
                                    <span className="p-2 bg-primary/10 text-primary rounded-xl"><svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 10h.01M12 10h.01M16 10h.01M9 16H5a2 2 0 01-2-2V6a2 2 0 012-2h14a2 2 0 012 2v8a2 2 0 01-2 2h-5l-5 5v-5z" /></svg></span>
                                    Daily Greeting
                                </h3>
                                <div className="space-y-4 flex-1 flex flex-col">
                                    <div className="flex gap-2 p-1 bg-slate-100/50 rounded-xl border border-slate-200/50">
                                        <button onClick={() => setGreetingType('preset')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${greetingType === 'preset' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Preset</button>
                                        <button onClick={() => setGreetingType('custom')} className={`flex-1 py-2 rounded-lg text-sm font-bold transition-all ${greetingType === 'custom' ? 'bg-white text-primary shadow-sm' : 'text-slate-400 hover:text-slate-600'}`}>Custom</button>
                                    </div>

                                    <div className="flex-1">
                                        {greetingType === 'preset' ? (
                                            <div className="relative">
                                                <select
                                                    value={selectedGreeting}
                                                    onChange={(e) => setSelectedGreeting(e.target.value)}
                                                    className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium outline-none focus:ring-2 focus:ring-primary/20 appearance-none shadow-sm text-slate-700"
                                                >
                                                    {PRESET_GREETINGS.map((msg, i) => <option key={i} value={msg}>{msg}</option>)}
                                                </select>
                                                <div className="absolute right-4 top-1/2 -translate-y-1/2 pointer-events-none text-slate-400">
                                                    <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" /></svg>
                                                </div>
                                            </div>
                                        ) : (
                                            <textarea
                                                value={customGreeting}
                                                onChange={(e) => setCustomGreeting(e.target.value)}
                                                className="w-full p-4 bg-white border border-slate-200 rounded-2xl text-sm font-medium h-32 resize-none outline-none focus:ring-2 focus:ring-primary/20 shadow-inner text-slate-700 placeholder-slate-400"
                                                placeholder="Write your greeting..."
                                            />
                                        )}
                                    </div>
                                    <button
                                        onClick={handleSaveGreeting}
                                        disabled={isSavingGreeting || (greetingType === 'custom' && !customGreeting.trim())}
                                        className="w-full py-3 bg-gradient-to-r from-primary to-[#3375c4] text-white rounded-xl font-bold text-sm hover:shadow-lg transition-all disabled:opacity-50 disabled:shadow-none hover:scale-[1.02] active:scale-[0.98]"
                                    >
                                        {isSavingGreeting ? 'Saving...' : 'Save Greeting'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="max-w-6xl mx-auto animate-slide-up">
                        <div className="flex justify-between items-center mb-8">
                            <div>
                                <h2 className="text-2xl font-black text-slate-800">Your Products</h2>
                                <p className="text-slate-500 font-medium">Manage your catalog and inventory</p>
                            </div>
                            <button onClick={() => setShowAddProduct(!showAddProduct)} className="flex items-center gap-2 bg-slate-900 text-white px-5 py-3 rounded-2xl font-bold hover:bg-slate-800 transition shadow-lg hover:shadow-xl hover:scale-105 active:scale-95">
                                {showAddProduct ? 'Cancel' : <><Plus size={20} strokeWidth={3} /> Add Product</>}
                            </button>
                        </div>

                        {showAddProduct && (
                            <div className="bg-white/80 backdrop-blur-xl p-8 rounded-[2rem] shadow-premium border border-white/60 mb-8 animate-premium-in relative overflow-hidden">
                                <div className="absolute top-0 left-0 w-full h-1 bg-gradient-to-r from-primary via-blue-400 to-indigo-500"></div>
                                <h3 className="font-bold text-xl mb-6 text-slate-800 flex items-center gap-2">
                                    <span className="w-8 h-8 rounded-full bg-primary/10 flex items-center justify-center text-primary"><Plus size={18} strokeWidth={3} /></span>
                                    Add New Product
                                </h3>
                                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-5">
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Product Name</label>
                                        <input type="text" placeholder="e.g. Wireless Headphones" required className="p-3 bg-white border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-primary/20 outline-none font-medium" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
                                    </div>
                                    <div className="space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Category</label>
                                        <input type="text" placeholder="e.g. Electronics" className="p-3 bg-white border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-primary/20 outline-none font-medium" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} />
                                    </div>
                                    <div className="flex gap-4">
                                        <div className="flex-1 space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Price</label>
                                            <input type="number" placeholder="0.00" required className="p-3 bg-white border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-primary/20 outline-none font-bold text-slate-800" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
                                        </div>
                                        <div className="w-32 space-y-1">
                                            <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Currency</label>
                                            <select className="p-3 bg-white border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-primary/20 outline-none font-bold" value={productForm.currency} onChange={e => setProductForm({ ...productForm, currency: e.target.value })}>
                                                <option value="INR">INR</option>
                                                <option value="USD">USD</option>
                                            </select>
                                        </div>
                                    </div>
                                    <div className="flex items-center gap-3 pt-6">
                                        <label className="flex items-center gap-3 cursor-pointer group">
                                            <div className={`w-6 h-6 rounded-md border-2 flex items-center justify-center transition-colors ${productForm.inStock ? 'bg-primary border-primary' : 'border-slate-300 bg-white'}`}>
                                                {productForm.inStock && <svg className="w-4 h-4 text-white" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" /></svg>}
                                            </div>
                                            <input type="checkbox" checked={productForm.inStock} onChange={e => setProductForm({ ...productForm, inStock: e.target.checked })} className="hidden" />
                                            <span className="font-bold text-slate-700 group-hover:text-primary transition-colors">In Stock</span>
                                        </label>
                                    </div>
                                    <div className="md:col-span-2 space-y-1">
                                        <label className="text-xs font-bold text-slate-500 uppercase tracking-wider ml-1">Description</label>
                                        <textarea placeholder="Describe your product..." rows={3} className="p-3 bg-white border border-slate-200 rounded-xl w-full focus:ring-2 focus:ring-primary/20 outline-none resize-none font-medium text-slate-600" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
                                    </div>
                                    <button type="submit" className="md:col-span-2 bg-gradient-to-r from-green-500 to-emerald-600 text-white py-4 rounded-xl font-bold hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] transition-all text-lg shadow-md">Save Product</button>
                                </form>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.length === 0 ? (
                                <div className="col-span-full py-20 flex flex-col items-center justify-center text-slate-400 bg-white/40 rounded-[2rem] border border-white/60 border-dashed">
                                    <div className="p-4 bg-white rounded-full shadow-sm mb-4">
                                        <svg className="w-8 h-8 text-slate-300" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" /></svg>
                                    </div>
                                    <p className="font-bold text-lg">No products added yet.</p>
                                    <p className="text-sm">Add your first product to get started.</p>
                                </div>
                            ) : (
                                products.map(p => (
                                    <div key={p._id} className="bg-white rounded-[1.5rem] p-5 hover:shadow-premium transition-all duration-300 group ring-1 ring-slate-100 hover:scale-[1.02]">
                                        <div className="flex justify-between items-start mb-3">
                                            <div className="p-2 bg-slate-50 rounded-xl group-hover:bg-primary/10 group-hover:text-primary transition-colors">
                                                <svg className="w-6 h-6 text-slate-400 group-hover:text-primary" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 11V7a4 4 0 00-8 0v4M5 9h14l1 12H4L5 9z" /></svg>
                                            </div>
                                            <span className={`text-[10px] uppercase px-2.5 py-1 rounded-lg font-bold tracking-wider ${p.inStock ? 'bg-green-50 text-green-700' : 'bg-red-50 text-red-700'}`}>
                                                {p.inStock ? 'In Stock' : 'Out Stock'}
                                            </span>
                                        </div>
                                        <h4 className="font-bold text-slate-900 text-lg mb-1 group-hover:text-primary transition-colors line-clamp-1">{p.name}</h4>
                                        <p className="text-slate-500 text-sm mb-4 line-clamp-2 min-h-[40px] leading-relaxed">{p.description}</p>
                                        <div className="flex justify-between items-center mt-auto pt-4 border-t border-slate-50">
                                            <span className="font-black text-xl text-slate-800">{p.currency === 'INR' ? '₹' : p.currency} {p.price}</span>
                                            <button onClick={() => handleDeleteProduct(p._id)} className="text-slate-400 hover:text-red-500 hover:bg-red-50 p-2.5 rounded-xl transition-all"><Trash2 size={18} strokeWidth={2.5} /></button>
                                        </div>
                                    </div>
                                ))
                            )}
                        </div>
                    </div>
                )}
            </div>

            {/* Confirm Dialog */}
            {confirmDialog.show && (
                <div className="fixed inset-0 bg-slate-900/40 backdrop-blur-md grid place-items-center z-[100] p-4">
                    <div className="bg-white p-8 rounded-[2rem] max-w-sm w-full shadow-2xl animate-scale-in text-center">
                        <div className="w-16 h-16 bg-red-50 rounded-full flex items-center justify-center mx-auto mb-4 text-red-500">
                            <Trash2 size={32} />
                        </div>
                        <h3 className="text-2xl font-bold mb-2 text-slate-900">Delete Product?</h3>
                        <p className="text-slate-500 mb-8 font-medium">This action cannot be undone and will remove the product from your catalog.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDialog({ show: false, productId: null })} className="flex-1 py-3 bg-slate-100 text-slate-600 rounded-xl font-bold hover:bg-slate-200 transition-colors">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-3 bg-red-500 text-white rounded-xl font-bold hover:bg-red-600 shadow-lg shadow-red-500/30 transition-all">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
