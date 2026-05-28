/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

export interface StudentInfo {
  studentClass: string;  // 반
  studentNumber: string; // 번호
  studentName: string;   // 이름
  team: 'A팀' | 'B팀';    // 팀 (A팀/B팀)
}

export interface ItineraryItem {
  location: string;
  emoji: string;
  description: string;
  tips?: string[]; // Students can get hints on what careers to look for!
}

export interface DayItinerary {
  day: number;
  items: ItineraryItem[];
}

export interface ItineraryData {
  A팀: {
    [key: number]: ItineraryItem[];
  };
  B팀: {
    [key: number]: ItineraryItem[];
  };
}

export interface MissionLog {
  jobObserved: string;     // ① 관찰한 직업
  jobDescription: string;  // ② 관찰한 직업에 대한 설명
  reflection: string;      // ③ 소감
  missionText: string;     // ④ 미션 내용
  photoBase64?: string;    // ⑤ 활동 사진 업로드 (Base64 형식)
}

// Map from location name to MissionLog
export interface StudentMissions {
  [location: string]: MissionLog;
}

export interface SubmissionRow {
  timestamp: string;
  team: string;
  studentClass: string;
  studentNumber: string;
  studentName: string;
  location: string;
  jobObserved: string;
  jobDescription: string;
  reflection: string;
  missionText: string;
  photoBase64: string;    // 이미지 데이터 URL (구글 시트 기록용 또는 미기재 표시)
}
