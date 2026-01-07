import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Customer, DebtType, DebtImage } from '../types';
import { fetchCurrentGoldPrice } from '../services/goldService';
import { calculateInstallments, formatCurrency } from '../utils/calculations';
import { Camera, Save, Loader2, Coins, Wallet, ExternalLink, RefreshCw, Clock, Tag, Calendar, Plus } from 'lucide-react';

const AddCustomer: React.FC<{ onAdd: (customer: Customer) => void }> = ({ onAdd }) => {
  const navigate = useNavigate();
  const [loading, setLoading] = useState(false);
  const [goldPrice, setGoldPrice] = useState<number | null>(null);
  const [goldSource, setGoldSource] = useState<string | undefined>(undefined);
  const [lastUpdated, setLastUpdated] = useState<string | undefined>(undefined);
  const [isCached, setIsCached] = useState(false);

  // Form State
  const [name, setName] = useState('');
  const [phone, setPhone] = useState('');
  const [debtLabel, setDebtLabel] = useState('الفاتورة الأولى');
  const [startDate, setStartDate] = useState(new Date().toISOString().split('T')[0]);
  const [amountStr, setAmountStr] = useState<string>('');
  const [type, setType] = useState<DebtType>(DebtType.CASH);
  const [months, setMonths] = useState<number>(12);
  const [images, setImages] = useState<string[]>([]);

  const amount = parseFloat(amountStr) || 0;

  const getPrice = async (force: boolean = false) => {
    setLoading(true);
    const data = await fetchCurrentGoldPrice(force);
    setGoldPrice(data.price);
    setGoldSource(data.sourceUrl);
    setLastUpdated(data.lastUpdated);
    setIsCached(data.isFromCache);
    setLoading(false);
  };

  useEffect(() => {
    if (type === DebtType.GOLD && !goldPrice) {
      getPrice();
    }
  }, [type, goldPrice]);

  const handleAmountChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value;
    if (val === '' || /^\d*\.?\d*$/.test(val)) {
      setAmountStr(val);
    }
  };

  const handleImageChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = Array.from(e.target.files || []) as File[];
    if (files.length + images.length > 20) {
      alert("الحد الأقصى 20 صورة فقط");
      return;
    }

    Promise.all(files.map(file => {
      return new Promise<string>((resolve) => {
        const reader = new FileReader();
        reader.onloadend = () => resolve(reader.result as string);
        reader.readAsDataURL(file);
      });
    })).then(newImages => {
      setImages(prev => [...prev, ...newImages]);
    });
  };

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    if (!name || !phone || amount <= 0) return;

    const goldGrams = type === DebtType.GOLD && goldPrice ? amount / goldPrice : undefined;
    const now = new Date().toISOString();
    const finalStartDate = new Date(startDate).toISOString();

    const formattedImages: DebtImage[] = images.map(img => ({
      id: Math.random().toString(36).substr(2, 9),
      url: img,
      addedAt: now
    }));

    const newDebt = {
      id: Math.random().toString(36).substr(2, 9),
      label: debtLabel || 'الفاتورة الأولى',
      amountInEGP: amount,
      type,
      goldPriceAtRegistration: goldPrice || undefined,
      goldGrams,
      monthsCount: months,
      startDate: finalStartDate,
      installments: calculateInstallments(amount, months, type, goldGrams, startDate),
      history: [],
      images: formattedImages
    };

    const newCustomer: Customer = {
      id: Math.random().toString(36).substr(2, 9),
      name,
      phone,
      createdAt: finalStartDate,
      debts: [newDebt]
    };

    onAdd(newCustomer);
    navigate('/');
  };

  return (
    <div className="max-w-2xl mx-auto space-y-8">
      <header>
        <h1 className="text-3xl font-bold text-slate-800 text-center md:text-right">إضافة عميل جديد</h1>
        <p className="text-slate-500 text-lg text-center md:text-right">سجل بيانات العميل والمديونية الأولى</p>
      </header>

      <form onSubmit={handleSubmit} className="bg-white p-8 rounded-3xl border border-slate-200 shadow-xl space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="space-y-2">
            <label className="block font-bold text-slate-700">اسم العميل</label>
            <input
              required
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-bold transition-all focus:border-indigo-200"
              placeholder="مثال: محمد أحمد"
              value={name}
              onChange={e => setName(e.target.value)}
            />
          </div>
          <div className="space-y-2">
            <label className="block font-bold text-slate-700">رقم الهاتف</label>
            <input
              required
              inputMode="numeric"
              className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none font-mono bg-white text-slate-900 font-bold transition-all focus:border-indigo-200"
              placeholder="01xxxxxxxxx"
              value={phone}
              onChange={e => setPhone(e.target.value.replace(/\D/g, ''))}
            />
          </div>
        </div>

        <div className="pt-4">
          <label className="block font-black text-slate-800 text-xl mb-4 text-center md:text-right border-r-4 border-indigo-600 pr-3">تفاصيل المديونية الأولى</label>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mb-6">
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-bold text-slate-700">
                <Tag size={18} className="text-indigo-500" />
                اسم الفاتورة (للمتابعة)
              </label>
              <input
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-bold transition-all"
                placeholder="مثال: الفاتورة الأولى، طقم فرح، إلخ"
                value={debtLabel}
                onChange={e => setDebtLabel(e.target.value)}
              />
            </div>
            <div className="space-y-2">
              <label className="flex items-center gap-2 font-bold text-slate-700">
                <Calendar size={18} className="text-indigo-500" />
                تاريخ العملية
              </label>
              <input
                type="date"
                required
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-bold transition-all"
                value={startDate}
                onChange={e => setStartDate(e.target.value)}
              />
            </div>
          </div>

          <div className="flex flex-col sm:flex-row gap-4 mb-6">
            <button
              type="button"
              onClick={() => setType(DebtType.CASH)}
              className={`flex-1 p-5 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all duration-300 font-black ${type === DebtType.CASH
                ? 'border-indigo-600 bg-indigo-50 text-indigo-700 shadow-md transform scale-[1.02]'
                : 'border-slate-100 bg-white text-slate-400 hover:border-indigo-200 hover:text-indigo-400'
                }`}
            >
              <Wallet size={24} />
              <span>مبلغ نقدي</span>
            </button>
            <button
              type="button"
              onClick={() => {
                setType(DebtType.GOLD);
                if (!goldPrice) getPrice();
              }}
              className={`flex-1 p-5 rounded-2xl border-2 flex items-center justify-center gap-3 transition-all duration-300 font-black ${type === DebtType.GOLD
                ? 'border-amber-500 bg-amber-50 text-amber-700 shadow-md transform scale-[1.02]'
                : 'border-slate-100 bg-white text-slate-400 hover:border-amber-200 hover:text-amber-400'
                }`}
            >
              <Coins size={24} />
              <span>جرام ذهب ع24</span>
            </button>
          </div>

          <div className="space-y-2">
            <label className="block font-bold text-slate-700">المبلغ الإجمالي (بالجنيه)</label>
            <div className="relative">
              <input
                type="text"
                inputMode="decimal"
                required
                className="w-full px-4 py-4 border-2 border-slate-100 rounded-2xl focus:ring-2 focus:ring-indigo-500 outline-none text-3xl font-black bg-white text-indigo-900 placeholder:text-slate-200 text-center"
                placeholder="0.00"
                value={amountStr}
                onChange={handleAmountChange}
              />
              <span className="absolute left-4 top-1/2 -translate-y-1/2 text-slate-400 font-bold">ج.م</span>
            </div>

            {type === DebtType.GOLD && (
              <div className="mt-4 p-5 bg-amber-50 rounded-2xl border border-amber-200 space-y-3 animate-in fade-in slide-in-from-top-2">
                <div className="flex justify-between items-center">
                  <div className="flex items-center gap-2 text-amber-800 font-black">
                    <Coins size={20} className="text-amber-600" />
                    <span>سعر اليوم المعتمد (عيار 24)</span>
                  </div>
                  <div className="flex items-center gap-2">
                    {isCached && !loading && (
                      <span className="text-[10px] bg-emerald-100 text-emerald-700 px-2 py-1 rounded-full flex items-center gap-1 font-black">
                        <Clock size={12} /> محدث
                      </span>
                    )}
                    <button
                      type="button"
                      onClick={() => getPrice(true)}
                      className="p-2 hover:bg-amber-200 rounded-full transition-colors text-amber-600 bg-white shadow-sm border border-amber-100"
                      title="تحديث السعر يدوياً"
                    >
                      <RefreshCw size={18} className={loading ? 'animate-spin' : ''} />
                    </button>
                  </div>
                </div>

                {loading ? (
                  <div className="flex items-center justify-center p-4 gap-3 text-amber-600 font-bold">
                    <Loader2 className="animate-spin" size={20} />
                    <span>جاري تحديث السعر من السوق...</span>
                  </div>
                ) : goldPrice ? (
                  <div className="space-y-3">
                    <div className="flex justify-between items-center">
                      <p className="text-3xl font-black text-amber-700">{formatCurrency(goldPrice)}</p>
                      <div className="text-left">
                        <p className="text-[10px] text-amber-500 font-bold">آخر تحديث: {lastUpdated}</p>
                        {goldSource && (
                          <a href={goldSource} target="_blank" rel="noreferrer" className="text-[10px] text-indigo-600 font-bold flex items-center gap-1 hover:underline justify-end">
                            المصدر <ExternalLink size={10} />
                          </a>
                        )}
                      </div>
                    </div>

                    <div className="pt-3 border-t border-amber-200 flex justify-between items-center">
                      <p className="text-base text-amber-900 font-bold">
                        إجمالي الذهب: <span className="font-black text-indigo-700 text-xl">{(amount / goldPrice).toFixed(2)} جرام</span>
                      </p>
                    </div>
                  </div>
                ) : null}
              </div>
            )}
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 mt-6">
            <div className="space-y-2">
              <label className="block font-bold text-slate-700">مدة التقسيط</label>
              <select
                className="w-full px-4 py-3 border-2 border-slate-100 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none bg-white text-slate-900 font-bold appearance-none cursor-pointer"
                value={months}
                onChange={e => setMonths(Number(e.target.value))}
              >
                {[3, 6, 9, 12, 18, 24, 36].map(m => (
                  <option key={m} value={m}>{m} شهر</option>
                ))}
              </select>
            </div>

            <div className="space-y-2">
              <div className="flex justify-between items-center">
                <label className="block font-bold text-slate-700">صور المرفقات (حد أقصى 20)</label>
                <span className={`text-[10px] font-black px-2 py-0.5 rounded-full ${images.length >= 20 ? 'bg-red-100 text-red-600' : 'bg-indigo-100 text-indigo-600'}`}>
                  {images.length} / 20
                </span>
              </div>
              <div className="flex flex-wrap gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative w-16 h-16 rounded-xl overflow-hidden border-2 border-indigo-100 group shadow-sm">
                    <img src={img} className="w-full h-full object-cover" alt="" />
                    <button
                      type="button"
                      onClick={() => setImages(images.filter((_, i) => i !== idx))}
                      className="absolute inset-0 bg-red-500/90 text-white opacity-0 group-hover:opacity-100 transition-opacity flex items-center justify-center font-black text-[10px]"
                    >
                      حذف
                    </button>
                  </div>
                ))}
                {images.length < 20 && (
                  <div className="flex gap-2">
                    <label className="w-16 h-16 border-2 border-dashed border-indigo-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-indigo-50 hover:border-indigo-300 transition-all text-indigo-600 bg-indigo-50/50 group">
                      <Camera size={20} className="group-hover:scale-110 transition-transform" />
                      <span className="text-[8px] mt-1 font-black leading-none text-center">تصوير<br />مباشر</span>
                      <input type="file" accept="image/*" capture="environment" className="hidden" onChange={handleImageChange} />
                    </label>

                    <label className="w-16 h-16 border-2 border-dashed border-slate-200 rounded-xl flex flex-col items-center justify-center cursor-pointer hover:bg-slate-100 hover:border-slate-300 transition-all text-slate-400 bg-slate-50 group">
                      <Plus size={20} className="group-hover:rotate-90 transition-transform" />
                      <span className="text-[8px] mt-1 font-black leading-none text-center">من<br />المعرض</span>
                      <input type="file" accept="image/*" multiple className="hidden" onChange={handleImageChange} />
                    </label>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>

        <button
          disabled={loading || (type === DebtType.GOLD && !goldPrice)}
          className="w-full bg-indigo-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-indigo-700 transition-all flex items-center justify-center gap-3 shadow-xl shadow-indigo-100 disabled:opacity-50 active:scale-[0.98] mt-4"
        >
          {loading ? <Loader2 className="animate-spin" size={24} /> : <Save size={24} />}
          حفظ البيانات والبدء
        </button>
      </form>
    </div>
  );
};

export default AddCustomer;
