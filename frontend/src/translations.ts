import { Language } from './types';

export const TRANSLATIONS = {
  en: {
    // Branding & Header
    appTitle: "SETU",
    appSubTitle: "AI-Enabled Labour Market Intelligence System",
    ministry: "Ministry of Skill Development & Entrepreneurship (MSDE)",
    demoWarning: "Simulated demo data — not official government statistics. Ingest live data in production.",
    
    // Navigation & Tabs
    navNational: "National Overview",
    navState: "State View",
    navDistrict: "District Drill-Down",
    navEarlyWarning: "Early-Warning Panel",
    navAdvanced: "Data, Pathways & Siting",
    
    // Breadcrumbs
    india: "All India",
    backToNational: "← Back to National View",
    backToState: "← Back to State View",
    
    // Controls
    forecastHorizon: "Forecast Horizon:",
    months: "months",
    month1: "1 Month",
    month3: "3 Months",
    month6: "6 Months",
    resetFilters: "Reset All",
    switchLanguage: "हिन्दी में देखें",
    selectState: "Select State",
    selectDistrict: "Select District",
    
    // Status & Verdicts (Plain Language First)
    criticalShortage: "Severe Shortage",
    criticalShortageDesc: "Too few trained — severe deficit for employer hiring",
    shortage: "Shortage",
    shortageDesc: "More jobs available than workers being trained",
    surplus: "High Oversupply Risk",
    surplusDesc: "Too many trained, not enough jobs — risk of unemployment",
    mildSurplus: "Mild Oversupply Risk",
    mildSurplusDesc: "Training output slightly exceeds local job openings",
    balanced: "Balanced",
    balancedDesc: "Training and job demand are well-matched",
    noData: "Insufficient Data",
    noDataDesc: "Data currently being ingested",
    
    // Plain Language Card Labels
    headlineNational: "Trades Need Immediate Attention Nationally",
    headlineNationalSub: "trades where training and hiring are severely out of sync across key industrial sectors.",
    criticalShortageCount: "Critical Shortage Trades",
    oversupplyCount: "Oversupply Risk Trades",
    balancedCount: "Balanced Trades",
    totalVacanciesMonthly: "Total Monthly Jobs",
    totalTrainedMonthly: "People Trained / Month",
    netMonthlyGap: "Net Monthly Gap",
    
    // National Screen
    drillDownStateHint: "Click any state below or on the map to inspect its districts and priority trade gaps.",
    mapTitle: "National Skill Gap Map",
    mapSub: "Colours indicate overall skill balance: Red/Amber = Shortage / Needs Attention, Green = Balanced.",
    stateRankTitle: "States by Skilling Urgency",
    viewStateBtn: "Inspect State",
    districtsAnalyzed: "Districts monitored",
    criticalTradesInState: "critical trades",
    
    // State Screen
    stateOverviewTitle: "State Skill Intelligence",
    districtsInState: "Districts in this State",
    clickDistrictHint: "Click a district to see trade-by-trade job vs training numbers.",
    top5TradesTitle: "Top 5 Trades with the Worst Gaps in",
    top5TradesSub: "Ranked by magnitude of labour mismatch. Plain-language diagnosis shown first.",
    tooFewTrained: "too few trained (Shortage)",
    tooManyTrained: "too many trained, few jobs (Oversupply)",
    inspectDistrictBtn: "Inspect District",
    viewAllDistricts: "All Districts",
    
    // District Screen
    districtOverviewTitle: "District Labour Market & Skilling Balance",
    districtOverviewSub: "Direct comparison of monthly job openings vs local graduates entering the workforce.",
    jobsAvailable: "Jobs Available",
    peopleBeingTrained: "People Being Trained",
    perMonth: "per month",
    annualSeats: "training seats / year",
    tradeComparisonTitle: "Trade-by-Trade Skilling Breakdown",
    tradeComparisonSub: "Compare hiring demand directly against training volume. Notice red/amber warnings first.",
    trendRising: "Demand Rising",
    trendFalling: "Demand Slowing",
    trendStable: "Demand Stable",
    hiringDemand: "Hiring Demand",
    trainingOutput: "Training Output",
    
    // Early Warning
    earlyWarningTitle: "Early-Warning & Flagged Trades",
    earlyWarningSub: "Prioritised watchlist of trades facing severe shortages or oversupply in the coming months.",
    filterAll: "All Flagged",
    filterShortages: "Critical Shortages Only",
    filterSurplus: "Oversupply Risk Only",
    tradeName: "Trade",
    location: "Location",
    severity: "Severity Verdict",
    actionRequired: "Suggested Action",
    inspectBtn: "Drill Down",
    
    // Advanced & Export
    advancedTitle: "Data Exports, Reskilling & Centre Planning",
    advancedSub: "Technical reports, downloadable datasets, and decision-support algorithms for planners.",
    exportSectionTitle: "Download Official Data Reports (CSV)",
    exportGapsBtn: "Download Skill Gaps CSV",
    exportForecastBtn: "Download Demand Forecast CSV",
    apiDocsTitle: "Automated API & Documentation",
    apiDocsDesc: "Access raw REST endpoints, OpenAPI schemas, and automated pipelines directly via FastAPI Swagger UI.",
    openApiDocsBtn: "Open Interactive API Docs (/docs)",
    provenanceTitle: "Data Provenance & Source Registers",
    pathwaysTitle: "AI Reskilling Pathways",
    pathwaysSub: "Identify surplus trades whose skills easily map into shortage trades to avoid worker redundancy.",
    overlap: "skill overlap",
    transferable: "Transferable skills",
    missing: "Skills to teach",
    sitingTitle: "Optimal Training Centre Siting (Recommendations)",
    sitingSub: "Algorithmic recommendations on where to establish or expand training facilities.",
    sitingScore: "Suitability Score",
    sitingReasons: "Primary Drivers",
    
    // General
    loading: "Loading real-time market data…",
    errorLoading: "Unable to load data from server. Please verify backend service.",
    noResults: "No records found matching your selection.",
  },
  
  hi: {
    // Branding & Header
    appTitle: "सेतु (SETU)",
    appSubTitle: "एआई-सक्षम श्रम बाज़ार आसूचना प्रणाली",
    ministry: "कौशल विकास एवं उद्यमशीलता मंत्रालय (MSDE)",
    demoWarning: "सिम्युलेटेड डेमो डेटा — आधिकारिक सरकारी आंकड़े नहीं हैं। लाइव डेटा से लिंक किया जा सकता है।",
    
    // Navigation & Tabs
    navNational: "राष्ट्रीय अवलोकन",
    navState: "राज्य दृश्य",
    navDistrict: "ज़िला विस्तृत विवरण",
    navEarlyWarning: "पूर्व चेतावनी पैनल",
    navAdvanced: "डेटा, पाथवे व केंद्र योजना",
    
    // Breadcrumbs
    india: "संपूर्ण भारत",
    backToNational: "← राष्ट्रीय दृश्य पर लौटें",
    backToState: "← राज्य दृश्य पर लौटें",
    
    // Controls
    forecastHorizon: "पूर्वानुमान अवधि:",
    months: "माह",
    month1: "1 माह",
    month3: "3 माह",
    month6: "6 माह",
    resetFilters: "रीसेट करें",
    switchLanguage: "View in English",
    selectState: "राज्य चुनें",
    selectDistrict: "ज़िला चुनें",
    
    // Status & Verdicts
    criticalShortage: "गंभीर कमी",
    criticalShortageDesc: "प्रशिक्षित लोग बहुत कम — उद्योगों में कामगारों का भारी अभाव",
    shortage: "कमी",
    shortageDesc: "उपलब्ध नौकरियों की तुलना में प्रशिक्षित लोग कम हैं",
    surplus: "अत्यधिक अधिशेष (बेरोज़गारी जोखिम)",
    surplusDesc: "प्रशिक्षित लोग बहुत ज़्यादा, पर्याप्त नौकरियां नहीं",
    mildSurplus: "मामूली अधिशेष",
    mildSurplusDesc: "प्रशिक्षण उत्पादन स्थानीय नौकरियों से थोड़ा अधिक है",
    balanced: "संतुलित",
    balancedDesc: "प्रशिक्षण और नौकरियों की मांग में अच्छा सामंजस्य",
    noData: "अपर्याप्त डेटा",
    noDataDesc: "डेटा संकलन जारी है",
    
    // Plain Language Card Labels
    headlineNational: "व्यवसायों को राष्ट्रीय स्तर पर तत्काल ध्यान की आवश्यकता है",
    headlineNationalSub: "ऐसे व्यवसाय जहाँ प्रमुख औद्योगिक क्षेत्रों में मांग और प्रशिक्षण में बड़ा असंतुलन है।",
    criticalShortageCount: "गंभीर कमी वाले व्यवसाय",
    oversupplyCount: "अधिशेष (अतिरिक्त आपूर्ति) वाले व्यवसाय",
    balancedCount: "संतुलित व्यवसाय",
    totalVacanciesMonthly: "कुल मासिक नौकरियां",
    totalTrainedMonthly: "मासिक प्रशिक्षित लोग",
    netMonthlyGap: "शुद्ध मासिक अंतर",
    
    // National Screen
    drillDownStateHint: "ज़िलों और प्रमुख कौशल कमियों को देखने के लिए नीचे दिए गए किसी भी राज्य पर क्लिक करें।",
    mapTitle: "राष्ट्रीय कौशल अंतर मानचित्र",
    mapSub: "रंग कौशल संतुलन दर्शाते हैं: लाल/नारंगी = कमी/ध्यान देने योग्य, हरा = संतुलित।",
    stateRankTitle: "कौशल आवश्यकता के आधार पर राज्य",
    viewStateBtn: "राज्य देखें",
    districtsAnalyzed: "निगरानी वाले ज़िले",
    criticalTradesInState: "गंभीर व्यवसाय",
    
    // State Screen
    stateOverviewTitle: "राज्य कौशल आसूचना",
    districtsInState: "इस राज्य के ज़िले",
    clickDistrictHint: "व्यवसाय-वार नौकरी बनाम प्रशिक्षण आंकड़े देखने के लिए ज़िले पर क्लिक करें।",
    top5TradesTitle: "में सबसे गंभीर कौशल अंतर वाले शीर्ष 5 व्यवसाय",
    top5TradesSub: "श्रम असंतुलन की गंभीरता के अनुसार क्रमबद्ध। स्पष्ट भाषा में विवरण।",
    tooFewTrained: "प्रशिक्षित लोग बहुत कम (कमी)",
    tooManyTrained: "प्रशिक्षित बहुत अधिक, नौकरियां कम (अधिशेष)",
    inspectDistrictBtn: "ज़िला देखें",
    viewAllDistricts: "सभी ज़िले",
    
    // District Screen
    districtOverviewTitle: "ज़िला श्रम बाज़ार एवं कौशल संतुलन",
    districtOverviewSub: "मासिक उपलब्ध नौकरियों और कार्यबल में शामिल हो रहे स्नातकों की सीधी तुलना।",
    jobsAvailable: "उपलब्ध नौकरियां",
    peopleBeingTrained: "प्रशिक्षित हो रहे लोग",
    perMonth: "प्रति माह",
    annualSeats: "प्रशिक्षण सीटें / वर्ष",
    tradeComparisonTitle: "व्यवसाय-वार कौशल विवरण",
    tradeComparisonSub: "नौकरी की मांग और प्रशिक्षण क्षमता की सीधी तुलना। चेतावनी वाले व्यवसायों पर ध्यान दें।",
    trendRising: "मांग बढ़ रही है",
    trendFalling: "मांग घट रही है",
    trendStable: "मांग स्थिर है",
    hiringDemand: "नौकरी की मांग",
    trainingOutput: "प्रशिक्षण उत्पादन",
    
    // Early Warning
    earlyWarningTitle: "पूर्व चेतावनी एवं चिह्नित व्यवसाय",
    earlyWarningSub: "आगामी महीनों में गंभीर कमी या अधिशेष का सामना करने वाले व्यवसायों की प्राथमिकता सूची।",
    filterAll: "सभी चिह्नित",
    filterShortages: "केवल गंभीर कमी",
    filterSurplus: "केवल अधिशेष जोखिम",
    tradeName: "व्यवसाय (ट्रेड)",
    location: "स्थान",
    severity: "स्थिति निर्णय",
    actionRequired: "सुझाया गया कदम",
    inspectBtn: "विस्तार से देखें",
    
    // Advanced & Export
    advancedTitle: "डेटा निर्यात, रीस्किलिंग और केंद्र योजना",
    advancedSub: "योजनाकारों के लिए तकनीकी रिपोर्ट, डाउनलोड करने योग्य डेटा और निर्णय-समर्थन एल्गोरिदम।",
    exportSectionTitle: "आधिकारिक डेटा रिपोर्ट डाउनलोड करें (CSV)",
    exportGapsBtn: "कौशल अंतर CSV डाउनलोड करें",
    exportForecastBtn: "मांग पूर्वानुमान CSV डाउनलोड करें",
    apiDocsTitle: "स्वचालित एपीआई एवं दस्तावेज़",
    apiDocsDesc: "फास्टएपीआई स्वैगर यूआई के माध्यम से रॉ रेस्ट एंडपॉइंट्स और ओपनएपीआई स्कीमा का उपयोग करें।",
    openApiDocsBtn: "इंटरैक्टिव एपीआई दस्तावेज़ खोलें (/docs)",
    provenanceTitle: "डेटा स्रोत एवं रजिस्टर",
    pathwaysTitle: "एआई रीस्किलिंग पाथवे (मार्ग)",
    pathwaysSub: "अधिशेष व्यवसायों के कौशल को कमी वाले व्यवसायों में स्थानांतरित करने के रास्ते खोजें।",
    overlap: "कौशल समानता",
    transferable: "हस्तांतरणीय कौशल",
    missing: "सिखाने योग्य कौशल",
    sitingTitle: "इष्टतम प्रशिक्षण केंद्र स्थापना (सिफारिशें)",
    sitingSub: "प्रशिक्षण सुविधाएं कहाँ स्थापित या विस्तारित की जाएं, इसके लिए एल्गोरिदम सिफारिशें।",
    sitingScore: "उपयुक्तता स्कोर",
    sitingReasons: "प्रमुख कारण",
    
    // General
    loading: "रीयल-टाइम बाज़ार डेटा लोड हो रहा है…",
    errorLoading: "सर्वर से डेटा लोड करने में असमर्थ। कृपया बैकएंड सेवा की जांच करें।",
    noResults: "चयन के अनुसार कोई डेटा नहीं मिला।",
  }
};

