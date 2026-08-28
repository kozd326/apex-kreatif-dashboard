'use client';

import React, { useState } from 'react';
import { Shell } from '@/components/layout/Shell';
import { INITIAL_TEMPLATES } from '@/lib/templatesData';
import { MessageSquareQuote, Copy, Check, Sparkles } from 'lucide-react';

export default function TemplatesPage() {
  const [selectedCategory, setSelectedCategory] = useState<string>('ALL');
  const [copiedId, setCopiedId] = useState<string | null>(null);

  // Dynamic variable customizer state
  const [customName, setCustomName] = useState('Selin Hanım');
  const [customBrand, setCustomBrand] = useState('Vortex Mimarlık');
  const [customOpportunity, setCustomOpportunity] = useState('Mobil web hızı ve online randevu sistemi');
  const [customService, setCustomService] = useState('Web Sitesi + Randevu Dashboard\'u');

  const categories = Array.from(new Set(INITIAL_TEMPLATES.map((t) => t.category)));

  const filteredTemplates = INITIAL_TEMPLATES.filter(
    (t) => selectedCategory === 'ALL' || t.category === selectedCategory
  );

  const getProcessedContent = (rawContent: string) => {
    return rawContent
      .replace(/\[İsim\]/g, customName)
      .replace(/\[Marka\]/g, customBrand)
      .replace(/\[Somut Fırsat\]/g, customOpportunity)
      .replace(/\[Önerilen Hizmet\]/g, customService)
      .replace(/\[Danışman Adı\]/g, 'Kaan')
      .replace(/\[Saat\]/g, '14:30')
      .replace(/\[Link\]/g, 'https://meet.google.com/apex-kreatif');
  };

  const handleCopy = (content: string, id: string) => {
    const processed = getProcessedContent(content);
    navigator.clipboard.writeText(processed);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <Shell>
      <div className="space-y-6">
        {/* Header */}
        <div className="flex justify-between items-center bg-apex-card border border-apex-border rounded-2xl p-6 shadow-xl">
          <div>
            <div className="flex items-center gap-2 text-apex-orange text-xs font-bold uppercase tracking-wider mb-1">
              <Sparkles className="w-4 h-4" />
              <span>Satış & İletişim Şablonları</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">Mesaj Şablonları (Outreach Templates)</h1>
            <p className="text-xs text-apex-muted mt-1">
              Instagram DM, WhatsApp, e-posta ve takip konuşmaları için onaylı şablonlar. Tek tıkla kopyalayın!
            </p>
          </div>
        </div>

        {/* Live Variable Customizer Bar */}
        <div className="bg-apex-card border border-apex-border rounded-xl p-4 space-y-3">
          <span className="text-xs font-bold text-apex-orange uppercase tracking-wider block">
            Değişken Özelleştirici (Canlı Doldurucu)
          </span>
          <div className="grid grid-cols-1 md:grid-cols-4 gap-3 text-xs">
            <div>
              <label className="block text-apex-muted font-semibold mb-1">[İsim]</label>
              <input
                type="text"
                value={customName}
                onChange={(e) => setCustomName(e.target.value)}
                placeholder="Örn: Selin Hanım"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2 focus:border-apex-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-apex-muted font-semibold mb-1">[Marka]</label>
              <input
                type="text"
                value={customBrand}
                onChange={(e) => setCustomBrand(e.target.value)}
                placeholder="Örn: Vortex Mimarlık"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2 focus:border-apex-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-apex-muted font-semibold mb-1">[Somut Fırsat]</label>
              <input
                type="text"
                value={customOpportunity}
                onChange={(e) => setCustomOpportunity(e.target.value)}
                placeholder="Mobil hız ve online randevu"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2 focus:border-apex-orange focus:outline-none"
              />
            </div>
            <div>
              <label className="block text-apex-muted font-semibold mb-1">[Önerilen Hizmet]</label>
              <input
                type="text"
                value={customService}
                onChange={(e) => setCustomService(e.target.value)}
                placeholder="Web + Randevu Dashboard"
                className="w-full bg-apex-dark border border-apex-border rounded-lg text-white p-2 focus:border-apex-orange focus:outline-none"
              />
            </div>
          </div>
        </div>

        {/* Category Filter Tabs */}
        <div className="flex gap-2 overflow-x-auto pb-1">
          <button
            onClick={() => setSelectedCategory('ALL')}
            className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
              selectedCategory === 'ALL'
                ? 'bg-apex-orange text-white'
                : 'bg-apex-card border border-apex-border text-apex-muted hover:text-white'
            }`}
          >
            Tüm Şablonlar
          </button>
          {categories.map((cat) => (
            <button
              key={cat}
              onClick={() => setSelectedCategory(cat)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold whitespace-nowrap transition-colors ${
                selectedCategory === cat
                  ? 'bg-apex-orange text-white'
                  : 'bg-apex-card border border-apex-border text-apex-muted hover:text-white'
              }`}
            >
              {cat}
            </button>
          ))}
        </div>

        {/* Templates Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          {filteredTemplates.map((tmpl) => {
            const processedText = getProcessedContent(tmpl.content);

            return (
              <div
                key={tmpl.id}
                className="bg-apex-card border border-apex-border rounded-2xl p-6 space-y-4 shadow-xl flex flex-col justify-between"
              >
                <div className="space-y-2">
                  <div className="flex justify-between items-start">
                    <span className="text-[10px] font-mono font-bold px-2 py-0.5 rounded bg-apex-orange-light border border-apex-orange/30 text-apex-orange">
                      {tmpl.category}
                    </span>
                    <button
                      onClick={() => handleCopy(tmpl.content, tmpl.id)}
                      className="flex items-center gap-1 text-xs font-bold bg-apex-dark border border-apex-border px-3 py-1.5 rounded-lg text-apex-orange hover:bg-apex-orange hover:text-white transition-colors"
                    >
                      {copiedId === tmpl.id ? <Check className="w-3.5 h-3.5 text-emerald-400" /> : <Copy className="w-3.5 h-3.5" />}
                      <span>{copiedId === tmpl.id ? 'Kopyalandı!' : 'Kopyala'}</span>
                    </button>
                  </div>

                  <h3 className="text-base font-bold text-white">{tmpl.title}</h3>
                  <p className="text-xs text-apex-muted">{tmpl.description}</p>
                </div>

                <div className="bg-apex-dark border border-apex-border rounded-xl p-4 text-xs font-mono text-neutral-200 leading-relaxed whitespace-pre-line">
                  {processedText}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </Shell>
  );
}
