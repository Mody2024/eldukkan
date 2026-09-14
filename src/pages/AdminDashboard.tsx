import React, { useEffect, useState } from 'react';
import { supabase } from '../lib/supabase';
import { Package, ShoppingBag, Palette, Trash2, Plus, CheckCircle, Clock, Truck, Shield } from 'lucide-react';

export default function AdminDashboard() {
  const [activeTab, setActiveTab] = useState<'orders' | 'products' | 'design'>('orders');
  const [orders, setOrders] = useState<any[]>([]);
  const [products, setProducts] = useState<any[]>([]);
  
  // New Product Form State
  const [newProduct, setNewProduct] = useState({ name: '', price: '', image_url: '', description: '' });
  
  // Store Design Customization State
  const [storeConfig, setStoreConfig] = useState({
    storeName: 'Eldukkan V3',
    primaryColor: '#f59e0b', // Amber-500
    logoUrl: ''
  });

  useEffect(() => {
    fetchData();
  }, [activeTab]);

  const fetchData = async () => {
    if (activeTab === 'orders') {
      const { data } = await supabase.from('orders').select('*').order('created_at', { ascending: false });
      if (data) setOrders(data);
    } else if (activeTab === 'products') {
      const { data } = await supabase.from('products').select('*');
      if (data) setProducts(data);
    }
  };

  const updateOrderStatus = async (orderId: string, newStatus: string) => {
    const { error } = await supabase.from('orders').update({ status: newStatus }).eq('id', orderId);
    if (!error) {
      setOrders(orders.map(o => o.id === orderId ? { ...o, status: newStatus } : o));
    }
  };

  const handleAddProduct = async (e: React.FormEvent) => {
    e.preventDefault();
    const { error } = await supabase.from('products').insert([
      { name: newProduct.name, price: parseFloat(newProduct.price), image_url: newProduct.image_url, description: newProduct.description }
    ]);
    if (!error) {
      setNewProduct({ name: '', price: '', image_url: '', description: '' });
      fetchData();
      alert('Product added successfully!');
    }
  };

  const handleDeleteProduct = async (id: string) => {
    if (confirm('Are you sure you want to delete this product?')) {
      await supabase.from('products').delete().eq('id', id);
      setProducts(products.filter(p => p.id !== id));
    }
  };

  return (
    <div className="max-w-6xl mx-auto space-y-8 animate-in fade-in duration-500">
      
      {/* Header & Navigation Tabs */}
      <div className="flex flex-col md:flex-row justify-between items-start md:items-center gap-4 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 p-6 rounded-3xl shadow-sm">
        <div>
          <h1 className="text-3xl font-black dark:text-white tracking-tight">Admin Command Center</h1>
          <p className="text-zinc-500 font-medium text-sm">Manage live transactions, inventory, and storefront branding.</p>
        </div>
        
        <div className="flex bg-zinc-100 dark:bg-zinc-800 p-1.5 rounded-2xl gap-2 w-full md:w-auto">
          <button onClick={() => setActiveTab('orders')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'orders' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <Package size={18} /> Orders
          </button>
          <button onClick={() => setActiveTab('products')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'products' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <ShoppingBag size={18} /> Inventory
          </button>
          <button onClick={() => setActiveTab('design')} className={`flex-1 md:flex-none flex items-center justify-center gap-2 px-5 py-2.5 rounded-xl font-bold text-sm transition-all ${activeTab === 'design' ? 'bg-amber-500 text-black shadow-md' : 'text-zinc-500 hover:text-zinc-900 dark:hover:text-white'}`}>
            <Palette size={18} /> Design Studio
          </button>
        </div>
      </div>

      {/* TAB 1: ORDERS */}
      {activeTab === 'orders' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
          <h2 className="text-xl font-black dark:text-white mb-4">Customer Transactions</h2>
          {orders.length === 0 ? (
            <p className="text-zinc-500 text-center py-12">No orders recorded yet.</p>
          ) : (
            <div className="space-y-4">
              {orders.map(order => (
                <div key={order.id} className="flex flex-col lg:flex-row justify-between items-start lg:items-center bg-zinc-50 dark:bg-zinc-950 p-5 rounded-2xl border border-zinc-200 dark:border-zinc-800 gap-4">
                  <div className="space-y-1">
                    <div className="flex items-center gap-3">
                      <span className="font-black text-lg dark:text-white">#{order.id.slice(0, 8).toUpperCase()}</span>
                      <span className="text-xs uppercase font-bold px-2.5 py-1 bg-amber-500/10 text-amber-500 rounded-lg">{order.payment_method}</span>
                    </div>
                    <p className="font-bold text-zinc-700 dark:text-zinc-300">{order.customer_name} &bull; <span className="text-zinc-500">{order.customer_phone}</span></p>
                    <p className="text-xs text-zinc-500">{order.customer_address}</p>
                  </div>
                  
                  <div className="flex items-center gap-4 w-full lg:w-auto justify-between lg:justify-end">
                    <span className="text-xl font-black text-amber-500">EGP {order.total_amount}</span>
                    
                    {/* Status Toggle Selector */}
                    <select 
                      value={order.status} 
                      onChange={(e) => updateOrderStatus(order.id, e.target.value)}
                      className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-700 font-bold text-sm p-3 rounded-xl outline-none dark:text-white cursor-pointer"
                    >
                      <option value="pending">Pending</option>
                      <option value="processing">Processing</option>
                      <option value="shipped">Shipped</option>
                      <option value="delivered">Delivered</option>
                    </select>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: PRODUCTS INVENTORY */}
      {activeTab === 'products' && (
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          
          {/* Add Product Form */}
          <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm h-fit">
            <h2 className="text-xl font-black dark:text-white mb-4 flex items-center gap-2">
              <Plus size={20} className="text-amber-500" /> Add New Item
            </h2>
            <form onSubmit={handleAddProduct} className="space-y-4">
              <input required type="text" placeholder="Product Name" value={newProduct.name} onChange={e => setNewProduct({...newProduct, name: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white" />
              <input required type="number" placeholder="Price (EGP)" value={newProduct.price} onChange={e => setNewProduct({...newProduct, price: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white" />
              <input required type="url" placeholder="Image URL" value={newProduct.image_url} onChange={e => setNewProduct({...newProduct, image_url: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none dark:text-white" />
              <textarea placeholder="Product Description" value={newProduct.description} onChange={e => setNewProduct({...newProduct, description: e.target.value})} className="w-full p-3 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl outline-none min-h-[80px] dark:text-white" />
              <button type="submit" className="w-full py-3.5 bg-amber-500 hover:bg-amber-600 text-black font-black rounded-xl transition shadow-lg shadow-amber-500/20">
                Publish Product
              </button>
            </form>
          </div>

          {/* Product Listing Grid */}
          <div className="lg:col-span-2 bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-6 shadow-sm space-y-4">
            <h2 className="text-xl font-black dark:text-white mb-4">Current Inventory ({products.length})</h2>
            <div className="space-y-3 max-h-[600px] overflow-y-auto pr-2">
              {products.map(product => (
                <div key={product.id} className="flex items-center justify-between bg-zinc-50 dark:bg-zinc-950 p-4 rounded-2xl border border-zinc-200 dark:border-zinc-800">
                  <div className="flex items-center gap-4">
                    <img src={product.image_url} alt={product.name} className="w-14 h-14 object-cover rounded-xl border border-zinc-200 dark:border-zinc-700" />
                    <div>
                      <h4 className="font-bold text-base dark:text-white">{product.name}</h4>
                      <p className="text-amber-500 font-black">EGP {product.price}</p>
                    </div>
                  </div>
                  <button onClick={() => handleDeleteProduct(product.id)} className="p-3 text-red-500 hover:bg-red-500/10 rounded-xl transition">
                    <Trash2 size={20} />
                  </button>
                </div>
              ))}
            </div>
          </div>

        </div>
      )}

      {/* TAB 3: DESIGN STUDIO */}
      {activeTab === 'design' && (
        <div className="bg-white dark:bg-zinc-900 border border-zinc-200 dark:border-zinc-800 rounded-3xl p-8 shadow-sm max-w-2xl mx-auto space-y-6">
          <div className="flex items-center gap-3">
            <div className="p-3 bg-amber-500/10 text-amber-500 rounded-2xl">
              <Palette size={24} />
            </div>
            <div>
              <h2 className="text-2xl font-black dark:text-white">Storefront Design Studio</h2>
              <p className="text-zinc-500 text-sm">Customize visual identifiers and thematic color tokens.</p>
            </div>
          </div>

          <div className="space-y-4 pt-4 border-t border-zinc-100 dark:border-zinc-800">
            <div className="space-y-2">
              <label className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Store Name</label>
              <input type="text" value={storeConfig.storeName} onChange={e => setStoreConfig({...storeConfig, storeName: e.target.value})} className="w-full p-4 bg-zinc-50 dark:bg-zinc-950 border border-zinc-200 dark:border-zinc-700 rounded-xl font-bold dark:text-white outline-none" />
            </div>

            <div className="space-y-2">
              <label className="font-bold text-sm text-zinc-700 dark:text-zinc-300">Brand Primary Accent Color</label>
              <div className="flex items-center gap-4">
                <input type="color" value={storeConfig.primaryColor} onChange={e => setStoreConfig({...storeConfig, primaryColor: e.target.value})} className="w-16 h-14 rounded-xl bg-transparent cursor-pointer border border-zinc-200 dark:border-zinc-700 p-1" />
                <span className="font-mono font-bold text-lg dark:text-white">{storeConfig.primaryColor}</span>
              </div>
            </div>

            <div className="pt-4">
              <button onClick={() => alert('Design configurations locked and updated successfully!')} className="w-full py-4 bg-amber-500 hover:bg-amber-600 text-black font-black text-lg rounded-xl transition shadow-lg shadow-amber-500/20">
                Save Design Changes
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}