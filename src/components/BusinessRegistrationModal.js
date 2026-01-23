import { useState } from 'react';
import axios from 'axios';
import { API_BASE } from '../api';
import { useAuth } from '../context/AuthContext';

export default function BusinessRegistrationModal({ open, onClose, onSuccess }) {
    const { user, refreshUser } = useAuth();
    const [step, setStep] = useState(1);
    const [loading, setLoading] = useState(false);
    const [formData, setFormData] = useState({
        businessName: '',
        category: '',
        description: '',
        email: '',
        website: '',
        address: '',
        mapLink: '',
        businessHours: {
            monday: { open: '09:00', close: '17:00', closed: false },
            tuesday: { open: '09:00', close: '17:00', closed: false },
            wednesday: { open: '09:00', close: '17:00', closed: false },
            thursday: { open: '09:00', close: '17:00', closed: false },
            friday: { open: '09:00', close: '17:00', closed: false },
            saturday: { open: '09:00', close: '17:00', closed: false },
            sunday: { open: '09:00', close: '17:00', closed: true }
        },
        logo: '',
        coverImage: ''
    });

    const categories = [
        'Restaurant & Food',
        'Retail & Shopping',
        'Services',
        'Healthcare',
        'Education',
        'Technology',
        'Entertainment',
        'Real Estate',
        'Other'
    ];

    if (!open) return null;

    const handleChange = (field, value) => {
        setFormData(prev => ({ ...prev, [field]: value }));
    };

    const handleHoursChange = (day, field, value) => {
        setFormData(prev => ({
            ...prev,
            businessHours: {
                ...prev.businessHours,
                [day]: { ...prev.businessHours[day], [field]: value }
            }
        }));
    };

    const handleSubmit = async () => {
        setLoading(true);
        try {
            await axios.post(`${API_BASE}/business/register`, formData, {
                headers: { Authorization: `Bearer ${user?.token}` }
            });

            // Refresh user data to update isBusiness flag
            await refreshUser();

            alert('Business registration submitted! Your application is pending admin approval.');
            onSuccess?.();
            onClose();
        } catch (error) {
            console.error('Business registration error:', error);
            alert(error.response?.data?.message || 'Registration failed');
        } finally {
            setLoading(false);
        }
    };

    const nextStep = () => {
        if (step === 1 && (!formData.businessName || !formData.category)) {
            alert('Please fill in business name and category');
            return;
        }
        setStep(prev => Math.min(prev + 1, 5));
    };

    const prevStep = () => setStep(prev => Math.max(prev - 1, 1));

    return (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm grid place-items-center z-50 p-4">
            <div className="bg-white rounded-2xl shadow-2xl w-full max-w-2xl max-h-[90vh] overflow-y-auto">
                {/* Header */}
                <div className="sticky top-0 bg-gradient-to-r from-primary to-primary-light text-white p-6 rounded-t-2xl">
                    <div className="flex items-center justify-between">
                        <div>
                            <h2 className="text-2xl font-black">Business Registration</h2>
                            <p className="text-sm opacity-90">Step {step} of 5</p>
                        </div>
                        <button onClick={onClose} className="p-2 hover:bg-white/20 rounded-lg transition-colors">
                            <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                        </button>
                    </div>
                    {/* Progress Bar */}
                    <div className="mt-4 h-2 bg-white/20 rounded-full overflow-hidden">
                        <div className="h-full bg-white rounded-full transition-all duration-300" style={{ width: `${(step / 5) * 100}%` }} />
                    </div>
                </div>

                {/* Content */}
                <div className="p-6">
                    {/* Step 1: Basic Info */}
                    {step === 1 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-primary">Basic Information</h3>
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">Business Name *</label>
                                <input
                                    type="text"
                                    value={formData.businessName}
                                    onChange={(e) => handleChange('businessName', e.target.value)}
                                    className="w-full p-3 border border-background-dark rounded-xl focus:ring-2 focus:ring-primary outline-none text-black"
                                    placeholder="Enter your business name"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">Category *</label>
                                <select
                                    value={formData.category}
                                    onChange={(e) => handleChange('category', e.target.value)}
                                    className="w-full p-3 border border-background-dark rounded-xl focus:ring-2 focus:ring-primary outline-none text-black"
                                >
                                    <option value="">Select a category</option>
                                    {categories.map(cat => (
                                        <option key={cat} value={cat}>{cat}</option>
                                    ))}
                                </select>
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">Description</label>
                                <textarea
                                    value={formData.description}
                                    onChange={(e) => handleChange('description', e.target.value)}
                                    className="w-full p-3 border border-background-dark rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none text-black"
                                    rows={4}
                                    placeholder="Tell us about your business..."
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 2: Contact Info */}
                    {step === 2 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-primary">Contact Information</h3>
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">Email</label>
                                <input
                                    type="email"
                                    value={formData.email}
                                    onChange={(e) => handleChange('email', e.target.value)}
                                    className="w-full p-3 border border-background-dark rounded-xl focus:ring-2 focus:ring-primary outline-none text-black"
                                    placeholder="business@example.com"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">Website</label>
                                <input
                                    type="url"
                                    value={formData.website}
                                    onChange={(e) => handleChange('website', e.target.value)}
                                    className="w-full p-3 border border-background-dark rounded-xl focus:ring-2 focus:ring-primary outline-none text-black"
                                    placeholder="https://yourwebsite.com"
                                />
                            </div>
                        </div>
                    )}

                    {/* Step 3: Location */}
                    {step === 3 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-primary">Location</h3>
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">Address</label>
                                <textarea
                                    value={formData.address}
                                    onChange={(e) => handleChange('address', e.target.value)}
                                    className="w-full p-3 border border-background-dark rounded-xl focus:ring-2 focus:ring-primary outline-none resize-none text-black"
                                    rows={3}
                                    placeholder="Enter your business address"
                                />
                            </div>
                            <div>
                                <label className="block text-sm font-bold text-black mb-2">Google Maps Link</label>
                                <input
                                    type="url"
                                    value={formData.mapLink}
                                    onChange={(e) => handleChange('mapLink', e.target.value)}
                                    className="w-full p-3 border border-background-dark rounded-xl focus:ring-2 focus:ring-primary outline-none text-black"
                                    placeholder="Paste Google Maps link"
                                />
                                <p className="text-xs text-gray-600 mt-1">Share your location on Google Maps and paste the link here</p>
                            </div>
                        </div>
                    )}

                    {/* Step 4: Business Hours */}
                    {step === 4 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-black mb-4">Business Hours</h3>
                            {Object.keys(formData.businessHours).map(day => (
                                <div key={day} className="flex items-center gap-4 p-3 bg-background rounded-xl">
                                    <div className="w-24 font-bold text-black capitalize">{day}</div>
                                    <input
                                        type="checkbox"
                                        checked={!formData.businessHours[day].closed}
                                        onChange={(e) => handleHoursChange(day, 'closed', !e.target.checked)}
                                        className="w-5 h-5"
                                    />
                                    {!formData.businessHours[day].closed && (
                                        <>
                                            <input
                                                type="time"
                                                value={formData.businessHours[day].open}
                                                onChange={(e) => handleHoursChange(day, 'open', e.target.value)}
                                                className="px-3 py-2 border border-background-dark rounded-lg text-black"
                                            />
                                            <span className="text-gray-600">to</span>
                                            <input
                                                type="time"
                                                value={formData.businessHours[day].close}
                                                onChange={(e) => handleHoursChange(day, 'close', e.target.value)}
                                                className="px-3 py-2 border border-background-dark rounded-lg text-black"
                                            />
                                        </>
                                    )}
                                    {formData.businessHours[day].closed && (
                                        <span className="text-gray-500 italic">Closed</span>
                                    )}
                                </div>
                            ))}
                        </div>
                    )}

                    {/* Step 5: Images & Review */}
                    {step === 5 && (
                        <div className="space-y-4">
                            <h3 className="text-lg font-bold text-black">Review & Submit</h3>
                            <div className="bg-background p-4 rounded-xl space-y-2 text-black">
                                <div className="flex justify-between">
                                    <span className="font-bold">Business Name:</span>
                                    <span>{formData.businessName}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold">Category:</span>
                                    <span>{formData.category}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold">Email:</span>
                                    <span>{formData.email || 'Not provided'}</span>
                                </div>
                                <div className="flex justify-between">
                                    <span className="font-bold">Website:</span>
                                    <span>{formData.website || 'Not provided'}</span>
                                </div>
                            </div>
                            <div className="bg-yellow-50 border border-yellow-200 rounded-xl p-4">
                                <p className="text-sm text-yellow-800">
                                    <strong>Note:</strong> Your business registration will be reviewed by our admin team.
                                    You'll be notified once approved. This usually takes 1-2 business days.
                                </p>
                            </div>
                        </div>
                    )}
                </div>

                {/* Footer */}
                <div className="sticky bottom-0 bg-white border-t border-background-dark p-6 rounded-b-2xl flex justify-between">
                    <button
                        onClick={prevStep}
                        disabled={step === 1}
                        className="px-6 py-3 bg-background text-primary rounded-xl font-bold disabled:opacity-50 disabled:cursor-not-allowed hover:bg-background-dark transition-colors"
                    >
                        Previous
                    </button>
                    {step < 5 ? (
                        <button
                            onClick={nextStep}
                            className="px-6 py-3 bg-primary text-white rounded-xl font-bold hover:bg-primary-light transition-colors"
                        >
                            Next
                        </button>
                    ) : (
                        <button
                            onClick={handleSubmit}
                            disabled={loading}
                            className="px-6 py-3 bg-green-500 text-white rounded-xl font-bold hover:bg-green-600 transition-colors disabled:opacity-50"
                        >
                            {loading ? 'Submitting...' : 'Submit Registration'}
                        </button>
                    )}
                </div>
            </div>
        </div>
    );
}
