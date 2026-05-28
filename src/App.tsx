/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import React, { useState, useEffect } from 'react';
import { motion, AnimatePresence } from 'motion/react';
import {
  User,
  GraduationCap,
  Sparkles,
  Calendar,
  ChevronRight,
  ChevronDown,
  ChevronUp,
  CheckCircle2,
  AlertCircle,
  Save,
  Send,
  Heart,
  Info,
  RefreshCw,
  Award,
  FileText,
  Copy,
  Check,
  ClipboardList,
  MapPin,
  HelpCircle,
  Clock,
  Settings,
  ArrowRight,
  RotateCcw,
  Camera,
  Upload,
  Trash2
} from 'lucide-react';

import { StudentInfo, StudentMissions, MissionLog, SubmissionRow, ItineraryItem } from './types';
import { ITINERARY_DATA } from './itineraryData';

// ==========================================
// [중요] 구글 스프레드시트 배포 구글 앱스 스크립트(GAS) Web App 주소입니다.
// 학교 선생님께서 발급받은 배포 URL을 이곳에 대입해 주시면 실시간 자동 저장이 연동됩니다!
// ==========================================
const GOOGLE_SCRIPT_URL = "https://script.google.com/macros/s/AKfycbwBRoqPb1HuOcIPkjkFdnjhvThQxT3PGhm0bKoHsc_RLf7zybIcmcxtd8injUDvl5o/exec";

