
import React, { useState, useMemo } from 'react';
import { Customer, DebtType } from '../types';
import {
  Search, Phone, MessageSquare, Info, Archive, Trash2, RotateCcw,
  UserCheck, Users, Wallet, Coins, AlertCircle, Filter, ChevronDown,
  SortAsc, Calendar, ListFilter
} from 'lucide-react';
import { Link } from 'react-router-dom';
import { getRemainingBalance, formatCurrency, formatGrams } from '../utils/calculations';

interface CustomerListProps {
  customers: Customer[];
  onDelete: (id: string) => void;
  onToggleArchive: (id: string) => void;
}

type StatusFilter = 'all' | 'overdue' | 'has_balance' | 'fully_paid';
type TypeFilter = 'all' | 'cash' | 'gold';
type SortOption = 'newest' | 'oldest' | 'name' | 'debt_desc';

const CustomerList: React.FC<CustomerListProps> = ({ customers, onDelete, onToggleArchive }) => {
  const [searchTerm, setSearchTerm] = useState('');
  const [activeTab, setActiveTab] = useState<'active' | 'archived'>('active');

  const [statusFilter, setStatusFilter] = useState<StatusFilter>('all');
  const [typeFilter, setTypeFilter] = useState<TypeFilter>('all');
  const [sortBy, setSortBy] = useState<SortOption>('newest');
  const [showFilters, setShowFilters] = useState(false);
  const [showSearch, setShowSearch] = useState(false);

  const hasOverdue = (customer: Customer) => {
    return customer.debts.some(debt =>
      debt.installments.some(inst => !inst.paid && new Date(inst.dueDate) < new Date())
    );
  };

  const getTotals = (customer: Customer) => {
    const cash = customer.debts
      .filter(d => d.type === DebtType.CASH)
      .reduce((sum, d) => sum + getRemainingBalance(d), 0);

    const gold = customer.debts
      .filter(d => d.type === DebtType.GOLD)
      .reduce((sum, d) => sum + getRemainingBalance(d), 0);

    return { cash, gold, total: cash + (gold * 4000) };
  };

  const filteredAndSortedCustomers = useMemo(() => {
    return customers
      .filter(c => {
        const matchesSearch = c.name.toLowerCase().includes(searchTerm.toLowerCase()) || c.phone.includes(searchTerm);
        if (!matchesSearch) return false;

        const matchesTab = activeTab === 'archived' ? c.isArchived : !c.isArchived;
        if (!matchesTab) return false;

        if (statusFilter === 'overdue' && !hasOverdue(c)) return false;
        const { cash, gold } = getTotals(c);
        if (statusFilter === 'has_balance' && cash <= 0 && gold <= 0) return false;
        if (statusFilter === 'fully_paid' && (cash > 0 || gold > 0)) return false;

        if (typeFilter === 'cash' && !c.debts.some(d => d.type === DebtType.CASH)) return false;
        if (typeFilter === 'gold' && !c.debts.some(d => d.type === DebtType.GOLD)) return false;

        return true;
      })
      .sort((a, b) => {
        if (sortBy === 'newest') return new Date(b.createdAt).getTime() - new Date(a.createdAt).getTime();
        if (sortBy === 'oldest') return new Date(a.createdAt).getTime() - new Date(b.createdAt).getTime();
        if (sortBy === 'name') return a.name.localeCompare(b.name, 'ar');
        if (sortBy === 'debt_desc') return getTotals(b).total - getTotals(a).total;
        return 0;
      });
  }, [customers, searchTerm, activeTab, statusFilter, typeFilter, sortBy]);

  const getWhatsAppNumber = (phone: string) => {
    const cleanPhone = phone.replace(/\D/g, '');
    return cleanPhone.startsWith('0') ? '2' + cleanPhone : cleanPhone;
  };

  return (
    <div className="space-y-6">
      <div className="space-y-4">
        <div className="flex items-center justify-between bg-white p-4 rounded-2xl shadow-sm border border-slate-100">
          <div className="flex items-center gap-3">
            <h1 className="text-xl font-black text-slate-800">العملاء</h1>
            <span className="bg-indigo-100 text-indigo-700 px-3 py-1 rounded-xl text-sm font-black">
              {filteredAndSortedCustomers.length}
            </span>
          </div>

          <div className="flex items-center gap-2">
            <button
              onClick={() => {
                setShowSearch(!showSearch);
                if (showSearch) setSearchTerm('');
              }}
              className={`p-2.5 rounded-xl transition-all ${showSearch ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <Search size={20} />
            </button>

            <button
              onClick={() => setShowFilters(!showFilters)}
              className={`p-2.5 rounded-xl transition-all ${showFilters ? 'bg-indigo-600 text-white' : 'bg-slate-50 text-slate-500 hover:bg-slate-100'}`}
            >
              <Filter size={20} />
            </button>
          </div>
        </div>

        {/* شريط البحث المنبثق */}
        {showSearch && (
          <div className="animate-in fade-in slide-in-from-top-2 duration-200">
            <div className="relative">
              <Search className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400" size={18} />
              <input
                type="text"
                placeholder="بحث بالاسم أو الهاتف..."
                className="w-full pr-10 pl-4 py-3 border-2 border-slate-200 rounded-xl focus:ring-2 focus:ring-indigo-500 outline-none shadow-sm text-sm font-bold bg-white"
                value={searchTerm}
                onChange={(e) => setSearchTerm(e.target.value)}
                autoFocus
              />
            </div>
          </div>
        )}
      </div>

      {/* شريط الفلاتر المطور لزيادة الوضوح */}
      {showFilters && (
        <div className="bg-slate-100/80 p-5 rounded-2xl border-2 border-slate-200 shadow-inner grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 animate-in fade-in slide-in-from-top-2 duration-200">
          <div className="space-y-2">
            <label className="text-[12px] font-black text-slate-600 flex items-center gap-1">
              <AlertCircle size={14} className="text-red-500" /> الحالة
            </label>
            <select
              value={statusFilter}
              onChange={(e) => setStatusFilter(e.target.value as StatusFilter)}
              className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-black bg-white text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="all">الكل</option>
              <option value="overdue">المتأخرون فقط</option>
              <option value="has_balance">لديهم مديونية</option>
              <option value="fully_paid">مسددون بالكامل</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-black text-slate-600 flex items-center gap-1">
              <ListFilter size={14} className="text-indigo-500" /> نوع المديونية
            </label>
            <select
              value={typeFilter}
              onChange={(e) => setTypeFilter(e.target.value as TypeFilter)}
              className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-black bg-white text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="all">الكل</option>
              <option value="cash">نقدي فقط</option>
              <option value="gold">ذهب فقط</option>
            </select>
          </div>

          <div className="space-y-2">
            <label className="text-[12px] font-black text-slate-600 flex items-center gap-1">
              <SortAsc size={14} className="text-emerald-500" /> الترتيب حسب
            </label>
            <select
              value={sortBy}
              onChange={(e) => setSortBy(e.target.value as SortOption)}
              className="w-full p-2.5 border-2 border-slate-200 rounded-xl text-sm font-black bg-white text-slate-800 outline-none focus:border-indigo-500 shadow-sm"
            >
              <option value="newest">الأحدث تسجيلاً</option>
              <option value="oldest">الأقدم تسجيلاً</option>
              <option value="name">الاسم (أبجدي)</option>
              <option value="debt_desc">الأعلى مديونية</option>
            </select>
          </div>

          <div className="flex items-end">
            <button
              onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSortBy('newest'); setSearchTerm(''); }}
              className="w-full py-2.5 px-4 text-sm font-black text-red-600 hover:bg-red-100 bg-white rounded-xl transition-all border-2 border-red-100 hover:border-red-300 shadow-sm"
            >
              إعادة تعيين الفلاتر
            </button>
          </div>
        </div>
      )}

      {/* Tabs */}
      <div className="flex border-b-2 border-slate-200">
        <button
          onClick={() => setActiveTab('active')}
          className={`px-8 py-4 font-black text-sm transition-all flex items-center gap-2 border-b-4 -mb-0.5 ${activeTab === 'active' ? 'border-indigo-600 text-indigo-700 bg-indigo-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          <UserCheck size={20} />
          النشطون ({customers.filter(c => !c.isArchived).length})
        </button>
        <button
          onClick={() => setActiveTab('archived')}
          className={`px-8 py-4 font-black text-sm transition-all flex items-center gap-2 border-b-4 -mb-0.5 ${activeTab === 'archived' ? 'border-amber-600 text-amber-700 bg-amber-50/50' : 'border-transparent text-slate-400 hover:text-slate-600'
            }`}
        >
          <Archive size={20} />
          الأرشيف ({customers.filter(c => !!c.isArchived).length})
        </button>
      </div>

      <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
        {filteredAndSortedCustomers.map(customer => {
          const { cash: totalCashRemaining, gold: totalGoldRemaining } = getTotals(customer);
          const isOverdue = hasOverdue(customer);

          return (
            <div key={customer.id} className={`bg-white rounded-2xl border ${isOverdue ? 'border-red-200' : 'border-slate-100'} shadow-sm hover:shadow-md transition-all overflow-hidden`}>
              {/* Top Row: Name and Debt */}
              <Link
                to={`/customer/${customer.id}`}
                className="flex items-center justify-between p-4 bg-white hover:bg-slate-50 transition-colors border-b border-slate-50 cursor-pointer"
              >
                <div className="flex flex-col">
                  <h3 className="text-lg font-bold text-slate-800 flex items-center gap-2">
                    {customer.name}
                    {isOverdue && (
                      <span className="w-2 h-2 bg-red-500 rounded-full animate-pulse" title="متأخرات"></span>
                    )}
                  </h3>
                </div>

                <div className="text-left flex flex-col items-end gap-0.5">
                  {totalCashRemaining > 0 && (
                    <span className="text-sm font-bold text-indigo-700 bg-indigo-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {formatCurrency(totalCashRemaining)}
                    </span>
                  )}
                  {totalGoldRemaining > 0 && (
                    <span className="text-sm font-bold text-amber-700 bg-amber-50 px-2 py-0.5 rounded-md whitespace-nowrap">
                      {formatGrams(totalGoldRemaining)}
                    </span>
                  )}
                  {totalCashRemaining === 0 && totalGoldRemaining === 0 && (
                    <span className="text-xs font-bold text-emerald-600 bg-emerald-50 px-2 py-0.5 rounded-md">
                      خالص
                    </span>
                  )}
                </div>
              </Link>

              {/* Bottom Row: Actions */}
              <div className="flex bg-slate-50/50">
                <a
                  href={`tel:${customer.phone}`}
                  className="flex-1 py-3 flex items-center justify-center text-slate-400 hover:text-emerald-600 hover:bg-emerald-50 transition-colors border-l border-slate-100"
                  title="اتصال"
                >
                  <Phone size={18} />
                </a>

                <a
                  href={`https://wa.me/${getWhatsAppNumber(customer.phone)}`}
                  target="_blank"
                  rel="noreferrer"
                  className="flex-1 py-3 flex items-center justify-center text-slate-400 hover:text-green-600 hover:bg-green-50 transition-colors border-l border-slate-100"
                  title="واتساب"
                >
                  <MessageSquare size={18} />
                </a>

                <button
                  onClick={() => onToggleArchive(customer.id)}
                  className={`flex-1 py-3 flex items-center justify-center transition-colors border-l border-slate-100 ${customer.isArchived ? 'text-amber-600 bg-amber-50' : 'text-slate-400 hover:text-amber-600 hover:bg-amber-50'
                    }`}
                  title={customer.isArchived ? "استعادة" : "أرشفة"}
                >
                  {customer.isArchived ? <RotateCcw size={18} /> : <Archive size={18} />}
                </button>

                <button
                  onClick={() => onDelete(customer.id)}
                  className="flex-1 py-3 flex items-center justify-center text-slate-400 hover:text-red-600 hover:bg-red-50 transition-colors"
                  title="حذف"
                >
                  <Trash2 size={18} />
                </button>
              </div>
            </div>
          );
        })}
        {filteredAndSortedCustomers.length === 0 && (
          <div className="col-span-full py-28 text-center bg-white rounded-[2rem] border-4 border-dashed border-slate-100 flex flex-col items-center gap-5">
            <div className="w-20 h-20 bg-slate-50 rounded-full flex items-center justify-center">
              <Search size={40} className="text-slate-200" />
            </div>
            <div className="space-y-1">
              <p className="text-slate-400 font-black text-xl">لا توجد نتائج مطابقة</p>
              <p className="text-slate-300 font-bold text-sm">حاول تغيير فلاتر البحث أو التصفية</p>
            </div>
            <button
              onClick={() => { setStatusFilter('all'); setTypeFilter('all'); setSortBy('newest'); setSearchTerm(''); }}
              className="text-indigo-600 font-black text-sm hover:bg-indigo-50 px-6 py-2 rounded-full border-2 border-indigo-100 transition-all"
            >
              عرض جميع العملاء
            </button>
          </div>
        )}
      </div>
    </div>
  );
};

export default CustomerList;
