/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useRef, useCallback, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import { 
  Upload, 
  Plus, 
  Trash2, 
  Copy, 
  Download, 
  FileText, 
  AlertTriangle, 
  CheckCircle2,
  ChevronRight,
  Info,
  Sun,
  Moon,
  Languages,
  MousePointer2,
  Keyboard
} from 'lucide-react';

interface FilterSource {
  id: string;
  name: string;
  content: string;
  ruleCount: number;
}

type Language = 'pt' | 'en';
type Theme = 'light' | 'dark';
type InputMethod = 'upload' | 'paste';

const translations = {
  pt: {
    title: "Last Epoch Filter Merger",
    subtitle: "Ferramenta técnica para otimização de filtros de itens",
    limit: "Limite: 200 Regras",
    addFilters: "01. Adicionar Filtros",
    uploadTitle: "Clique ou arraste arquivos XML",
    uploadSub: "Suporta múltiplos arquivos",
    pastePlaceholder: "Cole o conteúdo XML do filtro aqui...",
    addPasteBtn: "Adicionar via Texto",
    selectedFilters: "02. Filtros Selecionados",
    files: "Arquivos",
    file: "Arquivo",
    emptyFilters: "Nenhum filtro adicionado ainda.",
    mergeBtn: "Mesclar Filtros",
    merging: "Processando...",
    resultTitle: "03. Resultado da Mesclagem",
    copy: "Copiar",
    download: "Download",
    note: "Observação: A ferramenta removeu duplicatas exatas de regras. Se o jogo possuir limites de regras, verifique se o total final está abaixo de 200 para garantir o funcionamento correto no Last Epoch.",
    errorInvalidXml: "O XML fornecido não contém regras válidas do Last Epoch.",
    errorExceeded: "O filtro mesclado excedeu o limite de 200 regras",
    errorProcess: "Erro ao processar os filtros. Verifique se o XML está correto.",
    successAdded: "adicionado com sucesso!",
    successMerged: "Filtros mesclados com sucesso! Total de",
    successRules: "regras únicas.",
    successCopied: "XML copiado para a área de transferência!",
    switchUpload: "Upload de Arquivos",
    switchPaste: "Colar XML",
    privacy: "Privacidade",
    terms: "Termos",
    github: "Github"
  },
  en: {
    title: "Last Epoch Filter Merger",
    subtitle: "Technical tool for item filter optimization",
    limit: "Limit: 200 Rules",
    addFilters: "01. Add Filters",
    uploadTitle: "Click or drag XML files",
    uploadSub: "Supports multiple files",
    pastePlaceholder: "Paste your filter XML content here...",
    addPasteBtn: "Add via Text",
    selectedFilters: "02. Selected Filters",
    files: "Files",
    file: "File",
    emptyFilters: "No filters added yet.",
    mergeBtn: "Merge Filters",
    merging: "Processing...",
    resultTitle: "03. Merge Result",
    copy: "Copy",
    download: "Download",
    note: "Note: The tool removed exact rule duplicates. If the game has rule limits, ensure the final total is below 200 to guarantee correct operation in Last Epoch.",
    errorInvalidXml: "The provided XML does not contain valid Last Epoch rules.",
    errorExceeded: "The merged filter exceeded the 200 rule limit",
    errorProcess: "Error processing filters. Check if the XML is correct.",
    successAdded: "added successfully!",
    successMerged: "Filters merged successfully! Total of",
    successRules: "unique rules.",
    successCopied: "XML copied to clipboard!",
    switchUpload: "File Upload",
    switchPaste: "Paste XML",
    privacy: "Privacy",
    terms: "Terms",
    github: "Github"
  }
};

