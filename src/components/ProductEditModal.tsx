import { useState } from 'react';
import type { ChangeEvent, FormEvent } from 'react';
import { supabase } from '../lib/supabase';
import type { Product } from '../types';
import { X, Upload, Trash2, Star, Minus, Plus, Loader2 } from 'lucide-react';

interface Props {
  product: Product | null; // null = creating a new product
  onClose: () => void;
  onSaved: () => void;
}

export default function ProductEditModal({ product, onClose, onSaved }: Props) {
  const [form, setForm] = useState({
    name: product?.name ?? '',
    price: product?.price?.toString() ?? '',
    sale_price: product?.sale_price?.toString() ?? '',
    sale_ends_at: product?.sale_ends_at ? product.sale_ends_at.slice(0, 10) : '',
    description: product?.description ?? '',
    category: product?.category ?? '',
    stock: product?.stock ?? 0,
  });
  const [images, setImages] = useState<string[]>(
    product ? [product.image_url, ...(product.images ?? [])].filter(Boolean) : []
  );
  const [uploading, setUploading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleUpload = async (e: ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files || files.length === 0) return;
    setUploading(true);
    setError(null);
    try {
      const uploadedUrls: string[] = [];
      for (const file of Array.from(files)) {
        const path = `${Date.now()}-${Math.random().toString(36).slice(2)}-${file.name.replace(/[^a-zA-Z0-9.\-_]/g, '_')}`;
        const { error: uploadError } = await supabase.storage.from('product-images').upload(path, file);
        if (uploadError) throw uploadError;
        const { data } = supabase.storage.from('product-images').getPublicUrl(path);
        uploadedUrls.push(data.publicUrl);
      }
      setImages((prev) => [...prev, ...uploadedUrls]);
    } catch (err) {
      setError(err instanceof Error ? err.message : 'Upload failed');
    } finally {
      setUploading(false);
      e.target.value = '';
    }
  };

  const removeImage = (idx: number) => {
    setImages((prev) => prev.filter((_, i) => i !== idx));
  };

  const handlePublish = async (e: FormEvent) => {
    e.preventDefault();
    if (images.length === 0) {
      setError('Add at least one image before publishing.');
      return;
    }
    setSaving(true);
    setError(null);

    const payload = {
      name: form.name,
      price: parseFloat(form.price),
      sale_price: form.sale_price ? parseFloat(form.sale_price) : null,
      sale_ends_at: form.sale_ends_at || null,
      description: form.description,
      category: form.category || null,
      stock: form.stock,
      image_url: images[0],
      images: images.slice(1),
      is_active: true,
    };

    const { error: saveError } = product
      ? await supabase.from('products').update(payload).eq('id', product.id)
      : await supabase.from('products').insert([payload]);

    setSaving(false);
    if (saveError) {
      setError(saveError.message);
      return;
    }
    onSaved();
    onClose();
  };

  const previewPrice = form.sale_price ? parseFloat(form.sale_price) : parseFloat(form.price || '0');
  const previewOriginal = form.sale_price ? parseFloat(form.price || '0') : null;

  return (
    <div className="fixed inset-0 z-[70] bg-black/60 backdrop-blur-sm flex items-center justify-center p-4 overflow-y-auto">
      <div className="bg-white dark:bg-stone-900 rounded-3xl max-w-4xl w-full my-8 shadow-2xl">
        <div className="flex items-center justify-between p-6 border-b border-stone-200 dark:border-stone-800">
          <h2 className="text-xl font-black dark:text-white">{product ? 'Edit Product' : 'New Product'}</h2>
          <button onClick={onClose} className="p-2.5 rounded-xl hover:bg-stone-100 dark:hover:bg-stone-800 transition">
            <X size={20} className="dark:text-white" />
          </button>
        </div>

        <form onSubmit={handlePublish} className="grid grid-cols-1 lg:grid-cols-2 gap-6 p-6">
          {/* Form fields */}
          <div className="space-y-4">
            {error && <p className="text-red-500 text-sm font-bold bg-red-500/10 p-3 rounded-xl">{error}</p>}

            <input required type="text" placeholder="Product Name" value={form.name} onChange={(e) => setForm({ ...form, name: e.target.value })} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-xs font-bold text-stone-500">Price (EGP)</label>
                <input required type="number" value={form.price} onChange={(e) => setForm({ ...form, price: e.target.value })} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
              </div>
              <div>
                <label className="text-xs font-bold text-stone-500">Sale Price (optional)</label>
                <input type="number" placeholder="Leave empty for no sale" value={form.sale_price} onChange={(e) => setForm({ ...form, sale_price: e.target.value })} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
              </div>
            </div>

            {form.sale_price && (
              <div>
                <label className="text-xs font-bold text-stone-500">Sale Ends (optional)</label>
                <input type="date" value={form.sale_ends_at} onChange={(e) => setForm({ ...form, sale_ends_at: e.target.value })} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />
              </div>
            )}

            <input type="text" placeholder="Category" value={form.category} onChange={(e) => setForm({ ...form, category: e.target.value })} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none dark:text-white" />

            <div>
              <label className="text-xs font-bold text-stone-500">Stock</label>
              <div className="flex items-center gap-2 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl p-1.5 w-fit">
                <button type="button" onClick={() => setForm({ ...form, stock: Math.max(0, form.stock - 1) })} className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 transition dark:text-white">
                  <Minus size={14} />
                </button>
                <input
                  type="number"
                  value={form.stock}
                  onChange={(e) => setForm({ ...form, stock: Math.max(0, parseInt(e.target.value, 10) || 0) })}
                  className="w-16 text-center font-bold bg-transparent outline-none dark:text-white"
                />
                <button type="button" onClick={() => setForm({ ...form, stock: form.stock + 1 })} className="p-2.5 rounded-lg hover:bg-white dark:hover:bg-stone-800 transition dark:text-white">
                  <Plus size={14} />
                </button>
              </div>
            </div>

            <textarea placeholder="Description" value={form.description} onChange={(e) => setForm({ ...form, description: e.target.value })} className="w-full p-3 bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-700 rounded-xl outline-none min-h-[90px] dark:text-white" />

            <div className="space-y-2">
              <label className="text-xs font-bold text-stone-500">Images ({images.length})</label>
              <div className="grid grid-cols-4 gap-2">
                {images.map((img, idx) => (
                  <div key={idx} className="relative aspect-square rounded-xl overflow-hidden border border-stone-200 dark:border-stone-700 group">
                    <img src={img} alt="" className="w-full h-full object-cover" />
                    {idx === 0 && <span className="absolute top-1 left-1 bg-brand-500 text-white text-[9px] font-black px-1.5 py-0.5 rounded">MAIN</span>}
                    <button type="button" onClick={() => removeImage(idx)} className="absolute inset-0 bg-black/60 opacity-0 group-hover:opacity-100 transition flex items-center justify-center">
                      <Trash2 size={16} className="text-white" />
                    </button>
                  </div>
                ))}
                <label className="aspect-square rounded-xl border-2 border-dashed border-stone-300 dark:border-stone-700 flex items-center justify-center cursor-pointer hover:border-brand-500 transition">
                  {uploading ? <Loader2 size={18} className="animate-spin text-stone-400" /> : <Upload size={18} className="text-stone-400" />}
                  <input type="file" accept="image/*" multiple onChange={handleUpload} disabled={uploading} className="hidden" />
                </label>
              </div>
              <p className="text-[10px] text-stone-400">First image is the main thumbnail. Upload multiple at once, drag isn't required — just select several files.</p>
            </div>
          </div>

          {/* Live preview */}
          <div className="space-y-3">
            <label className="text-xs font-bold text-stone-500 uppercase">Live Preview</label>
            <div className="bg-stone-50 dark:bg-stone-950 border border-stone-200 dark:border-stone-800 rounded-3xl overflow-hidden sticky top-0">
              <div className="h-56 bg-stone-200 dark:bg-stone-800">
                {images[0] ? (
                  <img src={images[0]} alt="" className="w-full h-full object-cover" />
                ) : (
                  <div className="w-full h-full flex items-center justify-center text-stone-400 text-sm">No image yet</div>
                )}
              </div>
              <div className="p-5 space-y-2">
                <h3 className="font-black text-lg dark:text-white">{form.name || 'Product name'}</h3>
                {form.category && <span className="text-xs text-stone-500">{form.category}</span>}
                <p className="text-stone-500 text-xs line-clamp-2">{form.description || 'Description preview...'}</p>
                <div className="flex items-center gap-2 pt-2">
                  <span className="text-xl font-black text-brand-500">EGP {previewPrice || 0}</span>
                  {previewOriginal && <span className="text-sm text-stone-400 line-through">EGP {previewOriginal}</span>}
                </div>
                <p className={`text-xs font-bold ${form.stock <= 0 ? 'text-red-500' : form.stock <= 5 ? 'text-red-500' : 'text-emerald-500'}`}>
                  {form.stock <= 0 ? 'Out of stock' : form.stock <= 5 ? `Only ${form.stock} left` : 'In stock'}
                </p>
              </div>
            </div>

            <button
              type="submit"
              disabled={saving || uploading}
              className="w-full py-4 bg-brand-500 hover:bg-brand-600 text-white font-black rounded-xl transition shadow-lg shadow-brand-500/20 disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {saving ? <><Loader2 size={18} className="animate-spin" /> Publishing...</> : <><Star size={18} /> {product ? 'Save & Publish' : 'Publish Product'}</>}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}