/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import { useState, useEffect } from 'react';
import { 
  Clipboard, 
  Check, 
  Shield, 
  Zap, 
  AlertCircle,
  QrCode,
  Plus,
  ArrowLeft,
  RefreshCw,
  Image as ImageIcon
} from 'lucide-react';
import { QRCodeSVG } from 'qrcode.react';
import jsQR from 'jsqr';
import { initializeApp } from 'firebase/app';
import { getFirestore, collection, addDoc, doc, getDoc, serverTimestamp } from 'firebase/firestore';
import firebaseConfig from '../firebase-applet-config.json';

// Initialize Firebase
const app = initializeApp(firebaseConfig);
const db = getFirestore(app, firebaseConfig.firestoreDatabaseId);

export default function App() {
  const [utilInput, setUtilInput] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [copiedField, setCopiedField] = useState<string | null>(null);
  const [publicIp, setPublicIp] = useState<string>('Detecting...');
  const [uploadedImage, setUploadedImage] = useState<string | null>(null);
  const [isUploading, setIsUploading] = useState(false);
  const [sharedImage, setSharedImage] = useState<string | null>(null);

  useEffect(() => {
    fetch('https://api.ipify.org?format=json')
      .then(res => res.json())
      .then(data => setPublicIp(data.ip))
      .catch(() => setPublicIp('External Trace Hidden'));

    // Check for shared image in URL
    const params = new URLSearchParams(window.location.search);
    const imgId = params.get('imgId');
    if (imgId) {
      const fetchSharedImg = async () => {
        try {
          const docRef = doc(db, 'images', imgId);
          const docSnap = await getDoc(docRef);
          if (docSnap.exists()) {
            setSharedImage(docSnap.data().base64);
          } else {
            setError("Sawirka lama helin ama waa la tirtiray.");
          }
        } catch (err) {
          console.error(err);
          setError("Cillad ayaa dhacday markii sawirka la soo xirayay.");
        }
      };
      fetchSharedImg();
    }
  }, []);

  const downloadQR = () => {
    const canvas = document.querySelector('canvas');
    if (canvas) {
      const url = canvas.toDataURL("image/png");
      const link = document.createElement('a');
      link.download = `sentinel-qr-${Date.now()}.png`;
      link.href = url;
      link.click();
    }
  };

  const handleImageScan = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    const reader = new FileReader();
    reader.onload = (event) => {
      const dataUrl = event.target?.result as string;
      setUploadedImage(dataUrl);
      
      const img = new Image();
      img.onload = async () => {
        const canvas = document.createElement('canvas');
        const context = canvas.getContext('2d');
        if (!context) return;

        // Compression logic
        let width = img.width;
        let height = img.height;
        const MAX_SIZE = 800; // Resize large images

        if (width > height) {
          if (width > MAX_SIZE) {
            height *= MAX_SIZE / width;
            width = MAX_SIZE;
          }
        } else {
          if (height > MAX_SIZE) {
            width *= MAX_SIZE / height;
            height = MAX_SIZE;
          }
        }

        canvas.width = width;
        canvas.height = height;
        context.drawImage(img, 0, 0, width, height);
        
        const imageData = context.getImageData(0, 0, canvas.width, canvas.height);
        const code = jsQR(imageData.data, imageData.width, imageData.height);

        if (code) {
          setUtilInput(code.data);
          setError(null);
        } else {
          setIsUploading(true);
          try {
            const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.6); 
            
            const docRef = await addDoc(collection(db, 'images'), {
              base64: compressedDataUrl,
              createdAt: serverTimestamp(),
              name: file.name
            });
            const shareUrl = `${window.location.origin}${window.location.pathname}?imgId=${docRef.id}`;

            setUtilInput(shareUrl);
            setError("Sawirka waa la cadaadiyey oo la kaydiyey! QR Code-kani waa link-ga sawirkaaga.");
          } catch (err: any) {
            console.error(err);
            const errorMsg = err?.code === 'permission-denied' 
              ? "Firebase Permission Denied: Hubi Authorized Domains!" 
              : `Cillad: ${err?.message || 'Lama yaqaan'}`;
            setError(errorMsg);
          } finally {
            setIsUploading(false);
          }
        }
      };
      img.src = dataUrl;
    };
    reader.readAsDataURL(file);
  };

  const copyToClipboard = async (text: string, fieldName: string) => {
    try {
      await navigator.clipboard.writeText(text);
      setCopiedField(fieldName);
      setTimeout(() => setCopiedField(null), 2000);
    } catch (err) {
      console.error('Failed to copy!', err);
    }
  };

  return (
    <div className="min-h-screen bg-[#05070a] text-[#e0e6ed] font-sans selection:bg-cyan-500/30 overflow-x-hidden">
      <div className="fixed inset-0 atmosphere z-0" />

      <div className="relative z-10 max-w-6xl mx-auto min-h-screen px-4 sm:px-6 py-6 sm:py-8 flex flex-col">
        {/* Header */}
        <header className="w-full flex flex-col sm:flex-row justify-between items-center mb-8 gap-4">
          <div className="flex items-center space-x-3 sm:space-x-4">
            <div className="w-10 h-10 bg-cyan-500 rounded-lg flex items-center justify-center shadow-lg shadow-cyan-500/20">
              <Shield size={24} className="text-black stroke-[2.5]" />
            </div>
            <div>
              <h1 className="text-xl font-bold tracking-tight text-white uppercase glow-text leading-none">v2rayNG</h1>
              <div className="flex items-center gap-2 mt-1">
                <p className="text-[9px] text-cyan-500/70 font-bold tracking-[0.2em] uppercase">Cloud Sharing</p>
                <span className="text-[9px] text-slate-700">•</span>
                <p className="text-[9px] text-slate-500 font-mono tracking-tighter">{publicIp}</p>
              </div>
            </div>
          </div>

          <div className="flex bg-black/40 p-1 rounded-xl border border-white/5 w-full sm:w-auto">
            <div className="px-6 py-2 rounded-lg text-xs font-black bg-cyan-500 text-black tracking-widest uppercase shadow-[0_0_20px_rgba(34,211,238,0.3)]">
              Toolkit Mode
            </div>
          </div>
        </header>

        <main className="flex-1">
          {sharedImage ? (
            <div className="flex flex-col items-center justify-center py-12">
               <div className="glass-panel p-6 sm:p-10 flex flex-col items-center max-w-2xl w-full text-center">
                  <div className="flex items-center justify-between w-full mb-6 text-left">
                    <h2 className="text-sm font-black text-white uppercase tracking-widest">Shared Image</h2>
                    <button onClick={() => setSharedImage(null)} className="text-xs text-cyan-500 font-bold uppercase flex items-center gap-2 hover:text-white transition-colors">
                       <ArrowLeft size={16} /> Markale
                    </button>
                  </div>
                  <div className="w-full rounded-2xl overflow-hidden border border-white/10 bg-black shadow-2xl mb-6">
                    <img src={sharedImage} alt="Shared" className="w-full h-auto max-h-[70vh] object-contain mx-auto" />
                  </div>
                  <p className="text-[10px] text-slate-500 mono uppercase tracking-widest leading-relaxed">Waxaad soo xiratay sawir lagu soo share-gareeyey Sentinel-X QR.</p>
               </div>
            </div>
          ) : (
            <div className="flex flex-col lg:flex-row gap-6 lg:gap-12 text-center items-center justify-center w-full">
               <div className="flex-1 space-y-6 sm:space-y-8 w-full">
                 <div className="glass-panel p-6 sm:p-10 flex flex-col items-center max-w-2xl mx-auto">
                    <div className="w-12 h-12 sm:w-16 sm:h-16 bg-white/5 rounded-full flex items-center justify-center text-cyan-500 mb-6 sm:mb-8 border border-white/10">
                      <QrCode size={24} className="sm:hidden" />
                      <QrCode size={32} className="hidden sm:block" />
                    </div>
                    <h2 className="text-xl sm:text-2xl font-black text-white tracking-tight mb-2 uppercase text-center">Toolkit</h2>
                    <p className="text-[10px] sm:text-xs text-slate-500 mb-8 sm:mb-10 mono text-center max-w-sm italic">Soo geli sawir kasta si uu link kuugu dhalisto.</p>
                    
                    <div className="w-full relative">
                      <input 
                        value={utilInput}
                        onChange={(e) => setUtilInput(e.target.value)}
                        placeholder="Geli link ama domain kasta..."
                        className="w-full bg-white/5 border border-white/10 rounded-2xl px-4 sm:px-6 py-4 sm:py-5 mono text-center text-base sm:text-lg focus:outline-none focus:border-cyan-500/50 transition-all placeholder:text-slate-800 appearance-none"
                      />
                      <div className="absolute right-4 sm:right-16 top-1/2 -translate-y-1/2 text-slate-800 flex items-center gap-2">
                        <button 
                          onClick={() => document.getElementById('toolkit-image-upload')?.click()}
                          className={`p-2 rounded-lg hover:bg-white/5 transition-all ${isUploading ? 'animate-spin text-cyan-500' : 'text-slate-600 hover:text-cyan-500'}`}
                          title="Scan or Share Image"
                          disabled={isUploading}
                        >
                          {isUploading ? <RefreshCw size={18} /> : <ImageIcon size={18} />}
                        </button>
                        <Zap size={16} />
                      </div>
                      <input 
                        type="file" 
                        id="toolkit-image-upload" 
                        className="hidden" 
                        accept="image/*"
                        onChange={handleImageScan}
                      />
                    </div>
                    {error && <div className="mt-4 p-3 bg-red-500/5 border border-red-500/20 rounded-lg text-red-400 text-[10px] font-mono text-center">{error}</div>}
                 </div>

                 {uploadedImage && (
                   <div className="glass-panel p-4 sm:p-6 flex flex-col items-center">
                     <div className="flex items-center justify-between w-full mb-4">
                       <h3 className="text-[10px] font-black text-slate-500 uppercase tracking-widest text-left">Preview</h3>
                       <button onClick={() => setUploadedImage(null)} className="text-[9px] text-red-500 font-bold uppercase hover:text-white transition-colors">Ka saar</button>
                     </div>
                     <div className="w-full rounded-xl overflow-hidden border border-white/5 bg-black/40">
                       <img src={uploadedImage} alt="Uploaded" className="w-full h-auto max-h-64 object-contain mx-auto" />
                     </div>
                   </div>
                 )}

                 <div className="flex flex-col items-center max-w-xs mx-auto w-full">
                    <div className="glass-panel p-6 sm:p-8 w-full aspect-square flex flex-col items-center justify-center">
                       {utilInput ? (
                           <>
                             <div className="bg-white p-4 rounded-xl shadow-[0_0_40px_rgba(34,211,238,0.2)] mb-6 max-w-full">
                               <QRCodeSVG value={utilInput} size={180} level="H" includeMargin className="max-w-full h-auto" />
                             </div>
                             <div className="flex gap-2 w-full">
                               <button 
                                 onClick={() => copyToClipboard(utilInput, 'link')}
                                 className="flex-1 py-3 rounded-xl bg-white/5 border border-white/10 text-white text-[10px] font-black uppercase tracking-widest hover:bg-white/10 transition-all flex items-center justify-center gap-2"
                               >
                                 {copiedField === 'link' ? <Check size={14} /> : <Clipboard size={14} />}
                                 Copy
                               </button>
                               <button 
                                 onClick={downloadQR}
                                 className="flex-1 py-3 rounded-xl bg-cyan-500 text-black text-[10px] font-black uppercase tracking-widest hover:bg-white transition-all flex items-center justify-center gap-2"
                               >
                                 Download
                               </button>
                             </div>
                           </>
                       ) : (
                         <div className="flex flex-col items-center text-slate-800 italic">
                           <Plus size={48} strokeWidth={0.5} className="mb-4" />
                           <span className="text-[10px] font-mono uppercase tracking-[0.2em]">Cilaaqaad la'aan</span>
                         </div>
                       )}
                    </div>
                 </div>
               </div>
            </div>
          )}
        </main>

        <footer className="mt-8 sm:mt-12 pt-6 sm:pt-8 border-t border-white/5 flex flex-col sm:flex-row justify-between items-center text-[8px] sm:text-[9px] font-bold tracking-[0.3em] text-slate-700 uppercase gap-4 text-center">
          <div className="flex gap-4">
            <span>Core v5.25</span>
            <span>QR CLOUD ACTIVE</span>
          </div>
          <p>© 2026 Sentinel-X // QR-SHARE</p>
        </footer>
      </div>
    </div>
  );
}