export const TRADE_TRANSLATIONS: Record<string, string> = {
  "Automobile Mechanic": "ऑटोमोबाइल मैकेनिक",
  "EV Technician": "ई.वी. तकनीशियन",
  "Electronics Technician": "इलेक्ट्रॉनिक्स तकनीशियन",
  "Mobile Repair Technician": "मोबाइल रिपेयर तकनीशियन",
  "Electrician": "इलेक्ट्रीशियन",
  "Welder": "वेल्डर",
  "General Duty Assistant": "जनरल ड्यूटी असिस्टेंट (स्वास्थ्य)",
  "Phlebotomist": "फ्लेबोटोमिस्ट",
  "Data Entry Operator": "डेटा एंट्री ऑपरेटर",
  "Junior Data Analyst": "जूनियर डेटा एनालिस्ट"
};

export const STATE_TRANSLATIONS: Record<string, string> = {
  "Gujarat": "गुजरात",
  "Karnataka": "कर्नाटक",
  "Maharashtra": "महाराष्ट्र",
  "Tamil Nadu": "तमिलनाडु"
};

export const DISTRICT_TRANSLATIONS: Record<string, string> = {
  "Pune": "पुणे",
  "Nashik": "नासिक",
  "Nagpur": "नागपुर",
  "Surat": "सूरत",
  "Rajkot": "राजकोट",
  "Ahmedabad": "अहमदाबाद",
  "Chennai": "चेन्नई",
  "Coimbatore": "कोयंबटूर",
  "Madurai": "मदुरै",
  "Bengaluru Urban": "बेंगलुरु शहरी",
  "Mysuru": "मैसूरु",
  "Belagavi": "बेलगावी"
};