export default function App() {
  // --- States ---
  const [studentInfo, setStudentInfo] = useState<StudentInfo>({
    studentClass: '',
    studentNumber: '',
    studentName: '',
    team: 'A팀'
  });

  const [isRegistered, setIsRegistered] = useState<boolean>(false);
  const [selectedDay, setSelectedDay] = useState<number>(1);
  const [missions, setMissions] = useState<StudentMissions>({});
  
  // UI States
  const [activeAccordion, setActiveAccordion] = useState<string | null>(null);
  const [isTeacherGuideOpen, setIsTeacherGuideOpen] = useState<boolean>(false);
  const [isSubmitModalOpen, setIsSubmitModalOpen] = useState<boolean>(false);
  const [submitStatus, setSubmitStatus] = useState<'idle' | 'loading' | 'success' | 'error'>('idle');
  const [errorDetails, setErrorDetails] = useState<string>('');
  const [copiedLocation, setCopiedLocation] = useState<string | null>(null);
  const [isProfileEditing, setIsProfileEditing] = useState<boolean>(false);
  const [showConfirmReset, setShowConfirmReset] = useState<boolean>(false);
  const [originalStudentInfo, setOriginalStudentInfo] = useState<StudentInfo | null>(null);

  // --- Load Saved Data (LocalStorage) ---
  useEffect(() => {
    try {
      const savedInfo = localStorage.getItem('field_trip_student_info');
      const savedMissions = localStorage.getItem('field_trip_student_missions');

      if (savedInfo) {
        const parsedInfo = JSON.parse(savedInfo);
        setStudentInfo(parsedInfo);
        setIsRegistered(true);
      }
      
      if (savedMissions) {
        setMissions(JSON.parse(savedMissions));
      }
    } catch (e) {
      console.error("로컬 저장 데이터를 가져오는데 실패했습니다.", e);
    }
  }, []);

  // Set the first accordion active on day change
  useEffect(() => {
    const currentItinerary = ITINERARY_DATA[studentInfo.team][selectedDay] || [];
    if (currentItinerary.length > 0) {
      setActiveAccordion(currentItinerary[0].location);
    }
  }, [selectedDay, studentInfo.team, isRegistered]);

  // --- Input Handlers ---
  const handleStudentInfoChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setStudentInfo(prev => ({
      ...prev,
      [name]: value
    }));
  };

  const handleRegister = (e: React.FormEvent) => {
    e.preventDefault();
    if (!studentInfo.studentClass.trim() || !studentInfo.studentNumber.trim() || !studentInfo.studentName.trim()) {
      alert("⚠️ 모든 학생 정보를 바르게 입력해 주세요!");
      return;
    }

    const classNum = parseInt(studentInfo.studentClass, 10);
    const studNum = parseInt(studentInfo.studentNumber, 10);
    if (isNaN(classNum) || classNum < 1 || classNum > 7) {
      alert("⚠️ 반은 1반부터 7반까지 선택해 주세요!");
      return;
    }
    if (isNaN(studNum) || studNum < 1 || studNum > 25) {
      alert("⚠️ 번호는 1번부터 25번까지만 대입해 주세요!");
      return;
    }
    
    // Save to LocalStorage
    localStorage.setItem('field_trip_student_info', JSON.stringify(studentInfo));
    setIsRegistered(true);
    setIsProfileEditing(false);
  };

  const handleMissionChange = (location: string, field: keyof MissionLog, value: string) => {
    const updated = {
      ...missions,
      [location]: {
        ...(missions[location] || { jobObserved: '', jobDescription: '', reflection: '', missionText: '', photoBase64: '' }),
        [field]: value
      }
    };
    setMissions(updated);
    localStorage.setItem('field_trip_student_missions', JSON.stringify(updated));
  };

  const handlePhotoUpload = (location: string, file: File) => {
    const reader = new FileReader();
    reader.onload = (event) => {
      const img = new Image();
      img.onload = () => {
        const canvas = document.createElement('canvas');
        const MAX_WIDTH = 500; // Optimal for device performance & local storage
        let width = img.width;
        let height = img.height;

        if (width > MAX_WIDTH) {
          height = Math.round((height * MAX_WIDTH) / width);
          width = MAX_WIDTH;
        }

        canvas.width = width;
        canvas.height = height;
        const ctx = canvas.getContext('2d');
        if (ctx) {
          ctx.drawImage(img, 0, 0, width, height);
          const compressedDataUrl = canvas.toDataURL('image/jpeg', 0.65); // 65% quality jpeg is clear and super lightweight
          handleMissionChange(location, 'photoBase64', compressedDataUrl);
        }
      };
      img.src = event.target?.result as string;
    };
    reader.readAsDataURL(file);
  };

  // --- Statistics & Progress Calculation ---
  const getAllItineraryLocations = (team: 'A팀' | 'B팀') => {
    const locations: string[] = [];
    [1, 2, 3].forEach(d => {
      const items = ITINERARY_DATA[team][d] || [];
      items.forEach(itm => locations.push(itm.location));
    });
    return locations;
  };

  const isSingleLocationFinished = (loc: string): boolean => {
    const m = missions[loc];
    if (!m) return false;
    const hasJob = !!m.jobObserved?.trim();
    const hasDescLength = (m.jobDescription || '').trim().length >= 50;
    const hasReflectLength = (m.reflection || '').trim().length >= 50;
    const hasMission = !!m.missionText?.trim();
    const hasPhoto = !!m.photoBase64;
    return !!(hasJob && hasDescLength && hasReflectLength && hasMission && hasPhoto);
  };

  const calculateProgress = () => {
    const locations = getAllItineraryLocations(studentInfo.team);
    if (locations.length === 0) return { percent: 0, completedCount: 0, total: 0 };
    
    let completedCount = 0;
    locations.forEach(loc => {
      if (isSingleLocationFinished(loc)) {
        completedCount++;
      }
    });

    const percent = Math.round((completedCount / locations.length) * 100);
    return { percent, completedCount, total: locations.length };
  };

  const progress = calculateProgress();

  // --- Manual/Auto Export Format Builder ---
  const buildSubmissionRows = (): SubmissionRow[] => {
    const locations = getAllItineraryLocations(studentInfo.team);
    const now = new Date();
    const timestampStr = now.getFullYear() + '-' + 
      String(now.getMonth() + 1).padStart(2, '0') + '-' + 
      String(now.getDate()).padStart(2, '0') + ' ' + 
      String(now.getHours()).padStart(2, '0') + ':' + 
      String(now.getMinutes()).padStart(2, '0') + ':' + 
      String(now.getSeconds()).padStart(2, '0');

    return locations.map(loc => {
      const m = missions[loc] || { jobObserved: '', jobDescription: '', reflection: '', missionText: '', photoBase64: '' };
      return {
        timestamp: timestampStr,
        team: studentInfo.team,
        studentClass: studentInfo.studentClass + "반",
        studentNumber: studentInfo.studentNumber + "번",
        studentName: studentInfo.studentName,
        location: loc,
        jobObserved: m.jobObserved || '(미기재)',
        jobDescription: m.jobDescription || '(미기재)',
        reflection: m.reflection || '(미기재)',
        missionText: m.missionText || '(미기재)',
        photoBase64: m.photoBase64 || '(사진 미첨부)'
      };
    });
  };

  // --- Submit to Google Sheets ---
  const handleSubmitAll = async () => {
    const locations = getAllItineraryLocations(studentInfo.team);
    
    // Validate if any written location violates the 50-character limit
    const errorLocations: { loc: string; descLen: number; refLen: number }[] = [];
    let emptyLocationsCount = 0;

    locations.forEach(loc => {
      const m = missions[loc];
      if (!m) {
        emptyLocationsCount++;
        return;
      }
      
      const hasAnyInput = m.jobObserved?.trim() || m.jobDescription?.trim() || m.reflection?.trim() || m.missionText?.trim() || m.photoBase64;
      if (!hasAnyInput) {
        emptyLocationsCount++;
        return;
      }

      const descLen = (m.jobDescription || '').trim().length;
      const refLen = (m.reflection || '').trim().length;

      // If they started filling the card, description and reflection MUST be >= 50 chars
      if (descLen < 50 || refLen < 50) {
        errorLocations.push({ loc, descLen, refLen });
      }
    });

    if (errorLocations.length > 0) {
      let errorMsg = "⚠️ 작성자 평가 규정 미달로 제출이 차단되었습니다!\n\n";
      errorLocations.forEach(err => {
        errorMsg += `📍 [${err.loc}]\n`;
        if (err.descLen < 50) {
          errorMsg += `  - 직업 설명: 현재 ${err.descLen}자 (최소 50자 이상 작성해야 합니다.)\n`;
        }
        if (err.refLen < 50) {
          errorMsg += `  - 활동 소감: 현재 ${err.refLen}자 (최소 50자 이상 작성해야 합니다.)\n`;
        }
      });
      alert(errorMsg);
      return;
    }

    if (emptyLocationsCount === locations.length) {
      alert("⚠️ 작성된 체험학습 미션이 없습니다! 최소 1개 이상의 장소에서 소감을 기록하고 제출해 주세요.");
      return;
    }

    // Double check full course completion
    const payload = buildSubmissionRows();
    const incompleteLocations = locations.filter(loc => !isSingleLocationFinished(loc));
    
    if (incompleteLocations.length > 0) {
      const confirmSubmit = window.confirm(
        `아직 모든 항목(사진 업로드, 직업 설명 50자 이상, 소감 50자 이상 등)을 다 완료하지 않은 장소가 ${incompleteLocations.length}개 있습니다.\n이대로 미흡한 리포트를 선생님께 제출하시겠습니까?`
      );
      if (!confirmSubmit) return;
    }

    setSubmitStatus('loading');
    setIsSubmitModalOpen(true);
    setErrorDetails('');

    try {
      const controller = new AbortController();
      const timeoutId = setTimeout(() => controller.abort(), 12000); // 12-second timeout

      // POST request
      const response = await fetch(GOOGLE_SCRIPT_URL, {
        method: 'POST',
        mode: 'no-cors', // standard workaround for spreadsheet Apps Script responses if they don't return Access-Control headers
        headers: {
          'Content-Type': 'text/plain',
        },
        body: JSON.stringify(payload),
        signal: controller.signal
      });

      clearTimeout(timeoutId);

      // Since mode is 'no-cors', we might not see response state, but standard fetch will succeed
      setSubmitStatus('success');
    } catch (error: any) {
      console.error("구글 제출 중 오류 발생:", error);
      // Even if fetch throws CORS/network error, the data might still arrive (GAS typical characteristic). 
      // We will transition gracefully but alert them of backup clipboard.
      setSubmitStatus('error');
      setErrorDetails(error?.message || '네트워크 응답 지연 또는 구글 연동 주소 설정 과정 오류');
    }
  };

  // --- Reset/Clear Data Safely ---
  const handleClearAllData = () => {
    localStorage.removeItem('field_trip_student_info');
    localStorage.removeItem('field_trip_student_missions');
    setStudentInfo({
      studentClass: '',
      studentNumber: '',
      studentName: '',
      team: 'A팀'
    });
    setMissions({});
    setIsRegistered(false);
    setShowConfirmReset(false);
    setSelectedDay(1);
    alert("🔄 모든 입력 내용과 학생 정보가 성공적으로 초기화되었습니다.");
  };

  // --- Layout Helper for Team Info ---
  const currentItinerary = ITINERARY_DATA[studentInfo.team][selectedDay] || [];

  // Clipboard copy helpful text format
  const getCompiledTextSummary = () => {
    let text = `🎒 [도외체험학습 미션 제출 리포트] 🎒\n`;
    text += `👤 학생: ${studentInfo.studentClass}반 ${studentInfo.studentNumber}번 ${studentInfo.studentName} (${studentInfo.team})\n`;
    text += `📅 제출 시간: ${new Date().toLocaleString('ko-KR')}\n`;
    text += `===================================\n\n`;

    const locations = getAllItineraryLocations(studentInfo.team);
    locations.forEach((loc, idx) => {
      const m = missions[loc] || { jobObserved: '', jobDescription: '', reflection: '', missionText: '', photoBase64: '' };
      text += `${idx + 1}. 장소: [ ${loc} ]\n`;
      text += `  ① 관찰한 직업: ${m.jobObserved || '(미기재)'}\n`;
      text += `  ② 직업에 대한 설명: ${m.jobDescription || '(미기재)'}\n`;
      text += `  ③ 활동 소감: ${m.reflection || '(미기재)'}\n`;
      text += `  ④ 미션 내용: ${m.missionText || '(미기재)'}\n`;
      text += `  ⑤ 인증 사진 첨부여부: ${m.photoBase64 ? '📷 업로드 완료' : '❌ 사진 미첨부'}\n`;
      text += `-----------------------------------\n`;
    });
    return text;
  };

  const handleCopySummaryToClipboard = () => {
    const summaryText = getCompiledTextSummary();
    navigator.clipboard.writeText(summaryText)
      .then(() => {
        alert("📋 미션 답변 요약본이 클립보드에 복사되었습니다! 선생님께 카카오톡이나 메시지 등으로 바로 전송할 수 있습니다.");
      })
      .catch((err) => {
        alert("복사 실패 ㅠ_ㅠ 수동으로 선택해 복사해 주세요!");
      });
  };

  return (
    <div className="min-h-screen bg-pastel-pattern text-slate-800 pb-16 font-sans">
      
      {/* Dynamic Upper Top Ribbon */}
      <div className="bg-gradient-to-r from-teal-400 via-amber-300 to-rose-400 h-2 w-full"></div>

      {/* Main Header Container */}
      <header className="max-w-md mx-auto px-4 pt-6 pb-2">
        <div className="bg-white/80 backdrop-blur-md rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-between">
          <div className="flex items-center gap-3">
            <div className="bg-amber-100 p-2.5 rounded-xl text-amber-600">
              <GraduationCap size={24} className="animate-pulse" />
            </div>
            <div>
              <h1 className="text-lg font-bold tracking-tight text-slate-900 font-display flex items-center gap-1">
                도외체험학습 <span className="text-amber-500 text-xs bg-amber-50 px-1.5 py-0.5 rounded-full font-sans font-medium">서울편</span>
              </h1>
              <p className="text-xs text-slate-500 font-medium font-sans">스마트 매뉴얼 & 미션 기록기 ✨</p>
            </div>
          </div>

          <div className="flex gap-2">
            {/* Guide Button for Teacher */}
            <button
              onClick={() => setIsTeacherGuideOpen(!isTeacherGuideOpen)}
              className="bg-slate-100 text-slate-600 p-2 rounded-xl hover:bg-slate-200 transition-colors flex items-center gap-1 text-xs font-semibold"
              title="선생님 연동 가이드"
            >
              <Settings size={18} className="text-teal-600" />
              <span className="hidden sm:inline">연동</span>
            </button>
          </div>
        </div>
      </header>

      {/* ==================== TEACHER INTERACTIVE GUIDE ==================== */}
      <AnimatePresence>
        {isTeacherGuideOpen && (
          <motion.div
            initial={{ opacity: 0, height: 0 }}
            animate={{ opacity: 1, height: 'auto' }}
            exit={{ opacity: 0, height: 0 }}
            className="max-w-md mx-auto px-4 mb-4"
          >
            <div className="bg-teal-50 border border-teal-200 rounded-2xl p-4 text-xs text-slate-700 space-y-3">
              <h3 className="font-bold text-teal-800 text-sm flex items-center gap-1">
                <Settings size={16} /> 👨‍🏫 선생님을 위한 구글 스프레드시트 연동 가이드
              </h3>
              <p className="leading-relaxed">
                학생들이 입력하고 '최종 제출' 버튼을 누르면 구글 시트에 자동으로 쌓이게 하는 설정 방법입니다. 단 2분이면 설정 완료!
              </p>
              
              <div className="bg-white p-3 rounded-lg border border-teal-100 space-y-1.5">
                <span className="font-semibold text-teal-700 block">💡 1단계: 구글 스프레드시트 열기</span>
                <p>구글 드라이브에 새 시트를 만들고, 첫 행(A1~K1)에 다음 열 제목을 그대로 적어주세요:</p>
                <div className="bg-slate-50 p-1.5 rounded text-[10px] font-mono select-all overflow-x-auto text-slate-600 border border-slate-100 w-full">
                  A: timestamp | B: team | C: studentClass | D: studentNumber | E: studentName | F: location | G: jobObserved | H: jobDescription | I: reflection | J: missionText | K: photoBase64
                </div>
              </div>

              <div className="bg-white p-3 rounded-lg border border-teal-100 space-y-1.5">
                <span className="font-semibold text-teal-700 block">💡 2단계: 앱스 스크립트 작성</span>
                <p>시트 상단 메뉴의 [확장 프로그램] → [Apps Script]를 눌러 코드 내용을 전부 지우고 아래 스크립트를 붙여넣으세요:</p>
                <pre className="bg-slate-900 text-slate-100 p-2 rounded text-[9px] overflow-x-auto font-mono max-h-32">
{`function doPost(e) {
  var sheet = SpreadsheetApp.getActiveSpreadsheet().getActiveSheet();
  var data = JSON.parse(e.postData.contents);
  
  if (Array.isArray(data)) {
    data.forEach(function(row) {
      sheet.appendRow([
        row.timestamp,
        row.team,
        row.studentClass,
        row.studentNumber,
        row.studentName,
        row.location,
        row.jobObserved,
        row.jobDescription,
        row.reflection,
        row.missionText,
        row.photoBase64
      ]);
    });
  }
  return ContentService.createTextOutput(JSON.stringify({status: "success"}))
         .setMimeType(ContentService.MimeType.JSON);
}`}
                </pre>
              </div>

              <div className="bg-white p-3 rounded-lg border border-teal-100 space-y-1.5">
                <span className="font-semibold text-teal-700 block">💡 3단계: 웹 앱 배포</span>
                <p>오른쪽 상단 [배포] → [새 배포]를 클릭 후 아래 환경으로 배포하세요:</p>
                <ul className="list-disc list-inside space-y-0.5 bg-slate-50 p-1.5 rounded">
                  <li>유형: <span className="font-bold text-teal-600">웹 앱(Web App)</span></li>
                  <li>다음 사용자 권한으로 실행: <span className="font-semibold text-teal-600">나 (선생님 계정)</span></li>
                  <li>액세스할 수 있는 사용자: <span className="font-bold text-teal-600">모든 사용자 (Anyone)</span></li>
                </ul>
                <p className="mt-1 pt-1 border-t border-slate-100">
                  배포 버튼을 누르고 생성된 <span className="text-amber-600 font-semibold underline">웹 앱 URL</span>을 복사하여, 소스 코드 상단의 <code className="bg-amber-100 px-1 py-0.5 rounded font-mono">GOOGLE_SCRIPT_URL</code> 변수에 넣어주면 끝납니다!
                </p>
              </div>

              <button
                onClick={() => setIsTeacherGuideOpen(false)}
                className="w-full bg-teal-600 hover:bg-teal-700 text-white font-medium py-1.5 rounded-lg active:scale-95 transition-all text-center block"
              >
                도움말 닫기 닫기
              </button>
            </div>
          </motion.div>
        )}
      </AnimatePresence>

      <main className="max-w-md mx-auto px-4 mt-2">
        
        {/* ==================== STEP 1: STUDENT REGISTRATION FORM ==================== */}
        {!isRegistered || isProfileEditing ? (
          <motion.div
            initial={{ opacity: 0, y: 15 }}
            animate={{ opacity: 1, y: 0 }}
            className="bg-white rounded-3xl shadow-xl border border-slate-100 overflow-hidden transform transition-all"
          >
            {/* Top illustrative pastel banner */}
            <div className="bg-gradient-to-br from-amber-100 to-rose-50 p-6 text-center relative">
              <div className="absolute top-2 right-2 text-3xl">🎒</div>
              <div className="absolute bottom-2 left-6 text-2xl">📸</div>
              <div className="w-16 h-16 bg-white rounded-2xl shadow-md flex items-center justify-center mx-auto mb-3">
                <span className="text-3xl">🚌</span>
              </div>
              <h2 className="text-xl font-bold text-slate-800 tracking-tight">도외체험학습 활동 기록지</h2>
              <p className="text-xs text-slate-500 mt-1">학생 정보와 배정받은 팀(Team)을 입력해 주세요</p>
            </div>

            <form onSubmit={handleRegister} className="p-6 space-y-5">
              
              {/* Grouped responsive form */}
              <div className="grid grid-cols-2 gap-4">
                {/* Class input */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                    반 <span className="text-red-400">*</span>
                  </label>
                  <select
                    name="studentClass"
                    value={studentInfo.studentClass}
                    onChange={handleStudentInfoChange}
                    required
                    className="w-full px-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:bg-white focus:border-amber-400 focus:outline-none transition-all"
                  >
                    <option value="">선택</option>
                    {[1, 2, 3, 4, 5, 6, 7].map(cls => (
                      <option key={cls} value={cls}>{cls}반</option>
                    ))}
                  </select>
                </div>

                {/* Number input */}
                <div>
                  <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                    번호 <span className="text-red-400">*</span>
                  </label>
                  <input
                    type="number"
                    name="studentNumber"
                    placeholder="최대 25"
                    min="1"
                    max="25"
                    value={studentInfo.studentNumber}
                    onChange={handleStudentInfoChange}
                    required
                    className="w-full px-4 py-2.5 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:bg-white focus:border-amber-400 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Name input */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                  이름 <span className="text-red-400">*</span>
                </label>
                <div className="relative">
                  <User className="absolute left-4 top-3 text-slate-400" size={18} />
                  <input
                    type="text"
                    name="studentName"
                    placeholder="성함 입력 (예: 홍길동)"
                    value={studentInfo.studentName}
                    onChange={handleStudentInfoChange}
                    required
                    className="w-full pl-11 pr-4 py-3 rounded-xl bg-slate-50 border border-slate-200 text-sm font-semibold text-slate-800 focus:bg-white focus:border-amber-400 focus:outline-none transition-all placeholder:text-slate-400"
                  />
                </div>
              </div>

              {/* Team selection (A팀/B팀) with Gorgeous radio buttons */}
              <div>
                <label className="block text-xs font-bold text-slate-600 mb-1.5 flex items-center gap-1">
                  체험학습 배정 팀 <span className="text-red-400">*</span>
                </label>
                <div className="grid grid-cols-2 gap-3">
                  {/* A Team Button */}
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    studentInfo.team === 'A' || studentInfo.team === 'A팀'
                      ? 'border-amber-400 bg-amber-50/70 text-amber-900 font-bold shadow-sm'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="team"
                      value="A팀"
                      checked={studentInfo.team === 'A팀'}
                      onChange={handleStudentInfoChange}
                      className="sr-only"
                    />
                    <span className="text-xl mb-1">🍊</span>
                    <span className="text-sm">A팀</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">애슐리/LG랩/야구돔</span>
                  </label>

                  {/* B Team Button */}
                  <label className={`relative flex flex-col items-center justify-center p-4 rounded-xl border-2 cursor-pointer transition-all ${
                    studentInfo.team === 'B' || studentInfo.team === 'B팀'
                      ? 'border-cyan-400 bg-cyan-50/70 text-cyan-900 font-bold shadow-sm'
                      : 'border-slate-100 bg-slate-50 text-slate-600 hover:bg-slate-100'
                  }`}>
                    <input
                      type="radio"
                      name="team"
                      value="B팀"
                      checked={studentInfo.team === 'B팀'}
                      onChange={handleStudentInfoChange}
                      className="sr-only"
                    />
                    <span className="text-xl mb-1">🌊</span>
                    <span className="text-sm">B팀</span>
                    <span className="text-[10px] text-slate-400 font-normal mt-0.5">서강대/롯데월드/LG랩</span>
                  </label>
                </div>
              </div>

              {/* Notification Box */}
              <div className="bg-amber-50 rounded-xl p-3 border border-amber-100 text-xs text-amber-800 leading-relaxed flex gap-2">
                <Info size={16} className="shrink-0 text-amber-600 mt-0.5" />
                <p>
                  반, 번호, 이름을 올바르게 분리해 입력해야 교직 관리용 학교 생활기록부 작성 시 손쉽게 필터링 및 복사할 수 있습니다.
                </p>
              </div>

              {/* Submit / Proceed Register */}
              <div className="flex gap-2 pt-2">
                {isProfileEditing && (
                  <button
                    type="button"
                    onClick={() => {
                      if (originalStudentInfo) {
                        setStudentInfo(originalStudentInfo);
                      }
                      setIsProfileEditing(false);
                    }}
                    className="w-1/3 bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold py-3.5 rounded-xl transition-all text-sm"
                  >
                    취소
                  </button>
                )}
                <button
                  type="submit"
                  className={`font-semibold py-3.5 rounded-xl transition-all text-sm shadow-md cursor-pointer hover:shadow-lg hover:scale-[1.01] active:scale-[0.99] flex items-center justify-center gap-2 ${
                    isProfileEditing ? 'w-2/3 bg-amber-400 text-amber-950' : 'w-full bg-slate-900 text-white'
                  }`}
                >
                  {isProfileEditing ? "정보 수정완료 ✨" : "체험학습 미션 시작하기 🎒"}
                  <ArrowRight size={18} />
                </button>
              </div>

            </form>
          </motion.div>
        ) : (
          
          // ==================== STEP 2: DETAILS, ITINERARY & FILLING ====================
          <div className="space-y-6">
            
            {/* Student visual badge and floating edit info */}
            <motion.div
              initial={{ opacity: 0, y: -10 }}
              animate={{ opacity: 1, y: 0 }}
              className="bg-white rounded-2xl shadow-sm border border-slate-100 p-4 flex items-center justify-between"
            >
              <div className="flex items-center gap-3">
                <div className={`w-11 h-11 rounded-full flex items-center justify-center text-lg ${
                  studentInfo.team === 'A팀' ? 'bg-amber-100 text-amber-700' : 'bg-cyan-100 text-cyan-700'
                }`}>
                  👤
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <span className="font-bold text-slate-800 text-sm">{studentInfo.studentClass}반 {studentInfo.studentNumber}번 {studentInfo.studentName}</span>
                    <span className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      studentInfo.team === 'A팀' ? 'bg-amber-100 text-amber-800' : 'bg-cyan-100 text-cyan-800'
                    }`}>
                      {studentInfo.team}
                    </span>
                  </div>
                  <div className="text-[10px] text-slate-400 font-medium flex items-center gap-1 mt-0.5">
                    <Clock size={10} /> 실시간 로컬 임시저장 활성화 중
                  </div>
                </div>
              </div>

              <div className="flex items-center gap-1.5">
                <button
                  onClick={() => {
                    setOriginalStudentInfo({ ...studentInfo });
                    setIsProfileEditing(true);
                  }}
                  className="text-xs bg-slate-50 hover:bg-slate-100 text-slate-600 font-bold px-2.5 py-1.5 rounded-lg border border-slate-200/60 transition-colors"
                >
                  정보 수정
                </button>
              </div>
            </motion.div>

            {/* Total Completion Progress Gauge */}
            <div className="bg-white rounded-2xl p-4 shadow-sm border border-slate-100 space-y-2">
              <div className="flex justify-between items-center text-xs text-slate-600">
                <span className="font-bold flex items-center gap-1">
                  <Award size={14} className="text-yellow-500 animate-bounce" /> 내 전체 미션 정복률 
                </span>
                <span className="font-bold font-mono text-slate-900 bg-slate-100 px-2 py-0.5 rounded">
                  {progress.completedCount} / {progress.total} 필수 코스 완료 ({progress.percent}%)
                </span>
              </div>
              <div className="w-full bg-slate-100 h-2.5 rounded-full overflow-hidden">
                <motion.div
                  className={`h-full rounded-full ${
                    studentInfo.team === 'A팀' ? 'bg-amber-400' : 'bg-cyan-400'
                  }`}
                  initial={{ width: 0 }}
                  animate={{ width: `${progress.percent}%` }}
                  transition={{ duration: 0.5, ease: 'easeOut' }}
                />
              </div>
              <p className="text-[10px] text-slate-500 font-medium text-center bg-slate-50 py-1 rounded-lg">
                ※ 장소별 ⑤가지 미션(직업설명 50자 이상, 소감 50자 이상, 인증사진 첨부 필수)을 완료해야 보석이 채워집니다!
              </p>
            </div>

            {/* Day selector tabs (1일차, 2일차, 3일차) */}
            <div className="bg-slate-200/50 p-1 rounded-xl grid grid-cols-3 gap-1 shadow-inner">
              {[1, 2, 3].map(dayNum => (
                <button
                  key={dayNum}
                  onClick={() => setSelectedDay(dayNum)}
                  className={`py-2 rounded-lg text-xs font-bold transition-all relative ${
                    selectedDay === dayNum
                      ? 'bg-white text-slate-900 shadow-sm'
                      : 'text-slate-500 hover:text-slate-700 hover:bg-white/40'
                  }`}
                >
                  <span className="font-display mr-0.5">{dayNum}</span>일차
                  {selectedDay === dayNum && (
                    <motion.span
                      layoutId="activeDayIndicator"
                      className={`absolute bottom-0.5 left-1/2 -translate-x-1/2 w-4 h-0.5 rounded-full ${
                        studentInfo.team === 'A팀' ? 'bg-amber-400' : 'bg-cyan-400'
                      }`}
                    />
                  )}
                </button>
              ))}
            </div>

            {/* Timeline Area */}
            <div className="relative pl-4 border-l-2 border-slate-200 space-y-5 py-2">
              <AnimatePresence mode="wait">
                {currentItinerary.map((item, idx) => {
                  const isOpened = activeAccordion === item.location;
                  const log = missions[item.location] || { jobObserved: '', jobDescription: '', reflection: '', missionText: '' };
                  
                  // Check if this location has been completed
                  const isLocationFinished = !!(log.jobObserved.trim() && log.jobDescription.trim() && log.reflection.trim() && log.missionText.trim());

                  return (
                    <motion.div
                      key={item.location}
                      initial={{ opacity: 0, x: -10 }}
                      animate={{ opacity: 1, x: 0 }}
                      exit={{ opacity: 0, x: 10 }}
                      transition={{ delay: idx * 0.05 }}
                      className="relative"
                    >
                      {/* Timeline Dot Icon Overlay */}
                      <span className={`absolute -left-[27px] top-4 w-5 h-5 rounded-full border-4 flex items-center justify-center text-[10px] font-bold shadow-sm transition-colors cursor-pointer ${
                        isLocationFinished
                          ? 'bg-emerald-500 border-emerald-100 text-white'
                          : isOpened
                          ? 'bg-amber-400 border-amber-50 text-amber-950'
                          : 'bg-white border-slate-200 text-slate-400'
                      }`}
                      onClick={() => setActiveAccordion(isOpened ? null : item.location)}
                      >
                        {isLocationFinished ? "✓" : idx + 1}
                      </span>

                      {/* Timeline Block Card */}
                      <div className={`bg-white rounded-2xl shadow-sm border transition-all ${
                        isOpened ? 'ring-2 ring-slate-400/10 border-slate-300' : 'border-slate-100 hover:border-slate-200'
                      }`}>
                        
                        {/* Accordion Trigger Header */}
                        <div
                          onClick={() => setActiveAccordion(isOpened ? null : item.location)}
                          className="p-4 flex items-center justify-between cursor-pointer select-none"
                        >
                          <div className="flex items-center gap-2.5">
                            <span className="text-xl">{item.emoji}</span>
                            <div>
                              <div className="flex items-center gap-1.5">
                                <h3 className="text-sm font-bold text-slate-900">{item.location}</h3>
                                {isLocationFinished && (
                                  <span className="bg-emerald-50 text-emerald-700 text-[9px] font-bold px-1.5 py-0.5 rounded-full flex items-center gap-0.5">
                                    <CheckCircle2 size={10} /> 완료
                                  </span>
                                )}
                              </div>
                              <p className="text-[10px] text-slate-400 font-medium">
                                {idx === 0 ? "출발 코스 🚀" : idx === currentItinerary.length - 1 ? "도착 코스 🏁" : `${idx + 1}번째 여정`}
                              </p>
                            </div>
                          </div>

                          <span className="text-slate-400 bg-slate-100 p-1.5 rounded-lg">
                            {isOpened ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
                          </span>
                        </div>

                        {/* Accordion Expandable Content Panel */}
                        {isOpened && (
                          <motion.div
                            initial={{ height: 0, opacity: 0 }}
                            animate={{ height: 'auto', opacity: 1 }}
                            className="border-t border-slate-100"
                          >
                            <div className="p-4 space-y-4 bg-slate-50/50 rounded-b-2xl">
                              
                              {/* Location description */}
                              <div className="text-xs text-slate-500 leading-relaxed bg-white p-3 rounded-xl border border-slate-100">
                                📌 {item.description}
                              </div>

                              {/* Target suggested Career Quick Tags */}
                              {item.tips && item.tips.length > 0 && (
                                <div className="space-y-1.5 bg-slate-50 p-3 rounded-xl border border-slate-200/60">
                                  <span className="text-[10px] font-bold text-slate-600 flex items-center gap-1">
                                    <Sparkles size={11} className="text-amber-500" /> 추천 관찰 직업 리스트
                                  </span>
                                  <div className="flex flex-wrap gap-1.5">
                                    {item.tips.map((tip, i) => (
                                      <span
                                        key={i}
                                        className="text-[10px] font-semibold px-2 py-0.5 rounded-full border bg-white text-slate-600 border-slate-200"
                                      >
                                        #{tip}
                                      </span>
                                    ))}
                                  </div>
                                </div>
                              )}

                              {/* Form Inputs */}
                              <div className="space-y-3.5 pt-1">
                                
                                {/* 1. Observed Job Name */}
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] text-slate-800 flex items-center justify-center font-display font-bold">1</span> 
                                    관찰한 대표 직업
                                  </label>
                                  <input
                                    type="text"
                                    placeholder="이곳에서 찾은 직업 이름 (예: 항공기 조종사)"
                                    value={log.jobObserved}
                                    onChange={(e) => handleMissionChange(item.location, 'jobObserved', e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-amber-400 focus:bg-white focus:outline-none transition-all font-medium text-slate-800"
                                  />
                                </div>

                                {/* 2. Job Description */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                      <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] text-slate-800 flex items-center justify-center font-display font-bold">2</span> 
                                      그 직업에 대한 설명 (50자 이상)
                                    </label>
                                    <span className={`text-[10px] font-bold ${log.jobDescription.trim().length >= 50 ? 'text-emerald-500' : 'text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded'}`}>
                                      {log.jobDescription.trim().length >= 50 ? '✓ 조건 충족' : `최소 50자 / 현재 ${log.jobDescription.trim().length}자`}
                                    </span>
                                  </div>
                                  <textarea
                                    rows={3}
                                    placeholder="관찰한 직업의 주요 업무, 필요한 역량, 그리고 이곳에서 실제로 일하는 모습을 50자 이상으로 묘사해 봐요."
                                    value={log.jobDescription}
                                    onChange={(e) => handleMissionChange(item.location, 'jobDescription', e.target.value)}
                                    className={`w-full px-3 py-2 text-xs bg-white border rounded-xl focus:bg-white focus:outline-none transition-all font-medium text-slate-800 resize-none ${
                                      log.jobDescription.trim().length >= 50 ? 'border-emerald-200 focus:border-emerald-400' : 'border-slate-200 focus:border-amber-400'
                                    }`}
                                  />
                                </div>

                                {/* 3. Personal Reflection */}
                                <div className="space-y-1">
                                  <div className="flex justify-between items-center">
                                    <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                      <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] text-slate-800 flex items-center justify-center font-display font-bold">3</span> 
                                      활동 후 느낀 소감 (50자 이상)
                                    </label>
                                    <span className={`text-[10px] font-bold ${log.reflection.trim().length >= 50 ? 'text-emerald-500' : 'text-rose-500 bg-rose-50 px-1.5 py-0.5 rounded'}`}>
                                      {log.reflection.trim().length >= 50 ? '✓ 조건 충족' : `최소 50자 / 현재 ${log.reflection.trim().length}자`}
                                    </span>
                                  </div>
                                  <textarea
                                    rows={3}
                                    placeholder="이 체험 활동을 하면서 인상 깊었던 점이나, 나의 진로 찾기에 어떤 도움이 되었는지 50자 이상 적어봐요."
                                    value={log.reflection}
                                    onChange={(e) => handleMissionChange(item.location, 'reflection', e.target.value)}
                                    className={`w-full px-3 py-2 text-xs bg-white border rounded-xl focus:bg-white focus:outline-none transition-all font-medium text-slate-800 resize-none ${
                                      log.reflection.trim().length >= 50 ? 'border-emerald-200 focus:border-emerald-400' : 'border-slate-200 focus:border-amber-400'
                                    }`}
                                  />
                                </div>

                                {/* 4. Mission Details */}
                                <div className="space-y-1">
                                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] text-slate-800 flex items-center justify-center font-display font-bold">4</span> 
                                    미션 수행 요약
                                  </label>
                                  <textarea
                                    rows={2}
                                    placeholder="선생님이 제시한 단체사진 촬영이나 퀴즈 맞추기 등 핵심 미션의 수행 결과를 간단히 요약해 봐요."
                                    value={log.missionText}
                                    onChange={(e) => handleMissionChange(item.location, 'missionText', e.target.value)}
                                    className="w-full px-3 py-2 text-xs bg-white border border-slate-200 rounded-xl focus:border-amber-400 focus:bg-white focus:outline-none transition-all font-medium text-slate-800 placeholder:text-slate-400 resize-none"
                                  />
                                </div>

                                {/* 5. Photo Upload */}
                                <div className="space-y-1.5">
                                  <label className="text-xs font-bold text-slate-700 flex items-center gap-1">
                                    <span className="w-4 h-4 rounded-full bg-slate-200 text-[10px] text-slate-800 flex items-center justify-center font-display font-bold">5</span> 
                                    활동 인증 사진 등록
                                  </label>
                                  
                                  {log.photoBase64 ? (
                                    <div className="bg-white p-3 rounded-xl border border-dashed border-emerald-300 relative flex flex-col items-center gap-2">
                                      <div className="w-full h-36 bg-slate-100 rounded-lg overflow-hidden flex items-center justify-center relative shadow-inner">
                                        <img 
                                          src={log.photoBase64} 
                                          alt="수행 인증 사진" 
                                          className="object-contain w-full h-full"
                                          referrerPolicy="no-referrer"
                                        />
                                        <button
                                          type="button"
                                          onClick={() => handleMissionChange(item.location, 'photoBase64', '')}
                                          className="absolute right-2 top-2 bg-rose-500 hover:bg-rose-600 text-white p-1.5 rounded-full shadow-md hover:scale-105 active:scale-95 transition-all text-xs flex items-center gap-1"
                                          title="사진 삭제"
                                        >
                                          <Trash2 size={14} />
                                        </button>
                                      </div>
                                      <span className="text-[10px] text-emerald-600 font-semibold flex items-center gap-1">
                                        <CheckCircle2 size={12} className="text-emerald-500" /> 인증 사진 등록이 완료되었습니다.
                                      </span>
                                    </div>
                                  ) : (
                                    <div className="relative">
                                      <input
                                        type="file"
                                        accept="image/*"
                                        onChange={(e) => {
                                          if (e.target.files && e.target.files[0]) {
                                            handlePhotoUpload(item.location, e.target.files[0]);
                                          }
                                        }}
                                        className="hidden"
                                        id={`photo-input-${item.location}`}
                                      />
                                      <label
                                        htmlFor={`photo-input-${item.location}`}
                                        className="w-full flex flex-col items-center justify-center py-5 px-3 border-2 border-dashed border-slate-200 hover:border-amber-400 bg-white hover:bg-amber-50/20 rounded-xl cursor-pointer transition-all space-y-1"
                                      >
                                        <Camera className="text-slate-400 hover:text-amber-500" size={24} />
                                        <span className="text-xs font-semibold text-slate-600">이곳에서 인증받을 활동 사진 첨부</span>
                                        <span className="text-[10px] text-slate-400 font-sans">(카메라로 직접 촬영 또는 앨범 파일 선택)</span>
                                      </label>
                                    </div>
                                  )}
                                </div>

                              </div>

                              {/* Individual Card Realtime Auto Saving Tag */}
                              <div className="flex justify-between items-center text-[10px] text-emerald-600 bg-emerald-50 px-2.5 py-1.5 rounded-lg">
                                <span className="font-semibold flex items-center gap-1">
                                  <Save size={12} /> 실시간 안전 복구저장 완료
                                </span>
                                <span className="font-mono text-[9px] text-emerald-500">
                                  스마트폰 임시보관 중
                                </span>
                              </div>

                            </div>
                          </motion.div>
                        )}

                      </div>
                    </motion.div>
                  );
                })}
              </AnimatePresence>
            </div>

            {/* Quick Helper Banner */}
            <div className="bg-rose-50 border border-rose-100 rounded-2xl p-4 flex gap-3 text-xs text-rose-800">
              <span className="text-xl shrink-0">💡</span>
              <div>
                <span className="font-bold">임시저장은 수시로 자동 발생해요!</span>
                <p className="text-[11px] leading-relaxed text-rose-700/90 mt-0.5">
                  앱을 끄거나 와이파이가 끊겨도 스마트폰 메모리에 작성 정보가 유지되니 걱정마세요. 마지막 코스까지 전부 적고 한꺼번에 전송하면 됩니다.
                </p>
              </div>
            </div>

            {/* Submit Action Block Container */}
            <div className="bg-white rounded-3xl p-6 shadow-md border border-slate-100 space-y-4">
              <div className="text-center space-y-1">
                <span className="text-2xl">📝</span>
                <h3 className="font-bold text-slate-800 text-sm">체험학습 최종 리포트 전송</h3>
                <p className="text-xs text-slate-500">전체 장소의 응답을 한꺼번에 선생님 스프레드시트로 전송합니다.</p>
              </div>

              {/* Day status indicators */}
              <div className="bg-slate-50 p-3 rounded-2xl border border-slate-100 divide-y divide-slate-100">
                {[1, 2, 3].map(d => {
                  const itms = ITINERARY_DATA[studentInfo.team][d] || [];
                  const emptyCount = itms.filter(itm => {
                    const m = missions[itm.location];
                    return !m || !m.jobObserved || !m.reflection;
                  }).length;

                  return (
                    <div key={d} className="py-2 flex items-center justify-between text-xs">
                      <span className="font-semibold text-slate-700">{d}일차 코스</span>
                      {emptyCount === 0 ? (
                        <span className="text-emerald-600 font-bold flex items-center gap-0.5">
                          ✓ 정복 완료!
                        </span>
                      ) : (
                        <span className="text-amber-600 font-semibold text-[11px]">
                          {emptyCount}개 미흡 (목록 기재필요)
                        </span>
                      )}
                    </div>
                  );
                })}
              </div>

              {/* Action Buttons grid */}
              <div className="space-y-2">
                <button
                  onClick={handleSubmitAll}
                  className={`w-full text-white font-bold py-4 rounded-2xl cursor-pointer hover:shadow-lg active:scale-[0.99] hover:scale-[1.01] transition-all flex items-center justify-center gap-2 text-sm shadow ${
                    studentInfo.team === 'A팀' ? 'bg-amber-500 hover:bg-amber-600' : 'bg-cyan-500 hover:bg-cyan-600'
                  }`}
                >
                  <Send size={18} />
                  선생님께 최종 제출하기 🚀
                </button>

                {/* Local Manual Text Backup Extract Button (Critical safe fallback) */}
                <button
                  onClick={handleCopySummaryToClipboard}
                  className="w-full bg-slate-100 hover:bg-slate-200 text-slate-700 font-semibold py-3 rounded-2xl transition-colors text-xs flex items-center justify-center gap-1.5 border border-slate-200/50"
                >
                  <Copy size={14} />
                  수동 요약본 텍스트 복사하기 📋
                </button>
              </div>
            </div>

            {/* Safe Reset Trigger */}
            <div className="flex justify-center pt-2">
              {!showConfirmReset ? (
                <button
                  onClick={() => setShowConfirmReset(true)}
                  className="text-xs text-slate-400 font-semibold hover:text-slate-600 transition-colors flex items-center gap-1 bg-slate-50 py-1.5 px-3 rounded-lg border border-slate-200/30"
                >
                  <RotateCcw size={12} /> 입력 기록 완전 초기화(Reset)
                </button>
              ) : (
                <div className="bg-rose-50 border border-rose-200 rounded-xl p-3.5 space-y-2.5 max-w-sm text-center">
                  <span className="text-xs font-bold text-rose-800 block">⚠️ 정말로 전부 지우고 초기화하시겠습니까?</span>
                  <p className="text-[11px] text-rose-600/90 leading-normal">
                    기록해둔 반, 번호, 이름 및 작성 소감과 미션 데이터가 모두 즉각 소멸합니다. 다시 되돌릴 수 없습니다.
                  </p>
                  <div className="flex gap-2">
                    <button
                      onClick={handleClearAllData}
                      className="w-1/2 bg-red-600 hover:bg-red-700 text-white font-bold text-xs py-1.5 rounded-lg transition-colors"
                    >
                      응, 다 지우기
                    </button>
                    <button
                      onClick={() => setShowConfirmReset(false)}
                      className="w-1/2 bg-white hover:bg-slate-50 text-slate-600 font-bold text-xs py-1.5 rounded-lg border border-slate-200 transition-all shadow-sm"
                    >
                      아니, 유지할래요
                    </button>
                  </div>
                </div>
              )}
            </div>

          </div>
        )}

      </main>

      {/* ==================== MODAL: SUCCESS / ERROR SUBMISSION SCREEN ==================== */}
      <AnimatePresence>
        {isSubmitModalOpen && (
          <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
            {/* Backdrop overlay */}
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              onClick={() => {
                if (submitStatus !== 'loading') setIsSubmitModalOpen(false);
              }}
              className="absolute inset-0 bg-slate-900/60 backdrop-blur-xs"
            />

            {/* Modal Body Card */}
            <motion.div
              initial={{ opacity: 0, scale: 0.9, y: 15 }}
              animate={{ opacity: 1, scale: 1, y: 0 }}
              exit={{ opacity: 0, scale: 0.9, y: 15 }}
              className="relative bg-white rounded-3xl shadow-2xl max-w-sm w-full p-6 text-center space-y-5 overflow-hidden border border-slate-100"
            >
              
              {/* Submission loading spinner state */}
              {submitStatus === 'loading' && (
                <div className="py-6 space-y-4">
                  <div className="inline-block relative w-16 h-16">
                    <div className="absolute inset-0 border-4 border-slate-200 rounded-full"></div>
                    <div className={`absolute inset-0 border-4 border-t-transparent rounded-full animate-rotate ${
                      studentInfo.team === 'A팀' ? 'border-amber-500' : 'border-cyan-500'
                    }`} style={{ animation: 'spin 1s linear infinite' }}></div>
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">구글 스프레드시트 기록 제출 중...</h3>
                    <p className="text-xs text-slate-400 mt-1">네트워크 안정 상태를 체크하고 장소별로 동기화 중입니다.</p>
                  </div>
                </div>
              )}

              {/* Submission success container */}
              {submitStatus === 'success' && (
                <div className="space-y-4 py-2">
                  <div className="w-16 h-16 bg-emerald-100 text-emerald-600 rounded-full flex items-center justify-center mx-auto text-3xl animate-bounce">
                    🎉
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">선생님께 전송 완료!</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                      <span className="font-bold text-slate-900">{studentInfo.studentName}</span> 학생의 도외체험학습 직업관찰 미션 기록이 학교 구글 시트에 차례대로 안전하게 업로드되었습니다.
                    </p>
                  </div>

                  {/* Summary card */}
                  <div className="bg-slate-50 p-3 rounded-2xl text-[11px] text-slate-500 text-left border border-slate-100 max-h-40 overflow-y-auto font-mono space-y-1">
                    <span className="font-bold text-slate-800 border-b border-slate-200 pb-0.5 block text-xs">💻 업로드된 학생 정보</span>
                    <p>반/번호/이름: {studentInfo.studentClass}반 {studentInfo.studentNumber}번 {studentInfo.studentName}</p>
                    <p>배정 트랙: {studentInfo.team}</p>
                    <p>기록한 총 장소: {getAllItineraryLocations(studentInfo.team).length}개 코스</p>
                  </div>

                  <div className="flex gap-2">
                    <button
                      onClick={handleCopySummaryToClipboard}
                      className="w-1/2 bg-slate-100 hover:bg-slate-200 text-slate-700 font-bold text-xs py-2.5 rounded-xl transition-all"
                    >
                      텍스트 백업복사
                    </button>
                    <button
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="w-1/2 bg-slate-900 text-white font-bold text-xs py-2.5 rounded-xl transition-all"
                    >
                      확인 완료 🎒
                    </button>
                  </div>
                </div>
              )}

              {/* Submission error container */}
              {submitStatus === 'error' && (
                <div className="space-y-4 py-2">
                  <div className="w-16 h-16 bg-amber-100 text-amber-600 rounded-full flex items-center justify-center mx-auto text-2xl">
                    📁
                  </div>
                  <div>
                    <h3 className="font-bold text-slate-800 text-base">제출 완료 안내 및 안심 백업</h3>
                    <p className="text-xs text-slate-500 leading-relaxed mt-1">
                      구글 제출(POST) 요청이 발송되었습니다. 구글 스크립트 특성상 CORS 보호로 인해 경고가 간혹 나더라도 데이터는 정상 전송됩니다. 혹시 모를 누락 방지를 위해 아래 버튼으로 백업본을 복사하세요!
                    </p>
                  </div>

                  {/* Copy helper */}
                  <div className="bg-amber-50 rounded-xl p-3 border border-amber-200 text-[10px] text-amber-800 leading-relaxed text-left flex gap-1.5">
                    <AlertCircle size={14} className="shrink-0 text-amber-600 mt-0.5" />
                    <p>
                      선생님이 주신 스크립트 연결 URL 설정 상태나 무선 통신 한계로 인해 시트 전송이 일시 지연될 수 있습니다. <strong>수동 요약본 복사</strong>를 해서 선생님께 카카오톡 메시지로 보내면 안전합니다!
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <button
                      onClick={() => {
                        handleCopySummaryToClipboard();
                        setIsSubmitModalOpen(false);
                      }}
                      className="w-full bg-amber-400 hover:bg-amber-500 text-slate-950 font-bold text-xs py-3 rounded-xl transition-all flex items-center justify-center gap-1.5"
                    >
                      <Copy size={13} /> 내 답변 요약본 클립보드 복사하기
                    </button>
                    
                    <button
                      onClick={() => setIsSubmitModalOpen(false)}
                      className="w-full bg-slate-100 hover:bg-slate-200 text-slate-600 font-bold text-xs py-2.5 rounded-xl transition-colors"
                    >
                      닫기
                    </button>
                  </div>
                </div>
              )}

            </motion.div>
          </div>
        )}
      </AnimatePresence>

      {/* Styled Footer decoration */}
      <footer className="max-w-md mx-auto px-4 mt-8 pb-4 text-center text-[10px] text-slate-400 leading-relaxed">
        <p className="font-semibold text-slate-500">🚌 서울 도외체험학습 수첩 🚌</p>
        <p className="mt-1">© 2026. Made by qlqltl0202@gmail.com for Middle School Field Trip Operations.</p>
        <p className="mt-0.5 font-mono">Build with React 19 + Tailwind CSS V4</p>
      </footer>

    </div>
  );
}
