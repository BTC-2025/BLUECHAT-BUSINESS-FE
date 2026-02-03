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
        <div className="flex flex-col h-screen bg-gray-50">
            {/* Navbar */}
            <div className="bg-white shadow px-8 py-4 flex justify-between items-center z-10">
                <div>
                    <h1 className="text-2xl font-bold text-gray-900">{business.businessName}</h1>
                    <div className="flex items-center gap-3">
                        <span className="text-sm text-gray-500 uppercase font-semibold">{business.category}</span>
                        <span className={`px-2 py-0.5 rounded text-xs font-bold ${statusConfig.bg} ${statusConfig.text}`}>
                            {statusConfig.icon} {statusConfig.label}
                        </span>
                    </div>
                </div>
                <button onClick={logout} className="flex items-center gap-2 text-red-600 font-medium hover:bg-red-50 px-4 py-2 rounded-lg transition">
                    <LogOut size={20} /> Logout
                </button>
            </div>

            {/* Tabs */}
            <div className="bg-white border-b border-gray-200 px-8">
                <div className="flex gap-8">
                    {['overview', 'products'].map(tab => (
                        <button
                            key={tab}
                            onClick={() => setActiveTab(tab)}
                            disabled={tab === 'products' && business.status !== 'approved'}
                            className={`py-4 font-bold capitalize border-b-4 transition-all ${activeTab === tab
                                ? 'border-blue-600 text-blue-600'
                                : 'border-transparent text-gray-500 hover:text-gray-700'
                                } ${tab === 'products' && business.status !== 'approved' ? 'opacity-50 cursor-not-allowed' : ''}`}
                        >
                            {tab}
                            {tab === 'products' && ` (${products.length})`}
                        </button>
                    ))}
                </div>
            </div>

            {/* Content Area */}
            <div className="flex-1 overflow-y-auto p-8">
                {activeTab === 'overview' && (
                    <div className="max-w-4xl mx-auto space-y-6">
                        {business.status === 'pending' && (
                            <div className="bg-yellow-50 border-l-4 border-yellow-400 p-5 rounded-lg shadow-sm">
                                <h3 className="font-bold text-yellow-900 mb-1">Awaiting Approval</h3>
                                <p className="text-yellow-800">Your business registration is currently under review. You'll be able to manage products once approved.</p>
                            </div>
                        )}
                        {business.status === 'rejected' && business.rejectionReason && (
                            <div className="bg-red-50 border-l-4 border-red-400 p-5 rounded-lg shadow-sm">
                                <h3 className="font-bold text-red-900 mb-1">Registration Rejected</h3>
                                <p className="text-red-800">Reason: {business.rejectionReason}</p>
                            </div>
                        )}

                        <div className="grid md:grid-cols-2 gap-6">
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-bold text-gray-900 text-lg mb-4">Contact Details</h3>
                                <div className="space-y-3">
                                    <p><span className="font-semibold text-gray-500 text-sm block">Email</span> {business.email}</p>
                                    <p><span className="font-semibold text-gray-500 text-sm block">Website</span> {business.website || 'N/A'}</p>
                                    <p><span className="font-semibold text-gray-500 text-sm block">Address</span> {business.address || 'N/A'}</p>
                                </div>
                            </div>

                            {/* Greeting Editor */}
                            <div className="bg-white p-6 rounded-xl shadow-sm border border-gray-200">
                                <h3 className="font-bold text-gray-900 text-lg mb-4">Daily Greeting</h3>
                                <div className="space-y-4">
                                    <div className="flex gap-2">
                                        <button onClick={() => setGreetingType('preset')} className={`flex-1 py-1.5 rounded text-sm font-medium border ${greetingType === 'preset' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600'}`}>Preset</button>
                                        <button onClick={() => setGreetingType('custom')} className={`flex-1 py-1.5 rounded text-sm font-medium border ${greetingType === 'custom' ? 'bg-blue-50 border-blue-200 text-blue-700' : 'border-gray-200 text-gray-600'}`}>Custom</button>
                                    </div>

                                    {greetingType === 'preset' ? (
                                        <select
                                            value={selectedGreeting}
                                            onChange={(e) => setSelectedGreeting(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm"
                                        >
                                            {PRESET_GREETINGS.map((msg, i) => <option key={i} value={msg}>{msg}</option>)}
                                        </select>
                                    ) : (
                                        <textarea
                                            value={customGreeting}
                                            onChange={(e) => setCustomGreeting(e.target.value)}
                                            className="w-full p-2 border border-gray-300 rounded-lg text-sm h-24 resize-none"
                                            placeholder="Write your greeting..."
                                        />
                                    )}
                                    <button
                                        onClick={handleSaveGreeting}
                                        disabled={isSavingGreeting || (greetingType === 'custom' && !customGreeting.trim())}
                                        className="w-full py-2 bg-blue-600 text-white rounded-lg font-bold text-sm hover:bg-blue-700 disabled:opacity-50"
                                    >
                                        {isSavingGreeting ? 'Saving...' : 'Save Greeting'}
                                    </button>
                                </div>
                            </div>
                        </div>
                    </div>
                )}

                {activeTab === 'products' && (
                    <div className="max-w-5xl mx-auto">
                        <div className="flex justify-between items-center mb-6">
                            <h2 className="text-xl font-bold text-gray-800">Your Products</h2>
                            <button onClick={() => setShowAddProduct(!showAddProduct)} className="flex items-center gap-2 bg-blue-600 text-white px-4 py-2 rounded-lg font-bold hover:bg-blue-700 transition">
                                {showAddProduct ? 'Cancel' : <><Plus size={18} /> Add Product</>}
                            </button>
                        </div>

                        {showAddProduct && (
                            <div className="bg-white p-6 rounded-xl shadow-md border border-gray-200 mb-8 animate-fade-in-down">
                                <h3 className="font-bold text-lg mb-4">Add New Product</h3>
                                <form onSubmit={handleAddProduct} className="grid grid-cols-1 md:grid-cols-2 gap-4">
                                    <input type="text" placeholder="Product Name" required className="p-3 border rounded-lg w-full" value={productForm.name} onChange={e => setProductForm({ ...productForm, name: e.target.value })} />
                                    <input type="text" placeholder="Category" className="p-3 border rounded-lg w-full" value={productForm.category} onChange={e => setProductForm({ ...productForm, category: e.target.value })} />
                                    <div className="flex gap-2">
                                        <input type="number" placeholder="Price" required className="p-3 border rounded-lg w-full" value={productForm.price} onChange={e => setProductForm({ ...productForm, price: e.target.value })} />
                                        <select className="p-3 border rounded-lg" value={productForm.currency} onChange={e => setProductForm({ ...productForm, currency: e.target.value })}>
                                            <option value="INR">INR</option>
                                            <option value="USD">USD</option>
                                        </select>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <input type="checkbox" id="stock" checked={productForm.inStock} onChange={e => setProductForm({ ...productForm, inStock: e.target.checked })} className="w-5 h-5 text-blue-600" />
                                        <label htmlFor="stock" className="font-medium text-gray-700">In Stock</label>
                                    </div>
                                    <textarea placeholder="Description" rows={3} className="md:col-span-2 p-3 border rounded-lg w-full" value={productForm.description} onChange={e => setProductForm({ ...productForm, description: e.target.value })} />
                                    <button type="submit" className="md:col-span-2 bg-green-600 text-white py-3 rounded-lg font-bold hover:bg-green-700">Save Product</button>
                                </form>
                            </div>
                        )}

                        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                            {products.length === 0 ? (
                                <div className="col-span-full text-center py-10 text-gray-500">No products added yet.</div>
                            ) : (
                                products.map(p => (
                                    <div key={p._id} className="bg-white rounded-xl shadow-sm border border-gray-200 p-4 hover:shadow-md transition">
                                        <div className="flex justify-between items-start mb-2">
                                            <h4 className="font-bold text-gray-900">{p.name}</h4>
                                            <span className={`text-xs px-2 py-1 rounded font-bold ${p.inStock ? 'bg-green-100 text-green-800' : 'bg-red-100 text-red-800'}`}>
                                                {p.inStock ? 'In Stock' : 'Out Stock'}
                                            </span>
                                        </div>
                                        <p className="text-gray-600 text-sm mb-3 line-clamp-2">{p.description}</p>
                                        <div className="flex justify-between items-center mt-auto">
                                            <span className="font-black text-lg text-blue-600">{p.currency} {p.price}</span>
                                            <button onClick={() => handleDeleteProduct(p._id)} className="text-red-500 hover:bg-red-50 p-2 rounded-lg"><Trash2 size={18} /></button>
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
                <div className="fixed inset-0 bg-black/60 grid place-items-center z-50">
                    <div className="bg-white p-6 rounded-xl max-w-sm w-full mx-4">
                        <h3 className="text-xl font-bold mb-2">Delete Product?</h3>
                        <p className="text-gray-600 mb-6">This action cannot be undone.</p>
                        <div className="flex gap-3">
                            <button onClick={() => setConfirmDialog({ show: false, productId: null })} className="flex-1 py-2 bg-gray-200 rounded-lg font-bold">Cancel</button>
                            <button onClick={confirmDelete} className="flex-1 py-2 bg-red-600 text-white rounded-lg font-bold hover:bg-red-700">Delete</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    );
}
