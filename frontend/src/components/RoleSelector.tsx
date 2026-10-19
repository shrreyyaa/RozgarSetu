import React from 'react';
import { Language, UserRole } from '../types';

interface Props {
  lang: Language;
  onSelect: (role: UserRole) => void;
  onToggleLang: () => void;
}

export const RoleSelector: React.FC<Props> = ({ lang, onSelect, onToggleLang }) => {
  const hi = lang === 'hi';
  const cards: { role: UserRole; title: string; body: string }[] = [
    {
      role: 'planner',
      title: hi ? 'राज्य / राष्ट्रीय योजनाकार' : 'State / National Planner',
      body: hi
        ? 'कौन से व्यवसायों में कमी या अधिशेष है, कहाँ नया प्रशिक्षण चाहिए।'
        : 'See which trades are short or oversupplied, and where new training is needed.',
    },
    {
      role: 'iti_admin',
      title: hi ? 'आईटीआई / प्रशिक्षण केंद्र प्रशासक' : 'ITI / Training Centre Admin',
      body: hi
        ? 'अपने केंद्र के पाठ्यक्रम को स्थानीय नौकरी मांग से मिलाएँ और डेटा अपलोड करें।'
        : 'Match your centre’s courses to local job demand and upload training data.',
    },
  ];
  return (
    <div className="min-h-screen bg-[#F8FAFC] flex flex-col items-center justify-center px-4">
      <div className="max-w-2xl w-full space-y-6">
        <div className="text-center">
          <div className="inline-flex w-14 h-14 rounded-xl bg-blue-900 text-white font-bold text-xl items-center justify-center mb-3">
            {hi ? 'सेतु' : 'SETU'}
          </div>
          <h1 className="text-2xl font-bold text-slate-900">
            {hi ? 'श्रम बाज़ार सूचना प्रणाली' : 'Labour Market Intelligence System'}
          </h1>
          <p className="text-sm text-slate-600 mt-1">{hi ? 'आप कौन हैं?' : 'Who is using the system?'}</p>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          {cards.map((c) => (
            <button
              key={c.role}
              onClick={() => onSelect(c.role)}
              className="text-left bg-white border border-slate-200 hover:border-blue-900 hover:shadow-md rounded-xl p-5 transition cursor-pointer"
            >
              <p className="font-bold text-slate-900">{c.title}</p>
              <p className="text-sm text-slate-600 mt-2">{c.body}</p>
            </button>
          ))}
        </div>
        <div className="flex items-center justify-between text-xs text-slate-500">
          <span className="bg-amber-50 border border-amber-200 text-amber-900 rounded px-2 py-1">
            {hi ? 'प्रोटोटाइप: यह चयन लॉगिन नहीं है और सुरक्षित नहीं है।' : 'Prototype: this is a role picker, not a login, and is not secure.'}
          </span>
          <button onClick={onToggleLang} className="font-semibold text-blue-900 hover:underline cursor-pointer">
            {hi ? 'English' : 'हिन्दी'}
          </button>
        </div>
      </div>
    </div>
  );
};
