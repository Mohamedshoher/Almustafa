
import React, { useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { Customer, DebtType, PaymentRecord, Debt, Installment, DebtImage } from '../types';
import { formatCurrency, formatGrams, getRemainingBalance, getPaidAmount, applyPaymentToDebt, adjustDebtAmount } from '../utils/calculations';
import { Phone, MessageSquare, CheckCircle, Calendar, Package, ArrowRight, Fullscreen, PieChart, Wallet, CreditCard, X, Clock, History, PlusCircle, AlertTriangle, Archive, Trash2, RotateCcw, Coins, BellRing, FilePlus, Camera, Edit2, Check, ChevronRight, ChevronLeft, RefreshCw, Image as ImageIcon } from 'lucide-react';

const CustomerDetail: React.FC<{
  customers: Customer[],
  onUpdate: (id: string, updatedCustomer: Customer) => void,
  onDelete: (id: string) => void,
  onToggleArchive: (id: string) => void
}> = ({ customers, onUpdate, onDelete, onToggleArchive }) => {
  const { id } = useParams();
  const navigate = useNavigate();
  const customer = customers.find(c => c.id === id);
  const [viewerImages, setViewerImages] = useState<{ images: DebtImage[], index: number } | null>(null);

  const [paymentModalDebtId, setPaymentModalDebtId] = useState<string | null>(null);
  const [paymentInput, setPaymentInput] = useState<string>('');
  const [adjustModalDebtId, setAdjustModalDebtId] = useState<string | null>(null);
  const [adjustInput, setAdjustInput] = useState<string>('');
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [showDateForInst, setShowDateForInst] = useState<string | null>(null);

  // لتمكين تعديل اسم الفاتورة
  const [editingLabelDebtId, setEditingLabelDebtId] = useState<string | null>(null);
  const [tempLabel, setTempLabel] = useState('');

  if (!customer) return <div className="text-center py-20 font-bold text-slate-400">العميل غير موجود</div>;

  const getWhatsAppNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
  };

  const handleUpdateLabel = (debtId: string) => {
    const updatedDebts = customer.debts.map(d =>
      d.id === debtId ? { ...d, label: tempLabel || d.label } : d
    );
    onUpdate(customer.id, { ...customer, debts: updatedDebts });
    setEditingLabelDebtId(null);
  };

  const handleDeleteDebt = (debtId: string) => {
    if (window.confirm('هل أنت متأكد من حذف هذه الفاتورة نهائياً؟ سيتم حذف جميع الأقساط والسجلات المرتبطة بها.')) {
      const updatedDebts = customer.debts.filter(d => d.id !== debtId);
      onUpdate(customer.id, { ...customer, debts: updatedDebts });
    }
  };

  const handleAddImages = (debtId: string, files: FileList | null) => {
    if (!files) return;
    const debt = customer.debts.find(d => d.id === debtId);
    if (!debt) return;

    if (debt.images.length + files.length > 20) {
      alert("الحد الأقصى للمرفقات هو 20 صورة");
      return;
    }

    const now = new Date().toISOString();
    const fileArray = Array.from(files);

    fileArray.forEach(file => {
      const reader = new FileReader();
      reader.onloadend = () => {
        const newImage: DebtImage = {
          id: Math.random().toString(36).substr(2, 9),
          url: reader.result as string,
          addedAt: now
        };

        const updatedDebts = customer.debts.map(d =>
          d.id === debtId ? { ...d, images: [...d.images, newImage] } : d
        );
        onUpdate(customer.id, { ...customer, debts: updatedDebts });
      };
      reader.readAsDataURL(file);
    });
  };

  const handleDeleteImage = (debtId: string, imageId: string) => {
    if (!window.confirm('هل أنت متأكد من حذف هذه الصورة المرفقة؟')) return;

    const updatedDebts = customer.debts.map(d => {
      if (d.id === debtId) {
        return { ...d, images: d.images.filter(img => img.id !== imageId) };
      }
      return d;
    });

    onUpdate(customer.id, { ...customer, debts: updatedDebts });

    if (viewerImages) {
      const remainingImages = viewerImages.images.filter(img => img.id !== imageId);
      if (remainingImages.length === 0) {
        setViewerImages(null);
      } else {
        const newIndex = Math.min(viewerImages.index, remainingImages.length - 1);
        setViewerImages({ images: remainingImages, index: newIndex });
      }
    }
  };

  const handleReplaceImage = (debtId: string, imageId: string, file: File | null) => {
    if (!file) return;

    const reader = new FileReader();
    reader.onloadend = () => {
      const now = new Date().toISOString();
      const updatedDebts = customer.debts.map(d => {
        if (d.id === debtId) {
          const updatedImages = d.images.map(img =>
            img.id === imageId ? { ...img, url: reader.result as string, addedAt: now } : img
          );
          return { ...d, images: updatedImages };
        }
        return d;
      });

      onUpdate(customer.id, { ...customer, debts: updatedDebts });

      if (viewerImages) {
        const updatedImagesForViewer = viewerImages.images.map(img =>
          img.id === imageId ? { ...img, url: reader.result as string, addedAt: now } : img
        );
        setViewerImages({ ...viewerImages, images: updatedImagesForViewer });
      }
    };
    reader.readAsDataURL(file);
  };

  const handleCustomPayment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!paymentModalDebtId || !paymentInput) return;
    const amount = parseFloat(paymentInput);
    if (isNaN(amount) || amount <= 0) return;
    const updatedDebts = customer.debts.map(debt => debt.id === paymentModalDebtId ? applyPaymentToDebt(debt, amount) : debt);
    onUpdate(customer.id, { ...customer, debts: updatedDebts });
    setPaymentModalDebtId(null);
    setPaymentInput('');
  };

  const handleAdjustment = (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustModalDebtId || !adjustInput || !adjustReason) return;
    const amount = parseFloat(adjustInput);
    if (isNaN(amount) || amount <= 0) return;
    const updatedDebts = customer.debts.map(debt => debt.id === adjustModalDebtId ? adjustDebtAmount(debt, amount, adjustReason) : debt);
    onUpdate(customer.id, { ...customer, debts: updatedDebts });
    setAdjustModalDebtId(null);
    setAdjustInput('');
    setAdjustReason('');
  };

  const toggleInstallment = (debtId: string, installmentId: string) => {
    const updatedDebts = customer.debts.map(debt => {
      if (debt.id === debtId) {
        const now = new Date().toISOString();
        const instToUpdate = debt.installments.find(i => i.id === installmentId);
        if (!instToUpdate) return debt;
        const isNowPaid = !instToUpdate.paid;
        const paidValue = isNowPaid ? instToUpdate.amount : 0;
        const newInstallments = debt.installments.map(inst => inst.id === installmentId ? { ...inst, paid: isNowPaid, paidAmount: paidValue, paymentDate: isNowPaid ? now : undefined } : inst);
        let newHistory = debt.history || [];
        if (isNowPaid) {
          const egpValue = debt.type === DebtType.GOLD && debt.goldPriceAtRegistration ? instToUpdate.amount * debt.goldPriceAtRegistration : instToUpdate.amount;
          newHistory = [...newHistory, { id: Math.random().toString(36).substr(2, 9), date: now, amount: instToUpdate.amount, type: 'PAYMENT', note: `سداد القسط رقم ${debt.installments.indexOf(instToUpdate) + 1} (نقداً: ${formatCurrency(egpValue)})`, relatedId: installmentId }];
        } else {
          newHistory = newHistory.filter(record => record.relatedId !== installmentId);
        }
        return { ...debt, installments: newInstallments, history: newHistory };
      }
      return debt;
    });
    onUpdate(customer.id, { ...customer, debts: updatedDebts });
  };

  const sendWhatsAppReceipt = (record: PaymentRecord, debt: Debt) => {
    const remaining = getRemainingBalance(debt);
    const goldSuffix = debt.type === DebtType.GOLD ? " عيار 24" : "";
    const totalAmount = debt.type === DebtType.GOLD ? formatGrams(debt.goldGrams!) + goldSuffix : formatCurrency(debt.amountInEGP);
    const paidAmount = debt.type === DebtType.GOLD ? formatGrams(record.amount) + goldSuffix : formatCurrency(record.amount);
    const remainingText = debt.type === DebtType.GOLD ? formatGrams(remaining) + goldSuffix : formatCurrency(remaining);
    const typeText = record.type === 'INCREASE' ? 'زيادة حساب' : 'دفعة سداد';
    const dateText = new Date(record.date).toLocaleDateString('ar-EG');
    const message = `السلام عليكم أ/ ${customer.name}%0A%0Aتم تسجيل *${typeText}* بمبلغ *${paidAmount}*%0Aبتاريخ: ${dateText}%0A%0Aإجمالي المديونية: ${totalAmount}%0Aالمتبقي حالياً: *${remainingText}*%0A%0Aشكراً لتعاملك معنا.`;
    const whatsappUrl = `https://wa.me/${getWhatsAppNumber(customer.phone)}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const sendInstallmentReminder = (inst: Installment, debt: Debt) => {
    const monthYear = new Date(inst.dueDate).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' });
    const amountText = debt.type === DebtType.GOLD ? formatGrams(inst.amount) + " ذهب عيار 24" : formatCurrency(inst.amount);
    const message = `السلام عليكم أ/ ${customer.name}%0A%0Aنذكر سيادتكم بموعد استحقاق القسط الخاص بشهر *${monthYear}*%0Aالقيمة المطلوبة: *${amountText}*%0A%0Aنسأل الله العلي القدير أن يفتح لكم أبواب الرزق وييسر لكم أمركم ويبارك في مالكم.%0A%0Aنرجو التكرم بسرعة السداد لضمان انتظام الحساب. شاكرين لكم حسن تعاونكم معنا.`;
    const whatsappUrl = `https://wa.me/${getWhatsAppNumber(customer.phone)}?text=${message}`;
    window.open(whatsappUrl, '_blank');
  };

  const currentPaymentDebt = customer.debts.find(d => d.id === paymentModalDebtId);

  return (
    <div className="space-y-8 pb-20">
      <header className="flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="flex items-center gap-4">
          <Link to="/customers" className="p-3 bg-white rounded-full border shadow-sm text-slate-400 hover:text-indigo-600 transition-colors"><ArrowRight size={24} /></Link>
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-3xl font-bold text-slate-800">{customer.name}</h1>
              {customer.isArchived && <span className="bg-amber-100 text-amber-700 px-3 py-1 rounded-full text-xs font-bold border border-amber-200">مؤرشف</span>}
            </div>
            <p className="text-slate-500 font-medium font-mono">{customer.phone}</p>
          </div>
        </div>

        <div className="flex items-center gap-1.5 md:gap-3 bg-white p-1.5 md:p-2 rounded-2xl border shadow-sm self-center md:self-center overflow-x-auto no-scrollbar">
          <Link
            to={`/customer/${customer.id}/add-debt`}
            className="flex items-center gap-2 px-3 md:px-5 py-2.5 bg-indigo-600 text-white rounded-xl text-sm font-black hover:bg-indigo-700 transition-all shadow-lg shadow-indigo-100 whitespace-nowrap"
            title="إضافة فاتورة جديدة"
          >
            <FilePlus size={18} />
            <span className="hidden md:inline">إضافة فاتورة جديدة</span>
          </Link>
          <div className="w-px h-8 bg-slate-100 mx-0.5 hidden sm:block"></div>
          <button
            onClick={() => { onToggleArchive(customer.id); if (!customer.isArchived) navigate('/customers'); }}
            className={`flex items-center gap-2 px-3 md:px-4 py-2.5 rounded-xl text-sm font-bold transition-all whitespace-nowrap ${customer.isArchived ? 'bg-indigo-50 text-indigo-700 hover:bg-indigo-100' : 'bg-amber-50 text-amber-700 hover:bg-amber-100'}`}
            title={customer.isArchived ? 'استعادة' : 'أرشفة'}
          >
            {customer.isArchived ? <RotateCcw size={18} /> : <Archive size={18} />}
            <span className="hidden md:inline">{customer.isArchived ? 'استعادة' : 'أرشفة'}</span>
          </button>
          <button
            onClick={() => { onDelete(customer.id); navigate('/customers'); }}
            className="flex items-center gap-2 px-3 md:px-4 py-2.5 bg-red-50 text-red-700 hover:bg-red-100 rounded-xl text-sm font-bold transition-all whitespace-nowrap"
            title="حذف العميل"
          >
            <Trash2 size={18} />
            <span className="hidden md:inline">حذف العميل</span>
          </button>
          <div className="w-px h-8 bg-slate-100 mx-0.5"></div>
          <a href={`tel:${customer.phone}`} className="w-10 h-10 flex-shrink-0 bg-emerald-50 text-emerald-700 rounded-xl flex items-center justify-center hover:bg-emerald-100 transition-colors" title="اتصال هاتف"><Phone size={20} /></a>
          <a href={`https://wa.me/${getWhatsAppNumber(customer.phone)}`} target="_blank" rel="noreferrer" className="w-10 h-10 flex-shrink-0 bg-green-50 text-green-700 rounded-xl flex items-center justify-center hover:bg-green-100 transition-colors" title="واتساب"><MessageSquare size={20} /></a>
        </div>
      </header>

      {customer.debts.length === 0 && (
        <div className="py-20 text-center bg-white rounded-3xl border-2 border-dashed border-slate-200">
          <p className="text-slate-400 font-black text-xl">لا توجد فواتير نشطة لهذا العميل</p>
          <Link to={`/customer/${customer.id}/add-debt`} className="mt-4 inline-flex items-center gap-2 text-indigo-600 font-black hover:underline">
            <FilePlus size={18} /> اضغط هنا لإضافة أول فاتورة
          </Link>
        </div>
      )}

      {[...customer.debts].reverse().map((debt) => {
        const remaining = getRemainingBalance(debt);
        const paid = getPaidAmount(debt);
        const totalPaidCount = debt.installments.filter(i => i.paid).length;
        const percentage = Math.round((paid / (paid + remaining || 1)) * 100);

        return (
          <div key={debt.id} className="space-y-6">
            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden transition-all hover:shadow-xl">
              <div className="p-5 md:p-8 bg-gradient-to-r from-slate-50 to-white border-b flex flex-col md:flex-row md:items-center justify-between gap-6">
                <div className="flex items-center gap-4 w-full md:w-auto">
                  <div className={`w-12 h-12 md:w-14 md:h-14 rounded-2xl flex items-center justify-center shadow-inner flex-shrink-0 ${debt.type === DebtType.GOLD ? 'bg-amber-100 text-amber-600' : 'bg-indigo-100 text-indigo-600'}`}>
                    {debt.type === DebtType.GOLD ? <Coins size={24} /> : <Wallet size={24} />}
                  </div>
                  <div className="min-w-0 flex-1">
                    <div className="flex items-center gap-2 group">
                      {editingLabelDebtId === debt.id ? (
                        <div className="flex items-center gap-2 animate-in fade-in slide-in-from-right-1">
                          <input
                            autoFocus
                            className="text-xl md:text-2xl font-black text-indigo-700 border-b-2 border-indigo-500 outline-none bg-transparent py-0 px-1 w-full"
                            value={tempLabel}
                            onChange={(e) => setTempLabel(e.target.value)}
                            onBlur={() => handleUpdateLabel(debt.id)}
                            onKeyDown={(e) => e.key === 'Enter' && handleUpdateLabel(debt.id)}
                          />
                          <button onClick={() => handleUpdateLabel(debt.id)} className="text-emerald-500 hover:bg-emerald-50 p-1 rounded-lg"><Check size={20} /></button>
                        </div>
                      ) : (
                        <>
                          <h2 className="text-xl md:text-2xl font-bold text-slate-800 truncate">{debt.label || (debt.type === DebtType.GOLD ? 'عقد ذهب' : 'عقد نقدي')}</h2>
                          <div className="flex items-center gap-1 opacity-100 md:opacity-0 group-hover:opacity-100 transition-all">
                            <button
                              onClick={() => { setEditingLabelDebtId(debt.id); setTempLabel(debt.label); }}
                              className="p-1.5 text-slate-300 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg transition-all"
                              title="تعديل الاسم"
                            >
                              <Edit2 size={14} />
                            </button>
                            <button
                              onClick={() => handleDeleteDebt(debt.id)}
                              className="p-1.5 text-slate-300 hover:text-red-600 hover:bg-red-50 rounded-lg transition-all"
                              title="حذف الفاتورة"
                            >
                              <Trash2 size={14} />
                            </button>
                          </div>
                        </>
                      )}
                    </div>
                    <div className="flex flex-wrap gap-x-4 gap-y-1">
                      <div className="text-[10px] md:text-xs text-slate-400 font-bold">البداية: {new Date(debt.startDate).toLocaleDateString('ar-EG')}</div>
                      <div className={`text-[10px] font-black px-2 py-0.5 rounded border ${debt.type === DebtType.GOLD ? 'bg-amber-50 text-amber-700 border-amber-100' : 'bg-indigo-50 text-indigo-700 border-indigo-100'}`}>
                        {debt.type === DebtType.GOLD ? 'ذهب ع24' : 'نقدي'}
                      </div>
                    </div>
                  </div>
                </div>

                <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 md:gap-8 w-full md:w-auto border-t md:border-t-0 pt-4 md:pt-0">
                  <div className="flex flex-wrap items-center justify-between md:justify-end gap-x-6 gap-y-2 md:border-r-2 md:pr-6 border-slate-200">
                    <div className="flex items-center gap-2 md:block md:text-right">
                      <div className="text-[10px] md:text-xs text-emerald-600 font-extrabold mb-0.5 md:mb-1">المتبقي:</div>
                      <div className="text-xl md:text-3xl font-black text-indigo-700 leading-tight">
                        {debt.type === DebtType.GOLD ? formatGrams(remaining) : formatCurrency(remaining)}
                      </div>
                    </div>
                    <div className="flex items-center gap-2 md:block md:text-right opacity-60">
                      <div className="text-[10px] md:text-xs text-slate-500 font-extrabold mb-0.5 md:mb-1">إجمالي الفاتورة:</div>
                      <div className="text-sm md:text-lg font-bold text-slate-700 leading-tight">
                        {debt.type === DebtType.GOLD ? formatGrams(debt.goldGrams!) : formatCurrency(debt.amountInEGP)}
                      </div>
                    </div>
                  </div>

                  <div className="flex flex-row md:flex-col gap-2 w-full md:w-auto">
                    <button onClick={() => setPaymentModalDebtId(debt.id)} className="flex-1 md:flex-none bg-emerald-600 text-white px-3 md:px-6 py-3 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-emerald-700 transition-all text-xs md:text-sm shadow-lg shadow-emerald-100">
                      <CreditCard size={16} />
                      <span className="whitespace-nowrap">سداد مبلغ</span>
                    </button>
                    <button onClick={() => setAdjustModalDebtId(debt.id)} className="flex-1 md:flex-none bg-amber-500 text-white px-3 md:px-6 py-3 md:py-2.5 rounded-xl font-bold flex items-center justify-center gap-2 hover:bg-amber-600 transition-all text-xs md:text-sm shadow-lg shadow-amber-100">
                      <PlusCircle size={16} />
                      <span className="whitespace-nowrap">زيادة مديونية</span>
                    </button>
                  </div>
                </div>
              </div>
              <div className="p-8 grid grid-cols-1 md:grid-cols-3 gap-10">
                <div className="space-y-6">
                  <h3 className="font-bold text-slate-700 border-b pb-3 flex items-center gap-2 text-lg"><PieChart size={22} className="text-indigo-500" />التحليل</h3>
                  <div className="bg-slate-50 p-6 rounded-2xl space-y-4 border border-slate-100 shadow-inner">
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">قيمة العقد</span><span className="font-bold text-slate-800">{debt.type === DebtType.GOLD ? formatGrams(debt.goldGrams!) : formatCurrency(debt.amountInEGP)}</span></div>
                    {debt.type === DebtType.GOLD && <div className="flex justify-between text-xs"><span className="text-slate-400">سعر ع24 المسجل</span><span className="font-bold text-amber-600">{formatCurrency(debt.goldPriceAtRegistration || 0)}</span></div>}
                    <div className="flex justify-between text-sm"><span className="text-slate-500 font-bold">المدفوع</span><span className="font-bold text-emerald-600">{debt.type === DebtType.GOLD ? formatGrams(paid) : formatCurrency(paid)}</span></div>
                    <div className="pt-2"><div className="w-full bg-slate-200 h-3 rounded-full overflow-hidden shadow-inner"><div className="bg-emerald-500 h-full transition-all duration-1000" style={{ width: `${percentage}%` }}></div></div></div>
                    <div className="flex justify-between items-center text-xs gap-2">
                      <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm flex-1 text-center">
                        النسبة: {percentage}%
                      </div>
                      <div className="px-3 py-1 bg-white border border-slate-200 rounded-lg font-bold text-slate-700 shadow-sm flex-1 text-center">
                        {totalPaidCount} / {debt.installments.length} قسط
                      </div>
                    </div>
                  </div>

                  <div className="mt-6">
                    <div className="flex items-center justify-between mb-3">
                      <h4 className="text-sm font-bold text-slate-700 flex items-center gap-2"><Package size={16} /> المرفقات</h4>
                      <div className="flex items-center gap-1">
                        <label className="cursor-pointer bg-slate-100 text-slate-600 p-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all" title="إضافة من المعرض">
                          <ImageIcon size={18} />
                          <input
                            type="file"
                            multiple
                            accept="image/*"
                            className="hidden"
                            onChange={(e) => handleAddImages(debt.id, e.target.files)}
                          />
                        </label>
                        <label className="cursor-pointer bg-slate-100 text-slate-600 p-1.5 rounded-lg hover:bg-indigo-600 hover:text-white transition-all" title="تصوير بالكاميرا">
                          <Camera size={18} />
                          <input
                            type="file"
                            accept="image/*"
                            capture="environment"
                            className="hidden"
                            onChange={(e) => handleAddImages(debt.id, e.target.files)}
                          />
                        </label>
                      </div>
                    </div>
                    {debt.images.length > 0 ? (
                      <div className="flex flex-wrap gap-3">
                        {debt.images.map((img, idx) => (
                          <div key={img.id} className="relative group cursor-pointer" onClick={() => setViewerImages({ images: debt.images, index: idx })}>
                            <img src={img.url} className="w-16 h-16 rounded-xl border-2 border-white shadow-sm object-cover hover:scale-110 transition-transform" />
                            <div className="absolute inset-0 bg-black/10 opacity-0 group-hover:opacity-100 transition-opacity rounded-xl flex items-center justify-center text-white"><Fullscreen size={16} /></div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <p className="text-xs text-slate-400 font-bold italic">لا توجد مرفقات لهذه الفاتورة</p>
                    )}
                  </div>
                </div>
                <div className="md:col-span-2">
                  <h3 className="font-bold text-slate-700 border-b pb-3 mb-6 flex items-center gap-2 text-lg"><Calendar size={22} className="text-indigo-500" />جدول الأقساط</h3>
                  <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 max-h-[500px] overflow-y-auto pr-2 custom-scrollbar">
                    {debt.installments.map((inst, idx) => {
                      const isShowingDate = showDateForInst === inst.id;
                      const isOverdue = !inst.paid && new Date(inst.dueDate) < new Date();
                      return (
                        <div key={inst.id} className={`p-4 rounded-2xl border-2 transition-all flex items-center justify-between ${inst.paid ? 'bg-emerald-50 border-emerald-100' : isOverdue ? 'bg-red-50 border-red-100 shadow-[0_0_10px_rgba(239,68,68,0.1)]' : 'bg-white border-slate-50 hover:border-indigo-100'}`}>
                          <div className="flex items-center gap-4">
                            <div className={`w-10 h-10 rounded-xl flex items-center justify-center font-black text-sm ${inst.paid ? 'bg-emerald-500 text-white' : isOverdue ? 'bg-red-500 text-white' : 'bg-slate-100 text-slate-400'}`}>{idx + 1}</div>
                            <div>
                              <div className={`text-sm font-black flex items-center gap-2 ${inst.paid ? 'text-emerald-800' : isOverdue ? 'text-red-700' : 'text-slate-800'}`}>
                                {new Date(inst.dueDate).toLocaleDateString('ar-EG', { month: 'long', year: 'numeric' })}
                                {inst.paid && <Clock size={14} onClick={() => setShowDateForInst(isShowingDate ? null : inst.id)} className="cursor-pointer text-emerald-400 hover:text-emerald-600" />}
                              </div>
                              <div className="text-[10px] text-slate-400 font-bold mb-1">
                                {new Date(inst.dueDate).toLocaleDateString('ar-EG')}
                              </div>
                              <div className={`text-[11px] font-bold ${isOverdue ? 'text-red-500' : 'text-slate-400'}`}>
                                {isShowingDate && inst.paymentDate ? `دُفِع في: ${new Date(inst.paymentDate).toLocaleDateString('ar-EG')}` : `القسط: ${debt.type === DebtType.GOLD ? inst.amount.toFixed(2) + ' جرام' : formatCurrency(inst.amount)}`}
                              </div>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            {!inst.paid && (
                              <button
                                onClick={() => sendInstallmentReminder(inst, debt)}
                                className={`p-2 rounded-xl transition-all shadow-sm ${isOverdue ? 'bg-red-100 text-red-600 hover:bg-red-200' : 'bg-indigo-50 text-indigo-600 hover:bg-indigo-100'}`}
                                title="تنبيه واتساب"
                              >
                                <BellRing size={20} />
                              </button>
                            )}
                            <button onClick={() => toggleInstallment(debt.id, inst.id)} className={`p-2 rounded-xl shadow-sm ${inst.paid ? 'bg-emerald-500 text-white' : 'bg-white border-2 border-slate-100 text-slate-100 hover:text-emerald-500 hover:border-emerald-100'}`}><CheckCircle size={22} /></button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              </div>
            </div>

            <div className="bg-white rounded-3xl border border-slate-200 shadow-lg overflow-hidden">
              <div className="p-5 bg-slate-50 border-b flex items-center gap-2 font-black text-slate-700 text-lg"><History size={22} className="text-indigo-600" />سجل الحركات</div>

              {/* Desktop Table View */}
              <div className="hidden md:block overflow-x-auto">
                <table className="w-full text-right">
                  <thead className="bg-slate-50 text-slate-500 border-b">
                    <tr><th className="p-5 text-sm font-black">التاريخ</th><th className="p-5 text-sm font-black text-center">النوع</th><th className="p-5 text-sm font-black">القيمة</th><th className="p-5 text-sm font-black">التفاصيل</th><th className="p-5 text-sm font-black text-center">إشعار</th></tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {debt.history && debt.history.length > 0 ? ([...debt.history].reverse().map((record) => (
                      <tr key={record.id} className="hover:bg-slate-50/80 transition-colors">
                        <td className="p-5"><div className="font-bold text-slate-700">{new Date(record.date).toLocaleDateString('ar-EG')}</div><div className="text-[10px] text-slate-300">{new Date(record.date).toLocaleTimeString('ar-EG', { hour: '2-digit', minute: '2-digit' })}</div></td>
                        <td className="p-5 text-center"><span className={`px-3 py-1 rounded-lg font-black text-[10px] border ${record.type === 'INCREASE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>{record.type === 'INCREASE' ? 'زيادة' : 'سداد'}</span></td>
                        <td className={`p-5 font-black text-base ${record.type === 'INCREASE' ? 'text-amber-600' : 'text-emerald-600'}`}>{record.type === 'INCREASE' ? '+' : ''}{debt.type === DebtType.GOLD ? formatGrams(record.amount) : formatCurrency(record.amount)}</td>
                        <td className="p-5 text-slate-600 font-bold text-sm">{record.note || '-'}</td>
                        <td className="p-5 text-center"><button onClick={() => sendWhatsAppReceipt(record, debt)} className="p-3 text-green-600 hover:bg-green-50 rounded-2xl border border-transparent hover:border-green-100 transition-all"><MessageSquare size={22} /></button></td>
                      </tr>
                    ))) : (<tr><td colSpan={5} className="p-16 text-center text-slate-300 font-black italic text-lg">لا توجد حركات مسجلة</td></tr>)}
                  </tbody>
                </table>
              </div>

              {/* Mobile List View */}
              <div className="md:hidden divide-y divide-slate-100">
                {debt.history && debt.history.length > 0 ? ([...debt.history].reverse().map((record) => (
                  <div key={record.id} className="p-4 flex items-center justify-between gap-4 hover:bg-slate-50/80 transition-colors">
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className={`px-2 py-0.5 rounded-md font-black text-[9px] border ${record.type === 'INCREASE' ? 'bg-amber-50 text-amber-700 border-amber-200' : 'bg-emerald-50 text-emerald-700 border-emerald-200'}`}>
                          {record.type === 'INCREASE' ? 'زيادة' : 'سداد'}
                        </span>
                        <span className={`font-black text-sm ${record.type === 'INCREASE' ? 'text-amber-600' : 'text-emerald-700'}`}>
                          {record.type === 'INCREASE' ? '+' : ''}{debt.type === DebtType.GOLD ? formatGrams(record.amount) : formatCurrency(record.amount)}
                        </span>
                        <span className="text-[10px] text-slate-400 font-bold mr-auto">
                          {new Date(record.date).toLocaleDateString('ar-EG')}
                        </span>
                      </div>
                      <div className="text-xs text-slate-500 font-bold truncate">
                        {record.note || '-'}
                      </div>
                    </div>
                    <button
                      onClick={() => sendWhatsAppReceipt(record, debt)}
                      className="w-10 h-10 flex items-center justify-center text-green-600 bg-green-50 rounded-xl active:scale-90 transition-transform"
                    >
                      <MessageSquare size={18} />
                    </button>
                  </div>
                ))) : (
                  <div className="p-10 text-center text-slate-300 font-bold italic">لا توجد حركات مسجلة</div>
                )}
              </div>
            </div>
          </div>
        );
      })}

      {paymentModalDebtId && currentPaymentDebt && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleCustomPayment} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-emerald-600 text-white flex justify-between items-center font-black">
              <div className="flex items-center gap-3"><Wallet size={24} /><span>سداد نقدي (ج.م)</span></div>
              <button type="button" onClick={() => setPaymentModalDebtId(null)} className="p-1"><X size={24} /></button>
            </div>
            <div className="p-10 space-y-6">
              <div className="text-center space-y-2">
                <label className="text-xs font-black text-slate-400">المبلغ بالجنيه</label>
                <input autoFocus type="number" step="0.01" placeholder="0.00" className="w-full p-6 border-2 border-slate-50 rounded-2xl text-5xl font-black text-center outline-none focus:border-emerald-500 bg-slate-50 text-slate-900" value={paymentInput} onChange={(e) => setPaymentInput(e.target.value)} />
                {currentPaymentDebt.type === DebtType.GOLD && currentPaymentDebt.goldPriceAtRegistration && paymentInput && (
                  <div className="mt-4 p-3 bg-amber-50 rounded-xl border border-amber-100">
                    <p className="text-sm font-bold text-amber-700">سيخصم: {(parseFloat(paymentInput) / currentPaymentDebt.goldPriceAtRegistration).toFixed(2)} جرام</p>
                  </div>
                )}
              </div>
              <button className="w-full bg-emerald-600 text-white py-5 rounded-2xl font-black text-xl hover:bg-emerald-700 shadow-xl active:scale-95 transition-all">تأكيد السداد</button>
            </div>
          </form>
        </div>
      )}

      {adjustModalDebtId && (
        <div className="fixed inset-0 bg-slate-900/70 backdrop-blur-md z-[110] flex items-center justify-center p-4">
          <form onSubmit={handleAdjustment} className="bg-white w-full max-w-md rounded-3xl shadow-2xl overflow-hidden">
            <div className="p-6 bg-amber-500 text-white flex justify-between items-center font-black">
              <div className="flex items-center gap-3"><AlertTriangle size={24} /><span>زيادة المديونية</span></div>
              <button type="button" onClick={() => setAdjustModalDebtId(null)} className="p-1"><X size={24} /></button>
            </div>
            <div className="p-8 space-y-6">
              <div className="space-y-2">
                <label className="text-xs font-black text-slate-400">القيمة الإضافية (ج.م)</label>
                <input autoFocus type="number" step="0.01" placeholder="0.00" className="w-full p-4 border-2 border-slate-50 rounded-xl text-3xl font-black text-center outline-none focus:border-amber-500 bg-slate-50 text-slate-900" value={adjustInput} onChange={(e) => setAdjustInput(e.target.value)} />
              </div>
              <div className="space-y-2">
                <textarea required placeholder="سبب الزيادة..." className="w-full p-4 border-2 border-slate-50 rounded-xl text-sm font-bold outline-none focus:border-amber-500 h-28 bg-slate-50 resize-none text-slate-800" value={adjustReason} onChange={(e) => setAdjustReason(e.target.value)} />
              </div>
              <button className="w-full bg-amber-500 text-white py-4 rounded-2xl font-black text-lg hover:bg-amber-600 shadow-xl active:scale-95 transition-all">تأكيد الزيادة</button>
            </div>
          </form>
        </div>
      )}

      {viewerImages && (
        <div className="fixed inset-0 bg-black/95 z-[200] flex flex-col items-center justify-center p-4">
          <div className="absolute top-0 left-0 right-0 p-6 flex justify-between items-center z-[210] bg-gradient-to-b from-black/50 to-transparent">
            <div className="text-white font-bold text-lg">
              {viewerImages.index + 1} / {viewerImages.images.length}
            </div>
            <button onClick={() => setViewerImages(null)} className="text-white bg-white/10 p-3 rounded-full hover:bg-white/20 transition-all">
              <X size={28} />
            </button>
          </div>

          {/* New Actions Bar for Image */}
          <div className="absolute bottom-36 left-0 right-0 flex justify-center gap-2 z-[210] flex-wrap px-4">
            <label className="flex items-center gap-2 bg-white/10 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl backdrop-blur-md transition-all cursor-pointer font-bold text-xs" title="استبدال من المعرض">
              <ImageIcon size={16} />
              <span>المعرض</span>
              <input
                type="file"
                accept="image/*"
                className="hidden"
                onChange={(e) => {
                  const debtIdForViewer = customer.debts.find(d => d.images.some(img => img.id === viewerImages.images[viewerImages.index].id))?.id;
                  if (debtIdForViewer) handleReplaceImage(debtIdForViewer, viewerImages.images[viewerImages.index].id, e.target.files?.[0] || null);
                }}
              />
            </label>
            <label className="flex items-center gap-2 bg-white/10 hover:bg-indigo-600 text-white px-3 py-2 rounded-xl backdrop-blur-md transition-all cursor-pointer font-bold text-xs" title="استبدال من الكاميرا">
              <Camera size={16} />
              <span>الكاميرا</span>
              <input
                type="file"
                accept="image/*"
                capture="environment"
                className="hidden"
                onChange={(e) => {
                  const debtIdForViewer = customer.debts.find(d => d.images.some(img => img.id === viewerImages.images[viewerImages.index].id))?.id;
                  if (debtIdForViewer) handleReplaceImage(debtIdForViewer, viewerImages.images[viewerImages.index].id, e.target.files?.[0] || null);
                }}
              />
            </label>
            <button
              onClick={() => {
                const debtIdForViewer = customer.debts.find(d => d.images.some(img => img.id === viewerImages.images[viewerImages.index].id))?.id;
                if (debtIdForViewer) handleDeleteImage(debtIdForViewer, viewerImages.images[viewerImages.index].id);
              }}
              className="flex items-center gap-2 bg-white/10 hover:bg-red-600 text-white px-3 py-2 rounded-xl backdrop-blur-md transition-all font-bold text-xs"
            >
              <Trash2 size={16} />
              <span>حذف</span>
            </button>
          </div>

          <div className="relative w-full flex-1 flex items-center justify-center group">
            {/* Desktop Navigation */}
            {viewerImages.index > 0 && (
              <button
                onClick={(e) => { e.stopPropagation(); setViewerImages({ ...viewerImages, index: viewerImages.index - 1 }) }}
                className="absolute right-6 z-[210] text-white bg-white/10 p-4 rounded-full hover:bg-white/20 transition-all hidden md:block"
              >
                <ChevronRight size={36} />
              </button>
            )}

            <div className="w-full h-full flex items-center justify-center overflow-hidden">
              <img
                key={viewerImages.images[viewerImages.index].id}
                src={viewerImages.images[viewerImages.index].url}
                className="max-w-full max-h-[85vh] object-contain animate-in fade-in zoom-in-95 duration-300"
                alt="Attachment"
              />
            </div>

            {viewerImages.index < viewerImages.images.length - 1 && (
              <button
                onClick={(e) => { e.stopPropagation(); setViewerImages({ ...viewerImages, index: viewerImages.index + 1 }) }}
                className="absolute left-6 z-[210] text-white bg-white/10 p-4 rounded-full hover:bg-white/20 transition-all hidden md:block"
              >
                <ChevronLeft size={36} />
              </button>
            )}
          </div>

          {/* Swipeable List for Mobile and Quick Select */}
          <div className="p-8 w-full max-w-4xl">
            <div className="flex justify-center gap-3 overflow-x-auto pb-4 no-scrollbar">
              {viewerImages.images.map((img, idx) => (
                <button
                  key={img.id}
                  onClick={() => setViewerImages({ ...viewerImages, index: idx })}
                  className={`relative w-16 h-16 rounded-xl overflow-hidden flex-shrink-0 border-2 transition-all ${idx === viewerImages.index ? 'border-indigo-500 scale-110' : 'border-white/10 opacity-50'}`}
                >
                  <img src={img.url} className="w-full h-full object-cover" />
                </button>
              ))}
            </div>
            <div className="text-white/60 text-center text-xs font-bold mt-2">
              تاريخ الإضافة: {new Date(viewerImages.images[viewerImages.index].addedAt).toLocaleString('ar-EG')}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default CustomerDetail;