export const SECTOR_TRANSLATIONS: Record<string, string> = {
  "Automotive": "ऑटोमोटिव",
  "Electronics": "इलेक्ट्रॉनिक्स",
  "Construction": "निर्माण",
  "Healthcare": "स्वास्थ्य सेवा",
  "IT-ITeS": "आईटी एवं आईटीईएस"
};

export function t(key: keyof typeof TRANSLATIONS['en'], lang: Language): string {
  return TRANSLATIONS[lang]?.[key] || TRANSLATIONS['en'][key] || key;
}

export function translateTrade(name: string, lang: Language): string {
  if (lang === 'hi' && TRADE_TRANSLATIONS[name]) return TRADE_TRANSLATIONS[name];
  return name;
}

export function translateState(name: string, lang: Language): string {
  if (lang === 'hi' && STATE_TRANSLATIONS[name]) return STATE_TRANSLATIONS[name];
  return name;
}

export function translateDistrict(name: string, lang: Language): string {
  if (lang === 'hi' && DISTRICT_TRANSLATIONS[name]) return DISTRICT_TRANSLATIONS[name];
  return name;
}

export function translateSector(name: string, lang: Language): string {
  if (lang === 'hi' && SECTOR_TRANSLATIONS[name]) return SECTOR_TRANSLATIONS[name];
  return name;
}
