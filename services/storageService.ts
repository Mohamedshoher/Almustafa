
import { Customer, Debt, DebtImage } from '../types';
import {
  collection,
  doc,
  setDoc,
  deleteDoc,
  onSnapshot,
  query,
  orderBy
} from "firebase/firestore";
import { db } from "./firebase";

const GOLD_CACHE_KEY = 'gold_price_cache';
const DB_NAME = 'AlmustafaDB';
const STORE_NAME = 'debt_images';

// إعداد IndexedDB
const openDB = (): Promise<IDBDatabase> => {
  return new Promise((resolve, reject) => {
    const request = indexedDB.open(DB_NAME, 1);
    request.onupgradeneeded = () => {
      const db = request.result;
      if (!db.objectStoreNames.contains(STORE_NAME)) {
        db.createObjectStore(STORE_NAME);
      }
    };
    request.onsuccess = () => resolve(request.result);
    request.onerror = () => reject(request.error);
  });
};

// دالة لحفظ الصور في IndexedDB
const saveImagesLocally = async (debtId: string, images: DebtImage[]) => {
  if (!images || images.length === 0) return;
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.put(images, debtId);
  } catch (err) {
    console.error("IndexedDB Save Error:", err);
  }
};

// دالة لجلب الصور من IndexedDB
const getLocalImages = async (debtId: string): Promise<DebtImage[]> => {
  try {
    const db = await openDB();
    return new Promise((resolve) => {
      const tx = db.transaction(STORE_NAME, 'readonly');
      const store = tx.objectStore(STORE_NAME);
      const request = store.get(debtId);
      request.onsuccess = () => resolve(request.result || []);
      request.onerror = () => resolve([]);
    });
  } catch (err) {
    console.error("IndexedDB Get Error:", err);
    return [];
  }
};

// دالة لحذف الصور من IndexedDB
const deleteLocalImages = async (debtId: string) => {
  try {
    const db = await openDB();
    const tx = db.transaction(STORE_NAME, 'readwrite');
    const store = tx.objectStore(STORE_NAME);
    store.delete(debtId);
  } catch (err) {
    console.error("IndexedDB Delete Error:", err);
  }
};

// ... (cleanUndefined remains same)

// دالة لتنظيف البيانات من القيم undefined (Firebase لا يقبل undefined)
const cleanUndefined = (obj: any): any => {
  if (Array.isArray(obj)) {
    return obj.map(item => cleanUndefined(item));
  }

  if (obj !== null && typeof obj === 'object') {
    const cleaned: any = {};
    Object.keys(obj).forEach(key => {
      const value = obj[key];
      if (value !== undefined) {
        cleaned[key] = cleanUndefined(value);
      }
    });
    return cleaned;
  }

  return obj;
};

// مزامنة العملاء مع Firebase (بدون صور)
export const syncCustomerToCloud = async (customer: Customer) => {
  try {
    // 1. استخراج الصور وحفظها في IndexedDB
    for (const debt of customer.debts) {
      if (debt.images && debt.images.length > 0) {
        await saveImagesLocally(debt.id, debt.images);
      }
    }

    // 2. إفراغ الصور من الكائن المتوجه للسحابة
    const cleanedDebts = customer.debts.map(debt => ({ ...debt, images: [] }));
    const cloudData = { ...customer, debts: cleanedDebts };

    // 3. تنظيف البيانات من القيم undefined قبل الإرسال
    const cleanedData = cleanUndefined(cloudData);

    await setDoc(doc(db, "customers", customer.id), cleanedData);
  } catch (error) {
    console.error("Error syncing to cloud:", error);
  }
};

export const deleteCustomerFromCloud = async (customerId: string, debts: Debt[]) => {
  try {
    await deleteDoc(doc(db, "customers", customerId));
    // حذف الصور من IndexedDB
    for (const d of debts) {
      await deleteLocalImages(d.id);
    }
  } catch (error) {
    console.error("Error deleting from cloud:", error);
  }
};

// الاستماع للبيانات ودمج الصور المحلية معها
export const subscribeToCustomers = (callback: (customers: Customer[]) => void) => {
  const q = query(collection(db, "customers"), orderBy("createdAt", "desc"));

  return onSnapshot(q, async (snapshot) => {
    const customers = await Promise.all(snapshot.docs.map(async (doc) => {
      const data = doc.data() as Customer;
      // دمج الصور المخزنة في IndexedDB في كل مديونية
      const debtsWithLocalImages = await Promise.all(data.debts.map(async (debt) => ({
        ...debt,
        images: await getLocalImages(debt.id)
      })));
      return { ...data, debts: debtsWithLocalImages };
    }));
    callback(customers);
  });
};

export interface GoldCache {
  price: number;
  sourceUrl: string;
  timestamp: string; // ISO string
}

export const saveGoldCache = (cache: GoldCache) => {
  localStorage.setItem(GOLD_CACHE_KEY, JSON.stringify(cache));
};

export const loadGoldCache = (): GoldCache | null => {
  const data = localStorage.getItem(GOLD_CACHE_KEY);
  return data ? JSON.parse(data) : null;
};
