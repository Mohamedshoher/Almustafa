import React, { useState } from 'react';
import { Lock, Eye, EyeOff } from 'lucide-react';

interface LoginProps {
    onLogin: () => void;
}

const Login: React.FC<LoginProps> = ({ onLogin }) => {
    const [password, setPassword] = useState('');
    const [showPassword, setShowPassword] = useState(false);
    const [error, setError] = useState('');

    // الرقم السري الافتراضي - يمكن تغييره من هنا
    const ADMIN_PASSWORD = '1973';

    const handleSubmit = (e: React.FormEvent) => {
        e.preventDefault();

        if (password === ADMIN_PASSWORD) {
            // حفظ حالة تسجيل الدخول في localStorage
            localStorage.setItem('isAuthenticated', 'true');
            onLogin();
        } else {
            setError('الرقم السري غير صحيح');
            setPassword('');
        }
    };

    return (
        <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-blue-500 via-indigo-600 to-purple-600 p-4">
            <div className="w-full max-w-md">
                {/* Logo/Icon */}
                <div className="text-center mb-8">
                    <div className="inline-flex items-center justify-center w-20 h-20 bg-white rounded-full shadow-lg mb-4">
                        <Lock className="text-indigo-600" size={40} />
                    </div>
                    <h1 className="text-3xl font-bold text-white mb-2">نظام المصطفى</h1>
                    <p className="text-blue-100">إدارة المديونيات والأقساط</p>
                </div>

                {/* Login Form */}
                <div className="bg-white rounded-2xl shadow-2xl p-8">
                    <h2 className="text-2xl font-bold text-gray-800 mb-6 text-center">
                        تسجيل الدخول
                    </h2>

                    <form onSubmit={handleSubmit} className="space-y-6">
                        {/* Password Input */}
                        <div>
                            <label htmlFor="password" className="block text-sm font-semibold text-gray-700 mb-2">
                                الرقم السري
                            </label>
                            <div className="relative">
                                <input
                                    id="password"
                                    type={showPassword ? 'text' : 'password'}
                                    value={password}
                                    onChange={(e) => {
                                        setPassword(e.target.value);
                                        setError('');
                                    }}
                                    className="w-full px-4 py-3 pr-12 border-2 border-gray-300 rounded-lg focus:ring-2 focus:ring-indigo-500 focus:border-indigo-500 transition-all"
                                    placeholder="أدخل الرقم السري"
                                    autoFocus
                                    required
                                />
                                <button
                                    type="button"
                                    onClick={() => setShowPassword(!showPassword)}
                                    className="absolute left-3 top-1/2 transform -translate-y-1/2 text-gray-500 hover:text-gray-700 transition-colors"
                                >
                                    {showPassword ? <EyeOff size={20} /> : <Eye size={20} />}
                                </button>
                            </div>
                        </div>

                        {/* Error Message */}
                        {error && (
                            <div className="bg-red-50 border border-red-200 text-red-700 px-4 py-3 rounded-lg text-center">
                                {error}
                            </div>
                        )}

                        {/* Submit Button */}
                        <button
                            type="submit"
                            className="w-full bg-gradient-to-r from-indigo-600 to-purple-600 text-white font-bold py-3 px-4 rounded-lg hover:from-indigo-700 hover:to-purple-700 focus:outline-none focus:ring-2 focus:ring-indigo-500 focus:ring-offset-2 transition-all transform active:scale-95"
                        >
                            دخول
                        </button>
                    </form>

                    {/* Footer Note */}
                    <div className="mt-6 text-center">
                        <p className="text-xs text-gray-400 mt-2">
                            يمكنك تغيير الرقم السري من ملف Login.tsx
                        </p>
                    </div>
                </div>

                {/* Footer */}
                <div className="text-center mt-6">
                    <p className="text-blue-100 text-sm">
                        © 2026 نظام المصطفى - جميع الحقوق محفوظة
                    </p>
                </div>
            </div>
        </div>
    );
};

export default Login;
