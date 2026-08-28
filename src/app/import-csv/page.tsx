'use client';

import React, { useState, useEffect } from 'react';
import { Shell } from '@/components/layout/Shell';
import { Lead } from '@/types';
import { createClient, isSupabaseConfigured } from '@/lib/supabase/client';
import { UploadCloud, CheckCircle2, AlertCircle, ArrowRight, AlertTriangle } from 'lucide-react';
import Papa from 'papaparse';
import { useRouter } from 'next/navigation';

export default function ImportCSVPage() {
  const router = useRouter();
  const supabase = createClient();
  const isConfigured = isSupabaseConfigured();

  const [csvData, setCsvData] = useState<any[]>([]);
  const [headers, setHeaders] = useState<string[]>([]);
  const [fileName, setFileName] = useState<string>('');
  const [isSuccess, setIsSuccess] = useState(false);
  const [importedCount, setImportedCount] = useState(0);
  const [existingCompanies, setExistingCompanies] = useState<string[]>([]);
  const [duplicateMatches, setDuplicateMatches] = useState<string[]>([]);

  useEffect(() => {
    async function loadExistingCompanies() {
      if (!isConfigured) return;
      const { data } = await supabase.from('leads').select('company_name');
      if (data) {
        setExistingCompanies(data.map((d: any) => d.company_name.toLowerCase().trim()));
      }
    }
    loadExistingCompanies();
  }, [isConfigured, supabase]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    setFileName(file.name);
    Papa.parse(file, {
      header: true,
      skipEmptyLines: true,
      complete: (results) => {
        setCsvData(results.data);
        if (results.meta.fields) {
          setHeaders(results.meta.fields);
        }

        // Duplicate check
        const duplicates: string[] = [];
        results.data.forEach((row: any) => {
          const compName = row['İşletme Adı'] || row['Firma'] || row['Company'] || row['İşletme'];
          if (compName && existingCompanies.includes(compName.toLowerCase().trim())) {
            duplicates.push(compName);
          }
        });
        setDuplicateMatches(duplicates);
      },
    });
  };

  const handleImportToDatabase = async () => {
    if (csvData.length === 0 || !isConfigured) return;

    const newLeads = csvData.map((row, idx) => {
      const companyName = row['İşletme Adı'] || row['Firma'] || row['Company'] || row['İşletme'] || `Aday ${idx + 1}`;
      const sector = row['Sektör'] || row['Sector'] || 'Dijital Dönüşüm';
      const cityDistrict = row['Konum'] || row['İlçe'] || row['City'] || 'İstanbul';
      const decisionMaker = row['Karar Verici'] || row['İsim'] || row['Contact'] || 'Yetkili';
      const phone = row['Telefon'] || row['Phone'] || '+90 530 000 0000';
      const email = row['E-posta'] || row['Email'] || null;
      const website = row['Web'] || row['Website'] || null;
      const instagram = row['Instagram'] || null;
      const dealVal = Number(row['Değer'] || row['Bütçe']) || 75000;

      return {
        company_name: companyName,
        sector,
        city_district: cityDistrict,
        decision_maker: decisionMaker,
        phone,
        email,
        website,
        instagram,
        priority: 'Orta' as const,
        status: 'Yeni' as const,
        estimated_deal_value: dealVal,
        win_probability: 50,
        contact_reason: 'Google Sheets CSV İçe Aktarım',
        notes: 'Google Sheets CSV dosyasından toplu olarak Supabase veritabanına aktarıldı.',
      };
    });

    const { error } = await supabase.from('leads').insert(newLeads);

    if (error) {
      alert(`Veriler aktarılırken hata oluştu: ${error.message}`);
    } else {
      setIsSuccess(true);
      setImportedCount(newLeads.length);
      setTimeout(() => {
        router.push('/leads');
      }, 2000);
    }
  };

  return (
    <Shell>
      <div className="space-y-6 max-w-4xl mx-auto">
        <div>
          <h1 className="text-2xl font-extrabold text-white tracking-tight">Google Sheets / CSV İçe Aktarma</h1>
          <p className="text-xs text-apex-muted mt-1">
            Google Sheets'te tuttuğunuz mevcut müşteri listelerinizi CSV formatında yükleyip tek tıkla Supabase veritabanına aktarın.
          </p>
        </div>

        {/* Upload Dropzone */}
        <div className="bg-apex-card border-2 border-dashed border-apex-border rounded-2xl p-10 text-center space-y-4 hover:border-apex-orange/60 transition-colors">
          <div className="w-14 h-14 rounded-2xl bg-apex-orange/15 border border-apex-orange/30 flex items-center justify-center mx-auto text-apex-orange">
            <UploadCloud className="w-8 h-8" />
          </div>

          <div>
            <h3 className="text-base font-bold text-white">CSV Dosyanızı Sürükleyin veya Seçin</h3>
            <p className="text-xs text-apex-muted mt-1">
              Google Sheets &gt; Dosya &gt; İndir &gt; Virgülle Ayrılmış Değerler (.csv) adımıyla dosyanızı indirin.
            </p>
          </div>

          <label className="inline-block px-5 py-2.5 bg-apex-orange hover:bg-apex-orange-hover text-white text-xs font-bold rounded-xl cursor-pointer shadow-lg shadow-apex-orange/20 transition-colors">
            <span>Dosya Seç</span>
            <input type="file" accept=".csv" onChange={handleFileUpload} className="hidden" />
          </label>

          {fileName && (
            <p className="text-xs font-mono text-apex-orange font-bold pt-2">
              Seçilen Dosya: {fileName} ({csvData.length} Satır Bulundu)
            </p>
          )}
        </div>

        {/* Duplicate Warning */}
        {duplicateMatches.length > 0 && (
          <div className="bg-amber-950/80 border border-amber-800 rounded-xl p-4 flex items-start gap-3 text-amber-300 text-xs font-semibold">
            <AlertTriangle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div>
              <strong className="block font-bold">Mevcut Şirket Uyarısı ({duplicateMatches.length} Eşleşme):</strong>
              <span>
                Şu işletmeler veritabanında zaten kayıtlı: {duplicateMatches.slice(0, 5).join(', ')}
                {duplicateMatches.length > 5 ? ` ve ${duplicateMatches.length - 5} diğer işletme...` : ''}
              </span>
            </div>
          </div>
        )}

        {/* Success Alert */}
        {isSuccess && (
          <div className="bg-emerald-950/80 border border-emerald-800 rounded-xl p-4 flex items-center gap-3 text-emerald-300 text-xs font-semibold">
            <CheckCircle2 className="w-5 h-5 text-emerald-400 shrink-0" />
            <span>
              Tebrikler! {importedCount} adet müşteri adayı başarıyla Supabase veritabanına aktarıldı. Müşteri Adayları sayfasına yönlendiriliyorsunuz...
            </span>
          </div>
        )}

        {/* CSV Preview Table */}
        {csvData.length > 0 && !isSuccess && (
          <div className="space-y-4">
            <div className="flex justify-between items-center">
              <h3 className="text-sm font-bold text-white">Veri Önizleme ({csvData.length} Kayıt)</h3>
              <button
                onClick={handleImportToDatabase}
                className="flex items-center gap-2 bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold px-4 py-2 rounded-lg transition-colors shadow-lg shadow-emerald-600/20"
              >
                <span>Supabase Veritabanına Aktar</span>
                <ArrowRight className="w-4 h-4" />
              </button>
            </div>

            <div className="bg-apex-card border border-apex-border rounded-xl overflow-hidden overflow-x-auto max-h-96">
              <table className="w-full text-left text-xs border-collapse">
                <thead>
                  <tr className="bg-apex-dark border-b border-apex-border text-apex-muted font-mono uppercase text-[10px]">
                    {headers.map((h, i) => (
                      <th key={i} className="py-2.5 px-3">
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody className="divide-y divide-apex-border/60">
                  {csvData.slice(0, 10).map((row, rIdx) => (
                    <tr key={rIdx} className="hover:bg-apex-hover/50 font-mono text-[11px]">
                      {headers.map((h, cIdx) => (
                        <td key={cIdx} className="py-2 px-3 text-neutral-300">
                          {row[h] || '-'}
                        </td>
                      ))}
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        )}
      </div>
    </Shell>
  );
}