export default function App() {
  const [filters, setFilters] = useState<FilterSource[]>([]);
  const [inputText, setInputText] = useState('');
  const [mergedXml, setMergedXml] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [isMerging, setIsMerging] = useState(false);
  const [language, setLanguage] = useState<Language>('pt');
  const [theme, setTheme] = useState<Theme>('light');
  const [inputMethod, setInputMethod] = useState<InputMethod>('upload');
  const fileInputRef = useRef<HTMLInputElement>(null);

  const t = translations[language];

  const parseRuleCount = (xmlString: string): number => {
    try {
      const parser = new DOMParser();
      const xmlDoc = parser.parseFromString(xmlString, "text/xml");
      const rules = xmlDoc.getElementsByTagName("Rule");
      return rules.length;
    } catch (e) {
      return 0;
    }
  };

  const addFilter = useCallback((name: string, content: string) => {
    const count = parseRuleCount(content);
    if (count === 0) {
      setError(t.errorInvalidXml);
      return;
    }
    
    const newFilter: FilterSource = {
      id: Math.random().toString(36).substring(7),
      name: name || `Filter ${filters.length + 1}`,
      content,
      ruleCount: count
    };
    
    setFilters(prev => [...prev, newFilter]);
    setInputText('');
    setError(null);
    setSuccess(`"${newFilter.name}" ${t.successAdded}`);
    setTimeout(() => setSuccess(null), 3000);
  }, [filters.length, t]);

  const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const files = e.target.files;
    if (!files) return;

    Array.from(files).forEach((file: File) => {
      const reader = new FileReader();
      reader.onload = (event) => {
        const content = event.target?.result as string;
        addFilter(file.name.replace('.xml', ''), content);
      };
      reader.readAsText(file);
    });
    
    if (fileInputRef.current) fileInputRef.current.value = '';
  };

  const handlePaste = () => {
    if (!inputText.trim()) return;
    addFilter(`${language === 'pt' ? 'Texto Colado' : 'Pasted Text'} ${filters.length + 1}`, inputText);
  };

  const removeFilter = (id: string) => {
    setFilters(prev => prev.filter(f => f.id !== id));
    setMergedXml(null);
  };

  const mergeFilters = async () => {
    if (filters.length === 0) return;
    
    setIsMerging(true);
    setError(null);
    
    try {
      const parser = new DOMParser();
      const uniqueRules = new Map<string, string>();
      let firstFilterName = filters[0].name;

      filters.forEach(filter => {
        const xmlDoc = parser.parseFromString(filter.content, "text/xml");
        const rules = xmlDoc.getElementsByTagName("Rule");
        
        for (let i = 0; i < rules.length; i++) {
          const rule = rules[i];
          const ruleContent = rule.innerHTML.trim();
          if (!uniqueRules.has(ruleContent)) {
            uniqueRules.set(ruleContent, rule.outerHTML);
          }
        }
      });

      const mergedRules = Array.from(uniqueRules.values());
      
      if (mergedRules.length > 200) {
        setError(`${t.errorExceeded} (${mergedRules.length} ${t.successRules.toLowerCase()}).`);
      }

      const resultXml = `<?xml version="1.0" encoding="utf-8"?>
<ItemFilter xmlns:xsi="http://www.w3.org/2001/XMLSchema-instance" xmlns:xsd="http://www.w3.org/2001/XMLSchema">
  <Name>${firstFilterName} Merged</Name>
  <Rules>
    ${mergedRules.join('\n    ')}
  </Rules>
</ItemFilter>`;

      setMergedXml(resultXml);
      setSuccess(`${t.successMerged} ${mergedRules.length} ${t.successRules}`);
    } catch (err) {
      setError(t.errorProcess);
    } finally {
      setIsMerging(false);
    }
  };

  const copyToClipboard = () => {
    if (!mergedXml) return;
    navigator.clipboard.writeText(mergedXml);
    setSuccess(t.successCopied);
    setTimeout(() => setSuccess(null), 3000);
  };

  const downloadXml = () => {
    if (!mergedXml) return;
    const blob = new Blob([mergedXml], { type: 'text/xml' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = 'MergedFilter.xml';
    document.body.appendChild(a);
    a.click();
    document.body.removeChild(a);
    URL.revokeObjectURL(url);
  };

  const toggleLanguage = () => setLanguage(prev => prev === 'pt' ? 'en' : 'pt');
  const toggleTheme = () => setTheme(prev => prev === 'light' ? 'dark' : 'light');

  return (
    <div className={`min-h-screen transition-colors duration-300 font-sans selection:bg-opacity-80 ${
      theme === 'light' 
        ? 'bg-[#E4E3E0] text-[#141414] selection:bg-[#141414] selection:text-[#E4E3E0]' 
        : 'bg-[#141414] text-[#E4E3E0] selection:bg-[#E4E3E0] selection:text-[#141414]'
    }`}>
      {/* Header */}
      <header className={`border-b p-6 md:p-12 transition-colors ${
        theme === 'light' ? 'border-[#141414]' : 'border-[#E4E3E0] border-opacity-20'
      }`}>
        <div className="max-w-7xl mx-auto flex flex-col md:flex-row md:items-start justify-between gap-8">
          <div>
            <h1 className="font-serif italic text-4xl md:text-6xl tracking-tight leading-none mb-4">
              {t.title}
            </h1>
            <p className="text-sm uppercase tracking-widest opacity-60 font-mono">
              {t.subtitle}
            </p>
          </div>
          
          <div className="flex flex-wrap items-center gap-4 md:gap-6">
            {/* Controls */}
            <div className="flex items-center gap-2">
              <button 
                onClick={toggleLanguage}
                className={`p-2 rounded-full transition-all flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest border ${
                  theme === 'light' ? 'border-[#141414] border-opacity-20 hover:bg-[#141414] hover:text-[#E4E3E0]' : 'border-[#E4E3E0] border-opacity-20 hover:bg-[#E4E3E0] hover:text-[#141414]'
                }`}
                title={language === 'pt' ? 'Switch to English' : 'Mudar para Português'}
              >
                <Languages size={14} />
                {language.toUpperCase()}
              </button>
              
              <button 
                onClick={toggleTheme}
                className={`p-2 rounded-full transition-all border ${
                  theme === 'light' ? 'border-[#141414] border-opacity-20 hover:bg-[#141414] hover:text-[#E4E3E0]' : 'border-[#E4E3E0] border-opacity-20 hover:bg-[#E4E3E0] hover:text-[#141414]'
                }`}
                title={theme === 'light' ? 'Dark Mode' : 'Light Mode'}
              >
                {theme === 'light' ? <Moon size={14} /> : <Sun size={14} />}
              </button>
            </div>

            <div className="hidden md:flex items-center gap-4 text-xs font-mono opacity-60">
              <span className="flex items-center gap-1">
                <Info size={14} /> {t.limit}
              </span>
              <span className={`w-px h-4 transition-colors ${theme === 'light' ? 'bg-[#141414]' : 'bg-[#E4E3E0]'} opacity-20`} />
              <span>v1.1.0</span>
            </div>
          </div>
        </div>
      </header>

      <main className="max-w-7xl mx-auto p-6 md:p-12 grid grid-cols-1 lg:grid-cols-12 gap-12">
        
        {/* Left Column: Input */}
        <div className="lg:col-span-5 space-y-8">
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif italic text-xl flex items-center gap-2">
                {t.addFilters}
              </h2>
            </div>
            
            <div className="space-y-6">
              {/* Input Method Toggle Switch */}
              <div className="flex flex-col items-center gap-4 py-4">
                <div className="flex items-center gap-6">
                  <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${inputMethod === 'upload' ? 'opacity-100' : 'opacity-30'}`}>
                    <Upload size={16} className={inputMethod === 'upload' ? 'text-blue-500' : ''} />
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                      {t.switchUpload}
                    </span>
                  </div>

                  <button
                    onClick={() => setInputMethod(prev => prev === 'upload' ? 'paste' : 'upload')}
                    className={`relative w-16 h-8 rounded-full transition-colors p-1 shadow-inner ${
                      theme === 'light' ? 'bg-[#141414]' : 'bg-[#E4E3E0]'
                    }`}
                    aria-label="Toggle input method"
                  >
                    <motion.div
                      className={`w-6 h-6 rounded-full shadow-md flex items-center justify-center ${
                        theme === 'light' ? 'bg-[#E4E3E0]' : 'bg-[#141414]'
                      }`}
                      animate={{
                        x: inputMethod === 'upload' ? 0 : 32
                      }}
                      transition={{ type: "spring", stiffness: 500, damping: 30 }}
                    >
                      <div className={`w-1 h-3 rounded-full ${theme === 'light' ? 'bg-[#141414]' : 'bg-[#E4E3E0]'} opacity-20`} />
                    </motion.div>
                  </button>

                  <div className={`flex flex-col items-center gap-2 transition-all duration-300 ${inputMethod === 'paste' ? 'opacity-100' : 'opacity-30'}`}>
                    <Keyboard size={16} className={inputMethod === 'paste' ? 'text-blue-500' : ''} />
                    <span className="text-[10px] font-mono uppercase tracking-widest font-bold">
                      {t.switchPaste}
                    </span>
                  </div>
                </div>
                
                <div className={`h-px w-24 transition-colors ${theme === 'light' ? 'bg-[#141414]' : 'bg-[#E4E3E0]'} opacity-10`} />
              </div>

              <AnimatePresence mode="wait">
                {inputMethod === 'upload' ? (
                  <motion.div 
                    key="upload"
                    initial={{ opacity: 0, x: -10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: 10 }}
                    onClick={() => fileInputRef.current?.click()}
                    className={`border-2 border-dashed p-12 rounded-lg cursor-pointer transition-all group ${
                      theme === 'light' 
                        ? 'border-[#141414] border-opacity-20 hover:bg-[#141414] hover:text-[#E4E3E0]' 
                        : 'border-[#E4E3E0] border-opacity-20 hover:bg-[#E4E3E0] hover:text-[#141414]'
                    }`}
                  >
                    <input 
                      type="file" 
                      ref={fileInputRef} 
                      onChange={handleFileUpload} 
                      multiple 
                      accept=".xml" 
                      className="hidden" 
                    />
                    <div className="flex flex-col items-center text-center gap-4">
                      <Upload className="group-hover:scale-110 transition-transform" size={32} />
                      <div>
                        <p className="font-medium">{t.uploadTitle}</p>
                        <p className="text-[10px] opacity-60 font-mono mt-1 uppercase tracking-widest">{t.uploadSub}</p>
                      </div>
                    </div>
                  </motion.div>
                ) : (
                  <motion.div 
                    key="paste"
                    initial={{ opacity: 0, x: 10 }}
                    animate={{ opacity: 1, x: 0 }}
                    exit={{ opacity: 0, x: -10 }}
                    className="space-y-4"
                  >
                    <textarea
                      value={inputText}
                      onChange={(e) => setInputText(e.target.value)}
                      placeholder={t.pastePlaceholder}
                      className={`w-full h-60 border p-4 font-mono text-xs focus:outline-none transition-all resize-none ${
                        theme === 'light' 
                          ? 'bg-white border-[#141414] border-opacity-20 focus:border-opacity-100' 
                          : 'bg-[#141414] border-[#E4E3E0] border-opacity-20 focus:border-opacity-100'
                      }`}
                    />
                    <button
                      onClick={handlePaste}
                      disabled={!inputText.trim()}
                      className={`w-full py-4 font-mono text-xs uppercase tracking-widest disabled:opacity-30 disabled:cursor-not-allowed transition-all flex items-center justify-center gap-2 ${
                        theme === 'light' ? 'bg-[#141414] text-[#E4E3E0] hover:opacity-90' : 'bg-[#E4E3E0] text-[#141414] hover:opacity-90'
                      }`}
                    >
                      <Plus size={16} /> {t.addPasteBtn}
                    </button>
                  </motion.div>
                )}
              </AnimatePresence>
            </div>
          </section>

          {/* Status Messages */}
          <AnimatePresence mode="wait">
            {error && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 border text-[10px] font-mono flex items-start gap-3 ${
                  theme === 'light' ? 'bg-red-50 border-red-200 text-red-800' : 'bg-red-950 bg-opacity-30 border-red-900 text-red-300'
                }`}
              >
                <AlertTriangle size={14} className="shrink-0" />
                <span>{error}</span>
              </motion.div>
            )}
            {success && (
              <motion.div 
                initial={{ opacity: 0, y: 10 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -10 }}
                className={`p-4 border text-[10px] font-mono flex items-start gap-3 ${
                  theme === 'light' ? 'bg-green-50 border-green-200 text-green-800' : 'bg-green-950 bg-opacity-30 border-green-900 text-green-300'
                }`}
              >
                <CheckCircle2 size={14} className="shrink-0" />
                <span>{success}</span>
              </motion.div>
            )}
          </AnimatePresence>
        </div>

        {/* Right Column: List & Result */}
        <div className="lg:col-span-7 space-y-12">
          
          {/* Filter List */}
          <section>
            <div className="flex items-center justify-between mb-6">
              <h2 className="font-serif italic text-xl flex items-center gap-2">
                {t.selectedFilters}
              </h2>
              <span className="text-[10px] font-mono opacity-60 uppercase tracking-widest">
                {filters.length} {filters.length === 1 ? t.file : t.files}
              </span>
            </div>

            <div className={`border divide-y transition-all ${
              theme === 'light' 
                ? 'border-[#141414] border-opacity-10 divide-[#141414] divide-opacity-10 bg-white bg-opacity-50' 
                : 'border-[#E4E3E0] border-opacity-10 divide-[#E4E3E0] divide-opacity-10 bg-[#E4E3E0] bg-opacity-5'
            }`}>
              <AnimatePresence initial={false}>
                {filters.length === 0 ? (
                  <div className="p-12 text-center opacity-40 italic text-sm">
                    {t.emptyFilters}
                  </div>
                ) : (
                  filters.map((filter) => (
                    <motion.div 
                      key={filter.id}
                      initial={{ opacity: 0 }}
                      animate={{ opacity: 1 }}
                      exit={{ opacity: 0 }}
                      className={`p-4 flex items-center justify-between group transition-all ${
                        theme === 'light' ? 'hover:bg-[#141414] hover:text-[#E4E3E0]' : 'hover:bg-[#E4E3E0] hover:text-[#141414]'
                      }`}
                    >
                      <div className="flex items-center gap-4">
                        <FileText size={18} className="opacity-40 group-hover:opacity-100" />
                        <div>
                          <p className="text-sm font-medium truncate max-w-[200px] md:max-w-md">{filter.name}</p>
                          <p className="text-[10px] font-mono opacity-60 group-hover:opacity-80 uppercase tracking-widest">
                            {filter.ruleCount} {t.successRules}
                          </p>
                        </div>
                      </div>
                      <button 
                        onClick={() => removeFilter(filter.id)}
                        className="p-2 opacity-0 group-hover:opacity-100 hover:text-red-400 transition-all"
                      >
                        <Trash2 size={16} />
                      </button>
                    </motion.div>
                  ))
                )}
              </AnimatePresence>
            </div>

            {filters.length > 0 && (
              <button
                onClick={mergeFilters}
                disabled={isMerging}
                className={`mt-6 w-full py-4 font-mono text-sm uppercase tracking-[0.2em] transition-all flex items-center justify-center gap-3 ${
                  theme === 'light' ? 'bg-[#141414] text-[#E4E3E0] hover:bg-opacity-90' : 'bg-[#E4E3E0] text-[#141414] hover:bg-opacity-90'
                }`}
              >
                {isMerging ? t.merging : t.mergeBtn}
                <ChevronRight size={18} />
              </button>
            )}
          </section>

          {/* Result Area */}
          <AnimatePresence>
            {mergedXml && (
              <motion.section
                initial={{ opacity: 0, y: 20 }}
                animate={{ opacity: 1, y: 0 }}
                className="space-y-6"
              >
                <div className="flex items-center justify-between">
                  <h2 className="font-serif italic text-xl">
                    {t.resultTitle}
                  </h2>
                  <div className="flex gap-2">
                    <button 
                      onClick={copyToClipboard}
                      className={`p-2 border transition-all flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest ${
                        theme === 'light' 
                          ? 'border-[#141414] border-opacity-20 hover:bg-[#141414] hover:text-[#E4E3E0]' 
                          : 'border-[#E4E3E0] border-opacity-20 hover:bg-[#E4E3E0] hover:text-[#141414]'
                      }`}
                    >
                      <Copy size={14} /> {t.copy}
                    </button>
                    <button 
                      onClick={downloadXml}
                      className={`p-2 border transition-all flex items-center gap-2 text-[10px] font-mono uppercase tracking-widest ${
                        theme === 'light' 
                          ? 'border-[#141414] border-opacity-20 hover:bg-[#141414] hover:text-[#E4E3E0]' 
                          : 'border-[#E4E3E0] border-opacity-20 hover:bg-[#E4E3E0] hover:text-[#141414]'
                      }`}
                    >
                      <Download size={14} /> {t.download}
                    </button>
                  </div>
                </div>

                <div className="relative">
                  <div className="absolute top-4 right-4 text-[10px] font-mono opacity-40 uppercase tracking-widest">
                    XML Preview
                  </div>
                  <pre className={`w-full h-80 p-6 font-mono text-[10px] overflow-auto border transition-all ${
                    theme === 'light' 
                      ? 'bg-[#141414] text-[#E4E3E0] border-[#141414] selection:bg-[#E4E3E0] selection:text-[#141414]' 
                      : 'bg-[#E4E3E0] text-[#141414] border-[#E4E3E0] selection:bg-[#141414] selection:text-[#E4E3E0]'
                  }`}>
                    {mergedXml}
                  </pre>
                </div>
                
                <div className={`p-4 border text-[10px] font-mono opacity-60 leading-relaxed ${
                  theme === 'light' ? 'border-[#141414] border-opacity-10 bg-white' : 'border-[#E4E3E0] border-opacity-10 bg-[#E4E3E0] bg-opacity-5'
                }`}>
                  <p>{t.note}</p>
                </div>
              </motion.section>
            )}
          </AnimatePresence>
        </div>
      </main>

      {/* Footer */}
      <footer className={`max-w-7xl mx-auto p-12 border-t mt-12 flex flex-col md:flex-row justify-between gap-6 text-[10px] font-mono opacity-40 uppercase tracking-widest transition-colors ${
        theme === 'light' ? 'border-[#141414] border-opacity-10' : 'border-[#E4E3E0] border-opacity-10'
      }`}>
        <div>{t.title} &copy; 2026</div>
        <div className="flex gap-6">
          <a href="#" className="hover:opacity-100">{t.privacy}</a>
          <a href="#" className="hover:opacity-100">{t.terms}</a>
          <a href="#" className="hover:opacity-100">{t.github}</a>
        </div>
      </footer>
    </div>
  );
}
